import { icon } from "../icons.js";
import { navigate } from "../router/router.js";
import {
  cancelAdminEvent,
  createAdminEvent,
  deleteAdminEvent,
  getAdminEvents
} from "../services/event.service.js";
import { clearSession, getSession } from "../services/session.service.js";

const STATUS_LABELS = {
  draft: "Borrador",
  published: "Publicado",
  finished: "Finalizado",
  cancelled: "Cancelado"
};

const MODALITY_LABELS = {
  in_person: "Presencial",
  virtual: "Virtual",
  hybrid: "Hibrido"
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Sin definir";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha invalida";

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Panama"
  }).format(date);
}

function renderLoadingState() {
  return `
    <div class="events-state events-loading" role="status">
      <span class="events-spinner" aria-hidden="true"></span>
      <div><strong>Consultando eventos</strong><p>Obteniendo la informacion desde Coinpsi-API.</p></div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="events-state">
      <span class="events-state-icon">${icon("Calendar")}</span>
      <div><strong>No hay eventos registrados</strong><p>Los eventos creados apareceran en esta seccion.</p></div>
    </div>
  `;
}

function renderErrorState(message) {
  return `
    <div class="events-state events-error" role="alert">
      <span class="events-state-icon">!</span>
      <div>
        <strong>No fue posible cargar los eventos</strong>
        <p>${escapeHtml(message)}</p>
        <button class="btn btn-secondary" id="retry-events" type="button">Reintentar</button>
      </div>
    </div>
  `;
}

function renderEventActions(event) {
  const eventId = escapeHtml(event.id);
  const eventTitle = escapeHtml(event.title);
  const isCancelled = event.status === "cancelled";

  return `
    <div class="event-actions">
      <button
        class="event-action-button event-action-cancel"
        type="button"
        data-event-action="cancel"
        data-event-id="${eventId}"
        data-event-title="${eventTitle}"
        ${isCancelled ? "disabled" : ""}
      >${isCancelled ? "Cancelado" : "Cancelar"}</button>
      <button
        class="event-action-button event-action-delete"
        type="button"
        data-event-action="delete"
        data-event-id="${eventId}"
        data-event-title="${eventTitle}"
      >Eliminar</button>
    </div>
  `;
}

function renderEventRows(events) {
  return events.map((event) => {
    const status = STATUS_LABELS[event.status] || event.status || "Sin estado";
    const modality = MODALITY_LABELS[event.modality] || event.modality || "Sin modalidad";

    return `
      <tr>
        <td>
          <div class="event-primary-cell">
            <strong>${escapeHtml(event.title)}</strong>
            <span>${escapeHtml(event.eventType)}</span>
            <p>${escapeHtml(event.description || "Sin descripcion")}</p>
            <code>${escapeHtml(event.slug || "")}</code>
          </div>
        </td>
        <td>
          <div class="event-date-cell">
            <span><strong>Inicio</strong>${escapeHtml(formatDate(event.startAt))}</span>
            <span><strong>Final</strong>${escapeHtml(formatDate(event.endAt))}</span>
          </div>
        </td>
        <td><span class="event-modality">${escapeHtml(modality)}</span></td>
        <td>${escapeHtml(event.location || "Sin ubicacion")}</td>
        <td><span class="event-status event-status-${escapeHtml(event.status)}">${escapeHtml(status)}</span></td>
        <td>${renderEventActions(event)}</td>
      </tr>
    `;
  }).join("");
}

function renderEventsTable(events) {
  if (!events.length) return renderEmptyState();

  return `
    <div class="events-table-wrap">
      <table class="events-table">
        <thead>
          <tr>
            <th>Evento</th>
            <th>Fecha y hora</th>
            <th>Modalidad</th>
            <th>Lugar</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${renderEventRows(events)}</tbody>
      </table>
    </div>
  `;
}

function handleUnauthorized(error) {
  if (error.status !== 401 && error.code !== "UNAUTHORIZED") return false;

  clearSession();
  navigate("/login", { replace: true });
  return true;
}

function showFeedback(type, message) {
  const feedback = document.getElementById("events-feedback");
  if (!feedback) return;

  feedback.className = `events-feedback events-feedback-${type}`;
  feedback.textContent = message;
  feedback.hidden = false;

  window.setTimeout(() => {
    const currentFeedback = document.getElementById("events-feedback");
    if (currentFeedback) currentFeedback.hidden = true;
  }, 5000);
}

function openEventModal() {
  const modal = document.getElementById("event-modal");
  if (!modal) return;

  modal.hidden = false;
  document.body.classList.add("events-modal-open");
  document.getElementById("event-title")?.focus();
}

