import { AdminTableView } from "../../components/admin/AdminTableView";
import { listCases, getCase, createCase } from "../../api/calls";
import { put, del } from "../../api/request";
import { Tag } from "antd";

const updateCase = (id, data) => put(`cases/${id}/`, data);
const deleteCase = (id) => del(`cases/${id}/`);

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 80,
  },
  {
    title: "Title",
    dataIndex: "title",
    key: "title",
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status) => <Tag>{status}</Tag>,
  },
  {
    title: "Priority Level",
    dataIndex: "priority_level",
    key: "priority_level",
    render: (level) => {
      const colors = {
        1: "error",
        2: "warning",
        3: "blue",
        critical: "purple",
      };
      return <Tag color={colors[level] ?? "default"}>{level}</Tag>;
    },
  },
  {
    title: "Location",
    dataIndex: "location",
    key: "location",
  },
  {
    title: "Created At",
    dataIndex: "created_at",
    key: "created_at",
    render: (date) => new Date(date).toLocaleDateString(),
  },
];

const formFields = [
  {
    name: "title",
    label: "Title",
    type: "text",
    required: true,
    fullWidth: true,
    placeholder: "Enter case title",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    required: true,
    fullWidth: true,
    placeholder: "Enter case description",
  },
  {
    name: "incident_date",
    label: "Incident Date",
    type: "datetime",
    required: true,
  },
  {
    name: "location",
    label: "Location",
    type: "text",
    required: true,
    placeholder: "Enter location",
  },
  {
    name: "priority_level",
    label: "Priority Level",
    type: "select",
    required: true,
    options: [
      { label: "Level 3 (Minor)", value: "3" },
      { label: "Level 2 (Major)", value: "2" },
      { label: "Level 1 (Serious)", value: "1" },
      { label: "Critical", value: "critical" },
    ],
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: false,
    options: [
      { label: "Open", value: "open" },
      { label: "Under Investigation", value: "under_investigation" },
      { label: "Closed", value: "closed" },
      { label: "Solved", value: "solved" },
    ],
  },
];

export function CasesAdmin() {
  return (
    <AdminTableView
      title="Cases"
      fetchData={listCases}
      createItem={createCase}
      updateItem={updateCase}
      deleteItem={deleteCase}
      columns={columns}
      formFields={formFields}
    />
  );
}
