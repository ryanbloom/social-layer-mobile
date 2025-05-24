import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CreateEventScreen() {
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
  },
});