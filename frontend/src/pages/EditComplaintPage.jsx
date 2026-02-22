import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Space, Typography, message, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { getComplaint, updateComplaint } from "../api/complaints";

const { Title, Paragraph, Text } = Typography;

function canEdit(complaint) {
  return complaint?.status === "RETURNED_TO_COMPLAINANT" && !complaint?.is_voided;
}

export function EditComplaintPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
      setComplaint(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchComplaint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function onSave(values) {
    if (!complaint) return;

    if (!canEdit(complaint)) {
      message.error("You can only edit complaints returned to you by the cadet.");
      return;
    }

    setIsSaving(true);
    try {
      await updateComplaint(id, values);
      message.success("Saved and re-submitted to cadet.");
      navigate("/complaints");
    } catch (err) {
      message.error(err.message || "Failed to save.");
    } finally {
      setIsSaving(false);
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
            <div className="mt-3">
              <Button onClick={() => navigate("/complaints")}>Back to complaints</Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const editable = canEdit(complaint);

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
                Rejections: {typeof complaint.rejection_count === "number" ? complaint.rejection_count : "-"}
              </Text>
            </div>
            {complaint.cadet_message ? (
              <Paragraph className="mt-2">
                <Text strong>Cadet message:</Text> {complaint.cadet_message}
              </Paragraph>
            ) : null}
            {!editable ? (
              <Paragraph className="mt-2">
                <Text type="secondary">
                  You can only edit when the status is RETURNED_TO_COMPLAINANT (and not voided).
                </Text>
              </Paragraph>
            ) : null}
          </div>

          <Form layout="vertical" form={form} onFinish={onSave} className="mt-4">
            <Form.Item label="Title" name="title" rules={[{ required: true }]}>
              <Input disabled={!editable} />
            </Form.Item>

            <Form.Item label="Description" name="description" rules={[{ required: true }]}>
              <Input.TextArea rows={5} disabled={!editable} />
            </Form.Item>

            <Form.Item label="Incident Date" name="incident_date" rules={[{ required: true }]}>
              <Input disabled={!editable} />
            </Form.Item>

            <Form.Item label="Incident Location" name="incident_location" rules={[{ required: true }]}>
              <Input disabled={!editable} />
            </Form.Item>

            <div className="flex justify-end gap-2">
              <Button type="primary" htmlType="submit" loading={isSaving} disabled={!editable}>
                Save
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}