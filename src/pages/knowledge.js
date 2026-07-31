import { icon } from "../icons.js";
import { navigate } from "../router/router.js";
import {
  createKnowledgePost,
  deleteKnowledgePost,
  getAdminKnowledgePosts,
  getKnowledgeCategories,
  updateKnowledgePost
} from "../services/knowledge.service.js";
import { clearSession, getSession } from "../services/session.service.js";

const STATUS_LABELS = {
  draft: "Borrador",
  published: "Publicado",
  archived: "Archivado"
};

let knowledgePosts = [];
let knowledgeCategories = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "Sin publicar";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha inválida";

  return new Intl.DateTimeFormat("es-PA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Panama"
  }).format(date);
}

function handleUnauthorized(error) {
  if (error.status !== 401 && error.code !== "UNAUTHORIZED") return false;

  clearSession();
  navigate("/login", { replace: true });
  return true;
}

function renderLoadingState() {
  return `
    <div class="knowledge-state" role="status">
      <span class="knowledge-spinner" aria-hidden="true"></span>
      <div><strong>Cargando publicaciones</strong><p>Consultando Espacio del Saber.</p></div>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="knowledge-state">
      <span class="knowledge-state-icon">${icon("Sparkles")}</span>
      <div><strong>No hay cápsulas registradas</strong><p>Crea la primera publicación para Espacio del Saber.</p></div>
    </div>
  `;
}

function renderErrorState(message) {
  return `
    <div class="knowledge-state knowledge-error" role="alert">
      <span class="knowledge-state-icon">!</span>
      <div>
        <strong>No fue posible cargar las publicaciones</strong>
        <p>${escapeHtml(message)}</p>
        <button class="btn btn-secondary" id="retry-knowledge" type="button">Reintentar</button>
      </div>
    </div>
  `;
}

