import React from "react";
import { ChallengeSession } from "../types";
import { getGeneralFeedback } from "../lib/scoring";
import { TASK_LIST } from "../data/tasks";
import { Trophy, Award, Calendar, Timer, BookOpen, ChevronRight } from "lucide-react";

interface ResultPageProps {
  session: ChallengeSession;
  onNavigate: (route: string) => void;
}

export default function ResultPage({ session, onNavigate }: ResultPageProps) {
  const feedback = getGeneralFeedback(session.totalScore);

  const formatElapsed = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min} daqiqa ${sec} soniya`;
  };

  return (
    <div id="result-page-container" className="max-w-3xl mx-auto flex flex-col gap-8 py-8 px-4 animate-fadeIn">
      {/* Celebration Header */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4 animate-bounce">
          <Trophy className="w-10 h-10" />
        </div>
        <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold block">CHALLENGE TUGALLANDI</span>
        <h2 id="result-fullname" className="text-3xl font-extrabold text-white mt-2">{session.fullName}</h2>
        
        {/* Dynamic Score and Title */}
        <div className="my-6">
          <h3 id="result-total-score" className="text-5xl font-black text-amber-400 font-mono">
            {session.totalScore} <span className="text-xl text-slate-500 font-normal">/ 600</span>
          </h3>
          <p id="result-feedback-title" className="text-lg font-bold text-cyan-300 mt-2">{feedback.title}</p>
          <p id="result-feedback-desc" className="text-slate-400 text-xs mt-1.5 max-w-lg mx-auto leading-relaxed">{feedback.desc}</p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto pt-4 border-t border-slate-800/60 text-left">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Timer className="w-4 h-4 text-cyan-400" />
            <span>Ketingiz: <strong>{formatElapsed(session.elapsedSeconds)}</strong></span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Yechildi: <strong>{session.completedTasksCount} / 6</strong> ta masala</span>
          </div>
        </div>
      </div>

      {/* Recommended learning path */}
      <div id="learning-path-box" className="bg-gradient-to-br from-cyan-950/20 to-indigo-950/10 border border-cyan-800/20 rounded-2xl p-5 flex gap-4 items-start backdrop-blur-md">
        <Award className="w-8 h-8 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-cyan-300 text-sm">Siz uchun tavsiya etilgan o'quv yo'li:</h4>
          <p id="result-learning-path" className="text-slate-300 text-xs mt-1.5 leading-relaxed">{feedback.learningPath}</p>
        </div>
      </div>

      {/* Task breakdown details list */}
      <div>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          📋 Masalalar bo'yicha batafsil natijalar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TASK_LIST.map((task) => {
            const res = session.taskResults[task.id];
            const hasResult = !!res;
            const score = hasResult ? res.score : 0;
            const completed = hasResult && res.completed;

            return (
              <div
                key={task.id}
                id={`result-task-card-${task.id}`}
                className={`bg-slate-900/40 border rounded-2xl p-5 flex flex-col justify-between backdrop-blur-md ${
                  completed
                    ? "border-emerald-500/20 shadow-lg shadow-emerald-950/5"
                    : "border-slate-800/80"
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-slate-200 text-sm">{task.name}</h4>
                    <span className={`text-[10px] font-mono font-bold ${completed ? "text-emerald-400" : "text-slate-500"}`}>
                      {score} / {task.maxScore} ball
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium block mt-1 uppercase tracking-wider">{task.concept}</span>
                  <p className="text-[11px] text-slate-400 mt-2.5 leading-relaxed">
                    {hasResult ? res.feedback : "Ushbu masalaga kirishilmadi."}
                  </p>
                </div>

                {hasResult && (
                  <div className="flex gap-4 border-t border-slate-800/50 mt-4 pt-2.5 text-[10px] text-slate-500 font-mono">
                    <span>Urinishlar: <strong className="text-slate-400">{res.attemptsCount}</strong></span>
                    <span>Maslahat: <strong className="text-slate-400">{res.hintsUsed}</strong></span>
                    <span>Soniya: <strong className="text-slate-400">{res.timeSpentSeconds}s</strong></span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Navigation */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4">
        <button
          id="go-leaderboard-btn"
          onClick={() => onNavigate("leaderboard")}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:opacity-95 text-slate-950 font-bold rounded-xl text-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          🏆 Peshqadamlar reytingini ko'rish
        </button>
        <button
          id="go-start-btn"
          onClick={() => onNavigate("start")}
          className="w-full sm:w-auto px-8 py-4 border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all active:scale-95"
        >
          Qayta urinish (Yangi sessiya)
        </button>
      </div>
    </div>
  );
}
