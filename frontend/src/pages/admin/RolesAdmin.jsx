import { AdminTableView } from "../../components/admin/AdminTableView";
import { listRoles, getRole } from "../../api/calls";
import { Tag } from "antd";
import { get, post, put, del } from "../../api/request";

const fetchRoles = () => listRoles();
const createRole = (data) => post("roles/", data);
const updateRole = (id, data) => put(`roles/${id}/`, data);
const deleteRole = (id) => del(`roles/${id}/`);

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 80,
  },
  {
    title: "Name",
    dataIndex: "name",
    key: "name",
  },
  {
    title: "Description",
    dataIndex: "description",
    key: "description",
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

const formFields = [
  {
    name: "name",
    label: "Name",
    type: "text",
    required: true,
    placeholder: "Enter role name",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    required: false,
    fullWidth: true,
    placeholder: "Enter role description",
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

export function RolesAdmin() {
  return (
    <AdminTableView
      title="Roles"
      fetchData={fetchRoles}
      createItem={createRole}
      updateItem={updateRole}
      deleteItem={deleteRole}
      columns={columns}
      formFields={formFields}
    />
  );
}
