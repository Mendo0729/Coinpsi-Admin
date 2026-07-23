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
  displayCount: 8,
  timezone: "America/Panama"
};

const state = {
  selection: null,
  loading: false
};

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

function getFixedCount() {
  return (state.selection?.items || []).filter((item) => item.isFeatured).length;
}

function getSettingsFromControls() {
  const mode = document.getElementById("gallery-mode")?.value || DEFAULT_SETTINGS.mode;
  const rotation = document.getElementById("gallery-rotation")?.value || DEFAULT_SETTINGS.rotation;
  const parsedDisplayCount = Number.parseInt(
    document.getElementById("gallery-display-count")?.value || "",
    10
  );

  return {
    mode,
    rotation,
    displayCount: Number.isFinite(parsedDisplayCount)
      ? Math.min(60, Math.max(1, parsedDisplayCount))
      : DEFAULT_SETTINGS.displayCount,
    timezone: state.selection?.settings?.timezone || DEFAULT_SETTINGS.timezone
  };
}

function getGalleryMetrics(settings = getSettingsFromControls()) {
  const items = state.selection?.items || [];
  const fixedCount = getFixedCount();
  const candidateCount = Math.max(0, items.length - fixedCount);

  let visibleCount = items.length;
  let randomFillCount = 0;

  if (settings.mode === "random") {
    visibleCount = Math.min(settings.displayCount, items.length);
    randomFillCount = visibleCount;
  }

  if (settings.mode === "mixed") {
    const remainingSlots = Math.max(0, settings.displayCount - fixedCount);
    randomFillCount = Math.min(remainingSlots, candidateCount);
    visibleCount = fixedCount + randomFillCount;
  }

  return {
    enabledCount: items.length,
    fixedCount,
    candidateCount,
    visibleCount,
    randomFillCount
  };
}

function getModeDescription(mode) {
  if (mode === "random") {
    return "La landing muestra exactamente la cantidad indicada, elegida aleatoriamente entre las imagenes habilitadas.";
  }

  if (mode === "mixed") {
    return "Las imagenes marcadas como destacadas quedan fijas y la API rellena los espacios restantes con otras imagenes aleatorias.";
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
  const displayCountInput = document.getElementById("gallery-display-count");
  const fixedCount = getFixedCount();

  if (displayCountInput) {
    displayCountInput.disabled = settings.mode === "manual";
    displayCountInput.min = settings.mode === "mixed"
      ? String(Math.max(1, fixedCount))
      : "1";

    if (settings.mode === "mixed" && settings.displayCount < fixedCount) {
      displayCountInput.value = String(fixedCount);
      settings.displayCount = fixedCount;
    }
  }

  const metrics = getGalleryMetrics(settings);
  const modeDescription = document.getElementById("gallery-mode-description");
  const rotationDescription = document.getElementById("gallery-rotation-description");
  const countHelp = document.getElementById("gallery-display-count-help");

  if (modeDescription) modeDescription.textContent = getModeDescription(settings.mode);
  if (rotationDescription) rotationDescription.textContent = getRotationDescription(settings.rotation);

  if (countHelp) {
    if (settings.mode === "mixed") {
      countHelp.textContent = `${metrics.fixedCount} fijas y ${metrics.randomFillCount} espacios rellenados aleatoriamente.`;
    } else if (settings.mode === "random") {
      countHelp.textContent = "Esta es la cantidad total de imagenes aleatorias que aparecera en la landing.";
    } else {
      countHelp.textContent = "En modo manual se muestran todas las imagenes habilitadas.";
    }
  }

  const enabled = document.getElementById("gallery-enabled-count");
  const fixed = document.getElementById("gallery-fixed-count");
  const visible = document.getElementById("gallery-visible-count");
  const summary = document.getElementById("gallery-settings-summary");

  if (enabled) enabled.textContent = String(metrics.enabledCount);
  if (fixed) fixed.textContent = String(metrics.fixedCount);
  if (visible) visible.textContent = String(metrics.visibleCount);

  if (summary) {
    if (settings.mode === "mixed") {
      summary.innerHTML = `
        <strong>${metrics.fixedCount} fijas + ${metrics.randomFillCount} aleatorias</strong>
        <span>${metrics.visibleCount} de ${settings.displayCount} espacios disponibles seran cubiertos.</span>
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
  const storedSettings = state.selection?.settings || {};
  const settings = {
    ...DEFAULT_SETTINGS,
    ...storedSettings,
    displayCount: storedSettings.displayCount
      ?? storedSettings.randomCount
      ?? DEFAULT_SETTINGS.displayCount
  };

  const mode = document.getElementById("gallery-mode");
  const rotation = document.getElementById("gallery-rotation");
  const displayCount = document.getElementById("gallery-display-count");
  const storage = document.getElementById("gallery-config-storage");
  const updatedAt = document.getElementById("gallery-config-updated-at");

  if (mode) mode.value = settings.mode;
  if (rotation) rotation.value = settings.rotation;
  if (displayCount) displayCount.value = String(settings.displayCount);

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
  const fixedCount = getFixedCount();

  if (settings.mode === "mixed" && settings.displayCount < fixedCount) {
    showFeedback(
      "error",
      `La cantidad total no puede ser menor que las ${fixedCount} imagenes fijas.`
    );
    return;
  }

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
        <p>Define la cantidad total que aparecera en la landing y combina imagenes fijas con relleno aleatorio.</p>
      </div>
      <a class="btn btn-secondary" href="/galeria" data-link>${icon("Image")}Escoger imagenes fijas</a>
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
            <span>Cantidad total en la landing</span>
            <input id="gallery-display-count" type="number" value="8" min="1" max="60" />
            <small id="gallery-display-count-help"></small>
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
          <p><b>Imagenes habilitadas</b><span>Conjunto disponible para la galeria.</span></p>
        </div>
        <div class="settings-step">
          <strong id="gallery-fixed-count">0</strong>
          <p><b>Imagenes fijas</b><span>Son las marcadas como destacadas en la pagina Galeria.</span></p>
        </div>
        <div class="settings-step">
          <strong id="gallery-visible-count">0</strong>
          <p><b>Imagenes visibles</b><span>Cantidad que recibira actualmente la landing.</span></p>
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
  document.getElementById("gallery-display-count")?.addEventListener("input", updateSettingsPreview);
  document.getElementById("gallery-rotation")?.addEventListener("change", updateSettingsPreview);
  document.getElementById("gallery-settings-save")?.addEventListener("click", saveSettings);

  loadSettings();
}
