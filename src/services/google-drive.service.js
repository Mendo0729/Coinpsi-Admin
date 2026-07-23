import { APP_CONFIG } from "../config.js";

const DRIVE_API_BASE_URL = `${APP_CONFIG.apiUrl}/admin/google-drive`;
const GALLERY_API_BASE_URL = `${APP_CONFIG.apiUrl}/admin/gallery`;

async function requestJson(baseUrl, path, token, options = {}) {
  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
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

export function getGoogleDriveStatus(token) {
  return requestJson(DRIVE_API_BASE_URL, "/status", token, { method: "GET" });
}

export function getGoogleDriveAuthorizationUrl(token) {
  return requestJson(DRIVE_API_BASE_URL, "/auth-url", token, { method: "GET" });
}

export function runGoogleDriveTest(token) {
  return requestJson(DRIVE_API_BASE_URL, "/test", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
}

export function getGoogleDriveFolder(token, folderId, pageToken = null) {
  const query = pageToken
    ? `?pageToken=${encodeURIComponent(pageToken)}`
    : "";

  return requestJson(
    DRIVE_API_BASE_URL,
    `/folders/${encodeURIComponent(folderId)}${query}`,
    token,
    { method: "GET" }
  );
}

export async function getGoogleDriveImageBlob(token, fileId) {
  let response;

  try {
    response = await fetch(
      `${DRIVE_API_BASE_URL}/files/${encodeURIComponent(fileId)}/content`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` }
      }
    );
  } catch {
    const error = new Error("No se pudo cargar la vista previa.");
    error.code = "API_UNAVAILABLE";
    throw error;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.message || "No se pudo cargar la vista previa.");
    error.code = data.error || "IMAGE_ERROR";
    error.status = response.status;
    throw error;
  }

  return response.blob();
}

export function getGallerySelection(token) {
  return requestJson(GALLERY_API_BASE_URL, "/", token, { method: "GET" });
}

export function saveGallerySelection(token, items) {
  return requestJson(GALLERY_API_BASE_URL, "/selection", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items })
  });
}
