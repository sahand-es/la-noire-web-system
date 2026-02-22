import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Space, Typography, message, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { getComplaint, updateComplaint, submitComplaint } from "../api/complaints";

const { Title, Paragraph, Text } = Typography;

function canEdit(complaint) {
  const status = complaint?.status || "";
  return status.toLowerCase().includes("returned") || status.toLowerCase().includes("cadet_returned");
}

export function EditComplaintPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form] = Form.useForm();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [complaint, setComplaint] = useState(null);

  async function fetchComplaint() {
    setIsLoading(true);
    try {
      const data = await getComplaint(id);
      setComplaint(data);
      form.setFieldsValue({
        title: data.title,
        description: data.description,
        incident_date: data.incident_date,
        incident_location: data.incident_location,
      });
    } catch (err) {
      message.error(err.message || "Failed to load complaint.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchComplaint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave(values) {
    setIsSaving(true);
    try {
      await updateComplaint(id, values);
      message.success("Saved.");
      fetchComplaint();
    } catch (err) {
      message.error(err.message || "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function onSubmit() {
    if (!complaint) return;

    if (!canEdit(complaint)) {
      message.error("This complaint is not editable in its current status.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitComplaint(id);
      message.success("Submitted to cadet.");
      navigate("/complaints");
    } catch (err) {
      message.error(err.message || "Failed to submit complaint.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex justify-center items-start">
        <Spin />
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <Title level={3} className="m-0">
              Complaint
            </Title>
            <Paragraph className="mt-2 mb-0">Not found.</Paragraph>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Title level={3} className="m-0">
              Edit Complaint
            </Title>
            <Space>
              <Button onClick={() => navigate("/complaints")}>Back</Button>
            </Space>
          </div>

          <div className="mt-3">
            <Text type="secondary">Status: {complaint.status || "-"}</Text>
            <div className="mt-1">
              <Text type="secondary">
                Corrections: {typeof complaint.correction_count === "number" ? complaint.correction_count : "-"}
              </Text>
            </div>

            {complaint.cadet_message ? (
              <Paragraph className="mt-2">
                <Text strong>Cadet message:</Text> {complaint.cadet_message}
              </Paragraph>
            ) : null}
          </div>

          <Form layout="vertical" form={form} onFinish={onSave} className="mt-4">
            <Form.Item
              label="Title"
              name="title"
              rules={[{ required: true, message: "Title is required." }]}
            >
              <Input disabled={!canEdit(complaint)} />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              rules={[{ required: true, message: "Description is required." }]}
            >
              <Input.TextArea rows={5} disabled={!canEdit(complaint)} />
            </Form.Item>

            <Form.Item
              label="Incident Date"
              name="incident_date"
              rules={[{ required: true, message: "Incident date is required." }]}
            >
              <Input placeholder="YYYY-MM-DD" disabled={!canEdit(complaint)} />
            </Form.Item>

            <Form.Item
              label="Incident Location"
              name="incident_location"
              rules={[{ required: true, message: "Incident location is required." }]}
            >
              <Input disabled={!canEdit(complaint)} />
            </Form.Item>

            <div className="flex justify-end gap-2">
              <Button htmlType="submit" loading={isSaving} disabled={!canEdit(complaint)}>
                Save
              </Button>
              <Button
                type="primary"
                onClick={onSubmit}
                loading={isSubmitting}
                disabled={!canEdit(complaint)}
              >
                Submit
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}