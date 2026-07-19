const SESSION_KEY = "coinpsi_admin_session";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getSession()?.email);
}

export function createDevelopmentSession(email) {
  const session = {
    email,
    name: email.split("@")[0].replace(/[._-]/g, " "),
    role: "Administrador",
    createdAt: new Date().toISOString()
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
