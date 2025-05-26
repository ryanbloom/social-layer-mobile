import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { colors } from '../utils/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}: ButtonProps) {
  const getButtonStyle = () => {
    const baseStyle = [
      styles.button,
      styles[`${variant}Button`],
      styles[`${size}Button`],
    ];
    if (disabled || loading) {
      baseStyle.push(styles.disabledButton);
    }
    return [...baseStyle, style];
  };

  const getTextStyle = () => {
    const baseStyle = [
      styles.text,
      styles[`${variant}Text`],
      styles[`${size}Text`],
    ];
    if (disabled || loading) {
      baseStyle.push(styles.disabledText);
    }
    return [...baseStyle, textStyle];
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.text.white : colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={getTextStyle()}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },

  // Variants
  primaryButton: {
    backgroundColor: colors.primary,
  },
  primaryText: {
    color: colors.text.white,
  },

  secondaryButton: {
    backgroundColor: colors.background.tertiary,
  },
  secondaryText: {
    color: colors.text.primary,
  },

  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outlineText: {
    color: colors.primary,
  },

  ghostButton: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: colors.primary,
  },

  // Sizes
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32,
  },
  smallText: {
    fontSize: 14,
  },

  mediumButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
  },
  mediumText: {
    fontSize: 16,
  },

  largeButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    minHeight: 48,
  },
  largeText: {
    fontSize: 18,
  },

  // Disabled state
  disabledButton: {
    opacity: colors.disabled,
  },
  disabledText: {
    opacity: colors.disabled,
  },
});
