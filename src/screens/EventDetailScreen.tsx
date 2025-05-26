import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  useRoute,
  RouteProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';

import { RootStackParamList } from '../types';
import {
  apolloClient,
  GET_EVENT_DETAIL,
  attendEvent,
  cancelAttendance,
  getAuthToken,
  starEvent,
  unstarEvent,
} from '../services/api';
import { gql } from '@apollo/client';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
import Button from '../components/Button';
import Badge from '../components/Badge';
import { formatEventDuration, getEventStatus } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import { colors } from '../utils/colors';
import { Share } from 'react-native';

type EventDetailRouteProp = RouteProp<RootStackParamList, 'EventDetail'>;

interface HostAvatarProps {
  imageUrl: string;
  hostName: string;
}

function HostAvatar({ imageUrl, hostName }: HostAvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  if (imageError) {
    return (
      <View style={[styles.hostAvatar, styles.hostAvatarPlaceholder]}>
        <Ionicons name="person" size={24} color={colors.text.tertiary} />
      </View>
    );
  }
  
  return (
    <Image
      source={{ uri: imageUrl }}
      style={styles.hostAvatar}
      resizeMode="cover"
      onError={() => setImageError(true)}
    />
  );
}

export default function EventDetailScreen() {
  const route = useRoute<EventDetailRouteProp>();
  const navigation = useNavigation();
  const { eventId } = route.params;
  const [isRSVPing, setIsRSVPing] = useState(false);
  const [isStarring, setIsStarring] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const {
    user,
    isDemoMode,
    demoStarredEvents,
    demoAttendingEvents,
    toggleDemoStar,
    toggleDemoAttendance,
  } = useAuth();
  const { allGroups } = useGroup();

  // Function to check if event is starred
  const checkIfEventIsStarred = useCallback(async () => {
    if (!user) {
      setIsStarred(false);
      return;
    }

    // Handle demo mode
    if (isDemoMode) {
      const eventIdInt = parseInt(eventId.toString(), 10);
      setIsStarred(demoStarredEvents.has(eventIdInt));
      return;
    }

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        setIsStarred(false);
        return;
      }

      const starredUrl = `${API_URL}/event/my_event_list?collection=my_stars&auth_token=${authToken}`;
      const response = await fetch(starredUrl);
      if (response.ok) {
        const data = await response.json();
        const starredEvents = data.events || [];
        const eventIdInt = parseInt(eventId.toString(), 10);
        const isEventStarred = starredEvents.some(
          (starredEvent: any) => starredEvent.id === eventIdInt
        );
        setIsStarred(isEventStarred);
      } else {
        setIsStarred(false);
      }
    } catch (error) {
      console.warn('Failed to check if event is starred:', error);
      setIsStarred(false);
    }
  }, [user, eventId, isDemoMode, demoStarredEvents]);

  const {
    data: event,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['event', eventId],
    queryFn: async () => {
      console.log('=== EventDetailScreen Debug ===');
      console.log('Raw eventId from route params:', eventId);
      console.log('eventId type:', typeof eventId);
      console.log('eventId value:', JSON.stringify(eventId));

      const parsedId = parseInt(eventId.toString(), 10);
      console.log('Parsed eventId:', parsedId);
      console.log('Parsed eventId type:', typeof parsedId);
      console.log('Is parsedId valid number?', !isNaN(parsedId));

      console.log('Making GraphQL query with variables:', { id: parsedId });
      console.log('GraphQL query string:', GET_EVENT_DETAIL.loc?.source?.body);

      // Try a simple query first to see if the event exists
      const SIMPLE_EVENT_QUERY = gql`
        query GetSimpleEvent($id: bigint!) {
          events_by_pk(id: $id) {
            id
            title
            start_time
            end_time
          }
        }
      `;

      console.log('Trying simple query first...');

      try {
        const simpleResult = await apolloClient.query({
          query: SIMPLE_EVENT_QUERY,
          variables: { id: parsedId },
          fetchPolicy: 'network-only',
          errorPolicy: 'all',
        });

        console.log('Simple query result:', simpleResult.data);

        if (!simpleResult.data.events_by_pk) {
          console.log('Event not found with simple query');
          return null;
        }

        console.log('Event exists, trying full query...');

        const result = await apolloClient.query({
          query: GET_EVENT_DETAIL,
          variables: { id: parsedId },
          fetchPolicy: 'network-only',
          errorPolicy: 'all', // Get partial data even if there are errors
        });

        console.log('Result data:', JSON.stringify(result.data, null, 2));
        console.log('events_by_pk value:', result.data.events_by_pk);

        if (!result.data.events_by_pk) {
          console.log('WARNING: events_by_pk is null/undefined');
        }

        const eventData = result.data.events_by_pk;

        // Check if user has starred this event
        if (user && eventData) {
          await checkIfEventIsStarred();
        }

        return eventData;
      } catch (error) {
        console.log('GraphQL query failed with error:', error);
        console.log('Error message:', error.message);
        console.log('Error details:', JSON.stringify(error, null, 2));
        throw error;
      }
    },
  });

  // Check star status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        checkIfEventIsStarred();
      }
    }, [user, checkIfEventIsStarred])
  );

  // Check if user is already attending this event
  const isUserAttending = (() => {
    if (!user || !event) return false;

    // Handle demo mode
    if (isDemoMode) {
      const eventIdInt = parseInt(eventId.toString(), 10);
      return demoAttendingEvents.has(eventIdInt);
    }

    // Regular mode - check participants list
    return event.participants?.some(
      (participant: any) =>
        participant.profile.id === user.id &&
        ['applied', 'attending', 'checked'].includes(participant.status)
    );
  })();

  const handleRSVP = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to RSVP to events.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign In',
          onPress: () => navigation.navigate('Auth' as never),
        },
      ]);
      return;
    }

    setIsRSVPing(true);

    try {
      const eventIdInt = parseInt(eventId.toString(), 10);

      // Handle demo mode
      if (isDemoMode) {
        toggleDemoAttendance(eventIdInt);
        if (isUserAttending) {
          Alert.alert(
            'Canceled',
            'You have canceled your RSVP for this event.'
          );
        } else {
          Alert.alert('Success', "Successfully RSVP'd to event!");
        }
        return;
      }

      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      if (isUserAttending) {
        // Cancel attendance
        await cancelAttendance(eventIdInt, authToken);
        Alert.alert('Canceled', 'You have canceled your RSVP for this event.');
      } else {
        // Attend event
        await attendEvent(eventIdInt, authToken);
        Alert.alert('Success', "Successfully RSVP'd to event!");
      }

      // Refresh event data to show updated participant list
      await refetch();
    } catch (error: any) {
      console.error('RSVP error:', error);
      const message =
        error?.message || 'Failed to update RSVP. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsRSVPing(false);
    }
  };

  const handleShare = async () => {
    if (!event) return;

    try {
      // Find the group info for the event
      const eventGroup = allGroups.find(
        (group) => group.id === event.group?.id
      );
      const groupHandle = eventGroup?.handle || event.group?.handle || 'event';

      // Create dynamic share URL based on the group
      const url = `https://${groupHandle}.sola.day/event/detail/${event.id}`;

      await Share.share({
        url: url,
      });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share event. Please try again.');
    }
  };

  const handleStarToggle = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to star events.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign In',
          onPress: () => navigation.navigate('Auth' as never),
        },
      ]);
      return;
    }

    if (!event) return;

    setIsStarring(true);

    try {
      const eventIdInt = parseInt(eventId.toString(), 10);

      // Handle demo mode
      if (isDemoMode) {
        toggleDemoStar(eventIdInt);
        await checkIfEventIsStarred();
        return;
      }

      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      if (isStarred) {
        // Unstar event
        await unstarEvent(eventIdInt, authToken);
      } else {
        // Star event
        await starEvent(eventIdInt, authToken);
      }

      // Reload star status from server to ensure consistency
      await checkIfEventIsStarred();
    } catch (error: any) {
      console.error('Star/unstar error:', error);
      const message =
        error?.message || 'Failed to update star status. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setIsStarring(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading event details...</Text>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name="alert-circle-outline"
          size={64}
          color={colors.status.error}
        />
        <Text style={styles.errorTitle}>Event Not Found</Text>
        <Text style={styles.errorDescription}>
          The event you're looking for doesn't exist or has been removed.
        </Text>
      </View>
    );
  }

  const eventStatus = getEventStatus(event.start_time, event.end_time);
  const duration = formatEventDuration(
    event.start_time,
    event.end_time,
    event.timezone
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header Image - only show when image exists */}
      {event.cover_url && (
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: event.cover_url,
              cache: 'force-cache',
            }}
            style={styles.coverImage}
            resizeMode="cover"
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleStarToggle}
              disabled={isStarring}
            >
              {isStarring ? (
                <ActivityIndicator size="small" color={colors.text.white} />
              ) : (
                <Ionicons
                  name={isStarred ? 'star' : 'star-outline'}
                  size={24}
                  color={isStarred ? colors.star : colors.text.white}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons
                name="share-outline"
                size={24}
                color={colors.text.white}
              />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={event.cover_url ? styles.content : styles.contentNoImage}>
        {/* Action Buttons for events without cover image */}
        {!event.cover_url && (
          <View style={styles.actionButtonsNoCover}>
            <TouchableOpacity
              style={styles.actionButtonNoCover}
              onPress={handleStarToggle}
              disabled={isStarring}
            >
              {isStarring ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons
                  name={isStarred ? 'star' : 'star-outline'}
                  size={24}
                  color={isStarred ? colors.accent : colors.text.secondary}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButtonNoCover}
              onPress={handleShare}
            >
              <Ionicons
                name="share-outline"
                size={24}
                color={colors.text.secondary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Badges */}
        <View style={styles.badgeContainer}>
          {eventStatus === 'past' && <Badge text="Past" variant="past" />}
          {event.display === 'private' && (
            <Badge text="Private" variant="private" />
          )}
          {event.status === 'pending' && (
            <Badge text="Pending" variant="pending" />
          )}
          {event.status === 'cancel' && (
            <Badge text="Canceled" variant="cancel" />
          )}
          {eventStatus === 'ongoing' && (
            <Badge text="Ongoing" variant="ongoing" />
          )}
          {eventStatus === 'upcoming' && (
            <Badge text="Upcoming" variant="upcoming" />
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Host Info */}
        <View style={styles.hostSection}>
          {(() => {
            const customHost = event.event_roles?.find((r) => r.role === 'custom_host');
            const groupHost = event.event_roles?.find((r) => r.role === 'group_host');
            const cohosts = event.event_roles?.filter((r) => r.role === 'co_host') || [];
            
            const hosts = [];
            
            // Add primary host
            if (customHost) {
              hosts.push({ ...customHost, isPrimary: true, label: 'Custom Host' });
            } else if (groupHost) {
              hosts.push({ ...groupHost, isPrimary: true, label: 'Group Host' });
            } else {
              hosts.push({ 
                nickname: event.owner.nickname || event.owner.handle,
                image_url: event.owner.image_url,
                isPrimary: true,
                label: 'Event Host'
              });
            }
            
            // Add co-hosts
            cohosts.forEach(cohost => {
              hosts.push({ ...cohost, isPrimary: false, label: 'Co-Host' });
            });
            
            return hosts.map((host, index) => (
              <View key={index} style={[styles.hostContainer, index === hosts.length - 1 && styles.lastHostContainer]}>
                {host.image_url ? (
                  <HostAvatar 
                    imageUrl={host.image_url} 
                    hostName={host.nickname} 
                  />
                ) : (
                  <View style={[styles.hostAvatar, styles.hostAvatarPlaceholder]}>
                    <Ionicons name="person" size={24} color={colors.text.tertiary} />
                  </View>
                )}
                <View style={styles.hostInfo}>
                  <Text style={styles.hostName}>{host.nickname}</Text>
                  <Text style={styles.hostLabel}>{host.label}</Text>
                </View>
              </View>
            ));
          })()}
        </View>

        {/* Date & Time */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="calendar" size={24} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Date & Time</Text>
              <Text style={styles.infoValue}>{duration}</Text>
            </View>
          </View>
        </View>

        {/* Location */}
        {(event.location || event.meeting_url) && (
          <View style={styles.infoSection}>
            <View style={styles.infoItem}>
              <Ionicons
                name={event.meeting_url ? 'videocam' : 'location'}
                size={24}
                color={colors.primary}
              />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>
                  {event.meeting_url ? 'Online Event' : 'Location'}
                </Text>
                <Text style={styles.infoValue}>
                  {event.location || 'Online'}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Participants */}
        <View style={styles.infoSection}>
          <View style={styles.infoItem}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Participants</Text>
              <Text style={styles.infoValue}>
                {event.participants_count} attending
                {event.max_participant && ` • ${event.max_participant} max`}
              </Text>
            </View>
          </View>
        </View>

        {/* Description */}
        {event.content && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About This Event</Text>
            <Text style={styles.description}>{event.content}</Text>
          </View>
        )}

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {event.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* RSVP Button */}
        <View style={styles.rsvpContainer}>
          <Button
            title={isUserAttending ? 'Cancel RSVP' : 'RSVP to Event'}
            onPress={handleRSVP}
            loading={isRSVPing}
            size="large"
            style={[styles.rsvpButton, isUserAttending && styles.cancelButton]}
          />
          <Text style={styles.rsvpNote}>
            {isUserAttending
              ? 'You are attending this event'
              : 'You can change your RSVP status at any time'}
          </Text>
        </View>
      </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  imageContainer: {
    position: 'relative',
    height: 250,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  actionButtons: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
  },
  actionButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  contentNoImage: {
    backgroundColor: colors.background.secondary,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 20,
    lineHeight: 36,
  },
  hostSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  hostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  lastHostContainer: {
    marginBottom: 0,
  },
  hostAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  hostAvatarPlaceholder: {
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hostInfo: {
    flex: 1,
  },
  hostInfoNoImage: {
    marginLeft: 0,
  },
  hostName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  hostLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  infoSection: {
    marginBottom: 20,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: colors.text.primary,
    lineHeight: 22,
  },
  descriptionSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  tagsSection: {
    marginBottom: 32,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  rsvpContainer: {
    alignItems: 'center',
  },
  rsvpButton: {
    width: '100%',
    marginBottom: 12,
  },
  cancelButton: {
    backgroundColor: colors.status.error,
  },
  rsvpNote: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});
