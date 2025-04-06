import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { BlueSkyUser, DebugInfo } from '../services/blueskyAPI';

interface OperationState {
  type: 'follow' | 'unfollow' | 'targetFollow' | 'none';
  isProcessing: boolean;
  targetUser?: string;
  targetUserDid?: string;
  targetUserDisplayName?: string;
  followType?: 'followers' | 'following';
  selectedUsers: BlueSkyUser[];
  currentIndex: number;
  totalUsers: number;
  completed: number;
  success: number;
  failed: number;
  remainingTimeout: number;
  waitingTimeout: boolean;
  isPaused: boolean;
  lastError?: DebugInfo;
  isComplete: boolean;
}

// Context için başlangıç değerleri
interface OperationContextType {
  operation: OperationState;
  startOperation: (
    type: 'follow' | 'unfollow' | 'targetFollow',
    users: BlueSkyUser[],
    targetInfo?: {
      targetUser?: string,
      targetUserDid?: string,
      targetUserDisplayName?: string,
      followType?: 'followers' | 'following'
    }
  ) => void;
  updateProgress: (
    completed: number,
    total: number,
    success: number,
    failed: number,
    lastError?: DebugInfo
  ) => void;
  setTimeoutStatus: (isWaiting: boolean, remainingSeconds?: number) => void;
  togglePause: () => void;
  completeOperation: (success: number, failed: number) => void;
  resetOperation: () => void;
}

const initialOperationState: OperationState = {
  type: 'none',
  isProcessing: false,
  selectedUsers: [],
  currentIndex: 0,
  totalUsers: 0,
  completed: 0,
  success: 0,
  failed: 0,
  remainingTimeout: 0,
  waitingTimeout: false,
  isPaused: false,
  isComplete: false
};

// Context oluşturma
const OperationContext = createContext<OperationContextType | undefined>(undefined);

interface OperationProviderProps {
  children: ReactNode;
}

export const OperationProvider: React.FC<OperationProviderProps> = ({ children }) => {
  const [operation, setOperation] = useState<OperationState>(initialOperationState);

  // Zamanlayıcı için
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null;

    if (operation.waitingTimeout && operation.remainingTimeout > 0 && !operation.isPaused) {
      timerId = setInterval(() => {
        setOperation(prev => ({
          ...prev,
          remainingTimeout: prev.remainingTimeout - 1,
          // Zaman dolduğunda bekleme durumunu otomatik kapat
          waitingTimeout: prev.remainingTimeout > 1
        }));
      }, 1000);
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [operation.waitingTimeout, operation.remainingTimeout, operation.isPaused]);

  const startOperation = (
    type: 'follow' | 'unfollow' | 'targetFollow',
    users: BlueSkyUser[],
    targetInfo?: {
      targetUser?: string,
      targetUserDid?: string,
      targetUserDisplayName?: string,
      followType?: 'followers' | 'following'
    }
  ) => {
    console.log(`Starting operation: ${type} with ${users.length} users`);
    setOperation({
      type,
      isProcessing: true,
      selectedUsers: users,
      currentIndex: 0,
      totalUsers: users.length,
      completed: 0,
      success: 0,
      failed: 0,
      remainingTimeout: 0,
      waitingTimeout: false,
      isPaused: false,
      isComplete: false,
      targetUser: targetInfo?.targetUser,
      targetUserDid: targetInfo?.targetUserDid,
      targetUserDisplayName: targetInfo?.targetUserDisplayName,
      followType: targetInfo?.followType
    });
  };

  const updateProgress = (
    completed: number,
    total: number,
    success: number,
    failed: number,
    lastError?: DebugInfo
  ) => {
    setOperation(prev => ({
      ...prev,
      completed,
      totalUsers: total,
      currentIndex: completed,
      success,
      failed,
      lastError
    }));
  };

  const setTimeoutStatus = (isWaiting: boolean, remainingSeconds: number = 0) => {
    setOperation(prev => ({
      ...prev,
      waitingTimeout: isWaiting,
      remainingTimeout: isWaiting ? remainingSeconds : 0
    }));
  };

  const togglePause = () => {
    setOperation(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  };

  const completeOperation = (success: number, failed: number) => {
    setOperation(prev => ({
      ...prev,
      isProcessing: false,
      isComplete: true,
      success,
      failed,
      waitingTimeout: false
    }));
  };

  const resetOperation = () => {
    setOperation(initialOperationState);
  };

  return (
    <OperationContext.Provider
      value={{
        operation,
        startOperation,
        updateProgress,
        setTimeoutStatus,
        togglePause,
        completeOperation,
        resetOperation
      }}
    >
      {children}
    </OperationContext.Provider>
  );
};

export const useOperation = () => {
  const context = useContext(OperationContext);
  if (context === undefined) {
    throw new Error('useOperation must be used within an OperationProvider');
  }
  return context;
}; 