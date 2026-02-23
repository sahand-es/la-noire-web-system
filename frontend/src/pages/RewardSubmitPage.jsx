import { useState } from "react";
import { Button, Card, Form, Input, Select, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { submitRewardTip } from "../api/rewards";

const { Paragraph } = Typography;

export function RewardSubmitPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onFinish(values) {
    setIsSubmitting(true);
    try {
      await submitRewardTip(values);
      message.success("Reward information submitted.");
      navigate("/rewards");
    } catch (err) {
      message.error(err.message || "Failed to submit reward information.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        <Card>
          <PageHeader
            title="Submit Reward Information"
            subtitle="Send information about a case or suspect. If approved, you’ll receive a unique code."
          />
          <Paragraph className="mt-3 mb-0">
            Provide accurate details. Police will review your submission.
          </Paragraph>
        </Card>

        <Card>
          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Type"
              name="tip_type"
              rules={[{ required: true, message: "Type is required." }]}
            >
              <Select
                options={[
                  { label: "Case", value: "case" },
                  { label: "Suspect", value: "suspect" },
                ]}
              />
            </Form.Item>

            <Form.Item label="Case ID (optional)" name="case_id">
              <Input placeholder="Case numeric id (if known)" />
            </Form.Item>

            <Form.Item label="Suspect National ID (optional)" name="suspect_national_id">
              <Input placeholder="National ID (if known)" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
              rules={[{ required: true, message: "Description is required." }]}
            >
              <Input.TextArea rows={5} />
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