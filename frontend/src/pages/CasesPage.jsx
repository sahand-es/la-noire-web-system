import { Card, Typography } from "antd";

const { Title, Paragraph } = Typography;

export function CasesPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <Card>
          <Title level={3} className="m-0">
            Cases
          </Title>
          <Paragraph className="mt-2 mb-0">
            Next step: show role-filtered case list + case detail view.
          </Paragraph>
        </Card>
      </div>
    </div>
  );
}