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

export interface DeviceState {
  status: DeviceStatus;
  schedule: Schedule;
  lastSync: number;
  batteryLevel: number;
  screenTimeToday: number; // minutes
  unlockMessage?: string;
  childAge: number;
  learningStats: LearningStats;
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
  }
};