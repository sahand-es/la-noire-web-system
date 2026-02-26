import { useCallback, useEffect, useState } from "react";
import { Button, Card, Space, Spin, Table, Tag, Typography, message } from "antd";
import { PageHeader } from "../components/PageHeader";
import { listNotifications, markNotificationRead } from "../api/notifications";

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

export function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const fetchData = useCallback(
    async (nextPage = page, nextPageSize = pageSize, silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await listNotifications({
          page: nextPage,
          pageSize: nextPageSize,
        });
        const normalized = normalizeResponse(data);
        setRows(normalized.rows);
        setTotal(normalized.total);
      } catch (err) {
        if (!silent) message.error(err.message || "Failed to load notifications.");
        setRows([]);
        setTotal(0);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, pageSize],
  );

  useEffect(() => {
    fetchData(1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const id = setInterval(() => fetchData(page, pageSize, true), 5000);
    return () => clearInterval(id);
  }, [fetchData, page, pageSize]);

  async function onMarkRead(id) {
    try {
      await markNotificationRead(id);
      message.success("Marked as read.");
      fetchData(page, pageSize);
    } catch (err) {
      // If backend doesn't support it, don’t break the page.
      message.error(err.message || "Mark read not supported.");
    }
  }

  const columns = [
    {
      title: "Type",
      dataIndex: "type",
      key: "type",
      width: 180,
      render: (v) => <Tag>{v || "-"}</Tag>,
    },
    { title: "Message", dataIndex: "message", key: "message", render: (v) => v || "-" },
    {
      title: "Created",
      dataIndex: "created_at",
      key: "created_at",
      width: 220,
      render: (v) => formatDate(v),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      render: (_, r) =>
        r.read_at ? (
          <Text type="secondary">Read</Text>
        ) : (
          <Button type="primary" onClick={() => onMarkRead(r.id)}>
            Mark read
          </Button>
        ),
    },
  ];

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Notifications"
            subtitle="New evidence and updates to cases you are involved in."
            actions={
              <Space>
                <Button onClick={() => fetchData(page, pageSize)} disabled={loading}>
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
          ) : rows.length ? (
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
                  fetchData(nextPage, nextPageSize);
                },
              }}
            />
          ) : (
            <Text type="secondary">No notifications.</Text>
          )}
        </Card>
      </div>
    </div>
  );
}