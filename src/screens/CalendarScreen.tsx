import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

import { EventWithJoinStatus, RootStackParamList } from '../types';
import {
  apolloClient,
  getEventsForCalendar,
  LOCAL_TIMEZONE,
  starEvent,
  unstarEvent,
  getAuthToken,
} from '../services/api';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
import EventCard from '../components/EventCard';
import { formatEventTime } from '../utils/dateUtils';
import { colors } from '../utils/colors';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';

type CalendarScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation<CalendarScreenNavigationProp>();
  const { user } = useAuth();
  const { selectedGroupId } = useGroup();
  const queryClient = useQueryClient();

  // Update navigation title when selected date changes
  useEffect(() => {
    const dateString = selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    navigation.setOptions({
      headerTitle: dateString,
    });
  }, [selectedDate, navigation]);

  // Load starred events using React Query for better caching and performance
  const { data: starredEventsData } = useQuery({
    queryKey: ['starredEvents', user?.id],
    queryFn: async () => {
      if (!user) return new Set<number>();

      const authToken = await getAuthToken();
      if (!authToken) return new Set<number>();

      const starredUrl = `${API_URL}/event/my_event_list?collection=my_stars&auth_token=${authToken}`;
      const response = await fetch(starredUrl);
      if (response.ok) {
        const data = await response.json();
        return new Set((data.events || []).map((event: any) => event.id));
      }
      return new Set<number>();
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in memory for 10 minutes
  });

  const starredEvents = starredEventsData || new Set<number>();

  // Pull-to-refresh handler that clears all caches
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Clear all React Query caches for events and related data
      await queryClient.invalidateQueries({
        queryKey: ['events'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['starredEvents'],
      });
      await queryClient.invalidateQueries({
        queryKey: ['myEvents'],
      });

      // Clear Apollo Client cache completely and refetch active queries
      await apolloClient.resetStore();

      console.log('CalendarScreen: All caches cleared on refresh');
    } catch (error) {
      console.error('CalendarScreen: Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  // Calculate date range for current month view to efficiently load only relevant events
  const getMonthDateRange = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    // Start from beginning of month, but include previous month's visible days
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Go back to Sunday

    // End at end of month, but include next month's visible days
    const lastDay = new Date(year, month + 1, 0);
    const endDate = new Date(lastDay);
    const remainingDays = 6 - lastDay.getDay(); // Days to reach Saturday
    endDate.setDate(endDate.getDate() + remainingDays);

    return {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };
  }, []);

  // Load events for current month view
  const {
    data: eventsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [
      'events',
      'calendar',
      selectedGroupId,
      currentMonth.toISOString(),
    ],
    queryFn: async () => {
      const { startDate, endDate } = getMonthDateRange(currentMonth);
      const { query, variables } = getEventsForCalendar(
        selectedGroupId,
        startDate,
        endDate
      );
      const result = await apolloClient.query({
        query,
        variables,
        fetchPolicy: 'network-only',
      });
      return result.data.events as EventWithJoinStatus[];
    },
  });

  // Memoized events mapping for better performance
  const eventsByDate = useMemo(() => {
    if (!eventsData) return new Map<string, EventWithJoinStatus[]>();

    const dateMap = new Map<string, EventWithJoinStatus[]>();

    eventsData.forEach((event) => {
      const eventDateObj = new Date(event.start_time);
      // Use timezone-corrected date for comparison
      const correctedEventDate = new Date(
        eventDateObj.getTime() - 7 * 60 * 60 * 1000
      );
      const dateStr = correctedEventDate.toDateString();

      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, []);
      }
      dateMap.get(dateStr)!.push(event);
    });

    return dateMap;
  }, [eventsData]);

  // Optimized helper function to get events for a date
  const getEventsForDate = useCallback(
    (date: Date): EventWithJoinStatus[] => {
      const dateStr = date.toDateString();
      return eventsByDate.get(dateStr) || [];
    },
    [eventsByDate]
  );

  const renderCalendarHeader = useCallback(() => {
    const monthYear = currentMonth.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
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
  }, [currentMonth]);

  const renderWeekDays = useCallback(() => {
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <View style={styles.weekDaysContainer}>
        {weekDays.map((day) => (
          <View key={day} style={styles.weekDayItem}>
            <Text style={styles.weekDayText}>{day}</Text>
          </View>
        ))}
      </View>
    );
  }, []);

  const renderCalendarDays = useCallback(() => {
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
          </TouchableOpacity>
        );

        currentDate.setDate(currentDate.getDate() + 1);
      }

      days.push(
        <View key={week} style={styles.weekRow}>
          {weekDays}
        </View>
      );
    }

    return <View style={styles.calendarDays}>{days}</View>;
  }, [currentMonth, selectedDate, getEventsForDate]);

  // Memoize selected date events
  const selectedDateEvents = useMemo(() => {
    return getEventsForDate(selectedDate);
  }, [selectedDate, getEventsForDate]);

  const handleEventPress = useCallback(
    (eventId: number) => {
      navigation.navigate('EventDetail', { eventId });
    },
    [navigation]
  );

  const handleStarPress = useCallback(
    async (eventId: number) => {
      if (!user) {
        Alert.alert('Sign In Required', 'Please sign in to star events.');
        return;
      }

      try {
        const authToken = await getAuthToken();
        if (!authToken) {
          throw new Error('No authentication token found');
        }

        const isCurrentlyStarred = starredEvents.has(eventId);

        if (isCurrentlyStarred) {
          await unstarEvent(eventId, authToken);
          Alert.alert('Unstarred', 'Event removed from your starred list.');
        } else {
          await starEvent(eventId, authToken);
        }

        // Invalidate starred events cache to refetch fresh data
        await queryClient.invalidateQueries({
          queryKey: ['starredEvents', user.id],
        });
      } catch (error: any) {
        console.error('Star/unstar error:', error);
        const message =
          error?.message || 'Failed to update star status. Please try again.';
        Alert.alert('Error', message);
      }
    },
    [user, starredEvents, queryClient]
  );

  const renderSelectedDateEvents = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      );
    }

    if (selectedDateEvents.length > 0) {
      return (
        <View style={styles.eventsList}>
          {selectedDateEvents.map((event) => (
            <EventCard
              key={event.id}
              event={{ ...event, is_starred: starredEvents.has(event.id) }}
              onPress={() => handleEventPress(event.id)}
              onStarPress={() => handleStarPress(event.id)}
            />
          ))}
        </View>
      );
    }

    return (
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
    );
  }, [
    isLoading,
    selectedDateEvents,
    starredEvents,
    handleEventPress,
    handleStarPress,
  ]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.calendarContainer}>
        {renderCalendarHeader()}
        {renderWeekDays()}
        {renderCalendarDays()}
      </View>
      {renderSelectedDateEvents}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
  },
  monthYear: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekDayText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  calendarDays: {
    marginBottom: 8,
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayItem: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: 'bold',
  },
  todayDayText: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  noEventsContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
  },
  noEventsText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 16,
    marginBottom: 4,
  },
  noEventsSubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  loadingContainer: {
    alignItems: 'center',
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
