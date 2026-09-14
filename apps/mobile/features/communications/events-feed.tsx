import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { MapPin } from "lucide-react-native";
import { AppText } from "../../components/ui/AppText";
import { EmptyState } from "../../components/states/Feedback";
import { useBranding } from "../branding/branding-provider";
import { formatEventSchedule, isEventUpcoming } from "./communications-logic";
import type { MobileEventItem } from "./communications-types";

export { formatEventSchedule, isEventUpcoming };

export function EventsFeed({ events }: { events: MobileEventItem[] }) {
  const { theme } = useBranding();
  const [filter, setFilter] = useState<"upcoming" | "all" | "past">("upcoming");

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events.filter((e) => {
      if (filter === "upcoming") return isEventUpcoming(e, now);
      if (filter === "past") return !isEventUpcoming(e, now);
      return true;
    });
  }, [events, filter]);

  return (
    <View className="gap-4">
      {/* Sub-filters: Upcoming, All, Past */}
      <View className="flex-row gap-2">
        {(["upcoming", "all", "past"] as const).map((f) => {
          const selected = filter === f;
          const label = f === "upcoming" ? "Upcoming" : f === "past" ? "Past" : "All";
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              className="rounded-full px-4 py-1.5"
              style={{
                backgroundColor: selected ? theme.colors.primary : "#e2e8f0",
              }}
            >
              <AppText
                variant="caption"
                style={{
                  color: selected ? "white" : theme.colors.ink,
                  fontWeight: "600",
                }}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {filteredEvents.length === 0 ? (
        <EmptyState
          title={
            filter === "upcoming"
              ? "No upcoming events"
              : filter === "past"
              ? "No past events"
              : "No events scheduled"
          }
          detail="School functions, sports meets, and academic events will be listed here."
        />
      ) : (
        <View className="gap-3">
          {filteredEvents.map((event) => {
            const schedule = formatEventSchedule(event.startDate, event.endDate);
            const now = new Date();
            const isUpcoming = isEventUpcoming(event, now);

            return (
              <View
                key={event.id}
                className="rounded-2xl bg-white p-4 shadow-sm"
              >
                <View className="flex-row items-center justify-between">
                  <View
                    className="rounded-full px-2.5 py-0.5"
                    style={{
                      backgroundColor: isUpcoming ? "#ecfdf5" : "#f1f5f9",
                    }}
                  >
                    <AppText
                      variant="caption"
                      style={{
                        color: isUpcoming ? "#047857" : "#64748b",
                        fontWeight: "600",
                      }}
                    >
                      {isUpcoming ? "Upcoming" : "Completed"}
                    </AppText>
                  </View>
                  <AppText variant="caption" color="#64748b">
                    {schedule}
                  </AppText>
                </View>

                <AppText
                  variant="label"
                  color={theme.colors.ink}
                  style={{ marginTop: 8, fontSize: 16 }}
                >
                  {event.title}
                </AppText>

                {event.description ? (
                  <AppText
                    variant="body"
                    color="#475569"
                    style={{ marginTop: 6 }}
                  >
                    {event.description}
                  </AppText>
                ) : null}

                {event.location ? (
                  <View className="mt-3 flex-row items-center gap-1.5">
                    <MapPin size={14} color="#64748b" />
                    <AppText variant="caption" color="#64748b">
                      {event.location}
                    </AppText>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
