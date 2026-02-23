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
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import { createCase, listCases } from "../api/cases";

const { Title, Text } = Typography;

function normalizeResponse(data) {
  if (Array.isArray(data)) return { rows: data, total: data.length };
  if (data && Array.isArray(data.results))
    return { rows: data.results, total: data.count ?? data.results.length };
  return { rows: [], total: 0 };
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

export function CasesPage() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [status, setStatus] = useState(undefined);

  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  const roleNames = useMemo(
    () => (user?.roles || []).map((role) => role?.name).filter(Boolean),
    [user],
  );

  const canCreateCrimeSceneCase = useMemo(() => {
    const allowed = [
      "Police Officer",
      "Patrol Officer",
      "Detective",
      "Sergeant",
      "Captain",
      "Police Chief",
      "System Administrator",
    ];
    return roleNames.some((name) => allowed.includes(name));
  }, [roleNames]);

  async function fetchData(
    nextPage = page,
    nextPageSize = pageSize,
    nextStatus = status,
  ) {
    setIsLoading(true);
    try {
      const data = await listCases({
        page: nextPage,
        pageSize: nextPageSize,
        status: nextStatus,
      });
      const normalized = normalizeResponse(data);
      setRows(normalized.rows);
      setTotal(normalized.total);
    } catch (err) {
      message.error(err.message || "Failed to load cases.");
      setRows([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      try {
        setUser(JSON.parse(rawUser));
      } catch (err) {
        console.error("Failed to parse user:", err);
      }
    }

    fetchData(1, pageSize, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCreate(values) {
    const witnessNationalIds = (values.witness_national_ids || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const witnessPhones = (values.witness_phones || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const payload = {
      title: values.title,
      description: values.description,
      incident_location: values.incident_location,
      incident_date: values.incident_date
        ? dayjs(values.incident_date).toISOString()
        : undefined,
      priority: values.priority,
      witness_national_ids: witnessNationalIds,
      witness_phones: witnessPhones,
      notes: values.notes || "",
    };

    setIsCreating(true);
    try {
      await createCase(payload);
      message.success("Case registered from crime scene.");
      setIsCreateModalOpen(false);
      createForm.resetFields();
      fetchData(1, pageSize, status);
      setPage(1);
    } catch (err) {
      message.error(err.message || "Failed to create case.");
    } finally {
      setIsCreating(false);
    }
  }

  const statusOptions = useMemo(() => {
    const unique = new Set(rows.map((r) => r.status).filter(Boolean));
    return Array.from(unique)
      .sort()
      .map((s) => ({ label: s, value: s }));
  }, [rows]);

  const columns = [
    {
      title: "Case #",
      dataIndex: "case_number",
      key: "case_number",
      width: 160,
      render: (v) => v || "-",
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
      width: 180,
      render: (v) => v || "-",
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      width: 140,
      render: (v) => v || "-",
    },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 190,
      render: (v) => formatDate(v),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, r) => (
        <Button
          onClick={() => {
            setSelected(r);
            setIsModalOpen(true);
          }}
        >
          Details
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Title level={3} className="m-0">
                Cases
              </Title>
              <Space>
                {canCreateCrimeSceneCase ? (
                  <Button
                    type="primary"
                    onClick={() => setIsCreateModalOpen(true)}
                  >
                    Register Crime Scene Case
                  </Button>
                ) : null}
                <Button
                  onClick={() => fetchData(page, pageSize, status)}
                  disabled={isLoading}
                >
                  Refresh
                </Button>
              </Space>
            </div>

            <div className="flex items-center gap-3 flex-wrap mt-3">
              <Text type="secondary">Filter:</Text>
              <Select
                value={status}
                onChange={(v) => {
                  setStatus(v);
                  setPage(1);
                  fetchData(1, pageSize, v);
                }}
                allowClear
                placeholder="Status"
                options={statusOptions}
                className="min-w-48"
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
                pagination={{
                  current: page,
                  pageSize,
                  total,
                  showSizeChanger: true,
                  onChange: (nextPage, nextPageSize) => {
                    setPage(nextPage);
                    setPageSize(nextPageSize);
                    fetchData(nextPage, nextPageSize, status);
                  },
                }}
              />
            )}
          </Card>

          <Modal
            title="Register Case (Crime Scene)"
            open={isCreateModalOpen}
            onCancel={() => setIsCreateModalOpen(false)}
            footer={null}
            destroyOnClose
          >
            <Form form={createForm} layout="vertical" onFinish={handleCreate}>
              <Form.Item
                label="Title"
                name="title"
                rules={[{ required: true, message: "Title is required." }]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Description"
                name="description"
                rules={[
                  { required: true, message: "Description is required." },
                ]}
              >
                <Input.TextArea rows={4} />
              </Form.Item>

              <Form.Item
                label="Incident Date & Time"
                name="incident_date"
                rules={[
                  {
                    required: true,
                    message: "Incident date/time is required.",
                  },
                ]}
              >
                <DatePicker showTime className="w-full" />
              </Form.Item>

              <Form.Item
                label="Incident Location"
                name="incident_location"
                rules={[
                  { required: true, message: "Incident location is required." },
                ]}
              >
                <Input />
              </Form.Item>

              <Form.Item
                label="Priority"
                name="priority"
                initialValue="LEVEL3"
                rules={[{ required: true, message: "Priority is required." }]}
              >
                <Select
                  options={[
                    { label: "Level 3", value: "LEVEL3" },
                    { label: "Level 2", value: "LEVEL2" },
                    { label: "Level 1", value: "LEVEL1" },
                    { label: "Critical", value: "CRITICAL" },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="Witness National IDs"
                name="witness_national_ids"
                extra="Optional. Comma-separated values."
              >
                <Input placeholder="1234567890, 0987654321" />
              </Form.Item>

              <Form.Item
                label="Witness Phone Numbers"
                name="witness_phones"
                extra="Optional. Comma-separated values."
              >
                <Input placeholder="09123456789, 09987654321" />
              </Form.Item>

              <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={3} />
              </Form.Item>

              <div className="flex justify-end gap-2">
                <Button onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={isCreating}>
                  Create Case
                </Button>
              </div>
            </Form>
          </Modal>

          <Modal
            title="Case Details"
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            footer={[
              <Button key="close" onClick={() => setIsModalOpen(false)}>
                Close
              </Button>,
            ]}
          >
            {selected ? (
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Case Number">
                  {selected.case_number || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Title">
                  {selected.title || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {selected.status || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Priority">
                  {selected.priority || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Incident Date">
                  {formatDate(selected.incident_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Incident Location">
                  {selected.incident_location || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Assigned Detective">
                  {selected.assigned_detective_name ||
                    selected.assigned_detective ||
                    "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Created">
                  {formatDate(selected.created_at)}
                </Descriptions.Item>
              </Descriptions>
            ) : null}
          </Modal>
        </div>
      </div>
    </div>
  );
}
