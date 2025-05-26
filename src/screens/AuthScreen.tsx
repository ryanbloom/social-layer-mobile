import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Button from "../components/Button";
import PinVerification from "../components/PinVerification";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../utils/colors";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const { user, signInWithGoogle, signInWithEmail, verifyPin, actionLoading } =
    useAuth();
  const navigation = useNavigation();

  // Automatically dismiss auth screen when user becomes authenticated
  useEffect(() => {
    if (user) {
      navigation.goBack();
    }
  }, [user, navigation]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert(
        "Sign In Error",
        "Failed to sign in with Google. Please try again.",
        [{ text: "OK" }],
      );
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      await signInWithEmail(email.trim());
      setShowPinVerification(true);
    } catch (error) {
      console.error("DEBUG: Send PIN error caught:", error);
      console.error("DEBUG: Error type:", typeof error);
      console.error(
        "DEBUG: Error message:",
        error instanceof Error ? error.message : String(error),
      );
      Alert.alert(
        "Failed to Send PIN",
        error instanceof Error ? error.message : "Please try again.",
        [{ text: "OK" }],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinVerify = async (pin: string) => {
    try {
      console.log(email.trim());
      await verifyPin(email.trim(), pin);
      // Navigation will happen automatically via AuthContext
    } catch (error) {
      console.error("DEBUG AuthScreen: PIN verification error:", error);
      console.error("DEBUG AuthScreen: Error details:", {
        type: typeof error,
        message: error instanceof Error ? error.message : String(error),
        name: error?.name,
      });
      throw new Error(
        error instanceof Error
          ? error.message
          : "Invalid PIN. Please try again.",
      );
    }
  };

  const handleResendPin = async () => {
    try {
      await signInWithEmail(email.trim());
    } catch (error) {
      console.error("Resend PIN error:", error);
      throw new Error("Failed to resend PIN");
    }
  };

  const handleBackToEmail = () => {
    setShowPinVerification(false);
    setEmail("");
  };

  const handleCancelAuth = () => {
    setShowPinVerification(false);
    setEmail("");
    navigation.goBack();
  };

  if (showPinVerification) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.backButton}>
          <Button
            title="← Back"
            onPress={handleBackToEmail}
            variant="ghost"
            style={styles.backButtonStyle}
          />
        </View>
        <PinVerification
          email={email}
          onVerify={handlePinVerify}
          onResend={handleResendPin}
          onCancel={handleCancelAuth}
          loading={actionLoading}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelAuth}
        >
          <Ionicons name="close" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Ionicons
            name="people-circle-outline"
            size={80}
            color={colors.primary}
          />
          <Text style={styles.title}>Welcome to Social Layer</Text>
          <Text style={styles.subtitle}>
            Connect with your community and discover amazing events
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {email.trim().toLowerCase() === "example@example.com" && (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>
                🎭 Demo Mode - Sign in without verification
              </Text>
            </View>
          )}

          <Button
            title="Continue with Email"
            onPress={handleEmailSignIn}
            loading={isLoading}
            size="large"
            variant="outline"
            style={styles.emailButton}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    paddingTop: 60,
  },
  cancelButton: {
    padding: 8,
  },
  titleSection: {
    alignItems: "center",
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.text.primary,
    marginTop: 24,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  signInButton: {
    marginBottom: 24,
  },
  googleButton: {
    backgroundColor: colors.google,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.primary,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.text.secondary,
    fontSize: 14,
  },
  emailButton: {
    marginBottom: 16,
  },
  helpText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: "center",
    lineHeight: 18,
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 1,
  },
  backButtonStyle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  demoNotice: {
    backgroundColor: colors.primary + "20",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  demoNoticeText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
