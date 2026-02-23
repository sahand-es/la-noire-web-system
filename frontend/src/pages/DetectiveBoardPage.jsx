import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
  message,
} from "antd";
import html2canvas from "html2canvas";
import { PageHeader } from "../components/PageHeader";
import { listCases } from "../api/cases";
import {
  listBoardNodes,
  createBoardNode,
  updateBoardNode,
  deleteBoardNode,
  listBoardEdges,
  createBoardEdge,
  deleteBoardEdge,
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

export function DetectiveBoardPage() {
  const boardRef = useRef(null);

  const [casesLoading, setCasesLoading] = useState(true);
  const [caseOptions, setCaseOptions] = useState([]);
  const [caseId, setCaseId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm] = Form.useForm();

  const [isLinkOpen, setIsLinkOpen] = useState(false);
  const [linkFrom, setLinkFrom] = useState(null);
  const [linkTo, setLinkTo] = useState(null);

  const [dragging, setDragging] = useState(null); // { id, offsetX, offsetY }

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

  async function fetchBoard(nextCaseId = caseId) {
    if (!nextCaseId) return;
    setLoading(true);
    try {
      const [nRes, eRes] = await Promise.all([
        listBoardNodes(nextCaseId),
        listBoardEdges(nextCaseId),
      ]);
      setNodes(normalizeList(nRes));
      setEdges(normalizeList(eRes));
    } catch (err) {
      message.error(err.message || "Failed to load board.");
      setNodes([]);
      setEdges([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    if (caseId) fetchBoard(caseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const nodeOptions = useMemo(
    () =>
      nodes.map((n) => ({
        value: n.id,
        label: n.title ? `${n.title} (#${n.id})` : `Node #${n.id}`,
      })),
    [nodes],
  );

  function getNodeById(id) {
    return nodes.find((n) => n.id === id);
  }

  function handleMouseDown(e, node) {
    const rect = e.currentTarget.getBoundingClientRect();
    setDragging({
      id: node.id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
  }

  async function persistNodePosition(nodeId, x, y) {
    try {
      await updateBoardNode(nodeId, { x, y });
    } catch (err) {
      message.error(err.message || "Failed to save position.");
    }
  }

  function handleMouseMove(e) {
    if (!dragging) return;
    const container = boardRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const x = clamp(e.clientX - rect.left - dragging.offsetX, 0, rect.width - 260);
    const y = clamp(e.clientY - rect.top - dragging.offsetY, 0, rect.height - 140);

    setNodes((prev) =>
      prev.map((n) => (n.id === dragging.id ? { ...n, x, y } : n)),
    );
  }

  function handleMouseUp() {
    if (!dragging) return;
    const moved = getNodeById(dragging.id);
    setDragging(null);
    if (moved) persistNodePosition(moved.id, moved.x, moved.y);
  }

  async function onAdd(values) {
    if (!caseId) return;
    try {
      await createBoardNode(caseId, {
        title: values.title,
        content: values.content,
        x: 40,
        y: 40,
      });
      message.success("Note added.");
      setIsAddOpen(false);
      addForm.resetFields();
      fetchBoard(caseId);
    } catch (err) {
      message.error(err.message || "Failed to add note.");
    }
  }

  async function onDeleteNode(nodeId) {
    try {
      await deleteBoardNode(nodeId);
      message.success("Deleted.");
      fetchBoard(caseId);
    } catch (err) {
      message.error(err.message || "Failed to delete node.");
    }
  }

  async function onCreateLink() {
    if (!caseId || !linkFrom || !linkTo) {
      message.error("Select both nodes.");
      return;
    }
    if (linkFrom === linkTo) {
      message.error("Cannot link a node to itself.");
      return;
    }
    try {
      await createBoardEdge(caseId, { from_node: linkFrom, to_node: linkTo });
      message.success("Link created.");
      setIsLinkOpen(false);
      setLinkFrom(null);
      setLinkTo(null);
      fetchBoard(caseId);
    } catch (err) {
      message.error(err.message || "Failed to create link.");
    }
  }

  async function onDeleteEdge(edgeId) {
    try {
      await deleteBoardEdge(edgeId);
      message.success("Link deleted.");
      fetchBoard(caseId);
    } catch (err) {
      message.error(err.message || "Failed to delete link.");
    }
  }

  async function exportImage() {
    if (!boardRef.current) return;
    try {
      const canvas = await html2canvas(boardRef.current);
      const link = document.createElement("a");
      link.download = `detective-board-case-${caseId}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      message.error("Failed to export image.");
    }
  }

  // Simple SVG overlay lines
  const lines = useMemo(() => {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return edges
      .map((e) => {
        const a = map.get(e.from_node || e.from_node_id);
        const b = map.get(e.to_node || e.to_node_id);
        if (!a || !b) return null;

        const ax = (a.x || 0) + 120;
        const ay = (a.y || 0) + 50;
        const bx = (b.x || 0) + 120;
        const by = (b.y || 0) + 50;

        return { id: e.id, ax, ay, bx, by };
      })
      .filter(Boolean);
  }, [nodes, edges]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Detective Board"
            subtitle="Drag notes, connect related items, and export the board."
            actions={
              <Space>
                <Button onClick={exportImage} disabled={!caseId}>
                  Export
                </Button>
                <Button onClick={() => setIsLinkOpen(true)} disabled={!caseId || nodes.length < 2}>
                  Add link
                </Button>
                <Button type="primary" onClick={() => setIsAddOpen(true)} disabled={!caseId}>
                  Add note
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
        </Card>

        <Card>
          {!caseId ? (
            <Text type="secondary">Select a case to open the board.</Text>
          ) : loading ? (
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
                  <line
                    key={l.id}
                    x1={l.ax}
                    y1={l.ay}
                    x2={l.bx}
                    y2={l.by}
                    stroke="red"
                    strokeWidth="2"
                  />
                ))}
              </svg>

              {nodes.map((n) => (
                <div
                  key={n.id}
                  className="absolute"
                  style={{ left: n.x || 0, top: n.y || 0, width: 240 }}
                >
                  <Card
                    size="small"
                    title={n.title || `Node #${n.id}`}
                    extra={
                      <Button size="small" onClick={() => onDeleteNode(n.id)}>
                        Delete
                      </Button>
                    }
                  >
                    <div
                      className="cursor-move select-none"
                      onMouseDown={(e) => handleMouseDown(e, n)}
                    >
                      <Text>{n.content || "-"}</Text>
                    </div>
                  </Card>
                </div>
              ))}

              {edges.length ? (
                <div className="absolute bottom-3 left-3">
                  <Card size="small">
                    <Text strong>Links</Text>
                    <div className="mt-2 flex flex-col gap-2">
                      {edges.map((e) => (
                        <div key={e.id} className="flex items-center gap-2">
                          <Text type="secondary">
                            {(getNodeById(e.from_node || e.from_node_id)?.title || "From")} →{" "}
                            {(getNodeById(e.to_node || e.to_node_id)?.title || "To")}
                          </Text>
                          <Button size="small" onClick={() => onDeleteEdge(e.id)}>
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
        title="Add Note"
        open={isAddOpen}
        onCancel={() => setIsAddOpen(false)}
        onOk={() => addForm.submit()}
        okText="Add"
      >
        <Form layout="vertical" form={addForm} onFinish={onAdd}>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="content" label="Content" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

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
            options={nodeOptions}
            placeholder="From node"
            allowClear
          />
          <Select
            value={linkTo}
            onChange={setLinkTo}
            options={nodeOptions}
            placeholder="To node"
            allowClear
          />
        </div>
      </Modal>
    </div>
  );
}