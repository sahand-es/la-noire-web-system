import { useState } from "react";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { createComplaint } from "../api/complaints";

const { Title, Paragraph } = Typography;

export function NewComplaintPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onFinish(values) {
    setIsSubmitting(true);
    try {
      await createComplaint(values);
      message.success("Complaint submitted successfully. Pending cadet review.");
      navigate("/complaints");
    } catch (err) {
      message.error(err.message || "Failed to create complaint.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            File a Complaint
          </Title>
          <Paragraph className="mt-2">
            After submitting, it goes to a cadet for review. If returned, you can edit and resubmit.
          </Paragraph>

          <Form layout="vertical" onFinish={onFinish}>
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
              <Input.TextArea rows={5} />
            </Form.Item>

            <Form.Item
              label="Incident Date"
              name="incident_date"
              rules={[{ required: true, message: "Incident date is required." }]}
            >
              <Input placeholder="YYYY-MM-DD" />
            </Form.Item>

            <Form.Item
              label="Incident Location"
              name="incident_location"
              rules={[{ required: true, message: "Incident location is required." }]}
            >
              <Input />
            </Form.Item>

            <div className="flex justify-end">
              <Button type="primary" htmlType="submit" loading={isSubmitting}>
                Submit
              </Button>
            </div>
          </Form>
        </Card>
      </div>
    </div>
  );
}