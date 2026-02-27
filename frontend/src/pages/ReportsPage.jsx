import { useEffect, useMemo, useState } from "react";
import { Button, Card, Descriptions, Form, Input, Modal, Select, Space, Spin, Switch, Typography, message } from "antd";
import { PageHeader } from "../components/PageHeader";
import { listReportCases, getCaseReport, writeCaseReport } from "../api/reports";

const { Title, Text } = Typography;
const { TextArea } = Input;

function readUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasRole(user, roleName) {
  return (user?.roles || []).some((r) => r?.name === roleName);
}

function hasAnyRole(user, roles) {
  return roles.some((r) => hasRole(user, r));
}

function normalizeList(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function Section({ title, children }) {
  return (
    <Card className="mt-4">
      <Title level={5} className="m-0">
        {title}
      </Title>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export function ReportsPage() {
  const [form] = Form.useForm();

  const [user, setUser] = useState(readUser());

  const [casesLoading, setCasesLoading] = useState(true);
  const [caseOptions, setCaseOptions] = useState([]);
  const [caseId, setCaseId] = useState(null);
  const [myAssignedOnly, setMyAssignedOnly] = useState(true);

  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  useEffect(() => {
    function onStorage() {
      setUser(readUser());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const canViewReports = useMemo(() => {
    if (!user) return false;
    if (Boolean(user.is_superuser) || hasRole(user, "System Administrator")) return true;
    return hasAnyRole(user, ["Detective", "Sergeant", "Judge", "Captain", "Police Chief"]);
  }, [user]);

  const canWriteReport = useMemo(() => {
    if (!user) return false;
    if (Boolean(user.is_superuser) || hasRole(user, "System Administrator")) return true;
    return hasRole(user, "Detective");
  }, [user]);

  const isDetective = useMemo(() => {
    if (!user) return false;
    return hasRole(user, "Detective");
  }, [user]);

  useEffect(() => {
    if (!isDetective) {
      setMyAssignedOnly(false);
    }
  }, [isDetective]);

  async function fetchCases() {
    setCasesLoading(true);
    try {
      const res = await listReportCases({ page: 1, pageSize: 100 });
      const list = normalizeList(res);
      const filteredList =
        isDetective && myAssignedOnly
          ? list.filter((c) => c.assigned_detective === user?.id)
          : list;
      setCaseOptions(
        filteredList.map((c) => ({
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

  async function fetchReport(id) {
    if (!id) return;
    setReportLoading(true);
    try {
      const res = await getCaseReport(id);
      setReport(res);
    } catch (err) {
      message.error(err.message || "Failed to load report.");
      setReport(null);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    if (canViewReports) {
      fetchCases();
    }
  }, [canViewReports, isDetective, myAssignedOnly, user?.id]);

  useEffect(() => {
    if (caseId && !caseOptions.some((option) => option.value === caseId)) {
      setCaseId(null);
      setReport(null);
    }
  }, [caseId, caseOptions]);

  useEffect(() => {
    if (caseId) fetchReport(caseId);
  }, [caseId]);

  const basic = report?.case || report;

  const complainants = report?.complainants || report?.complaints || [];
  const testimonies = report?.testimonies || [];
  const evidence = report?.evidence || [];
  const suspects = report?.suspects || [];
  const staff = report?.staff || [];
  const detectiveReports = report?.detective_reports || [];

  async function submitReport(values) {
    if (!caseId) {
      message.error("Please select a case first.");
      return;
    }
    setSubmitLoading(true);
    try {
      await writeCaseReport(caseId, {
        message: values.message?.trim() || "",
        suspects: [],
      });
      message.success("Report submitted successfully.");
      setIsWriteModalOpen(false);
      form.resetFields();
      await fetchReport(caseId);
    } catch (err) {
      message.error(err.message || "Failed to submit report.");
    } finally {
      setSubmitLoading(false);
    }
  }

  if (!canViewReports) {
    return (
      <div className="min-h-screen">
        <div className="max-w-6xl mx-auto flex flex-col gap-4">
          <Card>
            <Text type="secondary">You do not have permission to view reports.</Text>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Reports"
            subtitle="Judge / Captain / Chief: view full case reports."
            actions={
              <Space>
                <Button onClick={fetchCases} disabled={casesLoading}>
                  Reload cases
                </Button>
                <Button onClick={() => fetchReport(caseId)} disabled={!caseId || reportLoading}>
                  Refresh report
                </Button>
                {canWriteReport ? (
                  <Button type="primary" onClick={() => setIsWriteModalOpen(true)} disabled={!caseId}>
                    Write report
                  </Button>
                ) : null}
              </Space>
            }
          />
          <div className="mt-4">
            <Space direction="vertical" className="w-full">
              {isDetective ? (
                <Space>
                  <Switch checked={myAssignedOnly} onChange={setMyAssignedOnly} />
                  <Text>My assigned cases only</Text>
                </Space>
              ) : null}
              <Select
                value={caseId}
                onChange={setCaseId}
                options={caseOptions}
                placeholder="Select a case"
                loading={casesLoading}
                showSearch
                className="min-w-96"
                filterOption={(input, option) =>
                  String(option?.label || "").toLowerCase().includes(input.toLowerCase())
                }
                allowClear
              />
              {isDetective && myAssignedOnly && !casesLoading && caseOptions.length === 0 ? (
                <Text type="secondary">No cases assigned to you.</Text>
              ) : null}
            </Space>
          </div>
        </Card>

        {!caseId ? (
          <Card>
            <Text type="secondary">Select a case to view the report.</Text>
          </Card>
        ) : reportLoading ? (
          <Card>
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          </Card>
        ) : !report ? (
          <Card>
            <Text type="secondary">No report data available.</Text>
          </Card>
        ) : (
          <>
            <Section title="Case Overview">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Case Number">
                  {basic?.case_number || basic?.id || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Title">{basic?.title || "-"}</Descriptions.Item>
                <Descriptions.Item label="Status">{basic?.status || "-"}</Descriptions.Item>
                <Descriptions.Item label="Priority">{basic?.priority || "-"}</Descriptions.Item>
                <Descriptions.Item label="Incident Date">
                  {formatDate(basic?.incident_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Incident Location">
                  {basic?.incident_location || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Created At">
                  {formatDate(basic?.created_at)}
                </Descriptions.Item>
              </Descriptions>
            </Section>

            <Section title="Complainants / Complaints">
              {complainants?.length ? (
                <div className="flex flex-col gap-3">
                  {complainants.map((c) => (
                    <Card key={c.id}>
                      <Text strong>{c.title || "Complaint"}</Text>
                      <div className="mt-1">
                        <Text type="secondary">
                          Complainant: {c.complainant_name || c.complainant || "-"}
                        </Text>
                      </div>
                      <div className="mt-2">{c.description || "-"}</div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Text type="secondary">No complainants found.</Text>
              )}
            </Section>

            <Section title="Testimonies">
              {testimonies?.length ? (
                <div className="flex flex-col gap-3">
                  {testimonies.map((t) => (
                    <Card key={t.id}>
                      <Text strong>{t.title || "Testimony"}</Text>
                      <div className="mt-2">{t.transcript || t.description || "-"}</div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Text type="secondary">No testimonies found.</Text>
              )}
            </Section>

            <Section title="Evidence">
              {evidence?.length ? (
                <div className="flex flex-col gap-3">
                  {evidence.map((e) => (
                    <Card key={e.id}>
                      <Text strong>{e.title || "Evidence"}</Text>
                      <div className="mt-1">
                        <Text type="secondary">Type: {e.evidence_type || e.type || "-"}</Text>
                      </div>
                      <div className="mt-2">{e.description || "-"}</div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Text type="secondary">No evidence found.</Text>
              )}
            </Section>

            <Section title="Suspects / Criminals">
              {suspects?.length ? (
                <div className="flex flex-col gap-3">
                  {suspects.map((s) => (
                    <Card key={s.id}>
                      <Text strong>{s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "-"}</Text>
                      <div className="mt-1">
                        <Text type="secondary">National ID: {s.national_id || "-"}</Text>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Text type="secondary">No suspects recorded.</Text>
              )}
            </Section>

            <Section title="Involved Staff">
              {staff?.length ? (
                <div className="flex flex-col gap-3">
                  {staff.map((p, idx) => (
                    <Card key={p.id || idx}>
                      <Text strong>{p.name || p.full_name || p.username || "-"}</Text>
                      <div className="mt-1">
                        <Text type="secondary">{p.role || p.rank || "-"}</Text>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Text type="secondary">No staff details available.</Text>
              )}
            </Section>

            <Section title="Case Reports">
              {detectiveReports?.length ? (
                <div className="flex flex-col gap-3">
                  {detectiveReports.map((r) => (
                    <Card key={r.id}>
                      <div className="flex flex-col gap-2">
                        <Text strong>Report #{r.id}</Text>
                        <Text type="secondary">Status: {r.status || "-"}</Text>
                        <Text type="secondary">Detective: {r.detective_name || "-"}</Text>
                        <Text type="secondary">Submitted At: {formatDate(r.submitted_at)}</Text>
                        <Text>{r.detective_message || "-"}</Text>
                        <Text type="secondary">Sergeant: {r.sergeant_name || "-"}</Text>
                        <Text type="secondary">Reviewed At: {formatDate(r.reviewed_at)}</Text>
                        <Text>{r.sergeant_message || "-"}</Text>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Text type="secondary">No reports recorded for this case.</Text>
              )}
            </Section>
          </>
        )}

        <Modal
          title="Write report"
          open={isWriteModalOpen}
          onCancel={() => {
            if (submitLoading) return;
            setIsWriteModalOpen(false);
          }}
          onOk={() => form.submit()}
          okText="Submit"
          confirmLoading={submitLoading}
          okButtonProps={{ disabled: !caseId }}
          destroyOnHidden
        >
          <Form form={form} layout="vertical" onFinish={submitReport}>
            <Form.Item label="Case">
              <Text>{caseOptions.find((c) => c.value === caseId)?.label || "-"}</Text>
            </Form.Item>
            <Form.Item
              name="message"
              label="Report message"
              rules={[{ required: true, message: "Please write the report message." }]}
            >
              <TextArea
                rows={6}
                placeholder="Write detective report details for this case..."
                maxLength={4000}
                showCount
              />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </div>
  );
}