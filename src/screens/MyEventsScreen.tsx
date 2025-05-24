import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { getMyEvents, getAuthToken } from '../services/api';
import Button from '../components/Button';
import EventCard from '../components/EventCard';
import { Event, EventWithJoinStatus } from '../types';

type EventTab = 'hosting' | 'attending' | 'starred';

export default function MyEventsScreen() {
  const [activeTab, setActiveTab] = useState<EventTab>('attending');
  const navigation = useNavigation();
  const { user } = useAuth();

  // Fetch user's events when authenticated
  const { data: myEvents, isLoading, error, refetch } = useQuery({
    queryKey: ['myEvents', user?.id],
    queryFn: async () => {
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found');
      }
      return getMyEvents(authToken);
    },
    enabled: !!user, // Only run query when user is authenticated
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const handleSignIn = () => {
    navigation.navigate('Auth' as never);
  };

  const renderTabButton = (tab: EventTab, title: string, icon: string) => {
    const isActive = activeTab === tab;
    
    return (
      <TouchableOpacity
        style={[styles.tabButton, isActive && styles.activeTabButton]}
        onPress={() => setActiveTab(tab)}
      >
        <Ionicons 
          name={icon as any} 
          size={20} 
          color={isActive ? '#007AFF' : '#666'} 
        />
        <Text style={[styles.tabText, isActive && styles.activeTabText]}>
          {title}
        </Text>
      </TouchableOpacity>
    );
  };

  const getCurrentEvents = (): EventWithJoinStatus[] => {
    if (!myEvents || !user) return [];
    
    let events: Event[] = [];
    switch (activeTab) {
      case 'hosting':
        events = myEvents.hosting;
        break;
      case 'attending':
        events = myEvents.attending;
        break;
      case 'starred':
        events = myEvents.starred;
        break;
      default:
        events = [];
    }

    // Convert Event[] to EventWithJoinStatus[]
    return events.map(event => ({
      ...event,
      is_owner: event.owner.id === user.id,
      is_attending: activeTab === 'attending' || myEvents.attending.some(e => e.id === event.id),
      is_starred: activeTab === 'starred' || myEvents.starred.some(e => e.id === event.id),
    }));
  };

  const renderEmptyState = () => {
    let icon: string;
    let title: string;
    let description: string;

    switch (activeTab) {
      case 'hosting':
        icon = 'megaphone-outline';
        title = 'No Events Hosted';
        description = 'You haven\'t created any events yet. Start by creating your first event!';
        break;
      case 'attending':
        icon = 'calendar-outline';
        title = 'No Events Attended';
        description = 'You haven\'t RSVP\'d to any events yet. Discover events you\'d like to attend!';
        break;
      case 'starred':
        icon = 'star-outline';
        title = 'No Starred Events';
        description = 'You haven\'t starred any events yet. Star events you\'re interested in!';
        break;
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name={icon as any} size={64} color="#ccc" />
        <Text style={styles.emptyStateTitle}>{title}</Text>
        <Text style={styles.emptyStateDescription}>{description}</Text>
      </View>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your events...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#FF3B30" />
          <Text style={styles.errorTitle}>Failed to Load Events</Text>
          <Text style={styles.errorDescription}>
            Unable to load your events. Please try again.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const currentEvents = getCurrentEvents();

    if (currentEvents.length === 0) {
      return (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {renderEmptyState()}
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {currentEvents.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onPress={() => {
              console.log('=== MyEventsScreen Navigation Debug ===');
              console.log('Navigating to event with ID:', event.id);
              console.log('Event ID type:', typeof event.id);
              console.log('Event title:', event.title);
              console.log('Full event object:', JSON.stringify(event, null, 2));
              navigation.navigate('EventDetail' as never, { eventId: event.id } as never);
            }}
          />
        ))}
      </ScrollView>
    );
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.authPrompt}>
          <Ionicons name="calendar-outline" size={80} color="#ccc" />
          <Text style={styles.authTitle}>Sign In to View Your Events</Text>
          <Text style={styles.authDescription}>
            Sign in to manage your events, RSVPs, and starred events.
          </Text>
          <Button
            title="Sign In"
            onPress={handleSignIn}
            style={styles.signInButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Events</Text>
        <Text style={styles.headerSubtitle}>Manage your events and RSVPs</Text>
      </View>
      
      <View style={styles.tabContainer}>
        {renderTabButton('attending', 'Attending', 'calendar')}
        {renderTabButton('hosting', 'Hosting', 'megaphone')}
        {renderTabButton('starred', 'Starred', 'star')}
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#666',
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
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: '#f5f5f5',
  },
  activeTabButton: {
    backgroundColor: '#e6f3ff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  authDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  signInButton: {
    minWidth: 120,
  },
});