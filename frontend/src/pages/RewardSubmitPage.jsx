import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Select, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { submitRewardTip } from "../api/rewards";
import { listAllCaseNames } from "../api/cases";
import { listIntensivePursuit } from "../api/calls";

const { Paragraph } = Typography;

export function RewardSubmitPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [caseOptions, setCaseOptions] = useState([]);
  const [suspectOptions, setSuspectOptions] = useState([]);

  function normalizeRows(data) {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
  }

  async function loadOptions() {
    setIsOptionsLoading(true);
    try {
      const [casesData, suspectsData] = await Promise.all([
        listAllCaseNames(),
        listIntensivePursuit({ page: 1, pageSize: 100 }),
      ]);

      const nextCaseOptions = normalizeRows(casesData).map((caseItem) => ({
        label: `${caseItem.case_number || caseItem.id} — ${caseItem.title || "Untitled"}`,
        value: caseItem.id,
      }));

      const nextSuspectOptions = normalizeRows(suspectsData)
        .filter((suspect) => !!suspect.national_id)
        .map((suspect) => ({
          label:
            `${suspect.full_name || `${suspect.first_name || ""} ${suspect.last_name || ""}`.trim() || "Unknown"}` +
            ` — ${suspect.national_id}`,
          value: suspect.national_id,
        }));

      setCaseOptions(nextCaseOptions);
      setSuspectOptions(nextSuspectOptions);
    } catch (err) {
      message.error(err.message || "Failed to load case and suspect options.");
      setCaseOptions([]);
      setSuspectOptions([]);
    } finally {
      setIsOptionsLoading(false);
    }
  }

  useEffect(() => {
    loadOptions();
  }, []);

  async function onFinish(values) {
    const informationParts = [];
    if (values.tip_type === "case") {
      informationParts.push("Information type: case");
    }
    if (values.tip_type === "suspect") {
      informationParts.push("Information type: suspect");
    }
    if (values.suspect_national_id) {
      informationParts.push(
        `Suspect national ID: ${values.suspect_national_id}`,
      );
    }
    informationParts.push(values.description);

    const payload = {
      case: values.case_id,
      description: values.description,
      information_submitted: informationParts.filter(Boolean).join("\n"),
    };

    setIsSubmitting(true);
    try {
      await submitRewardTip(payload);
      message.success(
        "Reward information submitted. It will be reviewed by police.",
      );
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
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Type"
              name="tip_type"
              initialValue="case"
              rules={[{ required: true, message: "Type is required." }]}
            >
              <Select
                options={[
                  { label: "Case", value: "case" },
                  { label: "Suspect", value: "suspect" },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Case"
              name="case_id"
              rules={[{ required: true, message: "Case is required." }]}
            >
              <Select
                placeholder="Choose a case"
                options={caseOptions}
                loading={isOptionsLoading}
                showSearch
                allowClear
                filterOption={(input, option) =>
                  String(option?.label || "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>

            <Form.Item
              shouldUpdate={(prev, cur) => prev.tip_type !== cur.tip_type}
              noStyle
            >
              {({ getFieldValue }) =>
                getFieldValue("tip_type") === "suspect" ? (
                  <Form.Item
                    label="Suspect"
                    name="suspect_national_id"
                    rules={[
                      {
                        required: true,
                        message: "Suspect is required for suspect information.",
                      },
                    ]}
                  >
                    <Select
                      placeholder="Choose a suspect"
                      options={suspectOptions}
                      loading={isOptionsLoading}
                      showSearch
                      allowClear
                      filterOption={(input, option) =>
                        String(option?.label || "")
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    />
                  </Form.Item>
                ) : null
              }
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
