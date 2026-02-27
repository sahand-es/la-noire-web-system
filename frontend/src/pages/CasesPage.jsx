import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  assignCaseDetective,
  createCase,
  listCaseDetectives,
  listCases,
} from "../api/cases";
import {
  listSuspectLinks,
  markSuspectWanted,
  markSuspectCaptured,
  detectiveAssessment,
  sergeantAssessment,
  captainOpinion,
  chiefApproval,
} from "../api/calls";

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
  const [detectiveOptions, setDetectiveOptions] = useState([]);
  const [isDetectivesLoading, setIsDetectivesLoading] = useState(false);
  const [assignDetectiveId, setAssignDetectiveId] = useState(null);
  const [isAssigningDetective, setIsAssigningDetective] = useState(false);
  const [createForm] = Form.useForm();

  const roleNames = useMemo(
    () => (user?.roles || []).map((role) => role?.name).filter(Boolean),
    [user]
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

  const canAssignDetective = useMemo(() => {
    const allowed = [
      "Sergeant",
      "Captain",
      "Police Chief",
      "System Administrator",
    ];
    return roleNames.some((name) => allowed.includes(name));
  }, [roleNames]);

  const canManageSuspectState = useMemo(() => {
    const allowed = [
      "Detective",
      "Sergeant",
      "Captain",
      "Police Chief",
      "System Administrator",
    ];
    return roleNames.some((name) => allowed.includes(name));
  }, [roleNames]);

  const [suspectLinks, setSuspectLinks] = useState([]);
  const [suspectLinksLoading, setSuspectLinksLoading] = useState(false);
  const [suspectActionLinkId, setSuspectActionLinkId] = useState(null);

  const isDetective = roleNames.includes("Detective");
  const isSergeant = roleNames.includes("Sergeant");
  const isCaptain = roleNames.includes("Captain");
  const isPoliceChief = roleNames.includes("Police Chief");

  const [guiltScoreModal, setGuiltScoreModal] = useState({
    open: false,
    link: null,
    type: null,
  }); // type: 'detective' | 'sergeant'
  const [captainOpinionModal, setCaptainOpinionModal] = useState({
    open: false,
    link: null,
  });
  const [guiltScoreForm] = Form.useForm();
  const [captainOpinionForm] = Form.useForm();

  const handleApproveAndRelease = async (caseId) => {
    try {
      const response = await approveReleaseCase(caseId);  // Calls the API
      if (response.success) {
        message.success("Suspect released after payment.");
        // Optionally, update the case status in the UI
        fetchCases();  // Refresh the cases or manually update the status
      } else {
        message.error("Error: " + response.error);
      }
    } catch (error) {
      message.error("An error occurred: " + error.message);
    }
  return (
    <div>
      {cases.map((link) => (
        <Card key={link.id} title={link.case_title}>
          <div className="case-details">
            {/* Your other case details here */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span>
                <Text type="secondary">Detective score:</Text>{" "}
                {link.detective_guilt_score != null ? (
                  link.detective_guilt_score
                ) : (
                  "—"
                )}
              </span>
              <span>
                <Text type="secondary">Sergeant score:</Text>{" "}
                {link.sergeant_guilt_score != null ? (
                  link.sergeant_guilt_score
                ) : (
                  "—"
                )}
              </span>

              {/* Add button for Sergeants to approve and release */}
              {link.case_priority === "LEVEL2" || link.case_priority === "LEVEL3" ? (
                <Space>
                  {link.sergeant_approval ? (
                    <Button
                      size="small"
                      type="primary"
                      onClick={() => handleApproveAndRelease(link.id)}
                      loading={suspectActionLinkId === link.id}
                    >
                      Approve and Release
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      danger
                      onClick={() => handleApproveAndRelease(link.id)}
                      loading={suspectActionLinkId === link.id}
                    >
                      Mark for Release (Pending Approval)
                    </Button>
                  )}
                </Space>
              ) : null}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
  };
  
  async function loadDetectives() {
    if (!canAssignDetective) return;
    setIsDetectivesLoading(true);
    try {
      const data = await listCaseDetectives();
      const list = Array.isArray(data) ? data : data?.results || [];
      const options = list.map((item) => ({
        label: `${item.full_name || item.username || item.id} — ${item.national_id || "-"}`,
        value: item.id,
      }));
      setDetectiveOptions(options);
    } catch (err) {
      message.error(err.message || "Failed to load detectives.");
      setDetectiveOptions([]);
    } finally {
      setIsDetectivesLoading(false);
    }
  }

  async function fetchData(
    nextPage = page,
    nextPageSize = pageSize,
    nextStatus = status
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

  useEffect(() => {
    if (!isModalOpen || !selected || !canAssignDetective) return;
    loadDetectives();
    setAssignDetectiveId(selected.assigned_detective || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, selected, canAssignDetective]);

  async function fetchSuspectLinks() {
    if (!selected?.id) return;
    setSuspectLinksLoading(true);
    try {
      const data = await listSuspectLinks(selected.id);
      const list = Array.isArray(data) ? data : data?.results || data?.data || [];
      setSuspectLinks(list);
    } catch (err) {
      message.error(err.message || "Failed to load suspects.");
      setSuspectLinks([]);
    } finally {
      setSuspectLinksLoading(false);
    }
  }

  useEffect(() => {
    if (!isModalOpen || !selected) return;
    fetchSuspectLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen, selected?.id]);

  async function handleMarkWanted(link) {
    if (!selected?.id) return;
    setSuspectActionLinkId(link.id);
    try {
      await markSuspectWanted(selected.id, link.id);
      message.success("Suspect marked as wanted.");
      fetchSuspectLinks();
    } catch (err) {
      message.error(err.message || "Failed to mark suspect as wanted.");
    } finally {
      setSuspectActionLinkId(null);
    }
  }

  async function handleMarkCaptured(link) {
    if (!selected?.id) return;
    setSuspectActionLinkId(link.id);
    try {
      await markSuspectCaptured(selected.id, link.id, {});
      message.success("Suspect marked as captured.");
      fetchSuspectLinks();
    } catch (err) {
      message.error(err.message || "Failed to mark suspect as captured.");
    } finally {
      setSuspectActionLinkId(null);
    }
  }

  async function handleGuiltScoreSubmit() {
    const values = await guiltScoreForm.validateFields();
    const { link, type } = guiltScoreModal;
    if (!selected?.id || !link || !type) return;
    setSuspectActionLinkId(link.id);
    try {
      if (type === "detective") {
        await detectiveAssessment(
          selected.id,
          link.id,
          { guilt_score: values.guilt_score }
        );
        message.success("Detective guilt score recorded.");
      } else {
        await sergeantAssessment(
          selected.id,
          link.id,
          { guilt_score: values.guilt_score }
        );
        message.success("Sergeant guilt score recorded.");
      }
      setGuiltScoreModal({ open: false, link: null, type: null });
      guiltScoreForm.resetFields();
      fetchSuspectLinks();
    } catch (err) {
      message.error(err.message || "Failed to save guilt score.");
    } finally {
      setSuspectActionLinkId(null);
    }
  }

  async function handleCaptainOpinionSubmit() {
    const values = await captainOpinionForm.validateFields();
    const { link } = captainOpinionModal;
    if (!selected?.id || !link) return;
    setSuspectActionLinkId(link.id);
    try {
      await captainOpinion(selected.id, link.id, { opinion: values.opinion });
      message.success("Captain opinion recorded.");
      setCaptainOpinionModal({ open: false, link: null });
      captainOpinionForm.resetFields();
      fetchSuspectLinks();
    } catch (err) {
      message.error(err.message || "Failed to save captain opinion.");
    } finally {
      setSuspectActionLinkId(null);
    }
  }

  async function handleChiefApproval(link, approved) {
    if (!selected?.id) return;
    setSuspectActionLinkId(link.id);
    try {
      await chiefApproval(selected.id, link.id, { approved });
      message.success(approved ? "Captain opinion approved." : "Captain opinion rejected.");
      fetchSuspectLinks();
    } catch (err) {
      message.error(err.message || "Failed to record chief decision.");
    } finally {
      setSuspectActionLinkId(null);
    }
  }

  async function handleAssignDetective() {
    if (!selected?.id) return;
    if (!assignDetectiveId) {
      message.error("Please select a detective.");
      return;
    }
    setIsAssigningDetective(true);
    try {
      const updatedCase = await assignCaseDetective(
        selected.id,
        assignDetectiveId
      );
      message.success("Detective assigned successfully.");
      setSelected(updatedCase || selected);
      await fetchData(page, pageSize, status);
    } catch (err) {
      message.error(err.message || "Failed to assign detective.");
    } finally {
      setIsAssigningDetective(false);
    }
  }

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
              <div className="flex flex-col gap-4">
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

                {canAssignDetective ? (
                  <div className="flex flex-col gap-2">
                    <Text strong>Assign Detective</Text>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={assignDetectiveId}
                        onChange={setAssignDetectiveId}
                        options={detectiveOptions}
                        loading={isDetectivesLoading}
                        placeholder="Select detective"
                        className="min-w-72"
                        showSearch
                        filterOption={(input, option) =>
                          String(option?.label || "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                      />
                      <Button
                        type="primary"
                        onClick={handleAssignDetective}
                        loading={isAssigningDetective}
                      >
                        Assign
                      </Button>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col gap-2">
                  <Text strong>Suspects</Text>
                  {suspectLinksLoading ? (
                    <Spin size="small" />
                  ) : suspectLinks.length === 0 ? (
                    <Text type="secondary">No suspects linked to this case.</Text>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {suspectLinks.map((link) => (
                        <Card key={link.id} size="small">
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <Text strong>
                                  {link.suspect_name || `${link.suspect_national_id || "—"}`}
                                </Text>
                                <div className="mt-0.5">
                                  <Text type="secondary" className="text-xs">
                                    National ID: {link.suspect_national_id || "-"}
                                  </Text>
                                  {" · "}
                                  <Tag color={link.suspect_is_wanted ? "red" : "green"}>
                                    {link.suspect_status || "-"}
                                  </Tag>
                                </div>
                              </div>
                              {canManageSuspectState ? (
                                <Space>
                                  {!link.suspect_is_wanted ? (
                                    <Button
                                      size="small"
                                      danger
                                      onClick={() => handleMarkWanted(link)}
                                      loading={suspectActionLinkId === link.id}
                                    >
                                      Mark as Wanted
                                    </Button>
                                  ) : null}
                                  {link.suspect_is_wanted ? (
                                    <Button
                                      size="small"
                                      type="primary"
                                      onClick={() => handleMarkCaptured(link)}
                                      loading={suspectActionLinkId === link.id}
                                    >
                                      Mark as Captured
                                    </Button>
                                  ) : null}
                                </Space>
                              ) : null}
                            </div>

                            {/* Guilt scores & approval workflow (after arrest) */}
                            <div className="border-t pt-2 mt-1">
                              <div className="flex flex-wrap items-center gap-3 text-sm">
                                <span>
                                  <Text type="secondary">Detective score:</Text>{" "}
                                  {link.detective_guilt_score != null ? (
                                    link.detective_guilt_score
                                  ) : isDetective ? (
                                    <Button
                                      type="link"
                                      size="small"
                                      className="p-0 h-auto"
                                      onClick={() => {
                                        setGuiltScoreModal({ open: true, link, type: "detective" });
                                        guiltScoreForm.setFieldsValue({ guilt_score: 5 });
                                      }}
                                    >
                                      Set (1–10)
                                    </Button>
                                  ) : (
                                    "—"
                                  )}
                                </span>
                                <span>
                                  <Text type="secondary">Sergeant score:</Text>{" "}
                                  {link.sergeant_guilt_score != null ? (
                                    link.sergeant_guilt_score
                                  ) : isSergeant ? (
                                    <Button
                                      type="link"
                                      size="small"
                                      className="p-0 h-auto"
                                      onClick={() => {
                                        setGuiltScoreModal({ open: true, link, type: "sergeant" });
                                        guiltScoreForm.setFieldsValue({ guilt_score: 5 });
                                      }}
                                    >
                                      Set (1–10)
                                    </Button>
                                  ) : (
                                    "—"
                                  )}
                                </span>
                                {link.average_guilt_score != null ? (
                                  <span>
                                    <Text type="secondary">Average:</Text> {link.average_guilt_score.toFixed(1)}
                                  </span>
                                ) : null}
                              </div>
                              {link.has_both_assessments ? (
                                <div className="mt-2">
                                  <Text type="secondary" className="text-xs">Captain opinion: </Text>
                                  {link.captain_opinion ? (
                                    <div className="mt-0.5 text-sm">{link.captain_opinion}</div>
                                  ) : isCaptain ? (
                                    <Button
                                      type="link"
                                      size="small"
                                      className="p-0 h-auto"
                                      onClick={() => {
                                        setCaptainOpinionModal({ open: true, link });
                                        captainOpinionForm.resetFields();
                                      }}
                                    >
                                      Set opinion (statements, documents, scores)
                                    </Button>
                                  ) : (
                                    "—"
                                  )}
                                </div>
                              ) : null}
                              {link.is_critical_case && link.captain_opinion && link.chief_approved == null && isPoliceChief ? (
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    size="small"
                                    danger
                                    onClick={() => handleChiefApproval(link, false)}
                                    loading={suspectActionLinkId === link.id}
                                  >
                                    Reject
                                  </Button>
                                  <Button
                                    size="small"
                                    type="primary"
                                    onClick={() => handleChiefApproval(link, true)}
                                    loading={suspectActionLinkId === link.id}
                                  >
                                    Approve
                                  </Button>
                                </div>
                              ) : link.is_critical_case && link.chief_approved != null ? (
                                <div className="mt-1 text-xs">
                                  <Tag color={link.chief_approved ? "green" : "red"}>
                                    Chief: {link.chief_approved ? "Approved" : "Rejected"}
                                  </Tag>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </Modal>

          <Modal
            title={guiltScoreModal.type === "detective" ? "Detective Guilt Score" : "Sergeant Guilt Score"}
            open={guiltScoreModal.open}
            onCancel={() => {
              setGuiltScoreModal({ open: false, link: null, type: null });
              guiltScoreForm.resetFields();
            }}
            onOk={handleGuiltScoreSubmit}
            okText="Save"
          >
            <Form form={guiltScoreForm} layout="vertical">
              <Form.Item
                name="guilt_score"
                label="Probability of guilt (1–10)"
                rules={[
                  { required: true, message: "Required" },
                  { type: "number", min: 1, max: 10, message: "Must be 1–10" },
                ]}
              >
                <InputNumber min={1} max={10} className="w-full" />
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title="Captain Opinion"
            open={captainOpinionModal.open}
            onCancel={() => {
              setCaptainOpinionModal({ open: false, link: null });
              captainOpinionForm.resetFields();
            }}
            onOk={handleCaptainOpinionSubmit}
            okText="Save"
            width={500}
          >
            <Form form={captainOpinionForm} layout="vertical">
              <Form.Item
                name="opinion"
                label="Final opinion (statements, documents, scores)"
                rules={[{ required: true, message: "Opinion is required" }]}
              >
                <Input.TextArea rows={5} placeholder="Final opinion with statements, documents, and scores" />
              </Form.Item>
            </Form>
          </Modal>
        </div>
      </div>
    </div>
  );
}
