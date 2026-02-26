import { useEffect, useState } from "react";
import {
  Card,
  Typography,
  Form,
  Input,
  Button,
  message,
  Tag,
  Space,
} from "antd";
import { getProfile, updateUser, changePassword } from "../api/calls";

const { Title, Text } = Typography;

export function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const p = await getProfile();
        setProfile(p || null);
      } catch (err) {
        console.error("Failed to load profile:", err);
        message.error(err?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAccountUpdate = async (values) => {
    try {
      await updateUser(profile.id, values);
      message.success("Profile updated");
      const refreshed = await getProfile();
      setProfile(refreshed);
      localStorage.setItem("user", JSON.stringify(refreshed));
    } catch (err) {
      console.error(err);
      message.error(err?.message || "Failed to update profile");
    }
  };

  const handleChangePassword = async (values) => {
    try {
      if (values.new_password !== values.confirm_password) {
        message.error("New passwords do not match");
        return;
      }
      await changePassword({
        current_password: values.current_password,
        new_password: values.new_password,
      });
      message.success("Password changed successfully");
    } catch (err) {
      console.error(err);
      message.error(err?.message || "Failed to change password");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Text>Loading profile...</Text>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center py-8">
            <Title level={4}>Profile not found</Title>
            <Text type="secondary">Please login again</Text>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Title level={2}>Profile</Title>
        </div>

        <Card title="Account">
          <Form
            layout="vertical"
            initialValues={{
              username: profile.username,
              first_name: profile.first_name,
              last_name: profile.last_name,
              email: profile.email,
            }}
            onFinish={handleAccountUpdate}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label="Username"
                name="username"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                label="Email"
                name="email"
                rules={[{ required: true, type: "email" }]}
              >
                <Input />
              </Form.Item>
              <Form.Item label="First name" name="first_name">
                <Input />
              </Form.Item>
              <Form.Item label="Last name" name="last_name">
                <Input />
              </Form.Item>
            </div>
            <div className="flex justify-end">
              <Button type="primary" htmlType="submit">
                Save
              </Button>
            </div>
          </Form>
        </Card>

        <Card title="Change password">
          <Form layout="vertical" onFinish={handleChangePassword}>
            <Form.Item
              label="Current password"
              name="current_password"
              rules={[{ required: true }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              label="New password"
              name="new_password"
              rules={[{ required: true }]}
            >
              <Input.Password />
            </Form.Item>
            <Form.Item
              label="Confirm new password"
              name="confirm_password"
              rules={[{ required: true }]}
            >
              <Input.Password />
            </Form.Item>
            <div className="flex justify-end">
              <Button type="primary" htmlType="submit">
                Change password
              </Button>
            </div>
          </Form>
        </Card>

        <Card title="Roles & Permissions">
          <div className="flex flex-col gap-2">
            <Text strong>Assigned roles</Text>
            <Space wrap>
              {Array.isArray(profile.roles) && profile.roles.length > 0 ? (
                profile.roles.map((r) => <Tag key={r.id}>{r.name}</Tag>)
              ) : (
                <Text type="secondary">No roles assigned</Text>
              )}
            </Space>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default ProfilePage;
