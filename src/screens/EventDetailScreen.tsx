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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import {
  useRoute,
  RouteProp,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';

import { RootStackParamList } from '../types';
import { getAuthToken } from '../services/api';
import {
  useEventDetail,
  useStarEventMutation,
  useRSVPMutation,
} from '../services/events';
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

interface ActionButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  hasCover: boolean;
  iconColor?: string;
}

function ActionButton({
  iconName,
  onPress,
  loading,
  disabled,
  hasCover,
  iconColor,
}: ActionButtonProps) {
  const buttonStyle = hasCover
    ? styles.actionButton
    : styles.actionButtonNoCover;
  const defaultColor = hasCover ? colors.text.white : colors.text.secondary;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={hasCover ? colors.text.white : colors.primary}
        />
      ) : (
        <Ionicons name={iconName} size={24} color={iconColor || defaultColor} />
      )}
    </TouchableOpacity>
  );
}

export default function EventDetailScreen() {
  const route = useRoute<EventDetailRouteProp>();
  const navigation = useNavigation();
  const { eventId } = route.params;
  const [isStarred, setIsStarred] = useState(false);

  const starMutation = useStarEventMutation();
  const rsvpMutation = useRSVPMutation();
  const {
    user,
    isDemoMode,
    demoStarredEvents,
    demoAttendingEvents,
    toggleDemoStar,
    toggleDemoAttendance,
  } = useAuth();
  const { allGroups } = useGroup();

  const renderActionButtons = (hasCover: boolean) => {
    const containerStyle = hasCover
      ? styles.actionButtons
      : styles.actionButtonsNoCover;

    return (
      <View style={containerStyle}>
        <ActionButton
          iconName={isStarred ? 'star' : 'star-outline'}
          onPress={handleStarToggle}
          loading={starMutation.isPending}
          hasCover={hasCover}
          iconColor={isStarred ? colors.star : undefined}
        />
        <ActionButton
          iconName="compass-outline"
          onPress={handleOpenInBrowser}
          hasCover={hasCover}
        />
        <ActionButton
          iconName="share-outline"
          onPress={handleShare}
          hasCover={hasCover}
        />
      </View>
    );
  };

  const getEventHosts = () => {
    if (!event) return [];

    const customHost = event.event_roles?.find((r) => r.role === 'custom_host');
    const groupHost = event.event_roles?.find((r) => r.role === 'group_host');
    const cohosts =
      event.event_roles?.filter((r) => r.role === 'co_host') || [];

    const hosts = [];

    // Add primary host
    if (customHost) {
      hosts.push({ ...customHost, isPrimary: true, label: 'Event Host' });
    } else if (groupHost) {
      hosts.push({ ...groupHost, isPrimary: true, label: 'Group Host' });
    } else {
      hosts.push({
        nickname: event.owner.nickname || event.owner.handle,
        image_url: event.owner.image_url,
        isPrimary: true,
        label: 'Event Host',
      });
    }

    // Add co-hosts
    cohosts.forEach((cohost) => {
      hosts.push({ ...cohost, isPrimary: false, label: 'Co-Host' });
    });

    return hosts;
  };

  const renderHost = (host: any, index: number, isLast: boolean) => (
    <View
      key={index}
      style={[styles.hostContainer, isLast && styles.lastHostContainer]}
    >
      {host.image_url ? (
        <HostAvatar imageUrl={host.image_url} hostName={host.nickname} />
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
  );

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

  const parsedEventId = parseInt(eventId.toString(), 10);

  // Use optimized event detail hook that checks cache first
  const {
    data: event,
    isLoading,
    error,
    refetch,
  } = useEventDetail(parsedEventId);

  // Check star status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        checkIfEventIsStarred();
      }
    }, [user, checkIfEventIsStarred])
  );

  const isUserAttending = () => {
    if (!user || !event) return false;

    if (isDemoMode) {
      const eventIdInt = parseInt(eventId.toString(), 10);
      return demoAttendingEvents.has(eventIdInt);
    }

    console.log('Checking if user is attending:', {
      userId: user.id,
      participants: event.participants?.map(p => ({ id: p.profile.id, status: p.status }))
    });

    return event.participants?.some(
      (participant: any) =>
        participant.profile.id === user.id &&
        ['applied', 'attending', 'checked'].includes(participant.status)
    );
  };

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

    try {
      const eventIdInt = parseInt(eventId.toString(), 10);

      // Handle demo mode
      if (isDemoMode) {
        toggleDemoAttendance(eventIdInt);
        if (isUserAttending()) {
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

      const currentlyAttending = isUserAttending();

      // Use optimistic mutation for instant UI updates
      rsvpMutation.mutate({
        eventId: eventIdInt,
        isAttending: currentlyAttending,
        authToken,
        userId: user.id,
      }, {
        onSuccess: () => {
          // Show success message based on the action taken
          if (currentlyAttending) {
            Alert.alert('Canceled', 'You have canceled your RSVP for this event.');
          } else {
            Alert.alert('Success', "Successfully RSVP'd to event!");
          }
        },
        onError: (error: any) => {
          console.error('RSVP error:', error);
          const message = error?.message || 'Failed to update RSVP. Please try again.';
          Alert.alert('Error', message);
        }
      });
    } catch (error: any) {
      console.error('RSVP setup error:', error);
      Alert.alert('Error', 'Failed to initialize RSVP. Please try again.');
    }
  };

  const getEventUrl = () => {
    if (!event) return '';

    const eventGroup = allGroups.find((group) => group.id === event.group?.id);
    const groupHandle = eventGroup?.handle || event.group?.handle || 'event';

    return `https://${groupHandle}.sola.day/event/detail/${event.id}`;
  };

  const handleShare = async () => {
    if (!event) return;

    try {
      const url = getEventUrl();
      await Share.share({ url });
    } catch (error) {
      console.error('Share error:', error);
      Alert.alert('Error', 'Failed to share event. Please try again.');
    }
  };

  const handleOpenInBrowser = async () => {
    if (!event) return;

    try {
      const url = getEventUrl();
      await Linking.openURL(url);
    } catch (error) {
      console.error('Open in browser error:', error);
      Alert.alert(
        'Error',
        'Failed to open event in browser. Please try again.'
      );
    }
  };

  const handleLocationPress = async (event: any) => {
    if (event.meeting_url) return;

    try {
      let url = '';

      if (event.formatted_address) {
        // Prefer formatted address for better accuracy in maps
        const encodedAddress = encodeURIComponent(event.formatted_address);

        const ios_url = `maps:?q=${encodedAddress}`;
        const canOpenMaps = await Linking.canOpenURL(ios_url);
        if (canOpenMaps) {
          url = ios_url;
        } else {
          url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        }
      } else if (event.geo_lat && event.geo_lng) {
        // Use coordinates as fallback if no formatted address
        const lat = parseFloat(event.geo_lat);
        const lng = parseFloat(event.geo_lng);

        const ios_url = `maps:?q=${lat},${lng}`;
        const canOpenMaps = await Linking.canOpenURL(ios_url);
        if (canOpenMaps) {
          url = ios_url;
        } else {
          url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }
      } else if (event.location) {
        // Fallback to location description
        const encodedLocation = encodeURIComponent(event.location);

        const ios_url = `maps:?q=${encodedLocation}`;
        const canOpenMaps = await Linking.canOpenURL(ios_url);
        if (canOpenMaps) {
          url = ios_url;
        } else {
          url = `https://www.google.com/maps/search/?api=1&query=${encodedLocation}`;
        }
      }

      if (url) {
        await Linking.openURL(url);
      }
    } catch (error) {
      console.error('Error opening map:', error);
      Alert.alert('Error', 'Unable to open map application');
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

      // Use optimistic mutation for instant UI updates
      starMutation.mutate({
        eventId: eventIdInt,
        isStarred,
        authToken,
        userId: user.id,
      });

      // Update local state immediately
      setIsStarred(!isStarred);
    } catch (error: any) {
      console.error('Star/unstar error:', error);
      const message =
        error?.message || 'Failed to update star status. Please try again.';
      Alert.alert('Error', message);
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
          {renderActionButtons(true)}
        </View>
      )}

      <View style={event.cover_url ? styles.content : styles.contentNoImage}>
        {/* Action Buttons for events without cover image */}
        {!event.cover_url && renderActionButtons(false)}

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
          {getEventHosts().map((host, index, hosts) =>
            renderHost(host, index, index === hosts.length - 1)
          )}
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
            <TouchableOpacity
              style={styles.infoItem}
              onPress={() => handleLocationPress(event)}
              disabled={!!event.meeting_url}
            >
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
                {event.formatted_address && !event.meeting_url && (
                  <Text style={styles.infoAddress}>
                    {event.formatted_address}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Participants */}
        <View style={styles.infoSection}>
          <TouchableOpacity
            style={styles.infoItem}
            onPress={() => navigation.navigate('Participants', { eventId: parsedEventId })}
          >
            <Ionicons name="people" size={24} color={colors.primary} />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Participants</Text>
              <Text style={styles.infoValue}>
                {event.participants_count} attending
                {event.max_participant && ` • ${event.max_participant} max`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Description */}
        {event.content && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>About This Event</Text>
            <Markdown style={markdownStyles}>{event.content}</Markdown>
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
            title={isUserAttending() ? 'Cancel RSVP' : 'RSVP to Event'}
            onPress={handleRSVP}
            loading={rsvpMutation.isPending}
            size="large"
            style={[
              styles.rsvpButton,
              isUserAttending() && styles.cancelButton,
            ]}
            textStyle={isUserAttending() ? styles.cancelButtonText : undefined}
          />
          <Text style={styles.rsvpNote}>
            {isUserAttending()
              ? 'You are attending this event'
              : 'You can change your RSVP status at any time'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  heading1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
    marginTop: 16,
  },
  heading2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 8,
    marginTop: 12,
  },
  heading3: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 6,
    marginTop: 8,
  },
  paragraph: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
    marginBottom: 8,
  },
  strong: {
    color: colors.text.primary,
    fontWeight: 'bold',
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: colors.primary,
  },
  list_item: {
    fontSize: 16,
    color: colors.text.secondary,
    lineHeight: 24,
  },
  bullet_list: {
    marginBottom: 8,
  },
  ordered_list: {
    marginBottom: 8,
  },
  code_inline: {
    fontFamily: 'monospace',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 14,
  },
  fence: {
    backgroundColor: colors.background.tertiary,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
  },
  code_block: {
    fontFamily: 'monospace',
    fontSize: 14,
    color: colors.text.primary,
  },
  blockquote: {
    backgroundColor: colors.background.tertiary,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    paddingLeft: 12,
    paddingVertical: 8,
    marginVertical: 8,
    fontStyle: 'italic',
  },
});

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
  infoAddress: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginTop: 2,
  },
  locationTap: {
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 4,
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
  cancelButtonText: {
    color: colors.text.white,
  },
  rsvpNote: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  actionButtonsNoCover: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  actionButtonNoCover: {
    padding: 8,
    marginLeft: 8,
  },
});
