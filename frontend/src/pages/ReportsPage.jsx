import { useEffect, useMemo, useState } from "react";
import { Button, Card, Descriptions, Select, Space, Spin, Typography, message } from "antd";
import { PageHeader } from "../components/PageHeader";
import { listReportCases, getCaseReport } from "../api/reports";

const { Title, Text } = Typography;

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
  const [casesLoading, setCasesLoading] = useState(true);
  const [caseOptions, setCaseOptions] = useState([]);
  const [caseId, setCaseId] = useState(null);

  const [reportLoading, setReportLoading] = useState(false);
  const [report, setReport] = useState(null);

  async function fetchCases() {
    setCasesLoading(true);
    try {
      const res = await listReportCases({ page: 1, pageSize: 100 });
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
    fetchCases();
  }, []);

  useEffect(() => {
    if (caseId) fetchReport(caseId);
  }, [caseId]);

  const basic = report?.case || report;

  const complainants = report?.complainants || report?.complaints || [];
  const testimonies = report?.testimonies || [];
  const evidence = report?.evidence || [];
  const suspects = report?.suspects || [];
  const staff = report?.staff || [];

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
              className="min-w-96"
              filterOption={(input, option) =>
                String(option?.label || "").toLowerCase().includes(input.toLowerCase())
              }
              allowClear
            />
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
          </>
        )}
      </div>
    </div>
  );
}