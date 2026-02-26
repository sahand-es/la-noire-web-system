import { useEffect, useState } from "react";
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Typography,
  message,
  Popconfirm,
  Tag,
} from "antd";
import {
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title } = Typography;

export function AdminTableView({
  title,
  fetchData,
  createItem,
  updateItem,
  deleteItem,
  columns,
  formFields,
  searchFields = [],
  fieldOptions = {},
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await fetchData();
      setData(Array.isArray(result) ? result : result?.results || []);
    } catch (err) {
      console.error("Load data error:", err);
      message.error(err?.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    const formData = { ...record };

    formFields.forEach((field) => {
      if (
        field.type === "select" &&
        field.multiple &&
        Array.isArray(formData[field.name])
      ) {
        // Special handling for roles: always map to array of IDs
        if (field.name === "roles") {
          formData[field.name] = formData[field.name].map((item) =>
            item && typeof item === "object" && typeof item.id !== "undefined"
              ? item.id
              : item,
          );
        } else {
          formData[field.name] = formData[field.name].map((item) => {
            if (item && typeof item === "object") {
              if (typeof item.id !== "undefined") {
                return item.id;
              }
              if (typeof item.value !== "undefined") {
                return item.value;
              }
            }
            return item;
          });
        }
      }
      if (field.type === "date" && formData[field.name]) {
        formData[field.name] = dayjs(formData[field.name]);
      }
      if (field.type === "datetime" && formData[field.name]) {
        formData[field.name] = dayjs(formData[field.name]);
      }
    });

    form.setFieldsValue(formData);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      await deleteItem(id);
      message.success("Deleted successfully");
      loadData();
    } catch (err) {
      console.error("Delete error:", err);
      message.error(err?.message || "Failed to delete");
    }
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = { ...values };

      formFields.forEach((field) => {
        if (
          (field.type === "date" || field.type === "datetime") &&
          submitData[field.name]
        ) {
          submitData[field.name] = submitData[field.name].format(
            field.type === "date" ? "YYYY-MM-DD" : "YYYY-MM-DDTHH:mm:ss",
          );
        }
      });

      if (editingItem) {
        await updateItem(editingItem.id, submitData);
        message.success("Updated successfully");
      } else {
        await createItem(submitData);
        message.success("Created successfully");
      }
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (err) {
      console.error("Submit error:", err);
      message.error(err?.message || "Failed to save");
    }
  };

  const renderFormField = (field) => {
    const commonProps = {
      label: field.label,
      name: field.name,
      rules: field.required
        ? [{ required: true, message: `${field.label} is required` }]
        : [],
    };

    switch (field.type) {
      case "select":
        return (
          <Form.Item {...commonProps}>
            <Select
              options={field.options ?? fieldOptions[field.name]}
              placeholder={`Select ${field.label}`}
              showSearch={field.searchable}
              mode={field.multiple ? "multiple" : undefined}
              filterOption={
                field.searchable
                  ? (input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes((input || "").toLowerCase())
                  : undefined
              }
            />
          </Form.Item>
        );
      case "textarea":
        return (
          <Form.Item {...commonProps}>
            <Input.TextArea rows={4} placeholder={field.placeholder} />
          </Form.Item>
        );
      case "date":
        return (
          <Form.Item {...commonProps}>
            <DatePicker className="w-full" />
          </Form.Item>
        );
      case "datetime":
        return (
          <Form.Item {...commonProps}>
            <DatePicker showTime className="w-full" />
          </Form.Item>
        );
      case "number":
        return (
          <Form.Item {...commonProps}>
            <Input type="number" placeholder={field.placeholder} />
          </Form.Item>
        );
      case "password":
        return (
          <Form.Item {...commonProps}>
            <Input.Password placeholder={field.placeholder} />
          </Form.Item>
        );
      default:
        return (
          <Form.Item {...commonProps}>
            <Input placeholder={field.placeholder} disabled={field.readonly} />
          </Form.Item>
        );
    }
  };

  const actionColumn = {
    title: "Actions",
    key: "actions",
    fixed: "right",
    width: 120,
    render: (_, record) => (
      <Space>
        <Button
          type="link"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        />
        <Popconfirm
          title="Are you sure you want to delete this item?"
          onConfirm={() => handleDelete(record.id)}
          okText="Yes"
          cancelText="No"
        >
          <Button type="link" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <Title level={2}>{title}</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Add New
          </Button>
        </Space>
      </div>

      <Table
        dataSource={data}
        columns={[...columns, actionColumn]}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={(newPagination) => setPagination(newPagination)}
        scroll={{ x: "max-content" }}
      />

      <Modal
        title={editingItem ? `Edit ${title}` : `Create ${title}`}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          form.resetFields();
        }}
        footer={null}
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            {formFields.map((field) => (
              <div
                key={field.name}
                className={field.fullWidth ? "md:col-span-2" : ""}
              >
                {renderFormField(field)}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setModalVisible(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editingItem ? "Update" : "Create"}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
