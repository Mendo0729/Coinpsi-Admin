import { API_BASE_URL } from "../config.js";
import { navigate } from "../router/router.js";
import {
  getGallerySelection,
  getGoogleDriveAuthorizationUrl,
  getGoogleDriveFolder,
  getGoogleDriveImageBlob,
  getGoogleDriveStatus,
  runGoogleDriveTest,
  saveGallerySelection
} from "../services/google-drive.service.js";
import { clearSession, getSession } from "../services/session.service.js";

const state = {
  drive: null,
  currentFolder: null,
  items: [],
  folderStack: [],
  selected: new Map(),
  previewUrls: new Map(),
  loadingFolder: false
};

let driveMessageHandler = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function deriveTitle(name) {
  return String(name || "Imagen COINPSI")
    .replace(/\.[a-z0-9]{2,8}$/i, "")
    .replace(/[_-]+/g, " ")
    .trim() || "Imagen COINPSI";
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "Sin dato";

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / 1024 ** index;
  return `${amount.toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function showFeedback(type, message) {
  const feedback = document.getElementById("gallery-feedback");
  if (!feedback) return;

  feedback.className = `drive-feedback drive-feedback-${type}`;
  feedback.textContent = message;
  feedback.hidden = false;
}

function hideFeedback() {
  const feedback = document.getElementById("gallery-feedback");
  if (feedback) feedback.hidden = true;
}

function handleUnauthorized(error) {
  if (error.status !== 401 && error.code !== "UNAUTHORIZED") return false;
  clearSession();
  navigate("/login", { replace: true });
  return true;
}

function clearPreviewUrls() {
  state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
  state.previewUrls.clear();
}

function renderConnection() {
  const container = document.getElementById("drive-status-content");
  if (!container) return;

  const drive = state.drive || {};
  if (!drive.configured) {
    container.innerHTML = `
      <div class="drive-state drive-state-error compact">
        <span class="drive-state-icon">!</span>
        <div><strong>Configuracion incompleta</strong><p>${escapeHtml(drive.message || "Faltan variables OAuth en Coinpsi-API.")}</p></div>
      </div>
    `;
    return;
  }

  if (!drive.connected) {
    container.innerHTML = `
      <div class="drive-connection-summary">
        <div>
          <span class="drive-status-pill pending">Pendiente</span>
          <h3>Autoriza Google Drive</h3>
          <p>La carpeta raiz esta definida, pero la cuenta aun no esta conectada.</p>
        </div>
        <dl class="drive-details">
          <div><dt>Carpeta raiz</dt><dd>${escapeHtml(drive.rootFolderId || "No definida")}</dd></div>
          <div><dt>Metodo</dt><dd>OAuth 2.0</dd></div>
        </dl>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="drive-connection-summary connected">
      <div>
        <span class="drive-status-pill connected">Conectado</span>
        <h3>${escapeHtml(drive.rootFolder?.name || "Google Drive")}</h3>
        <p>Ya puedes navegar por las carpetas, ver las imagenes y escoger cuales aparecen en la landing.</p>
      </div>
      <dl class="drive-details">
        <div><dt>Cuenta</dt><dd>${escapeHtml(drive.account?.emailAddress || "Cuenta autorizada")}</dd></div>
        <div><dt>Elementos raiz</dt><dd>${Array.isArray(drive.items) ? drive.items.length : 0}</dd></div>
      </dl>
    </div>
  `;
}

function renderFolderBrowser() {
  const container = document.getElementById("drive-browser-content");
  const backButton = document.getElementById("drive-back-button");
  const title = document.getElementById("drive-current-folder");
  if (!container) return;

  if (backButton) backButton.disabled = state.folderStack.length <= 1;
  if (title) title.textContent = state.currentFolder?.name || "Carpeta raiz";

  if (state.loadingFolder) {
    container.innerHTML = `
      <div class="drive-state compact">
        <span class="drive-spinner" aria-hidden="true"></span>
        <div><strong>Cargando carpeta</strong><p>Consultando Google Drive y preparando las vistas previas.</p></div>
      </div>
    `;
    return;
  }

  const folders = state.items.filter((item) => item.isFolder);
  const images = state.items.filter((item) => item.isImage);

  if (!folders.length && !images.length) {
    container.innerHTML = `
      <div class="drive-state compact">
        <span class="drive-state-icon">0</span>
        <div><strong>Carpeta sin imagenes</strong><p>No se encontraron subcarpetas ni imagenes compatibles.</p></div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    ${folders.length ? `
      <div class="gallery-browser-group">
        <h4>Carpetas</h4>
        <div class="gallery-folder-grid">
          ${folders.map((folder) => `
            <button class="gallery-folder-card" type="button" data-open-folder="${escapeHtml(folder.id)}">
              <span class="gallery-folder-icon">DIR</span>
              <strong>${escapeHtml(folder.name)}</strong>
              <small>Abrir carpeta</small>
            </button>
          `).join("")}
        </div>
      </div>
    ` : ""}

    ${images.length ? `
      <div class="gallery-browser-group">
        <div class="gallery-browser-title-row">
          <h4>Imagenes</h4>
          <span>${images.length} disponibles</span>
        </div>
        <div class="gallery-image-picker-grid">
          ${images.map((image) => {
            const selected = state.selected.has(image.id);
            return `
              <label class="gallery-picker-card ${selected ? "selected" : ""}" data-picker-card="${escapeHtml(image.id)}">
                <span class="gallery-picker-check">
                  <input type="checkbox" data-select-image="${escapeHtml(image.id)}" ${selected ? "checked" : ""} />
                  <span>${selected ? "Seleccionada" : "Seleccionar"}</span>
                </span>
                <div class="gallery-picker-preview">
                  <img data-drive-preview="${escapeHtml(image.id)}" alt="${escapeHtml(image.name)}" />
                  <span class="gallery-preview-loading">Cargando imagen...</span>
                </div>
                <strong title="${escapeHtml(image.name)}">${escapeHtml(image.name)}</strong>
                <small>${escapeHtml(formatBytes(image.size))}</small>
              </label>
            `;
          }).join("")}
        </div>
      </div>
    ` : ""}
  `;

  hydratePreviews(container);
}

function renderSelection() {
  const container = document.getElementById("gallery-selection-content");
  const count = document.getElementById("gallery-selection-count");
  const saveButton = document.getElementById("gallery-save-button");
  const items = Array.from(state.selected.values());

  if (count) count.textContent = String(items.length);
  if (saveButton) saveButton.disabled = !state.drive?.connected;
  if (!container) return;

  if (!items.length) {
    container.innerHTML = `
      <div class="drive-state compact">
        <span class="drive-state-icon">0</span>
        <div><strong>No hay imagenes seleccionadas</strong><p>Abre una carpeta y marca las fotografias que deseas mostrar en la landing.</p></div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="gallery-selected-grid">
      ${items.map((item, index) => `
        <article class="gallery-selected-card">
          <div class="gallery-selected-preview">
            <img data-drive-preview="${escapeHtml(item.fileId)}" alt="${escapeHtml(item.title || item.name)}" />
            <span class="gallery-preview-loading">Cargando...</span>
          </div>
          <div class="gallery-selected-fields">
            <label>Titulo
              <input type="text" maxlength="180" value="${escapeHtml(item.title || deriveTitle(item.name))}" data-selected-title="${escapeHtml(item.fileId)}" />
            </label>
            <label>Categoria
              <input type="text" maxlength="80" value="${escapeHtml(item.category || item.folderName || "Galeria")}" data-selected-category="${escapeHtml(item.fileId)}" />
            </label>
            <label class="gallery-featured-field">
              <input type="checkbox" data-selected-featured="${escapeHtml(item.fileId)}" ${item.isFeatured ? "checked" : ""} />
              Destacada
            </label>
          </div>
          <div class="gallery-selected-actions">
            <span>#${index + 1}</span>
            <button class="btn btn-danger-outline" type="button" data-remove-selected="${escapeHtml(item.fileId)}">Quitar</button>
          </div>
        </article>
      `).join("")}
    </div>
  `;

  hydratePreviews(container);
}

async function hydratePreviews(scope) {
  const session = getSession();
  if (!session?.token) return;

  const images = scope.querySelectorAll("img[data-drive-preview]");
  await Promise.all(Array.from(images).map(async (imageElement) => {
    const fileId = imageElement.dataset.drivePreview;
    const loading = imageElement.parentElement?.querySelector(".gallery-preview-loading");

    if (state.previewUrls.has(fileId)) {
      imageElement.src = state.previewUrls.get(fileId);
      if (loading) loading.hidden = true;
      return;
    }

    try {
      const blob = await getGoogleDriveImageBlob(session.token, fileId);
      const objectUrl = URL.createObjectURL(blob);
      state.previewUrls.set(fileId, objectUrl);
      imageElement.src = objectUrl;
      if (loading) loading.hidden = true;
    } catch {
      if (loading) loading.textContent = "Vista previa no disponible";
    }
  }));
}

async function loadFolder(folderId, pushHistory = true) {
  const session = getSession();
  if (!session?.token) return;

  state.loadingFolder = true;
  renderFolderBrowser();

  try {
    const response = await getGoogleDriveFolder(session.token, folderId);
    state.currentFolder = response.folder;
    state.items = response.items || [];

    if (pushHistory) {
      const last = state.folderStack[state.folderStack.length - 1];
      if (!last || last.id !== response.folder.id) {
        state.folderStack.push({ id: response.folder.id, name: response.folder.name });
      }
    }
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
    state.items = [];
  } finally {
    state.loadingFolder = false;
    renderFolderBrowser();
  }
}

async function loadInitialData() {
  const session = getSession();
  if (!session?.token) return;

  showFeedback("info", "Consultando Google Drive y la seleccion publicada...");

  try {
    const [statusResponse, selectionResponse] = await Promise.all([
      getGoogleDriveStatus(session.token),
      getGallerySelection(session.token)
    ]);

    state.drive = statusResponse.drive || {};
    state.selected = new Map(
      (selectionResponse.selection?.items || []).map((item) => [item.fileId, item])
    );

    renderConnection();
    renderSelection();

    const connectButton = document.getElementById("drive-connect-button");
    const testButton = document.getElementById("drive-test-button");
    if (connectButton) {
      connectButton.textContent = state.drive.connected ? "Reconectar Google Drive" : "Conectar Google Drive";
    }
    if (testButton) testButton.disabled = !state.drive.connected;

    if (state.drive.connected && state.drive.rootFolder?.id) {
      state.folderStack = [];
      await loadFolder(state.drive.rootFolder.id, true);
    }

    hideFeedback();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
  }
}

async function handleConnect() {
  const session = getSession();
  if (!session?.token) return;

  try {
    const response = await getGoogleDriveAuthorizationUrl(session.token);
    const popup = window.open(
      response.authorizationUrl,
      "coinpsi-google-drive-oauth",
      "width=620,height=760,noopener=no"
    );

    if (!popup) window.location.assign(response.authorizationUrl);
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
  }
}

async function handleDriveTest() {
  const session = getSession();
  const button = document.getElementById("drive-test-button");
  if (!session?.token || !button) return;

  button.disabled = true;
  showFeedback("info", "Ejecutando la prueba de subida, descarga y limpieza...");

  try {
    const response = await runGoogleDriveTest(session.token);
    const test = response.test || {};
    showFeedback(
      test.cleanup?.status === "trashed" ? "success" : "error",
      test.cleanup?.status === "trashed"
        ? "Prueba completada. La imagen temporal fue enviada a la papelera."
        : "La prueba termino, pero la limpieza no pudo confirmarse."
    );
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
  } finally {
    button.disabled = false;
  }
}

async function handleSaveSelection() {
  const session = getSession();
  const button = document.getElementById("gallery-save-button");
  if (!session?.token || !button) return;

  button.disabled = true;
  showFeedback("info", "Guardando la seleccion y preparando la galeria publica...");

  try {
    const items = Array.from(state.selected.values());
    const response = await saveGallerySelection(session.token, items);
    state.selected = new Map(
      (response.selection?.items || []).map((item) => [item.fileId, item])
    );
    renderFolderBrowser();
    renderSelection();
    showFeedback("success", `${state.selected.size} imagenes quedaron publicadas para la landing.`);
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
  } finally {
    button.disabled = false;
  }
}

function handleBrowserClick(event) {
  const folderButton = event.target.closest("[data-open-folder]");
  if (folderButton) {
    loadFolder(folderButton.dataset.openFolder, true);
    return;
  }

  const removeButton = event.target.closest("[data-remove-selected]");
  if (removeButton) {
    state.selected.delete(removeButton.dataset.removeSelected);
    renderFolderBrowser();
    renderSelection();
  }
}

function handleBrowserChange(event) {
  const selectInput = event.target.closest("[data-select-image]");
  if (selectInput) {
    const fileId = selectInput.dataset.selectImage;
    const image = state.items.find((item) => item.id === fileId);

    if (selectInput.checked && image) {
      state.selected.set(fileId, {
        fileId,
        name: image.name,
        title: deriveTitle(image.name),
        description: "Actividad realizada por COINPSI.",
        category: state.currentFolder?.name || "Galeria",
        folderId: state.currentFolder?.id || null,
        folderName: state.currentFolder?.name || null,
        isFeatured: false
      });
    } else {
      state.selected.delete(fileId);
    }

    renderFolderBrowser();
    renderSelection();
    return;
  }

  const titleInput = event.target.closest("[data-selected-title]");
  if (titleInput) {
    const item = state.selected.get(titleInput.dataset.selectedTitle);
    if (item) item.title = titleInput.value;
    return;
  }

  const categoryInput = event.target.closest("[data-selected-category]");
  if (categoryInput) {
    const item = state.selected.get(categoryInput.dataset.selectedCategory);
    if (item) item.category = categoryInput.value;
    return;
  }

  const featuredInput = event.target.closest("[data-selected-featured]");
  if (featuredInput) {
    const item = state.selected.get(featuredInput.dataset.selectedFeatured);
    if (item) item.isFeatured = featuredInput.checked;
  }
}

function handleBack() {
  if (state.folderStack.length <= 1) return;
  state.folderStack.pop();
  const previous = state.folderStack[state.folderStack.length - 1];
  loadFolder(previous.id, false);
}

export function renderGalleryPage() {
  return `
    <section class="page-heading">
      <div>
        <span class="eyebrow">GESTION VISUAL</span>
        <h2>Galeria desde Google Drive</h2>
        <p>Navega por las carpetas, mira las fotografias y escoge cuales se muestran en la landing.</p>
      </div>
      <div class="drive-heading-actions">
        <button class="btn btn-secondary" id="drive-refresh-button" type="button">Actualizar</button>
        <button class="btn btn-primary" id="drive-connect-button" type="button">Conectar Google Drive</button>
      </div>
    </section>

    <div id="gallery-feedback" class="drive-feedback" hidden></div>

    <section class="drive-layout">
      <article class="panel-card drive-panel">
        <div class="drive-panel-heading">
          <div><span class="eyebrow">CONEXION</span><h3>Cuenta y carpeta raiz</h3></div>
          <button class="btn btn-secondary" id="drive-test-button" type="button" disabled>Probar conexion</button>
        </div>
        <div id="drive-status-content">
          <div class="drive-state compact"><span class="drive-spinner"></span><div><strong>Consultando Google Drive</strong></div></div>
        </div>
      </article>

      <article class="panel-card drive-panel">
        <div class="drive-panel-heading gallery-browser-heading">
          <div><span class="eyebrow">EXPLORADOR</span><h3 id="drive-current-folder">Carpeta raiz</h3></div>
          <button class="btn btn-secondary" id="drive-back-button" type="button" disabled>Volver</button>
        </div>
        <div id="drive-browser-content">
          <div class="drive-state compact"><span class="drive-spinner"></span><div><strong>Cargando contenido</strong></div></div>
        </div>
      </article>

      <article class="panel-card drive-panel">
        <div class="drive-panel-heading">
          <div>
            <span class="eyebrow">PUBLICACION</span>
            <h3>Seleccion para la landing (<span id="gallery-selection-count">0</span>)</h3>
          </div>
          <button class="btn btn-primary" id="gallery-save-button" type="button">Guardar y publicar</button>
        </div>
        <div id="gallery-selection-content"></div>
      </article>
    </section>
  `;
}

export function initGalleryPage() {
  clearPreviewUrls();
  state.drive = null;
  state.currentFolder = null;
  state.items = [];
  state.folderStack = [];
  state.selected = new Map();

  document.getElementById("drive-connect-button")?.addEventListener("click", handleConnect);
  document.getElementById("drive-refresh-button")?.addEventListener("click", loadInitialData);
  document.getElementById("drive-test-button")?.addEventListener("click", handleDriveTest);
  document.getElementById("drive-back-button")?.addEventListener("click", handleBack);
  document.getElementById("gallery-save-button")?.addEventListener("click", handleSaveSelection);
  document.getElementById("drive-browser-content")?.addEventListener("click", handleBrowserClick);
  document.getElementById("drive-browser-content")?.addEventListener("change", handleBrowserChange);
  document.getElementById("gallery-selection-content")?.addEventListener("click", handleBrowserClick);
  document.getElementById("gallery-selection-content")?.addEventListener("input", handleBrowserChange);
  document.getElementById("gallery-selection-content")?.addEventListener("change", handleBrowserChange);

  if (driveMessageHandler) window.removeEventListener("message", driveMessageHandler);
  const expectedOrigin = new URL(API_BASE_URL).origin;

  driveMessageHandler = (event) => {
    if (event.origin !== expectedOrigin) return;
    if (event.data?.type === "coinpsi-google-drive-connected") {
      showFeedback("success", "Google Drive fue autorizado correctamente.");
      loadInitialData();
    }
    if (event.data?.type === "coinpsi-google-drive-error") {
      showFeedback("error", "Google no completo la autorizacion.");
    }
  };

  window.addEventListener("message", driveMessageHandler);
  loadInitialData();
}
