import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Group } from '../types';

const DEFAULT_GROUP_ID = 3579;
const SELECTED_GROUP_KEY = 'selected_group_id';

interface GroupContextType {
  selectedGroupId: number;
  setSelectedGroupId: (groupId: number) => Promise<void>;
  allGroups: Group[];
  userGroups: Group[];
  setAllGroups: (groups: Group[]) => void;
  setUserGroups: (groups: Group[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const useGroup = (): GroupContextType => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};

interface GroupProviderProps {
  children: ReactNode;
}

export const GroupProvider: React.FC<GroupProviderProps> = ({ children }) => {
  const [selectedGroupId, setSelectedGroupIdState] =
    useState<number>(DEFAULT_GROUP_ID);
  const [allGroups, setAllGroups] = useState<Group[]>([]);
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    loadSelectedGroup();
  }, []);

  const loadSelectedGroup = async () => {
    try {
      const storedGroupId = await AsyncStorage.getItem(SELECTED_GROUP_KEY);
      if (storedGroupId) {
        setSelectedGroupIdState(parseInt(storedGroupId, 10));
      }
    } catch (error) {
      console.error('Failed to load selected group:', error);
    }
  };

  const setSelectedGroupId = async (groupId: number) => {
    try {
      await AsyncStorage.setItem(SELECTED_GROUP_KEY, groupId.toString());
      setSelectedGroupIdState(groupId);
    } catch (error) {
      console.error('Failed to save selected group:', error);
      throw error;
    }
  };

  return (
    <GroupContext.Provider
      value={{
        selectedGroupId,
        setSelectedGroupId,
        allGroups,
        userGroups,
        setAllGroups,
        setUserGroups,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};
