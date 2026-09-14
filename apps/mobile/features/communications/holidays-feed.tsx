import { useMemo } from "react";
import { View } from "react-native";
import { Calendar } from "lucide-react-native";
import { AppText } from "../../components/ui/AppText";
import { EmptyState } from "../../components/states/Feedback";
import { useBranding } from "../branding/branding-provider";
import { formatHolidayDate, sortHolidaysChronologically } from "./communications-logic";
import type { MobileHolidayItem } from "./communications-types";

export { formatHolidayDate, sortHolidaysChronologically };

export function HolidaysFeed({ holidays }: { holidays: MobileHolidayItem[] }) {
  const { theme } = useBranding();

  const sortedHolidays = useMemo(() => {
    return sortHolidaysChronologically(holidays);
  }, [holidays]);

  if (sortedHolidays.length === 0) {
    return (
      <EmptyState
        title="No holidays listed"
        detail="Official academic-year holidays will appear here."
      />
    );
  }

  return (
    <View className="gap-3">
      {sortedHolidays.map((holiday) => {
        const { dayNumber, monthName, dayOfWeek } = formatHolidayDate(holiday.date);

        return (
          <View
            key={holiday.id}
            className="flex-row items-center rounded-2xl bg-white p-4 shadow-sm"
          >
            {/* Calendar day badge */}
            <View
              className="items-center justify-center rounded-xl px-3 py-2"
              style={{
                backgroundColor: "#fef3c7",
                minWidth: 54,
              }}
            >
              <AppText
                variant="label"
                style={{ color: "#b45309", fontWeight: "700", fontSize: 18 }}
              >
                {dayNumber}
              </AppText>
              <AppText
                variant="caption"
                style={{ color: "#92400e", fontWeight: "600", textTransform: "uppercase" }}
              >
                {monthName}
              </AppText>
            </View>

            {/* Holiday details */}
            <View className="ml-4 flex-1 justify-center">
              <AppText
                variant="label"
                color={theme.colors.ink}
                style={{ fontSize: 16 }}
              >
                {holiday.name}
              </AppText>
              <View className="mt-1 flex-row items-center gap-1">
                <Calendar size={12} color="#64748b" />
                <AppText variant="caption" color="#64748b">
                  {dayOfWeek}
                </AppText>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
