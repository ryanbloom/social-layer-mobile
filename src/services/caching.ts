import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { persistQueryClient } from '@tanstack/react-query-persist-client';

// Cache keys
const CACHE_KEYS = {
  STARRED_EVENTS: 'starred_events_cache',
  USER_EVENTS: 'user_events_cache',
  EVENTS_LIST: 'events_list_cache',
  EVENT_DETAIL: 'event_detail_cache',
} as const;

// Create persister for React Query
export const createPersister = () => {
  return createAsyncStoragePersister({
    storage: AsyncStorage,
    throttleTime: 1000, // Don't persist more than once per second
  });
};

// Configure Query Client with optimized settings
export const createQueryClient = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Cache for 10 minutes by default
        staleTime: 10 * 60 * 1000,
        // Keep unused data for 30 minutes
        gcTime: 30 * 60 * 1000,
        // Retry failed requests
        retry: 2,
        // Don't refetch on window focus in mobile app
        refetchOnWindowFocus: false,
        // Refetch on reconnect
        refetchOnReconnect: true,
      },
      mutations: {
        // Retry failed mutations once
        retry: 1,
      },
    },
  });

  return queryClient;
};

// Setup persistence
export const setupPersistence = async (queryClient: QueryClient) => {
  const persister = createPersister();

  try {
    await persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      buster: '1.0', // Change this to invalidate all cached data
    });
  } catch (error) {
    console.warn('Failed to setup query persistence:', error);
  }
};

// Manual cache management for starred events
export const starredEventsCache = {
  async get(userId: number): Promise<Set<number>> {
    try {
      const cached = await AsyncStorage.getItem(
        `${CACHE_KEYS.STARRED_EVENTS}_${userId}`
      );
      if (cached) {
        const starredIds = JSON.parse(cached);
        return new Set(starredIds);
      }
    } catch (error) {
      console.warn('Failed to get starred events from cache:', error);
    }
    return new Set();
  },

  async set(userId: number, starredEventIds: Set<number>): Promise<void> {
    try {
      const starredArray = Array.from(starredEventIds);
      await AsyncStorage.setItem(
        `${CACHE_KEYS.STARRED_EVENTS}_${userId}`,
        JSON.stringify(starredArray)
      );
    } catch (error) {
      console.warn('Failed to cache starred events:', error);
    }
  },

  async add(userId: number, eventId: number): Promise<void> {
    const current = await this.get(userId);
    current.add(eventId);
    await this.set(userId, current);
  },

  async remove(userId: number, eventId: number): Promise<void> {
    const current = await this.get(userId);
    current.delete(eventId);
    await this.set(userId, current);
  },

  async clear(userId: number): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_KEYS.STARRED_EVENTS}_${userId}`);
    } catch (error) {
      console.warn('Failed to clear starred events cache:', error);
    }
  },
};

// Cache for user RSVP status
export const attendingEventsCache = {
  async get(userId: number): Promise<Set<number>> {
    try {
      const cached = await AsyncStorage.getItem(
        `${CACHE_KEYS.USER_EVENTS}_${userId}`
      );
      if (cached) {
        const attendingIds = JSON.parse(cached);
        return new Set(attendingIds);
      }
    } catch (error) {
      console.warn('Failed to get attending events from cache:', error);
    }
    return new Set();
  },

  async set(userId: number, attendingEventIds: Set<number>): Promise<void> {
    try {
      const attendingArray = Array.from(attendingEventIds);
      await AsyncStorage.setItem(
        `${CACHE_KEYS.USER_EVENTS}_${userId}`,
        JSON.stringify(attendingArray)
      );
    } catch (error) {
      console.warn('Failed to cache attending events:', error);
    }
  },

  async add(userId: number, eventId: number): Promise<void> {
    const current = await this.get(userId);
    current.add(eventId);
    await this.set(userId, current);
  },

  async remove(userId: number, eventId: number): Promise<void> {
    const current = await this.get(userId);
    current.delete(eventId);
    await this.set(userId, current);
  },

  async clear(userId: number): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${CACHE_KEYS.USER_EVENTS}_${userId}`);
    } catch (error) {
      console.warn('Failed to clear attending events cache:', error);
    }
  },
};

// Event detail cache for offline access
export const eventDetailCache = {
  async get(eventId: number): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(
        `${CACHE_KEYS.EVENT_DETAIL}_${eventId}`
      );
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is still fresh (less than 1 hour old)
        const maxAge = 60 * 60 * 1000; // 1 hour
        if (Date.now() - data.timestamp < maxAge) {
          return data.event;
        }
      }
    } catch (error) {
      console.warn('Failed to get event detail from cache:', error);
    }
    return null;
  },

  async set(eventId: number, event: any): Promise<void> {
    try {
      const cacheData = {
        event,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        `${CACHE_KEYS.EVENT_DETAIL}_${eventId}`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.warn('Failed to cache event detail:', error);
    }
  },

  async clear(eventId?: number): Promise<void> {
    try {
      if (eventId) {
        await AsyncStorage.removeItem(`${CACHE_KEYS.EVENT_DETAIL}_${eventId}`);
      } else {
        // Clear all event detail caches
        const keys = await AsyncStorage.getAllKeys();
        const eventDetailKeys = keys.filter((key) =>
          key.startsWith(CACHE_KEYS.EVENT_DETAIL)
        );
        await AsyncStorage.multiRemove(eventDetailKeys);
      }
    } catch (error) {
      console.warn('Failed to clear event detail cache:', error);
    }
  },
};

// Utility to clear all caches
export const clearAllCaches = async (): Promise<void> => {
  try {
    await Promise.all([
      eventDetailCache.clear(),
      AsyncStorage.clear(), // This will clear everything, use with caution
    ]);
  } catch (error) {
    console.warn('Failed to clear all caches:', error);
  }
};

// Cache preloader - preload event details from list data
export const preloadEventDetails = async (events: any[]): Promise<void> => {
  try {
    const promises = events.map((event) =>
      eventDetailCache.set(event.id, event)
    );
    await Promise.all(promises);
  } catch (error) {
    console.warn('Failed to preload event details:', error);
  }
};
