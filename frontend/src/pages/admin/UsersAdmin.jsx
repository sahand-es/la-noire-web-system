import { useEffect, useMemo, useState } from "react";
import { AdminTableView } from "../../components/admin/AdminTableView";
import { listUsers, updateUser, deleteUser, listRoles } from "../../api/calls";
import { Spin, Tag, message } from "antd";

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 80,
  },
  {
    title: "Username",
    dataIndex: "username",
    key: "username",
  },
  {
    title: "Full Name",
    dataIndex: "full_name",
    key: "full_name",
  },
  {
    title: "Email",
    dataIndex: "email",
    key: "email",
  },
  {
    title: "Phone",
    dataIndex: "phone_number",
    key: "phone_number",
  },
  {
    title: "National ID",
    dataIndex: "national_id",
    key: "national_id",
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
  {
    title: "Verified",
    dataIndex: "is_verified",
    key: "is_verified",
    render: (verified) => (
      <Tag color={verified ? "success" : "warning"}>{verified ? "Yes" : "No"}</Tag>
    ),
  },
  {
    title: "Active",
    dataIndex: "is_active",
    key: "is_active",
    render: (active) => (
      <Tag color={active ? "success" : "error"}>{active ? "Yes" : "No"}</Tag>
    ),
  },
];

const BASE_FORM_FIELDS = [
  {
    name: "username",
    label: "Username",
    type: "text",
    required: false,
    readonly: true,
  },
  {
    name: "first_name",
    label: "First Name",
    type: "text",
    required: true,
  },
  {
    name: "last_name",
    label: "Last Name",
    type: "text",
    required: true,
  },
  {
    name: "email",
    label: "Email",
    type: "text",
    required: true,
  },
  {
    name: "phone_number",
    label: "Phone Number",
    type: "text",
    required: true,
  },
  {
    name: "national_id",
    label: "National ID",
    type: "text",
    required: false,
    readonly: true,
  },
  {
    name: "roles",
    label: "Roles",
    type: "select",
    required: false,
    multiple: true,
    searchable: true,
    options: [],
    fullWidth: true,
  },
  {
    name: "is_verified",
    label: "Verified",
    type: "select",
    required: false,
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ],
  },
  {
    name: "is_active",
    label: "Active",
    type: "select",
    required: false,
    options: [
      { label: "Yes", value: true },
      { label: "No", value: false },
    ],
  },
];

export function UsersAdmin() {
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  useEffect(() => {
    const loadRoles = async () => {
      try {
        setLoadingRoles(true);
        const data = await listRoles();
        const rolesList = Array.isArray(data)
          ? data
          : Array.isArray(data?.results)
            ? data.results
            : [];

        const roleOptions = rolesList
          .filter((role) => role?.is_active !== false)
          .map((role) => ({ label: role.name, value: role.id }));

        setRoles(roleOptions);
      } catch (err) {
        console.error("Failed to load roles:", err);
        message.error(err?.message || "Failed to load roles");
      } finally {
        setLoadingRoles(false);
      }
    };

    loadRoles();
  }, []);

  const formFields = useMemo(
    () =>
      BASE_FORM_FIELDS.map((field) =>
        field.name === "roles" ? { ...field, options: roles } : field,
      ),
    [roles],
  );

  if (loadingRoles) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spin />
      </div>
    );
  }

  return (
    <AdminTableView
      title="Users"
      fetchData={listUsers}
      createItem={null}
      updateItem={(id, data) =>
        updateUser(id, { ...data, roles: data.roles || [] })
      }
      deleteItem={deleteUser}
      columns={columns}
      formFields={formFields}
    />
  );
}
