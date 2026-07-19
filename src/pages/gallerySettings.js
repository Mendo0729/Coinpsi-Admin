import { icon } from "../icons.js";

export function renderGallerySettingsPage() {
  return `
    <section class="page-heading">
      <div><span class="eyebrow">CONFIGURACIÓN</span><h2>Selección de galería</h2><p>Define cuántas imágenes se mostrarán y cómo se combinarán las destacadas con la selección aleatoria.</p></div>
    </section>

    <section class="settings-grid">
      <article class="panel-card settings-card">
        <div class="panel-card-heading"><div><span class="eyebrow">MODO ACTIVO</span><h3>Selección mixta</h3></div><span class="status-pill active">Recomendado</span></div>
        <div class="settings-form-preview">
          <label><span>Cantidad total visible</span><input type="number" value="10" min="1" disabled /></label>
          <label><span>Imágenes destacadas</span><input type="number" value="4" min="0" disabled /></label>
          <label><span>Imágenes aleatorias</span><input type="number" value="6" min="0" disabled /></label>
          <label><span>Frecuencia de renovación</span><select disabled><option>Diariamente</option></select></label>
        </div>
        <button class="btn btn-primary" type="button" disabled>${icon("Settings")}Guardar configuración</button>
        <small class="development-note">La edición se habilitará cuando el módulo quede conectado con Coinpsi-API.</small>
      </article>

      <aside class="panel-card settings-explanation">
        <span class="placeholder-icon small">${icon("Sparkles")}</span>
        <h3>¿Cómo funcionará?</h3>
        <div class="settings-step"><strong>1</strong><p><b>4 imágenes destacadas</b><span>COINPSI decide cuáles deben permanecer visibles.</span></p></div>
        <div class="settings-step"><strong>2</strong><p><b>6 imágenes aleatorias</b><span>La API completa los espacios con fotografías publicadas.</span></p></div>
        <div class="settings-step"><strong>3</strong><p><b>10 imágenes en total</b><span>La landing recibe una selección estable durante todo el día.</span></p></div>
      </aside>
    </section>
  `;
}
