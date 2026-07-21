const API_BASE_URL = "http://localhost:3002/api/v1/admin/events";

async function request(path = "", options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, options);
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

export function getAdminEvents(token) {
  return request("", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function createAdminEvent(token, event) {
  return request("", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify(event)
  });
}

export function cancelAdminEvent(token, eventId) {
  return request(`/${encodeURIComponent(eventId)}/cancel`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export function deleteAdminEvent(token, eventId) {
  return request(`/${encodeURIComponent(eventId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}
