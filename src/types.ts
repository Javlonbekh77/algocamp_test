export interface TaskResult {
  taskId: string;
  taskName: string;
  score: number;
  maxScore: number;
  completed: boolean;
  attemptsCount: number;
  hintsUsed: number;
  timeSpentSeconds: number;
  movesCount?: number;
  feedback: string;
  details?: any;
}

export interface ChallengeSession {
  id: string;
  createdAt: any; // Firestore Timestamp or ISO string
  startedAt: any; // Firestore Timestamp or ISO string
  endedAt: any | null;
  firstName: string;
  lastName: string;
  fullName: string;
  anonymousUid: string;
  status: "not_started" | "active" | "finished" | "expired";
  totalScore: number;
  maxScore: number; // 600
  elapsedSeconds: number;
  remainingSeconds: number;
  completedTasksCount: number;
  taskResults: Record<string, TaskResult>;
  finalRank?: number;
  userAgent?: string;
}

export interface TaskAttempt {
  id: string;
  sessionId: string;
  taskId: string;
  taskName: string;
  startedAt: any;
  completedAt: any | null;
  status: "not_started" | "in_progress" | "completed" | "failed";
  score: number;
  maxScore: number;
  attemptsCount: number;
  hintsUsed: number;
  timeSpentSeconds: number;
  movesCount?: number;
  logs?: string[];
  finalAnswer?: any;
  isCorrect?: boolean;
}

export interface LeaderboardEntry {
  sessionId: string;
  fullName: string;
  totalScore: number;
  completedTasksCount: number;
  elapsedSeconds: number;
  createdAt: any;
  rankKey?: string;
  taskBreakdown?: Record<string, number>;
}

export interface TaskDefinition {
  id: string;
  name: string;
  concept: string;
  difficulty: "Oson" | "O'rta" | "Qiyin";
  maxScore: number;
}
