import { DeviceState, INITIAL_STATE, DeviceStatus } from '../types';

const STORAGE_KEY = 'guardian_lock_state';

// Helper to get current state from storage
export const getDeviceState = (): DeviceState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return INITIAL_STATE;
  try {
    return JSON.parse(stored);
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