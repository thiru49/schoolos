"use client";

import { AppHeader } from "../../../components/shell/app-header";
import { RolesManagementBoard } from "../../../features/rbac/roles-management-board";

export default function RolesPage() {
  return (
    <div>
      <AppHeader
        title="Role Assignment"
        subtitle="Manage user roles and resource access scopes across your school."
      />
      <RolesManagementBoard />
    </div>
  );
}
