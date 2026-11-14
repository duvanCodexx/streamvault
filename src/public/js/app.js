// StreamVault DB Dashboard Client (Stitch Obsidian Stream Edition)
document.addEventListener('DOMContentLoaded', () => {
  // Navigation & Tabs
  const tabButtons = document.querySelectorAll('.tab-btn');
  const navLinks = document.querySelectorAll('.nav-tab-link');
  const tabContents = document.querySelectorAll('.tab-content');
  const btnRefresh = document.getElementById('btn-refresh');
  const toastContainer = document.getElementById('toast-container');

  // Stats Elements
  const statTotalBackups = document.getElementById('stat-total-backups');
  const statSuccessRate = document.getElementById('stat-success-rate');
  const statTotalBytes = document.getElementById('stat-total-bytes');
  const statCronSchedule = document.getElementById('stat-cron-schedule');
  const statTestPassRate = document.getElementById('stat-test-pass-rate');
  const statTestCount = document.getElementById('stat-test-count');
  const badgeDriveStatus = document.getElementById('badge-drive-status');

  // Tables & Selects
  const tableBackupsBody = document.getElementById('table-backups-body');
  const tableDbsBody = document.getElementById('table-dbs-body');
  const tableTestsBody = document.getElementById('table-tests-body');
  const selectDbManual = document.getElementById('select-db-manual');
  const btnTriggerBackup = document.getElementById('btn-trigger-backup');
  const btnQuickBackup = document.getElementById('btn-quick-backup');
  const tableSearchInput = document.getElementById('table-search-input');
  const liveAuditLogs = document.getElementById('live-audit-logs');
  const btnCopyLiveLogs = document.getElementById('btn-copy-live-logs');

  // Modals
  const modalDb = document.getElementById('modal-db');
  const btnOpenAddDb = document.getElementById('btn-open-add-db');
  const btnOpenAddDb2 = document.getElementById('btn-open-add-db-2');
  const btnCloseDbModal = document.getElementById('btn-close-db-modal');
  const btnCancelDb = document.getElementById('btn-cancel-db');
  const formDb = document.getElementById('form-db');
  const btnTestDbConn = document.getElementById('btn-test-db-conn');
  const dbTypeSelect = document.getElementById('db-type');
  const dbPortInput = document.getElementById('db-port');

  const modalLogs = document.getElementById('modal-logs');
  const btnCloseLogsModal = document.getElementById('btn-close-logs-modal');
  const btnCloseLogs = document.getElementById('btn-close-logs');
  const logsContent = document.getElementById('logs-content');

  // Google Drive Form
  const formGdrive = document.getElementById('form-gdrive');
  const gdriveAuthType = document.getElementById('gdrive-auth-type');
  const gdriveFolderId = document.getElementById('gdrive-folder-id');
  const gdriveSaJson = document.getElementById('gdrive-sa-json');
  const gdriveClientId = document.getElementById('gdrive-client-id');
  const gdriveClientSecret = document.getElementById('gdrive-client-secret');
  const gdriveRefreshToken = document.getElementById('gdrive-refresh-token');
  const sectionSaJson = document.getElementById('section-sa-json');
  const sectionOauth = document.getElementById('section-oauth');
  const btnTestGdrive = document.getElementById('btn-test-gdrive');
  const oauthRedirectUri = document.getElementById('oauth-redirect-uri');
  const btnCopyRedirectUri = document.getElementById('btn-copy-redirect-uri');
  const btnOauthConnect = document.getElementById('btn-oauth-connect');
  const oauthTokenStatus = document.getElementById('oauth-token-status');

  // Database Copy Elements (Dokploy / VPS)
  const copySelectBackup = document.getElementById('copy-select-backup');
  const copySelectTargetDb = document.getElementById('copy-select-target-db');
  const btnExecuteDbCopy = document.getElementById('btn-execute-db-copy');
  const copyDetailEngine = document.getElementById('copy-detail-engine');
  const copyDetailDb = document.getElementById('copy-detail-db');
  const copyDetailSize = document.getElementById('copy-detail-size');
  const copyDetailDate = document.getElementById('copy-detail-date');
  const copyTargetHost = document.getElementById('copy-target-host');
  const copyTargetDatabase = document.getElementById('copy-target-database');
  const copyTargetUser = document.getElementById('copy-target-user');
  const copyTargetCompatibility = document.getElementById('copy-target-compatibility');
  const copyFeedbackPanel = document.getElementById('copy-feedback-panel');
  const copyFeedbackPulse = document.getElementById('copy-feedback-pulse');
  const copyFeedbackTitle = document.getElementById('copy-feedback-title');
  const copyFeedbackTimer = document.getElementById('copy-feedback-timer');
  const copyFeedbackLogs = document.getElementById('copy-feedback-logs');
  const btnCopyFeedbackLogs = document.getElementById('btn-copy-feedback-logs');
  const badgeTotalCopies = document.getElementById('badge-total-copies');
  const tableCopiesBody = document.getElementById('table-copies-body');

  let currentBackupsList = [];
  let currentDbsList = [];
  let currentCopiesList = [];
  let copyPollInterval = null;
  let copyTimerInterval = null;
  const lockScreenOverlay = document.getElementById('lock-screen-overlay');
  const formLockScreen = document.getElementById('form-lock-screen');
  const inputAccessKey = document.getElementById('input-access-key');
  const lockErrorAlert = document.getElementById('lock-error-alert');
  const lockErrorText = document.getElementById('lock-error-text');
  const btnToggleKeyVisibility = document.getElementById('btn-toggle-key-visibility');
  const iconEyeShow = document.getElementById('icon-eye-show');
  const iconEyeHide = document.getElementById('icon-eye-hide');
  const btnPasteKey = document.getElementById('btn-paste-key');
  const btnLockSession = document.getElementById('btn-lock-session');
  const btnUnlock = document.getElementById('btn-unlock');

  // Token management
  function getToken() {
    return localStorage.getItem('streamvault_token') || '';
  }

  function setToken(token) {
    if (token) localStorage.setItem('streamvault_token', token);
    else localStorage.removeItem('streamvault_token');
  }

  function getAuthHeaders() {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-access-key'] = token;
    }
    return headers;
  }

  async function authFetch(url, options = {}) {
    const headers = {
      ...getAuthHeaders(),
      ...(options.headers || {}),
    };

    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
      showLockScreen();
      throw new Error('Autenticación requerida.');
    }
    return res;
  }

  function showLockScreen() {
    lockScreenOverlay.classList.remove('hidden');
    inputAccessKey.value = '';
    inputAccessKey.focus();
    btnLockSession.style.display = 'inline-flex';
  }

  function hideLockScreen() {
    lockScreenOverlay.classList.add('hidden');
    lockErrorAlert.style.display = 'none';
  }

  // Toggle key visibility
  btnToggleKeyVisibility.addEventListener('click', () => {
    if (inputAccessKey.type === 'password') {
      inputAccessKey.type = 'text';
      iconEyeShow.classList.add('hidden');
      iconEyeHide.classList.remove('hidden');
    } else {
      inputAccessKey.type = 'password';
      iconEyeShow.classList.remove('hidden');
      iconEyeHide.classList.add('hidden');
    }
  });

  // Paste key from clipboard
  if (btnPasteKey) {
    btnPasteKey.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          inputAccessKey.value = text.trim();
          showToast('Llave pegada del portapapeles', 'info');
        }
      } catch (e) {
        inputAccessKey.focus();
      }
    });
  }

  // Lock Screen submit
  formLockScreen.addEventListener('submit', async (e) => {
    e.preventDefault();
    const key = inputAccessKey.value.trim();
    if (!key) return;

    try {
      btnUnlock.disabled = true;
      btnUnlock.innerHTML = '<span class="material-symbols-outlined text-[18px] animate-spin">refresh</span><span>Verificando...</span>';
      lockErrorAlert.style.display = 'none';

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });

      const json = await res.json();
      if (json.success) {
        setToken(json.token || key);
        hideLockScreen();
        btnLockSession.style.display = 'inline-flex';
        showToast('Acceso autorizado.', 'success');
        refreshAll();
      } else {
        lockErrorText.textContent = json.error || 'Llave de acceso incorrecta.';
        lockErrorAlert.style.display = 'flex';
        inputAccessKey.select();
      }
    } catch (err) {
      lockErrorText.textContent = 'Error de conexión con el servidor.';
      lockErrorAlert.style.display = 'flex';
    } finally {
      btnUnlock.disabled = false;
      btnUnlock.innerHTML = '<span class="material-symbols-outlined text-[18px]">key</span><span>Desbloquear Panel</span>';
    }
  });

  // Lock button in header
  btnLockSession.addEventListener('click', () => {
    setToken('');
    showLockScreen();
    showToast('Sesión bloqueada.', 'info');
  });

  // Check auth requirements on boot
  async function checkAuthStatus() {
    try {
      const res = await fetch('/api/auth/status', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (data.requiresAuth) {
        btnLockSession.style.display = 'inline-flex';
        if (!data.authenticated) {
          showLockScreen();
          return false;
        }
      } else {
        btnLockSession.style.display = 'none';
        hideLockScreen();
      }
      return true;
    } catch (err) {
      console.error('Error checking auth:', err);
      return false;
    }
  }

  // Helpers
  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  function formatDate(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleString('es-ES', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconName = type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info';
    toast.innerHTML = `<span class="material-symbols-outlined text-[18px]">${iconName}</span><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // Unified Tab Switching for Sidebar & Top Nav
  function switchTab(tabId) {
    // Update sidebar buttons
    tabButtons.forEach(b => {
      if (b.dataset.tab === tabId) {
        b.className = 'w-full tab-btn active flex items-center gap-3 bg-surface-container text-primary font-semibold rounded-lg px-3 py-2 border-l-2 border-primary text-xs text-left';
      } else {
        b.className = 'w-full tab-btn flex items-center gap-3 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface rounded-lg px-3 py-2 text-xs text-left transition-colors';
      }
    });

    // Update top nav links
    navLinks.forEach(l => {
      if (l.dataset.tab === tabId) {
        l.className = 'nav-tab-link active text-primary border-b-2 border-primary font-semibold pb-1 text-xs transition-colors duration-150';
      } else {
        l.className = 'nav-tab-link text-on-surface-variant hover:text-on-surface pb-1 text-xs transition-colors duration-150';
      }
    });

    // Show target section
    tabContents.forEach(c => {
      if (c.id === tabId) c.classList.add('active');
      else c.classList.remove('active');
    });
  }

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  navLinks.forEach(link => {
    link.addEventListener('click', () => switchTab(link.dataset.tab));
  });

  // DB Type port switcher
  dbTypeSelect.addEventListener('change', () => {
    if (dbTypeSelect.value === 'mysql') {
      if (dbPortInput.value === '5432') dbPortInput.value = '3306';
    } else {
      if (dbPortInput.value === '3306') dbPortInput.value = '5432';
    }
  });

  // Google Drive Auth switcher
  gdriveAuthType.addEventListener('change', () => {
    if (gdriveAuthType.value === 'service_account') {
      sectionSaJson.classList.remove('hidden');
      sectionOauth.classList.add('hidden');
    } else {
      sectionSaJson.classList.add('hidden');
      sectionOauth.classList.remove('hidden');
    }
  });

  // Setup OAuth redirect URI input
  if (oauthRedirectUri) {
    oauthRedirectUri.value = `${window.location.origin}/api/gdrive/oauth/callback`;
  }

  // Copy OAuth redirect URI
  if (btnCopyRedirectUri) {
    btnCopyRedirectUri.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(oauthRedirectUri.value);
        showToast('URI copiada al portapapeles. Pégala en Google Cloud Console.', 'success');
      } catch (err) {
        oauthRedirectUri.select();
        document.execCommand('copy');
        showToast('URI copiada al portapapeles.', 'success');
      }
    });
  }

  // 1-Click OAuth Connect with Google
  if (btnOauthConnect) {
    btnOauthConnect.addEventListener('click', async () => {
      const clientId = gdriveClientId.value.trim();
      const clientSecret = gdriveClientSecret.value.trim();
      const folderId = gdriveFolderId.value.trim() || 'root';
      const redirectUri = oauthRedirectUri.value;

      if (!clientId) {
        showToast('Por favor introduce tu Client ID antes de conectar.', 'error');
        gdriveClientId.focus();
        return;
      }

      try {
        btnOauthConnect.disabled = true;
        btnOauthConnect.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">refresh</span><span>Iniciando...</span>';

        const res = await authFetch('/api/gdrive/oauth/url', {
          method: 'POST',
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            folder_id: folderId,
          }),
        });
        const json = await res.json();
        if (json.success && json.url) {
          const width = 600, height = 700;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;
          window.open(
            json.url,
            'google_oauth_popup',
            `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
          );
          showToast('Ventana de Google abierta. Selecciona tu cuenta y autoriza permisos.', 'info');
        } else {
          showToast('Error al preparar OAuth: ' + (json.error || 'Desconocido'), 'error');
        }
      } catch (err) {
        showToast('Error de conexión: ' + err.message, 'error');
      } finally {
        btnOauthConnect.disabled = false;
        btnOauthConnect.innerHTML = '<span class="material-symbols-outlined text-[16px]">link</span><span>Conectar con Google (1 Clic)</span>';
      }
    });
  }

  // Listen for popup callback message
  window.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'GDRIVE_OAUTH_SUCCESS') {
      if (oauthTokenStatus) {
        oauthTokenStatus.className = 'h-6 px-2.5 rounded-full font-mono text-[10px] bg-secondary/10 border border-secondary/30 text-secondary shrink-0 inline-flex items-center';
        oauthTokenStatus.textContent = 'Token Vinculado';
      }
      gdriveRefreshToken.placeholder = '•••••••••••••••• (Token Activo)';
      showToast('🎉 ¡Google Drive conectado exitosamente con tu cuenta personal!', 'success');
      await fetchGDriveConfig();
      await fetchStatus();
    }
  });

  // Copy live audit logs
  if (btnCopyLiveLogs) {
    btnCopyLiveLogs.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(liveAuditLogs.innerText);
        showToast('Registros copiados al portapapeles', 'success');
      } catch (e) {}
    });
  }

  // Search filter for backups table
  if (tableSearchInput) {
    tableSearchInput.addEventListener('input', () => {
      const q = tableSearchInput.value.toLowerCase().trim();
      renderBackupsTable(currentBackupsList.filter(b => 
        (b.database_name && b.database_name.toLowerCase().includes(q)) ||
        (b.filename && b.filename.toLowerCase().includes(q)) ||
        (b.status && b.status.toLowerCase().includes(q))
      ));
    });
  }

  // API Calls
  async function fetchStatus() {
    try {
      const res = await authFetch('/api/status');
      const data = await res.json();
      if (!data.success) return;

      statTotalBackups.textContent = data.stats.totalBackups;
      statSuccessRate.textContent = `${data.stats.successRate}% éxito (${data.stats.successfulBackups} ok)`;
      statTotalBytes.textContent = formatBytes(data.stats.totalBytesUploaded);
      statCronSchedule.textContent = data.scheduler.activeSchedule;
      statTestPassRate.textContent = `${data.stats.testPassRate}%`;
      statTestCount.textContent = `${data.stats.totalRestoreTests} pruebas`;

      if (data.hasDriveConfig) {
        badgeDriveStatus.className = 'hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/30 font-mono text-xs text-secondary';
        badgeDriveStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-secondary animate-pulse-dot"></span><span>Google Drive Activo</span>';
      } else {
        badgeDriveStatus.className = 'hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/30 font-mono text-xs text-yellow-400';
        badgeDriveStatus.innerHTML = '<span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-dot"></span><span>Configurar Drive</span>';
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  }

  async function fetchDatabases() {
    try {
      const res = await authFetch('/api/db-configs');
      const json = await res.json();
      if (!json.success) return;

      const dbs = json.data;
      currentDbsList = dbs || [];
      updateCopyDropdowns();
      // Populate select dropdown
      selectDbManual.innerHTML = '<option value="">Seleccionar Base de Datos...</option>';
      dbs.forEach(db => {
        const opt = document.createElement('option');
        opt.value = db.id;
        opt.textContent = `${db.name} (${db.type.toUpperCase()} - ${db.database_name})`;
        selectDbManual.appendChild(opt);
      });

      // Populate Table
      if (dbs.length === 0) {
        tableDbsBody.innerHTML = `
          <tr>
            <td colspan="9" class="text-center text-outline py-8">
              No hay bases de datos configuradas todavía. Haz clic en "Nueva Conexión".
            </td>
          </tr>
        `;
        return;
      }

      tableDbsBody.innerHTML = dbs.map(db => `
        <tr class="hover:bg-surface-container/50 transition-colors">
          <td class="py-3.5 px-4 font-semibold text-on-surface">${db.name}</td>
          <td class="py-3.5 px-4">
            <span class="w-6 h-6 rounded ${db.type === 'postgres' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'} flex items-center justify-center font-bold text-[10px]">
              ${db.type === 'postgres' ? 'PG' : 'MY'}
            </span>
          </td>
          <td class="py-3.5 px-4 font-mono text-xs text-on-surface-variant">${db.host}:${db.port}</td>
          <td class="py-3.5 px-4 font-mono text-xs text-primary">${db.database_name}</td>
          <td class="py-3.5 px-4 font-mono text-xs text-on-surface-variant">${db.username}</td>
          <td class="py-3.5 px-4 font-mono text-xs">${db.ssl ? 'TLS Activo' : 'Inseguro'}</td>
          <td class="py-3.5 px-4 font-mono text-[11px] text-on-surface-variant">${formatDate(db.last_tested_at)}</td>
          <td class="py-3.5 px-4">
            ${db.test_status === 'SUCCESS' ? '<span class="h-5 px-2 rounded-full font-mono text-[10px] bg-secondary/10 border border-secondary/30 text-secondary inline-flex items-center gap-1">OK</span>' :
              db.test_status === 'FAILED' ? `<span class="h-5 px-2 rounded-full font-mono text-[10px] bg-error-container/20 border border-error/30 text-error inline-flex items-center gap-1" title="${db.test_error || ''}">Error</span>` :
              '<span class="h-5 px-2 rounded-full font-mono text-[10px] bg-surface-container text-outline">Sin probar</span>'}
          </td>
          <td class="py-3.5 px-4 text-right">
            <div class="flex items-center justify-end gap-1.5">
              <button class="px-2 py-1 rounded bg-surface-container border border-outline-variant hover:bg-surface-variant text-on-surface font-mono text-[11px] btn-edit-db" data-id="${db.id}">Editar</button>
              <button class="px-2 py-1 rounded bg-error-container/20 border border-error/30 hover:bg-error-container/40 text-error font-mono text-[11px] btn-delete-db" data-id="${db.id}">Eliminar</button>
            </div>
          </td>
        </tr>
      `).join('');

      document.querySelectorAll('.btn-edit-db').forEach(btn => {
        btn.addEventListener('click', () => editDb(btn.dataset.id));
      });
      document.querySelectorAll('.btn-delete-db').forEach(btn => {
        btn.addEventListener('click', () => deleteDb(btn.dataset.id));
      });
    } catch (err) {
      console.error('Error fetching databases:', err);
    }
  }

  function renderBackupsTable(backups) {
    if (!backups || backups.length === 0) {
      tableBackupsBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-outline py-8">
            Aún no se han generado copias de seguridad. Usa "Iniciar Transmisión" para respaldar.
          </td>
        </tr>
      `;
      return;
    }

    tableBackupsBody.innerHTML = backups.map(b => `
      <tr class="hover:bg-surface-container/50 transition-colors">
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded ${b.db_type === 'postgres' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'} flex items-center justify-center font-bold text-[10px]">
              ${b.db_type === 'postgres' ? 'PG' : 'MY'}
            </span>
            <span class="font-medium text-on-surface font-mono text-xs">${b.database_name}</span>
          </div>
        </td>
        <td class="py-3.5 px-4 font-mono text-xs text-on-surface-variant truncate max-w-[200px]" title="${b.filename}">
          ${b.filename}
        </td>
        <td class="py-3.5 px-4 font-mono text-xs font-semibold text-primary">
          ${formatBytes(b.size_bytes)}
        </td>
        <td class="py-3.5 px-4 font-mono text-xs text-on-surface-variant">
          ${b.duration_ms ? (b.duration_ms / 1000).toFixed(1) + 's' : '-'}
        </td>
        <td class="py-3.5 px-4">
          ${b.status === 'SUCCESS' ? `
            <span class="h-6 px-2.5 rounded-full font-mono text-[11px] bg-secondary/10 border border-secondary/30 text-secondary inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-[14px]">check</span>
              Subido a Drive
            </span>` :
            b.status === 'STREAMING' ? `
            <span class="h-6 px-2.5 rounded-full font-mono text-[11px] bg-primary-container/10 border border-primary-container/30 text-primary-container inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse-dot"></span>
              Transmitiendo...
            </span>` :
            `<span class="h-6 px-2.5 rounded-full font-mono text-[11px] bg-error-container/20 border border-error/30 text-error inline-flex items-center gap-1 cursor-help" title="${b.error_message || ''}">
              <span class="material-symbols-outlined text-[14px]">error</span>
              Falló
            </span>`}
        </td>
        <td class="py-3.5 px-4 font-mono text-[11px] text-outline truncate max-w-[140px]" title="${b.checksum_sha256 || ''}">
          ${b.checksum_sha256 ? b.checksum_sha256.substring(0, 12) + '...' : '-'}
        </td>
        <td class="py-3.5 px-4 font-mono text-[11px] text-on-surface-variant">
          ${formatDate(b.created_at)}
        </td>
        <td class="py-3.5 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            ${b.gdrive_file_id ? `
              <a href="${b.gdrive_url || `https://drive.google.com/file/d/${b.gdrive_file_id}/view`}" target="_blank" class="px-2 py-1 rounded bg-surface-container border border-outline-variant hover:bg-surface-variant text-primary font-mono text-[11px] flex items-center gap-1" title="Abrir en Google Drive">
                Drive <span class="material-symbols-outlined text-[13px]">open_in_new</span>
              </a>
              <button class="px-2 py-1 rounded bg-surface-container border border-outline-variant hover:bg-surface-variant text-on-surface font-mono text-[11px] btn-verify-backup flex items-center gap-1" data-id="${b.id}" title="Verificar Integridad">
                <span class="material-symbols-outlined text-[13px]">verified</span> Auditar
              </button>
            ` : '-'}
          </div>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.btn-verify-backup').forEach(btn => {
      btn.addEventListener('click', () => triggerIntegrityTest(btn.dataset.id));
    });
  }

  async function fetchBackups() {
    try {
      const res = await authFetch('/api/backups?limit=50');
      const json = await res.json();
      if (!json.success) return;

      currentBackupsList = json.data || [];
      renderBackupsTable(currentBackupsList);
      updateCopyDropdowns();
    } catch (err) {
      console.error('Error fetching backups:', err);
    }
  }

  async function fetchRestoreTests() {
    try {
      const res = await authFetch('/api/restore-tests?limit=50');
      const json = await res.json();
      if (!json.success) return;

      const tests = json.data;
      if (tests.length === 0) {
        tableTestsBody.innerHTML = `
          <tr>
            <td colspan="8" class="text-center text-outline py-8">
              No se han ejecutado pruebas de integridad aún.
            </td>
          </tr>
        `;
        return;
      }

      // Update live audit logs with most recent test
      if (tests[0] && liveAuditLogs) {
        const latest = tests[0];
        liveAuditLogs.innerHTML = `
          <p><span class="text-outline">${formatDate(latest.created_at)}</span> [INSPECT] Evaluando respaldo #${latest.backup_history_id} (${latest.filename})</p>
          <p><span class="text-outline">[STATUS]</span> ${latest.status} | Modo: ${latest.test_type} | Tablas: ${latest.tables_verified || 0}</p>
          <p class="${latest.status === 'PASSED' ? 'text-secondary font-semibold' : 'text-error font-semibold'}">[RESULT] ${latest.status === 'PASSED' ? '100% Íntegro y Restaurable' : (latest.error_message || 'Falló verificación')}</p>
        `;
      }

      tableTestsBody.innerHTML = tests.map(t => `
        <tr class="hover:bg-surface-container/50 transition-colors">
          <td class="py-3.5 px-4 font-mono text-xs text-primary">#${t.id}</td>
          <td class="py-3.5 px-4 font-mono text-xs text-on-surface truncate max-w-[220px]">${t.filename || `Backup #${t.backup_history_id}`}</td>
          <td class="py-3.5 px-4 font-mono text-[11px] text-on-surface-variant">${t.test_type}</td>
          <td class="py-3.5 px-4">
            ${t.status === 'PASSED' ? '<span class="h-6 px-2.5 rounded-full font-mono text-[11px] bg-secondary/10 border border-secondary/30 text-secondary inline-flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">check</span> 100% Íntegro</span>' :
              t.status === 'RUNNING' ? '<span class="h-6 px-2.5 rounded-full font-mono text-[11px] bg-primary-container/10 border border-primary-container/30 text-primary-container inline-flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse-dot"></span> Ejecutando</span>' :
              `<span class="h-6 px-2.5 rounded-full font-mono text-[11px] bg-error-container/20 border border-error/30 text-error inline-flex items-center gap-1" title="${t.error_message || ''}"><span class="material-symbols-outlined text-[14px]">error</span> Falló</span>`}
          </td>
          <td class="py-3.5 px-4 font-mono text-xs font-semibold text-secondary">${t.tables_verified || 0} tablas</td>
          <td class="py-3.5 px-4 font-mono text-xs text-on-surface-variant">${t.duration_ms ? (t.duration_ms / 1000).toFixed(1) + 's' : '-'}</td>
          <td class="py-3.5 px-4 font-mono text-[11px] text-on-surface-variant">${formatDate(t.created_at)}</td>
          <td class="py-3.5 px-4 text-right">
            <button class="px-2.5 py-1 rounded bg-surface-container border border-outline-variant hover:bg-surface-variant text-on-surface font-mono text-[11px] btn-view-logs" data-id="${t.id}" data-logs="${encodeURIComponent(t.logs || t.error_message || '')}">
              Ver Registros
            </button>
          </td>
        </tr>
      `).join('');

      document.querySelectorAll('.btn-view-logs').forEach(btn => {
        btn.addEventListener('click', () => {
          const raw = decodeURIComponent(btn.dataset.logs);
          logsContent.textContent = raw || 'No hay registros detallados disponibles.';
          modalLogs.classList.add('open');
        });
      });
    } catch (err) {
      console.error('Error fetching restore tests:', err);
    }
  }

  // ==========================================
  // DOKPLOY / VPS DATABASE COPY FUNCTIONS
  // ==========================================
  function updateCopyDropdowns() {
    if (!copySelectBackup || !copySelectTargetDb) return;

    const successfulBackups = (currentBackupsList || []).filter(b => b.status === 'SUCCESS' && b.gdrive_file_id);
    const activeDbs = (currentDbsList || []).filter(d => d.is_active);

    const prevBackupId = copySelectBackup.value;
    const prevTargetId = copySelectTargetDb.value;

    if (successfulBackups.length === 0) {
      copySelectBackup.innerHTML = '<option value="">(No hay copias exitosas en Google Drive)</option>';
    } else {
      copySelectBackup.innerHTML = '<option value="">-- Selecciona una Copia Exitosa --</option>' +
        successfulBackups.map(b => `
          <option value="${b.id}" ${b.id == prevBackupId ? 'selected' : ''}>
            ${formatDate(b.created_at)} • ${b.database_name} (${(b.db_type || 'PG').toUpperCase()}) • ${formatBytes(b.size_bytes)}
          </option>
        `).join('');
    }

    if (activeDbs.length === 0) {
      copySelectTargetDb.innerHTML = '<option value="">(No hay conexiones de BD activas)</option>';
    } else {
      copySelectTargetDb.innerHTML = '<option value="">-- Selecciona una Conexión Destino --</option>' +
        activeDbs.map(d => `
          <option value="${d.id}" ${d.id == prevTargetId ? 'selected' : ''}>
            ${d.name} (${(d.type || 'PG').toUpperCase()}) • ${d.database_name} @ ${d.host}:${d.port}
          </option>
        `).join('');
    }

    updateCopyDetails();
  }

  function updateCopyDetails() {
    if (!copySelectBackup || !copySelectTargetDb) return;

    const backupId = copySelectBackup.value;
    const targetDbId = copySelectTargetDb.value;

    const backup = (currentBackupsList || []).find(b => b.id == backupId);
    const targetDb = (currentDbsList || []).find(d => d.id == targetDbId);

    // Source Info Box
    if (backup) {
      if (copyDetailEngine) copyDetailEngine.textContent = (backup.db_type || 'postgres').toUpperCase();
      if (copyDetailDb) copyDetailDb.textContent = backup.database_name;
      if (copyDetailSize) copyDetailSize.textContent = formatBytes(backup.size_bytes);
      if (copyDetailDate) copyDetailDate.textContent = formatDate(backup.created_at);
    } else {
      if (copyDetailEngine) copyDetailEngine.textContent = '-';
      if (copyDetailDb) copyDetailDb.textContent = '-';
      if (copyDetailSize) copyDetailSize.textContent = '-';
      if (copyDetailDate) copyDetailDate.textContent = '-';
    }

    // Target Info Box
    if (targetDb) {
      if (copyTargetHost) copyTargetHost.textContent = `${targetDb.host}:${targetDb.port}`;
      if (copyTargetDatabase) copyTargetDatabase.textContent = targetDb.database_name;
      if (copyTargetUser) copyTargetUser.textContent = targetDb.username;
    } else {
      if (copyTargetHost) copyTargetHost.textContent = '-';
      if (copyTargetDatabase) copyTargetDatabase.textContent = '-';
      if (copyTargetUser) copyTargetUser.textContent = '-';
    }

    // Engine Compatibility Check
    if (backup && targetDb) {
      const srcType = (backup.db_type || 'postgres').toLowerCase();
      const tgtType = (targetDb.type || 'postgres').toLowerCase();
      const isSrcPg = srcType === 'postgres' || srcType === 'postgresql';
      const isTgtPg = tgtType === 'postgres' || tgtType === 'postgresql';
      const isSrcMy = srcType === 'mysql' || srcType === 'mariadb';
      const isTgtMy = tgtType === 'mysql' || tgtType === 'mariadb';

      if ((isSrcPg && isTgtPg) || (isSrcMy && isTgtMy)) {
        if (copyTargetCompatibility) {
          copyTargetCompatibility.className = 'text-secondary font-semibold flex items-center gap-1';
          copyTargetCompatibility.innerHTML = `<span class="material-symbols-outlined text-[14px]">check_circle</span> Compatible (${srcType.toUpperCase()} ✓)`;
        }
        if (btnExecuteDbCopy) btnExecuteDbCopy.disabled = false;
      } else {
        if (copyTargetCompatibility) {
          copyTargetCompatibility.className = 'text-error font-semibold flex items-center gap-1';
          copyTargetCompatibility.innerHTML = `<span class="material-symbols-outlined text-[14px]">cancel</span> Incompatible (${srcType.toUpperCase()} ≠ ${tgtType.toUpperCase()})`;
        }
        if (btnExecuteDbCopy) btnExecuteDbCopy.disabled = true;
      }
    } else {
      if (copyTargetCompatibility) {
        copyTargetCompatibility.className = 'text-outline font-semibold';
        copyTargetCompatibility.textContent = 'Selecciona ambos';
      }
    }
  }

  async function fetchCopyHistory() {
    try {
      const res = await authFetch('/api/db-copy/history?limit=50');
      const json = await res.json();
      if (!json.success) return;

      currentCopiesList = json.data || [];
      renderCopyHistory(currentCopiesList);
    } catch (err) {
      console.error('Error fetching copy history:', err);
    }
  }

  function renderCopyHistory(copies) {
    if (!tableCopiesBody) return;

    if (badgeTotalCopies) {
      badgeTotalCopies.textContent = `${copies.length} copias registradas`;
    }

    if (!copies || copies.length === 0) {
      tableCopiesBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-outline py-8">
            No se han realizado copias entre conexiones todavía.
          </td>
        </tr>
      `;
      return;
    }

    tableCopiesBody.innerHTML = copies.map(c => `
      <tr class="hover:bg-surface-container/50 transition-colors">
        <td class="py-3 px-4 font-mono text-[11px] text-on-surface-variant">
          ${formatDate(c.created_at)}
        </td>
        <td class="py-3 px-4">
          <div class="flex items-center gap-1.5">
            <span class="w-5 h-5 rounded ${c.source_db_type === 'postgres' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'} flex items-center justify-center font-bold text-[9px]">
              ${c.source_db_type === 'postgres' ? 'PG' : 'MY'}
            </span>
            <div>
              <span class="font-medium text-on-surface font-mono text-xs block">${c.source_database}</span>
              <span class="font-mono text-[10px] text-outline truncate max-w-[160px] block" title="${c.backup_filename || ''}">${c.backup_filename || ''}</span>
            </div>
          </div>
        </td>
        <td class="py-3 px-4">
          <div>
            <span class="font-semibold text-primary font-mono text-xs block">${c.target_database_name}</span>
            <span class="font-mono text-[10px] text-outline block">${c.target_host}</span>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded font-mono text-[10px] ${c.target_db_type === 'postgres' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary/10 text-secondary border border-secondary/20'}">
            ${(c.target_db_type || 'PG').toUpperCase()}
          </span>
        </td>
        <td class="py-3 px-4">
          ${c.status === 'SUCCESS' ? `
            <span class="h-6 px-2.5 rounded-full font-mono text-[10px] bg-secondary/10 border border-secondary/30 text-secondary inline-flex items-center gap-1">
              <span class="material-symbols-outlined text-[13px]">check_circle</span>
              Restaurado
            </span>` :
            c.status === 'IN_PROGRESS' ? `
            <span class="h-6 px-2.5 rounded-full font-mono text-[10px] bg-primary-container/10 border border-primary-container/30 text-primary-container inline-flex items-center gap-1.5">
              <span class="w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse-dot"></span>
              Copiando...
            </span>` :
            `<span class="h-6 px-2.5 rounded-full font-mono text-[10px] bg-error-container/20 border border-error/30 text-error inline-flex items-center gap-1 cursor-help" title="${c.error_message || ''}">
              <span class="material-symbols-outlined text-[13px]">error</span>
              Falló
            </span>`}
        </td>
        <td class="py-3 px-4 font-mono text-xs text-on-surface-variant">
          ${c.duration_ms ? (c.duration_ms / 1000).toFixed(1) + 's' : '-'}
        </td>
        <td class="py-3 px-4 text-right">
          <button class="px-2.5 py-1 rounded bg-surface-container border border-outline-variant hover:bg-surface-variant text-on-surface font-mono text-[11px] btn-view-copy-logs inline-flex items-center gap-1" data-id="${c.id}" title="Ver logs detallados">
            <span class="material-symbols-outlined text-[14px]">terminal</span>
            Logs
          </button>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.btn-view-copy-logs').forEach(btn => {
      btn.addEventListener('click', () => showCopyLogsModal(btn.dataset.id));
    });
  }

  function showCopyLogsModal(copyId) {
    const copy = (currentCopiesList || []).find(c => c.id == copyId);
    if (!copy) return;

    logsContent.textContent = copy.logs || copy.error_message || 'No hay logs registrados para esta operación.';
    modalLogs.classList.add('open');
  }

  async function handleExecuteDbCopy() {
    const backupId = copySelectBackup.value;
    const targetDbId = copySelectTargetDb.value;

    if (!backupId || !targetDbId) {
      showToast('Por favor selecciona una copia de seguridad y una conexión de destino.', 'error');
      return;
    }

    const backup = (currentBackupsList || []).find(b => b.id == backupId);
    const targetDb = (currentDbsList || []).find(d => d.id == targetDbId);

    if (!backup || !targetDb) {
      showToast('Selección inválida.', 'error');
      return;
    }

    const srcType = (backup.db_type || 'postgres').toLowerCase();
    const tgtType = (targetDb.type || 'postgres').toLowerCase();
    const isSrcPg = srcType === 'postgres' || srcType === 'postgresql';
    const isTgtPg = tgtType === 'postgres' || tgtType === 'postgresql';
    const isSrcMy = srcType === 'mysql' || srcType === 'mariadb';
    const isTgtMy = tgtType === 'mysql' || tgtType === 'mariadb';

    if ((isSrcPg && !isTgtPg) || (isSrcMy && !isTgtMy)) {
      showToast(`Incompatibilidad: No puedes restaurar un respaldo de ${srcType.toUpperCase()} en un motor ${tgtType.toUpperCase()}.`, 'error');
      return;
    }

    const confirmMsg = `¿Confirmas que deseas restaurar el respaldo "${backup.filename}" en la base de datos "${targetDb.database_name}" (${targetDb.name})?\n\nEsta acción canalizará el stream directo desde Google Drive hacia el motor ${tgtType.toUpperCase()}.`;
    if (!confirm(confirmMsg)) return;

    try {
      btnExecuteDbCopy.disabled = true;
      btnExecuteDbCopy.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span><span>Copiando en tiempo real...</span>';

      if (copyFeedbackPanel) copyFeedbackPanel.classList.remove('hidden');
      if (copyFeedbackTitle) copyFeedbackTitle.textContent = `Restaurando copia en "${targetDb.name}" (${targetDb.database_name})...`;
      if (copyFeedbackPulse) copyFeedbackPulse.className = 'w-2 h-2 rounded-full bg-primary-container animate-pulse-dot';
      if (copyFeedbackLogs) copyFeedbackLogs.textContent = `[${new Date().toISOString()}] Solicitud enviada. Estableciendo streaming directo con Google Drive...\n`;

      const startTime = Date.now();
      if (copyTimerInterval) clearInterval(copyTimerInterval);
      copyTimerInterval = setInterval(() => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (copyFeedbackTimer) copyFeedbackTimer.textContent = `${elapsed}s`;
      }, 200);

      const res = await authFetch('/api/db-copy/execute', {
        method: 'POST',
        body: JSON.stringify({
          backup_id: backupId,
          target_db_id: targetDbId,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Error al iniciar la copia.');
      }

      const copyId = json.data.copyId;
      showToast(`Streaming iniciado para ${targetDb.name}. Monitoreando en tiempo real...`, 'info');

      // Poll status every 1000ms
      if (copyPollInterval) clearInterval(copyPollInterval);
      copyPollInterval = setInterval(async () => {
        try {
          const statusRes = await authFetch(`/api/db-copy/status/${copyId}`);
          const statusJson = await statusRes.json();
          if (!statusJson.success) return;

          const job = statusJson.data;
          if (job.logs && copyFeedbackLogs) {
            copyFeedbackLogs.textContent = job.logs;
            copyFeedbackLogs.scrollTop = copyFeedbackLogs.scrollHeight;
          }

          if (job.status === 'SUCCESS') {
            clearInterval(copyPollInterval);
            clearInterval(copyTimerInterval);
            copyPollInterval = null;
            copyTimerInterval = null;

            if (copyFeedbackTitle) copyFeedbackTitle.innerHTML = `<span class="text-secondary flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">check_circle</span> ¡Copia de base de datos restaurada con éxito!</span>`;
            if (copyFeedbackPulse) copyFeedbackPulse.className = 'w-2 h-2 rounded-full bg-secondary';
            showToast(`🎉 ¡Base de datos copiada exitosamente en ${targetDb.name}!`, 'success');

            btnExecuteDbCopy.disabled = false;
            btnExecuteDbCopy.innerHTML = '<span class="material-symbols-outlined text-[18px]">sync_alt</span><span>Iniciar Copia en Destino</span>';

            await fetchCopyHistory();
            await fetchDatabases();
          } else if (job.status === 'FAILED') {
            clearInterval(copyPollInterval);
            clearInterval(copyTimerInterval);
            copyPollInterval = null;
            copyTimerInterval = null;

            if (copyFeedbackTitle) copyFeedbackTitle.innerHTML = `<span class="text-error flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">error</span> Falló la copia de base de datos</span>`;
            if (copyFeedbackPulse) copyFeedbackPulse.className = 'w-2 h-2 rounded-full bg-error';
            showToast(`Error al copiar: ${job.error || 'Error desconocido'}`, 'error');

            btnExecuteDbCopy.disabled = false;
            btnExecuteDbCopy.innerHTML = '<span class="material-symbols-outlined text-[18px]">sync_alt</span><span>Iniciar Copia en Destino</span>';

            await fetchCopyHistory();
          }
        } catch (pollErr) {
          console.warn('Poll error:', pollErr);
        }
      }, 1000);

      await fetchCopyHistory();
    } catch (err) {
      if (copyTimerInterval) clearInterval(copyTimerInterval);
      if (copyPollInterval) clearInterval(copyPollInterval);
      copyTimerInterval = null;
      copyPollInterval = null;

      if (copyFeedbackTitle) copyFeedbackTitle.innerHTML = `<span class="text-error flex items-center gap-1"><span class="material-symbols-outlined text-[16px]">error</span> Error de inicio</span>`;
      if (copyFeedbackPulse) copyFeedbackPulse.className = 'w-2 h-2 rounded-full bg-error';
      if (copyFeedbackLogs) copyFeedbackLogs.textContent += `\n[ERROR] ${err.message}`;
      showToast(`Error al iniciar copia: ${err.message}`, 'error');

      btnExecuteDbCopy.disabled = false;
      btnExecuteDbCopy.innerHTML = '<span class="material-symbols-outlined text-[18px]">sync_alt</span><span>Iniciar Copia en Destino</span>';
    }
  }

  async function fetchGDriveConfig() {
    try {
      const res = await authFetch('/api/gdrive-config');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        gdriveAuthType.value = d.auth_type || 'oauth';
        gdriveFolderId.value = d.folder_id || '';
        if (d.client_id) gdriveClientId.value = d.client_id;
        if (d.has_client_secret) gdriveClientSecret.placeholder = '•••••••••••••••• (Configurado)';
        if (d.has_oauth) {
          if (oauthTokenStatus) {
            oauthTokenStatus.className = 'h-6 px-2.5 rounded-full font-mono text-[10px] bg-secondary/10 border border-secondary/30 text-secondary shrink-0 inline-flex items-center';
            oauthTokenStatus.textContent = 'Token Vinculado';
          }
          gdriveRefreshToken.placeholder = '•••••••••••••••• (Token Activo)';
        } else {
          if (oauthTokenStatus) {
            oauthTokenStatus.className = 'h-6 px-2.5 rounded-full font-mono text-[10px] bg-surface-container-high border border-outline-variant text-outline shrink-0 inline-flex items-center';
            oauthTokenStatus.textContent = 'Sin Token';
          }
        }

        if (d.auth_type === 'service_account') {
          sectionSaJson.classList.remove('hidden');
          sectionOauth.classList.add('hidden');
        } else {
          sectionSaJson.classList.add('hidden');
          sectionOauth.classList.remove('hidden');
        }
      }
    } catch (err) {
      console.error('Error fetching Google Drive config:', err);
    }
  }

  async function refreshAll() {
    try {
      await Promise.all([
        fetchStatus(),
        fetchDatabases(),
        fetchBackups(),
        fetchRestoreTests(),
        fetchGDriveConfig(),
        fetchCopyHistory()
      ]);
    } catch (e) {}
  }

  // Trigger Manual Backup
  btnTriggerBackup.addEventListener('click', async () => {
    const dbId = selectDbManual.value;
    if (!dbId) {
      showToast('Por favor selecciona una base de datos para respaldar.', 'error');
      return;
    }

    try {
      btnTriggerBackup.disabled = true;
      btnTriggerBackup.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span><span>Iniciando streaming...</span>';
      showToast('Iniciando transmisión directa a Google Drive...', 'info');

      const res = await authFetch(`/api/backups/trigger/${dbId}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast(json.message, 'success');
        await fetchBackups();
        await fetchStatus();
      } else {
        showToast('Error: ' + json.error, 'error');
      }
    } catch (err) {
      showToast('Error al iniciar copia: ' + err.message, 'error');
    } finally {
      btnTriggerBackup.disabled = false;
      btnTriggerBackup.innerHTML = '<span class="material-symbols-outlined text-[16px]">bolt</span><span>Iniciar Transmisión</span>';
    }
  });

  if (btnQuickBackup) {
    btnQuickBackup.addEventListener('click', () => {
      switchTab('tab-backups');
      if (selectDbManual.value) {
        btnTriggerBackup.click();
      } else {
        selectDbManual.focus();
        showToast('Selecciona la base de datos a respaldar en el panel.', 'info');
      }
    });
  }

  // Trigger Integrity Test
  async function triggerIntegrityTest(backupId) {
    try {
      showToast(`Iniciando prueba de integridad para backup #${backupId}...`, 'info');
      const res = await authFetch(`/api/restore-tests/trigger/${backupId}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        showToast('Auditoría iniciada con éxito.', 'success');
        switchTab('tab-integrity');
        await fetchRestoreTests();
        await fetchStatus();
      } else {
        showToast('Error: ' + json.error, 'error');
      }
    } catch (err) {
      showToast('Error al auditar backup: ' + err.message, 'error');
    }
  }

  // Database Modal Handlers
  btnOpenAddDb.addEventListener('click', () => {
    formDb.reset();
    document.getElementById('db-id').value = '';
    document.getElementById('modal-db-title').textContent = 'Agregar Nueva Base de Datos';
    modalDb.classList.add('open');
  });

  if (btnOpenAddDb2) {
    btnOpenAddDb2.addEventListener('click', () => btnOpenAddDb.click());
  }

  btnCloseDbModal.addEventListener('click', () => modalDb.classList.remove('open'));
  btnCancelDb.addEventListener('click', () => modalDb.classList.remove('open'));

  async function editDb(id) {
    try {
      const res = await authFetch('/api/db-configs');
      const json = await res.json();
      const db = json.data.find(d => d.id === Number(id));
      if (!db) return;

      document.getElementById('db-id').value = db.id;
      document.getElementById('db-name').value = db.name;
      document.getElementById('db-type').value = db.type;
      document.getElementById('db-host').value = db.host;
      document.getElementById('db-port').value = db.port;
      document.getElementById('db-database').value = db.database_name;
      document.getElementById('db-user').value = db.username;
      document.getElementById('db-password').value = '';
      document.getElementById('db-ssl').checked = Boolean(db.ssl);

      document.getElementById('modal-db-title').textContent = 'Editar Base de Datos: ' + db.name;
      modalDb.classList.add('open');
    } catch (err) {
      showToast('Error al cargar base de datos: ' + err.message, 'error');
    }
  }

  async function deleteDb(id) {
    if (!confirm('¿Seguro que deseas eliminar esta configuración de base de datos?')) return;
    try {
      const res = await authFetch(`/api/db-configs/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        showToast('Base de datos eliminada.', 'success');
        await fetchDatabases();
        await fetchStatus();
      } else {
        showToast('Error al eliminar: ' + json.error, 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  }

  // Save DB
  formDb.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('db-id').value;
    const payload = {
      name: document.getElementById('db-name').value,
      type: document.getElementById('db-type').value,
      host: document.getElementById('db-host').value,
      port: parseInt(document.getElementById('db-port').value, 10),
      database_name: document.getElementById('db-database').value,
      username: document.getElementById('db-user').value,
      password: document.getElementById('db-password').value,
      ssl: document.getElementById('db-ssl').checked,
    };

    try {
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/db-configs/${id}` : '/api/db-configs';
      const res = await authFetch(url, {
        method,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Base de datos guardada exitosamente.', 'success');
        modalDb.classList.remove('open');
        await fetchDatabases();
        await fetchStatus();
      } else {
        showToast('Error: ' + json.error, 'error');
      }
    } catch (err) {
      showToast('Error al guardar: ' + err.message, 'error');
    }
  });

  // Test DB Connection
  btnTestDbConn.addEventListener('click', async () => {
    const payload = {
      type: document.getElementById('db-type').value,
      host: document.getElementById('db-host').value,
      port: parseInt(document.getElementById('db-port').value, 10),
      database_name: document.getElementById('db-database').value,
      username: document.getElementById('db-user').value,
      password: document.getElementById('db-password').value,
      ssl: document.getElementById('db-ssl').checked,
    };

    if (!payload.host || !payload.database_name || !payload.username) {
      showToast('Por favor completa los campos principales antes de probar.', 'error');
      return;
    }

    try {
      btnTestDbConn.disabled = true;
      btnTestDbConn.textContent = 'Probando conexión...';
      const res = await authFetch('/api/db-configs/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ Conexión exitosa (${json.result.latencyMs}ms)`, 'success');
      } else {
        showToast('❌ Falló la conexión: ' + json.error, 'error');
      }
    } catch (err) {
      showToast('Error al probar: ' + err.message, 'error');
    } finally {
      btnTestDbConn.disabled = false;
      btnTestDbConn.textContent = 'Probar Conexión';
    }
  });

  // Save Google Drive Form
  formGdrive.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      auth_type: gdriveAuthType.value,
      folder_id: gdriveFolderId.value.trim() || 'root',
      service_account_json: gdriveSaJson.value.trim(),
      client_id: gdriveClientId.value.trim(),
      client_secret: gdriveClientSecret.value.trim(),
      refresh_token: gdriveRefreshToken.value.trim(),
    };

    try {
      const res = await authFetch('/api/gdrive-config', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showToast('Credenciales de Google Drive guardadas exitosamente.', 'success');
        await fetchGDriveConfig();
        await fetchStatus();
      } else {
        showToast('Error: ' + json.error, 'error');
      }
    } catch (err) {
      showToast('Error al guardar credenciales: ' + err.message, 'error');
    }
  });

  // Test Google Drive
  btnTestGdrive.addEventListener('click', async () => {
    const payload = {
      auth_type: gdriveAuthType.value,
      folder_id: gdriveFolderId.value.trim() || 'root',
      service_account_json: gdriveSaJson.value.trim(),
      client_id: gdriveClientId.value.trim(),
      client_secret: gdriveClientSecret.value.trim(),
      refresh_token: gdriveRefreshToken.value.trim(),
    };

    try {
      btnTestGdrive.disabled = true;
      btnTestGdrive.innerHTML = '<span class="material-symbols-outlined text-[16px] animate-spin">sync</span><span>Verificando Drive...</span>';
      const res = await authFetch('/api/gdrive-config/test', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        showToast(`✅ Conectado a Drive: ${json.result.folderName} (${json.result.account})`, 'success');
        await fetchStatus();
      } else {
        showToast('❌ ' + json.error, 'error');
      }
    } catch (err) {
      showToast('Error al verificar: ' + err.message, 'error');
    } finally {
      btnTestGdrive.disabled = false;
      btnTestGdrive.innerHTML = '<span class="material-symbols-outlined text-[16px]">cloud_sync</span><span>Probar Conexión con Drive</span>';
    }
  });

  // Logs Modal Close
  btnCloseLogsModal.addEventListener('click', () => modalLogs.classList.remove('open'));
  btnCloseLogs.addEventListener('click', () => modalLogs.classList.remove('open'));

  // Database Copy Event Listeners (Dokploy / VPS)
  if (copySelectBackup) copySelectBackup.addEventListener('change', updateCopyDetails);
  if (copySelectTargetDb) copySelectTargetDb.addEventListener('change', updateCopyDetails);
  if (btnExecuteDbCopy) btnExecuteDbCopy.addEventListener('click', handleExecuteDbCopy);
  if (btnCopyFeedbackLogs && copyFeedbackLogs) {
    btnCopyFeedbackLogs.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyFeedbackLogs.innerText);
        showToast('Logs copiados al portapapeles', 'success');
      } catch (e) {}
    });
  }

  // Refresh Button
  btnRefresh.addEventListener('click', async () => {
    showToast('Actualizando datos...', 'info');
    await refreshAll();
  });

  // Initial Boot with Auth Verification
  checkAuthStatus().then((authenticated) => {
    if (authenticated) {
      refreshAll();
    }
  });

  // Background Auto-Refresh every 6 seconds if authenticated
  setInterval(() => {
    if (!lockScreenOverlay.classList.contains('hidden')) return;
    fetchStatus();
    fetchBackups();
    fetchRestoreTests();
    fetchCopyHistory();
  }, 6000);
});
