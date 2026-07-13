import React, { useState, useEffect } from "react";
import { TASK_LIST } from "../data/tasks";
import { ChallengeSession, TaskResult } from "../types";
import { updateChallengeSession, submitChallengeSession, saveTaskAttempt, fetchLeaderboard, getChallengeSession } from "../lib/session";
import { Clock, User, LogOut, ClipboardList, AlertCircle, CheckCircle2, ArrowRight, Trophy, List } from "lucide-react";
import { GRAPH_EDGES } from "../data/graphData";

// Import task components
import CoinTask from "../components/tasks/CoinTask";
import GreedyBackpackTask from "../components/tasks/GreedyBackpackTask";
import BinaryTreasureTask from "../components/tasks/BinaryTreasureTask";
import ShortestPathTask from "../components/tasks/ShortestPathTask";
import SlidingPuzzleTask from "../components/tasks/SlidingPuzzleTask";
import PrimeDetectiveTask from "../components/tasks/PrimeDetectiveTask";
import CaesarCipherTask from "../components/tasks/CaesarCipherTask";

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

  const getPathCost = (path: string[]) => {
    let cost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const from = path[i];
      const to = path[i + 1];
      const edge = GRAPH_EDGES.find(
        (e) => (e.from === from && e.to === to) || (e.from === to && e.to === from)
      );
      if (edge) {
        cost += edge.cost;
      } else {
        cost += 999;
      }
    }
    return cost;
  };

  const getTaskProgressText = (taskId: string, result: any) => {
    if (!result) return { status: "Kutilmoqda", scoreText: "0 / 100 ball", roundText: "Boshlanmagan" };
    
    const score = result.score || 0;
    const isCompleted = result.completed;
    
    if (isCompleted) {
      return { status: "Yakunlandi", scoreText: `${score} / 100 ball`, roundText: "Barcha raundlar yechildi" };
    }
    
    if (score > 0) {
      let totalRounds = 3;
      let passedRounds = 0;
      let currentRound = 1;
      
      if (taskId === "coin_change") {
        passedRounds = result.details?.rounds?.filter((r: any) => r.correct).length || 0;
        currentRound = Math.min(3, (result.details?.currentRoundIndex || 0) + 1);
      } else if (taskId === "greedy_backpack") {
        passedRounds = result.details?.roundScores?.filter((s: number) => s > 0).length || 0;
        currentRound = Math.min(3, (result.details?.currentRoundIndex || 0) + 1);
      } else if (taskId === "binary_treasure") {
        totalRounds = 2;
        passedRounds = result.details?.roundFounds?.filter((f: any) => f).length || 0;
        currentRound = Math.min(2, (result.details?.currentRoundIndex || 0) + 1);
      } else if (taskId === "prime_detective") {
        totalRounds = 2;
        passedRounds = result.details?.roundCorrect?.filter((c: any) => c).length || 0;
        currentRound = Math.min(2, (result.details?.currentRoundIndex || 0) + 1);
      } else if (taskId === "shortest_path") {
        totalRounds = 1;
        passedRounds = 0;
        currentRound = 1;
      } else if (taskId === "sliding_puzzle") {
        totalRounds = 1;
        passedRounds = 0;
        currentRound = 1;
      } else if (taskId === "caesar_cipher") {
        totalRounds = 1;
        passedRounds = result.details?.solved ? 1 : 0;
        currentRound = 1;
      }
      
      if (totalRounds > 1) {
        return {
          status: "Jarayonda",
          scoreText: `${score} / 100 ball`,
          roundText: `${currentRound}-raundda, ${passedRounds}/${totalRounds} raund o'tildi`
        };
      } else {
        return {
          status: "Jarayonda",
          scoreText: `${score} / 100 ball`,
          roundText: "Qisman yechilgan"
        };
      }
    }
    
    return { status: "Kutilmoqda", scoreText: "0 / 100 ball", roundText: "Boshlanmagan" };
  };

  const getTaskDetailsTooltip = (taskId: string, result: any, taskName: string) => {
    if (!result) return `${taskName}: Urinilmagan (0 ball)`;
    
    const score = result.score ?? 0;
    const isCompleted = result.completed;
    
    if (isCompleted) {
      return `${taskName}: 100% yechilgan! (${score} ball)`;
    }
    
    if (score > 0) {
      let totalRounds = 3;
      let passedRounds = 0;
      let currentRound = 1;
      
      if (taskId === "coin_change") {
        passedRounds = result.details?.rounds?.filter((r: any) => r.correct).length || 0;
        currentRound = Math.min(3, (result.details?.currentRoundIndex || 0) + 1);
      } else if (taskId === "greedy_backpack") {
        passedRounds = result.details?.roundScores?.filter((s: number) => s > 0).length || 0;
        currentRound = Math.min(3, (result.details?.currentRoundIndex || 0) + 1);
      } else if (taskId === "binary_treasure") {
        totalRounds = 2;
        passedRounds = result.details?.roundFounds?.filter((f: any) => f).length || 0;
        currentRound = Math.min(2, (result.details?.currentRoundIndex || 0) + 1);
      } else if (taskId === "prime_detective") {
        totalRounds = 2;
        passedRounds = result.details?.roundCorrect?.filter((c: any) => c).length || 0;
        currentRound = Math.min(2, (result.details?.currentRoundIndex || 0) + 1);
      } else if (taskId === "shortest_path") {
        totalRounds = 1;
        passedRounds = 0;
        currentRound = 1;
      } else if (taskId === "sliding_puzzle") {
        totalRounds = 1;
        passedRounds = 0;
        currentRound = 1;
      } else if (taskId === "caesar_cipher") {
        totalRounds = 1;
        passedRounds = result.details?.solved ? 1 : 0;
        currentRound = 1;
      }
      
      if (totalRounds > 1) {
        return `${taskName}: ${currentRound}-raund ustida ishlamoqda, ${passedRounds}/${totalRounds} raund o'tilgan (${score} ball)`;
      } else {
        return `${taskName}: qisman yechilgan (${score} ball)`;
      }
    }
    
    return `${taskName}: urinilgan lekin hali ball yig'ilmagan (0 ball)`;
  };

  const handleTaskStateChange = async (taskId: string, details: any) => {
    if (currentSession.taskResults[taskId]?.completed) return;

    // Calculate intermediate/partial score dynamically
    let calculatedScore = 0;
    
    if (taskId === "coin_change") {
      const rounds = details.rounds || [];
      let ccScore = 0;
      if (rounds[0]?.correct) ccScore += 33;
      if (rounds[1]?.correct) ccScore += 33;
      if (rounds[2]?.correct) ccScore += 34;
      calculatedScore = ccScore;
    } else if (taskId === "greedy_backpack") {
      const roundScores = details.roundScores || [];
      calculatedScore = (roundScores[0] || 0) + (roundScores[1] || 0) + (roundScores[2] || 0);
    } else if (taskId === "binary_treasure") {
      const roundScores = details.roundScores || [];
      calculatedScore = (roundScores[0] || 0) + (roundScores[1] || 0);
    } else if (taskId === "shortest_path") {
      const cost = details.currentPath ? getPathCost(details.currentPath) : 999;
      const isAtFinish = details.currentPath?.[details.currentPath.length - 1] === "Xiva";
      if (isAtFinish) {
        if (cost === 20) calculatedScore = 100;
        else if (cost <= 22) calculatedScore = 80;
        else if (cost <= 25) calculatedScore = 60;
        else calculatedScore = 40;
      } else {
        calculatedScore = Math.min(25, (details.currentPath?.length || 1) * 3);
      }
    } else if (taskId === "sliding_puzzle") {
      if (details.solved) {
        const moves = details.movesCount || 0;
        const scrambleMoves = details.scrambleMovesCount || 10;
        if (moves <= scrambleMoves + 2) calculatedScore = 100;
        else if (moves <= 20) calculatedScore = 80;
        else if (moves <= 35) calculatedScore = 60;
        else calculatedScore = 45;
      } else {
        const currBoard = details.board || [];
        const solvedBoard = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];
        let correctPlacements = 0;
        currBoard.forEach((val: number, idx: number) => {
          if (val === solvedBoard[idx] && val !== 0) correctPlacements++;
        });
        calculatedScore = Math.round((correctPlacements / 15) * 35);
      }
    } else if (taskId === "prime_detective") {
      const r1Correct = details.roundCorrect?.[0];
      const r1Queries = details.queriesHistory?.[0]?.length || 0;
      let r1Score = 0;
      if (details.roundChecked?.[0]) {
        if (r1Correct) {
          r1Score = 30;
          if (r1Queries >= 1 && r1Queries <= 5) r1Score += 10;
          else if (r1Queries >= 6 && r1Queries <= 10) r1Score += 6;
          else if (r1Queries >= 11 && r1Queries <= 15) r1Score += 2;
          
          const parsedFactor = parseInt(details.userBonusFactors?.[0]);
          if (!isNaN(parsedFactor) && parsedFactor > 1 && parsedFactor < 437 && 437 % parsedFactor === 0) {
            r1Score += 10;
          }
        } else {
          r1Score = 10;
        }
      }

      const r2Correct = details.roundCorrect?.[1];
      const r2Queries = details.queriesHistory?.[1]?.length || 0;
      let r2Score = 0;
      if (details.roundChecked?.[1]) {
        if (r2Correct) {
          r2Score = 35;
          if (r2Queries >= 1 && r2Queries <= 10) r2Score += 15;
          else if (r2Queries >= 11 && r2Queries <= 18) r2Score += 8;
          else if (r2Queries >= 19 && r2Queries <= 25) r2Score += 3;
        } else {
          r2Score = 15;
        }
      }
      calculatedScore = r1Score + r2Score;
    } else if (taskId === "caesar_cipher") {
      calculatedScore = details.solved ? 100 : (details.progressPercentage || 0);
    }

    const existingResult = currentSession.taskResults[taskId] || {
      taskId,
      taskName: TASK_LIST.find(t => t.id === taskId)?.name || taskId,
      score: 0,
      maxScore: 100,
      completed: false,
      attemptsCount: 0,
      hintsUsed: 0,
      timeSpentSeconds: 0,
    };

    const finalScore = Math.max(existingResult.score, Math.min(100, calculatedScore));

    const updatedResult = {
      ...existingResult,
      score: finalScore,
      details: {
        ...(existingResult.details || {}),
        ...details,
      },
    };

    const updatedResults = {
      ...currentSession.taskResults,
      [taskId]: updatedResult,
    };

    // Dynamically sum the scores and completed tasks across all results
    let dynamicTotalScore = 0;
    let dynamicCompletedCount = 0;
    Object.values(updatedResults).forEach((res: any) => {
      dynamicTotalScore += res.score || 0;
      if (res.completed) {
        dynamicCompletedCount++;
      }
    });

    const updatedSession = {
      ...currentSession,
      taskResults: updatedResults,
      totalScore: dynamicTotalScore,
      completedTasksCount: dynamicCompletedCount,
    };

    setCurrentSession(updatedSession);

    try {
      await updateChallengeSession(currentSession.id, {
        taskResults: updatedResults,
        totalScore: dynamicTotalScore,
        completedTasksCount: dynamicCompletedCount,
      });
    } catch (err) {
      console.error("Failed to update intermediate state in Firestore:", err);
    }
  };

  const renderActiveTask = () => {
    const savedState = currentSession.taskResults[activeTaskId]?.details;

    const props = {
      sessionId: currentSession.id,
      onComplete: handleTaskComplete,
      savedState,
      onStateChange: (state: any) => handleTaskStateChange(activeTaskId, state),
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
      case "caesar_cipher":
        return (
          <CaesarCipherTask
            {...props}
            firstName={currentSession.firstName}
            lastName={currentSession.lastName}
            fullName={currentSession.fullName}
          />
        );
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
                const progress = getTaskProgressText(task.id, result);

                let cardClass = "bg-slate-900/30 border-slate-850 hover:bg-slate-900/60 hover:border-slate-800";
                if (isActive) {
                  cardClass = "bg-amber-500/5 border-amber-500/70 shadow-md shadow-amber-950/20";
                } else if (isCompleted) {
                  cardClass = "bg-emerald-950/10 border-emerald-500/20 hover:bg-emerald-950/20";
                } else if (result?.score > 0) {
                  cardClass = "bg-amber-950/5 border-amber-500/20 hover:bg-amber-950/10";
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

                    <div className="flex flex-col gap-1 w-full mt-3 pt-2 border-t border-slate-850 text-[9px] font-mono">
                      <div className="flex justify-between items-center w-full">
                        <span className={`font-bold uppercase tracking-wider ${
                          isCompleted ? "text-emerald-400" : (result?.score > 0 ? "text-amber-400 animate-pulse" : "text-slate-500")
                        }`}>
                          {progress.status}
                        </span>
                        <span className="text-amber-400 font-bold">
                          {result ? `${result.score} / ${task.maxScore}` : `0 / ${task.maxScore}`} ball
                        </span>
                      </div>
                      {result?.score > 0 && (
                        <div className="text-[10px] text-slate-400/95 mt-0.5 font-medium leading-none">
                          {progress.roundText}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            /* Live ACM-ICPC / IOI Style scoreboard list */
            <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto pr-1">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                CP-Style Scoreboard (Yashil: Yechildi, Sariq: Jarayonda)
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
                              const taskResult = entry.taskResults?.[abbr.id];
                              const isFullySolved = solvedScore >= 95 || taskResult?.completed;
                              
                              const taskName = TASK_LIST.find(t => t.id === abbr.id)?.name || abbr.id;
                              const tooltip = getTaskDetailsTooltip(abbr.id, taskResult || (solvedScore > 0 ? { score: solvedScore } : null), taskName);
                              
                              let blockBg = "bg-slate-850 text-slate-600 border border-slate-800/30";
                              if (isSolved) {
                                if (isFullySolved) {
                                  blockBg = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
                                } else {
                                  blockBg = "bg-amber-500/15 text-amber-400 border border-amber-500/40 animate-pulse";
                                }
                              }
                              
                              return (
                                <div
                                  key={abbr.id}
                                  title={tooltip}
                                  className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black font-mono transition-colors cursor-help ${blockBg}`}
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
