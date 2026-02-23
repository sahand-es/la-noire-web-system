import { get, post } from "./request";

export function listPendingBiologicalEvidence(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`cases/biological-evidence/coroner-approvals/${suffix}`);
}

export function coronerApproveEvidence(evidenceId, body) {
  return post(`cases/biological-evidence/${evidenceId}/coroner-approvals/`, body);
}