import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { colors } from '../utils/colors';

interface PinVerificationProps {
  email: string;
  onVerify: (pin: string) => Promise<void>;
  onResend: () => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export default function PinVerification({
  email,
  onVerify,
  onResend,
  onCancel,
  loading = false,
}: PinVerificationProps) {
  const [pin, setPin] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handlePinChange = (value: string) => {
    // Remove any non-digit characters and limit to 5 digits
    const cleanValue = value.replace(/\D/g, '').slice(0, 5);
    setPin(cleanValue);

    // Auto submit when all 5 digits entered
    if (cleanValue.length === 5) {
      handleVerify(cleanValue);
    }
  };

  const handleVerify = async (pinValue?: string) => {
    const fullPin = pinValue || pin;
    if (fullPin.length !== 5) {
      Alert.alert('Invalid PIN', 'Please enter all 5 digits');
      return;
    }

    try {
      await onVerify(fullPin);
    } catch (error) {
      // Clear PIN on error
      setPin('');
      inputRef.current?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await onResend();
      setResendCooldown(30); // 30 second cooldown
      Alert.alert(
        'PIN Sent',
        'A new verification code has been sent to your email'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to resend PIN. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Ionicons name="mail-outline" size={60} color={colors.primary} />
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            We sent a verification code to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
        </View>

        <View style={styles.pinContainer}>
          <Text style={styles.pinLabel}>Enter verification code</Text>
          <TextInput
            ref={inputRef}
            style={styles.pinInput}
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={5}
            selectTextOnFocus
            autoFocus
          />
        </View>

        <View style={styles.actions}>
          <Button
            title="Verify"
            onPress={() => handleVerify()}
            loading={loading}
            size="large"
            style={styles.verifyButton}
          />

          <Button
            title={
              resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'
            }
            onPress={handleResend}
            variant="ghost"
            disabled={resendCooldown > 0}
            style={styles.resendButton}
          />

          {onCancel && (
            <Button
              title="Cancel"
              onPress={onCancel}
              variant="ghost"
              style={styles.cancelButton}
            />
          )}
        </View>

        <Text style={styles.helpText}>
          Didn't receive the code? Check your spam folder or try resending.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 32,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  email: {
    fontWeight: '600',
    color: colors.primary,
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  pinLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
  },
  pinInput: {
    width: '100%',
    maxWidth: 300,
    height: 56,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: '#fff',
    letterSpacing: 8,
  },
  actions: {
    gap: 12,
    marginBottom: 24,
  },
  verifyButton: {
    marginBottom: 8,
  },
  resendButton: {
    marginBottom: 16,
  },
  cancelButton: {
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
