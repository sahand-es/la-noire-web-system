import { get, post } from "./request";

export function listWitnessTestimonies(caseId) {
  return get(`cases/${caseId}/witness-testimonies/`);
}
export function createWitnessTestimony(caseId, body) {
  return post(`cases/${caseId}/witness-testimonies/`, body);
}

export function listBiologicalEvidence(caseId) {
  return get(`cases/${caseId}/biological-evidence/`);
}
export function createBiologicalEvidence(caseId, body) {
  return post(`cases/${caseId}/biological-evidence/`, body);
}

export function listVehicleEvidence(caseId) {
  return get(`cases/${caseId}/vehicle-evidence/`);
}
export function createVehicleEvidence(caseId, body) {
  return post(`cases/${caseId}/vehicle-evidence/`, body);
}

export function listDocumentEvidence(caseId) {
  return get(`cases/${caseId}/document-evidence/`);
}
export function createDocumentEvidence(caseId, body) {
  return post(`cases/${caseId}/document-evidence/`, body);
}

export function listOtherEvidence(caseId) {
  return get(`cases/${caseId}/other-evidence/`);
}
export function createOtherEvidence(caseId, body) {
  return post(`cases/${caseId}/other-evidence/`, body);
}