import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from '@tanstack/react-query';
import {
  getMyEvents,
  starEvent,
  unstarEvent,
  attendEvent,
  cancelAttendance,
  getAuthToken,
  apolloClient,
  getEventsForGroup,
  getEventsWithPagination,
  GET_EVENT_DETAIL,
  searchEvents,
} from './api';
import {
  starredEventsCache,
  attendingEventsCache,
  eventDetailCache,
  preloadEventDetails,
} from './caching';
import { Event, EventWithJoinStatus } from '../types';

// Query Keys
export const QUERY_KEYS = {
  EVENTS: 'events',
  MY_EVENTS: 'myEvents',
  EVENT_DETAIL: 'eventDetail',
  STARRED_EVENTS: 'starredEvents',
  ATTENDING_EVENTS: 'attendingEvents',
  SEARCH_EVENTS: 'searchEvents',
} as const;

// Hook to get events for a group with optimized caching
export const useEvents = (groupId: number, upcomingOnly: boolean = false) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [QUERY_KEYS.EVENTS, groupId, upcomingOnly],
    queryFn: async () => {
      console.log(
        'useEvents: Starting query for groupId:',
        groupId,
        'upcomingOnly:',
        upcomingOnly
      );
      const { query, variables } = getEventsForGroup(groupId, upcomingOnly);
      console.log('useEvents: Query variables:', variables);

      const result = await apolloClient.query({
        query,
        variables,
        fetchPolicy: 'cache-first', // Use cache when available
      });

      const events = result.data.events || [];
      console.log('useEvents: Received events:', events.length);
      console.log(
        'useEvents: First few events:',
        events
          .slice(0, 3)
          .map((e) => ({ id: e.id, title: e.title, start_time: e.start_time }))
      );

      // Preload event details into cache for faster detail view access
      await preloadEventDetails(events);

      return events;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
  });
};