function closeEventModal() {
  const modal = document.getElementById("event-modal");
  const formMessage = document.getElementById("event-form-message");

  if (!modal) return;

  modal.hidden = true;
  document.body.classList.remove("events-modal-open");
  if (formMessage) formMessage.textContent = "";
}

function getFormValue(formData, fieldName) {
  return String(formData.get(fieldName) ?? "").trim();
}

function toIsoDate(value, fieldLabel, required = false) {
  if (!value) {
    if (required) throw new Error(`${fieldLabel} es obligatoria.`);
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldLabel} no es valida.`);
  }

  return date.toISOString();
}

function buildEventPayload(form) {
  const formData = new FormData(form);
  const title = getFormValue(formData, "title");
  const description = getFormValue(formData, "description");
  const eventType = getFormValue(formData, "eventType");
  const startAt = toIsoDate(getFormValue(formData, "startAt"), "La fecha de inicio", true);
  const endAt = toIsoDate(getFormValue(formData, "endAt"), "La fecha final");

  if (!title) throw new Error("El titulo es obligatorio.");
  if (!description) throw new Error("La descripcion es obligatoria.");
  if (!eventType) throw new Error("El tipo de evento es obligatorio.");

  if (endAt && new Date(endAt) < new Date(startAt)) {
    throw new Error("La fecha final no puede ser anterior a la fecha de inicio.");
  }

  return {
    title,
    description,
    eventType,
    startAt,
    endAt,
    location: getFormValue(formData, "location"),
    modality: getFormValue(formData, "modality"),
    status: getFormValue(formData, "status")
  };
}

async function loadEvents() {
  const content = document.getElementById("events-content");
  const count = document.getElementById("events-count");
  const refreshButton = document.getElementById("refresh-events");
  const session = getSession();

  if (!content) return;

  if (!session?.token) {
    clearSession();
    navigate("/login", { replace: true });
    return;
  }

  content.innerHTML = renderLoadingState();
  refreshButton?.setAttribute("disabled", "");

  try {
    const response = await getAdminEvents(session.token);
    const currentContent = document.getElementById("events-content");

    if (!currentContent) return;

    currentContent.innerHTML = renderEventsTable(response.events || []);
    if (count) count.textContent = String(response.count ?? response.events?.length ?? 0);
  } catch (error) {
    if (handleUnauthorized(error)) return;

    const currentContent = document.getElementById("events-content");
    if (currentContent) currentContent.innerHTML = renderErrorState(error.message);
    document.getElementById("retry-events")?.addEventListener("click", loadEvents);
  } finally {
    document.getElementById("refresh-events")?.removeAttribute("disabled");
  }
}

async function submitEventForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const message = document.getElementById("event-form-message");
  const submitButton = document.getElementById("save-event");
  const session = getSession();

  if (!session?.token) {
    clearSession();
    navigate("/login", { replace: true });
    return;
  }

  try {
    const payload = buildEventPayload(form);

    if (message) message.textContent = "";
    submitButton?.setAttribute("disabled", "");
    if (submitButton) submitButton.textContent = "Guardando...";

    await createAdminEvent(session.token, payload);

    form.reset();
    closeEventModal();
    showFeedback("success", "Evento creado correctamente.");
    await loadEvents();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    if (message) message.textContent = error.message || "No fue posible crear el evento.";
  } finally {
    submitButton?.removeAttribute("disabled");
    if (submitButton) submitButton.textContent = "Guardar evento";
  }
}

async function handleEventAction(event) {
  const button = event.target.closest("[data-event-action]");
  if (!button) return;

  const action = button.dataset.eventAction;
  const eventId = button.dataset.eventId;
  const eventTitle = button.dataset.eventTitle || "este evento";
  const session = getSession();

  if (!session?.token) {
    clearSession();
    navigate("/login", { replace: true });
    return;
  }

  const isDelete = action === "delete";
  const confirmationMessage = isDelete
    ? `Eliminar permanentemente \"${eventTitle}\"? Esta accion no se puede deshacer.`
    : `Cancelar \"${eventTitle}\"? El registro permanecera en el panel con estado Cancelado.`;

  if (!window.confirm(confirmationMessage)) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.textContent = isDelete ? "Eliminando..." : "Cancelando...";

  try {
    if (isDelete) {
      await deleteAdminEvent(session.token, eventId);
      showFeedback("success", "Evento eliminado correctamente.");
    } else {
      await cancelAdminEvent(session.token, eventId);
      showFeedback("success", "Evento cancelado correctamente.");
    }

    await loadEvents();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message || "No fue posible completar la accion.");
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function renderEventModal() {
  return `
    <div class="event-modal" id="event-modal" hidden>
      <section class="event-modal-card" role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
        <div class="event-modal-heading">
          <div>
            <span class="eyebrow">NUEVO REGISTRO</span>
            <h3 id="event-modal-title">Crear evento</h3>
            <p>Completa la informacion basica que se guardara en PostgreSQL.</p>
          </div>
          <button class="event-modal-close" id="close-event-modal" type="button" aria-label="Cerrar formulario">&times;</button>
        </div>

        <form id="event-form" novalidate>
          <div class="event-form-grid">
            <label class="event-form-field event-form-field-wide">
              <span>Titulo</span>
              <input id="event-title" name="title" type="text" maxlength="160" placeholder="Ejemplo: Taller de manejo del estres" required />
            </label>

            <label class="event-form-field event-form-field-wide">
              <span>Descripcion</span>
              <textarea name="description" rows="4" maxlength="2000" placeholder="Describe el objetivo y contenido del evento" required></textarea>
            </label>

            <label class="event-form-field">
              <span>Tipo de evento</span>
              <select name="eventType" required>
                <option value="">Seleccionar</option>
                <option value="Taller">Taller</option>
                <option value="Conferencia">Conferencia</option>
                <option value="Feria de salud">Feria de salud</option>
                <option value="Actividad grupal">Actividad grupal</option>
                <option value="Otro">Otro</option>
              </select>
            </label>

            <label class="event-form-field">
              <span>Lugar</span>
              <input name="location" type="text" maxlength="180" placeholder="Ejemplo: Sede COINPSI" />
            </label>

            <label class="event-form-field">
              <span>Fecha y hora de inicio</span>
              <input id="event-start-at" name="startAt" type="datetime-local" required />
            </label>

            <label class="event-form-field">
              <span>Fecha y hora final</span>
              <input id="event-end-at" name="endAt" type="datetime-local" />
            </label>

            <label class="event-form-field">
              <span>Modalidad</span>
              <select name="modality" required>
                <option value="in_person">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="hybrid">Hibrido</option>
              </select>
            </label>

            <label class="event-form-field">
              <span>Estado</span>
              <select name="status" required>
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
              </select>
            </label>
          </div>

          <div class="event-form-message" id="event-form-message" role="alert"></div>

          <div class="event-form-actions">
            <button class="btn btn-secondary" id="cancel-event" type="button">Cancelar</button>
            <button class="btn btn-primary" id="save-event" type="submit">Guardar evento</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

export function renderEventsPage() {
  return `
    <section class="page-heading">
      <div><span class="eyebrow">GESTION DE CONTENIDO</span><h2>Eventos</h2><p>Consulta, crea, cancela y elimina eventos almacenados en PostgreSQL.</p></div>
      <div class="events-heading-actions">
        <button class="btn btn-secondary" id="refresh-events" type="button">Actualizar</button>
        <button class="btn btn-primary" id="open-event-modal" type="button">${icon("Plus")}Nuevo evento</button>
      </div>
    </section>

    <div class="events-feedback" id="events-feedback" role="status" hidden></div>

    <section class="panel-card events-panel">
      <div class="events-panel-heading">
        <div><span class="eyebrow">REGISTROS DISPONIBLES</span><h3>Eventos registrados</h3></div>
        <span class="events-count"><strong id="events-count">0</strong> eventos</span>
      </div>
      <div id="events-content">${renderLoadingState()}</div>
    </section>

    ${renderEventModal()}
  `;
}

export function initEventsPage() {
  document.getElementById("refresh-events")?.addEventListener("click", loadEvents);
  document.getElementById("open-event-modal")?.addEventListener("click", openEventModal);
  document.getElementById("close-event-modal")?.addEventListener("click", closeEventModal);
  document.getElementById("cancel-event")?.addEventListener("click", closeEventModal);
  document.getElementById("event-form")?.addEventListener("submit", submitEventForm);
  document.getElementById("events-content")?.addEventListener("click", handleEventAction);

  document.getElementById("event-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "event-modal") closeEventModal();
  });

  document.getElementById("event-start-at")?.addEventListener("change", (event) => {
    const endInput = document.getElementById("event-end-at");
    if (endInput) endInput.min = event.target.value;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.getElementById("event-modal")?.hidden) {
      closeEventModal();
    }
  }, { once: true });

  loadEvents();
}
