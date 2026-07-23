import { APP_CONFIG } from "../config.js";

const API_BASE_URL = `${APP_CONFIG.apiUrl}/admin/google-drive`;

async function request(path, token, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
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
    throw error;
  }

  return data;
}

export function getGoogleDriveStatus(token) {
  return request("/status", token, { method: "GET" });
}

export function getGoogleDriveAuthorizationUrl(token) {
  return request("/auth-url", token, { method: "GET" });
}

export function runGoogleDriveTest(token) {
  return request("/test", token, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    }
  });
}
