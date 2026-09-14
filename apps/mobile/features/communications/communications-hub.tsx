import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { ApiError } from "@schoolos/api-client";
import { api } from "../../services/api";
import { useBranding } from "../branding/branding-provider";
import { AppText } from "../../components/ui/AppText";
import { AppButton } from "../../components/ui/AppButton";
import {
  DeniedState,
  ErrorState,
  OfflineState,
} from "../../components/states/Feedback";
import {
  getCachedCommunications,
  setCachedCommunications,
  updateCachedNotificationReadState,
} from "./communications-cache";
import { NoticesFeed } from "./notices-feed";
import { EventsFeed } from "./events-feed";
import { HolidaysFeed } from "./holidays-feed";
import { AlertsFeed } from "./alerts-feed";
import type {
  CommunicationsTab,
  MobileEventItem,
  MobileHolidayItem,
  MobileNoticeItem,
  MobileNotificationItem,
} from "./communications-types";

export function CommunicationsHub({
  initialTab = "notices",
  showBack = false,
  title,
}: {
  initialTab?: CommunicationsTab;
  showBack?: boolean;
  title?: string;
}) {
  const { branding, theme, acl, selectedChild } = useBranding();
  const router = useRouter();

  const [currentTab, setCurrentTab] = useState<CommunicationsTab>(initialTab);
  const [notices, setNotices] = useState<MobileNoticeItem[]>([]);
  const [events, setEvents] = useState<MobileEventItem[]>([]);
  const [holidays, setHolidays] = useState<MobileHolidayItem[]>([]);
  const [notifications, setNotifications] = useState<MobileNotificationItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isDenied, setIsDenied] = useState(false);
  const [hasCachedData, setHasCachedData] = useState(false);

  // Authenticated session context — strict, no invented fallbacks
  const schoolId = acl?.schoolId;
  const userId = acl?.userId;
  const role = acl?.roles?.[0];
  const isParent = acl?.roles?.includes("parent");
  const childId = isParent ? selectedChild?.studentId : undefined;

  const loadData = useCallback(async () => {
    setError(null);
    setActionError(null);
    setIsDenied(false);

    try {
      const client = await api();
      const [noticesRes, eventsRes, holidaysRes, notificationsRes] = await Promise.all([
        client.notices.list().catch((e) => {
          if (e instanceof ApiError && e.status === 403) throw e;
          return [];
        }),
        client.events.list().catch((e) => {
          if (e instanceof ApiError && e.status === 403) throw e;
          return [];
        }),
        client.holidays.list().catch((e) => {
          if (e instanceof ApiError && e.status === 403) throw e;
          return [];
        }),
        client.notifications.list().catch(() => []),
      ]);

      setNotices(noticesRes);
      setEvents(eventsRes);
      setHolidays(holidaysRes);
      setNotifications(notificationsRes);

      setIsOffline(false);
      setHasCachedData(false);

      // Persist to partitioned offline cache only when valid authenticated context exists
      if (schoolId && userId && role) {
        await setCachedCommunications(
          schoolId,
          userId,
          role,
          {
            notices: noticesRes,
            events: eventsRes,
            holidays: holidaysRes,
            notifications: notificationsRes,
          },
          childId,
        );
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setIsDenied(true);
        setError(err.message || "Permission denied");
        return;
      }

      // Check offline cache on network failure only when valid authenticated context exists
      const cached =
        schoolId && userId && role
          ? await getCachedCommunications(schoolId, userId, role, childId)
          : null;

      if (cached) {
        setNotices(cached.notices);
        setEvents(cached.events);
        setHolidays(cached.holidays);
        setNotifications(cached.notifications);
        setIsOffline(true);
        setHasCachedData(true);
      } else {
        if (err instanceof TypeError || (err instanceof Error && err.message.includes("Network"))) {
          setIsOffline(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load communications");
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [schoolId, userId, role, childId]);

  useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData();
  }, [loadData]);

  const handleMarkRead = async (id: string) => {
    setActionError(null);
    try {
      const client = await api();
      await client.notifications.markRead(id);
      // Update UI only on successful backend call
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      // Update the existing communications cache partition
      if (schoolId && userId && role) {
        await updateCachedNotificationReadState(
          schoolId,
          userId,
          role,
          id,
          true,
          childId,
        );
      }
    } catch (err) {
      // Keep notification unread on failure and surface visible error
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to mark alert as read. Please check your connection.";
      setActionError(msg);
    }
  };

  const unreadAlertsCount = notifications.filter((n) => !n.read).length;

  const tabs: { key: CommunicationsTab; label: string; badge?: number }[] = [
    { key: "notices", label: "Notices" },
    { key: "events", label: "Events" },
    { key: "holidays", label: "Holidays" },
    { key: "alerts", label: "Alerts", badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined },
  ];

  if (isDenied) {
    return (
      <View
        className="flex-1 px-6 pt-16"
        style={{ backgroundColor: theme.colors.background }}
      >
        {showBack ? (
          <View className="mb-4">
            <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : null}
        <DeniedState
          title="Access restricted"
          detail={error ?? "You do not have permission to view communications."}
        />
      </View>
    );
  }

  return (
    <View
      className="flex-1 px-4 pt-14"
      style={{ backgroundColor: theme.colors.background }}
    >
      {/* Header */}
      <View className="mb-4">
        {showBack ? (
          <View className="mb-3">
            <AppButton label="Back" variant="secondary" onPress={() => router.back()} />
          </View>
        ) : null}
        <AppText variant="caption" color={theme.colors.primary}>
          {branding?.schoolName ?? "SchoolOS"}
        </AppText>
        <AppText variant="title" style={{ marginTop: 2, fontSize: 24 }}>
          {title ?? "Communications"}
        </AppText>
      </View>

      {/* Segment Switcher Pills */}
      <View className="mb-4 flex-row rounded-xl bg-white p-1 shadow-sm">
        {tabs.map((tab) => {
          const isSelected = currentTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => {
                setActionError(null);
                setCurrentTab(tab.key);
              }}
              className="flex-1 items-center justify-center rounded-lg py-2"
              style={{
                backgroundColor: isSelected ? theme.colors.primary : "transparent",
              }}
            >
              <View className="flex-row items-center gap-1">
                <AppText
                  variant="caption"
                  style={{
                    color: isSelected ? "white" : theme.colors.ink,
                    fontWeight: isSelected ? "700" : "500",
                  }}
                >
                  {tab.label}
                </AppText>
                {tab.badge ? (
                  <View
                    className="rounded-full px-1.5 py-0.2"
                    style={{
                      backgroundColor: isSelected ? "white" : theme.colors.danger,
                    }}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        fontSize: 10,
                        fontWeight: "700",
                        color: isSelected ? theme.colors.primary : "white",
                      }}
                    >
                      {tab.badge}
                    </AppText>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Action Error Banner */}
      {actionError ? (
        <View className="mb-3 rounded-xl bg-rose-50 p-3 border border-rose-200">
          <AppText variant="caption" color={theme.colors.danger} style={{ fontWeight: "600" }}>
            {actionError}
          </AppText>
        </View>
      ) : null}

      {/* Offline Banner when showing cached data */}
      {isOffline && hasCachedData ? (
        <View className="mb-3 rounded-xl bg-amber-50 p-3 border border-amber-200">
          <AppText variant="caption" style={{ color: "#92400e", fontWeight: "600" }}>
            Offline mode: Displaying cached communications. Pull down to refresh.
          </AppText>
        </View>
      ) : null}

      {/* Content Area with Pull-To-Refresh */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {loading && !hasCachedData ? (
          <View className="items-center py-16">
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <AppText variant="caption" color="#64748b" style={{ marginTop: 12 }}>
              Loading updates…
            </AppText>
          </View>
        ) : isOffline && !hasCachedData ? (
          <OfflineState onRetry={() => void loadData()} />
        ) : error && !hasCachedData ? (
          <ErrorState message={error} onRetry={() => void loadData()} />
        ) : (
          <View>
            {currentTab === "notices" && <NoticesFeed notices={notices} />}
            {currentTab === "events" && <EventsFeed events={events} />}
            {currentTab === "holidays" && <HolidaysFeed holidays={holidays} />}
            {currentTab === "alerts" && (
              <AlertsFeed
                notifications={notifications}
                onMarkRead={handleMarkRead}
              />
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
