import { icon } from "../icons.js";

export function renderNotFoundPage() {
  return `
    <section class="panel-card module-placeholder">
      <span class="placeholder-icon">${icon("Sparkles")}</span>
      <h3>Página no encontrada</h3>
      <p>La dirección solicitada no corresponde a un módulo disponible del panel.</p>
      <a class="btn btn-primary" href="/dashboard" data-link>Volver al inicio ${icon("ArrowRight")}</a>
    </section>
  `;
}
