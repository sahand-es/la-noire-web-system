import { AdminTableView } from "../../components/admin/AdminTableView";
import { listUsers, getUser, updateUser, deleteUser } from "../../api/calls";
import { Tag } from "antd";

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
      <Tag color={verified ? "green" : "orange"}>{verified ? "Yes" : "No"}</Tag>
    ),
  },
  {
    title: "Active",
    dataIndex: "is_active",
    key: "is_active",
    render: (active) => (
      <Tag color={active ? "green" : "red"}>{active ? "Yes" : "No"}</Tag>
    ),
  },
];

const formFields = [
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
  return (
    <AdminTableView
      title="Users"
      fetchData={listUsers}
      createItem={null}
      updateItem={updateUser}
      deleteItem={deleteUser}
      columns={columns}
      formFields={formFields}
    />
  );
}
