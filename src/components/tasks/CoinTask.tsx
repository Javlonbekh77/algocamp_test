import React, { useState, useEffect } from "react";
import { getFeedbackAndScore } from "../../lib/scoring";
import { Coins, Trash2, RotateCcw, AlertTriangle, CheckCircle, ChevronRight, Award, Shield } from "lucide-react";

interface CoinTaskProps {
  sessionId: string;
  onComplete: (result: any) => void;
  savedState?: any;
  onStateChange?: (state: any) => void;
}

interface RoundState {
  target: number;
  userCoins: number[];
  correct: boolean;
  isOptimal: boolean;
  checked: boolean;
}

export default function CoinTask({ onComplete, savedState }: CoinTaskProps) {
  const ROUND_CONFIGS = [
    { target: 25, optimalCoins: [11, 11, 3] }, // Optimal: 3 coins (11+11+3=25)
    { target: 31, optimalCoins: [11, 7, 7, 3] }, // Optimal: 4 coins (11+7+7+3=31). Greedy fails with 5: [11,11,3,3,3]
    { target: 41, optimalCoins: [11, 11, 11, 4, 4] }, // Optimal: 5 coins
  ];

  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [rounds, setRounds] = useState<RoundState[]>([
    { target: 25, userCoins: [], correct: false, isOptimal: false, checked: false },
    { target: 31, userCoins: [], correct: false, isOptimal: false, checked: false },
    { target: 41, userCoins: [], correct: false, isOptimal: false, checked: false },
  ]);

  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [roundFeedback, setRoundFeedback] = useState<string>("");
  const [isTaskCompleted, setIsTaskCompleted] = useState<boolean>(false);
  const [startTime] = useState<number>(Date.now());

  // Restore saved state if exists
  useEffect(() => {
    if (savedState) {
      if (savedState.currentRoundIndex !== undefined) setCurrentRoundIndex(savedState.currentRoundIndex);
      if (savedState.rounds) setRounds(savedState.rounds);
      if (savedState.attemptsCount !== undefined) setAttemptsCount(savedState.attemptsCount);
      if (savedState.isTaskCompleted !== undefined) setIsTaskCompleted(savedState.isTaskCompleted);
    }
  }, [savedState]);

  const currentRound = rounds[currentRoundIndex];
  const config = ROUND_CONFIGS[currentRoundIndex];
  const currentSum = currentRound.userCoins.reduce((sum, c) => sum + c, 0);
  const remainingSum = config.target - currentSum;

  const handleAddCoin = (val: number) => {
    if (currentRound.checked) return;
    if (currentSum + val > config.target) return; // Prevent exceeding target in UI

    const updatedRounds = [...rounds];
    updatedRounds[currentRoundIndex].userCoins = [...currentRound.userCoins, val];
    setRounds(updatedRounds);
    setRoundFeedback("");
  };

  const handleRemoveLastCoin = () => {
    if (currentRound.checked) return;
    if (currentRound.userCoins.length === 0) return;

    const updatedRounds = [...rounds];
    updatedRounds[currentRoundIndex].userCoins = currentRound.userCoins.slice(0, -1);
    setRounds(updatedRounds);
    setRoundFeedback("");
  };

  const handleResetRound = () => {
    if (currentRound.checked) return;

    const updatedRounds = [...rounds];
    updatedRounds[currentRoundIndex].userCoins = [];
    setRounds(updatedRounds);
    setRoundFeedback("");
  };

  const handleCheckRound = () => {
    if (currentSum !== config.target) return;

    setAttemptsCount(prev => prev + 1);
    const updatedRounds = [...rounds];
    const isCorrect = currentSum === config.target;
    const isOptimal = isCorrect && currentRound.userCoins.length === config.optimalCoins.length;

    if (isOptimal) {
      updatedRounds[currentRoundIndex].correct = isCorrect;
      updatedRounds[currentRoundIndex].isOptimal = isOptimal;
      updatedRounds[currentRoundIndex].checked = true;
      setRounds(updatedRounds);
      setRoundFeedback(`Ajoyib! Siz bozordagi ushbu hisob-kitobni eng kam tangalar soni bilan hal qildingiz: ${config.optimalCoins.length} ta tanga. +33.3 ball! 🌟`);
    } else {
      updatedRounds[currentRoundIndex].checked = false; // block proceeding
      setRounds(updatedRounds);
      setRoundFeedback(`Siz summani to'g'ri yig'dingiz, lekin bu optimal (eng kam tangali) yechim emas! (Sizda: ${currentRound.userCoins.length} ta tanga, lekin bundan ham kamroq tanga bilan yig'ish mumkin). Tozalab qaytadan urinib ko'ring.`);
    }
  };

  const handleNextRound = () => {
    setRoundFeedback("");
    if (currentRoundIndex < 2) {
      setCurrentRoundIndex(prev => prev + 1);
    } else {
      // All rounds completed!
      handleFinishTask();
    }
  };

  const handleFinishTask = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    const roundResults = rounds.map((r, idx) => ({
      target: r.target,
      userCoins: r.userCoins,
      optimalCoins: ROUND_CONFIGS[idx].optimalCoins,
      correct: r.correct,
      isOptimal: r.isOptimal,
    }));

    const finalResult = getFeedbackAndScore("coin_change", {
      attemptsCount,
      hintsUsed: 0,
      timeSpentSeconds: elapsedSeconds,
      details: { roundResults },
    });

    setIsTaskCompleted(true);
    onComplete({
      taskId: "coin_change",
      taskName: "Tanga Ustasi",
      score: finalResult.score,
      maxScore: 100,
      completed: true,
      attemptsCount,
      hintsUsed: 0,
      timeSpentSeconds: elapsedSeconds,
      movesCount: rounds.reduce((sum, r) => sum + r.userCoins.length, 0),
      feedback: finalResult.feedback,
      details: { roundResults },
    });
  };

  return (
    <div id="coin-task-container" className="flex flex-col gap-6 text-slate-100 h-full justify-between">
      {/* Task Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2 font-mono">
          <Coins className="w-6 h-6 text-amber-400" /> [ROUND_01: TANGA USTASI] (Raund {currentRoundIndex + 1}/3)
        </h2>
        {/* Shartga urg'u attractive style */}
        <div className="mt-3 border-l-4 border-amber-500 bg-slate-900/90 px-4 py-3 rounded-r-xl shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block mb-1">Bozor Hisob-Kitobi:</span>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Bozorda mahsulot xarid qilayotganda, sotuvchi bilan faqat <strong className="text-amber-400">3, 4, 7 va 11 so'mlik</strong> nominaldagi tangalar orqali hisob-kitob qilishingiz kerak. Berilgan summani <strong className="text-amber-400">eng kam tangalar soni</strong> bilan yig'ing va eng optimal qaytim/to'lov usulini toping!
          </p>
        </div>
      </div>

      {/* Game Content */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1 my-2">
        {/* Left Side: Coins & Controls */}
        <div className="md:col-span-7 flex flex-col gap-6 bg-slate-950/80 rounded-xl p-5 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.03)]">
          <div className="flex justify-between items-center bg-slate-900/60 p-4 rounded-lg border border-slate-800 font-mono">
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">MAQSAD</p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">{config.target} so'm</h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">JORIY</p>
              <h3 className={`text-2xl font-black mt-1 ${currentSum === config.target ? "text-emerald-400" : "text-amber-300"}`}>
                {currentSum} so'm
              </h3>
            </div>
            <div className="text-right border-l border-slate-800 pl-4">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">QOLGAN</p>
              <h3 className="text-2xl font-black text-slate-400 mt-1">{remainingSum} so'm</h3>
            </div>
          </div>

          {/* Treasure Bag Visualizer */}
          <div className="flex-1 min-h-[140px] flex flex-col items-center justify-center bg-slate-900/40 rounded-xl border-2 border-dashed border-amber-500/20 p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-amber-500/3 to-transparent pointer-events-none" />
            
            {currentRound.userCoins.length === 0 ? (
              <p className="text-xs text-slate-500 italic flex flex-col items-center gap-2">
                <Coins className="w-8 h-8 text-slate-700 animate-pulse" />
                Tangalarni qo'shish uchun quyidagi tugmalarni bosing
              </p>
            ) : (
              <div className="flex flex-wrap gap-2.5 items-center justify-center max-w-full">
                {currentRound.userCoins.map((coin, index) => (
                  <div
                    key={index}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/35 text-slate-950 font-black text-base border border-amber-200 select-none animate-bounce"
                    style={{ animationDelay: `${index * 40}ms`, animationDuration: "0.8s" }}
                  >
                    {coin}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Coins buttons */}
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider font-mono">Tangani tanlang:</p>
            <div className="grid grid-cols-4 gap-2">
              {[3, 4, 7, 11].map((val) => {
                const disabled = currentRound.checked || (currentSum + val > config.target);
                return (
                  <button
                    key={val}
                    id={`coin-btn-${val}`}
                    onClick={() => handleAddCoin(val)}
                    disabled={disabled}
                    className={`h-14 rounded-lg flex flex-col items-center justify-center font-bold text-base transition-all active:scale-95 border ${
                      disabled
                        ? "bg-slate-900/60 text-slate-700 border-slate-800 cursor-not-allowed opacity-40"
                        : "bg-slate-900 hover:bg-slate-850 text-amber-400 border-amber-500/30 hover:border-amber-400 shadow-[0_2px_8px_rgba(245,158,11,0.05)]"
                    }`}
                  >
                    <span className="font-mono text-lg">{val}</span>
                    <span className="text-[9px] text-slate-500">so'm</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-1">
            <button
              id="coin-remove-btn"
              onClick={handleRemoveLastCoin}
              disabled={currentRound.checked || currentRound.userCoins.length === 0}
              className="py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center gap-1.5 text-xs font-mono"
            >
              <Trash2 className="w-3.5 h-3.5" /> O'chirish
            </button>
            <button
              id="coin-reset-btn"
              onClick={handleResetRound}
              disabled={currentRound.checked || currentRound.userCoins.length === 0}
              className="py-2 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-900 disabled:opacity-30 disabled:hover:bg-transparent transition-colors flex items-center justify-center gap-1.5 text-xs font-mono"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Tozalash
            </button>
          </div>
        </div>

        {/* Right Side: Status & Feedback */}
        <div className="md:col-span-5 flex flex-col justify-between gap-4 bg-slate-950/40 rounded-xl p-5 border border-slate-900">
          <div className="flex flex-col gap-4">
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-850 text-xs">
              <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2 font-mono">[TIZIM QOIDALARI]</h4>
              <ul className="text-slate-400 space-y-2 list-disc list-inside">
                <li>Har bir raundda eng kam miqdordagi tangadan foydalanish maksimal ball (33.3 ball) beradi.</li>
                <li>Dinamik dasturlash (DP) usuli bilan eng optimal tanga sonini yig'ishga harakat qiling.</li>
              </ul>
            </div>

            {/* Live round feedback */}
            {roundFeedback && (
              <div
                id="coin-round-feedback"
                className={`p-3.5 rounded-lg border flex gap-3 text-xs animate-fadeIn leading-relaxed ${
                  currentRound.isOptimal
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                    : "bg-amber-950/20 border-amber-500/30 text-amber-400"
                }`}
              >
                {currentRound.isOptimal ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>{roundFeedback}</div>
              </div>
            )}
          </div>

          {/* Round completion or final completion controls */}
          <div className="mt-4">
            {!currentRound.checked ? (
              <button
                id="coin-submit-round-btn"
                onClick={handleCheckRound}
                disabled={currentSum !== config.target}
                className="w-full py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 font-mono"
              >
                RAUNDNI TEKSHIRISH
              </button>
            ) : (
              <button
                id="coin-next-round-btn"
                onClick={handleNextRound}
                className="w-full py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-slate-950 font-mono"
              >
                {currentRoundIndex < 2 ? "KEYINGI RAUND" : "MISSIYANI YAKUNLASH"} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Educational Note or Complete state */}
      {isTaskCompleted ? (
        <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-4 flex gap-3 items-center">
          <Award className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide font-mono">[MUTAXASSIS TAHLILI]</h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              Tanga yig'ish masalasi (Coin Change) eng yaxshi nominalni (greedy) tanlash bilan har doim ham yechilmaydi. Ba'zida kichikroq tangalardan ko'proq tanlash jami tangalar sonini kamaytiradi (Dinamik dasturlash optimal yechimni topadi).
            </p>
          </div>
        </div>
      ) : (
        currentRoundIndex === 2 && currentRound.checked && (
          <div className="bg-slate-900/60 border border-amber-500/20 rounded-xl p-3 text-[11px] text-amber-400 leading-relaxed italic text-center font-mono">
            Raund tugadi! Missiyani yakunlash va ballarni tizimga yuborish uchun o'ng tomondagi tugmani bosing.
          </div>
        )
      )}
    </div>
  );
}
