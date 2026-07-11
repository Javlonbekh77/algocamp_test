import React, { useState, useEffect } from "react";
import { TASK_LIST } from "../data/tasks";
import { ChallengeSession, TaskResult } from "../types";
import { updateChallengeSession, submitChallengeSession, saveTaskAttempt, fetchLeaderboard, getChallengeSession } from "../lib/session";
import { Clock, User, LogOut, ClipboardList, AlertCircle, CheckCircle2, ArrowRight, Trophy, List } from "lucide-react";

// Import task components
import CoinTask from "../components/tasks/CoinTask";
import GreedyBackpackTask from "../components/tasks/GreedyBackpackTask";
import BinaryTreasureTask from "../components/tasks/BinaryTreasureTask";
import ShortestPathTask from "../components/tasks/ShortestPathTask";
import SlidingPuzzleTask from "../components/tasks/SlidingPuzzleTask";
import PrimeDetectiveTask from "../components/tasks/PrimeDetectiveTask";

interface ChallengePageProps {
  session: ChallengeSession;
  onFinish: (finalSession: ChallengeSession) => void;
}

export default function ChallengePage({ session, onFinish }: ChallengePageProps) {
  const [currentSession, setCurrentSession] = useState<ChallengeSession>(session);
  const [activeTaskId, setActiveTaskId] = useState<string>("coin_change");
  const [remainingSeconds, setRemainingSeconds] = useState<number>(1800);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showConfirmFinish, setShowConfirmFinish] = useState<boolean>(false);

  // Live sidebar scoreboard states
  const [activeSidebarTab, setActiveSidebarTab] = useState<"missions" | "leaderboard">("missions");
  const [liveLeaderboard, setLiveLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (activeSidebarTab === "leaderboard") {
      const loadLiveLeaderboard = async () => {
        try {
          const data = await fetchLeaderboard("all");
          setLiveLeaderboard(data);
        } catch (e) {
          console.error("Failed to load live scoreboard:", e);
        }
      };
      loadLiveLeaderboard();
      // Poll every 15 seconds to keep the competition intense!
      const interval = setInterval(loadLiveLeaderboard, 15000);
      return () => clearInterval(interval);
    }
  }, [activeSidebarTab]);

  // Sync session timer
  useEffect(() => {
    const startedTime = new Date(currentSession.startedAt).getTime();
    const endTime = startedTime + 30 * 60 * 1000; // 30 minutes

    const interval = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, Math.floor((endTime - now) / 1000));
      setRemainingSeconds(left);

      if (left === 0) {
        clearInterval(interval);
        handleAutoFinish();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentSession]);

  // Periodic save of session status in local/remote
  useEffect(() => {
    // Keep local storage synchronized
    localStorage.setItem(`stc_session_data_${currentSession.id}`, JSON.stringify(currentSession));
  }, [currentSession]);

  // Periodic liveness check to verify if admin has expelled/deleted this session in real-time
  useEffect(() => {
    const checkLiveness = async () => {
      try {
        const liveDoc = await getChallengeSession(currentSession.id);
        if (!liveDoc) {
          // Session was deleted from Firestore by the admin!
          alert("Siz ushbu musobaqa sessiyasidan chetlatildingiz (Admin tomonidan o'chirildi)!");
          localStorage.removeItem("stc_algo_session_id");
          localStorage.removeItem(`stc_session_data_${currentSession.id}`);
          window.location.reload();
        }
      } catch (err) {
        console.error("Liveness check failed:", err);
      }
    };

    // Check immediately, then poll every 12 seconds
    checkLiveness();
    const interval = setInterval(checkLiveness, 12000);
    return () => clearInterval(interval);
  }, [currentSession.id]);

  const handleTaskComplete = async (taskResult: TaskResult) => {
    // 1. Update session taskResults locally
    const updatedResults = {
      ...currentSession.taskResults,
      [taskResult.taskId]: taskResult,
    };

    // Calculate total score and completed tasks
    let totalScore = 0;
    let completedCount = 0;
    Object.values(updatedResults).forEach((res: any) => {
      totalScore += res.score;
      if (res.completed) completedCount++;
    });

    const updatedSession = {
      ...currentSession,
      taskResults: updatedResults,
      totalScore,
      completedTasksCount: completedCount,
    };

    setCurrentSession(updatedSession);

    // 2. Save detailed task attempt in Firestore
    try {
      await saveTaskAttempt(
        currentSession.id,
        taskResult.taskId,
        taskResult.taskName,
        taskResult.score,
        taskResult.maxScore,
        "completed",
        taskResult.attemptsCount,
        taskResult.hintsUsed,
        taskResult.timeSpentSeconds,
        taskResult.movesCount,
        taskResult.details,
        true
      );

      // 3. Update parent session state in Firestore
      await updateChallengeSession(currentSession.id, {
        taskResults: updatedResults,
        totalScore,
        completedTasksCount: completedCount,
      });

      // 4. Auto progression to the next task after 3 seconds
      setTimeout(() => {
        const currentIndex = TASK_LIST.findIndex(t => t.id === taskResult.taskId);
        let nextTaskId = "";
        
        // Attempt to find the next incomplete task
        for (let i = 1; i <= TASK_LIST.length; i++) {
          const nextIndex = (currentIndex + i) % TASK_LIST.length;
          const t = TASK_LIST[nextIndex];
          if (!updatedResults[t.id]?.completed) {
            nextTaskId = t.id;
            break;
          }
        }

        // Fallback if all tasks are completed
        if (!nextTaskId) {
          nextTaskId = TASK_LIST[(currentIndex + 1) % TASK_LIST.length].id;
        }

        setActiveTaskId(nextTaskId);
      }, 3000);
    } catch (err) {
      console.error("Failed to save progress to Firestore:", err);
    }
  };

  const handleGoToNextTask = () => {
    const currentIndex = TASK_LIST.findIndex(t => t.id === activeTaskId);
    let nextTaskId = "";
    
    // Attempt to find the next incomplete task
    for (let i = 1; i <= TASK_LIST.length; i++) {
      const nextIndex = (currentIndex + i) % TASK_LIST.length;
      const t = TASK_LIST[nextIndex];
      if (!currentSession.taskResults[t.id]?.completed) {
        nextTaskId = t.id;
        break;
      }
    }

    // Fallback if all tasks are completed
    if (!nextTaskId) {
      nextTaskId = TASK_LIST[(currentIndex + 1) % TASK_LIST.length].id;
    }
    
    setActiveTaskId(nextTaskId);
  };

  const handleAutoFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const finishedSession = await submitChallengeSession(currentSession.id, currentSession);
      onFinish(finishedSession);
    } catch (err) {
      console.error("Auto submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleManualFinish = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const finishedSession = await submitChallengeSession(currentSession.id, currentSession);
      onFinish(finishedSession);
    } catch (err) {
      console.error("Manual submit failed:", err);
    } finally {
      setSubmitting(false);
      setShowConfirmFinish(false);
    }
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const isUrgentWarning = remainingSeconds <= 60; // 1 minute
  const isFiveMinWarning = remainingSeconds <= 300 && remainingSeconds > 60; // 5 minutes

  const renderActiveTask = () => {
    const savedState = currentSession.taskResults[activeTaskId]?.details;

    const props = {
      sessionId: currentSession.id,
      onComplete: handleTaskComplete,
      savedState,
    };

    switch (activeTaskId) {
      case "coin_change":
        return <CoinTask {...props} />;
      case "greedy_backpack":
        return <GreedyBackpackTask {...props} />;
      case "binary_treasure":
        return <BinaryTreasureTask {...props} />;
      case "shortest_path":
        return <ShortestPathTask {...props} />;
      case "sliding_puzzle":
        return <SlidingPuzzleTask {...props} />;
      case "prime_detective":
        return <PrimeDetectiveTask {...props} />;
      default:
        return (
          <div className="flex items-center justify-center h-64 text-slate-500 font-mono">
            Kutilmagan xatolik. Masala yuklanmadi.
          </div>
        );
    }
  };

  return (
    <div id="challenge-layout" className="flex flex-col gap-6 animate-fadeIn pb-12">
      {/* Top sticky bar (Cyber styled) */}
      <div className="bg-slate-950/90 border border-amber-500/20 rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
        
        {/* User Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-900 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-none font-mono">{currentSession.fullName}</h3>
            <span className="text-[9px] text-amber-500 mt-1 block uppercase tracking-wider font-bold font-mono">[STC // ALGOCAMP HACKER]</span>
          </div>
        </div>

        {/* Timer countdown visualizer */}
        <div className="flex items-center gap-6">
          <div
            id="challenge-timer"
            className={`flex items-center gap-2.5 px-4 py-2 rounded-lg border font-mono font-bold text-lg sm:text-xl shadow-inner transition-colors duration-300 ${
              isUrgentWarning
                ? "bg-red-950/40 border-red-500 text-red-400 animate-pulse"
                : isFiveMinWarning
                ? "bg-amber-950/30 border-amber-500/70 text-amber-400"
                : "bg-slate-900 border-amber-500/25 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.05)]"
            }`}
          >
            <Clock className={`w-5 h-5 ${isUrgentWarning ? "text-red-400" : "text-amber-400"}`} />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          <div className="text-right font-mono">
            <span className="text-[9px] text-slate-500 block uppercase tracking-wider font-bold">UMUMIY BALL</span>
            <span id="challenge-total-score" className="text-2xl font-black text-amber-400 leading-none">
              {currentSession.totalScore}
            </span>
            <span className="text-xs text-slate-500 font-bold font-mono">/ 600</span>
          </div>
        </div>

        {/* Finish button */}
        <button
          id="trigger-confirm-finish-btn"
          onClick={() => setShowConfirmFinish(true)}
          className="px-5 py-2 rounded-lg bg-red-900/80 hover:bg-red-800 border border-red-700/30 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer font-mono"
        >
          <LogOut className="w-3.5 h-3.5" /> JAVOBLARNI YUBORISH
        </button>
      </div>

      {/* Warnings left */}
      {isFiveMinWarning && (
        <div id="five-min-warning" className="p-3 bg-amber-950/20 border border-amber-500/30 text-amber-400 rounded-xl text-xs flex items-center gap-2.5 animate-fadeIn font-mono">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <span>Ehtiyot bo'ling! Challenge yakunlanishiga 5 daqiqadan kamroq vaqt qoldi.</span>
        </div>
      )}
      {isUrgentWarning && (
        <div id="one-min-warning" className="p-3 bg-red-950/20 border border-red-500/30 text-red-400 rounded-xl text-xs flex items-center gap-2.5 animate-pulse font-bold font-mono">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span>SHOSHILING! Atigi 1 daqiqa qoldi! Tizim javoblarni avtomatik saqlaydi va yakunlaydi.</span>
        </div>
      )}

      {/* Main Grid: Arena & Missions List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left/Center: Main Arena */}
        <div className="lg:col-span-8 bg-slate-900/20 border border-slate-850 rounded-2xl p-5 sm:p-6 shadow-2xl relative backdrop-blur-md flex flex-col justify-between">
          <div>
            {renderActiveTask()}
          </div>
          
          {/* Automatic seamless next round navigation */}
          {currentSession.taskResults[activeTaskId]?.completed && (
            <div className="mt-6 pt-4 border-t border-slate-850 flex justify-end animate-fadeIn">
              <button
                onClick={handleGoToNextTask}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 rounded-lg font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/10 animate-bounce cursor-pointer font-mono"
              >
                KEYINGI MISSIYAGA O'TISH <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar: Mission selection & Live Leaderboard */}
        <div className="lg:col-span-4 flex flex-col gap-4 bg-slate-950/80 border border-amber-500/10 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
          {/* Tab Switcher */}
          <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-850">
            <button
              onClick={() => setActiveSidebarTab("missions")}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                activeSidebarTab === "missions"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Masalalar
            </button>
            <button
              onClick={() => setActiveSidebarTab("leaderboard")}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer select-none ${
                activeSidebarTab === "leaderboard"
                  ? "bg-amber-500 text-slate-950 font-black shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" /> Liderlar (Jonli)
            </button>
          </div>

          {activeSidebarTab === "missions" ? (
            <div className="flex flex-col gap-3">
              {TASK_LIST.map((task) => {
                const result = currentSession.taskResults[task.id];
                const isCompleted = result?.completed;
                const isActive = activeTaskId === task.id;

                let cardClass = "bg-slate-900/30 border-slate-850 hover:bg-slate-900/60 hover:border-slate-800";
                if (isActive) {
                  cardClass = "bg-amber-500/5 border-amber-500/70 shadow-md shadow-amber-950/20";
                } else if (isCompleted) {
                  cardClass = "bg-emerald-950/10 border-emerald-500/20 hover:bg-emerald-950/20";
                }

                return (
                  <button
                    key={task.id}
                    id={`mission-card-${task.id}`}
                    onClick={() => setActiveTaskId(task.id)}
                    className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all relative cursor-pointer ${cardClass}`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5 font-mono">
                          {task.name}
                          {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight font-mono uppercase">{task.concept}</p>
                      </div>
                      
                      {/* Difficulty Badge */}
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border font-mono ${
                        task.difficulty === "Oson"
                          ? "bg-emerald-950/20 border-emerald-800/30 text-emerald-400"
                          : task.difficulty === "O'rta"
                          ? "bg-amber-950/20 border-amber-800/30 text-amber-400"
                          : "bg-red-950/20 border-red-800/30 text-red-400"
                      }`}>
                        {task.difficulty}
                      </span>
                    </div>

                    <div className="flex justify-between items-center w-full mt-3.5 pt-2 border-t border-slate-850 text-[9px] font-mono">
                      <span className="text-slate-500 font-bold uppercase tracking-wider">
                        {isCompleted ? "Yakunlandi" : "Kutilmoqda"}
                      </span>
                      <span className="text-amber-400 font-bold">
                        {isCompleted ? `${result.score} / ${task.maxScore}` : `0 / ${task.maxScore}`} ball
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Live ACM-ICPC / IOI Style scoreboard list */
            <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto pr-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                CP-Style Scoreboard (Yashil: Yechildi, Kulrang: Yechilmagan)
              </span>
              
              {liveLeaderboard.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs italic font-mono">
                  Ishtirokchilar topilmadi...
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {liveLeaderboard.map((entry, idx) => {
                    const isSelf = entry.sessionId === currentSession.id;
                    const rank = idx + 1;
                    
                    // Task abbreviations mapping
                    const tasksAbbr = [
                      { id: "coin_change", letter: "C" },
                      { id: "greedy_backpack", letter: "G" },
                      { id: "binary_treasure", letter: "B" },
                      { id: "shortest_path", letter: "S" },
                      { id: "sliding_puzzle", letter: "P" },
                      { id: "prime_detective", letter: "D" },
                    ];

                    return (
                      <div
                        key={entry.sessionId}
                        className={`p-2.5 rounded-xl border flex flex-col gap-2 transition-all ${
                          isSelf
                            ? "bg-amber-500/10 border-amber-500/45 shadow-[0_0_15px_rgba(245,158,11,0.04)]"
                            : "bg-slate-900/30 border-slate-850/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold font-mono ${
                              rank === 1
                                ? "bg-amber-500 text-slate-950 font-black"
                                : rank === 2
                                ? "bg-slate-300 text-slate-950"
                                : rank === 3
                                ? "bg-amber-800 text-amber-100"
                                : "bg-slate-800 text-slate-400"
                            }`}>
                              {rank}
                            </span>
                            <span className={`text-xs font-bold truncate ${isSelf ? "text-amber-400 font-black" : "text-slate-200"}`}>
                              {entry.fullName}
                            </span>
                          </div>
                          
                          <div className="text-right font-mono shrink-0">
                            <span className="text-xs font-black text-amber-400">{entry.totalScore} <span className="text-[8px] text-slate-550 font-normal">ball</span></span>
                          </div>
                        </div>

                        {/* ACM ICPC Grid Blocks */}
                        <div className="flex items-center justify-between gap-1 mt-0.5 pt-1.5 border-t border-slate-900/40">
                          <div className="flex gap-1">
                            {tasksAbbr.map((abbr) => {
                              const solvedScore = entry.taskBreakdown?.[abbr.id] || 0;
                              const isSolved = solvedScore > 0;
                              return (
                                <div
                                  key={abbr.id}
                                  title={`${abbr.id}: ${solvedScore} ball`}
                                  className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-colors ${
                                    isSolved
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                      : "bg-slate-850 text-slate-600 border border-slate-800/30"
                                  }`}
                                >
                                  {abbr.letter}
                                </div>
                              );
                            })}
                          </div>
                          
                          <span className="text-[8px] text-slate-500 font-mono">
                            {entry.completedTasksCount || 0} / 6
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmFinish && (
        <div id="confirm-finish-modal" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-850 rounded-xl max-w-sm w-full p-6 shadow-2xl relative font-mono">
            <h4 className="text-base font-bold text-white mb-2 uppercase tracking-wide text-red-400">[TIZIMNI YAKUNLASH]</h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              Haqiqatan ham challenge'ni hozir yakunlamoqchimisiz? Keyinchalik javoblaringizni o'zgartirib bo'lmaydi va yakuniy natijangiz saqlanadi.
            </p>
            <div className="flex gap-3 justify-end text-xs">
              <button
                id="cancel-finish-btn"
                onClick={() => setShowConfirmFinish(false)}
                className="px-4 py-2 border border-slate-800 text-slate-400 rounded hover:bg-slate-850 transition-colors cursor-pointer"
              >
                Bekor qilish
              </button>
              <button
                id="confirm-finish-btn"
                onClick={handleManualFinish}
                disabled={submitting}
                className="px-4 py-2 bg-red-800 text-white rounded hover:bg-red-700 transition-colors cursor-pointer"
              >
                {submitting ? "Saqlanmoqda..." : "Ha, yakunlash"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
