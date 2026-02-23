import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Table,
  Typography,
  message,
} from "antd";

import {
  listComplaints,
  cadetReviewComplaint,
  officerReviewComplaint,
} from "../api/complaints";

import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

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

function hasRole(user, roleName) {
  return (user?.roles || []).some((r) => r?.name === roleName);
}

function canCadetReview(status) {
  return ["PENDING_CADET", "RETURNED_TO_CADET"].includes(status);
}

function canOfficerReview(status) {
  return status === "PENDING_OFFICER";
}

function canComplainantEdit(status) {
  return status === "RETURNED_TO_COMPLAINANT";
}

export function ComplaintsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  const isCadet = hasRole(user, "Cadet");
  const isOfficer =
    hasRole(user, "Police Officer") || hasRole(user, "Patrol Officer");

  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [status, setStatus] = useState(undefined);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeComplaint, setActiveComplaint] = useState(null);

  const [actionType, setActionType] = useState("approve");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    try {
      setUser(JSON.parse(raw));
    } catch (err) {
      console.error("Failed to parse user:", err);
    }
  }, []);

  async function fetchData(
    nextPage = page,
    nextPageSize = pageSize,
    nextStatus = status,
  ) {
    setIsLoading(true);
    try {
      const data = await listComplaints({
        page: nextPage,
        pageSize: nextPageSize,
        status: nextStatus,
      });
      const normalized = normalizeResponse(data);
      setRows(normalized.rows);
      setTotal(normalized.total);
    } catch (err) {
      message.error(err.message || "Failed to load complaints.");
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
    return Array.from(unique)
      .sort()
      .map((s) => ({ label: s, value: s }));
  }, [rows]);

  async function submitReview() {
    if (!activeComplaint) return;

    if (actionType === "reject" && !actionMessage.trim()) {
      message.error("Message is required when returning/rejecting.");
      return;
    }

    try {
      if (isCadet) {
        await cadetReviewComplaint(activeComplaint.id, {
          action: actionType === "approve" ? "approve" : "reject",
          message: actionMessage.trim(),
        });
      } else if (isOfficer) {
        await officerReviewComplaint(activeComplaint.id, {
          action: actionType === "approve" ? "approve" : "reject",
          message: actionMessage.trim(),
        });
      } else {
        message.error("You do not have permission to review complaints.");
        return;
      }

      message.success("Review submitted.");
      setIsModalOpen(false);
      setActiveComplaint(null);
      setActionMessage("");
      setActionType("approve");
      fetchData(page, pageSize, status);
    } catch (err) {
      message.error(err.message || "Failed to submit review.");
    }
  }

  const columns = [
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
      width: 190,
      render: (v) => v || "-",
    },
    {
      title: "Case",
      dataIndex: "case",
      key: "case",
      width: 180,
      render: (caseId, row) => {
        if (caseId) {
          return <Tag color="blue">Case #{caseId}</Tag>;
        }
        if (row?.status === "VOIDED") {
          return <Tag color="red">Voided</Tag>;
        }
        return <Tag color="orange">Error: No Case</Tag>;
      },
    },
    {
      title: "Rejections",
      dataIndex: "rejection_count",
      key: "rejection_count",
      width: 120,
      render: (v) => (typeof v === "number" ? v : "-"),
    },
    {
      title: "Cadet Message",
      dataIndex: "cadet_message",
      key: "cadet_message",
      render: (v) => v || "-",
    },
    {
      title: "Officer Message",
      dataIndex: "officer_message",
      key: "officer_message",
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
      width: 160,
      render: (_, r) => {
        if (isCadet && canCadetReview(r.status)) {
          return (
            <Button
              onClick={() => {
                setActiveComplaint(r);
                setIsModalOpen(true);
                setActionType("approve");
                setActionMessage("");
              }}
            >
              Review
            </Button>
          );
        }

        if (isOfficer && canOfficerReview(r.status)) {
          return (
            <Button
              onClick={() => {
                setActiveComplaint(r);
                setIsModalOpen(true);
                setActionType("approve");
                setActionMessage("");
              }}
            >
              Review
            </Button>
          );
        }

        const editable = canComplainantEdit(r.status);
        if (!editable) return null;

        return (
          <Button onClick={() => navigate(`/complaints/${r.id}/edit`)}>
            Edit
          </Button>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Title level={3} className="m-0">
                Complaints
              </Title>
              <Space>
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
            title="Review Complaint"
            open={isModalOpen}
            onCancel={() => setIsModalOpen(false)}
            onOk={submitReview}
            okText="Submit"
          >
            <div className="flex flex-col gap-3">
              <Text strong>{activeComplaint?.title || "-"}</Text>
              <Text type="secondary">
                Status: {activeComplaint?.status || "-"}
              </Text>

              <Select
                value={actionType}
                onChange={setActionType}
                options={[
                  { label: "Approve", value: "approve" },
                  {
                    label: isOfficer
                      ? "Return to Cadet"
                      : "Return to Complainant",
                    value: "reject",
                  },
                ]}
              />

              <Input.TextArea
                value={actionMessage}
                onChange={(e) => setActionMessage(e.target.value)}
                placeholder="Message (required for return/reject)"
                rows={4}
              />
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}
