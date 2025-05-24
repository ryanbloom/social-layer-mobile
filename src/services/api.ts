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
import { Profile, Event, EventWithJoinStatus } from "../types";

// API Configuration
const API_URL = Constants.expoConfig?.extra?.apiUrl;
const GRAPH_URL = Constants.expoConfig?.extra?.graphUrl;

// Group Configuration - Edge Esmeralda Pop-up City
const DEFAULT_GROUP_ID = 3579;
const LOCAL_TIMEZONE = 'America/Los_Angeles'; // PDT/PST

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
  console.log("Apollo: Setting auth header", token ? "Token present" : "No token");
  
  const authHeaders: Record<string, string> = { ...headers };
  if (token) {
    authHeaders.authorization = `Bearer ${token}`;
  }
  
  return {
    headers: authHeaders,
  };
});

const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    console.error("Apollo GraphQL errors:", graphQLErrors.map(({ message, locations, path }) => ({
      message,
      locations,
      path,
      operation: operation.operationName
    })));
  }

  if (networkError) {
    console.error("Apollo Network error:", {
      message: networkError.message,
      operation: operation.operationName,
      variables: operation.variables,
      networkError
    });
  }
});

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

  const url = `${API_URL}/profile/me?auth_token=${auth_token}`;
  console.log("getProfileByToken: Fetching from", url);

  try {
    const response = await fetch(url);
    console.log("getProfileByToken: Response status", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getProfileByToken: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url
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
      auth_token: auth_token?.substring(0, 10) + "..."
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
    console.log("getProfileByHandle: Response status", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getProfileByHandle: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        handle
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
      handle
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
    console.log("getEventDetail: Response status", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("getEventDetail: API error", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        event_id
      });
      return null;
    }

    const data = await response.json();
    console.log("getEventDetail: Success", data);
    return {
      ...data,
      venue_id: data.venue?.id,
    } as Event;
  } catch (error) {
    console.error("getEventDetail: Network/Parse error", {
      error: error instanceof Error ? error.message : error,
      url,
      event_id
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
  query GetUserEvents($userId: bigint!) {
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
    context: 'email-signin'
  };
  console.log("DEBUG API: Request body:", requestBody);

  try {
    console.log("DEBUG API: About to make fetch request");
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log("DEBUG API: Fetch completed");
    console.log("DEBUG API: Response status:", response.status);
    console.log("DEBUG API: Response statusText:", response.statusText);
    console.log("DEBUG API: Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.log("DEBUG API: Response not OK, reading error text");
      const errorText = await response.text();
      console.error("DEBUG API: API error details:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        email
      });
      throw new Error(`Failed to send PIN: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log("DEBUG API: Response OK, parsing JSON");
    const data = await response.json();
    console.log("DEBUG API: Success response:", data);
  } catch (error) {
    console.error("DEBUG API: Exception caught:", error);
    console.error("DEBUG API: Error type:", typeof error);
    console.error("DEBUG API: Error name:", error?.name);
    console.error("DEBUG API: Error message:", error?.message);
    console.error("DEBUG API: Full error object:", error);
    throw error;
  }
};

export const verifyEmailPin = async (email: string, pin: string): Promise<string> => {
  const url = `${API_URL}/profile/signin_with_email`;
  console.log("DEBUG API: verifyEmailPin called");
  console.log("DEBUG API: URL:", url);
  console.log("DEBUG API: Email:", email);
  console.log("DEBUG API: PIN:", pin);

  const requestBody = {
    email,
    code: pin
  };
  console.log("DEBUG API: Request body:", requestBody);

  try {
    console.log("DEBUG API: About to make fetch request");
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log("DEBUG API: Fetch completed");
    console.log("DEBUG API: Response status:", response.status);
    console.log("DEBUG API: Response statusText:", response.statusText);
    console.log("DEBUG API: Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.log("DEBUG API: Response not OK, reading error text");
      const errorText = await response.text();
      console.error("DEBUG API: API error details:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
        url,
        email,
        pin
      });
      throw new Error(`PIN verification failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    console.log("DEBUG API: Response OK, parsing JSON");
    const data = await response.json();
    console.log("DEBUG API: Success response:", data);
    
    if (!data.auth_token) {
      console.error("DEBUG API: No auth_token in response:", data);
      throw new Error('No auth token received from server');
    }
    
    console.log("DEBUG API: Returning auth_token:", data.auth_token?.substring(0, 10) + '...');
    return data.auth_token;
  } catch (error) {
    console.error("DEBUG API: Exception caught:", error);
    console.error("DEBUG API: Error type:", typeof error);
    console.error("DEBUG API: Error name:", error?.name);
    console.error("DEBUG API: Error message:", error?.message);
    throw error;
  }
};

// Helper function to get events for the default group
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

// Export timezone for use in components
export { LOCAL_TIMEZONE };
