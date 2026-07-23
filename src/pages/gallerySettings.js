import { icon } from "../icons.js";
import { navigate } from "../router/router.js";
import {
  getGallerySelection,
  saveGallerySelection
} from "../services/google-drive.service.js";
import {
  clearSession,
  getSession
} from "../services/session.service.js";

const DEFAULT_SETTINGS = {
  mode: "manual",
  rotation: "daily",
  randomCount: 6,
  timezone: "America/Panama"
};

const state = {
  selection: null,
  loading: false
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function handleUnauthorized(error) {
  if (error.status !== 401 && error.code !== "UNAUTHORIZED") return false;
  clearSession();
  navigate("/login", { replace: true });
  return true;
}

function showFeedback(type, message) {
  const feedback = document.getElementById("gallery-settings-feedback");
  if (!feedback) return;

  feedback.className = `drive-feedback drive-feedback-${type}`;
  feedback.textContent = message;
  feedback.hidden = false;
}

function hideFeedback() {
  const feedback = document.getElementById("gallery-settings-feedback");
  if (feedback) feedback.hidden = true;
}

function getSettingsFromControls() {
  const mode = document.getElementById("gallery-mode")?.value || DEFAULT_SETTINGS.mode;
  const rotation = document.getElementById("gallery-rotation")?.value || DEFAULT_SETTINGS.rotation;
  const parsedRandomCount = Number.parseInt(
    document.getElementById("gallery-random-count")?.value || "",
    10
  );

  return {
    mode,
    rotation,
    randomCount: Number.isFinite(parsedRandomCount)
      ? Math.min(60, Math.max(1, parsedRandomCount))
      : DEFAULT_SETTINGS.randomCount,
    timezone: state.selection?.settings?.timezone || DEFAULT_SETTINGS.timezone
  };
}

function getGalleryMetrics(settings = getSettingsFromControls()) {
  const items = state.selection?.items || [];
  const featuredCount = items.filter((item) => item.isFeatured).length;
  const candidateCount = Math.max(0, items.length - featuredCount);

  let visibleCount = items.length;
  if (settings.mode === "random") {
    visibleCount = Math.min(settings.randomCount, items.length);
  }
  if (settings.mode === "mixed") {
    visibleCount = featuredCount + Math.min(settings.randomCount, candidateCount);
  }

  return {
    enabledCount: items.length,
    featuredCount,
    candidateCount,
    visibleCount
  };
}

function getModeDescription(mode) {
  if (mode === "random") {
    return "La landing muestra una cantidad limitada de imagenes elegidas aleatoriamente.";
  }

  if (mode === "mixed") {
    return "Las destacadas permanecen visibles y la API completa el resto con imagenes aleatorias.";
  }

  return "La landing muestra todas las imagenes habilitadas en el orden definido desde Galeria.";
}

function getRotationDescription(rotation) {
  if (rotation === "visit") return "La combinacion cambia con cada consulta de la landing.";
  if (rotation === "weekly") return "La combinacion permanece estable de lunes a domingo.";
  return "La combinacion permanece estable durante el dia y cambia al dia siguiente.";
}

function updateSettingsPreview() {
  const settings = getSettingsFromControls();
  const metrics = getGalleryMetrics(settings);
  const randomCountInput = document.getElementById("gallery-random-count");
  const modeDescription = document.getElementById("gallery-mode-description");
  const rotationDescription = document.getElementById("gallery-rotation-description");

  if (randomCountInput) randomCountInput.disabled = settings.mode === "manual";
  if (modeDescription) modeDescription.textContent = getModeDescription(settings.mode);
  if (rotationDescription) rotationDescription.textContent = getRotationDescription(settings.rotation);

  const enabled = document.getElementById("gallery-enabled-count");
  const featured = document.getElementById("gallery-featured-count");
  const visible = document.getElementById("gallery-visible-count");
  const summary = document.getElementById("gallery-settings-summary");

  if (enabled) enabled.textContent = String(metrics.enabledCount);
  if (featured) featured.textContent = String(metrics.featuredCount);
  if (visible) visible.textContent = String(metrics.visibleCount);

  if (summary) {
    if (settings.mode === "mixed") {
      summary.innerHTML = `
        <strong>${metrics.featuredCount} destacadas + ${Math.min(settings.randomCount, metrics.candidateCount)} aleatorias</strong>
        <span>${metrics.visibleCount} imagenes visibles en la landing.</span>
      `;
    } else if (settings.mode === "random") {
      summary.innerHTML = `
        <strong>${metrics.visibleCount} imagenes aleatorias</strong>
        <span>Elegidas entre ${metrics.enabledCount} imagenes habilitadas.</span>
      `;
    } else {
      summary.innerHTML = `
        <strong>${metrics.visibleCount} imagenes manuales</strong>
        <span>Se mostraran todas las imagenes habilitadas.</span>
      `;
    }
  }
}

function applySelectionToPage() {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...(state.selection?.settings || {})
  };

  const mode = document.getElementById("gallery-mode");
  const rotation = document.getElementById("gallery-rotation");
  const randomCount = document.getElementById("gallery-random-count");
  const storage = document.getElementById("gallery-config-storage");
  const updatedAt = document.getElementById("gallery-config-updated-at");

  if (mode) mode.value = settings.mode;
  if (rotation) rotation.value = settings.rotation;
  if (randomCount) randomCount.value = String(settings.randomCount);

  if (storage) {
    storage.textContent = state.selection?.storage?.fileName
      ? `${state.selection.storage.folderName} / ${state.selection.storage.fileName}`
      : "Google Drive";
  }

  if (updatedAt) {
    updatedAt.textContent = state.selection?.updatedAt
      ? new Date(state.selection.updatedAt).toLocaleString("es-PA")
      : "Sin cambios registrados";
  }

  updateSettingsPreview();
}

