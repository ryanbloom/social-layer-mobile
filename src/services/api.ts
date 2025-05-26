import {
  ApolloClient,
  InMemoryCache,
  gql,
  createHttpLink,
  from,
} from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { onError } from "@apollo/client/link/error";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Profile, Event, EventWithJoinStatus, Group } from "../types";

// API Configuration
const API_URL = Constants.expoConfig?.extra?.apiUrl;
const GRAPH_URL = Constants.expoConfig?.extra?.graphUrl;

// Group Configuration - Edge Esmeralda Pop-up City
const DEFAULT_GROUP_ID = 3579;
const LOCAL_TIMEZONE = "America/Los_Angeles"; // PDT/PST

if (!API_URL || !GRAPH_URL) {
  throw new Error("Missing configuration: API_URL or GRAPH_URL is not defined");
}

console.log(`API_URL: ${API_URL}`);
console.log(`GRAPH_URL: ${GRAPH_URL}`);

// Apollo Client setup
const httpLink = createHttpLink({
  uri: GRAPH_URL,
});

const authLink = setContext(async (_, { headers }) => {
  const token = await AsyncStorage.getItem("auth_token");
  console.log(
    "Apollo: Setting auth header",
    token ? "Token present" : "No token",
  );

  const authHeaders: Record<string, string> = { ...headers };
  if (token && !token.startsWith("demo_auth_token_")) {
    // Only set authorization header for real tokens, not demo tokens
    authHeaders.authorization = `Bearer ${token}`;
  }

  return {
    headers: authHeaders,
  };
});

const errorLink = onError(
  ({ graphQLErrors, networkError, operation, forward }) => {
    if (graphQLErrors) {
      console.error(
        "Apollo GraphQL errors:",
        graphQLErrors.map(({ message, locations, path }) => ({
          message,
          locations,
          path,
          operation: operation.operationName,
        })),
      );
    }

    if (networkError) {
      console.error("Apollo Network error:", {
        message: networkError.message,
        operation: operation.operationName,
        variables: operation.variables,
        networkError,
      });
    }
  },
);

export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});

// REST API Functions
export const getProfileByToken = async (
  auth_token?: string,
): Promise<Profile | null> => {
  if (!auth_token) {
    console.log("getProfileByToken: No auth token provided");
    return null;
  }

  // Handle demo tokens
  if (auth_token.startsWith("demo_auth_token_")) {
    console.log(
      "getProfileByToken: Demo token detected, returning demo profile",
    );
    return {
      id: 1,
      handle: "demo_user",
      nickname: "Demo User",
      about: "Demo user account",
      email: "example@example.com",
      verified: false,
      status: "active",
    };
  }

  const url = `${API_URL}/profile/me?auth_token=${auth_token}`;
  console.log("getProfileByToken: Fetching from", url);

  try {
    const response = await fetch(url);
    console.log(
      "getProfileByToken: Response status",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getProfileByToken: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
      });
      return null;
    }

    const data = await response.json();
    console.log("getProfileByToken: Success", data);
    return data.profile as Profile;
  } catch (error) {
    console.error("getProfileByToken: Network/Parse error", {
      error: error instanceof Error ? error.message : error,
      url,
      auth_token: auth_token?.substring(0, 10) + "...",
    });
    return null;
  }
};

export const getProfileByHandle = async (
  handle: string,
): Promise<Profile | null> => {
  const url = `${API_URL}/profile/get_by_handle?handle=${handle}`;
  console.log("getProfileByHandle: Fetching from", url);

  try {
    const response = await fetch(url);
    console.log(
      "getProfileByHandle: Response status",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getProfileByHandle: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        handle,
      });
      return null;
    }

    const data = await response.json();
    console.log("getProfileByHandle: Success", data);
    return data.profile as Profile;
  } catch (error) {
    console.error("getProfileByHandle: Network/Parse error", {
      error: error instanceof Error ? error.message : error,
      url,
      handle,
    });
    return null;
  }
};

export const getEventDetail = async (
  event_id: number,
): Promise<Event | null> => {
  const url = `${API_URL}/event/get?id=${event_id}`;
  console.log("getEventDetail: Fetching from", url);

  try {
    const response = await fetch(url);
    console.log(
      "getEventDetail: Response status",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getEventDetail: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        event_id,
      });
      return null;
    }

    const data = await response.json();
    return {
      ...data,
      venue_id: data.venue?.id,
    } as Event;
  } catch (error) {
    console.error("getEventDetail: Network/Parse error", {
      error: error instanceof Error ? error.message : error,
      url,
      event_id,
    });
    return null;
  }
};

