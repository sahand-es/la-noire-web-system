import { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Typography,
  message,
} from "antd";

import { getApiBase } from "../config";
import { listIntensivePursuit } from "../api/calls";

const { Title, Text } = Typography;

function toBackendOrigin() {
  const apiBase = getApiBase();
  if (!apiBase) return "";
  return apiBase.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
}

function normalizePhotoUrl(photo) {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;

  const origin = toBackendOrigin();
  if (!origin) return photo;
  if (photo.startsWith("/")) return `${origin}${photo}`;
  return `${origin}/${photo}`;
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("en-US").format(n);
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function normalizeResponse(data) {
  if (Array.isArray(data)) {
    return { rows: data, total: data.length, paginated: false };
  }
  if (data && Array.isArray(data.results)) {
    return {
      rows: data.results,
      total: typeof data.count === "number" ? data.count : data.results.length,
      paginated: true,
    };
  }
  return { rows: [], total: 0, paginated: false };
}

export function IntensivePursuitPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [searchText, setSearchText] = useState("");
  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function fetchData(nextPage = page, nextPageSize = pageSize) {
    setIsLoading(true);
    try {
      const data = await listIntensivePursuit({
        page: nextPage,
        pageSize: nextPageSize,
      });
      const normalized = normalizeResponse(data);
      setRows(normalized.rows || []);
      setTotal(normalized.total || 0);
    } catch (err) {
      message.error(err.message || "Failed to load intensive pursuit list.");
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

  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((r) => {
      const name = (r.full_name || `${r.first_name || ""} ${r.last_name || ""}`)
        .trim()
        .toLowerCase();
      const nid = String(r.national_id || "").toLowerCase();
      const phone = String(r.phone_number || "").toLowerCase();
      return name.includes(q) || nid.includes(q) || phone.includes(q);
    });
  }, [rows, searchText]);

  const columns = useMemo(() => {
    return [
      {
        title: "Photo",
        dataIndex: "photo",
        key: "photo",
        width: 90,
        render: (photo, record) => (
          <Avatar
            size={48}
            src={normalizePhotoUrl(photo)}
            alt={record.full_name || "suspect"}
          >
            {(record.full_name || "S").slice(0, 1).toUpperCase()}
          </Avatar>
        ),
      },
      {
        title: "Name",
        key: "name",
        render: (_, r) => (
          <div className="flex flex-col">
            <Text strong>{r.full_name || `${r.first_name || ""} ${r.last_name || ""}`.trim() || "-"}</Text>
            <Text type="secondary">{r.national_id ? `National ID: ${r.national_id}` : "National ID: -"}</Text>
          </div>
        ),
      },
      {
        title: "Days Under Pursuit",
        dataIndex: "days_under_pursuit",
        key: "days_under_pursuit",
        width: 160,
        render: (v) => (typeof v === "number" ? v : "-"),
      },
      {
        title: "Ranking",
        dataIndex: "ranking",
        key: "ranking",
        width: 120,
        render: (v) => (typeof v === "number" ? v : "-"),
      },
      {
        title: "Reward (Rials)",
        dataIndex: "reward_rials",
        key: "reward_rials",
        width: 170,
        render: (v) => formatMoney(v),
      },
      {
        title: "Pursuit Start",
        dataIndex: "pursuit_start_date",
        key: "pursuit_start_date",
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
  }, []);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Title level={3} className="m-0">
                  Intensive Pursuit
                </Title>
                <Space>
                  <Button
                    onClick={() => fetchData(page, pageSize)}
                    disabled={isLoading}
                  >
                    Refresh
                  </Button>
                </Space>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search by name, national ID, or phone"
                  allowClear
                  className="max-w-md"
                />
                <Text type="secondary">
                  Showing {filteredRows.length} of {rows.length} loaded
                </Text>
              </div>
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
                dataSource={filteredRows}
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
            )}
          </Card>
        </div>

        <Modal
          title="Suspect Details"
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={[
            <Button key="close" onClick={() => setIsModalOpen(false)}>
              Close
            </Button>,
          ]}
        >
          {selected ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Avatar
                  size={64}
                  src={normalizePhotoUrl(selected.photo)}
                  alt={selected.full_name || "suspect"}
                >
                  {(selected.full_name || "S").slice(0, 1).toUpperCase()}
                </Avatar>
                <div className="flex flex-col">
                  <Text strong>
                    {selected.full_name ||
                      `${selected.first_name || ""} ${selected.last_name || ""}`.trim() ||
                      "-"}
                  </Text>
                  <Text type="secondary">
                    {selected.national_id ? `National ID: ${selected.national_id}` : "National ID: -"}
                  </Text>
                </div>
              </div>

              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Status">
                  {selected.status || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Phone">
                  {selected.phone_number || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Address">
                  {selected.address || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Date of Birth">
                  {formatDate(selected.date_of_birth)}
                </Descriptions.Item>
                <Descriptions.Item label="Pursuit Start">
                  {formatDate(selected.pursuit_start_date)}
                </Descriptions.Item>
                <Descriptions.Item label="Days Under Pursuit">
                  {typeof selected.days_under_pursuit === "number"
                    ? selected.days_under_pursuit
                    : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Ranking">
                  {typeof selected.ranking === "number" ? selected.ranking : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Reward (Rials)">
                  {formatMoney(selected.reward_rials)}
                </Descriptions.Item>
              </Descriptions>
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
}