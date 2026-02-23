import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Form,
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
import { listTrialCases, getTrial, recordVerdict } from "../api/trials";

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

export function TrialsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selectedCase, setSelectedCase] = useState(null);
  const [trialLoading, setTrialLoading] = useState(false);
  const [trial, setTrial] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form] = Form.useForm();

  async function fetchCases(nextPage = page, nextPageSize = pageSize) {
    setLoading(true);
    try {
      const data = await listTrialCases({ page: nextPage, pageSize: nextPageSize });
      const normalized = normalizeResponse(data);
      setRows(normalized.rows);
      setTotal(normalized.total);
    } catch (err) {
      message.error(err.message || "Failed to load cases.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCases(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openTrial(caseRow) {
    setSelectedCase(caseRow);
    setIsModalOpen(true);
    setTrial(null);
    form.resetFields();
    setTrialLoading(true);
    try {
      const data = await getTrial(caseRow.id);
      setTrial(data);
      if (data?.verdict) {
        form.setFieldsValue({
          verdict: data.verdict,
          punishment: data.punishment,
        });
      }
    } catch (err) {
      message.error(err.message || "Failed to load trial.");
      setTrial(null);
    } finally {
      setTrialLoading(false);
    }
  }

  async function onSubmit(values) {
    if (!selectedCase) return;
    setIsSubmitting(true);
    try {
      await recordVerdict(selectedCase.id, values);
      message.success("Verdict recorded.");
      setIsModalOpen(false);
      setSelectedCase(null);
      fetchCases(page, pageSize);
    } catch (err) {
      message.error(err.message || "Failed to record verdict.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const columns = useMemo(() => {
    return [
      {
        title: "Case #",
        dataIndex: "case_number",
        key: "case_number",
        width: 160,
        render: (v) => v || "-",
      },
      { title: "Title", dataIndex: "title", key: "title", render: (v) => v || "-" },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 180,
        render: (v) => <Tag>{v || "-"}</Tag>,
      },
      {
        title: "Created",
        dataIndex: "created_at",
        key: "created_at",
        width: 200,
        render: (v) => formatDate(v),
      },
      {
        title: "",
        key: "actions",
        width: 140,
        render: (_, r) => (
          <Button type="primary" onClick={() => openTrial(r)}>
            Open
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
            title="Trials"
            subtitle="Judge: view cases and record verdicts."
            actions={
              <Space>
                <Button onClick={() => fetchCases(page, pageSize)} disabled={loading}>
                  Refresh
                </Button>
              </Space>
            }
          />
        </Card>

        <Card>
          {loading ? (
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
                  fetchCases(nextPage, nextPageSize);
                },
              }}
            />
          )}
        </Card>

        <Modal
          title="Trial"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={() => form.submit()}
          okText="Record verdict"
          confirmLoading={isSubmitting}
        >
          {!selectedCase ? null : (
            <div className="flex flex-col gap-3">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Case Number">
                  {selectedCase.case_number || selectedCase.id}
                </Descriptions.Item>
                <Descriptions.Item label="Title">{selectedCase.title || "-"}</Descriptions.Item>
                <Descriptions.Item label="Status">{selectedCase.status || "-"}</Descriptions.Item>
              </Descriptions>

              {trialLoading ? (
                <div className="flex justify-center py-6">
                  <Spin />
                </div>
              ) : trial ? (
                <Card size="small">
                  <Text type="secondary">
                    Trial data loaded. Fill verdict and punishment.
                  </Text>
                </Card>
              ) : (
                <Card size="small">
                  <Text type="secondary">No trial details found (still can record verdict).</Text>
                </Card>
              )}

              <Form layout="vertical" form={form} onFinish={onSubmit}>
                <Form.Item
                  label="Verdict"
                  name="verdict"
                  rules={[{ required: true, message: "Verdict is required." }]}
                >
                  <Select
                    options={[
                      { label: "Guilty", value: "GUILTY" },
                      { label: "Innocent", value: "INNOCENT" },
                    ]}
                  />
                </Form.Item>

                <Form.Item
                  label="Punishment"
                  name="punishment"
                  rules={[{ required: true, message: "Punishment is required." }]}
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
              </Form>
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
}