import { get, post } from "./request";

export function listNotifications(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`investigation/notifications/${suffix}`);
}

export function markNotificationRead(notificationId) {
  return post(`investigation/notifications/${notificationId}/reads/`, {});
}