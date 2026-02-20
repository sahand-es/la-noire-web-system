import { useState, useEffect } from "react";
import { Card, Table, Tag, Typography, Space, Button, message } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { get } from "../../api/request";

const { Title } = Typography;

export function PermissionsAdmin() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await get("permissions/");
      setData(Array.isArray(result) ? result : result?.results || []);
    } catch (err) {
      console.error("Load permissions error:", err);
      message.error(err?.message || "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "Codename",
      dataIndex: "codename",
      key: "codename",
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Roles",
      dataIndex: "roles",
      key: "roles",
      render: (roles) => (
        <>
          {roles?.map((role) => (
            <Tag key={role.id}>{role.name}</Tag>
          ))}
        </>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <Title level={2}>Permissions</Title>
        <Button icon={<ReloadOutlined />} onClick={loadData}>
          Refresh
        </Button>
      </div>

      <Card>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </div>
  );
}
