import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import Button from '../components/Button';

export default function ProfileScreen() {
  const navigation = useNavigation();

  const handleSignIn = () => {
    navigation.navigate('Auth' as never);
  };

  const renderAuthPrompt = () => (
    <View style={styles.authPrompt}>
      <Ionicons name="person-circle-outline" size={80} color="#ccc" />
      <Text style={styles.authTitle}>Sign In Required</Text>
      <Text style={styles.authDescription}>
        Sign in to view your profile, manage events, and connect with the community.
      </Text>
      <Button
        title="Sign In"
        onPress={handleSignIn}
        style={styles.signInButton}
      />
    </View>
  );

  const renderProfileContent = () => (
    <ScrollView contentContainerStyle={styles.contentContainer}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: 'https://via.placeholder.com/120' }}
            style={styles.avatar}
          />
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.name}>John Doe</Text>
        <Text style={styles.handle}>@johndoe</Text>
        <Text style={styles.bio}>
          Event enthusiast | Tech meetup organizer | Coffee lover ☕
        </Text>
        
        <Button
          title="Edit Profile"
          variant="outline"
          onPress={() => {}}
          style={styles.editButton}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Events Hosted</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>45</Text>
          <Text style={styles.statLabel}>Events Attended</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Groups Joined</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={24} color="#666" />
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={24} color="#666" />
          <Text style={styles.menuText}>Settings</Text>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="help-circle-outline" size={24} color="#666" />
          <Text style={styles.menuText}>Help & Support</Text>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="information-circle-outline" size={24} color="#666" />
          <Text style={styles.menuText}>About</Text>
          <Ionicons name="chevron-forward" size={24} color="#ccc" />
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.menuItem, styles.signOutItem]}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={[styles.menuText, styles.signOutText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // For demo purposes, show auth prompt. In real app, check auth state
  const isSignedIn = false;

  return (
    <View style={styles.container}>
      {isSignedIn ? renderProfileContent() : renderAuthPrompt()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  authPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  authDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  signInButton: {
    minWidth: 120,
  },
  contentContainer: {
    flexGrow: 1,
  },
  profileHeader: {
    backgroundColor: '#fff',
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0f0f0',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  editButton: {
    minWidth: 120,
  },
  statsContainer: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    paddingVertical: 20,
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  menuContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: '#FF3B30',
  },
});