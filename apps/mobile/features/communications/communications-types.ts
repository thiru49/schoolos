import type { NoticeTargetRole } from "@schoolos/api-client";

export type MobileNoticeItem = {
  id: string;
  title: string;
  body: string;
  targetRole: NoticeTargetRole;
  published: boolean;
  publishedAt: string | null;
  authorId: string;
  authorName: string;
  createdAt: string;
};

export type MobileEventItem = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  published: boolean;
  createdAt: string;
};

export type MobileHolidayItem = {
  id: string;
  name: string;
  date: string;
  academicYearId: string | null;
  createdAt: string;
};

export type MobileNotificationItem = {
  id: string;
  kind?: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export type CommunicationsTab = "notices" | "events" | "holidays" | "alerts";

export type CommunicationsPayload = {
  notices: MobileNoticeItem[];
  events: MobileEventItem[];
  holidays: MobileHolidayItem[];
  notifications: MobileNotificationItem[];
};

export type CachedCommunicationsData = CommunicationsPayload & {
  schoolId: string;
  userId: string;
  role: string;
  childId?: string;
  cachedAt: string;
};
