import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { PageHeader } from "../components/PageHeader";
import { listCases } from "../api/cases";
import {
  listDetectiveReports,
  sergeantReviewDetectiveReport,
} from "../api/detectiveBoard";

const { Text } = Typography;

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export function DetectiveReviewsPage() {
  const [caseOptions, setCaseOptions] = useState([]);
  const [caseId, setCaseId] = useState(null);
  const [casesLoading, setCasesLoading] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [decision, setDecision] = useState("approve");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function fetchCases() {
    setCasesLoading(true);
    try {
      const data = await listCases({ page: 1, pageSize: 100 });
      const list = Array.isArray(data) ? data : data.results || [];
      const options = list.map((c) => ({
        value: c.id,
        label: `${c.case_number || c.id} — ${c.title || "Untitled"}`,
      }));
      setCaseOptions(options);
      if (!caseId && options.length > 0) {
        setCaseId(options[0].value);
      }
    } catch (err) {
      message.error(err.message || "Failed to load cases.");
      setCaseOptions([]);
    } finally {
      setCasesLoading(false);
    }
  }

  async function fetchReports() {
    if (!caseId) {
      setRows([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await listDetectiveReports(caseId);
      const list = Array.isArray(data) ? data : data.results || [];
      setRows(list);
    } catch (err) {
      message.error(err.message || "Failed to load detective reports.");
      setRows([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function submitReview() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await sergeantReviewDetectiveReport(selected.case, selected.id, {
        action: decision === "approve" ? "approve" : "disagree",
        message: note || "",
      });
      message.success("Review submitted.");
      setIsModalOpen(false);
      setSelected(null);
      setNote("");
      setDecision("approve");
      fetchReports();
    } catch (err) {
      message.error(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = useMemo(() => {
    return [
      {
        title: "Case",
        dataIndex: "case_number",
        key: "case_number",
        width: 160,
      },
      {
        title: "Submitted By",
        dataIndex: "detective_name",
        key: "detective_name",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 180,
        render: (v) => <Tag>{v}</Tag>,
      },
      {
        title: "Submitted",
        dataIndex: "submitted_at",
        key: "submitted_at",
        width: 180,
        render: (v) => formatDate(v),
      },
      {
        title: "",
        key: "actions",
        width: 180,
        render: (_, r) => (
          <Space>
            <Button
              type="primary"
              onClick={() => {
                setSelected(r);
                setIsModalOpen(true);
                setDecision("approve");
                setNote("");
              }}
            >
              Review
            </Button>
          </Space>
        ),
      },
    ];
  }, []);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Detective Reports"
            subtitle="Sergeant: review detective reports and approve or record disagreement."
            actions={
              <Space>
                <Button onClick={fetchReports} disabled={!caseId}>
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
              allowClear
              className="min-w-96"
            />
          </div>
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
              pagination={false}
            />
          )}
        </Card>

        <Modal
          title={
            selected
              ? `Report ${selected.case_number || selected.case}`
              : "Review Report"
          }
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={submitReview}
          confirmLoading={submitting}
        >
          {selected ? (
            <div className="flex flex-col gap-3">
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Case">
                  {selected.case_number || selected.case}
                </Descriptions.Item>
                <Descriptions.Item label="Detective">
                  {selected.detective_name || selected.detective}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {selected.status}
                </Descriptions.Item>
                <Descriptions.Item label="Submitted">
                  {formatDate(selected.submitted_at)}
                </Descriptions.Item>
              </Descriptions>

              <div className="flex items-center gap-2 mt-2">
                <Text strong>Decision:</Text>
                <Button
                  type={decision === "approve" ? "primary" : "default"}
                  onClick={() => setDecision("approve")}
                >
                  Approve
                </Button>
                <Button
                  type={decision === "disagree" ? "primary" : "default"}
                  onClick={() => setDecision("disagree")}
                >
                  Disagree
                </Button>
              </div>

              <Input.TextArea
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Message (optional)"
              />
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
}
