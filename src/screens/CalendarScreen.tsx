import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { EventWithJoinStatus, RootStackParamList } from "../types";
import {
  apolloClient,
  getEventsForGroup,
  LOCAL_TIMEZONE,
} from "../services/api";
import EventCard from "../components/EventCard";
import { formatEventTime } from "../utils/dateUtils";
import { colors } from "../utils/colors";

type CalendarScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Main"
>;

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const navigation = useNavigation<CalendarScreenNavigationProp>();

  // Update navigation title when selected date changes
  useEffect(() => {
    const dateString = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    navigation.setOptions({
      headerTitle: dateString,
    });
  }, [selectedDate, navigation]);

  // Load events
  const {
    data: eventsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["events", "group", 3579],
    queryFn: async () => {
      const { query, variables } = getEventsForGroup(3579);
      const result = await apolloClient.query({
        query,
        variables,
        fetchPolicy: "network-only",
      });
      return result.data.events as EventWithJoinStatus[];
    },
  });

  // Helper function to check if a date has events
  const getEventsForDate = (date: Date): EventWithJoinStatus[] => {
    if (!eventsData) return [];

    const dateStr = date.toDateString();
    return eventsData.filter((event) => {
      const { date: eventDate } = formatEventTime(
        event.start_time,
        event.timezone,
        LOCAL_TIMEZONE,
      );
      const eventDateObj = new Date(event.start_time);
      // Use timezone-corrected date for comparison
      const correctedEventDate = new Date(
        eventDateObj.getTime() - 7 * 60 * 60 * 1000,
      );
      return correctedEventDate.toDateString() === dateStr;
    });
  };

  const renderCalendarHeader = () => {
    const monthYear = currentMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    return (
      <View style={styles.calendarHeader}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            const newMonth = new Date(currentMonth);
            newMonth.setMonth(newMonth.getMonth() - 1);
            setCurrentMonth(newMonth);
          }}
        >
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>

        <Text style={styles.monthYear}>{monthYear}</Text>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            const newMonth = new Date(currentMonth);
            newMonth.setMonth(newMonth.getMonth() + 1);
            setCurrentMonth(newMonth);
          }}
        >
          <Ionicons name="chevron-forward" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderWeekDays = () => {
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return (
      <View style={styles.weekDaysContainer}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayItem}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    let currentDate = new Date(startDate);

    for (let week = 0; week < 6; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const isCurrentMonth = currentDate.getMonth() === month;
        const isSelected =
          currentDate.toDateString() === selectedDate.toDateString();
        const isToday =
          currentDate.toDateString() === new Date().toDateString();
        const hasEvents = getEventsForDate(currentDate).length > 0;

        const dayDate = new Date(currentDate);

        weekDays.push(
          <TouchableOpacity
            key={currentDate.toISOString()}
            style={[
              styles.dayItem,
              isSelected && styles.selectedDay,
              isToday && styles.todayDay,
            ]}
            onPress={() => setSelectedDate(dayDate)}
          >
            <Text
              style={[
                styles.dayText,
                !isCurrentMonth && styles.inactiveDayText,
                isSelected && styles.selectedDayText,
                isToday && styles.todayDayText,
              ]}
            >
              {currentDate.getDate()}
            </Text>
            {hasEvents && <View style={styles.eventIndicator} />}
          </TouchableOpacity>,
        );

        currentDate.setDate(currentDate.getDate() + 1);
      }

      days.push(
        <View key={week} style={styles.weekRow}>
          {weekDays}
        </View>,
      );
    }

    return <View style={styles.calendarDays}>{days}</View>;
  };

  const renderSelectedDateEvents = () => {
    const dateString = selectedDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const selectedDateEvents = getEventsForDate(selectedDate);

    const handleEventPress = (eventId: number) => {
      navigation.navigate("EventDetail", { eventId });
    };

    const handleStarPress = (eventId: number) => {
      console.log("Star pressed for event:", eventId);
    };

    return (
      <>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : selectedDateEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {selectedDateEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onPress={() => handleEventPress(event.id)}
                onStarPress={() => handleStarPress(event.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.noEventsContainer}>
            <Ionicons
              name="calendar-outline"
              size={48}
              color={colors.text.tertiary}
            />
            <Text style={styles.noEventsText}>No events scheduled</Text>
            <Text style={styles.noEventsSubtext}>
              Create an event or check other dates
            </Text>
          </View>
        )}
      </>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.calendarContainer}>
        {renderCalendarHeader()}
        {renderWeekDays()}
        {renderCalendarDays()}
      </View>
      {renderSelectedDateEvents()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  contentContainer: {
    flexGrow: 1,
  },
  calendarContainer: {
    backgroundColor: colors.background.secondary,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  weekDaysContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekDayItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text.secondary,
  },
  calendarDays: {
    marginBottom: 8,
  },
  weekRow: {
    flexDirection: "row",
  },
  dayItem: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
    margin: 1,
  },
  selectedDay: {
    backgroundColor: colors.primary,
  },
  todayDay: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dayText: {
    fontSize: 16,
    color: colors.text.primary,
  },
  inactiveDayText: {
    color: colors.text.tertiary,
  },
  selectedDayText: {
    color: colors.text.white,
    fontWeight: "bold",
  },
  todayDayText: {
    color: colors.primary,
    fontWeight: "bold",
  },
  noEventsContainer: {
    alignItems: "center",
    paddingVertical: 32,
    marginHorizontal: 16,
  },
  noEventsText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.secondary,
    marginTop: 16,
    marginBottom: 4,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  eventIndicator: {
    position: "absolute",
    bottom: 4,
    alignSelf: "center",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 32,
    marginHorizontal: 16,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  eventsList: {
    marginHorizontal: 8,
  },
});
