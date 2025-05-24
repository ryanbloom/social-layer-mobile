import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';

export default function CreateEventScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const handleSignIn = () => {
    navigation.navigate('Auth' as never);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Ionicons name="add-circle-outline" size={80} color="#ccc" />
          <Text style={styles.title}>Sign In to Create Events</Text>
          <Text style={styles.description}>
            Sign in to create and manage your own events.
          </Text>
          <Button
            title="Sign In"
            onPress={handleSignIn}
            style={styles.signInButton}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="add-circle-outline" size={64} color="#ccc" />
        <Text style={styles.title}>Create Event</Text>
        <Text style={styles.description}>
          This feature will allow you to create and manage events.
          Coming soon!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  signInButton: {
    minWidth: 120,
  },
});