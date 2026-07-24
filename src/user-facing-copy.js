const TEXT_REPLACEMENTS = new Map([
  ["Gestion de eventos de COINPSI", "Bienvenido al panel de COINPSI"],
  [
    "Consulta el estado de los eventos y revisa cuales estan publicados actualmente en la landing.",
    "Administra los eventos y revisa el contenido que actualmente se muestra en el sitio web."
  ],
  [
    "Consulta, crea, edita, cancela y elimina eventos almacenados en PostgreSQL.",
    "Crea, edita y organiza los eventos que deseas compartir con tu comunidad."
  ],
  ["GESTION DE CONTENIDO", "EVENTOS"],
  ["REGISTROS DISPONIBLES", "TUS EVENTOS"],
  ["Eventos registrados", "Lista de eventos"],
  ["Obteniendo la informacion desde Coinpsi-API.", "Preparando la información de tus eventos."],
  ["Consultando la informacion registrada en Coinpsi-API.", "Preparando la información de tus eventos."],
  ["Completa la informacion que se guardara en PostgreSQL.", "Completa la información del evento para guardarlo."],
  ["Si se deja vacio, la API genera un mensaje usando el titulo.", "Si lo dejas vacío, se creará un mensaje usando el título del evento."],
  ["NUEVO REGISTRO", "NUEVO EVENTO"],
  ["EDITAR REGISTRO", "EDITAR EVENTO"],
  ["Visibles actualmente en la landing", "Visibles actualmente en el sitio web"],
  ["Visibles en la landing", "Visibles en el sitio web"],
  ["No visibles en la landing", "No visibles en el sitio web"],
  ["Todos los registros administrativos", "Todos los eventos creados"],
  [
    "Publica un evento desde el modulo Eventos para mostrarlo aqui y en la landing.",
    "Publica un evento para mostrarlo aquí y en el sitio web."
  ],
  ["Galeria desde Google Drive", "Galería de COINPSI"],
  [
    "Navega por las carpetas y revisa las fotografias en paginas de 20 imagenes.",
    "Selecciona y organiza las fotografías que deseas mostrar en el sitio web."
  ],
  ["GESTION VISUAL", "GALERÍA"],
  ["CONEXION", "GOOGLE DRIVE"],
  ["Cuenta y carpeta raiz", "Cuenta conectada"],
  ["EXPLORADOR", "CARPETAS"],
  ["Carpeta raiz", "Carpeta principal"],
  ["PUBLICACION", "FOTOGRAFÍAS SELECCIONADAS"],
  [
    "Las imagenes se cargan en paginas de 20 para mantener el panel fluido.",
    "Tu galería está lista para seleccionar y publicar fotografías."
  ],
  ["Tamano de pagina", "Estado"],
  ["Cargando pagina", "Cargando fotografías"],
  [
    "Consultando hasta 20 imagenes y preparando sus vistas previas.",
    "Preparando las fotografías de esta carpeta."
  ],
  [
    "No se encontraron subcarpetas ni imagenes compatibles.",
    "Esta carpeta no tiene fotografías disponibles."
  ],
  [
    "Abre una carpeta y marca las fotografias que deseas mostrar en la landing.",
    "Abre una carpeta y selecciona las fotografías que deseas mostrar en el sitio web."
  ],
  ["Autoriza Google Drive", "Conecta Google Drive"],
  [
    "La carpeta raiz esta definida, pero la cuenta aun no esta conectada.",
    "Conecta la cuenta para acceder a las fotografías."
  ],
  ["Metodo", "Conexión"],
  ["OAuth 2.0", "Segura"],
  ["Probar conexion", "Verificar"],
  ["Configuracion incompleta", "Google Drive no está disponible"]
]);

function preserveSpacing(original, replacement) {
  const leading = original.match(/^\s*/)?.[0] || "";
  const trailing = original.match(/\s*$/)?.[0] || "";
  return `${leading}${replacement}${trailing}`;
}

function replaceTextNodes(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const value = node.nodeValue?.trim();
      if (!value) return NodeFilter.FILTER_REJECT;
      if (node.parentElement?.closest("script, style, textarea, input, option")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  nodes.forEach((node) => {
    const current = node.nodeValue.trim();
    const replacement = TEXT_REPLACEMENTS.get(current);
    if (replacement && replacement !== current) {
      node.nodeValue = preserveSpacing(node.nodeValue, replacement);
    }
  });
}

function updateGallerySelectionHeading(root) {
  const count = root.querySelector("#gallery-selection-count");
  const heading = count?.parentElement;
  if (!heading) return;

  const firstTextNode = Array.from(heading.childNodes).find(
    (node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.includes("Seleccion para la landing")
  );

  if (firstTextNode) {
    firstTextNode.nodeValue = firstTextNode.nodeValue.replace(
      "Seleccion para la landing",
      "Fotografías para publicar"
    );
  }
}

function simplifyDriveConfigurationError(root) {
  const errorState = root.querySelector("#drive-status-content .drive-state-error");
  if (!errorState) return;

  const title = errorState.querySelector("strong");
  const message = errorState.querySelector("p");
  if (title) title.textContent = "Google Drive no está disponible";
  if (message) message.textContent = "Revisa la conexión e inténtalo nuevamente.";
}

function applyUserFacingCopy(root) {
  replaceTextNodes(root);
  updateGallerySelectionHeading(root);
  simplifyDriveConfigurationError(root);
}

export function initUserFacingCopy() {
  const app = document.getElementById("app");
  if (!app) return;

  let scheduled = false;
  const scheduleUpdate = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      applyUserFacingCopy(app);
      scheduled = false;
    });
  };

  const observer = new MutationObserver(scheduleUpdate);
  observer.observe(app, {
    childList: true,
    subtree: true,
    characterData: true
  });

  applyUserFacingCopy(app);
}
