import { get, post } from "./request";

export function listRewardTips(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  if (params.status) qs.set("status", params.status);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`rewards/${suffix}`);
}

export function submitRewardTip(body) {
  return post("rewards/", body);
}

export function officerReviewTip(tipId, body) {
  return post(`rewards/${tipId}/officer-reviews/`, body);
}

export function detectiveReviewTip(tipId, body) {
  return post(`rewards/${tipId}/detective-reviews/`, body);
}

export function lookupReward(body) {
  const qs = new URLSearchParams();
  if (body?.national_id) qs.set("national_id", body.national_id);
  if (body?.reward_code) qs.set("reward_code", body.reward_code);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`rewards/lookups/${suffix}`);
}

export function claimRewardPayment(rewardId, body) {
  return post(`rewards/${rewardId}/claim-payment/`, body);
}
