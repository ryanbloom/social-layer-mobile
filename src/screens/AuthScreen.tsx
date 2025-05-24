import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from '../components/Button';
import PinVerification from '../components/PinVerification';
import { useAuth } from '../contexts/AuthContext';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const { user, signInWithGoogle, signInWithEmail, verifyPin, actionLoading } = useAuth();

  console.log('DEBUG AuthScreen: Component render, showPinVerification:', showPinVerification, 'user:', user?.handle || 'null');

  // If user is authenticated, don't render the auth screen
  if (user) {
    console.log('DEBUG AuthScreen: User is authenticated, not rendering auth screen');
    return null;
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert(
        'Sign In Error',
        'Failed to sign in with Google. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleEmailSignIn = async () => {
    console.log('DEBUG: handleEmailSignIn called with email:', email);
    
    if (!email.trim()) {
      console.log('DEBUG: Email validation failed - empty email');
      Alert.alert('Email Required', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log('DEBUG: Email validation failed - invalid format');
      Alert.alert('Invalid Email', 'Please enter a valid email address');
      return;
    }

    console.log('DEBUG: Email validation passed, setting loading to true');
    setIsLoading(true);
    
    try {
      console.log('DEBUG: About to call signInWithEmail');
      await signInWithEmail(email.trim());
      console.log('DEBUG: signInWithEmail completed successfully');
      setShowPinVerification(true);
      console.log('DEBUG: Set showPinVerification to true');
    } catch (error) {
      console.error('DEBUG: Send PIN error caught:', error);
      console.error('DEBUG: Error type:', typeof error);
      console.error('DEBUG: Error message:', error instanceof Error ? error.message : String(error));
      Alert.alert(
        'Failed to Send PIN',
        error instanceof Error ? error.message : 'Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      console.log('DEBUG: Setting loading to false');
      setIsLoading(false);
    }
  };

  const handlePinVerify = async (pin: string) => {
    console.log('DEBUG AuthScreen: handlePinVerify called with PIN:', pin);
    try {
      console.log('DEBUG AuthScreen: About to call verifyPin with email:', email.trim());
      await verifyPin(email.trim(), pin);
      console.log('DEBUG AuthScreen: verifyPin completed successfully');
      // Navigation will happen automatically via AuthContext
    } catch (error) {
      console.error('DEBUG AuthScreen: PIN verification error:', error);
      console.error('DEBUG AuthScreen: Error details:', {
        type: typeof error,
        message: error instanceof Error ? error.message : String(error),
        name: error?.name
      });
      throw new Error(error instanceof Error ? error.message : 'Invalid PIN. Please try again.');
    }
  };

  const handleResendPin = async () => {
    try {
      await signInWithEmail(email.trim());
    } catch (error) {
      console.error('Resend PIN error:', error);
      throw new Error('Failed to resend PIN');
    }
  };

  const handleBackToEmail = () => {
    setShowPinVerification(false);
    setEmail('');
  };

  const handleCancelAuth = () => {
    setShowPinVerification(false);
    setEmail('');
    // Could also navigate to a home screen or previous screen if needed
  };

  if (showPinVerification) {
    return (
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="people-circle-outline" size={80} color="#007AFF" />
          <Text style={styles.title}>Welcome to Social Layer</Text>
          <Text style={styles.subtitle}>
            Connect with your community and discover amazing events
          </Text>
        </View>

        <View style={styles.form}>
          <Button
            title="Continue with Google"
            onPress={handleGoogleSignIn}
            loading={actionLoading}
            size="large"
            style={[styles.signInButton, styles.googleButton]}
            icon={<Ionicons name="logo-google" size={20} color="#fff" />}
          />
          
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>
          
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
          
          <Button
            title="Continue with Email"
            onPress={handleEmailSignIn}
            loading={isLoading}
            size="large"
            variant="outline"
            style={styles.emailButton}
          />
          
          <Text style={styles.helpText}>
            Don't have an account? We'll create one for you automatically.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By signing in, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 32,
  },
  header: {
    alignItems: 'center',
    marginTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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
    backgroundColor: '#4285F4',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  emailButton: {
    marginBottom: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1,
  },
  backButtonStyle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});