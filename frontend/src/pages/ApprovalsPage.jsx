import { useEffect, useState } from "react";
import {
  Table,
  Card,
  Typography,
  Spin,
  message,
  Button,
  Modal,
  Descriptions,
  Form,
  Input,
  Space,
  Popconfirm,
} from "antd";
import { listCases, approveCase } from "../api/cases";

const { Title } = Typography;

export function ApprovalsPage() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCases();
  }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const data = await listCases({ status: "OPEN", pageSize: 100 });
      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      message.error(err.message || "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }

  function openDetails(record) {
    setSelected(record);
    form.resetFields();
    setModalVisible(true);
  }

  async function handleAction(action, values = {}) {
    if (!selected) return;
    setSubmitting(true);
    try {
      await approveCase(selected.id, action, values.message || "");
      message.success(`Case ${action}d successfully`);
      setModalVisible(false);
      setSelected(null);
      await loadCases();
    } catch (err) {
      message.error(err.message || `Failed to ${action} case`);
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      title: "Case #",
      dataIndex: "case_number",
      key: "case_number",
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (t, r) => (
        <button
          className="text-left text-sm underline"
          onClick={() => openDetails(r)}
        >
          {t}
        </button>
      ),
    },
    { title: "Priority", dataIndex: "priority", key: "priority" },
    { title: "Incident", dataIndex: "incident_date", key: "incident_date" },
    {
      title: "Location",
      dataIndex: "incident_location",
      key: "incident_location",
    },
    { title: "Detective", dataIndex: "detective_name", key: "detective_name" },
    { title: "Days Open", dataIndex: "days_open", key: "days_open" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="primary" onClick={() => openDetails(record)}>
            Details
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <Title level={3} className="m-0">
              Case Approvals
            </Title>
            <Button onClick={loadCases}>Refresh</Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spin />
            </div>
          ) : (
            <Table
              rowKey={(r) => r.id}
              dataSource={cases}
              columns={columns}
              pagination={false}
            />
          )}
        </Card>

        <Modal
          title={selected ? `Case ${selected.case_number}` : "Case"}
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width={800}
        >
          {selected ? (
            <div>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Title">
                  {selected.title}
                </Descriptions.Item>
                <Descriptions.Item label="Priority">
                  {selected.priority}
                </Descriptions.Item>
                <Descriptions.Item label="Incident Date">
                  {selected.incident_date}
                </Descriptions.Item>
                <Descriptions.Item label="Location">
                  {selected.incident_location}
                </Descriptions.Item>
                <Descriptions.Item label="Detective">
                  {selected.detective_name}
                </Descriptions.Item>
                <Descriptions.Item label="Days Open">
                  {selected.days_open}
                </Descriptions.Item>
                <Descriptions.Item label="Notes">
                  {selected.notes || "-"}
                </Descriptions.Item>
              </Descriptions>

              <div className="mt-4">
                <Form form={form} onFinish={handleAction} layout="vertical">
                  <Form.Item name="message" label="Note (optional)">
                    <Input.TextArea
                      rows={3}
                      placeholder="Add an approval or rejection note"
                    />
                  </Form.Item>

                  <div className="flex justify-end gap-2">
                    <Popconfirm
                      title="Reject this case?"
                      onConfirm={async () => {
                        try {
                          const values = await form.validateFields();
                          handleAction("reject", values);
                        } catch (e) {
                          // validation failed; do nothing
                        }
                      }}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button danger loading={submitting}>
                        Reject
                      </Button>
                    </Popconfirm>

                    <Button
                      type="primary"
                      loading={submitting}
                      onClick={async () => {
                        try {
                          const values = await form.validateFields();
                          handleAction("approve", values);
                        } catch (e) {
                          // validation failed
                        }
                      }}
                    >
                      Approve
                    </Button>
                  </div>
                </Form>
              </div>
            </div>
          ) : (
            <Spin />
          )}
        </Modal>
      </div>
    </div>
  );
}
