import type { NoticeTargetRole } from "@schoolos/api-client";

export type NoticeItem = {
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

export type EventItem = {
  id: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  published: boolean;
  createdAt: string;
};

export type HolidayItem = {
  id: string;
  name: string;
  date: string;
  academicYearId: string | null;
  createdAt: string;
};