async function loadSettings() {
  const session = getSession();
  if (!session?.token || state.loading) return;

  state.loading = true;
  showFeedback("info", "Consultando la configuracion guardada en Google Drive...");

  try {
    const response = await getGallerySelection(session.token);
    state.selection = response.selection || {
      settings: DEFAULT_SETTINGS,
      items: []
    };
    applySelectionToPage();
    hideFeedback();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
  } finally {
    state.loading = false;
  }
}

async function saveSettings() {
  const session = getSession();
  const button = document.getElementById("gallery-settings-save");
  if (!session?.token || !button || !state.selection) return;

  const settings = getSettingsFromControls();
  button.disabled = true;
  showFeedback("info", "Guardando la configuracion en Google Drive...");

  try {
    const response = await saveGallerySelection(
      session.token,
      state.selection.items || [],
      settings
    );
    state.selection = response.selection;
    applySelectionToPage();
    showFeedback("success", "La configuracion de la galeria fue actualizada correctamente.");
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message);
  } finally {
    button.disabled = false;
  }
}

export function renderGallerySettingsPage() {
  return `
    <section class="page-heading">
      <div>
        <span class="eyebrow">CONFIGURACION</span>
        <h2>Rotacion de la galeria</h2>
        <p>Define si las imagenes se muestran manualmente, de forma aleatoria o combinando destacadas con una seleccion variable.</p>
      </div>
      <a class="btn btn-secondary" href="/galeria" data-link>${icon("Image")}Administrar imagenes</a>
    </section>

    <div id="gallery-settings-feedback" class="drive-feedback" hidden></div>

    <section class="settings-grid gallery-settings-grid">
      <article class="panel-card settings-card gallery-settings-card">
        <div class="panel-card-heading">
          <div><span class="eyebrow">MODO ACTIVO</span><h3>Comportamiento de la landing</h3></div>
          <span class="status-pill active">Google Drive</span>
        </div>

        <div class="settings-form-preview gallery-settings-form">
          <label>
            <span>Modo de galeria</span>
            <select id="gallery-mode">
              <option value="manual">Manual</option>
              <option value="random">Aleatorio</option>
              <option value="mixed">Mixto</option>
            </select>
            <small id="gallery-mode-description"></small>
          </label>

          <label>
            <span>Cantidad aleatoria</span>
            <input id="gallery-random-count" type="number" value="6" min="1" max="60" />
            <small>En modo mixto se suma a todas las imagenes marcadas como destacadas.</small>
          </label>

          <label>
            <span>Frecuencia de renovacion</span>
            <select id="gallery-rotation">
              <option value="visit">En cada visita</option>
              <option value="daily">Diariamente</option>
              <option value="weekly">Semanalmente</option>
            </select>
            <small id="gallery-rotation-description"></small>
          </label>

          <div class="gallery-settings-summary" id="gallery-settings-summary"></div>
        </div>

        <button class="btn btn-primary" id="gallery-settings-save" type="button">
          ${icon("Settings")}Guardar configuracion
        </button>
      </article>

      <aside class="panel-card settings-explanation gallery-settings-details">
        <span class="placeholder-icon small">${icon("Sparkles")}</span>
        <h3>Resumen actual</h3>

        <div class="settings-step">
          <strong id="gallery-enabled-count">0</strong>
          <p><b>Imagenes habilitadas</b><span>Fuente disponible para la galeria.</span></p>
        </div>
        <div class="settings-step">
          <strong id="gallery-featured-count">0</strong>
          <p><b>Imagenes destacadas</b><span>Permanecen fijas cuando el modo es mixto.</span></p>
        </div>
        <div class="settings-step">
          <strong id="gallery-visible-count">0</strong>
          <p><b>Imagenes visibles</b><span>Cantidad estimada que recibira la landing.</span></p>
        </div>

        <dl class="gallery-settings-storage">
          <div><dt>Configuracion</dt><dd id="gallery-config-storage">Google Drive</dd></div>
          <div><dt>Ultima actualizacion</dt><dd id="gallery-config-updated-at">Consultando...</dd></div>
        </dl>
      </aside>
    </section>
  `;
}

export function initGallerySettingsPage() {
  state.selection = null;
  state.loading = false;

  document.getElementById("gallery-mode")?.addEventListener("change", updateSettingsPreview);
  document.getElementById("gallery-random-count")?.addEventListener("input", updateSettingsPreview);
  document.getElementById("gallery-rotation")?.addEventListener("change", updateSettingsPreview);
  document.getElementById("gallery-settings-save")?.addEventListener("click", saveSettings);

  loadSettings();
}
