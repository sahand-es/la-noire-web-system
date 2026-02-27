import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
  message,
  Input,
  Tag,
} from "antd";
import { PageHeader } from "../components/PageHeader";
import { deskLightTokens } from "../theme";
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
import { createDetectiveReport } from "../api/detectiveBoard";
import { listNotifications } from "../api/notifications";
import {
  UserOutlined,
  ExperimentOutlined,
  CarOutlined,
  FileTextOutlined,
  InboxOutlined,
  SearchOutlined,
  LinkOutlined,
  CloseOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const EVIDENCE_ICONS = {
  witnesstestimony: UserOutlined,
  biologicalevidence: ExperimentOutlined,
  vehicleevidence: CarOutlined,
  documentevidence: FileTextOutlined,
  otherevidence: InboxOutlined,
};

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

function getEvidenceColor(modelName) {
  const colors = {
    witnesstestimony: deskLightTokens.colorPrimary,
    biologicalevidence: deskLightTokens.colorSuccess,
    vehicleevidence: deskLightTokens.colorInfo,
    documentevidence: deskLightTokens.colorWarning,
    otherevidence: deskLightTokens.colorText,
  };
  return colors[modelName] || "default";
}

function getEvidenceIcon(modelName) {
  const Icon = EVIDENCE_ICONS[modelName] || SearchOutlined;
  return <Icon />;
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

  const [selectedSuspects, setSelectedSuspects] = useState([]); // array of card keys
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

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
      const [wRes, bRes, vRes, dRes, oRes, linkRes] = await Promise.all([
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
        if (!ctId) {
          console.warn(`Content type ID not found for model: ${modelName}`);
          return [];
        }
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
        ...buildCards(vRes, "vehicleevidence"),
        ...buildCards(dRes, "documentevidence"),
        ...buildCards(oRes, "otherevidence"),
      ];

      setCards(all);
      setLinks(normalizeList(linkRes));
      // reset selected suspects when board refreshes
      setSelectedSuspects([]);
      // check for new notifications for this case and notify detective
      try {
        const notifs = await listNotifications({ pageSize: 50 });
        const rows = Array.isArray(notifs) ? notifs : notifs.results || [];
        rows.forEach((n) => {
          if (n.case && n.case.id === nextCaseId && !n.read_at) {
            message.info(n.message || "New document added to case.");
          }
        });
      } catch (e) {
        // ignore notification errors
      }
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
    if (caseId && !ctLoading && contentTypes.length > 0) {
      fetchBoard(caseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, ctLoading, contentTypes]);

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

    const x = clamp(
      e.clientX - rect.left - dragging.offsetX,
      0,
      rect.width - 260,
    );
    const y = clamp(
      e.clientY - rect.top - dragging.offsetY,
      0,
      rect.height - 140,
    );

    setCards((prev) =>
      prev.map((c) => (c.key === dragging.key ? { ...c, x, y } : c)),
    );
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
    if (linkFrom === linkTo)
      return message.error("Cannot link an item to itself.");

    const a = cards.find((c) => c.key === linkFrom);
    const b = cards.find((c) => c.key === linkTo);
    if (!a || !b) return message.error("Invalid selection.");

    if (!a.ctId || !b.ctId) {
      return message.error(
        "Evidence type information is missing. Please refresh the page and try again.",
      );
    }

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
            subtitle="Drag evidence cards and connect related items with links."
            actions={
              <Space>
                <Button
                  type="primary"
                  onClick={() => setIsReportOpen(true)}
                  disabled={!caseId || selectedSuspects.length === 0}
                >
                  Report suspects
                </Button>
                <Button
                  onClick={() => setIsLinkOpen(true)}
                  disabled={!caseId || cards.length < 2}
                >
                  Add link
                </Button>
                <Button
                  onClick={() => fetchBoard(caseId)}
                  disabled={!caseId || loading}
                >
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
                String(option?.label || "")
                  .toLowerCase()
                  .includes(input.toLowerCase())
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
            <div className="flex flex-col gap-4">
              <div
                className="p-4 rounded-xl"
                style={{
                  background: deskLightTokens.colorPrimary,
                  boxShadow: "inset 0 0 0 3px rgba(0,0,0,0.1), 0 4px 12px rgba(44, 37, 32, 0.2)",
                }}
              >
                <div
                  ref={boardRef}
                  className="relative w-full rounded-lg overflow-hidden"
                  style={{
                    height: 650,
                    background: `
                      linear-gradient(90deg, ${deskLightTokens.colorBorder}22 1px, transparent 1px),
                      linear-gradient(${deskLightTokens.colorBorder}22 1px, transparent 1px),
                      linear-gradient(135deg, ${deskLightTokens.colorBgLayout} 0%, ${deskLightTokens.colorBgElevated} 50%, ${deskLightTokens.colorBorder} 100%)
                    `,
                    backgroundSize: "40px 40px, 40px 40px, 100% 100%",
                    boxShadow: "inset 0 2px 8px rgba(0,0,0,0.06)",
                    border: `2px solid ${deskLightTokens.colorBorder}`,
                  }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {lines.map((l) => (
                  <g key={l.id}>
                    <line
                      x1={l.ax}
                      y1={l.ay}
                      x2={l.bx}
                      y2={l.by}
                      stroke={deskLightTokens.colorPrimary}
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.6"
                    />
                    <line
                      x1={l.ax}
                      y1={l.ay}
                      x2={l.bx}
                      y2={l.by}
                      stroke={deskLightTokens.colorPrimary}
                      strokeWidth="6"
                      opacity="0.15"
                    />
                  </g>
                ))}
              </svg>

              {cards.map((c) => (
                <div
                  key={c.key}
                  className="absolute cursor-move select-none"
                  style={{ left: c.x || 0, top: c.y || 0, width: 240 }}
                  onMouseDown={(e) => handleMouseDown(e, c)}
                >
                  <Card
                    size="small"
                    title={
                      <div className="flex items-center gap-2">
                        <span>{getEvidenceIcon(c.model)}</span>
                        <span className="flex-1 truncate">{c.title}</span>
                      </div>
                    }
                    extra={
                      <div className="flex items-center gap-2">
                        <Tag color={getEvidenceColor(c.model)}>
                          #{c.objectId}
                        </Tag>
                        <Button
                          size="small"
                          danger={selectedSuspects.includes(c.key)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => {
                            setSelectedSuspects((prev) =>
                              prev.includes(c.key)
                                ? prev.filter((k) => k !== c.key)
                                : [...prev, c.key],
                            );
                          }}
                        >
                          {selectedSuspects.includes(c.key)
                            ? "Suspect"
                            : "Mark"}
                        </Button>
                      </div>
                    }
                  >
                    <div className="mb-2">
                      <Tag color={getEvidenceColor(c.model)}>
                        {c.model.replace(/evidence$/, "")}
                      </Tag>
                    </div>
                    <div className="text-sm">{c.raw?.description || "-"}</div>
                  </Card>
                </div>
              ))}

                </div>
              </div>

              <div
                className="rounded-lg border px-4 py-3"
                style={{
                  borderColor: deskLightTokens.colorBorder,
                  backgroundColor: deskLightTokens.colorBgLayout,
                }}
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <span className="flex items-center gap-2 text-sm font-medium" style={{ color: deskLightTokens.colorText }}>
                    <LinkOutlined />
                    Evidence Links
                  </span>
                  {links.length > 0 && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {links.length} connection{links.length !== 1 ? "s" : ""}
                    </Text>
                  )}
                </div>
                {links.length ? (
                  <div className="flex flex-wrap gap-2">
                    {links.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded border"
                        style={{
                          borderColor: deskLightTokens.colorBorder,
                          backgroundColor: deskLightTokens.colorBgContainer,
                        }}
                      >
                        <Tag color={getEvidenceColor(l.from_content_type_name)} className="m-0">
                          #{l.from_object_id}
                        </Tag>
                        <span style={{ color: deskLightTokens.colorTextTertiary, fontSize: 12 }}>→</span>
                        <Tag color={getEvidenceColor(l.to_content_type_name)} className="m-0">
                          #{l.to_object_id}
                        </Tag>
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<CloseOutlined />}
                          onClick={() => onDeleteLink(l.id)}
                          className="shrink-0"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    No links yet. Use Add link to connect evidence.
                  </Text>
                )}
              </div>
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
          <Select
            value={linkFrom}
            onChange={setLinkFrom}
            options={cardOptions}
            placeholder="From"
            allowClear
          />
          <Select
            value={linkTo}
            onChange={setLinkTo}
            options={cardOptions}
            placeholder="To"
            allowClear
          />
        </div>
      </Modal>

      <Modal
        title="Report Suspects to Sergeant"
        open={isReportOpen}
        onCancel={() => setIsReportOpen(false)}
        onOk={async () => {
          if (!caseId) return;
          setReportSubmitting(true);
          try {
            const suspects = selectedSuspects
              .map((k) => {
                const c = cards.find((x) => x.key === k);
                return c
                  ? { content_type_id: c.ctId, object_id: c.objectId }
                  : null;
              })
              .filter(Boolean);

            const payload = { suspects, message: reportMessage || "" };

            await createDetectiveReport(caseId, payload);
            message.success(
              "Report submitted to sergeant. Waiting for review.",
            );
            setIsReportOpen(false);
            setReportMessage("");
            setSelectedSuspects([]);
            fetchBoard(caseId);
          } catch (err) {
            message.error(err.message || "Failed to submit report.");
          } finally {
            setReportSubmitting(false);
          }
        }}
        okText="Submit"
        confirmLoading={reportSubmitting}
      >
        <div className="flex flex-col gap-3">
          <Text>
            Select suspects and add reasoning below. Sergeant will review and
            respond.
          </Text>
          <div className="flex flex-wrap gap-2">
            {selectedSuspects.length ? (
              selectedSuspects.map((k) => {
                const card = cards.find((c) => c.key === k);
                return (
                  <Tag key={k} color="error">
                    {card ? card.title : k}
                  </Tag>
                );
              })
            ) : (
              <Text type="secondary">No suspects selected.</Text>
            )}
          </div>
          <Input.TextArea
            rows={4}
            value={reportMessage}
            onChange={(e) => setReportMessage(e.target.value)}
            placeholder="Reasoning / notes (optional)"
          />
        </div>
      </Modal>
    </div>
  );
}
