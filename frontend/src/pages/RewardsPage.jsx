import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Descriptions,
  Input,
  InputNumber,
  Modal,
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
  claimRewardPayment,
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

function inferTipType(informationSubmitted) {
  return String(informationSubmitted || "")
    .toLowerCase()
    .includes("suspect")
    ? "suspect"
    : "case";
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function getReviewHistoryStorageKey(user) {
  if (!user) return "rewards_review_history_anonymous";
  const idPart = user.id || user.pk || user.username || "anonymous";
  return `rewards_review_history_${idPart}`;
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

  const isOfficerReviewer = hasAnyRole(user, [
    "Police Officer",
    "Sergeant",
    "Captain",
    "Police Chief",
  ]);
  const isDetective = hasRole(user, "Detective");
  const isPoliceRank = hasAnyRole(user, [
    "Cadet",
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
  const [reviewAmount, setReviewAmount] = useState("");

  const [lookupNationalId, setLookupNationalId] = useState("");
  const [lookupCode, setLookupCode] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const [claimStation, setClaimStation] = useState("");
  const [claimReference, setClaimReference] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [reviewHistory, setReviewHistory] = useState([]);

  useEffect(() => {
    const key = getReviewHistoryStorageKey(user);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        setReviewHistory([]);
        return;
      }
      const parsed = JSON.parse(raw);
      setReviewHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      setReviewHistory([]);
    }
  }, [user]);

  useEffect(() => {
    const key = getReviewHistoryStorageKey(user);
    try {
      localStorage.setItem(key, JSON.stringify(reviewHistory.slice(0, 200)));
    } catch {
      // ignore localStorage failures
    }
  }, [reviewHistory, user]);

  async function fetchTips(
    nextTab = activeTab,
    nextPage = page,
    nextPageSize = pageSize,
  ) {
    setLoading(true);
    try {
      let status;
      if (nextTab === "officer") status = "PENDING";
      if (nextTab === "detective") status = "PENDING_DETECTIVE";

      const data = await listRewardTips({
        page: nextPage,
        pageSize: nextPageSize,
        status,
      });

      const normalized = normalizeResponse(data);
      let nextRows = normalized.rows;
      if (nextTab === "officer") {
        nextRows = nextRows.filter(
          (row) => normalizeStatus(row.status) === "PENDING",
        );
      }
      if (nextTab === "detective") {
        nextRows = nextRows.filter(
          (row) => normalizeStatus(row.status) === "PENDING_DETECTIVE",
        );
      }

      setRows(nextRows);
      if (nextTab === "officer" || nextTab === "detective") {
        setTotal(nextRows.length);
      } else {
        setTotal(normalized.total);
      }
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
    if (activeTab === "lookup" || activeTab === "history") {
      setLoading(false);
      return;
    }
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
      let reviewedData = null;
      if (activeTab === "officer") {
        reviewedData = await officerReviewTip(selected.id, {
          action: reviewAction,
          message: reviewMessage.trim(),
        });
      } else if (activeTab === "detective") {
        const amount = Number(reviewAmount);
        if (
          reviewAction === "approve" &&
          (!Number.isFinite(amount) || amount < 0)
        ) {
          message.error("Valid reward amount is required when approving.");
          return;
        }

        reviewedData = await detectiveReviewTip(selected.id, {
          action: reviewAction,
          message: reviewMessage.trim(),
          amount: reviewAction === "approve" ? amount : undefined,
        });
      } else {
        return;
      }

      const reviewedRow = reviewedData
        ? { ...selected, ...reviewedData }
        : {
            ...selected,
            status:
              reviewAction === "reject"
                ? "REJECTED"
                : activeTab === "officer"
                  ? "PENDING_DETECTIVE"
                  : "READY_FOR_PAYMENT",
          };

      setRows((prev) =>
        prev.map((row) => (row.id === reviewedRow.id ? reviewedRow : row)),
      );
      setReviewHistory((prev) => [
        reviewedRow,
        ...prev.filter((row) => row.id !== reviewedRow.id),
      ]);

      message.success("Review submitted.");
      setIsModalOpen(false);
      setSelected(null);
      setReviewAction("approve");
      setReviewMessage("");
      setReviewAmount("");
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
        reward_code: lookupCode.trim(),
      });
      setLookupResult(res);
    } catch (err) {
      message.error(err.message || "Lookup failed.");
      setLookupResult(null);
    } finally {
      setLookupLoading(false);
    }
  }

  async function claimPayment() {
    if (!lookupResult?.id) return;
    if (!claimStation.trim()) {
      message.error("Police station is required for payment claim.");
      return;
    }

    setClaimLoading(true);
    try {
      await claimRewardPayment(lookupResult.id, {
        station_name: claimStation.trim(),
        payment_reference: claimReference.trim(),
      });
      message.success("Reward payment has been recorded.");
      await doLookup();
    } catch (err) {
      message.error(err.message || "Failed to record reward payment.");
    } finally {
      setClaimLoading(false);
    }
  }

  const tabItems = useMemo(() => {
    const items = [{ key: "mine", label: "My submissions" }];
    if (isOfficerReviewer)
      items.push({ key: "officer", label: "Officer queue" });
    if (isDetective) items.push({ key: "detective", label: "Detective queue" });
    if (isOfficerReviewer || isDetective) {
      items.push({ key: "history", label: "Reviewed history" });
    }
    if (isPoliceRank) items.push({ key: "lookup", label: "Lookup" });
    return items;
  }, [isOfficerReviewer, isDetective, isPoliceRank]);

  const tableRows = activeTab === "history" ? reviewHistory : rows;

  const columns = useMemo(() => {
    return [
      {
        title: "Type",
        dataIndex: "information_submitted",
        key: "information_submitted",
        width: 120,
        render: (v) => inferTipType(v),
      },
      {
        title: "Case",
        dataIndex: "case_number",
        key: "case_number",
        width: 140,
        render: (v) => v || "-",
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: 160,
        render: (v) => statusTag(v),
      },
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (v) => v || "-",
      },
      {
        title: "Reward",
        dataIndex: "amount",
        key: "amount",
        width: 160,
        render: (v) => formatMoney(v),
      },
      {
        title: "",
        key: "actions",
        width: 220,
        render: (_, row) => (
          <Space>
            <Button
              onClick={() => {
                setSelected(row);
                setIsModalOpen(true);
                setReviewAction("approve");
                setReviewMessage("");
                setReviewAmount(row.amount ?? "");
              }}
            >
              View
            </Button>
            {activeTab === "officer" || activeTab === "detective" ? (
              <Button
                type="primary"
                onClick={() => {
                  setSelected(row);
                  setIsModalOpen(true);
                  setReviewAction("approve");
                  setReviewMessage("");
                  setReviewAmount(row.amount ?? "");
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
                <Button onClick={() => navigate("/rewards/submit")}>
                  Submit tip
                </Button>
                {activeTab !== "lookup" && activeTab !== "history" ? (
                  <Button
                    onClick={() => fetchTips(activeTab, page, pageSize)}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                ) : null}
              </Space>
            }
          />
          <div className="mt-4">
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
            />
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
                <Button
                  type="primary"
                  loading={lookupLoading}
                  onClick={doLookup}
                >
                  Lookup
                </Button>
              </div>

              {lookupResult ? (
                <Descriptions bordered column={1} size="small">
                  <Descriptions.Item label="Reward (Rials)">
                    {formatMoney(lookupResult.amount)}
                  </Descriptions.Item>
                  <Descriptions.Item label="Unique Code">
                    {lookupResult.reward_code || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Tip Status">
                    {lookupResult.status || "-"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Submitted Information">
                    {lookupResult.information_submitted || "-"}
                  </Descriptions.Item>
                </Descriptions>
              ) : (
                <Text type="secondary">
                  Enter national ID and unique code to lookup a reward.
                </Text>
              )}

              {lookupResult?.is_ready_for_claim ? (
                <div className="flex flex-col gap-3">
                  <Input
                    value={claimStation}
                    onChange={(e) => setClaimStation(e.target.value)}
                    placeholder="Police station name"
                  />
                  <Input
                    value={claimReference}
                    onChange={(e) => setClaimReference(e.target.value)}
                    placeholder="Payment reference (optional)"
                  />
                  <div>
                    <Button
                      type="primary"
                      loading={claimLoading}
                      onClick={claimPayment}
                    >
                      Confirm payment claim
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        ) : activeTab === "history" ? (
          <Card>
            <Table
              rowKey={(row) => row.id}
              columns={columns}
              dataSource={tableRows}
              pagination={false}
            />
          </Card>
        ) : (
          <Card>
            {loading ? (
              <div className="flex justify-center py-10">
                <Spin />
              </div>
            ) : (
              <Table
                rowKey={(row) => row.id}
                columns={columns}
                dataSource={tableRows}
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
          title={
            activeTab === "officer" || activeTab === "detective"
              ? "Review Tip"
              : "Tip Details"
          }
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          onOk={
            activeTab === "officer" || activeTab === "detective"
              ? submitReview
              : () => setIsModalOpen(false)
          }
          okText={
            activeTab === "officer" || activeTab === "detective"
              ? "Submit"
              : "Close"
          }
        >
          {selected ? (
            <div className="flex flex-col gap-3">
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Type">
                  {inferTipType(selected.information_submitted)}
                </Descriptions.Item>
                <Descriptions.Item label="Case">
                  {selected.case_number || selected.case || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">
                  {selected.status || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Description">
                  {selected.description || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Information Submitted">
                  {selected.information_submitted || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Reward">
                  {formatMoney(selected.amount)}
                </Descriptions.Item>
                <Descriptions.Item label="Unique Code">
                  {selected.reward_code || "-"}
                </Descriptions.Item>
              </Descriptions>

              {activeTab === "officer" || activeTab === "detective" ? (
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

                  {activeTab === "detective" && reviewAction === "approve" ? (
                    <InputNumber
                      value={reviewAmount}
                      onChange={(value) => setReviewAmount(value ?? "")}
                      min={0}
                      precision={2}
                      controls={false}
                      className="w-full"
                      placeholder="Reward amount (Rials)"
                    />
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}
        </Modal>
      </div>
    </div>
  );
}
