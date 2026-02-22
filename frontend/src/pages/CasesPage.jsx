import { useEffect, useMemo, useState } from "react";
import { Button, Card, Descriptions, Modal, Select, Space, Spin, Table, Typography, message } from "antd";
import { listCases } from "../api/cases";

const { Title, Text } = Typography;

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

export function CasesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [status, setStatus] = useState(undefined);

  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchData(nextPage = page, nextPageSize = pageSize, nextStatus = status) {
    setIsLoading(true);
    try {
      const data = await listCases({ page: nextPage, pageSize: nextPageSize, status: nextStatus });
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
    fetchData(1, pageSize, status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusOptions = useMemo(() => {
    const unique = new Set(rows.map((r) => r.status).filter(Boolean));
    return Array.from(unique).sort().map((s) => ({ label: s, value: s }));
  }, [rows]);

  const columns = [
    { title: "Case #", dataIndex: "case_number", key: "case_number", width: 160, render: (v) => v || "-" },
    { title: "Title", dataIndex: "title", key: "title", render: (v) => v || "-" },
    { title: "Status", dataIndex: "status", key: "status", width: 180, render: (v) => v || "-" },
    { title: "Priority", dataIndex: "priority", key: "priority", width: 140, render: (v) => v || "-" },
    { title: "Created", dataIndex: "created_at", key: "created_at", width: 190, render: (v) => formatDate(v) },
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
                <Button onClick={() => fetchData(page, pageSize, status)} disabled={isLoading}>
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
                <Descriptions.Item label="Case Number">{selected.case_number || "-"}</Descriptions.Item>
                <Descriptions.Item label="Title">{selected.title || "-"}</Descriptions.Item>
                <Descriptions.Item label="Status">{selected.status || "-"}</Descriptions.Item>
                <Descriptions.Item label="Priority">{selected.priority || "-"}</Descriptions.Item>
                <Descriptions.Item label="Incident Date">{formatDate(selected.incident_date)}</Descriptions.Item>
                <Descriptions.Item label="Incident Location">{selected.incident_location || "-"}</Descriptions.Item>
                <Descriptions.Item label="Assigned Detective">
                  {selected.assigned_detective_name || selected.assigned_detective || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Created">{formatDate(selected.created_at)}</Descriptions.Item>
              </Descriptions>
            ) : null}
          </Modal>
        </div>
      </div>
    </div>
  );
}