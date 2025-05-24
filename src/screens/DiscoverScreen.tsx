import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

import { EventWithJoinStatus, RootStackParamList } from "../types";
import { apolloClient, GET_EVENTS } from "../services/api";
import EventCard from "../components/EventCard";
import Button from "../components/Button";

type DiscoverScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  "Main"
>;

export default function DiscoverScreen() {
  const navigation = useNavigation<DiscoverScreenNavigationProp>();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      console.log("DiscoverScreen: Starting events query");
      const variables = {
        limit: 20,
        offset: 0,
        where: {
          // status: { _eq: 'open' },
          start_time: { _gte: new Date().toISOString() },
        },
      };
      console.log("DiscoverScreen: Query variables", variables);

      try {
        const result = await apolloClient.query({
          query: GET_EVENTS,
          variables,
          fetchPolicy: "network-only",
        });
        console.log("DiscoverScreen: Query success", result.data);
        return result.data.events as EventWithJoinStatus[];
      } catch (error) {
        console.error("DiscoverScreen: Query failed", error);
        throw error;
      }
    },
  });

  useEffect(() => {
    console.log("DiscoverScreen: State changed", {
      isLoading,
      hasData: !!eventsData,
      dataLength: eventsData?.length,
      hasError: !!error,
    });
    if (error) {
      console.error("DiscoverScreen: React Query error", error);
    }
  }, [isLoading, eventsData, error]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleEventPress = (eventId: number) => {
    navigation.navigate("EventDetail", { eventId });
  };

  const handleStarPress = (eventId: number) => {
    // TODO: Implement star/unstar functionality
    console.log("Star pressed for event:", eventId);
  };

  const renderEventCard = ({ item }: { item: EventWithJoinStatus }) => (
    <EventCard
      event={item}
      onPress={() => handleEventPress(item.id)}
      onStarPress={() => handleStarPress(item.id)}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Events Found</Text>
      <Text style={styles.emptyStateDescription}>
        There are no upcoming events at the moment. Check back later!
      </Text>
      <Button
        title="Create Event"
        onPress={() => navigation.navigate("CreateEvent")}
        style={styles.createButton}
      />
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorDescription}>
        We couldn't load the events. Please try again.
      </Text>
      <Button
        title="Retry"
        onPress={() => refetch()}
        style={styles.retryButton}
      />
    </View>
  );

  if (isLoading && !eventsData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return renderError();
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={eventsData}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#007AFF"]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Discover Events</Text>
            <Text style={styles.headerSubtitle}>
              Find exciting events happening near you
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  listContainer: {
    flexGrow: 1,
  },
  header: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  createButton: {
    minWidth: 120,
  },
  errorState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  retryButton: {
    minWidth: 120,
  },
});
