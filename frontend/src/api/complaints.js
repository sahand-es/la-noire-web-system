import { get, post, patch } from "./request";

export function listComplaints(params = {}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.pageSize) qs.set("page_size", String(params.pageSize));
  if (params.status) qs.set("status", params.status);

  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return get(`complaints/${suffix}`);
}

export function getComplaint(complaintId) {
  return get(`complaints/${complaintId}/`);
}

export function createComplaint(body) {
  return post("complaints/", body);
}

export function updateComplaint(complaintId, body) {
  return patch(`complaints/${complaintId}/`, body);
}

export function submitComplaint(complaintId) {
  return post(`complaints/${complaintId}/submit/`, {});
}

export function cadetReviewComplaint(complaintId, body) {
  return post(`complaints/${complaintId}/cadet-reviews/`, body);
}

export function officerReviewComplaint(complaintId, body) {
  return post(`complaints/${complaintId}/officer-reviews/`, body);
}