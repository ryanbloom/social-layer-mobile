import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Group } from "../types";
import { getAllGroups, getUserGroups, getAuthToken } from "../services/api";
import { useGroup } from "../contexts/GroupContext";
import { useAuth } from "../contexts/AuthContext";
import { colors } from "../utils/colors";

interface GroupSelectionModalProps {
  visible: boolean;
  onClose: () => void;
}

const GroupSelectionModal: React.FC<GroupSelectionModalProps> = ({
  visible,
  onClose,
}) => {
  const {
    selectedGroupId,
    setSelectedGroupId,
    allGroups,
    userGroups,
    setAllGroups,
    setUserGroups,
    isLoading,
    setIsLoading,
  } = useGroup();
  const { user } = useAuth();
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadGroups();
    }
  }, [visible]);

  const loadGroups = async () => {
    if (isLoading || localLoading) return;

    setLocalLoading(true);
    setIsLoading(true);

    try {
      // Load all groups
      const allGroupsData = await getAllGroups();
      setAllGroups(allGroupsData);

      // Load user groups if authenticated
      if (user) {
        const authToken = await getAuthToken();
        if (authToken) {
          const userGroupsData = await getUserGroups(authToken);
          setUserGroups(userGroupsData);
        }
      }
    } catch (error) {
      console.error("Failed to load groups:", error);
      Alert.alert("Error", "Failed to load groups. Please try again.");
    } finally {
      setLocalLoading(false);
      setIsLoading(false);
    }
  };

  const handleGroupSelect = async (groupId: number) => {
    try {
      await setSelectedGroupId(groupId);
      onClose();
    } catch (error) {
      Alert.alert("Error", "Failed to select group. Please try again.");
    }
  };

  const renderGroupItem = ({
    item,
    isUserGroup = false,
  }: {
    item: Group;
    isUserGroup?: boolean;
  }) => {
    const isSelected = item.id === selectedGroupId;

    return (
      <TouchableOpacity
        style={[styles.groupItem, isSelected && styles.selectedGroupItem]}
        onPress={() => handleGroupSelect(item.id)}
      >
        <View style={styles.groupContent}>
          <Image
            source={{
              uri: item.image_url,
              cache: "force-cache",
            }}
            style={styles.groupImage}
            resizeMode="cover"
          />
          <View style={styles.groupInfo}>
            <Text
              style={[styles.groupName, isSelected && styles.selectedGroupText]}
            >
              {item.nickname || item.handle}
            </Text>
            <Text
              style={[
                styles.groupHandle,
                isSelected && styles.selectedGroupSubtext,
              ]}
            >
              @{item.handle}
            </Text>
            {item.about && (
              <Text
                style={[
                  styles.groupAbout,
                  isSelected && styles.selectedGroupSubtext,
                ]}
                numberOfLines={2}
              >
                {item.about}
              </Text>
            )}
            <View style={styles.groupStats}>
              <Text
                style={[
                  styles.statText,
                  isSelected && styles.selectedGroupSubtext,
                ]}
              >
                {item.events_count || 0} events
              </Text>
              <Text
                style={[
                  styles.statText,
                  isSelected && styles.selectedGroupSubtext,
                ]}
              >
                {item.memberships_count || 0} members
              </Text>
            </View>
          </View>
          {isSelected && (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={colors.primary}
              style={styles.selectedIcon}
            />
          )}
        </View>
        {isUserGroup && (
          <View style={styles.userGroupBadge}>
            <Text style={styles.userGroupBadgeText}>Your Group</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderUserGroups = () => {
    if (!user || userGroups.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Groups</Text>
        {userGroups.map((group) => (
          <View key={`user-${group.id}`}>
            {renderGroupItem({ item: group, isUserGroup: true })}
          </View>
        ))}
      </View>
    );
  };

  const renderAllGroups = () => {
    // Filter out user groups from all groups to avoid duplicates
    const otherGroups = user
      ? allGroups.filter(
          (group) => !userGroups.some((userGroup) => userGroup.id === group.id),
        )
      : allGroups;

    if (otherGroups.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>All Groups</Text>
        {otherGroups.map((group) => (
          <View key={`all-${group.id}`}>
            {renderGroupItem({ item: group })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Switch Groups</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {localLoading || isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={true}
          >
            {renderUserGroups()}
            {renderAllGroups()}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
    backgroundColor: colors.background.secondary,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 12,
    marginHorizontal: 16,
    marginTop: 16,
  },
  groupItem: {
    backgroundColor: colors.background.secondary,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    position: "relative",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedGroupItem: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  groupContent: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  groupImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.tertiary,
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text.primary,
    marginBottom: 2,
  },
  selectedGroupText: {
    color: colors.background.primary,
  },
  groupHandle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  selectedGroupSubtext: {
    color: colors.background.secondary,
    opacity: 0.9,
  },
  groupAbout: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  groupStats: {
    flexDirection: "row",
    gap: 16,
  },
  statText: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  selectedIcon: {
    marginLeft: 8,
  },
  userGroupBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: colors.status.success,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  userGroupBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.background.primary,
  },
});

export default GroupSelectionModal;
