import { icon } from "../icons.js";
import { navigate } from "../router/router.js";
import { getAdminEvents } from "../services/event.service.js";
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
  hybrid: "Híbrido"
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
  if (Number.isNaN(date.getTime())) return "Fecha inválida";

  return new Intl.DateTimeFormat("es-PA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Panama"
  }).format(date);
}

function renderLoadingState() {
  return `
    <div class="events-state events-loading" role="status">
      <span class="events-spinner" aria-hidden="true"></span>
      <div><strong>Consultando eventos</strong><p>Obteniendo la información desde Coinpsi-API.</p></div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="events-state">
      <span class="events-state-icon">${icon("Calendar")}</span>
      <div><strong>No hay eventos registrados</strong><p>Los eventos creados aparecerán en esta sección.</p></div>
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
            <p>${escapeHtml(event.description || "Sin descripción")}</p>
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
        <td>${escapeHtml(event.location || "Sin ubicación")}</td>
        <td><span class="event-status event-status-${escapeHtml(event.status)}">${escapeHtml(status)}</span></td>
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
          </tr>
        </thead>
        <tbody>${renderEventRows(events)}</tbody>
      </table>
    </div>
  `;
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
    if (error.status === 401 || error.code === "UNAUTHORIZED") {
      clearSession();
      navigate("/login", { replace: true });
      return;
    }

    const currentContent = document.getElementById("events-content");
    if (currentContent) currentContent.innerHTML = renderErrorState(error.message);
    document.getElementById("retry-events")?.addEventListener("click", loadEvents);
  } finally {
    document.getElementById("refresh-events")?.removeAttribute("disabled");
  }
}

export function renderEventsPage() {
  return `
    <section class="page-heading">
      <div><span class="eyebrow">GESTIÓN DE CONTENIDO</span><h2>Eventos</h2><p>Consulta los talleres, conferencias, ferias y actividades almacenados en PostgreSQL.</p></div>
      <div class="events-heading-actions">
        <button class="btn btn-secondary" id="refresh-events" type="button">Actualizar</button>
        <button class="btn btn-primary" type="button" disabled title="El formulario se habilitará en la siguiente fase">${icon("Plus")}Nuevo evento</button>
      </div>
    </section>

    <section class="panel-card events-panel">
      <div class="events-panel-heading">
        <div><span class="eyebrow">REGISTROS DISPONIBLES</span><h3>Eventos registrados</h3></div>
        <span class="events-count"><strong id="events-count">0</strong> eventos</span>
      </div>
      <div id="events-content">${renderLoadingState()}</div>
    </section>
  `;
}

export function initEventsPage() {
  document.getElementById("refresh-events")?.addEventListener("click", loadEvents);
  loadEvents();
}
