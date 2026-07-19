import { isAuthenticated } from "../services/session.service.js";

let routeRenderer = null;

function normalizePath(path) {
  const clean = path.split("?")[0].replace(/\/$/, "");
  return clean || "/";
}

export function navigate(path, options = {}) {
  if (options.replace) {
    window.history.replaceState({}, "", path);
  } else {
    window.history.pushState({}, "", path);
  }
  renderCurrentRoute();
}

export function startRouter(renderer) {
  routeRenderer = renderer;

  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-link]");
    if (!link) return;
    event.preventDefault();
    navigate(link.getAttribute("href"));
  });

  window.addEventListener("popstate", renderCurrentRoute);
  renderCurrentRoute();
}

export function renderCurrentRoute() {
  if (!routeRenderer) return;

  let path = normalizePath(window.location.pathname);
  const authenticated = isAuthenticated();

  if (path === "/") path = authenticated ? "/dashboard" : "/login";
  if (!authenticated && path !== "/login") path = "/login";
  if (authenticated && path === "/login") path = "/dashboard";

  if (path !== normalizePath(window.location.pathname)) {
    window.history.replaceState({}, "", path);
  }

  routeRenderer(path);
}
