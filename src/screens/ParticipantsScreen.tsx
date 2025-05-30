import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';

import { RootStackParamList } from '../types';
import { useEventDetail } from '../services/events';
import { useQueryClient } from '@tanstack/react-query';
import { eventDetailCache } from '../services/caching';
import { colors } from '../utils/colors';

type ParticipantsRouteProp = RouteProp<RootStackParamList, 'Participants'>;

interface ParticipantItemProps {
  participant: any;
}

function ParticipantItem({ participant }: ParticipantItemProps) {
  const profile = participant.profile;

  return (
    <View style={styles.participantContainer}>
      <View style={styles.participantInfo}>
        {profile.image_url ? (
          <Image
            source={{ uri: profile.image_url }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={20} color={colors.text.tertiary} />
          </View>
        )}
        <View style={styles.nameContainer}>
          <Text style={styles.name}>
            {profile.nickname || profile.handle || 'Anonymous'}
          </Text>
          {profile.handle && profile.nickname && (
            <Text style={styles.handle}>@{profile.handle}</Text>
          )}
        </View>
      </View>
      <View style={styles.statusContainer}>
        <View style={[styles.statusDot, getStatusColor(participant.status)]} />
        <Text style={styles.statusText}>
          {getStatusText(participant.status)}
        </Text>
      </View>
    </View>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'checked':
      return { backgroundColor: colors.status.success };
    case 'attending':
      return { backgroundColor: colors.primary };
    case 'applied':
      return { backgroundColor: colors.status.warning };
    default:
      return { backgroundColor: colors.text.tertiary };
  }
}

function getStatusText(status: string) {
  switch (status) {
    case 'checked':
      return 'Checked in';
    case 'attending':
      return 'Attending';
    case 'applied':
      return 'Applied';
    default:
      return 'Unknown';
  }
}

export default function ParticipantsScreen() {
  const route = useRoute<ParticipantsRouteProp>();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { eventId } = route.params;

  const parsedEventId = parseInt(eventId.toString(), 10);
  const {
    data: event,
    isLoading,
    error,
    refetch,
  } = useEventDetail(parsedEventId, true); // Force refresh to bypass cache

  // Debug log to see what data we're getting
  console.log('ParticipantsScreen - Event data:', {
    eventId: parsedEventId,
    participantsCount: event?.participants_count,
    participantsArray: event?.participants,
    participantsLength: event?.participants?.length,
    ticketsLength: event?.tickets?.length,
  });

  // Filter participants based on ticket status (matching web app logic)
  const getFilteredParticipants = (event: any) => {
    if (!event?.participants) return [];
    
    if (!event?.tickets?.length) {
      // No tickets, show all participants
      return event.participants;
    } else {
      // Has tickets, filter by payment status
      return event.participants.filter((participant: any) => {
        if (!participant.ticket_id) return true;
        const ticket = event.tickets?.find((t: any) => t.id === participant.ticket_id);
        if (!ticket?.payment_methods?.length) {
          return true; // Free ticket
        } else {
          return participant.payment_status === 'succeeded'; // Paid ticket
        }
      });
    }
  };

  const participants = getFilteredParticipants(event);

  const renderParticipant = ({ item }: { item: any }) => (
    <ParticipantItem participant={item} />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
      </TouchableOpacity>
      <Text style={styles.title}>Participants</Text>
      <View style={styles.placeholder} />
    </View>
  );

  const renderEmptyState = () => {
    // If we're still loading or data is being fetched, show loading spinner
    if (isLoading || (event?.participants_count > 0 && !event?.participants)) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading participants...</Text>
        </View>
      );
    }

    // Show actual empty state
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
        <Text style={styles.emptyTitle}>No Participants Yet</Text>
        <Text style={styles.emptyDescription}>
          Be the first to RSVP to this event!
        </Text>
        {event?.participants_count > 0 && (
          <TouchableOpacity style={styles.refreshButton} onPress={async () => {
            // Clear all caches and force fresh fetch
            await eventDetailCache.clear(parsedEventId);
            queryClient.removeQueries({ queryKey: ['eventDetail', parsedEventId] });
            queryClient.invalidateQueries({ queryKey: ['eventDetail', parsedEventId] });
            refetch();
          }}>
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading participants...</Text>
        </View>
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.errorContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={64}
            color={colors.status.error}
          />
          <Text style={styles.errorTitle}>Error Loading Participants</Text>
          <Text style={styles.errorDescription}>
            Unable to load the participant list. Please try again.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <View style={styles.content}>
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {participants.length > 0 ? (
              `${participants.length} participants`
            ) : (
              `${event.participants_count} participants total`
            )}
            {event.max_participant && ` • ${event.max_participant} max`}
          </Text>
        </View>
        <FlatList
          data={participants}
          renderItem={renderParticipant}
          keyExtractor={(item, index) => `${item.profile?.id || item.id}-${index}`}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  statsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  statsText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  participantContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.tertiary,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  avatarPlaceholder: {
    backgroundColor: colors.background.tertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  handle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  refreshText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
    marginLeft: 6,
  },
});