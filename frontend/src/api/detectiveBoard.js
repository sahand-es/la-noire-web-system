import { get, post, del } from "./request";

export function listContentTypes() {
  return get("investigation/content-types/");
}

export function listEvidenceLinks(caseId) {
  return get(`cases/${caseId}/investigation/evidence-links/`);
}

export function createEvidenceLink(caseId, body) {
  return post(`cases/${caseId}/investigation/evidence-links/`, body);
}

export function deleteEvidenceLink(caseId, linkId) {
  return del(`cases/${caseId}/investigation/evidence-links/${linkId}/`);
}