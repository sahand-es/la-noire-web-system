import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PageHeader } from "../components/PageHeader";
import { listPendingBiologicalEvidence, coronerApproveEvidence } from "../api/evidenceReview";

const { Text } = Typography;

function normalizeResponse(data) {
  if (Array.isArray(data)) return { rows: data, total: data.length };
  if (data && Array.isArray(data.results)) return { rows: data.results, total: data.count ?? data.results.length };
  return { rows: [], total: 0 };
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export function EvidenceReviewPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [decision, setDecision] = useState("approve");
  const [resultMessage, setResultMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchData(nextPage = page, nextPageSize = pageSize) {
    setIsLoading(true);
    try {
      const data = await listPendingBiologicalEvidence({ page: nextPage, pageSize: nextPageSize });
      const normalized = normalizeResponse(data);
      setRows(normalized.rows);
      setTotal(normalized.total);
    } catch (err) {
      message.error(err.message || "Failed to load biological evidence approvals.");
      setRows([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitDecision() {
    if (!selected) return;

    setIsSubmitting(true);
    try {
      await coronerApproveEvidence(selected.id, {
        action: decision, // "approve" | "reject"
        follow_up_result: resultMessage.trim(),
      });

      message.success("Decision submitted.");
      setIsModalOpen(false);
      setSelected(null);
      setDecision("approve");
      setResultMessage("");
      fetchData(page, pageSize);
    } catch (err) {
      message.error(err.message || "Failed to submit decision.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns = useMemo(() => {
    return [
      { title: "Case", dataIndex: "case_number", key: "case_number", width: 160, render: (v) => v || "-" },
      { title: "Title", dataIndex: "title", key: "title", render: (v) => v || "-" },
      { title: "Status", dataIndex: "status", key: "status", width: 140, render: (v) => <Tag>{v || "-"}</Tag> },
      { title: "Recorded", dataIndex: "created_at", key: "created_at", width: 190, render: (v) => formatDate(v) },
      {
        title: "",
        key: "actions",
        width: 140,
        render: (_, r) => (
          <Button
            type="primary"
            onClick={() => {
              setSelected(r);
              setIsModalOpen(true);
              setDecision("approve");
              setResultMessage("");
            }}
          >
            Review
          </Button>
        ),
      },
    ];
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Evidence Review"
            subtitle="Coroner: approve or reject biological and medical evidence."
            actions={
              <Space>
                <Button onClick={() => fetchData(page, pageSize)} disabled={isLoading}>
                  Refresh
                </Button>
              </Space>
            }
          />
        </Card>

        <Card>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          ) : (
            <Table
              rowKey={(r) => r.id}
              columns={columns}
              dataSource={rows}
              pagination={{
                current: page,
                pageSize,
                total,
                showSizeChanger: true,
                onChange: (nextPage, nextPageSize) => {
                  setPage(nextPage);
                  setPageSize(nextPageSize);
                  fetchData(nextPage, nextPageSize);
                },
              }}
            />
          )}
        </Card>

        <Modal
          title="Review Biological Evidence"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={submitDecision}
          okText="Submit"
          confirmLoading={isSubmitting}
        >
          {selected ? (
            <div className="flex flex-col gap-3">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Case">{selected.case_number || selected.case || "-"}</Descriptions.Item>
                <Descriptions.Item label="Title">{selected.title || "-"}</Descriptions.Item>
                <Descriptions.Item label="Description">{selected.description || "-"}</Descriptions.Item>
                <Descriptions.Item label="Status">{selected.status || "-"}</Descriptions.Item>
                <Descriptions.Item label="Recorded">{formatDate(selected.created_at)}</Descriptions.Item>
              </Descriptions>

              <div className="flex items-center gap-2 flex-wrap mt-2">
                <Text strong>Decision:</Text>
                <Button
                  type={decision === "approve" ? "primary" : "default"}
                  onClick={() => setDecision("approve")}
                >
                  Approve
                </Button>
                <Button
                  type={decision === "reject" ? "primary" : "default"}
                  onClick={() => setDecision("reject")}
                >
                  Reject
                </Button>
              </div>

              <Input.TextArea
                value={resultMessage}
                onChange={(e) => setResultMessage(e.target.value)}
                placeholder="Follow-up result / notes (optional)"
                rows={4}
              />
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
}