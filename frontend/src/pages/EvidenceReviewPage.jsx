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
import { listCoronerQueue, submitCoronerDecision } from "../api/coroner";

const { Text } = Typography;

function normalizeResponse(data) {
  if (Array.isArray(data)) return { rows: data, total: data.length };
  if (data && Array.isArray(data.results)) {
    return { rows: data.results, total: data.count ?? data.results.length };
  }
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
  const [followUpResult, setFollowUpResult] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  async function fetchData(nextPage = page, nextPageSize = pageSize) {
    setIsLoading(true);
    try {
      const data = await listCoronerQueue({
        page: nextPage,
        pageSize: nextPageSize,
      });
      const normalized = normalizeResponse(data);
      setRows(normalized.rows);
      setTotal(normalized.total);
    } catch (err) {
      messageApi.error(err.message || "Failed to load coroner queue.");
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

  async function onSubmit() {
    if (!selected) return;

    setIsSubmitting(true);
    try {
      await submitCoronerDecision(
        { case: selected.case, id: selected.id },
        {
          approved: decision === "approve",
          follow_up_result: followUpResult.trim(),
        },
      );
      messageApi.success("Decision submitted.");
      setIsModalOpen(false);
      setSelected(null);
      setDecision("approve");
      setFollowUpResult("");
      fetchData(page, pageSize);
    } catch (err) {
      messageApi.error(err.message || "Failed to submit decision.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns = useMemo(() => {
    return [
      {
        title: "Case",
        key: "case",
        width: 180,
        render: (_, r) => r.case_number || r.case || "-",
      },
      {
        title: "Title",
        dataIndex: "title",
        key: "title",
        render: (v) => v || "-",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 140,
        render: (v) => <Tag>{v || "-"}</Tag>,
      },
      {
        title: "Recorded",
        dataIndex: "created_at",
        key: "created_at",
        width: 200,
        render: (v) => formatDate(v),
      },
      {
        title: "",
        key: "actions",
        width: 120,
        render: (_, r) => (
          <Button
            type="primary"
            onClick={() => {
              setSelected(r);
              setIsModalOpen(true);
              setDecision("approve");
              setFollowUpResult(r.follow_up_result || "");
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
      {contextHolder}
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Evidence Review"
            subtitle="Coroner: review biological evidence and submit a decision."
            actions={
              <Space>
                <Button
                  onClick={() => fetchData(page, pageSize)}
                  disabled={isLoading}
                >
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
          ) : rows.length ? (
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
          ) : (
            <Text type="secondary">No evidence pending review.</Text>
          )}
        </Card>

        <Modal
          title="Review Biological Evidence"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={onSubmit}
          okText="Submit"
          confirmLoading={isSubmitting}
        >
          {selected ? (
            <div className="flex flex-col gap-4">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Case">
                  {selected.case_number || selected.case || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Title">
                  {selected.title || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {selected.description || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {selected.status || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Recorded">
                  {formatDate(selected.created_at)}
                </Descriptions.Item>
              </Descriptions>

              <div className="flex items-center gap-2 flex-wrap">
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
                value={followUpResult}
                onChange={(e) => setFollowUpResult(e.target.value)}
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