function renderPosts(posts) {
  if (!posts.length) return renderEmptyState();

  return `
    <div class="knowledge-table-wrap">
      <table class="knowledge-table">
        <thead>
          <tr>
            <th>Publicación</th>
            <th>Categoría</th>
            <th>Estado</th>
            <th>Publicación</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${posts.map((post) => `
            <tr>
              <td>
                <div class="knowledge-primary-cell">
                  <div class="knowledge-title-line">
                    <strong>${escapeHtml(post.title)}</strong>
                    ${post.isFeatured ? '<span class="knowledge-featured">Destacada</span>' : ""}
                  </div>
                  <span>Por ${escapeHtml(post.authorName)}</span>
                  <p>${escapeHtml(post.summary)}</p>
                  <code>${escapeHtml(post.slug)}</code>
                </div>
              </td>
              <td>${escapeHtml(post.categoryName || "Sin categoría")}</td>
              <td><span class="knowledge-status knowledge-status-${escapeHtml(post.status)}">${escapeHtml(STATUS_LABELS[post.status] || post.status)}</span></td>
              <td>
                <div class="knowledge-date-cell">
                  <span>${escapeHtml(formatDate(post.publishedAt))}</span>
                  <small>Creada por ${escapeHtml(post.createdByName || "Administrador")}</small>
                </div>
              </td>
              <td>
                <div class="knowledge-actions">
                  <button type="button" data-knowledge-action="edit" data-knowledge-id="${escapeHtml(post.id)}">Editar</button>
                  <button class="danger" type="button" data-knowledge-action="delete" data-knowledge-id="${escapeHtml(post.id)}" data-knowledge-title="${escapeHtml(post.title)}">Eliminar</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderCategoryOptions(selectedId = "") {
  return knowledgeCategories.map((category) => `
    <option value="${escapeHtml(category.id)}" ${String(category.id) === String(selectedId) ? "selected" : ""}>
      ${escapeHtml(category.name)}
    </option>
  `).join("");
}

function openKnowledgeModal(post = null) {
  const modal = document.getElementById("knowledge-modal");
  const form = document.getElementById("knowledge-form");
  if (!modal || !form) return;

  form.reset();
  form.dataset.postId = post ? String(post.id) : "";
  document.getElementById("knowledge-modal-title").textContent = post ? "Editar cápsula" : "Nueva cápsula";
  document.getElementById("knowledge-modal-description").textContent = post
    ? "Actualiza el contenido y su estado de publicación."
    : "Completa la información que aparecerá en la landing.";

  form.elements.namedItem("categoryId").innerHTML = `
    <option value="">Selecciona una categoría</option>
    ${renderCategoryOptions(post?.categoryId)}
  `;

  if (post) {
    form.elements.namedItem("title").value = post.title || "";
    form.elements.namedItem("summary").value = post.summary || "";
    form.elements.namedItem("content").value = post.content || "";
    form.elements.namedItem("coverImageUrl").value = post.coverImageUrl || "";
    form.elements.namedItem("authorName").value = post.authorName || "";
    form.elements.namedItem("categoryId").value = String(post.categoryId || "");
    form.elements.namedItem("status").value = post.status || "draft";
    form.elements.namedItem("isFeatured").checked = Boolean(post.isFeatured);
  } else {
    form.elements.namedItem("status").value = "draft";
  }

  document.getElementById("knowledge-form-message").textContent = "";
  modal.hidden = false;
  document.body.classList.add("knowledge-modal-open");
  form.elements.namedItem("title")?.focus();
}

function closeKnowledgeModal() {
  const modal = document.getElementById("knowledge-modal");
  const form = document.getElementById("knowledge-form");
  if (!modal) return;

  modal.hidden = true;
  document.body.classList.remove("knowledge-modal-open");
  if (form) form.dataset.postId = "";
}

function getFormValue(formData, name) {
  return String(formData.get(name) ?? "").trim();
}

function buildPayload(form) {
  const formData = new FormData(form);
  const payload = {
    title: getFormValue(formData, "title"),
    summary: getFormValue(formData, "summary"),
    content: getFormValue(formData, "content"),
    coverImageUrl: getFormValue(formData, "coverImageUrl"),
    authorName: getFormValue(formData, "authorName"),
    categoryId: getFormValue(formData, "categoryId"),
    status: getFormValue(formData, "status"),
    isFeatured: form.elements.namedItem("isFeatured").checked
  };

  if (!payload.title) throw new Error("El título es obligatorio.");
  if (!payload.summary) throw new Error("El resumen es obligatorio.");
  if (!payload.content) throw new Error("El contenido es obligatorio.");
  if (!payload.authorName) throw new Error("El nombre del autor es obligatorio.");
  if (!payload.categoryId) throw new Error("Selecciona una categoría.");

  return payload;
}

function showFeedback(type, message) {
  const feedback = document.getElementById("knowledge-feedback");
  if (!feedback) return;

  feedback.className = `knowledge-feedback knowledge-feedback-${type}`;
  feedback.textContent = message;
  feedback.hidden = false;

  window.setTimeout(() => {
    const current = document.getElementById("knowledge-feedback");
    if (current) current.hidden = true;
  }, 5000);
}

async function loadKnowledge() {
  const content = document.getElementById("knowledge-content");
  const count = document.getElementById("knowledge-count");
  const session = getSession();

  if (!content) return;
  if (!session?.token) {
    clearSession();
    navigate("/login", { replace: true });
    return;
  }

  content.innerHTML = renderLoadingState();
  document.getElementById("refresh-knowledge")?.setAttribute("disabled", "");

  try {
    const [postsResponse, categoriesResponse] = await Promise.all([
      getAdminKnowledgePosts(session.token),
      getKnowledgeCategories(session.token)
    ]);

    knowledgePosts = postsResponse.posts || [];
    knowledgeCategories = categoriesResponse.categories || [];
    content.innerHTML = renderPosts(knowledgePosts);
    if (count) count.textContent = String(postsResponse.count ?? knowledgePosts.length);
  } catch (error) {
    knowledgePosts = [];
    knowledgeCategories = [];
    if (handleUnauthorized(error)) return;
    content.innerHTML = renderErrorState(error.message);
    document.getElementById("retry-knowledge")?.addEventListener("click", loadKnowledge);
  } finally {
    document.getElementById("refresh-knowledge")?.removeAttribute("disabled");
  }
}

async function submitKnowledgeForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const session = getSession();
  const postId = form.dataset.postId;
  const isEditing = Boolean(postId);
  const message = document.getElementById("knowledge-form-message");
  const button = document.getElementById("save-knowledge");

  if (!session?.token) return handleUnauthorized({ status: 401 });

  try {
    const payload = buildPayload(form);
    message.textContent = "";
    button.disabled = true;
    button.textContent = isEditing ? "Actualizando..." : "Guardando...";

    if (isEditing) {
      await updateKnowledgePost(session.token, postId, payload);
    } else {
      await createKnowledgePost(session.token, payload);
    }

    closeKnowledgeModal();
    showFeedback("success", isEditing ? "Cápsula actualizada correctamente." : "Cápsula creada correctamente.");
    await loadKnowledge();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    message.textContent = error.message || "No fue posible guardar la cápsula.";
  } finally {
    button.disabled = false;
    button.textContent = "Guardar cápsula";
  }
}

