import { icon } from "../icons.js";

export function renderGalleryPage() {
  return `
    <section class="page-heading">
      <div><span class="eyebrow">GESTIÓN VISUAL</span><h2>Galería</h2><p>Selecciona las fotografías de Google Drive que estarán disponibles para la galería pública.</p></div>
      <button class="btn btn-primary" type="button">${icon("Plus")}Agregar imágenes</button>
    </section>
    <section class="panel-card module-placeholder">
      <span class="placeholder-icon">${icon("Image")}</span>
      <h3>Galería institucional preparada</h3>
      <p>Este espacio mostrará las imágenes registradas, sus categorías, estado de publicación y selección destacada.</p>
      <div class="placeholder-tags"><span>Talleres</span><span>Ferias</span><span>Actividades grupales</span><span>Conferencias</span></div>
    </section>
  `;
}
