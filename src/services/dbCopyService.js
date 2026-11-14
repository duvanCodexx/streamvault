const zlib = require('zlib');
const { spawn } = require('child_process');
const storage = require('../db/storage');
const GoogleDriveService = require('./gdrive');
const DatabaseStreamer = require('./streamer');

// In-memory active copy operations for real-time live log polling
const activeJobs = new Map();

class DbCopyService {
  /**
   * Starts an asynchronous database restore/copy from an existing backup to a target connection
   * @param {Object} params
   * @param {number} params.backupId
   * @param {number} params.targetDbId
   * @returns {Promise<Object>} The created copy job record
   */
  static async startCopy({ backupId, targetDbId }) {
    const backup = storage.getBackupById(backupId);
    if (!backup) {
      throw new Error(`El respaldo #${backupId} no fue encontrado en el historial.`);
    }

    if (!backup.gdrive_file_id) {
      throw new Error(`El respaldo #${backupId} no tiene un archivo vinculado en Google Drive.`);
    }

    const targetDb = storage.getDbConfigById(targetDbId);
    if (!targetDb) {
      throw new Error(`La conexión de destino #${targetDbId} no existe en las bases de datos registradas.`);
    }

    // Verify engine compatibility
    const srcType = (backup.db_type || 'postgres').toLowerCase();
    const tgtType = (targetDb.type || 'postgres').toLowerCase();
    const isSrcPg = srcType === 'postgres' || srcType === 'postgresql';
    const isTgtPg = tgtType === 'postgres' || tgtType === 'postgresql';
    const isSrcMy = srcType === 'mysql' || srcType === 'mariadb';
    const isTgtMy = tgtType === 'mysql' || tgtType === 'mariadb';

    if ((isSrcPg && !isTgtPg) || (isSrcMy && !isTgtMy)) {
      throw new Error(`Incompatibilidad de motor: No es posible restaurar un respaldo de ${srcType.toUpperCase()} en una conexión de tipo ${tgtType.toUpperCase()}. Ambos deben ser del mismo motor.`);
    }

    // Test target connection before beginning
    try {
      await DatabaseStreamer.testConnection(targetDb);
    } catch (connErr) {
      throw new Error(`Fallo de conexión a la base de datos destino (${targetDb.name}): ${connErr.message}`);
    }

    // Create persistent copy history record
    const copyId = storage.createDbCopyHistory({
      backup_history_id: backup.id,
      backup_filename: backup.filename,
      source_database: backup.database_name,
      source_db_type: backup.db_type,
      target_db_config_id: targetDb.id,
      target_database_name: targetDb.database_name,
      target_host: `${targetDb.host}:${targetDb.port}`,
      target_db_type: targetDb.type,
      status: 'IN_PROGRESS',
    });

    const jobState = {
      id: copyId,
      backupId: backup.id,
      backupFilename: backup.filename,
      targetDbId: targetDb.id,
      targetDbName: targetDb.name,
      status: 'IN_PROGRESS',
      logs: [],
      startTime: Date.now(),
      durationMs: 0,
      bytesRestored: 0,
      error: null,
    };

    activeJobs.set(copyId, jobState);

    // Launch background execution
    this._runCopyStream(copyId, backup, targetDb, jobState).catch((err) => {
      console.error(`[DBCopy #${copyId}] Execution error:`, err.message);
    });

    return {
      copyId,
      status: 'IN_PROGRESS',
      message: `Copia de base de datos #${copyId} iniciada para destino "${targetDb.name}".`,
      backup: {
        id: backup.id,
        filename: backup.filename,
        database: backup.database_name,
      },
      target: {
        id: targetDb.id,
        name: targetDb.name,
        database: targetDb.database_name,
        host: targetDb.host,
      },
    };
  }

  /**
   * Internal streaming pipeline execution
   */
  static async _runCopyStream(copyId, backup, targetDb, jobState) {
    const startTime = jobState.startTime;
    const log = (msg) => {
      const line = `[${new Date().toISOString()}] ${msg}`;
      jobState.logs.push(line);
      console.log(`[DBCopy #${copyId}] ${msg}`);
    };

    log(`Iniciando canalización de copia directa desde Google Drive hacia "${targetDb.name}"...`);
    log(`Respaldo origen: ${backup.filename} (${backup.database_name} • ${backup.db_type})`);
    log(`Destino en VPS: ${targetDb.database_name} @ ${targetDb.host}:${targetDb.port} (Usuario: ${targetDb.username})`);
    log(`Google Drive File ID: ${backup.gdrive_file_id}`);

    const isPg = targetDb.type === 'postgres' || targetDb.type === 'postgresql';

    try {
      // 1. Establish download stream from Google Drive
      log('Conectando con Google Drive API v3 para descargar el respaldo...');
      const downloadStream = await GoogleDriveService.downloadStream(backup.gdrive_file_id);
      log('Flujo de Drive conectado con éxito. Iniciando descompresión gzip en memoria (cero almacenamiento en disco)...');

      // 2. Setup Gzip decompressor & byte counter
      const gunzip = zlib.createGunzip();
      let rawBytesReceived = 0;
      let uncompressedBytes = 0;

      downloadStream.on('data', (chunk) => {
        rawBytesReceived += chunk.length;
      });

      gunzip.on('data', (chunk) => {
        uncompressedBytes += chunk.length;
        jobState.bytesRestored = uncompressedBytes;
      });

      // 3. Spawn target database client process
      let clientProc;
      let stderrOutput = '';

      if (isPg) {
        const args = [
          '-h', targetDb.host,
          '-p', String(targetDb.port || 5432),
          '-U', targetDb.username,
          '-d', targetDb.database_name,
        ];

        const env = {
          ...process.env,
          PGPASSWORD: targetDb.password || '',
        };

        if (targetDb.ssl) {
          env.PGSSLMODE = 'require';
        }

        log(`Iniciando proceso cliente psql (PostgreSQL) hacia ${targetDb.host}:${targetDb.port}/${targetDb.database_name}...`);
        clientProc = spawn('psql', args, { env });
      } else {
        const args = [
          '-h', targetDb.host,
          '-P', String(targetDb.port || 3306),
          '-u', targetDb.username,
          targetDb.database_name,
        ];

        if (targetDb.password) {
          args.splice(4, 0, `--password=${targetDb.password}`);
        }

        log(`Iniciando proceso cliente mysql (MySQL/MariaDB) hacia ${targetDb.host}:${targetDb.port}/${targetDb.database_name}...`);
        clientProc = spawn('mysql', args);
      }

      clientProc.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        stderrOutput += text;
      });

