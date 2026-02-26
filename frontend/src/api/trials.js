import { get, post } from "./request";

export function listTrialCases(params = {}) {
  const qs = new URLSearchParams();
  qs.set("has_trial", "1");
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`cases/${suffix}`);
}

export function listCasesWithoutTrial(params = {}) {
  const qs = new URLSearchParams();
  qs.set("without_trial", "1");
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize || 100));
  return get(`cases/?${qs.toString()}`);
}

export function listJudges() {
  return get("cases/judges/");
}

export function createTrial(caseId, body) {
  return post(`cases/${caseId}/investigation/trial/`, body);
}

export function getTrial(caseId) {
  return get(`cases/${caseId}/investigation/trial/`);
}

export function recordVerdict(caseId, body) {
  return post(`cases/${caseId}/investigation/trial/record-verdict/`, body);
}