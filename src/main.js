import { startRouter } from "./router/router.js";
import { renderAdminLayout, initAdminLayout } from "./components/layout/adminLayout.js";
import { renderLoginPage, initLoginPage } from "./pages/login.js";
import { renderDashboardPage, initDashboardPage } from "./pages/dashboard.js";
import { renderEventsPage, initEventsPage } from "./pages/events.js";
import { renderGalleryPage, initGalleryPage } from "./pages/gallery.js";
import { renderNotFoundPage } from "./pages/notFound.js";
import { validateSession } from "./services/session.service.js";

const app = document.getElementById("app");

const routes = {
  "/dashboard": { title: "Inicio", render: renderDashboardPage, init: initDashboardPage },
  "/eventos": { title: "Eventos", render: renderEventsPage, init: initEventsPage },
  "/galeria": { title: "Galeria", render: renderGalleryPage, init: initGalleryPage }
};

function renderRoute(path) {
  document.body.classList.remove("sidebar-open");

  if (path === "/login") {
    document.title = "Acceso | COINPSI Administracion";
    app.innerHTML = renderLoginPage();
    initLoginPage();
    return;
  }

  const route = routes[path];
  const title = route?.title || "Pagina no encontrada";
  const content = route ? route.render() : renderNotFoundPage();

  document.title = `${title} | COINPSI Administracion`;
  app.innerHTML = renderAdminLayout({ title, activePath: path, content });
  initAdminLayout();
  route?.init?.();
}

async function bootstrap() {
  await validateSession();
  startRouter(renderRoute);
}

bootstrap();