      // 4. Pipe downloadStream -> gunzip -> clientProc.stdin
      downloadStream.pipe(gunzip).pipe(clientProc.stdin);

      // Handle stream errors
      let clientError = null;

      clientProc.on('error', (err) => {
        clientError = new Error(`Fallo al ejecutar la utilidad cliente (${isPg ? 'psql' : 'mysql'}): ${err.message}. Verifica que las herramientas cliente estén instaladas en el sistema/VPS.`);
        gunzip.destroy(clientError);
      });

      downloadStream.on('error', (err) => {
        gunzip.destroy(new Error(`Error en la descarga de Google Drive: ${err.message}`));
      });

      gunzip.on('error', (err) => {
        if (clientProc && !clientProc.killed) {
          try { clientProc.kill('SIGTERM'); } catch (e) {}
        }
      });

      // Wait for process completion
      await new Promise((resolve, reject) => {
        clientProc.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            const errDetail = stderrOutput.trim() || `Código de salida: ${code}`;
            reject(new Error(`El cliente de base de datos finalizó con error (código ${code}): ${errDetail}`));
          }
        });

        clientProc.on('error', reject);
        gunzip.on('error', reject);
        downloadStream.on('error', reject);
      });

      const durationMs = Date.now() - startTime;
      jobState.durationMs = durationMs;
      jobState.status = 'SUCCESS';

      log(`¡Copia y restauración completada exitosamente!`);
      log(`Tiempo total: ${(durationMs / 1000).toFixed(2)} segundos.`);
      log(`Tamaño descargado: ${(rawBytesReceived / (1024 * 1024)).toFixed(2)} MB comprimidos.`);
      log(`Datos restaurados: ${(uncompressedBytes / (1024 * 1024)).toFixed(2)} MB SQL sin tocar disco.`);

      if (stderrOutput.trim()) {
        log(`Salida informativa del motor:\n${stderrOutput.trim()}`);
      }

      // Update SQLite persistent record
      storage.updateDbCopyHistory(copyId, {
        status: 'SUCCESS',
        duration_ms: durationMs,
        bytes_restored: uncompressedBytes,
        logs: jobState.logs.join('\n'),
        error_message: null,
      });

      return jobState;
    } catch (err) {
      const durationMs = Date.now() - startTime;
      jobState.durationMs = durationMs;
      jobState.status = 'FAILED';
      jobState.error = err.message;

      log(`ERROR EN LA RESTAURACIÓN: ${err.message}`);

      storage.updateDbCopyHistory(copyId, {
        status: 'FAILED',
        duration_ms: durationMs,
        bytes_restored: jobState.bytesRestored || 0,
        logs: jobState.logs.join('\n'),
        error_message: err.message,
      });

      throw err;
    }
  }

  /**
   * Retrieves status and live logs for a specific copy job
   * @param {number} copyId
   */
  static getCopyStatus(copyId) {
    const numId = Number(copyId);
    if (activeJobs.has(numId)) {
      const job = activeJobs.get(numId);
      return {
        id: job.id,
        status: job.status,
        durationMs: Date.now() - job.startTime,
        bytesRestored: job.bytesRestored,
        logs: job.logs.join('\n'),
        error: job.error,
        isLive: job.status === 'IN_PROGRESS',
      };
    }

    const record = storage.getDbCopyById(numId);
    if (!record) return null;

    return {
      id: record.id,
      status: record.status,
      durationMs: record.duration_ms,
      bytesRestored: record.bytes_restored,
      logs: record.logs || '',
      error: record.error_message,
      isLive: false,
    };
  }

  /**
   * Retrieves list of previous copy history records
   * @param {number} limit
   */
  static getHistory(limit = 50) {
    return storage.getDbCopyHistory(limit);
  }
}

module.exports = DbCopyService;
