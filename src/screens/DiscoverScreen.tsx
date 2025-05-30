import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SectionList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { EventWithJoinStatus, RootStackParamList } from '../types';
import { getAuthToken, apolloClient } from '../services/api';
import {
  useEvents,
  useInfiniteEvents,
  useStarEventMutation,
} from '../services/events';
import EventCard from '../components/EventCard';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { getEventStatus, groupEventsByDate } from '../utils/dateUtils';
import { colors } from '../utils/colors';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type DiscoverScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'Main'
>;

type EventFilter = 'upcoming' | 'all';

export default function DiscoverScreen() {
  const navigation = useNavigation<DiscoverScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);
  const starMutation = useStarEventMutation();
  const [eventFilter, setEventFilter] = useState<EventFilter>('upcoming');
  const { user, isDemoMode, demoStarredEvents, toggleDemoStar } = useAuth();
  const { selectedGroupId, allGroups } = useGroup();
  const queryClient = useQueryClient();

  console.log(
    'DEBUG DiscoverScreen: User in DiscoverScreen:',
    user?.handle || 'null'
  );

  const {
    data: infiniteEventsData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteEvents(selectedGroupId, eventFilter === 'upcoming');

  // Flatten infinite query data and deduplicate
  const filteredEvents = useMemo(() => {
    console.log(
      'filteredEvents useMemo running, infiniteEventsData:',
      infiniteEventsData?.pages?.length,
      'eventFilter:',
      eventFilter
    );

    if (!infiniteEventsData?.pages) return [];

    // Flatten all pages into a single array
    const allEvents = infiniteEventsData.pages.flatMap((page) => page.events);

    // Deduplicate events by ID to prevent duplicate keys
    const uniqueEvents = allEvents.reduce(
      (acc, event) => {
        if (!acc.find((e) => e.id === event.id)) {
          acc.push(event);
        }
        return acc;
      },
      [] as typeof allEvents
    );

    // Let's double-check the filtering by testing a few events
    if (eventFilter === 'upcoming' && uniqueEvents.length > 0) {
      const now = new Date();
      console.log('Current time:', now.toISOString());

      // Check first 3 events
      uniqueEvents.slice(0, 3).forEach((event, index) => {
        const status = getEventStatus(event.start_time, event.end_time);
        console.log(
          `Event ${index + 1} "${event.title}": ${status} (start: ${event.start_time}, end: ${event.end_time})`
        );
      });
    }

    // When eventFilter is 'upcoming', the query already filtered for upcoming events
    // When eventFilter is 'all', we show all events returned
    console.log(
      'Using events as-is from query, count:',
      uniqueEvents.length,
      'original:',
      allEvents.length
    );
    return uniqueEvents;
  }, [infiniteEventsData, eventFilter]);

  // Group events by date for upcoming view
  const groupedEvents = useMemo(() => {
    if (eventFilter === 'upcoming' && filteredEvents.length > 0) {
      return groupEventsByDate(filteredEvents);
    }
    return null;
  }, [filteredEvents, eventFilter]);

  useEffect(() => {
    if (error) {
      console.error('DiscoverScreen: React Query error', error);
    }
  }, [isLoading, infiniteEventsData, error]);

  // Check if event is starred from demo mode or cached data
  const isEventStarred = useCallback(
    (eventId: number) => {
      if (isDemoMode) {
        return demoStarredEvents.has(eventId);
      }
      // This will be handled by the optimistic updates in the mutation
      return false;
    },
    [isDemoMode, demoStarredEvents]
  );

  const onRefresh = async () => {
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

      // Refetch current infinite query
      await refetch();

      console.log('DiscoverScreen: All caches cleared on refresh');
    } catch (error) {
      console.error('DiscoverScreen: Error during refresh:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      console.log('Loading more events...');
      fetchNextPage();
    }
  };

  const handleEventPress = (eventId: number) => {
    navigation.navigate('EventDetail', { eventId });
  };

  const handleStarPress = async (eventId: number) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to star events.');
      return;
    }

    try {
      // Handle demo mode
      if (isDemoMode) {
        toggleDemoStar(eventId);
        return;
      }

      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const isCurrentlyStarred = isEventStarred(eventId);

      // Use optimistic mutation for instant UI updates
      starMutation.mutate({
        eventId,
        isStarred: isCurrentlyStarred,
        authToken,
        userId: user.id,
      });
    } catch (error: any) {
      console.error('Star/unstar error:', error);
      const message =
        error?.message || 'Failed to update star status. Please try again.';
      Alert.alert('Error', message);
    }
  };

  const renderEventCard = ({ item }: { item: EventWithJoinStatus }) => (
    <EventCard
      event={{ ...item, is_starred: isEventStarred(item.id) }}
      onPress={() => handleEventPress(item.id)}
      onStarPress={() => handleStarPress(item.id)}
    />
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: { dateLabel: string };
  }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.dateLabel}</Text>
    </View>
  );

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.footerText}>Loading more events...</Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Events Found</Text>
      <Text style={styles.emptyStateDescription}>
        {eventFilter === 'upcoming'
          ? 'There are no upcoming events at the moment. Check back later!'
          : 'No events found. Check back later!'}
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorDescription}>
        We couldn't load the events. Please try again.
      </Text>
      <Button
        title="Retry"
        onPress={() => refetch()}
        style={styles.retryButton}
      />
    </View>
  );

  if (isLoading && !infiniteEventsData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return renderError();
  }

  const renderSignInPrompt = () => {
    if (user) return null;

    return (
      <TouchableOpacity
        style={styles.signInPrompt}
        onPress={() => navigation.navigate('Auth')}
      >
        <View style={styles.signInContent}>
          <View style={styles.signInText}>
            <Text style={styles.signInTitle}>Sign in to join events</Text>
            <Text style={styles.signInDescription}>
              Get access to RSVPs and event management
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {allGroups.find((group) => group.id === selectedGroupId)?.nickname ||
            allGroups.find((group) => group.id === selectedGroupId)?.handle ||
            'Events'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Discover events in this community
        </Text>

        {/* Event Filter Toggle */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              eventFilter === 'upcoming' && styles.filterButtonActive,
            ]}
            onPress={() => setEventFilter('upcoming')}
          >
            <Text
              style={[
                styles.filterButtonText,
                eventFilter === 'upcoming' && styles.filterButtonTextActive,
              ]}
            >
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              eventFilter === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setEventFilter('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                eventFilter === 'all' && styles.filterButtonTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      {renderSignInPrompt()}
    </View>
  );

  return (
    <View style={styles.container}>
      {eventFilter === 'upcoming' && groupedEvents ? (
        <SectionList
          sections={groupedEvents}
          renderItem={renderEventCard}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  createButton: {
    minWidth: 120,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    minWidth: 120,
  },
  signInPrompt: {
    backgroundColor: '#fff',
    marginHorizontal: 8,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  signInContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  signInText: {
    flex: 1,
  },
  signInTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  signInDescription: {
    fontSize: 14,
    color: '#666',
  },
  debugText: {
    fontSize: 14,
    color: '#ff0000',
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: '#ffff00',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  footerLoader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.text.secondary,
  },
  sectionHeader: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
});
