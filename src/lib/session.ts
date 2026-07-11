import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import { ChallengeSession, TaskResult, LeaderboardEntry } from "../types";

const SESSIONS_COLLECTION = "challengeSessions";
const ATTEMPTS_COLLECTION = "taskAttempts";
const LEADERBOARD_COLLECTION = "leaderboard";

// Helper to recursively remove undefined values to prevent Firestore crashes
function cleanUndefined(obj: any): any {
  if (obj === undefined) {
    return null;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (typeof obj === "object" && obj !== null) {
    const proto = Object.getPrototypeOf(obj);
    if (proto === null || proto === Object.prototype) {
      const cleaned: any = {};
      for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (val !== undefined) {
          cleaned[key] = cleanUndefined(val);
        }
      }
      return cleaned;
    }
  }
  return obj;
}

export async function createChallengeSession(
  firstName: string,
  lastName: string,
  anonymousUid: string
): Promise<ChallengeSession> {
  const sessionId = doc(collection(db, SESSIONS_COLLECTION)).id;
  const fullName = `${firstName.trim()} ${lastName.trim()}`;
  const now = new Date();

  const session: ChallengeSession = {
    id: sessionId,
    createdAt: now.toISOString(),
    startedAt: now.toISOString(),
    endedAt: null,
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    fullName,
    anonymousUid,
    status: "active",
    totalScore: 0,
    maxScore: 600,
    elapsedSeconds: 0,
    remainingSeconds: 1800, // 30 minutes
    completedTasksCount: 0,
    taskResults: {},
    userAgent: navigator.userAgent,
  };

  await setDoc(doc(db, SESSIONS_COLLECTION, sessionId), cleanUndefined({
    ...session,
    createdAt: serverTimestamp(),
    startedAt: serverTimestamp(),
  }));

  localStorage.setItem("stc_algo_session_id", sessionId);
  return session;
}

export async function getChallengeSession(sessionId: string): Promise<ChallengeSession | null> {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    
    // Normalize Firestore Timestamps to ISO strings
    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt;
    const startedAt = data.startedAt instanceof Timestamp ? data.startedAt.toDate().toISOString() : data.startedAt;
    const endedAt = data.endedAt instanceof Timestamp ? data.endedAt.toDate().toISOString() : data.endedAt;

    return {
      ...data,
      id: docSnap.id,
      createdAt,
      startedAt,
      endedAt,
    } as ChallengeSession;
  }
  return null;
}

export async function updateChallengeSession(
  sessionId: string,
  updates: Partial<ChallengeSession>
): Promise<void> {
  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(docRef, cleanUndefined(updates));
}

export async function saveTaskAttempt(
  sessionId: string,
  taskId: string,
  taskName: string,
  score: number,
  maxScore: number,
  status: "not_started" | "in_progress" | "completed" | "failed",
  attemptsCount: number,
  hintsUsed: number,
  timeSpentSeconds: number,
  movesCount?: number,
  finalAnswer?: any,
  isCorrect?: boolean,
  logs: string[] = []
): Promise<void> {
  const attemptId = `${sessionId}_${taskId}`;
  const docRef = doc(db, ATTEMPTS_COLLECTION, attemptId);

  await setDoc(docRef, cleanUndefined({
    id: attemptId,
    sessionId,
    taskId,
    taskName,
    startedAt: serverTimestamp(),
    completedAt: serverTimestamp(),
    status,
    score,
    maxScore,
    attemptsCount,
    hintsUsed,
    timeSpentSeconds,
    movesCount,
    finalAnswer,
    isCorrect,
    logs,
  }));
}

export async function submitChallengeSession(
  sessionId: string,
  currentSession: ChallengeSession
): Promise<ChallengeSession> {
  // Recalculate everything
  let totalScore = 0;
  let completedCount = 0;
  const taskBreakdown: Record<string, number> = {};

  Object.values(currentSession.taskResults).forEach((res: TaskResult) => {
    totalScore += res.score;
    if (res.completed) {
      completedCount++;
    }
    taskBreakdown[res.taskId] = res.score;
  });

  const now = new Date();
  const startedTime = new Date(currentSession.startedAt).getTime();
  const elapsedSeconds = Math.min(1800, Math.floor((now.getTime() - startedTime) / 1000));
  const remainingSeconds = Math.max(0, 1800 - elapsedSeconds);

  const updatedSession: Partial<ChallengeSession> = {
    status: "finished",
    endedAt: now.toISOString(),
    totalScore,
    completedTasksCount: completedCount,
    elapsedSeconds,
    remainingSeconds,
  };

  const docRef = doc(db, SESSIONS_COLLECTION, sessionId);
  await updateDoc(docRef, cleanUndefined({
    ...updatedSession,
    endedAt: serverTimestamp(),
  }));

  // Create Leaderboard Entry
  await addToLeaderboard(
    sessionId,
    currentSession.fullName,
    totalScore,
    completedCount,
    elapsedSeconds,
    taskBreakdown
  );

  return {
    ...currentSession,
    ...updatedSession,
    endedAt: now.toISOString(),
  };
}

