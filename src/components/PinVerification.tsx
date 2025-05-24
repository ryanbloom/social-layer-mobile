import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "./Button";
import { colors } from "../utils/colors";

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
  const [pin, setPin] = useState(["", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000,
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto focus next input
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto submit when all digits entered
    if (index === 4 && value && newPin.every((digit) => digit !== "")) {
      handleVerify(newPin.join(""));
    }
  };

  const handleKeyPress = (index: number, key: string) => {
    // Handle backspace
    if (key === "Backspace" && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (pinValue?: string) => {
    const fullPin = pinValue || pin.join("");
    if (fullPin.length !== 5) {
      Alert.alert("Invalid PIN", "Please enter all 5 digits");
      return;
    }

    try {
      await onVerify(fullPin);
    } catch (error) {
      // Clear PIN on error
      setPin(["", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await onResend();
      setResendCooldown(30); // 30 second cooldown
      Alert.alert(
        "PIN Sent",
        "A new verification code has been sent to your email",
      );
    } catch (error) {
      Alert.alert("Error", "Failed to resend PIN. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mail-outline" size={60} color={colors.primary} />
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.subtitle}>
          We sent a verification code to{"\n"}
          <Text style={styles.email}>{email}</Text>
        </Text>
      </View>

      <View style={styles.pinContainer}>
        <Text style={styles.pinLabel}>Enter verification code</Text>
        <View style={styles.pinInputContainer}>
          {pin.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[styles.pinInput, digit ? styles.pinInputFilled : null]}
              value={digit}
              onChangeText={(value) => handlePinChange(index, value)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(index, nativeEvent.key)
              }
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              autoFocus={index === 0}
            />
          ))}
        </View>
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
            resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 32,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  email: {
    fontWeight: "600",
    color: colors.primary,
  },
  pinContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pinLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 20,
  },
  pinInputContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
  },
  pinInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    backgroundColor: "#fff",
  },
  pinInputFilled: {
    borderColor: "#007AFF",
    backgroundColor: "#f0f8ff",
  },
  actions: {
    gap: 12,
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
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
});
