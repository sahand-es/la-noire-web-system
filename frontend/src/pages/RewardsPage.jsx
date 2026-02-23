import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import {
  listRewardTips,
  officerReviewTip,
  detectiveReviewTip,
  lookupReward,
} from "../api/rewards";

const { Text } = Typography;

function normalizeResponse(data) {
  if (Array.isArray(data)) return { rows: data, total: data.length };
  if (data && Array.isArray(data.results)) {
    return { rows: data.results, total: data.count ?? data.results.length };
  }
  return { rows: [], total: 0 };
}

function formatMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("en-US").format(n);
}

function hasRole(user, roleName) {
  return (user?.roles || []).some((r) => r?.name === roleName);
}

function hasAnyRole(user, roles) {
  return roles.some((r) => hasRole(user, r));
}

function statusTag(s) {
  const v = String(s || "");
  return <Tag>{v || "-"}</Tag>;
}

export function RewardsPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (!raw) return;
    try {
      setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  const isOfficer = hasAnyRole(user, ["Police Officer", "Patrol Officer"]);
  const isDetective = hasRole(user, "Detective");
  const isPoliceRank = hasAnyRole(user, [
    "Police Officer",
    "Patrol Officer",
    "Detective",
    "Sergeant",
    "Captain",
    "Police Chief",
  ]);

  const [activeTab, setActiveTab] = useState("mine");

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [selected, setSelected] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [reviewAction, setReviewAction] = useState("approve");
  const [reviewMessage, setReviewMessage] = useState("");

  const [lookupNationalId, setLookupNationalId] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  async function fetchTips(nextTab = activeTab, nextPage = page, nextPageSize = pageSize) {
    setLoading(true);
    try {
      let status = undefined;
      if (nextTab === "officer") status = "PENDING_OFFICER";
      if (nextTab === "detective") status = "PENDING_DETECTIVE";

      const data = await listRewardTips({
        page: nextPage,
        pageSize: nextPageSize,
        status,
      });
      const normalized = normalizeResponse(data);
      setRows(normalized.rows);
      setTotal(normalized.total);
    } catch (err) {
      message.error(err.message || "Failed to load rewards.");
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTips("mine", 1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setPage(1);
    fetchTips(activeTab, 1, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function submitReview() {
    if (!selected) return;

    if (reviewAction === "reject" && !reviewMessage.trim()) {
      message.error("Message is required when rejecting.");
      return;
    }

    try {
      if (activeTab === "officer") {
        await officerReviewTip(selected.id, {
          action: reviewAction,
          message: reviewMessage.trim(),
        });
      } else if (activeTab === "detective") {
        await detectiveReviewTip(selected.id, {
          action: reviewAction,
          message: reviewMessage.trim(),
        });
      } else {
        return;
      }

      message.success("Review submitted.");
      setIsModalOpen(false);
      setSelected(null);
      setReviewAction("approve");
      setReviewMessage("");
      fetchTips(activeTab, page, pageSize);
    } catch (err) {
      message.error(err.message || "Failed to submit review.");
    }
  }

  async function doLookup() {
    if (!isPoliceRank) return;
    if (!lookupNationalId.trim() || !lookupCode.trim()) {
      message.error("National ID and unique code are required.");
      return;
    }
    setLookupLoading(true);
    try {
      const res = await lookupReward({
        national_id: lookupNationalId.trim(),
        unique_code: lookupCode.trim(),
      });
      setLookupResult(res);
    } catch (err) {
      message.error(err.message || "Lookup failed.");
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  }

  const tabItems = useMemo(() => {
    const items = [
      { key: "mine", label: "My submissions" },
    ];
    if (isOfficer) items.push({ key: "officer", label: "Officer queue" });
    if (isDetective) items.push({ key: "detective", label: "Detective queue" });
    if (isPoliceRank) items.push({ key: "lookup", label: "Lookup" });
    return items;
  }, [isOfficer, isDetective, isPoliceRank]);

  const columns = useMemo(() => {
    return [
      { title: "Type", dataIndex: "tip_type", key: "tip_type", width: 120, render: (v) => v || "-" },
      { title: "Status", dataIndex: "status", key: "status", width: 160, render: (v) => statusTag(v) },
      { title: "Description", dataIndex: "description", key: "description", render: (v) => v || "-" },
      { title: "Reward", dataIndex: "reward_amount", key: "reward_amount", width: 160, render: (v) => formatMoney(v) },
      {
        title: "",
        key: "actions",
        width: 220,
        render: (_, r) => (
          <Space>
            <Button
              onClick={() => {
                setSelected(r);
                setIsModalOpen(true);
                setReviewAction("approve");
                setReviewMessage("");
              }}
            >
              View
            </Button>
            {(activeTab === "officer" || activeTab === "detective") ? (
              <Button
                type="primary"
                onClick={() => {
                  setSelected(r);
                  setIsModalOpen(true);
                  setReviewAction("approve");
                  setReviewMessage("");
                }}
              >
                Review
              </Button>
            ) : null}
          </Space>
        ),
      },
    ];
  }, [activeTab]);

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Rewards"
            subtitle="Submit information, review tips, and lookup reward details."
            actions={
              <Space>
                <Button onClick={() => navigate("/rewards/submit")}>Submit tip</Button>
                {activeTab !== "lookup" ? (
                  <Button onClick={() => fetchTips(activeTab, page, pageSize)} disabled={loading}>
                    Refresh
                  </Button>
                ) : null}
              </Space>
            }
          />
          <div className="mt-4">
            <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          </div>
        </Card>

        {activeTab === "lookup" ? (
          <Card>
            <div className="flex flex-col gap-3 max-w-xl">
              <Input
                value={lookupNationalId}
                onChange={(e) => setLookupNationalId(e.target.value)}
                placeholder="National ID"
              />
              <Input
                value={lookupCode}
                onChange={(e) => setLookupCode(e.target.value)}
                placeholder="Unique code"
              />
              <div>
                <Button type="primary" loading={lookupLoading} onClick={doLookup}>
                  Lookup
                </Button>
              </div>

              {lookupResult ? (
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Reward (Rials)">
                    {formatMoney(lookupResult.reward_amount || lookupResult.reward_rials)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tip Status">
                    {lookupResult.status || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Description">
                    {lookupResult.description || "-"}
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Text type="secondary">Enter national ID and unique code to lookup a reward.</Text>
              )}
            </div>
          </Card>
        ) : (
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
                    fetchTips(activeTab, nextPage, nextPageSize);
                  },
                }}
              />
            )}
          </Card>
        )}

        <Modal
          title={activeTab === "officer" || activeTab === "detective" ? "Review Tip" : "Tip Details"}
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={activeTab === "officer" || activeTab === "detective" ? submitReview : () => setIsModalOpen(false)}
          okText={activeTab === "officer" || activeTab === "detective" ? "Submit" : "Close"}
        >
          {selected ? (
            <div className="flex flex-col gap-3">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Type">{selected.tip_type || "-"}</Descriptions.Item>
                <Descriptions.Item label="Status">{selected.status || "-"}</Descriptions.Item>
                <Descriptions.Item label="Description">{selected.description || "-"}</Descriptions.Item>
                <Descriptions.Item label="Reward">{formatMoney(selected.reward_amount)}</Descriptions.Item>
                <Descriptions.Item label="Unique Code">{selected.unique_code || "-"}</Descriptions.Item>
              </Descriptions>

              {(activeTab === "officer" || activeTab === "detective") ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Text strong>Decision:</Text>
                    <Button
                      type={reviewAction === "approve" ? "primary" : "default"}
                      onClick={() => setReviewAction("approve")}
                    >
                      Approve
                    </Button>
                    <Button
                      type={reviewAction === "reject" ? "primary" : "default"}
                      onClick={() => setReviewAction("reject")}
                    >
                      Reject
                    </Button>
                  </div>

                  <Input.TextArea
                    value={reviewMessage}
                    onChange={(e) => setReviewMessage(e.target.value)}
                    placeholder="Message (required for reject)"
                    rows={4}
                  />
                </>
              ) : null}
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
}