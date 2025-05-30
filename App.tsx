import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { ApolloProvider } from '@apollo/client';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { apolloClient } from './src/services/api';
import { AuthProvider } from './src/contexts/AuthContext';
import { GroupProvider } from './src/contexts/GroupContext';
import AppNavigator from './src/navigation/AppNavigator';
import { createQueryClient, setupPersistence } from './src/services/caching';

// Create a client with optimized caching
const queryClient = createQueryClient();

export default function App() {
  useEffect(() => {
    // Setup persistence for React Query cache
    setupPersistence(queryClient);
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ApolloProvider client={apolloClient}>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <GroupProvider>
                <AppNavigator />
                <StatusBar style="auto" />
              </GroupProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ApolloProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
