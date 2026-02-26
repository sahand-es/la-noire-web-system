import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Collapse,
  DatePicker,
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
import dayjs from "dayjs";
import { PageHeader } from "../components/PageHeader";
import {
  listTrialCases,
  listCasesWithoutTrial,
  listJudges,
  createTrial,
  getTrial,
  recordVerdict,
} from "../api/trials";

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
  const [user, setUser] = useState(null);
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

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createCases, setCreateCases] = useState([]);
  const [judges, setJudges] = useState([]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [form] = Form.useForm();
  const [createForm] = Form.useForm();

  const roleNames = useMemo(
    () => (user?.roles || []).map((r) => r?.name).filter(Boolean),
    [user],
  );
  const canScheduleTrial = useMemo(
    () =>
      roleNames.some((r) =>
        ["Sergeant", "Captain", "Police Chief", "System Administrator"].includes(r),
      ),
    [roleNames],
  );

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
    const raw = localStorage.getItem("user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch (e) {
        /* ignore */
      }
    }
    fetchCases(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openCreateModal() {
    setIsCreateModalOpen(true);
    createForm.resetFields();
    setCreateLoading(true);
    try {
      const [casesRes, judgesRes] = await Promise.all([
        listCasesWithoutTrial({ pageSize: 100 }),
        listJudges(),
      ]);
      const casesNorm = normalizeResponse(casesRes);
      setCreateCases(casesNorm.rows || []);
      const judgesData = Array.isArray(judgesRes) ? judgesRes : judgesRes?.data || [];
      setJudges(judgesData);
    } catch (err) {
      message.error(err.message || "Failed to load data.");
      setCreateCases([]);
      setJudges([]);
    } finally {
      setCreateLoading(false);
    }
  }

  async function onSubmitCreate(values) {
    const caseId = values.case_id;
    if (!caseId) {
      message.error("Please select a case.");
      return;
    }
    setCreateSubmitting(true);
    try {
      await createTrial(caseId, {
        judge_id: values.judge_id,
        scheduled_date: values.scheduled_date
          ? dayjs(values.scheduled_date).toISOString()
          : new Date().toISOString(),
      });
      message.success("Trial scheduled.");
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchCases(page, pageSize);
    } catch (err) {
      message.error(err.message || "Failed to schedule trial.");
    } finally {
      setCreateSubmitting(false);
    }
  }

  async function openTrial(caseRow) {
    setSelectedCase(caseRow);
    setIsModalOpen(true);
    setTrial(null);
    form.resetFields();
    setTrialLoading(true);
    try {
      const data = await getTrial(caseRow.id);
      setTrial(data);
      const t = data?.trial || data;
      if (t?.verdict) {
        form.setFieldsValue({
          verdict: t.verdict,
          punishment: t.punishment,
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
                {canScheduleTrial ? (
                  <Button type="primary" onClick={openCreateModal}>
                    Schedule Trial
                  </Button>
                ) : null}
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
          width={700}
        >
          {!selectedCase ? null : (
            <div className="flex flex-col gap-4">
              {trialLoading ? (
                <div className="flex justify-center py-6">
                  <Spin />
                </div>
              ) : trial ? (
                <Collapse
                  defaultActiveKey={["case", "evidence", "individuals"]}
                  items={[
                    {
                      key: "case",
                      label: "Case Details",
                      children: (
                        <Descriptions bordered column={1} size="small">
                          <Descriptions.Item label="Case Number">
                            {trial.case_number || selectedCase.case_number || "-"}
                          </Descriptions.Item>
                          <Descriptions.Item label="Title">{trial.title || selectedCase.title || "-"}</Descriptions.Item>
                          <Descriptions.Item label="Description">{trial.description || "-"}</Descriptions.Item>
                          <Descriptions.Item label="Incident Date">{formatDate(trial.incident_date)}</Descriptions.Item>
                          <Descriptions.Item label="Incident Location">{trial.incident_location || "-"}</Descriptions.Item>
                          <Descriptions.Item label="Status">
                            <Tag>{trial.status || selectedCase.status || "-"}</Tag>
                          </Descriptions.Item>
                          <Descriptions.Item label="Priority">{trial.priority || "-"}</Descriptions.Item>
                          {trial.trial ? (
                            <>
                              <Descriptions.Item label="Trial Status">{trial.trial.status || "-"}</Descriptions.Item>
                              <Descriptions.Item label="Scheduled Date">{formatDate(trial.trial.scheduled_date)}</Descriptions.Item>
                              <Descriptions.Item label="Judge">{trial.trial.judge_name || "-"}</Descriptions.Item>
                            </>
                          ) : null}
                        </Descriptions>
                      ),
                    },
                    {
                      key: "evidence",
                      label: `Evidence (${(trial.evidence || []).length})`,
                      children: (trial.evidence || []).length > 0 ? (
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                          {(trial.evidence || []).map((e, i) => (
                            <Card key={e.id || i} size="small">
                              <Text strong className="capitalize">{String(e.type || "").replace(/_/g, " ")}</Text>
                              {e.title ? <div className="mt-1">{e.title}</div> : null}
                              {e.description ? <Text type="secondary" className="text-xs block mt-1">{e.description}</Text> : null}
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Text type="secondary">No evidence recorded.</Text>
                      ),
                    },
                    {
                      key: "individuals",
                      label: `Involved Individuals (${(trial.involved_individuals || []).length})`,
                      children: (trial.involved_individuals || []).length > 0 ? (
                        <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                          {(trial.involved_individuals || []).map((ind, i) => (
                            <Card key={ind.id || i} size="small">
                              <Text strong>{ind.full_name || "-"}</Text>
                              <div className="mt-1 text-xs">
                                <Text type="secondary">National ID: {ind.national_id || "-"}</Text>
                                {ind.role ? <><br /><Text type="secondary">Role: {ind.role}</Text></> : null}
                              </div>
                              {ind.guilt_scores ? (
                                <div className="mt-2 text-xs">
                                  Detective score: {ind.guilt_scores.detective ?? "-"} · Sergeant score: {ind.guilt_scores.sergeant ?? "-"}
                                </div>
                              ) : null}
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Text type="secondary">No involved individuals recorded.</Text>
                      ),
                    },
                  ]}
                />
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

        <Modal
          title="Schedule Trial"
          open={isCreateModalOpen}
          onCancel={() => setIsCreateModalOpen(false)}
          onOk={() => createForm.submit()}
          okText="Schedule"
          confirmLoading={createSubmitting}
        >
          {createLoading ? (
            <div className="flex justify-center py-6">
              <Spin />
            </div>
          ) : (
            <Form form={createForm} layout="vertical" onFinish={onSubmitCreate}>
              <Form.Item
                name="case_id"
                label="Case"
                rules={[{ required: true, message: "Select a case." }]}
              >
                <Select
                  placeholder="Select case (without trial)"
                  showSearch
                  optionFilterProp="label"
                  options={createCases.map((c) => ({
                    value: c.id,
                    label: `${c.case_number || c.id} — ${c.title || "Untitled"}`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="judge_id"
                label="Judge"
                rules={[{ required: true, message: "Select a judge." }]}
              >
                <Select
                  placeholder="Select judge"
                  showSearch
                  optionFilterProp="label"
                  options={judges.map((j) => ({
                    value: j.id,
                    label: j.full_name || j.username || `User ${j.id}`,
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="scheduled_date"
                label="Scheduled Date & Time"
                rules={[{ required: true, message: "Scheduled date is required." }]}
              >
                <DatePicker showTime className="w-full" />
              </Form.Item>
            </Form>
          )}
        </Modal>
      </div>
    </div>
  );
}