import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Modal, Select, Space, Spin, Typography, message } from "antd";
import { PageHeader } from "../components/PageHeader";
import { listCases } from "../api/cases";
import {
  listWitnessTestimonies,
  listBiologicalEvidence,
  listVehicleEvidence,
  listDocumentEvidence,
  listOtherEvidence,
} from "../api/evidence";
import {
  listContentTypes,
  listEvidenceLinks,
  createEvidenceLink,
  deleteEvidenceLink,
} from "../api/detectiveBoard";

const { Text } = Typography;

function normalizeList(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function posKey(caseId) {
  return `detective_board_positions_case_${caseId}`;
}

function readPositions(caseId) {
  const raw = localStorage.getItem(posKey(caseId));
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function writePositions(caseId, positions) {
  localStorage.setItem(posKey(caseId), JSON.stringify(positions));
}

function evidenceLabel(e) {
  return e.title || e.evidence_number || `Evidence #${e.id}`;
}

export function DetectiveBoardPage() {
  const boardRef = useRef(null);

  const [casesLoading, setCasesLoading] = useState(true);
  const [caseOptions, setCaseOptions] = useState([]);
  const [caseId, setCaseId] = useState(null);

  const [ctLoading, setCtLoading] = useState(true);
  const [contentTypes, setContentTypes] = useState([]); // [{id, app_label, model}]
  const ctByModel = useMemo(() => {
    const m = new Map();
    contentTypes.forEach((ct) => m.set(ct.model, ct.id));
    return m;
  }, [contentTypes]);

  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState([]); // [{key, ctId, objectId, title, x, y, raw}]
  const [links, setLinks] = useState([]); // EvidenceLink rows

  const [dragging, setDragging] = useState(null); // { key, offsetX, offsetY }

  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkFrom, setLinkFrom] = useState(null);
  const [linkTo, setLinkTo] = useState(null);

  async function fetchCases() {
    setCasesLoading(true);
    try {
      const res = await listCases({ page: 1, pageSize: 100 });
      const list = normalizeList(res);
      setCaseOptions(
        list.map((c) => ({
          value: c.id,
          label: `${c.case_number || c.id} — ${c.title || "Untitled"}`,
        })),
      );
    } catch (err) {
      message.error(err.message || "Failed to load cases.");
      setCaseOptions([]);
    } finally {
      setCasesLoading(false);
    }
  }

  async function fetchContentTypes() {
    setCtLoading(true);
    try {
      const res = await listContentTypes();
      setContentTypes(normalizeList(res));
    } catch (err) {
      message.error(err.message || "Failed to load content types.");
      setContentTypes([]);
    } finally {
      setCtLoading(false);
    }
  }

  async function fetchBoard(nextCaseId = caseId) {
    if (!nextCaseId) return;
    if (!ctByModel.size) return;

    setLoading(true);
    try {
      const [
        wRes,
        bRes,
        vRes,
        dRes,
        oRes,
        linkRes,
      ] = await Promise.all([
        listWitnessTestimonies(nextCaseId),
        listBiologicalEvidence(nextCaseId),
        listVehicleEvidence(nextCaseId),
        listDocumentEvidence(nextCaseId),
        listOtherEvidence(nextCaseId),
        listEvidenceLinks(nextCaseId),
      ]);

      const positions = readPositions(nextCaseId);

      const buildCards = (list, modelName) => {
        const ctId = ctByModel.get(modelName);
        return normalizeList(list).map((e, idx) => {
          const key = `${modelName}:${e.id}`;
          const saved = positions[key];
          const x = saved?.x ?? 40 + (idx % 4) * 260;
          const y = saved?.y ?? 40 + Math.floor(idx / 4) * 160;
          return {
            key,
            ctId,
            objectId: e.id,
            title: evidenceLabel(e),
            x,
            y,
            raw: e,
            model: modelName,
          };
        });
      };

      const all = [
        ...buildCards(wRes, "witnesstestimony"),
        ...buildCards(bRes, "biologicalevidence"),
        ...buildCards(vRes, "vehiclevidence"),
        ...buildCards(dRes, "documentevidence"),
        ...buildCards(oRes, "otherevidence"),
      ];

      setCards(all);
      setLinks(normalizeList(linkRes));
    } catch (err) {
      message.error(err.message || "Failed to load detective board.");
      setCards([]);
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCases();
    fetchContentTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (caseId && !ctLoading) fetchBoard(caseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, ctLoading]);

  const cardByPair = useMemo(() => {
    const m = new Map();
    cards.forEach((c) => m.set(`${c.ctId}:${c.objectId}`, c));
    return m;
  }, [cards]);

  const cardOptions = useMemo(() => {
    return cards.map((c) => ({
      value: c.key,
      label: `${c.title} (${c.model} #${c.objectId})`,
    }));
  }, [cards]);

  function handleMouseDown(e, card) {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging({
      key: card.key,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
  }

  function handleMouseMove(e) {
    if (!dragging) return;
    const container = boardRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const x = clamp(e.clientX - rect.left - dragging.offsetX, 0, rect.width - 260);
    const y = clamp(e.clientY - rect.top - dragging.offsetY, 0, rect.height - 140);

    setCards((prev) => prev.map((c) => (c.key === dragging.key ? { ...c, x, y } : c)));
  }

  function handleMouseUp() {
    if (!dragging || !caseId) return;
    const moved = cards.find((c) => c.key === dragging.key);
    setDragging(null);
    if (!moved) return;

    const positions = readPositions(caseId);
    positions[moved.key] = { x: moved.x, y: moved.y };
    writePositions(caseId, positions);
  }

  async function onCreateLink() {
    if (!caseId) return;
    if (!linkFrom || !linkTo) return message.error("Select both items.");
    if (linkFrom === linkTo) return message.error("Cannot link an item to itself.");

    const a = cards.find((c) => c.key === linkFrom);
    const b = cards.find((c) => c.key === linkTo);
    if (!a || !b) return message.error("Invalid selection.");

    try {
      await createEvidenceLink(caseId, {
        from_content_type_id: a.ctId,
        from_object_id: a.objectId,
        to_content_type_id: b.ctId,
        to_object_id: b.objectId,
      });
      message.success("Link created.");
      setIsLinkOpen(false);
      setLinkFrom(null);
      setLinkTo(null);
      fetchBoard(caseId);
    } catch (err) {
      message.error(err.message || "Failed to create link.");
    }
  }

  async function onDeleteLink(linkId) {
    if (!caseId) return;
    try {
      await deleteEvidenceLink(caseId, linkId);
      message.success("Link deleted.");
      fetchBoard(caseId);
    } catch (err) {
      message.error(err.message || "Failed to delete link.");
    }
  }

  const lines = useMemo(() => {
    return links
      .map((l) => {
        const a = cardByPair.get(`${l.from_content_type}:${l.from_object_id}`);
        const b = cardByPair.get(`${l.to_content_type}:${l.to_object_id}`);
        if (!a || !b) return null;

        const ax = (a.x || 0) + 120;
        const ay = (a.y || 0) + 50;
        const bx = (b.x || 0) + 120;
        const by = (b.y || 0) + 50;

        return { id: l.id, ax, ay, bx, by };
      })
      .filter(Boolean);
  }, [links, cardByPair]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Detective Board"
            subtitle="Drag evidence cards and connect related items with red lines."
            actions={
              <Space>
                <Button onClick={() => setIsLinkOpen(true)} disabled={!caseId || cards.length < 2}>
                  Add link
                </Button>
                <Button onClick={() => fetchBoard(caseId)} disabled={!caseId || loading}>
                  Refresh
                </Button>
              </Space>
            }
          />
          <div className="mt-4">
            <Select
              value={caseId}
              onChange={setCaseId}
              options={caseOptions}
              placeholder="Select a case"
              loading={casesLoading}
              showSearch
              allowClear
              className="min-w-96"
              filterOption={(input, option) =>
                String(option?.label || "").toLowerCase().includes(input.toLowerCase())
              }
            />
          </div>
          <div className="mt-2">
            <Text type="secondary">
              Positions are saved locally in your browser for each case.
            </Text>
          </div>
        </Card>

        <Card>
          {!caseId ? (
            <Text type="secondary">Select a case to open the board.</Text>
          ) : loading || ctLoading ? (
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          ) : (
            <div
              ref={boardRef}
              className="relative w-full"
              style={{ height: 650 }}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {lines.map((l) => (
                  <line key={l.id} x1={l.ax} y1={l.ay} x2={l.bx} y2={l.by} stroke="red" strokeWidth="2" />
                ))}
              </svg>

              {cards.map((c) => (
                <div key={c.key} className="absolute" style={{ left: c.x || 0, top: c.y || 0, width: 240 }}>
                  <Card size="small" title={c.title}>
                    <div className="cursor-move select-none" onMouseDown={(e) => handleMouseDown(e, c)}>
                      <Text type="secondary">{c.model} #{c.objectId}</Text>
                      <div className="mt-2">{c.raw?.description || "-"}</div>
                    </div>
                  </Card>
                </div>
              ))}

              {links.length ? (
                <div className="absolute bottom-3 left-3">
                  <Card size="small">
                    <Text strong>Links</Text>
                    <div className="mt-2 flex flex-col gap-2">
                      {links.map((l) => (
                        <div key={l.id} className="flex items-center gap-2">
                          <Text type="secondary">
                            {l.from_content_type_name}:{l.from_object_id} → {l.to_content_type_name}:{l.to_object_id}
                          </Text>
                          <Button size="small" onClick={() => onDeleteLink(l.id)}>
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <Modal
        title="Create Link"
        open={isLinkOpen}
        onCancel={() => setIsLinkOpen(false)}
        onOk={onCreateLink}
        okText="Create"
      >
        <div className="flex flex-col gap-3">
          <Select value={linkFrom} onChange={setLinkFrom} options={cardOptions} placeholder="From" allowClear />
          <Select value={linkTo} onChange={setLinkTo} options={cardOptions} placeholder="To" allowClear />
        </div>
      </Modal>
    </div>
  );
}