export const uploadFile = async (
  file: FormData,
  auth_token: string,
): Promise<string> => {
  const formData = new FormData();
  formData.append("auth_token", auth_token);
  formData.append("uploader", "user");
  formData.append("resource", Math.random().toString(36).slice(-8));
  formData.append("data", file);

  const response = await fetch(`${API_URL}/service/upload_image`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  const data = await response.json();
  return data.result.url as string;
};

export const updateProfile = async (
  profile: Profile,
  auth_token: string,
): Promise<Profile> => {
  const response = await fetch(`${API_URL}/profile/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ...profile, auth_token }),
  });

  if (!response.ok) {
    throw new Error("Update failed");
  }

  const data = await response.json();
  return data.profile as Profile;
};

// GraphQL Queries
export const GET_EVENTS = gql`
  query GetEvents($limit: Int, $offset: Int, $groupId: Int) {
    events(
      limit: $limit
      offset: $offset
      where: { group_id: { _eq: $groupId } }
      order_by: { start_time: asc }
    ) {
      id
      title
      start_time
      end_time
      timezone
      location
      cover_url
      content
      tags
      participants_count
      max_participant
      status
      display
      owner {
        id
        handle
        nickname
        image_url
      }
      group {
        id
        handle
        nickname
        image_url
      }
      event_roles {
        role
        nickname
        profile {
          id
          handle
          nickname
          image_url
        }
      }
    }
  }
`;

export const GET_EVENT_DETAIL = gql`
  query GetEventDetail($id: bigint!) {
    events_by_pk(id: $id) {
      id
      title
      event_type
      start_time
      end_time
      timezone
      meeting_url
      location
      formatted_address
      geo_lat
      geo_lng
      cover_url
      content
      tags
      max_participant
      min_participant
      participants_count
      status
      display
      owner {
        id
        handle
        nickname
        image_url
      }
      group {
        id
        handle
        nickname
        image_url
      }
      participants {
        id
        status
        profile {
          id
          handle
          nickname
          image_url
        }
      }
      tickets {
        id
        title
        content
        quantity
        need_approval
        payment_chain
        payment_token_price
        payment_token_name
      }
    }
  }
`;

export const GET_USER_EVENTS = gql`
  query GetUserEvents($userId: Int!) {
    participants(
      where: { profile_id: { _eq: $userId }, status: { _eq: "checked" } }
    ) {
      event {
        id
        title
        start_time
        end_time
        timezone
        location
        cover_url
        tags
        owner {
          id
          handle
          nickname
          image_url
        }
        group {
          id
          handle
          nickname
          image_url
        }
      }
    }
  }
`;

// Auth functions
export const storeAuthToken = async (token: string) => {
  await AsyncStorage.setItem("auth_token", token);
};

export const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem("auth_token");
};

export const removeAuthToken = async () => {
  await AsyncStorage.removeItem("auth_token");
};

// Email PIN authentication functions
export const sendEmailPin = async (email: string): Promise<void> => {
  const url = `${API_URL}/service/send_email`;
  console.log("DEBUG API: sendEmailPin called");
  console.log("DEBUG API: API_URL:", API_URL);
  console.log("DEBUG API: Full URL:", url);
  console.log("DEBUG API: Email:", email);

  const requestBody = {
    email,
    context: "email-signin",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.log("DEBUG API: Response not OK, reading error text");
      const errorText = await response.text();
      console.error("DEBUG API: API error details:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        email,
      });
      throw new Error(
        `Failed to send PIN: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();
  } catch (error) {
    console.error("DEBUG API: Exception caught:", error);
    console.error("DEBUG API: Error type:", typeof error);
    console.error("DEBUG API: Error name:", error?.name);
    console.error("DEBUG API: Error message:", error?.message);
    console.error("DEBUG API: Full error object:", error);
    throw error;
  }
};

export const verifyEmailPin = async (
  email: string,
  pin: string,
): Promise<string> => {
  const url = `${API_URL}/profile/signin_with_email`;

  const requestBody = {
    email,
    code: pin,
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      console.log("DEBUG API: Response not OK, reading error text");
      const errorText = await response.text();
      console.error("DEBUG API: API error details:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        email,
        pin,
      });
      throw new Error(
        `PIN verification failed: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    const data = await response.json();

    if (!data.auth_token) {
      console.error("DEBUG API: No auth_token in response:", data);
      throw new Error("No auth token received from server");
    }

    console.log(
      "DEBUG API: Returning auth_token:",
      data.auth_token?.substring(0, 10) + "...",
    );
    return data.auth_token;
  } catch (error) {
    console.error("DEBUG API: Exception caught:", error);
    console.error("DEBUG API: Error type:", typeof error);
    console.error("DEBUG API: Error name:", error?.name);
    console.error("DEBUG API: Error message:", error?.message);
    throw error;
  }
};

// RSVP Functions
export const attendEvent = async (
  eventId: number,
  authToken: string,
): Promise<void> => {
  // Check if this is a demo token
  if (authToken.startsWith("demo_auth_token_")) {
    console.log("attendEvent: Demo mode - simulating successful RSVP", eventId);
    // Simulate a small delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }

  const url = `${API_URL}/event/join`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: eventId,
        auth_token: authToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("attendEvent: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        eventId,
      });
      throw new Error(errorText || `Failed to join event: ${response.status}`);
    }
  } catch (error) {
    console.error("attendEvent: Network/Parse error", {
      error: error instanceof Error ? error.message : error,
      url,
      eventId,
    });
    throw error;
  }
};

export const cancelAttendance = async (
  eventId: number,
  authToken: string,
): Promise<void> => {
  // Check if this is a demo token
  if (authToken.startsWith("demo_auth_token_")) {
    console.log(
      "cancelAttendance: Demo mode - simulating successful cancellation",
      eventId,
    );
    // Simulate a small delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    return;
  }

  const url = `${API_URL}/event/cancel`;
  console.log("cancelAttendance: Canceling attendance for event", eventId);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: eventId,
        auth_token: authToken,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("cancelAttendance: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        eventId,
      });
      throw new Error(
        errorText || `Failed to cancel attendance: ${response.status}`,
      );
    }

    console.log(
      "cancelAttendance: Successfully canceled attendance for event",
      eventId,
    );
  } catch (error) {
    console.error("cancelAttendance: Network/Parse error", {
      error: error instanceof Error ? error.message : error,
      url,
      eventId,
    });
    throw error;
  }
};

// My Events Functions
export const getMyEvents = async (
  authToken: string,
): Promise<{ attending: Event[]; hosting: Event[]; starred: Event[] }> => {
  const profile = await getProfileByToken(authToken);
  if (!profile) {
    throw new Error("Unable to get user profile");
  }

  // Handle demo mode - return empty events for the correct group only
  if (authToken.startsWith("demo_auth_token_")) {
    console.log("getMyEvents: Demo mode - returning empty events lists");
    return {
      attending: [],
      hosting: [],
      starred: [],
    };
  }

  try {
    // Get attending events using the GraphQL query
    const attendingResult = await apolloClient.query({
      query: gql`
        query GetMyAttendingEvents($userId: Int!) {
          participants(
            where: {
              profile_id: { _eq: $userId }
              status: { _in: ["applied", "attending", "checked"] }
            }
          ) {
            event {
              id
              title
              start_time
              end_time
              timezone
              location
              cover_url
              content
              tags
              participants_count
              max_participant
              status
              display
              owner {
                id
                handle
                nickname
                image_url
              }
              group {
                id
                handle
                nickname
                image_url
              }
            }
          }
        }
      `,
      variables: { userId: profile.id },
    });

    // Get hosting events
    const hostingResult = await apolloClient.query({
      query: gql`
        query GetMyHostingEvents($userId: Int!) {
          events(
            where: { owner_id: { _eq: $userId } }
            order_by: { start_time: asc }
          ) {
            id
            title
            start_time
            end_time
            timezone
            location
            cover_url
            content
            tags
            participants_count
            max_participant
            status
            display
            owner {
              id
              handle
              nickname
              image_url
            }
            group {
              id
              handle
              nickname
              image_url
            }
          }
        }
      `,
      variables: { userId: profile.id },
    });

    // Get starred events - using REST API similar to web app
    const starredUrl = `${API_URL}/event/my_event_list?collection=my_stars&auth_token=${authToken}`;
    console.log("getMyEvents: Fetching starred events from", starredUrl);

    let starredEvents: Event[] = [];
    try {
      const starredResponse = await fetch(starredUrl);
      if (starredResponse.ok) {
        const starredData = await starredResponse.json();
        starredEvents = (starredData.events || [])
          .map((e: any) => ({
            ...e,
            owner: e.profile,
            geo_lat: e.geo_lat ? Number(e.geo_lat) : null,
            geo_lng: e.geo_lng ? Number(e.geo_lng) : null,
          }))
          .reverse();
      } else {
        console.warn(
          "getMyEvents: Failed to fetch starred events",
          starredResponse.status,
        );
      }
    } catch (error) {
      console.warn("getMyEvents: Error fetching starred events", error);
    }

    const attendingEvents = attendingResult.data.participants.map(
      (p: any) => p.event,
    );
    const hostingEvents = hostingResult.data.events;

    console.log("getMyEvents: Success", {
      attending: attendingEvents.length,
      hosting: hostingEvents.length,
      starred: starredEvents.length,
    });

    console.log(
      "Sample attending event IDs:",
      attendingEvents.slice(0, 3).map((e) => e.id),
    );
    console.log(
      "Sample hosting event IDs:",
      hostingEvents.slice(0, 3).map((e) => e.id),
    );
    console.log(
      "Sample starred event IDs:",
      starredEvents.slice(0, 3).map((e) => e.id),
    );

    return {
      attending: attendingEvents,
      hosting: hostingEvents,
      starred: starredEvents,
    };
  } catch (error) {
    console.error("getMyEvents: Error", error);
    throw error;
  }
};

// Helper function to get events for a specific group
export const getEventsForGroup = (groupId: number = DEFAULT_GROUP_ID) => {
  return {
    query: GET_EVENTS,
    variables: {
      limit: 50,
      offset: 0,
      groupId: groupId,
    },
  };
};

// Export the default group ID for reference
export { DEFAULT_GROUP_ID };

// Star/Unstar Event Functions
export const starEvent = async (
  eventId: number,
  authToken: string,
): Promise<void> => {
  // Check if this is a demo token
  if (authToken.startsWith("demo_auth_token_")) {
    console.log("starEvent: Demo mode - simulating successful star", eventId);
    // Simulate a small delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return;
  }

  const url = `${API_URL}/comment/star`;
  console.log("starEvent: Starring event", eventId);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item_id: eventId,
        auth_token: authToken,
        item_type: "Event",
      }),
    });

    console.log(
      "starEvent: Response status",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("starEvent: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        eventId,
      });
      throw new Error(errorText || `Failed to star event: ${response.status}`);
    }

    console.log("starEvent: Successfully starred event", eventId);
  } catch (error) {
    console.error("starEvent: Network/Parse error", {
      error: error instanceof Error ? error.message : error,
      url,
      eventId,
    });
    throw error;
  }
};

export const unstarEvent = async (
  eventId: number,
  authToken: string,
): Promise<void> => {
  // Check if this is a demo token
  if (authToken.startsWith("demo_auth_token_")) {
    console.log(
      "unstarEvent: Demo mode - simulating successful unstar",
      eventId,
    );
    // Simulate a small delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return;
  }

  const url = `${API_URL}/comment/unstar`;
  console.log("unstarEvent: Unstarring event", eventId);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item_id: eventId,
        auth_token: authToken,
        item_type: "Event",
      }),
    });

    console.log(
      "unstarEvent: Response status",
      response.status,
      response.statusText,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("unstarEvent: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        eventId,
      });
      throw new Error(
        errorText || `Failed to unstar event: ${response.status}`,
      );
    }
  } catch (error) {
    console.error("unstarEvent: Network/Parse error", {
      error: error instanceof Error ? error.message : error,
      url,
      eventId,
    });
    throw error;
  }
};

// GraphQL queries for groups
export const GET_ALL_GROUPS = gql`
  query GetAllGroups($limit: Int = 100) {
    groups(
      limit: $limit
      order_by: { events_count: desc }
      where: { status: { _eq: "active" } }
    ) {
      id
      handle
      nickname
      image_url
      about
      events_count
      memberships_count
      status
    }
  }
`;

export const GET_USER_GROUPS = gql`
  query GetUserGroups($userId: Int!) {
    participants(
      where: {
        profile_id: { _eq: $userId }
        status: { _in: ["applied", "attending", "checked"] }
      }
    ) {
      event {
        group {
          id
          handle
          nickname
          image_url
          about
          events_count
          memberships_count
          status
        }
      }
    }
  }
`;

// Group API Functions
export const getAllGroups = async (): Promise<Group[]> => {
  try {
    const result = await apolloClient.query({
      query: GET_ALL_GROUPS,
      variables: { limit: 100 },
      fetchPolicy: "network-only",
    });

    const groups = result.data.groups || [];
    console.log("getAllGroups: Success", `${groups.length} groups`);
    return groups as Group[];
  } catch (error) {
    console.error("getAllGroups: GraphQL error", error);
    return [];
  }
};

export const getUserGroups = async (authToken: string): Promise<Group[]> => {
  if (!authToken || authToken.startsWith("demo_auth_token_")) {
    console.log("getUserGroups: Demo mode or no token - returning empty array");
    return [];
  }

  try {
    // Get user's attended events to find groups they've RSVP'd to
    const profile = await getProfileByToken(authToken);
    if (!profile) {
      return [];
    }

    console.log(
      "getUserGroups: Fetching user groups via GraphQL for user",
      profile.id,
    );

    const attendingResult = await apolloClient.query({
      query: GET_USER_GROUPS,
      variables: { userId: profile.id },
      fetchPolicy: "network-only",
    });

    const userGroups = attendingResult.data.participants
      .map((p: any) => p.event.group)
      .filter((group: any) => group && group.id)
      .reduce((unique: any[], group: any) => {
        if (!unique.find((g) => g.id === group.id)) {
          unique.push(group);
        }
        return unique;
      }, []);

    console.log("getUserGroups: Success", `${userGroups.length} user groups`);
    return userGroups as Group[];
  } catch (error) {
    console.error("getUserGroups: Error", error);
    return [];
  }
};

// Export timezone for use in components
export { LOCAL_TIMEZONE };
