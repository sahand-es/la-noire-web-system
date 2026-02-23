import { get, post } from "./request";

export function listRewardTips(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  if (params.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`rewards/tips/${suffix}`);
}

export function submitRewardTip(body) {
  return post("rewards/tips/", body);
}

export function officerReviewTip(tipId, body) {
  return post(`rewards/tips/${tipId}/officer-reviews/`, body);
}

export function detectiveReviewTip(tipId, body) {
  return post(`rewards/tips/${tipId}/detective-reviews/`, body);
}

export function lookupReward(body) {
  return post("rewards/lookup/", body);
}