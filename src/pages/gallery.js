import { API_BASE_URL } from "../config.js";
import { icon } from "../icons.js";
import { navigate } from "../router/router.js";
import {
  getGoogleDriveAuthorizationUrl,
  getGoogleDriveStatus,
  runGoogleDriveTest
} from "../services/google-drive.service.js";
import { clearSession, getSession } from "../services/session.service.js";

const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
let driveMessageHandler = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeExternalUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "Sin dato";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** index;
  return `${amount.toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function formatDate(value) {
  if (!value) return "Sin fecha";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Panama"
  }).format(date);
}

function renderLoadingState(message = "Consultando Google Drive") {
  return `
    <div class="drive-state" role="status">
      <span class="drive-spinner" aria-hidden="true"></span>
      <div><strong>${escapeHtml(message)}</strong><p>Espera mientras Coinpsi-API valida la conexion.</p></div>
    </div>
  `;
}

function renderDriveStatus(drive) {
  if (!drive.configured) {
    return `
      <div class="drive-state drive-state-error">
        <span class="drive-state-icon">!</span>
        <div>
          <strong>Configuracion incompleta</strong>
          <p>${escapeHtml(drive.message || "Faltan variables OAuth en Coinpsi-API.")}</p>
        </div>
      </div>
    `;
  }

  if (!drive.connected) {
    return `
      <div class="drive-connection-summary">
        <div>
          <span class="drive-status-pill pending">Pendiente</span>
          <h3>Autoriza la cuenta de Google de COINPSI</h3>
          <p>La carpeta ya esta definida. Falta completar OAuth para que el panel pueda consultar y probar Google Drive.</p>
        </div>
        <dl class="drive-details">
          <div><dt>Carpeta raiz</dt><dd>${escapeHtml(drive.rootFolderId || "No definida")}</dd></div>
          <div><dt>Metodo</dt><dd>OAuth 2.0</dd></div>
        </dl>
      </div>
    `;
  }

  const account = drive.account || {};
  const folder = drive.rootFolder || {};
  const quota = drive.storageQuota || {};
  const folderUrl = safeExternalUrl(folder.webViewLink);

  return `
    <div class="drive-connection-summary connected">
      <div>
        <span class="drive-status-pill connected">Conectado</span>
        <h3>${escapeHtml(folder.name || "Carpeta de Google Drive")}</h3>
        <p>La API tiene acceso a la carpeta indicada y puede listar sus elementos.</p>
      </div>
      <dl class="drive-details">
        <div><dt>Cuenta</dt><dd>${escapeHtml(account.emailAddress || account.displayName || "Cuenta autorizada")}</dd></div>
        <div><dt>Uso</dt><dd>${escapeHtml(formatBytes(quota.usage))}${quota.limit ? ` de ${escapeHtml(formatBytes(quota.limit))}` : ""}</dd></div>
        <div><dt>Permite agregar</dt><dd>${folder.capabilities?.canAddChildren ? "Si" : "No confirmado"}</dd></div>
      </dl>
      ${folderUrl ? `<a class="btn btn-secondary" href="${escapeHtml(folderUrl)}" target="_blank" rel="noopener noreferrer">Abrir carpeta</a>` : ""}
    </div>
  `;
}

function renderDriveItems(drive) {
  if (!drive.connected) {
    return `
      <div class="drive-state compact">
        <span class="drive-state-icon">${icon("Image")}</span>
        <div><strong>Contenido no disponible</strong><p>Conecta Google Drive para consultar las carpetas existentes.</p></div>
      </div>
    `;
  }

  const items = Array.isArray(drive.items) ? drive.items : [];
  if (!items.length) {
    return `
      <div class="drive-state compact">
        <span class="drive-state-icon">${icon("Image")}</span>
        <div><strong>Carpeta vacia</strong><p>No se encontraron elementos dentro de la carpeta configurada.</p></div>
      </div>
    `;
  }

  return `
    <div class="drive-item-grid">
      ${items.map((item) => {
        const isFolder = item.mimeType === FOLDER_MIME_TYPE;
        const url = safeExternalUrl(item.webViewLink);
        const content = `
          <span class="drive-item-type">${isFolder ? "Carpeta" : "Archivo"}</span>
          <strong>${escapeHtml(item.name || "Sin nombre")}</strong>
          <small>${isFolder ? "Google Drive" : escapeHtml(formatBytes(item.size))} · ${escapeHtml(formatDate(item.modifiedTime))}</small>
        `;

        return url
          ? `<a class="drive-item-card" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${content}</a>`
          : `<article class="drive-item-card">${content}</article>`;
      }).join("")}
    </div>
  `;
}

function renderTestResult(test) {
  if (!test) {
    return `
      <div class="drive-state compact">
        <span class="drive-state-icon">${icon("Check")}</span>
        <div><strong>Prueba pendiente</strong><p>La prueba creara COINPSI-DEV, subira una imagen temporal, la descargara y la enviara a la papelera.</p></div>
      </div>
    `;
  }

  const cleanupOk = test.cleanup?.status === "trashed";

  return `
    <div class="drive-test-result ${cleanupOk ? "success" : "warning"}">
      <span class="drive-status-pill ${cleanupOk ? "connected" : "pending"}">${cleanupOk ? "Prueba completada" : "Revisar limpieza"}</span>
      <h3>${escapeHtml(test.folder?.name || "COINPSI-DEV")}</h3>
      <div class="drive-test-steps">
        <div><span>1</span><p><strong>Carpeta</strong><small>${test.folder?.created ? "Creada" : "Ya existia"}</small></p></div>
        <div><span>2</span><p><strong>Subida</strong><small>${escapeHtml(test.upload?.name || "Imagen temporal")}</small></p></div>
        <div><span>3</span><p><strong>Descarga</strong><small>${test.download?.matchesUpload ? "Contenido validado" : "Contenido no coincide"}</small></p></div>
        <div><span>4</span><p><strong>Limpieza</strong><small>${cleanupOk ? "Imagen enviada a la papelera" : escapeHtml(test.cleanup?.status || "No confirmada")}</small></p></div>
      </div>
    </div>
  `;
}

function showFeedback(type, message) {
  const feedback = document.getElementById("google-drive-feedback");
  if (!feedback) return;

  feedback.className = `drive-feedback drive-feedback-${type}`;
  feedback.textContent = message;
  feedback.hidden = false;
}

function hideFeedback() {
  const feedback = document.getElementById("google-drive-feedback");
  if (feedback) feedback.hidden = true;
}

function handleUnauthorized(error) {
  if (error.status !== 401 && error.code !== "UNAUTHORIZED") return false;
  clearSession();
  navigate("/login", { replace: true });
  return true;
}

async function loadDriveStatus() {
  const session = getSession();
  if (!session?.token) return;

  const statusContainer = document.getElementById("drive-status-content");
  const itemsContainer = document.getElementById("drive-items-content");
  const testButton = document.getElementById("drive-test-button");
  const connectButton = document.getElementById("drive-connect-button");

  if (statusContainer) statusContainer.innerHTML = renderLoadingState();
  if (itemsContainer) itemsContainer.innerHTML = renderLoadingState("Consultando contenido");

  try {
    const response = await getGoogleDriveStatus(session.token);
    const drive = response.drive || {};

    if (statusContainer) statusContainer.innerHTML = renderDriveStatus(drive);
    if (itemsContainer) itemsContainer.innerHTML = renderDriveItems(drive);
    if (testButton) testButton.disabled = !drive.connected;
    if (connectButton) connectButton.textContent = drive.connected ? "Reconectar Google Drive" : "Conectar Google Drive";
    hideFeedback();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
    if (statusContainer) statusContainer.innerHTML = renderDriveStatus({ configured: false, message: error.message });
    if (itemsContainer) itemsContainer.innerHTML = renderDriveItems({ connected: false });
  }
}

async function handleConnect() {
  const session = getSession();
  const button = document.getElementById("drive-connect-button");
  if (!session?.token || !button) return;

  button.disabled = true;
  showFeedback("info", "Generando enlace seguro de Google...");

  try {
    const response = await getGoogleDriveAuthorizationUrl(session.token);
    const popup = window.open(
      response.authorizationUrl,
      "coinpsi-google-drive-oauth",
      "width=620,height=760,noopener=no"
    );

    if (!popup) {
      window.location.assign(response.authorizationUrl);
      return;
    }

    showFeedback("info", "Completa la autorizacion en la ventana de Google.");
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
  } finally {
    button.disabled = false;
  }
}

async function handleDriveTest() {
  const session = getSession();
  const button = document.getElementById("drive-test-button");
  const container = document.getElementById("drive-test-content");
  if (!session?.token || !button || !container) return;

  button.disabled = true;
  container.innerHTML = renderLoadingState("Ejecutando prueba controlada");
  showFeedback("info", "Subiendo y validando una imagen temporal...");

  try {
    const response = await runGoogleDriveTest(session.token);
    container.innerHTML = renderTestResult(response.test);
    showFeedback("success", "Google Drive respondio correctamente. La imagen temporal fue enviada a la papelera.");
    await loadDriveStatus();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
    container.innerHTML = `
      <div class="drive-state drive-state-error compact">
        <span class="drive-state-icon">!</span>
        <div><strong>La prueba fallo</strong><p>${escapeHtml(error.message)}</p></div>
      </div>
    `;
  } finally {
    button.disabled = false;
  }
}

export function renderGalleryPage() {
  return `
    <section class="page-heading">
      <div>
        <span class="eyebrow">GESTION VISUAL</span>
        <h2>Galeria y Google Drive</h2>
        <p>Conecta la carpeta existente y valida el acceso antes de desarrollar la gestion completa de imagenes.</p>
      </div>
      <div class="drive-heading-actions">
        <button class="btn btn-secondary" id="drive-refresh-button" type="button">Actualizar</button>
        <button class="btn btn-primary" id="drive-connect-button" type="button">Conectar Google Drive</button>
      </div>
    </section>

    <div id="google-drive-feedback" class="drive-feedback" hidden></div>

    <section class="drive-layout">
      <article class="panel-card drive-panel">
        <div class="drive-panel-heading">
          <div><span class="eyebrow">CONEXION</span><h3>Cuenta y carpeta raiz</h3></div>
          <span class="drive-folder-id">1d-DBeWnepeN0CzTnzMu4gBE1_3XcSpE1</span>
        </div>
        <div id="drive-status-content">${renderLoadingState()}</div>
      </article>

      <article class="panel-card drive-panel">
        <div class="drive-panel-heading">
          <div><span class="eyebrow">CONTENIDO ACTUAL</span><h3>Elementos de la carpeta</h3></div>
        </div>
        <div id="drive-items-content">${renderLoadingState("Consultando contenido")}</div>
      </article>

      <article class="panel-card drive-panel drive-test-panel">
        <div class="drive-panel-heading">
          <div><span class="eyebrow">PRUEBA CONTROLADA</span><h3>Subida, lectura y limpieza</h3></div>
          <button class="btn btn-primary" id="drive-test-button" type="button" disabled>Ejecutar prueba</button>
        </div>
        <div id="drive-test-content">${renderTestResult(null)}</div>
      </article>
    </section>
  `;
}

export function initGalleryPage() {
  document.getElementById("drive-connect-button")?.addEventListener("click", handleConnect);
  document.getElementById("drive-refresh-button")?.addEventListener("click", loadDriveStatus);
  document.getElementById("drive-test-button")?.addEventListener("click", handleDriveTest);

  if (driveMessageHandler) window.removeEventListener("message", driveMessageHandler);

  const expectedOrigin = new URL(API_BASE_URL).origin;
  driveMessageHandler = (event) => {
    if (event.origin !== expectedOrigin) return;

    if (event.data?.type === "coinpsi-google-drive-connected") {
      showFeedback("success", "Google Drive fue autorizado correctamente.");
      loadDriveStatus();
    }

    if (event.data?.type === "coinpsi-google-drive-error") {
      showFeedback("error", "Google no completo la autorizacion.");
    }
  };

  window.addEventListener("message", driveMessageHandler);
  loadDriveStatus();
}
