/**
 * Single module for all HTTP requests. Use only this module (or api helpers) for backend calls.
 * Backend returns { status: 'success', data? } or { status: 'error', message? }.
 *
 * Env (vite.config envPrefix exposes API_* and VITE_*):
 *   API_BASE_URL — full base URL (e.g. http://127.0.0.1:8000/api/v1)
 */
const BASE = (import.meta.env.API_BASE_URL || "").replace(/\/$/, "");

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
    throw new Error(res.statusText || "Invalid response");
  }
  if (json.status === "success") {
    return json.data;
  }
  if (res.ok && typeof json.status === "undefined") {
    return json;
  }
  const msg =
    json.message ||
    json.error ||
    res.statusText ||
    `Request failed (${res.status})`;
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

export { getToken };