// Hook to get events with infinite scroll pagination
export const useInfiniteEvents = (
  groupId: number,
  upcomingOnly: boolean = false
) => {
  const queryClient = useQueryClient();

  return useInfiniteQuery({
    queryKey: [
      QUERY_KEYS.EVENTS,
      'infinite',
      groupId,
      upcomingOnly ? 'upcoming' : 'all',
    ],
    queryFn: async ({ pageParam = 0 }) => {
      console.log(
        'useInfiniteEvents: Starting query for groupId:',
        groupId,
        'upcomingOnly:',
        upcomingOnly,
        'offset:',
        pageParam
      );

      // Use pagination function for infinite scroll
      const { query, variables } = getEventsWithPagination(
        groupId,
        20,
        pageParam
      );

      // If we need upcoming only, filter the where clause
      if (upcomingOnly) {
        const now = new Date();
        variables.where = {
          ...variables.where,
          end_time: { _gte: now.toISOString() },
        };
      }

      console.log('useInfiniteEvents: Query variables:', variables);

      const result = await apolloClient.query({
        query,
        variables,
        fetchPolicy: 'cache-first',
      });

      const events = result.data.events || [];
      console.log(
        'useInfiniteEvents: Received events for page:',
        pageParam,
        'count:',
        events.length
      );

      // Preload event details into cache for faster detail view access
      await preloadEventDetails(events);

      return {
        events,
        nextOffset: events.length === 20 ? pageParam + 20 : undefined,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in memory for 30 minutes
  });
};

// Hook to get event detail with cache fallback
export const useEventDetail = (eventId: number, forceRefresh: boolean = false) => {
  return useQuery({
    queryKey: [QUERY_KEYS.EVENT_DETAIL, eventId],
    queryFn: async () => {
      // If force refresh is requested, skip cache
      if (forceRefresh) {
        console.log('Force refreshing event detail for event', eventId);
        await eventDetailCache.clear(eventId);
      } else {
        // First, try to get from cache
        const cachedEvent = await eventDetailCache.get(eventId);
        if (cachedEvent) {
          console.log('Using cached event detail for event', eventId);
          return cachedEvent;
        }
      }

      // If not in cache, fetch from API
      console.log('Fetching event detail from API for event', eventId);
      const result = await apolloClient.query({
        query: GET_EVENT_DETAIL,
        variables: { id: eventId },
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
      });

      const event = result.data.events_by_pk;
      console.log('Fetched event from API:', {
        eventId,
        hasParticipants: !!event?.participants,
        participantsLength: event?.participants?.length,
        hasTickets: !!event?.tickets,
        ticketsLength: event?.tickets?.length,
      });

      // Cache the result
      if (event) {
        await eventDetailCache.set(eventId, event);
      }

      return event;
    },
    staleTime: forceRefresh ? 0 : 10 * 60 * 1000, // No stale time if force refresh
    gcTime: 60 * 60 * 1000, // Keep in memory for 1 hour
    // Return cached data while refetching in background
    placeholderData: forceRefresh ? undefined : (previousData) => previousData,
  });
};

// Hook to get user's events with optimistic updates
export const useMyEvents = (
  userId?: number,
  isDemoMode = false,
  demoStarredEvents?: Set<number>,
  demoAttendingEvents?: Set<number>
) => {
  return useQuery({
    queryKey: [
      QUERY_KEYS.MY_EVENTS,
      userId,
      isDemoMode,
      Array.from(demoStarredEvents || []).sort(),
      Array.from(demoAttendingEvents || []).sort(),
    ],
    queryFn: async () => {
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      // Handle demo mode
      if (isDemoMode && demoStarredEvents && demoAttendingEvents) {
        // Get events from the current group
        const queryClient = useQueryClient();
        const eventsQuery = queryClient.getQueryData([
          QUERY_KEYS.EVENTS,
        ]) as Event[];

        if (eventsQuery) {
          const attendingEvents = eventsQuery.filter((event: Event) =>
            demoAttendingEvents.has(event.id)
          );
          const starredEvents = eventsQuery.filter((event: Event) =>
            demoStarredEvents.has(event.id)
          );

          return {
            attending: attendingEvents,
            hosting: [],
            starred: starredEvents,
          };
        }
      }

      return getMyEvents(authToken);
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for user-specific data
    gcTime: 15 * 60 * 1000, // Keep in memory for 15 minutes
  });
};

// Optimistic star/unstar mutation
export const useStarEventMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      isStarred,
      authToken,
      userId,
    }: {
      eventId: number;
      isStarred: boolean;
      authToken: string;
      userId?: number;
    }) => {
      if (isStarred) {
        await unstarEvent(eventId, authToken);
      } else {
        await starEvent(eventId, authToken);
      }

      // Update local cache
      if (userId) {
        if (isStarred) {
          await starredEventsCache.remove(userId, eventId);
        } else {
          await starredEventsCache.add(userId, eventId);
        }
      }
    },
    onMutate: async ({ eventId, isStarred, userId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.MY_EVENTS] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.EVENTS] });

      // Snapshot the previous value
      const previousMyEvents = queryClient.getQueryData([
        QUERY_KEYS.MY_EVENTS,
        userId,
      ]);
      const previousEvents = queryClient.getQueryData([QUERY_KEYS.EVENTS]);

      // Optimistically update my events
      queryClient.setQueryData([QUERY_KEYS.MY_EVENTS, userId], (old: any) => {
        if (!old) return old;

        const newStarred = [...old.starred];

        if (isStarred) {
          // Remove from starred
          const index = newStarred.findIndex((e: Event) => e.id === eventId);
          if (index !== -1) {
            newStarred.splice(index, 1);
          }
        } else {
          // Add to starred - need to find the event from events list
          const eventsData = queryClient.getQueryData([
            QUERY_KEYS.EVENTS,
          ]) as Event[];
          const eventToStar = eventsData?.find((e: Event) => e.id === eventId);
          if (eventToStar && !newStarred.find((e: Event) => e.id === eventId)) {
            newStarred.push(eventToStar);
          }
        }

        return {
          ...old,
          starred: newStarred,
        };
      });

      // Optimistically update events list
      queryClient.setQueryData(
        [QUERY_KEYS.EVENTS],
        (old: EventWithJoinStatus[]) => {
          if (!old) return old;

          return old.map((event: EventWithJoinStatus) =>
            event.id === eventId ? { ...event, is_starred: !isStarred } : event
          );
        }
      );

      return { previousMyEvents, previousEvents };
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousMyEvents) {
        queryClient.setQueryData(
          [QUERY_KEYS.MY_EVENTS, variables.userId],
          context.previousMyEvents
        );
      }
      if (context?.previousEvents) {
        queryClient.setQueryData([QUERY_KEYS.EVENTS], context.previousEvents);
      }
      console.error('Star mutation failed:', err);
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MY_EVENTS, variables.userId],
      });
    },
  });
};

