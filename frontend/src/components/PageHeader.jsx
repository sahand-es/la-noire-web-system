import { Button, Typography } from "antd";

const { Title, Text } = Typography;

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex flex-col gap-1">
        <Title level={3} className="m-0">
          {title}
        </Title>
        {subtitle ? <Text type="secondary">{subtitle}</Text> : null}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {actions}
      </div>
    </div>
  );
}