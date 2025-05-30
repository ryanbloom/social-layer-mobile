import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EventWithJoinStatus } from '../types';
import Card from './Card';
import Badge from './Badge';
import { formatEventTime, getEventStatus } from '../utils/dateUtils';
import { LOCAL_TIMEZONE } from '../services/api';
import { colors } from '../utils/colors';

interface EventCardProps {
  event: EventWithJoinStatus;
  onPress: () => void;
  onStarPress?: () => void;
}

function attendanceBadge(event: EventWithJoinStatus, status: string) {
  if (event.is_attending && status === 'past') {
    return <Badge text="Attended" variant="joining" />;
  } else if (event.is_attending) {
    return <Badge text="Attending" variant="joining" />;
  }
}

export default function EventCard({
  event,
  onPress,
  onStarPress,
}: EventCardProps) {
  const eventStatus = getEventStatus(event.start_time, event.end_time);
  const { date, time } = formatEventTime(
    event.start_time,
    event.timezone,
    LOCAL_TIMEZONE
  );

  const customHost = event.event_roles?.find((r) => r.role === 'custom_host');
  const groupHost = event.event_roles?.find((r) => r.role === 'group_host');
  const cohosts = event.event_roles?.filter((r) => r.role === 'co_host');
  const host =
    customHost?.nickname ||
    groupHost?.nickname ||
    event.owner.nickname ||
    event.owner.handle;

  return (
    <Card onPress={onPress} style={styles.container}>
      {/* Star button */}
      {onStarPress && (
        <TouchableOpacity style={styles.starButton} onPress={onStarPress}>
          <Ionicons
            name={event.is_starred ? 'star' : 'star-outline'}
            size={20}
            color={event.is_starred ? colors.star : colors.text.tertiary}
          />
        </TouchableOpacity>
      )}

      <View style={event.cover_url ? styles.content : styles.contentFullWidth}>
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
          {event.is_owner && <Badge text="Hosting" variant="hosting" />}
          {attendanceBadge(event, eventStatus)}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {event.title}
        </Text>

        {/* Tags */}
        {event.tags && event.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {event.tags
              .filter((tag) => !tag.startsWith(':'))
              .slice(0, 3)
              .map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <View
                    style={[
                      styles.tagDot,
                      { backgroundColor: getTagColor(tag) },
                    ]}
                  />
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
          </View>
        )}

        {/* Track */}
        {event.track && (
          <Text
            style={[styles.track, { color: getTagColor(event.track.title) }]}
          >
            {event.track.title}
          </Text>
        )}

        {/* Host */}
        <Text style={styles.host}>
          hosted by {host}
          {cohosts &&
            cohosts.length > 0 &&
            `, ${cohosts.map((c) => c.nickname).join(', ')}`}
        </Text>

        {/* Date and Time */}
        <View style={styles.dateTimeContainer}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={colors.text.secondary}
          />
          <Text style={styles.dateTime}>
            {date} • {time}
          </Text>
        </View>

        {/* Location */}
        {event.location && (
          <View style={styles.locationContainer}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.text.secondary}
            />
            <Text style={styles.location} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        )}

        {/* Meeting URL */}
        {event.meeting_url && (
          <View style={styles.locationContainer}>
            <Ionicons
              name="link-outline"
              size={16}
              color={colors.text.secondary}
            />
            <Text style={styles.location} numberOfLines={1}>
              Online Event
            </Text>
          </View>
        )}
      </View>

      {/* Cover Image - only show when image exists */}
      {event.cover_url && (
        <View style={styles.imageContainer}>
          <Image
            source={{
              uri: event.cover_url,
              cache: 'force-cache',
            }}
            style={styles.image}
            resizeMode="cover"
          />
        </View>
      )}
    </Card>
  );
}

function getTagColor(tag: string): string {
  // Simple hash function to generate consistent colors
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '#FF6B6B',
    '#4ECDC4',
    '#45B7D1',
    '#96CEB4',
    '#FECA57',
    '#FF9FF3',
    '#54A0FF',
  ];
  return colors[Math.abs(hash) % colors.length];
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  starButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    padding: 4,
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  contentFullWidth: {
    flex: 1,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
    lineHeight: 22,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  tagDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  tagText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  track: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  host: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 4,
    flex: 1,
  },
  imageContainer: {
    width: 100,
    height: 100,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});