// Optimistic RSVP mutation
export const useRSVPMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      isAttending,
      authToken,
      userId,
    }: {
      eventId: number;
      isAttending: boolean;
      authToken: string;
      userId?: number;
    }) => {
      if (isAttending) {
        await cancelAttendance(eventId, authToken);
      } else {
        await attendEvent(eventId, authToken);
      }

      // Update local cache
      if (userId) {
        if (isAttending) {
          await attendingEventsCache.remove(userId, eventId);
        } else {
          await attendingEventsCache.add(userId, eventId);
        }
      }
    },
    onMutate: async ({ eventId, isAttending, userId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.MY_EVENTS] });
      await queryClient.cancelQueries({ queryKey: [QUERY_KEYS.EVENT_DETAIL] });

      // Snapshot the previous value
      const previousMyEvents = queryClient.getQueryData([
        QUERY_KEYS.MY_EVENTS,
        userId,
      ]);
      const previousEventDetail = queryClient.getQueryData([
        QUERY_KEYS.EVENT_DETAIL,
        eventId,
      ]);

      // Optimistically update my events
      queryClient.setQueryData([QUERY_KEYS.MY_EVENTS, userId], (old: any) => {
        if (!old) return old;

        const newAttending = [...old.attending];

        if (isAttending) {
          // Remove from attending
          const index = newAttending.findIndex((e: Event) => e.id === eventId);
          if (index !== -1) {
            newAttending.splice(index, 1);
          }
        } else {
          // Add to attending - need to find the event from events list
          const eventsData = queryClient.getQueryData([
            QUERY_KEYS.EVENTS,
          ]) as Event[];
          const eventToAttend = eventsData?.find(
            (e: Event) => e.id === eventId
          );
          if (
            eventToAttend &&
            !newAttending.find((e: Event) => e.id === eventId)
          ) {
            newAttending.push(eventToAttend);
          }
        }

        return {
          ...old,
          attending: newAttending,
        };
      });

      // Optimistically update event detail participant count
      queryClient.setQueryData(
        [QUERY_KEYS.EVENT_DETAIL, eventId],
        (old: any) => {
          if (!old) return old;

          const countChange = isAttending ? -1 : 1;

          return {
            ...old,
            participants_count: Math.max(
              0,
              old.participants_count + countChange
            ),
          };
        }
      );

      return { previousMyEvents, previousEventDetail };
    },
    onError: (err, variables, context) => {
      // Revert the optimistic update on error
      if (context?.previousMyEvents) {
        queryClient.setQueryData(
          [QUERY_KEYS.MY_EVENTS, variables.userId],
          context.previousMyEvents
        );
      }
      if (context?.previousEventDetail) {
        queryClient.setQueryData(
          [QUERY_KEYS.EVENT_DETAIL, variables.eventId],
          context.previousEventDetail
        );
      }
      console.error('RSVP mutation failed:', err);
    },
    onSettled: (data, error, variables) => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MY_EVENTS, variables.userId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.EVENT_DETAIL, variables.eventId],
      });
    },
  });
};

// Hook to get cached starred events for immediate local updates
export const useStarredEventsCache = (userId?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.STARRED_EVENTS, userId],
    queryFn: async () => {
      if (!userId) return new Set<number>();
      return await starredEventsCache.get(userId);
    },
    enabled: !!userId,
    staleTime: Infinity, // Cache is always fresh
  });
};

// Hook to get cached attending events for immediate local updates
export const useAttendingEventsCache = (userId?: number) => {
  return useQuery({
    queryKey: [QUERY_KEYS.ATTENDING_EVENTS, userId],
    queryFn: async () => {
      if (!userId) return new Set<number>();
      return await attendingEventsCache.get(userId);
    },
    enabled: !!userId,
    staleTime: Infinity, // Cache is always fresh
  });
};

// Hook to search events with debouncing
export const useSearchEvents = (
  searchQuery: string,
  groupId: number,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: [QUERY_KEYS.SEARCH_EVENTS, searchQuery, groupId],
    queryFn: async () => {
      if (!searchQuery.trim()) {
        return [];
      }

      const results = await searchEvents(searchQuery, groupId);

      // Preload event details into cache for faster detail view access
      await preloadEventDetails(results);

      return results;
    },
    enabled: enabled && !!searchQuery.trim(),
    staleTime: 0, // Always fetch fresh search results
    gcTime: 5 * 60 * 1000, // Keep in memory for 5 minutes only
    refetchOnWindowFocus: false,
  });
};
