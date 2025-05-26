import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../utils/colors';

interface BadgeProps {
  text: string;
  variant?:
    | 'default'
    | 'past'
    | 'private'
    | 'pending'
    | 'cancel'
    | 'ongoing'
    | 'upcoming'
    | 'hosting'
    | 'joining';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Badge({
  text,
  variant = 'default',
  style,
  textStyle,
}: BadgeProps) {
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
    backgroundColor: colors.background.tertiary,
  },
  defaultText: {
    color: colors.text.primary,
  },

  // Past
  pastBadge: {
    backgroundColor: colors.background.primary,
  },
  pastText: {
    color: colors.text.secondary,
  },

  // Private
  privateBadge: {
    backgroundColor: colors.status.warningBg,
  },
  privateText: {
    color: colors.status.warning,
  },

  // Pending
  pendingBadge: {
    backgroundColor: colors.status.warningBg,
  },
  pendingText: {
    color: colors.status.warning,
  },

  // Cancel
  cancelBadge: {
    backgroundColor: colors.status.errorBg,
  },
  cancelText: {
    color: colors.status.error,
  },

  // Ongoing
  ongoingBadge: {
    backgroundColor: colors.status.infoBg,
  },
  ongoingText: {
    color: colors.status.info,
  },

  // Upcoming
  upcomingBadge: {
    backgroundColor: colors.status.successBg,
  },
  upcomingText: {
    color: colors.status.success,
  },

  // Hosting
  hostingBadge: {
    backgroundColor: colors.primaryLight,
  },
  hostingText: {
    color: colors.primaryDark,
  },

  // Joining
  joiningBadge: {
    backgroundColor: colors.primaryLight,
  },
  joiningText: {
    color: colors.primaryDark,
  },
});
