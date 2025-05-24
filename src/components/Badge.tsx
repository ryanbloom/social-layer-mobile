import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface BadgeProps {
  text: string;
  variant?: 'default' | 'past' | 'private' | 'pending' | 'cancel' | 'ongoing' | 'upcoming' | 'hosting' | 'joining';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Badge({ text, variant = 'default', style, textStyle }: BadgeProps) {
  return (
    <View style={[styles.badge, styles[`${variant}Badge`], style]}>
      <Text style={[styles.text, styles[`${variant}Text`], textStyle]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Default
  defaultBadge: {
    backgroundColor: '#f0f0f0',
  },
  defaultText: {
    color: '#333',
  },
  
  // Past
  pastBadge: {
    backgroundColor: '#f5f5f5',
  },
  pastText: {
    color: '#666',
  },
  
  // Private
  privateBadge: {
    backgroundColor: '#fff3cd',
  },
  privateText: {
    color: '#856404',
  },
  
  // Pending
  pendingBadge: {
    backgroundColor: '#fff3cd',
  },
  pendingText: {
    color: '#856404',
  },
  
  // Cancel
  cancelBadge: {
    backgroundColor: '#f8d7da',
  },
  cancelText: {
    color: '#721c24',
  },
  
  // Ongoing
  ongoingBadge: {
    backgroundColor: '#d1ecf1',
  },
  ongoingText: {
    color: '#0c5460',
  },
  
  // Upcoming
  upcomingBadge: {
    backgroundColor: '#d4edda',
  },
  upcomingText: {
    color: '#155724',
  },
  
  // Hosting
  hostingBadge: {
    backgroundColor: '#e2e3ff',
  },
  hostingText: {
    color: '#383d9a',
  },
  
  // Joining
  joiningBadge: {
    backgroundColor: '#cce5ff',
  },
  joiningText: {
    color: '#004085',
  },
});