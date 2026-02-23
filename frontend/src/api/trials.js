import { get, post } from "./request";

export function listTrialCases(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`cases/${suffix}`);
}

export function getTrial(caseId) {
  return get(`cases/${caseId}/investigation/trial/`);
}

export function recordVerdict(caseId, body) {
  return post(`cases/${caseId}/investigation/trial/record-verdict/`, body);
}