/**
 * Single module for all HTTP requests. Use only this module (or api helpers) for backend calls.
 * Backend returns { status: 'success', data? } or { status: 'error', message? }.
 *
 * Env:
 *   VITE_API_URL or API_BASE_URL — full base URL (e.g. http://127.0.0.1:8000/api/v1)
 */
const BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.API_BASE_URL ||
  ""
).replace(/\/$/, "");

function getToken() {
  return localStorage.getItem("access_token") || "";
}

function getRefreshToken() {
  return localStorage.getItem("refresh_token") || "";
}

function clearAuth() {
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  } catch {}
}

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

function headers(withBody = false) {
  const h = { Accept: "application/json" };
  if (withBody) h["Content-Type"] = "application/json";
  const token = getToken();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function handleResponse(res) {
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(res.statusText || "Invalid response from server");
  }

  if (res.status === 401) {
    const err = new Error(
      (json && (json.message || json.error)) || "Unauthorized",
    );
    err.status = 401;
    throw err;
  }

  if (json && json.status === "success") {
    return json.data;
  }
  if (res.ok && (json == null || typeof json.status === "undefined")) {
    return json;
  }

  let msg = (json && (json.message || json.error)) || "";

  if (!msg && json && json.errors && typeof json.errors === "object") {
    const errorMessages = [];
    for (const [field, errors] of Object.entries(json.errors)) {
      const fieldErrors = Array.isArray(errors) ? errors : [errors];
      errorMessages.push(`${field}: ${fieldErrors.join(", ")}`);
    }
    msg = errorMessages.join("; ");
  }

  if (!msg && json && typeof json === "object" && !Array.isArray(json)) {
    const errorMessages = [];
    for (const [field, errors] of Object.entries(json)) {
      if (field !== "status" && field !== "data") {
        const fieldErrors = Array.isArray(errors) ? errors : [errors];
        const fieldName = field.replace(/_/g, " ");
        errorMessages.push(`${fieldName}: ${fieldErrors.join(", ")}`);
      }
    }
    if (errorMessages.length > 0) {
      msg = errorMessages.join("; ");
    }
  }

  if (!msg) {
    msg = res.statusText || `Request failed with status ${res.status}`;
  }

  const err = new Error(msg);
  err.status = res.status;
  err.response = json;
  throw err;
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();
  if (!refresh) {
    return "";
  }

  const res = await fetch(url("auth/sessions/refresh/"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    throw new Error("Refresh token expired");
  }

  const data = await res.json();
  const access = data?.access || "";
  if (!access) {
    throw new Error("No access token in refresh response");
  }

  localStorage.setItem("access_token", access);
  return access;
}

async function request(path, init = {}, canRetry = true) {
  const response = await fetch(url(path), init);

  if (response.status !== 401 || !canRetry) {
    return handleResponse(response);
  }

  try {
    const newAccessToken = await refreshAccessToken();
    if (!newAccessToken) {
      throw new Error("Missing refreshed access token");
    }

    const retriedHeaders = {
      ...(init.headers || {}),
      Authorization: `Bearer ${newAccessToken}`,
    };

    const retried = await fetch(url(path), {
      ...init,
      headers: retriedHeaders,
    });

    return handleResponse(retried);
  } catch {
    clearAuth();
    redirectToLogin();
    throw new Error("Session expired. Please login again.");
  }
}

function url(path) {
  return `${BASE}/${path}`.replace(/([^:]\/)\/+/g, "$1");
}

export function get(path) {
  return request(path, { method: "GET", headers: headers() });
}

export function post(path, body) {
  return request(path, {
    method: "POST",
    headers: headers(true),
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export function put(path, body) {
  return request(path, {
    method: "PUT",
    headers: headers(true),
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export function patch(path, body) {
  return request(path, {
    method: "PATCH",
    headers: headers(true),
    body: body != null ? JSON.stringify(body) : undefined,
  });
}

export function del(path) {
  return request(path, { method: "DELETE", headers: headers() });
}

export function getPublic(path) {
  const h = { Accept: "application/json" };
  return fetch(url(path), { method: "GET", headers: h }).then(handleResponse);
}

export function postPublic(path, body) {
  const h = { Accept: "application/json", "Content-Type": "application/json" };
  return fetch(url(path), {
    method: "POST",
    headers: h,
    body: body != null ? JSON.stringify(body) : undefined,
  }).then(handleResponse);
}

export { getToken };
