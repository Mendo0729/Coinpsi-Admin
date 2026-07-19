import { icon } from "../../icons.js";
import { clearSession, getSession } from "../../services/session.service.js";
import { navigate } from "../../router/router.js";

const navigation = [
  { href: "/dashboard", label: "Inicio", icon: "Dashboard" },
  { href: "/eventos", label: "Eventos", icon: "Calendar" },
  { href: "/galeria", label: "Galería", icon: "Image" },
  { href: "/galeria/configuracion", label: "Configuración", icon: "Settings" }
];

function brandTemplate() {
  return `
    <a class="admin-brand" href="/dashboard" data-link aria-label="Ir al inicio">
      <span class="brand-mark">CP</span>
      <span><strong>COINPSI</strong><small>Administración</small></span>
    </a>
  `;
}

function sidebarTemplate(activePath) {
  return `
    <aside class="admin-sidebar" id="admin-sidebar">
      <div class="sidebar-top">${brandTemplate()}</div>
      <nav class="sidebar-nav" aria-label="Navegación principal">
        <span class="nav-caption">GESTIÓN DE CONTENIDO</span>
        ${navigation.map((item) => `
          <a class="sidebar-link ${activePath === item.href ? "active" : ""}" href="${item.href}" data-link>
            ${icon(item.icon)}<span>${item.label}</span>
          </a>
        `).join("")}
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-help">
          ${icon("Sparkles")}
          <div><strong>Panel COINPSI</strong><small>Eventos y galería institucional</small></div>
        </div>
        <button class="sidebar-link logout-button" id="logout-button" type="button">
          ${icon("LogOut")}<span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  `;
}

function headerTemplate(title) {
  const session = getSession();
  const initial = (session?.name || "A").trim().charAt(0).toUpperCase();

  return `
    <header class="admin-header">
      <div class="header-title-group">
        <button class="icon-button menu-button" id="menu-button" type="button" aria-label="Abrir menú">${icon("Menu")}</button>
        <div><span>Panel administrativo</span><h1>${title}</h1></div>
      </div>
      <div class="header-actions">
        <button class="icon-button notification-button" type="button" aria-label="Notificaciones">${icon("Bell")}<span></span></button>
        <div class="user-chip">
          <span class="user-avatar">${initial}</span>
          <div><strong>${session?.name || "Administrador"}</strong><small>${session?.role || "Administrador"}</small></div>
          ${icon("ChevronDown")}
        </div>
      </div>
    </header>
  `;
}

export function renderAdminLayout({ title, activePath, content }) {
  return `
    <div class="admin-shell">
      ${sidebarTemplate(activePath)}
      <button class="sidebar-backdrop" id="sidebar-backdrop" aria-label="Cerrar menú"></button>
      <div class="admin-main">
        ${headerTemplate(title)}
        <main class="admin-content">${content}</main>
      </div>
    </div>
  `;
}

export function initAdminLayout() {
  const sidebar = document.getElementById("admin-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");

  const closeSidebar = () => document.body.classList.remove("sidebar-open");
  document.getElementById("menu-button")?.addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
  backdrop?.addEventListener("click", closeSidebar);
  document.querySelectorAll(".sidebar-link[data-link]").forEach((link) => link.addEventListener("click", closeSidebar));

  document.getElementById("logout-button")?.addEventListener("click", () => {
    clearSession();
    navigate("/login", { replace: true });
  });

  if (!sidebar) closeSidebar();
}