async function addToLeaderboard(
  sessionId: string,
  fullName: string,
  totalScore: number,
  completedTasksCount: number,
  elapsedSeconds: number,
  taskBreakdown: Record<string, number>
): Promise<void> {
  const docRef = doc(db, LEADERBOARD_COLLECTION, sessionId);
  const entry: LeaderboardEntry = {
    sessionId,
    fullName,
    totalScore,
    completedTasksCount,
    elapsedSeconds,
    createdAt: serverTimestamp(),
    taskBreakdown,
  };
  await setDoc(docRef, cleanUndefined(entry));
}

const CONFIG_COLLECTION = "competitionConfig";

export async function getCompetitionStatus(): Promise<"active" | "ended"> {
  try {
    const docSnap = await getDoc(doc(db, CONFIG_COLLECTION, "status"));
    if (docSnap.exists()) {
      return docSnap.data().status || "active";
    }
  } catch (err) {
    console.error("Failed to fetch competition status:", err);
  }
  return "active";
}

export async function setCompetitionStatus(status: "active" | "ended"): Promise<void> {
  await setDoc(doc(db, CONFIG_COLLECTION, "status"), { status });
}

export async function fetchLeaderboard(filter: "all" | "today"): Promise<LeaderboardEntry[]> {
  const colRef = collection(db, SESSIONS_COLLECTION);
  const querySnapshot = await getDocs(colRef);
  const entries: LeaderboardEntry[] = [];

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    
    // Ignore empty/invalid test entries
    if (!data.fullName && !data.firstName) {
      return;
    }

    const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt;

    // Calculate live total score and task counts dynamically
    let totalScore = 0;
    let completedTasksCount = 0;
    const taskBreakdown: Record<string, number> = {};

    if (data.taskResults) {
      Object.keys(data.taskResults).forEach((taskId) => {
        const res = data.taskResults[taskId];
        if (res) {
          totalScore += res.score || 0;
          if (res.completed) {
            completedTasksCount++;
          }
          taskBreakdown[taskId] = res.score || 0;
        }
      });
    }

    // Fallbacks if data has precalculated totals
    const finalScore = data.totalScore !== undefined ? data.totalScore : totalScore;
    const finalCompleted = data.completedTasksCount !== undefined ? data.completedTasksCount : completedTasksCount;

    entries.push({
      sessionId: docSnap.id,
      fullName: data.fullName || `${data.firstName || ""} ${data.lastName || ""}`.trim() || "Ishtirokchi",
      totalScore: finalScore,
      completedTasksCount: finalCompleted,
      elapsedSeconds: data.elapsedSeconds || 0,
      createdAt,
      taskBreakdown,
      // Store status dynamically so the leaderboard page can show if they are live!
      status: data.status || "active",
    } as any);
  });

  // Client-side filtering for today
  let filtered = entries;
  if (filter === "today") {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    filtered = entries.filter((e) => {
      if (!e.createdAt) return false;
      return e.createdAt.startsWith(todayStr);
    });
  }

  // Robust ICPC/IOI sorting rules:
  // 1. Highest total score first
  // 2. Highest completed tasks count first
  // 3. Lowest elapsed seconds first
  // 4. Earliest createdAt first
  filtered.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (b.completedTasksCount !== a.completedTasksCount) {
      return b.completedTasksCount - a.completedTasksCount;
    }
    if (a.elapsedSeconds !== b.elapsedSeconds) {
      return a.elapsedSeconds - b.elapsedSeconds;
    }
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateA - dateB;
  });

  return filtered;
}

export async function fetchAllSessionsForAdmin(): Promise<any[]> {
  const colRef = collection(db, SESSIONS_COLLECTION);
  const querySnapshot = await getDocs(colRef);
  const sessions: any[] = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    sessions.push({
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      startedAt: data.startedAt instanceof Timestamp ? data.startedAt.toDate().toISOString() : data.startedAt,
      endedAt: data.endedAt instanceof Timestamp ? data.endedAt.toDate().toISOString() : data.endedAt,
    });
  });

  // Sort by createdAt desc
  sessions.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return sessions;
}

export async function findActiveSessionByName(
  firstName: string,
  lastName: string
): Promise<ChallengeSession | null> {
  const colRef = collection(db, SESSIONS_COLLECTION);
  const q = query(
    colRef,
    where("status", "==", "active")
  );
  const querySnapshot = await getDocs(q);
  const targetFirst = firstName.trim().toLowerCase();
  const targetLast = lastName.trim().toLowerCase();

  for (const docSnap of querySnapshot.docs) {
    const data = docSnap.data();
    const fName = (data.firstName || "").trim().toLowerCase();
    const lName = (data.lastName || "").trim().toLowerCase();
    
    if (fName === targetFirst && lName === targetLast) {
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt;
      const startedAt = data.startedAt instanceof Timestamp ? data.startedAt.toDate().toISOString() : data.startedAt;
      const endedAt = data.endedAt instanceof Timestamp ? data.endedAt.toDate().toISOString() : data.endedAt;

      return {
        ...data,
        id: docSnap.id,
        createdAt,
        startedAt,
        endedAt,
      } as ChallengeSession;
    }
  }
  return null;
}

export async function deleteSessionForAdmin(sessionId: string): Promise<void> {
  // 1. Delete from challengeSessions
  await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));
  // 2. Delete from leaderboard
  await deleteDoc(doc(db, LEADERBOARD_COLLECTION, sessionId));
}


