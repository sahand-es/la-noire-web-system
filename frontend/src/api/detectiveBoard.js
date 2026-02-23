import { get, post, patch, del } from "./request";

export function getBoard(caseId) {
  return get(`cases/${caseId}/investigation/board/`);
}

export function listBoardNodes(caseId) {
  return get(`cases/${caseId}/investigation/board/nodes/`);
}

export function createBoardNode(caseId, body) {
  return post(`cases/${caseId}/investigation/board/nodes/`, body);
}

export function updateBoardNode(nodeId, body) {
  return patch(`investigation/board/nodes/${nodeId}/`, body);
}

export function deleteBoardNode(nodeId) {
  return del(`investigation/board/nodes/${nodeId}/`);
}

export function listBoardEdges(caseId) {
  return get(`cases/${caseId}/investigation/board/edges/`);
}

export function createBoardEdge(caseId, body) {
  return post(`cases/${caseId}/investigation/board/edges/`, body);
}

export function deleteBoardEdge(edgeId) {
  return del(`investigation/board/edges/${edgeId}/`);
}