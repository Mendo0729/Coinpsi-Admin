import { icon } from "../icons.js";
import { createDevelopmentSession } from "../services/session.service.js";
import { navigate } from "../router/router.js";

export function renderLoginPage() {
  return `
    <main class="login-page">
      <section class="login-brand-panel">
        <div class="login-orb login-orb-one"></div>
        <div class="login-orb login-orb-two"></div>
        <div class="login-brand-content">
          <span class="login-badge">${icon("Sparkles")} Gestión institucional</span>
          <div class="login-wordmark"><span>CP</span><div><strong>COINPSI</strong><small>Corporación de Investigaciones Psicológicas</small></div></div>
          <h1>Administra el contenido de COINPSI desde un solo lugar.</h1>
          <p>Gestiona los eventos, selecciona las imágenes de la galería y controla la información que se publica en la landing institucional.</p>
          <div class="login-feature-list">
            <span>${icon("Check")} Gestión centralizada de eventos</span>
            <span>${icon("Check")} Selección mixta de fotografías</span>
            <span>${icon("Check")} Integración preparada para Google Drive</span>
          </div>
        </div>
      </section>

      <section class="login-form-panel">
        <form class="login-card" id="login-form" novalidate>
          <div class="login-mobile-brand"><span>CP</span><strong>COINPSI</strong></div>
          <span class="eyebrow">ACCESO ADMINISTRATIVO</span>
          <h2>Bienvenido</h2>
          <p>Ingresa tus credenciales para acceder al panel.</p>

          <label class="form-field">
            <span>Correo electrónico</span>
            <input id="login-email" name="email" type="email" autocomplete="email" placeholder="administracion@coinpsi.com" required />
          </label>

          <label class="form-field">
            <span>Contraseña</span>
            <input id="login-password" name="password" type="password" autocomplete="current-password" placeholder="••••••••" minlength="6" required />
          </label>

          <div class="form-message" id="login-message" role="alert"></div>

          <button class="btn btn-primary login-submit" type="submit">
            <span>Ingresar al panel</span>${icon("ArrowRight")}
          </button>

          <small class="development-note">Acceso temporal de desarrollo. La autenticación real se conectará a Coinpsi-API.</small>
        </form>
      </section>
    </main>
  `;
}

export function initLoginPage() {
  const form = document.getElementById("login-form");
  const message = document.getElementById("login-message");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = form.email.value.trim();
    const password = form.password.value;

    if (!email || !email.includes("@")) {
      message.textContent = "Ingresa un correo electrónico válido.";
      return;
    }

    if (password.length < 6) {
      message.textContent = "La contraseña debe tener al menos 6 caracteres.";
      return;
    }

    message.textContent = "";
    createDevelopmentSession(email);
    navigate("/dashboard", { replace: true });
  });
}
