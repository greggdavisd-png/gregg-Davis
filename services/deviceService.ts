import { DeviceState, INITIAL_STATE, DeviceStatus, ActivityLog } from '../types';

const STORAGE_KEY = 'guardian_lock_state';

// Helper to get current state from storage
export const getDeviceState = (): DeviceState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return INITIAL_STATE;
  try {
    const parsed = JSON.parse(stored);
    
    // Ensure all new fields exist for backward compatibility
    return {
      ...INITIAL_STATE,
      ...parsed,
      // Merge nested objects to ensure new keys in them exist
      learningStats: {
        ...INITIAL_STATE.learningStats,
        ...(parsed.learningStats || {})
      },
      location: {
        ...INITIAL_STATE.location,
        ...(parsed.location || {})
      },
      // Ensure boolean flags are respected if they exist
      isActivated: parsed.isActivated !== undefined ? parsed.isActivated : INITIAL_STATE.isActivated,
      feedbackGiven: parsed.feedbackGiven !== undefined ? parsed.feedbackGiven : INITIAL_STATE.feedbackGiven,
      trialEndDate: parsed.trialEndDate || INITIAL_STATE.trialEndDate
    };
  } catch (e) {
    return INITIAL_STATE;
  }
};

// Helper to save state
export const updateDeviceState = (updates: Partial<DeviceState>): DeviceState => {
  const current = getDeviceState();
  const newState = { ...current, ...updates, lastSync: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  
  // Dispatch a custom event for same-tab updates if needed, 
  // though 'storage' event handles cross-tab.
  window.dispatchEvent(new Event('local-storage-update'));
  
  return newState;
};

// Helper to record learning activity specifically
export const recordLearningActivity = (
  type: 'READING' | 'SPELLING' | 'MATH' | 'HOMEWORK' | 'QUIZ',
  success: boolean,
  details?: string
) => {
  const current = getDeviceState();
  const stats = current.learningStats || INITIAL_STATE.learningStats;

  const newLog: ActivityLog = {
    id: Date.now().toString() + Math.random(),
    type,
    success,
    timestamp: Date.now(),
    details
  };

  // Add to log (keep last 50)
  const updatedLogs = [newLog, ...stats.recentActivity].slice(0, 50);

  // Update counters
  const newStats = {
    ...stats,
    recentActivity: updatedLogs,
    mathCorrect: type === 'MATH' && success ? stats.mathCorrect + 1 : stats.mathCorrect,
    mathAttempts: type === 'MATH' ? stats.mathAttempts + 1 : stats.mathAttempts,
    readingCorrect: type === 'READING' && success ? stats.readingCorrect + 1 : stats.readingCorrect,
    readingAttempts: type === 'READING' ? stats.readingAttempts + 1 : stats.readingAttempts,
    spellingCorrect: type === 'SPELLING' && success ? stats.spellingCorrect + 1 : stats.spellingCorrect,
    spellingAttempts: type === 'SPELLING' ? stats.spellingAttempts + 1 : stats.spellingAttempts,
    homeworkScans: type === 'HOMEWORK' ? stats.homeworkScans + 1 : stats.homeworkScans,
  };

  updateDeviceState({ learningStats: newStats });
};

// Logic to check if schedule implies a lock
export const calculateEffectiveStatus = (state: DeviceState): DeviceStatus => {
  // Manual override takes precedence
  if (state.status === DeviceStatus.LOCKED_MANUAL) {
    return DeviceStatus.LOCKED_MANUAL;
  }

  if (state.schedule.enabled) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = state.schedule.startTime.split(':').map(Number);
    const [endH, endM] = state.schedule.endTime.split(':').map(Number);
    
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;

    let isWithinTime = false;

    if (startTotal < endTotal) {
      // Standard range (e.g., 14:00 to 16:00)
      isWithinTime = currentTime >= startTotal && currentTime < endTotal;
    } else {
      // Overnight range (e.g., 22:00 to 07:00)
      isWithinTime = currentTime >= startTotal || currentTime < endTotal;
    }

    if (isWithinTime) {
      return DeviceStatus.LOCKED_SCHEDULE;
    }
  }

  return DeviceStatus.ACTIVE;
};