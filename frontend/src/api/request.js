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

  // If unauthorized, clear local tokens so the app can re-authenticate.
  if (res.status === 401) {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      // keep user info for debugging, but remove to force refresh if needed
      localStorage.removeItem("user");
    } catch {}
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

function url(path) {
  return `${BASE}/${path}`.replace(/([^:]\/)\/+/g, "$1");
}

export function get(path) {
  return fetch(url(path), { method: "GET", headers: headers() }).then(
    handleResponse,
  );
}

export function post(path, body) {
  return fetch(url(path), {
    method: "POST",
    headers: headers(true),
    body: body != null ? JSON.stringify(body) : undefined,
  }).then(handleResponse);
}

export function put(path, body) {
  return fetch(url(path), {
    method: "PUT",
    headers: headers(true),
    body: body != null ? JSON.stringify(body) : undefined,
  }).then(handleResponse);
}

export function patch(path, body) {
  return fetch(url(path), {
    method: "PATCH",
    headers: headers(true),
    body: body != null ? JSON.stringify(body) : undefined,
  }).then(handleResponse);
}

export function del(path) {
  return fetch(url(path), { method: "DELETE", headers: headers() }).then(
    handleResponse,
  );
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
