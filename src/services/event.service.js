const API_BASE_URL = "http://localhost:3002/api/v1/admin/events";

export async function getAdminEvents(token) {
  let response;

  try {
    response = await fetch(API_BASE_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  } catch {
    const error = new Error("No se pudo conectar con Coinpsi-API.");
    error.code = "API_UNAVAILABLE";
    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "No fue posible consultar los eventos.");
    error.code = data.error || "API_ERROR";
    error.status = response.status;
    throw error;
  }

  return data;
}
