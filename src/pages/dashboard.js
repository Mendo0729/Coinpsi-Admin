import { icon } from "../icons.js";
import { navigate } from "../router/router.js";
import { getAdminEvents } from "../services/event.service.js";
import { clearSession, getSession } from "../services/session.service.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Fecha por confirmar";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha invalida";

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Panama"
  }).format(date);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = String(value);
}

function renderPublishedEvents(events) {
  if (!events.length) {
    return `
      <div class="empty-state compact dashboard-events-empty">
        <span>${icon("Calendar")}</span>
        <h4>No hay eventos publicados</h4>
        <p>Publica un evento desde el modulo Eventos para mostrarlo aqui y en la landing.</p>
      </div>
    `;
  }

  return `
    <div class="dashboard-event-list">
      ${events.slice(0, 5).map((event) => `
        <article class="dashboard-event-item">
          <span class="dashboard-event-icon">${icon("Calendar")}</span>
          <div class="dashboard-event-info">
            <div class="dashboard-event-title-row">
              <a href="/eventos" data-link>${escapeHtml(event.title)}</a>
              <span class="status-pill active">Publicado</span>
            </div>
            <p>${escapeHtml(event.eventType || "Evento")} · ${escapeHtml(formatDate(event.startAt))}</p>
            <div class="dashboard-event-meta">
              <span>${icon("MapPin")}${escapeHtml(event.location || "Lugar por confirmar")}</span>
              <span>${icon("Phone")}${event.whatsappNumber ? `+${escapeHtml(event.whatsappNumber)}` : "Sin WhatsApp"}</span>
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderDashboardLoading() {
  return `
    <div class="dashboard-events-loading" role="status">
      <span class="events-spinner" aria-hidden="true"></span>
      <div><strong>Cargando eventos</strong><p>Consultando la informacion registrada en Coinpsi-API.</p></div>
    </div>
  `;
}

function renderDashboardError(message) {
  return `
    <div class="dashboard-events-error" role="alert">
      <span>!</span>
      <div><strong>No fue posible cargar los eventos</strong><p>${escapeHtml(message)}</p></div>
    </div>
  `;
}

export function renderDashboardPage() {
  return `
    <section class="dashboard-hero">
      <div>
        <span class="eyebrow">RESUMEN GENERAL</span>
        <h2>Gestion de eventos de COINPSI</h2>
        <p>Consulta el estado de los eventos y revisa cuales estan publicados actualmente en la landing.</p>
      </div>
      <div class="dashboard-actions">
        <a class="btn btn-secondary" href="/eventos" data-link>${icon("Calendar")}Gestionar eventos</a>
        <a class="btn btn-primary" href="/eventos" data-link>${icon("Plus")}Crear evento</a>
      </div>
    </section>

    <section class="stat-grid" aria-label="Resumen de eventos">
      <article class="stat-card">
        <span class="stat-icon">${icon("Calendar")}</span>
        <div class="stat-card-heading"><span>Eventos publicados</span><strong id="dashboard-published-count">-</strong></div>
        <small>Visibles actualmente en la landing</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon">${icon("Sparkles")}</span>
        <div class="stat-card-heading"><span>Proximos publicados</span><strong id="dashboard-upcoming-count">-</strong></div>
        <small>Con fecha de inicio pendiente</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon">${icon("Inbox")}</span>
        <div class="stat-card-heading"><span>Total de eventos</span><strong id="dashboard-total-count">-</strong></div>
        <small>Todos los registros administrativos</small>
      </article>
      <article class="stat-card">
        <span class="stat-icon">${icon("Clock")}</span>
        <div class="stat-card-heading"><span>En borrador</span><strong id="dashboard-draft-count">-</strong></div>
        <small>Pendientes de publicacion</small>
      </article>
    </section>

    <section class="dashboard-grid dashboard-events-grid">
      <article class="panel-card activity-card dashboard-published-card">
        <div class="panel-card-heading">
          <div><span class="eyebrow">EVENTOS PUBLICADOS</span><h3>Visibles en la landing</h3></div>
          <a href="/eventos" data-link>Ver todos ${icon("ArrowRight")}</a>
        </div>
        <div id="dashboard-published-events">${renderDashboardLoading()}</div>
      </article>

      <aside class="panel-card gallery-mode-card dashboard-status-card">
        <div class="panel-card-heading">
          <div><span class="eyebrow">ESTADOS</span><h3>Distribucion actual</h3></div>
          <span class="status-pill active">En linea</span>
        </div>
        <div class="dashboard-status-list">
          <div><span class="dashboard-status-dot published"></span><p><strong>Publicados</strong><small>Visibles en la landing</small></p><b id="dashboard-status-published">-</b></div>
          <div><span class="dashboard-status-dot draft"></span><p><strong>Borradores</strong><small>Pendientes de publicar</small></p><b id="dashboard-status-draft">-</b></div>
          <div><span class="dashboard-status-dot finished"></span><p><strong>Finalizados</strong><small>Eventos completados</small></p><b id="dashboard-status-finished">-</b></div>
          <div><span class="dashboard-status-dot cancelled"></span><p><strong>Cancelados</strong><small>No visibles en la landing</small></p><b id="dashboard-status-cancelled">-</b></div>
        </div>
        <a class="text-link" href="/eventos" data-link>Administrar eventos ${icon("ArrowRight")}</a>
      </aside>
    </section>
  `;
}

async function loadDashboardEvents() {
  const session = getSession();
  const container = document.getElementById("dashboard-published-events");

  if (!session?.token) {
    clearSession();
    navigate("/login", { replace: true });
    return;
  }

  try {
    const response = await getAdminEvents(session.token);
    const events = Array.isArray(response.events) ? response.events : [];
    const now = Date.now();
    const published = events
      .filter((event) => event.status === "published")
      .sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    const drafts = events.filter((event) => event.status === "draft");
    const finished = events.filter((event) => event.status === "finished");
    const cancelled = events.filter((event) => event.status === "cancelled");
    const upcoming = published.filter((event) => {
      const start = new Date(event.startAt).getTime();
      return Number.isFinite(start) && start >= now;
    });

    setText("dashboard-published-count", published.length);
    setText("dashboard-upcoming-count", upcoming.length);
    setText("dashboard-total-count", events.length);
    setText("dashboard-draft-count", drafts.length);
    setText("dashboard-status-published", published.length);
    setText("dashboard-status-draft", drafts.length);
    setText("dashboard-status-finished", finished.length);
    setText("dashboard-status-cancelled", cancelled.length);

    if (container) container.innerHTML = renderPublishedEvents(published);
  } catch (error) {
    if (error.status === 401 || error.code === "UNAUTHORIZED") {
      clearSession();
      navigate("/login", { replace: true });
      return;
    }

    if (container) container.innerHTML = renderDashboardError(error.message || "No fue posible consultar los eventos.");
  }
}

export function initDashboardPage() {
  loadDashboardEvents();
}
