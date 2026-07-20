import { getCurrentAdmin } from "./auth.service.js";

const SESSION_KEY = "coinpsi_admin_session";

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  const session = getSession();
  return Boolean(session?.token && session?.email);
}

export function saveSession(token, user) {
  const session = {
    token,
    user,
    email: user.email,
    name: user.fullName,
    role: user.role,
    createdAt: new Date().toISOString()
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export async function validateSession() {
  const session = getSession();

  if (!session?.token) {
    clearSession();
    return false;
  }

  try {
    const response = await getCurrentAdmin(session.token);
    saveSession(session.token, response.user);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
