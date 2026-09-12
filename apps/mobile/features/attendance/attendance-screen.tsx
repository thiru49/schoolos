import { PERMISSIONS } from "@schoolos/permissions";
import { useBranding } from "../branding/branding-provider";
import { ParentHistory } from "./parent-history";
import { TeacherRoster } from "./teacher-roster";

export function AttendanceScreen() {
  const { acl } = useBranding();
  const canMark = acl?.permissions.includes(PERMISSIONS.ATTENDANCE_MARK);
  const isParent = acl?.roles.includes("parent");
  const isStudent = acl?.roles.includes("student");

  if (isParent) return <ParentHistory mode="parent" />;
  if (isStudent && !canMark) return <ParentHistory mode="student" />;
  return <TeacherRoster />;
}
