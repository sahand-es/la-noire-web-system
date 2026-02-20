# Admin Panel

A comprehensive admin panel for the La Noire Web System with full CRUD capabilities.

## Features

- **Dashboard**: Overview with statistics and quick actions
- **User Management**: View and edit users, manage roles
- **Role Management**: Create, edit, and delete roles
- **Permissions**: View all system permissions
- **Cases Management**: Full CRUD for cases
- **Complaints Management**: Full CRUD for complaints
- **Rewards Management**: Full CRUD for rewards

## Access

The admin panel is accessible at `/admin` and requires authentication. System Administrators will see an "Admin Panel" button on their dashboard.

## Structure

```
frontend/src/
├── pages/admin/
│   ├── AdminLayout.jsx       # Main layout with sidebar navigation
│   ├── AdminDashboard.jsx    # Dashboard with statistics
│   ├── UsersAdmin.jsx         # User management
│   ├── RolesAdmin.jsx         # Role management
│   ├── PermissionsAdmin.jsx   # Permissions view
│   ├── CasesAdmin.jsx         # Cases management
│   ├── ComplaintsAdmin.jsx    # Complaints management
│   └── RewardsAdmin.jsx       # Rewards management
└── components/admin/
    └── AdminTableView.jsx     # Generic reusable table component
```

## AdminTableView Component

A reusable component for creating admin pages with:

- Automatic table rendering with pagination
- Create, edit, and delete functionality
- Form generation based on field configuration
- Loading and error states
- Search and filter capabilities

### Usage Example

```jsx
<AdminTableView
  title="Resource Name"
  fetchData={listItems}
  createItem={createItem}
  updateItem={updateItem}
  deleteItem={deleteItem}
  columns={columns}
  formFields={formFields}
/>
```

## Adding New Admin Pages

1. Create a new file in `frontend/src/pages/admin/`
2. Define columns and form fields
3. Use `AdminTableView` component
4. Add route in `App.jsx`
5. Add menu item in `AdminLayout.jsx`

## Field Types

The `AdminTableView` component supports:

- `text` - Text input
- `textarea` - Multi-line text
- `number` - Number input
- `password` - Password input
- `select` - Dropdown select
- `date` - Date picker
- `datetime` - Date and time picker

## Styling

The admin panel uses:

- Ant Design components for UI
- Tailwind CSS for layout and spacing
- Theme colors from `frontend/src/theme.js`
