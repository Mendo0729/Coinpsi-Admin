const API_BASE_URL = "http://localhost:3002/api/v1/auth";

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
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

export async function loginAdmin(email, password) {
  return request("/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export async function getCurrentAdmin(token) {
  return request("/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
