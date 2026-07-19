import { icon } from "../icons.js";

const stats = [
  { label: "Eventos publicados", value: "0", detail: "Sin eventos publicados", icon: "Calendar" },
  { label: "Próximos eventos", value: "0", detail: "Pendientes por programar", icon: "Sparkles" },
  { label: "Imágenes registradas", value: "0", detail: "Galería aún vacía", icon: "Image" },
  { label: "Imágenes destacadas", value: "0", detail: "Selección manual", icon: "Check" }
];

export function renderDashboardPage() {
  return `
    <section class="dashboard-hero">
      <div>
        <span class="eyebrow">RESUMEN GENERAL</span>
        <h2>Contenido institucional de COINPSI</h2>
        <p>Este panel centraliza la publicación de eventos y la selección de fotografías que aparecerán en la landing.</p>
      </div>
      <div class="dashboard-actions">
        <a class="btn btn-secondary" href="/galeria" data-link>${icon("Image")}Gestionar galería</a>
        <a class="btn btn-primary" href="/eventos" data-link>${icon("Plus")}Crear evento</a>
      </div>
    </section>

    <section class="stat-grid" aria-label="Resumen del contenido">
      ${stats.map((stat) => `
        <article class="stat-card">
          <span class="stat-icon">${icon(stat.icon)}</span>
          <div class="stat-card-heading"><span>${stat.label}</span><strong>${stat.value}</strong></div>
          <small>${stat.detail}</small>
        </article>
      `).join("")}
    </section>

    <section class="dashboard-grid">
      <article class="panel-card activity-card">
        <div class="panel-card-heading">
          <div><span class="eyebrow">ACTIVIDAD RECIENTE</span><h3>Últimas actualizaciones</h3></div>
          <a href="/eventos" data-link>Ver eventos ${icon("ArrowRight")}</a>
        </div>
        <div class="empty-state compact">
          <span>${icon("Calendar")}</span>
          <h4>No hay actividad registrada</h4>
          <p>Las modificaciones de eventos y galería aparecerán aquí cuando la API esté conectada.</p>
        </div>
      </article>

      <aside class="panel-card gallery-mode-card">
        <div class="panel-card-heading">
          <div><span class="eyebrow">GALERÍA</span><h3>Selección mixta</h3></div>
          <span class="status-pill active">Activa</span>
        </div>
        <div class="mode-total"><span>Límite visible</span><strong>10</strong><small>imágenes en la landing</small></div>
        <div class="mode-breakdown">
          <div><span class="mode-dot featured"></span><p><strong>4 destacadas</strong><small>Elegidas manualmente</small></p></div>
          <div><span class="mode-dot random"></span><p><strong>6 aleatorias</strong><small>Renovación diaria</small></p></div>
        </div>
        <a class="text-link" href="/galeria/configuracion" data-link>Configurar selección ${icon("ArrowRight")}</a>
      </aside>
    </section>
  `;
}
