
export enum DeviceStatus {
  ACTIVE = 'ACTIVE',
  LOCKED_MANUAL = 'LOCKED_MANUAL',
  LOCKED_SCHEDULE = 'LOCKED_SCHEDULE',
}

export interface Schedule {
  enabled: boolean;
  startTime: string; // "HH:MM" 24h format
  endTime: string;   // "HH:MM" 24h format
}

export interface ActivityLog {
  id: string;
  type: 'READING' | 'SPELLING' | 'MATH' | 'HOMEWORK' | 'QUIZ';
  success: boolean;
  timestamp: number;
  details?: string;
}

export interface LearningStats {
  mathCorrect: number;
  mathAttempts: number;
  readingCorrect: number;
  readingAttempts: number;
  spellingCorrect: number;
  spellingAttempts: number;
  homeworkScans: number;
  recentActivity: ActivityLog[];
}

export interface LocationData {
  lat: number;
  lng: number;
  lastUpdated: number;
}

export interface AppConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  allowed: boolean;
  isEducational: boolean;
  category: string;
}

export interface DeviceState {
  status: DeviceStatus;
  schedule: Schedule;
  lastSync: number;
  batteryLevel: number;
  screenTimeToday: number; // minutes
  unlockMessage?: string;
  childAge: number;
  learningStats: LearningStats;
  location: LocationData;
  parentPin: string | null;
  isActivated: boolean;
  trialEndDate: number;
  feedbackGiven: boolean;
  quizQuestionCount: number;
  quizUnlockDuration: number; // in minutes
  apps: AppConfig[];
  strictEducationalMode: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface ReadingChallenge {
  title: string;
  story: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface SpellingChallenge {
  word: string;
  hint: string;
  contextSentence: string;
}

export interface MathQuestion {
  question: string;
  answer: number;
}

export interface VideoSearchResult {
  title: string;
  channel: string;
  duration: string;
  thumbnailColor: string; // hex
}

export const INITIAL_STATE: DeviceState = {
  status: DeviceStatus.ACTIVE,
  schedule: {
    enabled: false,
    startTime: "21:00",
    endTime: "07:00"
  },
  lastSync: Date.now(),
  batteryLevel: 85,
  screenTimeToday: 45,
  unlockMessage: "Time for homework!",
  childAge: 10,
  learningStats: {
    mathCorrect: 0,
    mathAttempts: 0,
    readingCorrect: 0,
    readingAttempts: 0,
    spellingCorrect: 0,
    spellingAttempts: 0,
    homeworkScans: 0,
    recentActivity: []
  },
  location: {
    lat: 37.7749,
    lng: -122.4194,
    lastUpdated: Date.now()
  },
  parentPin: null,
  isActivated: false,
  trialEndDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
  feedbackGiven: false,
  quizQuestionCount: 40,
  quizUnlockDuration: 90,
  strictEducationalMode: true,
  apps: [
    { id: 'learn', name: 'Learn', icon: 'BrainCircuit', color: 'bg-indigo-500', allowed: true, isEducational: true, category: 'Academic' },
    { id: 'homework', name: 'Homework', icon: 'GraduationCap', color: 'bg-blue-500', allowed: true, isEducational: true, category: 'Academic' },
    { id: 'security', name: 'Security', icon: 'ShieldCheck', color: 'bg-green-600', allowed: true, isEducational: true, category: 'Utility' },
    { id: 'games', name: 'Games', icon: 'Gamepad2', color: 'bg-orange-500', allowed: false, isEducational: false, category: 'Entertainment' },
    { id: 'whatsapp', name: 'WhatsApp', icon: 'MessageCircle', color: 'bg-[#25D366]', allowed: false, isEducational: false, category: 'Social' },
    { id: 'music', name: 'Music', icon: 'Music', color: 'bg-pink-500', allowed: false, isEducational: false, category: 'Entertainment' },
    { id: 'camera', name: 'Camera', icon: 'Camera', color: 'bg-gray-500', allowed: true, isEducational: false, category: 'Utility' },
    { id: 'videos', name: 'Videos', icon: 'Play', color: 'bg-red-500', allowed: false, isEducational: false, category: 'Entertainment' },
    { id: 'settings', name: 'Settings', icon: 'Settings', color: 'bg-slate-600', allowed: true, isEducational: false, category: 'Utility' },
  ]
};
