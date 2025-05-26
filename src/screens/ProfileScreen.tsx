import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import Button from "../components/Button";
import GroupSelectionModal from "../components/GroupSelectionModal";
import { useAuth } from "../contexts/AuthContext";
import { useGroup } from "../contexts/GroupContext";
import { colors } from "../utils/colors";

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { selectedGroupId, allGroups } = useGroup();
  const [showGroupModal, setShowGroupModal] = useState(false);

  const handleSignIn = () => {
    navigation.navigate("Auth" as never);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            Alert.alert("Error", "Failed to sign out. Please try again.");
          }
        },
      },
    ]);
  };

  const handleSwitchGroups = () => {
    setShowGroupModal(true);
  };

  // Find the selected group info
  const selectedGroup = allGroups.find((group) => group.id === selectedGroupId);

  const renderAuthPrompt = () => (
    <View style={styles.authPrompt}>
      <Ionicons
        name="person-circle-outline"
        size={80}
        color={colors.text.tertiary}
      />
      <Text style={styles.authTitle}>Sign In Required</Text>
      <Text style={styles.authDescription}>
        Sign in to view your profile, manage events, and connect with the
        community.
      </Text>
      <Button
        title="Sign In"
        onPress={handleSignIn}
        style={styles.signInButton}
      />

      {/* Switch Groups section for non-authenticated users */}
      <View style={styles.groupSection}>
        <Text style={styles.groupSectionTitle}>Current Group</Text>
        <TouchableOpacity
          style={styles.groupSelector}
          onPress={handleSwitchGroups}
        >
          <View style={styles.groupInfo}>
            <Image
              source={{
                uri: selectedGroup?.image_url,
                cache: "force-cache",
              }}
              style={styles.groupImage}
              resizeMode="cover"
            />
            <View style={styles.groupTextInfo}>
              <Text style={styles.groupName}>
                {selectedGroup?.nickname ||
                  selectedGroup?.handle ||
                  "Default Group"}
              </Text>
              <Text style={styles.groupHandle}>
                @{selectedGroup?.handle || "loading..."}
              </Text>
            </View>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.text.tertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProfileContent = () => (
    <ScrollView contentContainerStyle={styles.contentContainer}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: user?.image_url,
              cache: "force-cache",
            }}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>

        <Text style={styles.name}>{user?.nickname || "Unknown User"}</Text>
        <Text style={styles.handle}>@{user?.handle || "unknown"}</Text>
        <Text style={styles.bio}>{user?.about || "No bio available"}</Text>
      </View>

      <View style={styles.menuContainer}>
        <TouchableOpacity style={styles.menuItem} onPress={handleSwitchGroups}>
          <Image
            source={{
              uri: selectedGroup?.image_url,
              cache: "force-cache",
            }}
            style={styles.menuGroupImage}
            resizeMode="cover"
          />
          <View style={styles.menuItemContent}>
            <Text>Switch Groups</Text>
            <Text style={styles.menuSubtext}>
              {selectedGroup?.nickname ||
                selectedGroup?.handle ||
                "Default Group"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={colors.text.tertiary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, styles.signOutItem]}
          onPress={handleSignOut}
        >
          <Ionicons
            name="log-out-outline"
            size={24}
            color={colors.status.error}
          />
          <Text style={[styles.menuText, styles.signOutText]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {user ? renderProfileContent() : renderAuthPrompt()}
      <GroupSelectionModal
        visible={showGroupModal}
        onClose={() => setShowGroupModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  authPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  authDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: "center",
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
    backgroundColor: colors.background.secondary,
    padding: 24,
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.background.tertiary,
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.background.tertiary,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text.primary,
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: 8,
  },
  bio: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  editButton: {
    minWidth: 120,
  },

  menuContainer: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
    marginLeft: 12,
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    color: "#FF3B30",
  },
  groupSection: {
    marginTop: 32,
    width: "100%",
    paddingHorizontal: 16,
  },
  groupSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: "center",
  },
  groupSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background.secondary,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  groupImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    marginRight: 12,
  },
  groupTextInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 2,
  },
  groupHandle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  menuItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuSubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginTop: 2,
  },
  menuGroupImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
  },
});
