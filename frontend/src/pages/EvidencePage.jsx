import { useEffect, useMemo, useState } from "react";
import { Card, Form, Input, Select, Tabs, Button, Table, Space, Spin, message } from "antd";
import { PageHeader } from "../components/PageHeader";
import { listCases } from "../api/cases";
import {
  listWitnessTestimonies,
  createWitnessTestimony,
  listBiologicalEvidence,
  createBiologicalEvidence,
  listVehicleEvidence,
  createVehicleEvidence,
  listDocumentEvidence,
  createDocumentEvidence,
  listOtherEvidence,
  createOtherEvidence,
} from "../api/evidence";

function normalizeList(res) {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.results)) return res.results;
  return [];
}

export function EvidencePage() {
  const [casesLoading, setCasesLoading] = useState(true);
  const [caseOptions, setCaseOptions] = useState([]);
  const [caseId, setCaseId] = useState(null);

  const [activeTab, setActiveTab] = useState("testimony");
  const [dataLoading, setDataLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [caseSearch, setCaseSearch] = useState("");

  const [form] = Form.useForm();

  async function fetchCases(search = "") {
    setCasesLoading(true);
    try {
      const res = await listCases({ page: 1, pageSize: 50, search });
      const list = normalizeList(res);
      setCaseOptions(
        list.map((c) => ({
          label: `${c.case_number || c.id} — ${c.title || "Untitled"}`,
          value: c.id,
        })),
      );
    } catch (err) {
      message.error(err.message || "Failed to load cases.");
      setCaseOptions([]);
    } finally {
      setCasesLoading(false);
    }
  }

  async function fetchEvidence(nextCaseId = caseId, tab = activeTab) {
    if (!nextCaseId) return;
    setDataLoading(true);
    try {
      let res;
      if (tab === "testimony") res = await listWitnessTestimonies(nextCaseId);
      if (tab === "bio") res = await listBiologicalEvidence(nextCaseId);
      if (tab === "vehicle") res = await listVehicleEvidence(nextCaseId);
      if (tab === "doc") res = await listDocumentEvidence(nextCaseId);
      if (tab === "other") res = await listOtherEvidence(nextCaseId);

      setRows(normalizeList(res));
    } catch (err) {
      message.error(err.message || "Failed to load evidence.");
      setRows([]);
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    fetchCases("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    form.resetFields();
    if (caseId) fetchEvidence(caseId, activeTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, activeTab]);

  const columns = useMemo(() => {
    return [
      { title: "Title", dataIndex: "title", key: "title", render: (v) => v || "-" },
      { title: "Description", dataIndex: "description", key: "description", render: (v) => v || "-" },
      { title: "Recorded At", dataIndex: "created_at", key: "created_at", width: 200, render: (v) => v || "-" },
    ];
  }, []);

  async function onCreate(values) {
    if (!caseId) {
      message.error("Please select a case first.");
      return;
    }

    try {
      if (activeTab === "testimony") {
        await createWitnessTestimony(caseId, values);
      }
      if (activeTab === "bio") {
        await createBiologicalEvidence(caseId, values);
      }
      if (activeTab === "vehicle") {
        await createVehicleEvidence(caseId, values);
      }
      if (activeTab === "doc") {
        await createDocumentEvidence(caseId, values);
      }
      if (activeTab === "other") {
        await createOtherEvidence(caseId, values);
      }

      message.success("Evidence created.");
      form.resetFields();
      fetchEvidence(caseId, activeTab);
    } catch (err) {
      message.error(err.message || "Failed to create evidence.");
    }
  }

  const tabItems = [
    { key: "testimony", label: "Witness Testimony" },
    { key: "bio", label: "Biological" },
    { key: "vehicle", label: "Vehicle" },
    { key: "doc", label: "ID Document" },
    { key: "other", label: "Other" },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Evidence"
            subtitle="Select a case, then register and review evidence."
            actions={
              <Space>
                <Button onClick={() => fetchEvidence(caseId, activeTab)} disabled={!caseId || dataLoading}>
                  Refresh
                </Button>
              </Space>
            }
          />
          <div className="mt-4 flex items-center gap-3 flex-wrap">
            <div className="min-w-80">
              <Select
                value={caseId}
                onChange={setCaseId}
                placeholder="Select a case"
                options={caseOptions}
                loading={casesLoading}
                showSearch
                filterOption={false}
                onSearch={(v) => {
                  setCaseSearch(v);
                  fetchCases(v);
                }}
                allowClear
              />
            </div>
            <Button onClick={() => fetchCases(caseSearch)} disabled={casesLoading}>
              Reload cases
            </Button>
          </div>
        </Card>

        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <div className="font-medium mb-3">Add New</div>

              <Form layout="vertical" form={form} onFinish={onCreate}>
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
                  rules={[{ required: true, message: "Description is required." }]}
                >
                  <Input.TextArea rows={4} />
                </Form.Item>

                {activeTab === "testimony" ? (
                  <Form.Item label="Transcript" name="transcript">
                    <Input.TextArea rows={4} />
                  </Form.Item>
                ) : null}

                {activeTab === "vehicle" ? (
                  <>
                    <Form.Item label="Model" name="model" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="Color" name="color" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item label="License Plate" name="license_plate">
                      <Input />
                    </Form.Item>
                    <Form.Item label="Serial Number" name="serial_number">
                      <Input />
                    </Form.Item>
                  </>
                ) : null}

                {activeTab === "doc" ? (
                  <Form.Item label="Fields (JSON)" name="fields_json">
                    <Input.TextArea rows={4} placeholder='{"name":"John Doe","id":"..."}' />
                  </Form.Item>
                ) : null}

                <div className="flex justify-end">
                  <Button type="primary" htmlType="submit" disabled={!caseId}>
                    Create
                  </Button>
                </div>
              </Form>
            </Card>

            <Card>
              <div className="font-medium mb-3">Existing Evidence</div>
              {!caseId ? (
                <div className="py-8">Select a case to see evidence.</div>
              ) : dataLoading ? (
                <div className="flex justify-center py-10">
                  <Spin />
                </div>
              ) : (
                <Table
                  rowKey={(r) => r.id}
                  columns={columns}
                  dataSource={rows}
                  pagination={{ pageSize: 10 }}
                />
              )}
            </Card>
          </div>
        </Card>
      </div>
    </div>
  );
}