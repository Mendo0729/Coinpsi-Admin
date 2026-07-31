import { APP_CONFIG } from "../config.js";

const API_BASE_URL = `${APP_CONFIG.apiUrl}/admin/knowledge`;

async function request(path, token, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json; charset=utf-8" } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    const error = new Error("No se pudo conectar con Coinpsi-API.");
    error.code = "API_UNAVAILABLE";
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "La solicitud no pudo completarse.");
    error.code = data.error || "API_ERROR";
    error.status = response.status;
    error.details = data.details;
    throw error;
  }

  return data;
}

export function getKnowledgeCategories(token) {
  return request("/categories", token, { method: "GET" });
}

export function getAdminKnowledgePosts(token) {
  return request("/posts", token, { method: "GET" });
}

export function createKnowledgePost(token, post) {
  return request("/posts", token, {
    method: "POST",
    body: JSON.stringify(post)
  });
}

export function updateKnowledgePost(token, postId, post) {
  return request(`/posts/${encodeURIComponent(postId)}`, token, {
    method: "PATCH",
    body: JSON.stringify(post)
  });
}

export function deleteKnowledgePost(token, postId) {
  return request(`/posts/${encodeURIComponent(postId)}`, token, {
    method: "DELETE"
  });
}
