import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function NewComplaintPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            File a Complaint
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: complaint create form connected to POST /complaints/.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}