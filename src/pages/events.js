import { icon } from "../icons.js";

export function renderEventsPage() {
  return `
    <section class="page-heading">
      <div><span class="eyebrow">GESTIÓN DE CONTENIDO</span><h2>Eventos</h2><p>Crea y administra los talleres, conferencias, ferias y actividades que aparecerán en la landing.</p></div>
      <button class="btn btn-primary" type="button">${icon("Plus")}Nuevo evento</button>
    </section>
    <section class="panel-card module-placeholder">
      <span class="placeholder-icon">${icon("Calendar")}</span>
      <h3>Módulo de eventos preparado</h3>
      <p>En la siguiente fase se incorporará la tabla de eventos, los filtros, el formulario de creación y la vista previa.</p>
      <div class="placeholder-tags"><span>Borradores</span><span>Publicados</span><span>Finalizados</span><span>Cancelados</span></div>
    </section>
  `;
}
