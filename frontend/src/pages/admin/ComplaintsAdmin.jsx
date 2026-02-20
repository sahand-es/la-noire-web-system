import { AdminTableView } from "../../components/admin/AdminTableView";
import { listComplaints, getComplaint, createComplaint } from "../../api/calls";
import { put, del } from "../../api/request";
import { Tag } from "antd";

const updateComplaint = (id, data) => put(`complaints/${id}/`, data);
const deleteComplaint = (id) => del(`complaints/${id}/`);

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
    title: "Complainant",
    dataIndex: "complainant_name",
    key: "complainant_name",
  },
  {
    title: "Incident Date",
    dataIndex: "incident_date",
    key: "incident_date",
    render: (date) => new Date(date).toLocaleDateString(),
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
    placeholder: "Enter complaint title",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    required: true,
    fullWidth: true,
    placeholder: "Enter complaint description",
  },
  {
    name: "incident_date",
    label: "Incident Date",
    type: "date",
    required: true,
  },
  {
    name: "incident_location",
    label: "Incident Location",
    type: "text",
    required: true,
    placeholder: "Enter incident location",
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: false,
    options: [
      { label: "Pending Cadet", value: "pending_cadet" },
      { label: "Pending Officer", value: "pending_officer" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
];

export function ComplaintsAdmin() {
  return (
    <AdminTableView
      title="Complaints"
      fetchData={listComplaints}
      createItem={createComplaint}
      updateItem={updateComplaint}
      deleteItem={deleteComplaint}
      columns={columns}
      formFields={formFields}
    />
  );
}
