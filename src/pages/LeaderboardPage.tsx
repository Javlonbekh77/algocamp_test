import React, { useState, useEffect } from "react";
import { fetchLeaderboard, getCompetitionStatus } from "../lib/session";
import { LeaderboardEntry } from "../types";
import { Trophy, Clock, Medal, Calendar, Award, RefreshCw, ChevronLeft, Star, Sparkles, Search, User, Activity, Check } from "lucide-react";
import { motion } from "motion/react";
import { playCorrectSound } from "../lib/sound";

interface LeaderboardPageProps {
  onNavigate: (route: string) => void;
}

export default function LeaderboardPage({ onNavigate }: LeaderboardPageProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "today">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [finishedOnly, setFinishedOnly] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [compStatus, setCompStatus] = useState<"active" | "ended">("active");
  const [currentUserSessionId, setCurrentUserSessionId] = useState<string | null>(null);

  useEffect(() => {
    const savedId = localStorage.getItem("stc_algo_session_id");
    if (savedId) {
      setCurrentUserSessionId(savedId);
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [filter]);

  const loadLeaderboard = async () => {
    setLoading(true);
    try {
      const data = await fetchLeaderboard(filter);
      setEntries(data);
      const status = await getCompetitionStatus();
      setCompStatus(status);
      if (status === "ended") {
        // Play celebratory sound!
        playCorrectSound();
      }
    } catch (err) {
      console.error("Leaderboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatElapsed = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}m ${sec}s`;
  };

  const formatDate = (dateString: any) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("uz-UZ", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter and search entries
  const processedEntries = entries.filter((e) => {
    const matchesSearch = e.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFinished = !finishedOnly || e.completedTasksCount > 0;
    return matchesSearch && matchesFinished;
  });

  // Split into Top 3 podium
  const podium = processedEntries.slice(0, 3);

  // Find current user's entry if any
  const currentUserEntry = entries.find((e) => e.sessionId === currentUserSessionId);
  const currentUserRank = entries.findIndex((e) => e.sessionId === currentUserSessionId) + 1;

  // Task keys mapped to colors and initials
  const tasks = [
    { id: "coin_change", short: "CC", name: "Tanga Ustasi" },
    { id: "greedy_backpack", short: "GB", name: "Ryukzak" },
    { id: "binary_treasure", short: "BT", name: "Xazina" },
    { id: "shortest_path", short: "SP", name: "Eng Arzon Yo'l" },
    { id: "sliding_puzzle", short: "PZ", name: "15 Box" },
    { id: "prime_detective", short: "PD", name: "Tub Son" },
  ];

  return (
    <div id="leaderboard-page-container" className="max-w-6xl mx-auto flex flex-col gap-6 py-6 px-2 sm:px-4 animate-fadeIn pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex flex-col gap-1">
          <button
            id="back-home-btn"
            onClick={() => onNavigate("start")}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors w-fit font-mono mb-1 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> BOSH SAHIFAGA QAYTISH
          </button>
          <h2 className="text-2xl font-black text-white flex items-center gap-2.5 tracking-tight">
            <Trophy className="w-7 h-7 text-amber-400 animate-pulse" /> JONLI REYTING MONITORI
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            ICPC / IOI tizimidagi kabi real vaqt rejimidagi natijalar jadvali
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {compStatus === "active" ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-400 font-mono font-bold text-xs uppercase tracking-wider">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Mavsum: FAOL
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl text-amber-400 font-mono font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 animate-spin" /> MUSOBAQA TUGADI
            </div>
          )}

          <button
            id="refresh-leaderboard-btn"
            onClick={loadLeaderboard}
            disabled={loading}
            className="text-slate-400 hover:text-white p-2.5 rounded-xl hover:bg-slate-900 border border-slate-800 transition-all flex items-center justify-center cursor-pointer"
            title="Yangilash"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* User Info HUD Card */}
      {currentUserEntry && (
        <div className="bg-gradient-to-r from-cyan-950/40 via-slate-900/60 to-blue-950/30 border border-cyan-500/30 rounded-2xl p-5 shadow-[0_0_25px_rgba(6,182,212,0.08)] flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-400/30 rounded-full flex items-center justify-center text-cyan-400 shadow-inner">
              <User className="w-6 h-6" />
            </div>
            <div>
              <div className="text-[10px] text-cyan-400 font-black uppercase tracking-wider">Sizning Profilingiz</div>
              <div className="text-base font-bold text-white">{currentUserEntry.fullName}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-center divide-x divide-slate-800">
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-black">Sizning o'rningiz</div>
              <div className="text-lg font-black text-cyan-400">#{currentUserRank}</div>
            </div>
            <div className="pl-4">
              <div className="text-[9px] text-slate-500 uppercase font-black">Jami Ball</div>
              <div className="text-lg font-black text-amber-400">{currentUserEntry.totalScore} <span className="text-xs text-slate-500 font-normal">/ 600</span></div>
            </div>
            <div className="pl-4">
              <div className="text-[9px] text-slate-500 uppercase font-black">Muvaffaqiyat</div>
              <div className="text-lg font-black text-emerald-400">{currentUserEntry.completedTasksCount} <span className="text-xs text-slate-500 font-normal">yechildi</span></div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search bar */}
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Ishtirokchini ismi bo'yicha qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 text-slate-100 text-xs sm:text-sm rounded-xl border border-slate-850 focus:border-cyan-500 focus:outline-none transition-all placeholder:text-slate-600 font-mono"
          />
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap gap-4 items-center justify-end w-full md:w-auto">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850">
            <button
              id="filter-all-btn"
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === "all" ? "bg-slate-900 text-cyan-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Barchasi
            </button>
            <button
              id="filter-today-btn"
              onClick={() => setFilter("today")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filter === "today" ? "bg-slate-900 text-cyan-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              Bugun
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none font-mono">
            <input
              id="checkbox-finished-only"
              type="checkbox"
              checked={finishedOnly}
              onChange={(e) => setFinishedOnly(e.target.checked)}
              className="rounded border-slate-850 bg-slate-950 text-cyan-500 focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
            />
            <span>Kamida bitta masala yechganlar</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-500" />
          <span className="text-xs font-mono">Reyting maydoni yuklanmoqda...</span>
        </div>
      ) : processedEntries.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/10 border border-slate-800/60 rounded-2xl text-slate-500 italic text-sm font-mono">
          Natijalar topilmadi. Qidiruv kalit so'zini tekshiring yoki barcha ro'yxatni tanlang.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Top 3 podium section */}
          {compStatus === "ended" && podium.length > 0 && (
            <div id="kahoot-podium-container" className="flex flex-col gap-8 items-center justify-center my-4 py-8 bg-slate-950/40 rounded-3xl border border-amber-500/15 p-6 relative overflow-hidden backdrop-blur-lg shadow-2xl">
              
              {/* Floating Festive Confetti Emojis */}
              <div className="absolute inset-0 pointer-events-none select-none">
                <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: -450, opacity: [0, 1, 1, 0] }} transition={{ repeat: Infinity, duration: 4, delay: 0.2 }} className="absolute left-[10%] text-xl">🎉</motion.div>
                <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: -450, opacity: [0, 1, 1, 0] }} transition={{ repeat: Infinity, duration: 5, delay: 1.5 }} className="absolute left-[25%] text-lg">⭐️</motion.div>
                <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: -450, opacity: [0, 1, 1, 0] }} transition={{ repeat: Infinity, duration: 3.5, delay: 0.8 }} className="absolute right-[20%] text-2xl">✨</motion.div>
                <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: -450, opacity: [0, 1, 1, 0] }} transition={{ repeat: Infinity, duration: 4.5, delay: 2.1 }} className="absolute right-[40%] text-xl">🎈</motion.div>
              </div>

              {/* Big Celebration Header */}
              <div className="text-center z-10 flex flex-col items-center gap-1.5 font-mono">
                <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-400 text-[10px] font-black uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> TUGAL TO'LIQ G'OLIBLAR
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                  STC ALGO CHALLENGE G'OLIBLARI
                </h3>
              </div>

              {/* The Towers */}
              <div className="flex items-end justify-center gap-4 sm:gap-6 pt-12 pb-2 w-full max-w-lg font-mono">
                {/* 2nd Place */}
                {podium[1] ? (
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-center mb-3">
                      <div className="text-xs font-bold text-slate-300 truncate max-w-[95px]">{podium[1].fullName}</div>
                      <div className="text-[10px] text-cyan-400 font-extrabold">{podium[1].totalScore} ball</div>
                    </div>
                    <div className="w-full h-24 sm:h-32 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-700 rounded-t-2xl flex flex-col items-center justify-between p-3 border-t border-slate-500 shadow-2xl">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-400 flex items-center justify-center font-black text-slate-200 text-xs">2</div>
                      <span className="text-[8px] text-slate-400 font-bold">{formatElapsed(podium[1].elapsedSeconds)}</span>
                    </div>
                  </div>
                ) : <div className="flex-1" />}

                {/* 1st Place */}
                {podium[0] ? (
                  <div className="flex flex-col items-center flex-1 z-10">
                    <div className="text-center mb-3 relative">
                      <div className="absolute -top-6 inset-x-0 text-center text-lg animate-bounce">👑</div>
                      <div className="text-xs sm:text-sm font-black text-white truncate max-w-[110px]">{podium[0].fullName}</div>
                      <div className="text-[11px] text-amber-400 font-black">{podium[0].totalScore} ball</div>
                    </div>
                    <div className="w-full h-32 sm:h-44 bg-gradient-to-t from-amber-950 via-amber-600 to-yellow-500 rounded-t-2xl flex flex-col items-center justify-between p-3 border-t-2 border-yellow-300 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                      <div className="w-10 h-10 rounded-full bg-slate-950 border-2 border-yellow-300 flex items-center justify-center text-base">🏆</div>
                      <span className="text-[8px] text-slate-950 font-black bg-yellow-200 px-1 rounded uppercase">{formatElapsed(podium[0].elapsedSeconds)}</span>
                    </div>
                  </div>
                ) : <div className="flex-1" />}

                {/* 3rd Place */}
                {podium[2] ? (
                  <div className="flex flex-col items-center flex-1">
                    <div className="text-center mb-3">
                      <div className="text-xs font-bold text-slate-300 truncate max-w-[95px]">{podium[2].fullName}</div>
                      <div className="text-[10px] text-cyan-400 font-extrabold">{podium[2].totalScore} ball</div>
                    </div>
                    <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-amber-950 via-amber-900 to-amber-800 rounded-t-2xl flex flex-col items-center justify-between p-3 border-t border-amber-600 shadow-2xl">
                      <div className="w-7 h-7 rounded-full bg-slate-900 border-2 border-amber-600 flex items-center justify-center font-black text-amber-600 text-[10px]">3</div>
                      <span className="text-[8px] text-amber-100/60 font-bold">{formatElapsed(podium[2].elapsedSeconds)}</span>
                    </div>
                  </div>
                ) : <div className="flex-1" />}
              </div>
            </div>
          )}

          {/* ICPC Style Full Scoreboard Grid */}
          <div className="bg-slate-950/80 border border-slate-850 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800/80">
                  <tr>
                    <th className="px-4 py-3.5 text-center w-12">O'rin</th>
                    <th className="px-4 py-3.5">Ishtirokchi</th>
                    <th className="px-4 py-3.5 text-center w-20">Jami</th>
                    {tasks.map((t) => (
                      <th
                        key={t.id}
                        className="px-2 py-3.5 text-center w-16 hover:text-white transition-colors cursor-help"
                        title={t.name}
                      >
                        {t.short}
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-center w-24">Vaqt</th>
                    <th className="px-4 py-3.5 text-right w-24">Sana</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850">
                  {processedEntries.map((entry, idx) => {
                    const rank = idx + 1;
                    const isSelf = entry.sessionId === currentUserSessionId;
                    const isLive = entry.status === "active";

                    return (
                      <tr
                        key={entry.sessionId}
                        className={`transition-colors group ${
                          isSelf
                            ? "bg-cyan-500/10 border-y border-cyan-500/30 hover:bg-cyan-500/15"
                            : "hover:bg-slate-900/50"
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-4 py-3.5 text-center">
                          {rank === 1 ? (
                            <span className="text-amber-400 font-bold text-sm">🥇</span>
                          ) : rank === 2 ? (
                            <span className="text-slate-300 font-bold text-sm">🥈</span>
                          ) : rank === 3 ? (
                            <span className="text-amber-600 font-bold text-sm">🥉</span>
                          ) : (
                            <span className="text-slate-500 font-medium font-mono text-xs">{rank}</span>
                          )}
                        </td>

                        {/* Name + Live status */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold transition-colors ${isSelf ? "text-cyan-400" : "text-slate-200 group-hover:text-white"}`}>
                              {entry.fullName}
                            </span>

                            {isSelf && (
                              <span className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider">
                                SIZ
                              </span>
                            )}

                            {isLive ? (
                              <span className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded tracking-wider animate-pulse">
                                <span className="h-1 w-1 rounded-full bg-emerald-400" />
                                SOLVING
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 bg-slate-900 border border-slate-800 text-slate-500 text-[8px] px-1.5 py-0.5 rounded tracking-wider">
                                DONE
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Total score */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-black text-amber-400 text-sm">
                            {entry.totalScore}
                          </span>
                        </td>

                        {/* Individual Task Scores (C, GB, BT, SP, PZ, PD) */}
                        {tasks.map((t) => {
                          const score = entry.taskBreakdown?.[t.id] ?? 0;
                          const attempted = entry.taskBreakdown?.[t.id] !== undefined;

                          let bgBadge = "bg-slate-900/20 text-slate-700 border-slate-900";
                          let scoreText = "-";

                          if (attempted) {
                            if (score === 100) {
                              bgBadge = "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 font-black shadow-[0_0_8px_rgba(16,185,129,0.05)]";
                              scoreText = "+100";
                            } else if (score > 0) {
                              bgBadge = "bg-yellow-950/30 border-yellow-500/25 text-yellow-500 font-bold";
                              scoreText = `+${score}`;
                            } else {
                              bgBadge = "bg-red-950/20 border-red-500/25 text-red-400 font-semibold";
                              scoreText = "0";
                            }
                          }

                          return (
                            <td key={t.id} className="px-1 py-3 text-center">
                              <div
                                className={`inline-flex items-center justify-center w-12 py-1 text-[10px] rounded border ${bgBadge}`}
                                title={`${t.name}: ${score} ball`}
                              >
                                {scoreText}
                              </div>
                            </td>
                          );
                        })}

                        {/* Elapsed time */}
                        <td className="px-4 py-3.5 text-center text-slate-400 text-[11px]">
                          {formatElapsed(entry.elapsedSeconds)}
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3.5 text-right text-[10px] text-slate-500">
                          {formatDate(entry.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Contest Key / Legend */}
          <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 flex flex-wrap gap-4 justify-between items-center text-[10px] text-slate-500 font-mono">
            <div className="flex flex-wrap gap-4">
              <span><strong>Mundarija:</strong></span>
              <span><strong className="text-emerald-400">+100</strong> To'liq yechim</span>
              <span><strong className="text-yellow-500">+X</strong> Qisman yechim (ball)</span>
              <span><strong className="text-red-400">0</strong> Noto'g'ri urinish</span>
              <span><strong>-</strong> Urinilmagan</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span><strong>Masalalar:</strong></span>
              {tasks.map((t) => (
                <span key={t.id} className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-850" title={t.name}>
                  {t.short}: {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
