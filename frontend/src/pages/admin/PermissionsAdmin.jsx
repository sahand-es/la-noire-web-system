import { useState, useEffect } from "react";
import { AdminTableView } from "../../components/admin/AdminTableView";
import { Tag } from "antd";
import {
  listPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  listRoles,
} from "../../api/calls";

const fetchPermissions = () => listPermissions();
const createItem = (data) => createPermission(data);
const updateItem = (id, data) => updatePermission(id, data);
const deleteItem = (id) => deletePermission(id);

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

const formFields = [
  {
    name: "codename",
    label: "Codename",
    type: "text",
    required: true,
    placeholder: "e.g. case.create, complaint.review_cadet",
  },
  {
    name: "name",
    label: "Name",
    type: "text",
    required: true,
    fullWidth: true,
    placeholder: "Human-readable description",
  },
  {
    name: "roles",
    label: "Roles",
    type: "select",
    multiple: true,
    required: false,
    fullWidth: true,
    searchable: true,
    placeholder: "Select roles that have this permission",
  },
];

export function PermissionsAdmin() {
  const [roleOptions, setRoleOptions] = useState([]);

  useEffect(() => {
    listRoles()
      .then((r) => {
        const list = Array.isArray(r) ? r : r?.results || [];
        setRoleOptions(list.map((role) => ({ label: role.name, value: role.id })));
      })
      .catch(() => setRoleOptions([]));
  }, []);

  return (
    <AdminTableView
      title="Permissions"
      fetchData={fetchPermissions}
      createItem={createItem}
      updateItem={updateItem}
      deleteItem={deleteItem}
      columns={columns}
      formFields={formFields}
      fieldOptions={{ roles: roleOptions }}
    />
  );
}
