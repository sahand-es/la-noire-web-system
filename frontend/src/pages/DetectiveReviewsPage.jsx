import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
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
import { PageHeader } from "../components/PageHeader";
import { listCases } from "../api/cases";
import {
  createSuspectLink,
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
  const [form] = Form.useForm();

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
      const targetCaseId = selected.case || caseId;
      if (!targetCaseId) {
        message.error("Case is missing for this report.");
        return;
      }

      let suspectPayload = null;
      if (decision === "approve") {
        const values = await form.validateFields();
        suspectPayload = {
          first_name: values.first_name,
          last_name: values.last_name,
          national_id: values.national_id,
          date_of_birth: values.date_of_birth
            ? values.date_of_birth.format("YYYY-MM-DD")
            : undefined,
          phone_number: values.phone_number || "",
          address: values.address || "",
          criminal_history: values.criminal_history || "",
          suspect_notes: values.suspect_notes || "",
          role_in_crime: values.role_in_crime || "",
          identification_method: values.identification_method || "",
          notes: values.link_notes || "",
        };
      }

      await sergeantReviewDetectiveReport(targetCaseId, selected.id, {
        action: decision === "approve" ? "approve" : "disagree",
        message: note || "",
      });

      if (decision === "approve") {
        await createSuspectLink(targetCaseId, suspectPayload);
        message.success(
          "Review submitted. Suspect created and linked to case.",
        );
      } else {
        message.success("Review submitted.");
      }

      setIsModalOpen(false);
      setSelected(null);
      setNote("");
      setDecision("approve");
      form.resetFields();
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
                form.resetFields();
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
          onCancel={() => {
            setIsModalOpen(false);
            form.resetFields();
          }}
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

              {decision === "approve" ? (
                <Form
                  form={form}
                  layout="vertical"
                  className="mt-2"
                  initialValues={{ identification_method: "Sergeant review" }}
                >
                  <Form.Item
                    label="First name"
                    name="first_name"
                    rules={[
                      { required: true, message: "First name is required." },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="Last name"
                    name="last_name"
                    rules={[
                      { required: true, message: "Last name is required." },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="National ID"
                    name="national_id"
                    rules={[
                      { required: true, message: "National ID is required." },
                      {
                        pattern: /^\d{10}$/,
                        message: "National ID must be 10 digits.",
                      },
                    ]}
                  >
                    <Input maxLength={10} />
                  </Form.Item>
                  <Form.Item label="Date of birth" name="date_of_birth">
                    <DatePicker className="w-full" />
                  </Form.Item>
                  <Form.Item label="Phone number" name="phone_number">
                    <Input maxLength={11} />
                  </Form.Item>
                  <Form.Item label="Address" name="address">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item label="Criminal history" name="criminal_history">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item label="Suspect notes" name="suspect_notes">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                  <Form.Item label="Role in crime" name="role_in_crime">
                    <Input />
                  </Form.Item>
                  <Form.Item
                    label="Identification method"
                    name="identification_method"
                  >
                    <Input />
                  </Form.Item>
                  <Form.Item label="Case link notes" name="link_notes">
                    <Input.TextArea rows={2} />
                  </Form.Item>
                </Form>
              ) : null}
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
}
