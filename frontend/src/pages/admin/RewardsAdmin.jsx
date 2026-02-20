import { AdminTableView } from "../../components/admin/AdminTableView";
import { listRewards, getReward, createReward } from "../../api/calls";
import { put, del } from "../../api/request";
import { Tag } from "antd";

const updateReward = (id, data) => put(`rewards/${id}/`, data);
const deleteReward = (id) => del(`rewards/${id}/`);

const columns = [
  {
    title: "ID",
    dataIndex: "id",
    key: "id",
    width: 80,
  },
  {
    title: "National ID",
    dataIndex: "national_id",
    key: "national_id",
  },
  {
    title: "Reward Code",
    dataIndex: "reward_code",
    key: "reward_code",
  },
  {
    title: "Info Type",
    dataIndex: "info_type",
    key: "info_type",
    render: (type) => <Tag>{type}</Tag>,
  },
  {
    title: "Status",
    dataIndex: "status",
    key: "status",
    render: (status) => <Tag>{status}</Tag>,
  },
  {
    title: "Amount",
    dataIndex: "reward_amount",
    key: "reward_amount",
    render: (amount) => (amount ? `$${amount}` : "-"),
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
    name: "national_id",
    label: "National ID",
    type: "text",
    required: true,
    placeholder: "Enter national ID",
  },
  {
    name: "info_type",
    label: "Information Type",
    type: "select",
    required: true,
    options: [
      { label: "Suspect Info", value: "suspect_info" },
      { label: "Evidence Location", value: "evidence_location" },
      { label: "Witness", value: "witness" },
      { label: "Other", value: "other" },
    ],
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    required: true,
    fullWidth: true,
    placeholder: "Enter information description",
  },
  {
    name: "status",
    label: "Status",
    type: "select",
    required: false,
    options: [
      { label: "Pending", value: "pending" },
      { label: "Officer Reviewing", value: "officer_reviewing" },
      { label: "Detective Reviewing", value: "detective_reviewing" },
      { label: "Approved", value: "approved" },
      { label: "Rejected", value: "rejected" },
    ],
  },
  {
    name: "reward_amount",
    label: "Reward Amount",
    type: "number",
    required: false,
    placeholder: "Enter reward amount",
  },
];

export function RewardsAdmin() {
  return (
    <AdminTableView
      title="Rewards"
      fetchData={listRewards}
      createItem={createReward}
      updateItem={updateReward}
      deleteItem={deleteReward}
      columns={columns}
      formFields={formFields}
    />
  );
}
