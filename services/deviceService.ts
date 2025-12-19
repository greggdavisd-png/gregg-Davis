
import { DeviceState, INITIAL_STATE, DeviceStatus, ActivityLog } from '../types';

const STORAGE_KEY = 'guardian_lock_state';

export const getDeviceState = (): DeviceState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return INITIAL_STATE;
  try {
    const parsed = JSON.parse(stored);
    return {
      ...INITIAL_STATE,
      ...parsed,
      learningStats: {
        ...INITIAL_STATE.learningStats,
        ...(parsed.learningStats || {})
      },
      location: {
        ...INITIAL_STATE.location,
        ...(parsed.location || {})
      },
      apps: (parsed.apps && parsed.apps.length > 0) ? parsed.apps : INITIAL_STATE.apps,
      isActivated: parsed.isActivated !== undefined ? parsed.isActivated : INITIAL_STATE.isActivated,
      strictEducationalMode: parsed.strictEducationalMode !== undefined ? parsed.strictEducationalMode : INITIAL_STATE.strictEducationalMode,
    };
  } catch (e) {
    return INITIAL_STATE;
  }
};

export const updateDeviceState = (updates: Partial<DeviceState>): DeviceState => {
  const current = getDeviceState();
  const newState = { ...current, ...updates, lastSync: Date.now() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
  window.dispatchEvent(new Event('local-storage-update'));
  return newState;
};

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

  const updatedLogs = [newLog, ...stats.recentActivity].slice(0, 50);

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

export const calculateEffectiveStatus = (state: DeviceState): DeviceStatus => {
  if (state.status === DeviceStatus.LOCKED_MANUAL) return DeviceStatus.LOCKED_MANUAL;
  if (state.schedule.enabled) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = state.schedule.startTime.split(':').map(Number);
    const [endH, endM] = state.schedule.endTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    let isWithinTime = startTotal < endTotal 
      ? (currentTime >= startTotal && currentTime < endTotal)
      : (currentTime >= startTotal || currentTime < endTotal);
    if (isWithinTime) return DeviceStatus.LOCKED_SCHEDULE;
  }
  return DeviceStatus.ACTIVE;
};
