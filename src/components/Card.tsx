import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors } from '../utils/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  margin?: number;
  elevation?: number;
}

export default function Card({
  children,
  style,
  onPress,
  padding = 16,
  margin = 8,
  elevation = 2,
}: CardProps) {
  const cardStyle = [
    styles.card,
    {
      padding,
      margin,
      elevation,
      shadowOffset: {
        width: 0,
        height: elevation / 2,
      },
      shadowOpacity: elevation * 0.1,
      shadowRadius: elevation,
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    shadowColor: '#000',
  },
});