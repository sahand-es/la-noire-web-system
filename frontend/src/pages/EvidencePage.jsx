import { useEffect, useMemo, useState } from "react";
import {
  Card,
  Form,
  Input,
  Select,
  Tabs,
  Button,
  Table,
  Space,
  Spin,
  message,
  Checkbox,
} from "antd";
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
      {
        title: "Title",
        dataIndex: "title",
        key: "title",
        render: (v) => v || "-",
      },
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (v) => v || "-",
      },
      {
        title: "Recorded At",
        dataIndex: "created_at",
        key: "created_at",
        width: 200,
        render: (v) => v || "-",
      },
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
                <Button
                  onClick={() => fetchEvidence(caseId, activeTab)}
                  disabled={!caseId || dataLoading}
                >
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
            <Button
              onClick={() => fetchCases(caseSearch)}
              disabled={casesLoading}
            >
              Reload cases
            </Button>
          </div>
        </Card>

        <Card>
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
          />
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <div className="font-medium mb-3">Add New</div>

              <Form layout="vertical" form={form} onFinish={onCreate}>
                <Form.Item label="Title" name="title">
                  <Input placeholder="Auto-generated if empty" />
                </Form.Item>

                <Form.Item
                  label="Description"
                  name="description"
                  rules={[
                    { required: true, message: "Description is required." },
                  ]}
                >
                  <Input.TextArea rows={3} />
                </Form.Item>

                <Form.Item
                  label="Collection Location"
                  name="location"
                  rules={[{ required: true, message: "Location is required." }]}
                >
                  <Input placeholder="Address or place where evidence was collected" />
                </Form.Item>

                {activeTab === "testimony" && (
                  <>
                    <Form.Item
                      label="Witness Name"
                      name="witness_name"
                      rules={[
                        {
                          required: true,
                          message: "Witness name is required.",
                        },
                      ]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item label="Witness Contact" name="witness_contact">
                      <Input placeholder="Phone number" />
                    </Form.Item>
                    <Form.Item label="Witness Address" name="witness_address">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item
                      label="Testimony Date"
                      name="testimony_date"
                      rules={[
                        {
                          required: true,
                          message: "Testimony date is required.",
                        },
                      ]}
                    >
                      <Input type="datetime-local" />
                    </Form.Item>
                    <Form.Item
                      label="Testimony Text"
                      name="testimony_text"
                      rules={[
                        {
                          required: true,
                          message: "Testimony text is required.",
                        },
                      ]}
                    >
                      <Input.TextArea
                        rows={4}
                        placeholder="Witness statement"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Credibility Score (1-10)"
                      name="credibility_score"
                      initialValue={5}
                    >
                      <Input type="number" min={1} max={10} />
                    </Form.Item>
                  </>
                )}

                {activeTab === "bio" && (
                  <>
                    <Form.Item
                      label="Sample Type"
                      name="sample_type"
                      rules={[
                        { required: true, message: "Sample type is required." },
                      ]}
                    >
                      <Input placeholder="e.g., Blood, DNA, Hair, Fingerprint" />
                    </Form.Item>
                    <Form.Item
                      label="Sample Quantity"
                      name="sample_quantity"
                      rules={[
                        {
                          required: true,
                          message: "Sample quantity is required.",
                        },
                      ]}
                    >
                      <Input placeholder="e.g., 5ml, 2 strands, 1 sample" />
                    </Form.Item>
                    <Form.Item
                      label="Storage Location"
                      name="storage_location"
                      rules={[
                        {
                          required: true,
                          message: "Storage location is required.",
                        },
                      ]}
                    >
                      <Input placeholder="Where sample is stored" />
                    </Form.Item>
                    <Form.Item label="Lab Results" name="lab_results">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item label="Match Details" name="match_details">
                      <Input.TextArea rows={2} />
                    </Form.Item>
                  </>
                )}

                {activeTab === "vehicle" && (
                  <>
                    <Form.Item
                      label="Vehicle Type"
                      name="vehicle_type"
                      rules={[
                        {
                          required: true,
                          message: "Vehicle type is required.",
                        },
                      ]}
                    >
                      <Input placeholder="e.g., Car, Motorcycle, Truck" />
                    </Form.Item>
                    <Form.Item label="Make" name="make">
                      <Input placeholder="e.g., Toyota, Honda" />
                    </Form.Item>
                    <Form.Item label="Model" name="model">
                      <Input placeholder="e.g., Camry, Accord" />
                    </Form.Item>
                    <Form.Item label="Year" name="year">
                      <Input type="number" placeholder="e.g., 2020" />
                    </Form.Item>
                    <Form.Item label="Color" name="color">
                      <Input placeholder="Vehicle color" />
                    </Form.Item>
                    <Form.Item label="License Plate" name="license_plate">
                      <Input placeholder="Cannot set both plate and VIN" />
                    </Form.Item>
                    <Form.Item label="VIN Number" name="vin_number">
                      <Input placeholder="Cannot set both plate and VIN" />
                    </Form.Item>
                    <Form.Item label="Owner Name" name="owner_name">
                      <Input />
                    </Form.Item>
                    <Form.Item label="Condition" name="condition">
                      <Input.TextArea
                        rows={2}
                        placeholder="Vehicle condition notes"
                      />
                    </Form.Item>
                  </>
                )}

                {activeTab === "doc" && (
                  <>
                    <Form.Item
                      label="Document Type"
                      name="document_type"
                      rules={[
                        {
                          required: true,
                          message: "Document type is required.",
                        },
                      ]}
                    >
                      <Input placeholder="e.g., National ID, Passport, Contract" />
                    </Form.Item>
                    <Form.Item label="Document Date" name="document_date">
                      <Input type="date" />
                    </Form.Item>
                    <Form.Item label="Owner Full Name" name="owner_full_name">
                      <Input placeholder="Name on the document" />
                    </Form.Item>
                    <Form.Item label="Issuer" name="issuer">
                      <Input placeholder="Organization that issued document" />
                    </Form.Item>
                    <Form.Item label="Content Summary" name="content_summary">
                      <Input.TextArea
                        rows={3}
                        placeholder="Brief description of document content"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Is Identification Document"
                      name="is_identification_document"
                      valuePropName="checked"
                    >
                      <Checkbox>
                        This is an ID document (passport, license, etc.)
                      </Checkbox>
                    </Form.Item>
                  </>
                )}

                {activeTab === "other" && (
                  <>
                    <Form.Item
                      label="Item Name"
                      name="item_name"
                      rules={[
                        { required: true, message: "Item name is required." },
                      ]}
                    >
                      <Input placeholder="Name of the item" />
                    </Form.Item>
                    <Form.Item
                      label="Item Category"
                      name="item_category"
                      rules={[
                        {
                          required: true,
                          message: "Item category is required.",
                        },
                      ]}
                    >
                      <Input placeholder="e.g., Weapon, Electronics, Jewelry" />
                    </Form.Item>
                    <Form.Item
                      label="Physical Description"
                      name="physical_description"
                      rules={[
                        {
                          required: true,
                          message: "Physical description is required.",
                        },
                      ]}
                    >
                      <Input.TextArea
                        rows={3}
                        placeholder="Detailed physical description"
                      />
                    </Form.Item>
                    <Form.Item
                      label="Condition"
                      name="condition"
                      rules={[
                        { required: true, message: "Condition is required." },
                      ]}
                    >
                      <Input placeholder="e.g., Good, Damaged, Broken" />
                    </Form.Item>
                    <Form.Item label="Size/Dimensions" name="size_dimensions">
                      <Input placeholder="e.g., 10cm x 5cm x 3cm" />
                    </Form.Item>
                    <Form.Item label="Weight" name="weight">
                      <Input placeholder="e.g., 500g" />
                    </Form.Item>
                    <Form.Item label="Material" name="material">
                      <Input placeholder="e.g., Metal, Plastic, Wood" />
                    </Form.Item>
                    <Form.Item label="Serial Number" name="serial_number">
                      <Input />
                    </Form.Item>
                  </>
                )}

                <Form.Item label="Notes" name="notes">
                  <Input.TextArea
                    rows={2}
                    placeholder="Additional notes (optional)"
                  />
                </Form.Item>

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
