import { startRouter } from "./router/router.js";
import { renderAdminLayout, initAdminLayout } from "./components/layout/adminLayout.js";
import { renderLoginPage, initLoginPage } from "./pages/login.js";
import { renderDashboardPage } from "./pages/dashboard.js";
import { renderEventsPage } from "./pages/events.js";
import { renderGalleryPage } from "./pages/gallery.js";
import { renderGallerySettingsPage } from "./pages/gallerySettings.js";
import { renderNotFoundPage } from "./pages/notFound.js";

const app = document.getElementById("app");

const routes = {
  "/dashboard": { title: "Inicio", render: renderDashboardPage },
  "/eventos": { title: "Eventos", render: renderEventsPage },
  "/galeria": { title: "Galería", render: renderGalleryPage },
  "/galeria/configuracion": { title: "Configuración de galería", render: renderGallerySettingsPage }
};

function renderRoute(path) {
  document.body.classList.remove("sidebar-open");

  if (path === "/login") {
    document.title = "Acceso | COINPSI Administración";
    app.innerHTML = renderLoginPage();
    initLoginPage();
    return;
  }

  const route = routes[path];
  const title = route?.title || "Página no encontrada";
  const content = route ? route.render() : renderNotFoundPage();

  document.title = `${title} | COINPSI Administración`;
  app.innerHTML = renderAdminLayout({ title, activePath: path, content });
  initAdminLayout();
}

startRouter(renderRoute);