async function handleKnowledgeAction(event) {
  const button = event.target.closest("[data-knowledge-action]");
  if (!button) return;

  const post = knowledgePosts.find((item) => String(item.id) === button.dataset.knowledgeId);
  if (!post) return;

  if (button.dataset.knowledgeAction === "edit") {
    openKnowledgeModal(post);
    return;
  }

  if (button.dataset.knowledgeAction !== "delete") return;
  if (!window.confirm(`¿Eliminar la cápsula “${post.title}”? Esta acción no se puede deshacer.`)) return;

  const session = getSession();
  if (!session?.token) return handleUnauthorized({ status: 401 });

  try {
    button.disabled = true;
    await deleteKnowledgePost(session.token, post.id);
    showFeedback("success", "Cápsula eliminada correctamente.");
    await loadKnowledge();
  } catch (error) {
    if (handleUnauthorized(error)) return;
    showFeedback("error", error.message || "No fue posible eliminar la cápsula.");
  } finally {
    button.disabled = false;
  }
}

export function renderKnowledgePage() {
  return `
    <section class="knowledge-page">
      <div class="knowledge-toolbar">
        <div>
          <span class="page-eyebrow">GESTIÓN DE CONTENIDO</span>
          <h2>Espacio del Saber</h2>
          <p>Administra las cápsulas de conocimiento que se muestran en la landing.</p>
        </div>
        <div class="knowledge-toolbar-actions">
          <button class="btn btn-secondary" id="refresh-knowledge" type="button">Actualizar</button>
          <button class="btn btn-primary" id="new-knowledge" type="button">${icon("Plus")}Nueva cápsula</button>
        </div>
      </div>

      <div id="knowledge-feedback" class="knowledge-feedback" hidden></div>

      <div class="knowledge-summary-card">
        <span>Publicaciones registradas</span>
        <strong id="knowledge-count">0</strong>
        <small>Solo las publicaciones con estado Publicado aparecen en la landing.</small>
      </div>

      <div id="knowledge-content">${renderLoadingState()}</div>
    </section>

    <div class="knowledge-modal" id="knowledge-modal" hidden>
      <button class="knowledge-modal-backdrop" type="button" data-close-knowledge aria-label="Cerrar"></button>
      <section class="knowledge-modal-card" role="dialog" aria-modal="true" aria-labelledby="knowledge-modal-title">
        <header>
          <div>
            <span class="page-eyebrow">ESPACIO DEL SABER</span>
            <h2 id="knowledge-modal-title">Nueva cápsula</h2>
            <p id="knowledge-modal-description">Completa la información que aparecerá en la landing.</p>
          </div>
          <button class="knowledge-modal-close" type="button" data-close-knowledge aria-label="Cerrar">×</button>
        </header>

        <form id="knowledge-form" novalidate>
          <div class="knowledge-form-grid">
            <label class="knowledge-field knowledge-field-wide">
              <span>Título</span>
              <input name="title" maxlength="180" required />
            </label>

            <label class="knowledge-field">
              <span>Autor mostrado</span>
              <input name="authorName" maxlength="150" required />
            </label>

            <label class="knowledge-field">
              <span>Categoría</span>
              <select name="categoryId" required></select>
            </label>

            <label class="knowledge-field knowledge-field-wide">
              <span>Resumen</span>
              <textarea name="summary" maxlength="350" rows="3" required></textarea>
            </label>

            <label class="knowledge-field knowledge-field-wide">
              <span>Contenido completo</span>
              <textarea name="content" rows="10" required></textarea>
            </label>

            <label class="knowledge-field knowledge-field-wide">
              <span>URL de imagen de portada <small>(opcional)</small></span>
              <input name="coverImageUrl" type="url" maxlength="500" placeholder="https://..." />
            </label>

            <label class="knowledge-field">
              <span>Estado</span>
              <select name="status">
                <option value="draft">Borrador</option>
                <option value="published">Publicado</option>
                <option value="archived">Archivado</option>
              </select>
            </label>

            <label class="knowledge-checkbox">
              <input name="isFeatured" type="checkbox" />
              <span>Mostrar como publicación destacada</span>
            </label>
          </div>

          <p class="form-message" id="knowledge-form-message" aria-live="polite"></p>

          <footer>
            <button class="btn btn-secondary" type="button" data-close-knowledge>Cancelar</button>
            <button class="btn btn-primary" id="save-knowledge" type="submit">Guardar cápsula</button>
          </footer>
        </form>
      </section>
    </div>
  `;
}

export function initKnowledgePage() {
  document.getElementById("new-knowledge")?.addEventListener("click", () => openKnowledgeModal());
  document.getElementById("refresh-knowledge")?.addEventListener("click", loadKnowledge);
  document.getElementById("knowledge-form")?.addEventListener("submit", submitKnowledgeForm);
  document.getElementById("knowledge-content")?.addEventListener("click", handleKnowledgeAction);
  document.querySelectorAll("[data-close-knowledge]").forEach((button) => {
    button.addEventListener("click", closeKnowledgeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeKnowledgeModal();
  }, { once: true });

  loadKnowledge();
}
