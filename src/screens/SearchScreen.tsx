import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { useSearchEvents, useStarEventMutation } from '../services/events';
import { getAuthToken } from '../services/api';
import EventCard from '../components/EventCard';
import { EventWithJoinStatus } from '../types';
import { colors } from '../utils/colors';

// Custom hook for debounced search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

type SearchFilter = 'all' | 'upcoming' | 'past';

export default function SearchScreen() {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [hasSearched, setHasSearched] = useState(false);

  const { user, isDemoMode, demoStarredEvents, toggleDemoStar } = useAuth();
  const { selectedGroupId } = useGroup();

  // Debounce search query to avoid too many API calls
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

  const starMutation = useStarEventMutation();

  // Search events with debounced query
  const {
    data: searchResults,
    isLoading,
    error,
    refetch,
  } = useSearchEvents(
    debouncedSearchQuery,
    selectedGroupId,
    debouncedSearchQuery.length >= 2 // Only search when query is at least 2 characters
  );

  // Filter search results based on selected filter
  const filteredResults = useMemo(() => {
    if (!searchResults) return [];

    if (searchFilter === 'all') {
      return searchResults;
    }

    const now = new Date();
    return searchResults.filter((event) => {
      const eventDate = new Date(event.start_time);
      if (searchFilter === 'upcoming') {
        return eventDate >= now;
      } else {
        // past
        return eventDate < now;
      }
    });
  }, [searchResults, searchFilter]);

  // Track when user has performed a search
  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      setHasSearched(true);
    } else {
      setHasSearched(false);
    }
  }, [debouncedSearchQuery]);

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

      // For search results, we need to check current star status
      // This is a simplified version - in a real app you'd want to track this more carefully
      const isCurrentlyStarred = isDemoMode
        ? demoStarredEvents.has(eventId)
        : false;

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

  const handleEventPress = (eventId: number) => {
    navigation.navigate('EventDetail' as any, { eventId });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
  };

  const renderFilterButton = (filter: SearchFilter, title: string) => {
    const isActive = searchFilter === filter;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.activeFilterButton]}
        onPress={() => setSearchFilter(filter)}
      >
        <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSearchResults = () => {
    if (!hasSearched) {
      return (
        <View style={styles.emptyState}>
          <Ionicons
            name="search-outline"
            size={64}
            color={colors.text.tertiary}
          />
          <Text style={styles.emptyStateTitle}>Search Events</Text>
          <Text style={styles.emptyStateDescription}>
            Find events by searching for keywords in titles, descriptions, or
            tags.
          </Text>
          <Text style={styles.emptyStateHint}>
            Type at least 2 characters to start searching
          </Text>
        </View>
      );
    }

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Searching events...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.status.error}
          />
          <Text style={styles.errorTitle}>Search Failed</Text>
          <Text style={styles.errorDescription}>
            Unable to search events. Please try again.
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => refetch()}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (filteredResults.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons
            name="search-outline"
            size={64}
            color={colors.text.tertiary}
          />
          <Text style={styles.emptyStateTitle}>No Events Found</Text>
          <Text style={styles.emptyStateDescription}>
            No events match your search criteria "{searchQuery}".
          </Text>
          <Text style={styles.emptyStateHint}>
            Try different keywords or remove filters
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.resultsContainer}
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.resultsCount}>
          {filteredResults.length} event
          {filteredResults.length !== 1 ? 's' : ''} found
        </Text>

        {filteredResults.map((event) => {
          // Convert to EventWithJoinStatus for EventCard compatibility
          const eventWithStatus: EventWithJoinStatus = {
            ...event,
            is_starred: isDemoMode ? demoStarredEvents.has(event.id) : false,
            is_attending: false, // We don't track this in search results for simplicity
            is_owner: user?.id === event.owner.id,
          };

          return (
            <EventCard
              key={event.id}
              event={eventWithStatus}
              onPress={() => handleEventPress(event.id)}
              onStarPress={() => handleStarPress(event.id)}
            />
          );
        })}
      </ScrollView>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search Events</Text>
        <Text style={styles.headerSubtitle}>
          Find events by name, description, or tags
        </Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={colors.text.secondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Buttons */}
      {hasSearched && (
        <View style={styles.filtersContainer}>
          {renderFilterButton('all', 'All')}
          {renderFilterButton('upcoming', 'Upcoming')}
          {renderFilterButton('past', 'Past')}
        </View>
      )}

      {/* Search Results */}
      <View style={styles.content}>{renderSearchResults()}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: 16,
    backgroundColor: colors.background.secondary,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.secondary,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
    marginLeft: 8,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background.secondary,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.background.tertiary,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeFilterText: {
    color: colors.text.white,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.text.white,
    fontSize: 16,
    fontWeight: '600',
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
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  emptyStateHint: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  resultsContainer: {
    flex: 1,
  },
  resultsContent: {
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
});
