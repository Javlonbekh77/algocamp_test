import React, { useState, useEffect } from "react";
import { getFeedbackAndScore } from "../../lib/scoring";
import { Backpack, AlertTriangle, CheckCircle, ChevronRight, Award, ShoppingBag } from "lucide-react";
import { playClickSound, playCorrectSound, playIncorrectSound } from "../../lib/sound";

interface GreedyBackpackTaskProps {
  sessionId: string;
  onComplete: (result: any) => void;
  savedState?: any;
  onStateChange?: (state: any) => void;
}

interface BackpackItem {
  id: string;
  name: string;
  weight: number;
  value: number;
  ratio: number;
}

export default function GreedyBackpackTask({ onComplete, savedState }: GreedyBackpackTaskProps) {
  // Configs - Grocery/Market theme with Uzbek daily bazaar items
  const ITEMS_ROUND_1: BackpackItem[] = [
    { id: "asal", name: "🍯 Tog' Asali", weight: 3, value: 15, ratio: 5.0 },
    { id: "yongoq", name: "🌰 Chorsu Yong'og'i", weight: 4, value: 16, ratio: 4.0 },
    { id: "mayiz", name: "🍇 Katta Mayiz", weight: 2, value: 7, ratio: 3.5 },
    { id: "olma", name: "🍎 Qizil Olma", weight: 5, value: 15, ratio: 3.0 },
    { id: "shaftoli", name: "🍑 Shirin Shaftoli", weight: 3, value: 8, ratio: 2.67 },
    { id: "limon", name: "🍋 Nordon Limon", weight: 2, value: 4, ratio: 2.0 },
    { id: "bodring", name: "🥒 Yangi Bodring", weight: 1, value: 1, ratio: 1.0 },
  ];

  const ITEMS_ROUND_2: BackpackItem[] = [
    { id: "premium_sweet", name: "🧁 Premium Shirinlik", weight: 8, value: 40, ratio: 5.0 },
    { id: "non_samarqand", name: "🍞 Samarqand Noni", weight: 6, value: 29, ratio: 4.83 },
    { id: "holva_qoqon", name: "🥮 Qo'qon Holvasi", weight: 6, value: 29, ratio: 4.83 },
    { id: "bodom", name: "🥜 Bodom Mag'zi", weight: 5, value: 20, ratio: 4.0 },
    { id: "uzum_husayni", name: "🍇 Husayni Uzumi", weight: 4, value: 15, ratio: 3.75 },
    { id: "pista", name: "🥜 Xandon Pista", weight: 3, value: 10, ratio: 3.33 },
    { id: "bodring_yangi", name: "🥒 Yangi Bodring", weight: 1, value: 2, ratio: 2.0 },
  ];

  const ITEMS_ROUND_3: BackpackItem[] = [
    { id: "somsa", name: "🥟 Go'shtli Somsa", weight: 8, value: 41, ratio: 5.12 },
    { id: "qazi", name: "🥩 Haqiqiy Qazi", weight: 7, value: 35, ratio: 5.0 },
    { id: "asal_tog", name: "🍯 Tog' Asali", weight: 9, value: 45, ratio: 5.0 },
    { id: "halim", name: "🥣 Mazali Halim", weight: 6, value: 27, ratio: 4.5 },
    { id: "kabob", name: "🍢 Gijduvon Kabob", weight: 5, value: 22, ratio: 4.4 },
    { id: "lavash", name: "🌯 Issiq Lavash", weight: 4, value: 17, ratio: 4.25 },
    { id: "shaurma", name: "🥙 Turkcha Shaurma", weight: 3, value: 12, ratio: 4.0 },
    { id: "pirojok", name: "🥯 Issiq Pirojok", weight: 2, value: 7, ratio: 3.5 },
    { id: "non_issiq", name: "🍞 Issiq Non", weight: 1, value: 3, ratio: 3.0 },
  ];

  const ROUNDS_CONFIG = [
    {
      capacity: 10,
      items: ITEMS_ROUND_1,
      optimalValue: 39, // Tog' Asali(3, 15) + Chorsu Yong'og'i(4, 16) + Katta Mayiz(2, 7) + Yangi Bodring(1, 1) = 10kg, value 39
      title: "1-raund: Bozor Xaridi (Greedy muvaffaqiyati)",
      desc: "Zichlikka (qiymat / og'irlik) qarab mahsulotlarni tanlash bu safar optimal yechimga olib keladi. Savat sig'imi 10 kg.",
    },
    {
      capacity: 12,
      items: ITEMS_ROUND_2,
      optimalValue: 58, // Samarqand Noni(6, 29) + Qo'qon Holvasi(6, 29) = 12kg, value 58
      title: "2-raund: Ochko'zlik Tuzog'i (Bozor optimal tanlovi)",
      desc: "Ehtiyot bo'ling! Birinchi ko'rinishda eng katta zichlikka ega bo'lgan buyumni (Premium Shirinlik, 8 kg, 40 ball) tanlash va greedy yondashish sizni chalg'itishi mumkin. Savat sig'imi 12 kg.",
    },
    {
      capacity: 15,
      items: ITEMS_ROUND_3,
      optimalValue: 76, // Go'shtli Somsa(8, 41) + Haqiqiy Qazi(7, 35) = 15kg, value 76
      title: "3-raund: Ekstremal Balans (Murakkab 0/1 Knapsack)",
      desc: "Ushbu hal qiluvchi raundda savat sig'imi 15 kg. Eng optimal kombinatsiyani yig'ish uchun barcha buyumlarning munosabatini chuqur tahlil qiling!",
    }
  ];

  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [roundScores, setRoundScores] = useState<number[]>([0, 0, 0]);
  const [roundChecked, setRoundChecked] = useState<boolean[]>([false, false, false]);
  const [roundLogs, setRoundLogs] = useState<any[]>([]);

  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [roundFeedback, setRoundFeedback] = useState<string>("");
  const [isTaskCompleted, setIsTaskCompleted] = useState<boolean>(false);
  const [startTime] = useState<number>(Date.now());

  // Restore state
  useEffect(() => {
    if (savedState) {
      if (savedState.currentRoundIndex !== undefined) setCurrentRoundIndex(savedState.currentRoundIndex);
      if (savedState.selectedIds) setSelectedIds(savedState.selectedIds);
      if (savedState.roundScores) setRoundScores(savedState.roundScores);
      if (savedState.roundChecked) setRoundChecked(savedState.roundChecked);
      if (savedState.attemptsCount !== undefined) setAttemptsCount(savedState.attemptsCount);
      if (savedState.isTaskCompleted !== undefined) setIsTaskCompleted(savedState.isTaskCompleted);
    }
  }, [savedState]);

  const config = ROUNDS_CONFIG[currentRoundIndex];
  const currentWeight = config.items
    .filter(item => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + item.weight, 0);

  const currentValue = config.items
    .filter(item => selectedIds.includes(item.id))
    .reduce((sum, item) => sum + item.value, 0);

  const isOverweight = currentWeight > config.capacity;

  const handleSelectItem = (id: string) => {
    if (roundChecked[currentRoundIndex]) return;

    playClickSound();
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(item => item !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
    setRoundFeedback("");
  };

  const handleCheckRound = () => {
    if (isOverweight) {
      playIncorrectSound();
      setRoundFeedback(`Savat og'irligi sig'imdan oshib ketdi! Maksimal sig'im: ${config.capacity} kg.`);
      return;
    }

    const nextAttempts = attemptsCount + 1;
    setAttemptsCount(nextAttempts);

    const isOptimal = currentValue === config.optimalValue;

    if (isOptimal) {
      playCorrectSound();
      const score = currentRoundIndex === 2 ? 34 : 33; // sum of scores = 33 + 33 + 34 = 100
      const updatedScores = [...roundScores];
      updatedScores[currentRoundIndex] = score;
      setRoundScores(updatedScores);

      const updatedChecked = [...roundChecked];
      updatedChecked[currentRoundIndex] = true;
      setRoundChecked(updatedChecked);

      // Save round details for log
      setRoundLogs(prev => [
        ...prev,
        {
          round: currentRoundIndex + 1,
          selectedIds,
          weight: currentWeight,
          value: currentValue,
          isOptimal,
          score,
        }
      ]);

      setRoundFeedback(`Mukammal yechim! Siz eng optimal va foyda keltiradigan kombinatsiyani yig'dingiz. Jami foyda: ${currentValue} ball. +${score} ball! 🌟`);
    } else {
      playIncorrectSound();
      const updatedChecked = [...roundChecked];
      updatedChecked[currentRoundIndex] = false; // Block proceed
      setRoundScores(prev => {
        const u = [...prev];
        u[currentRoundIndex] = 0;
        return u;
      });

      setRoundFeedback(`Siz yig'gan to'plam sig'imga to'g'ri keldi, lekin bu optimal yechim emas! (Sizda: ${currentValue} ball, lekin bundan ham kattaroq qiymat yig'ish mumkin). Qaytadan urinib ko'ring.`);
    }
  };

  const handleNextRound = () => {
    setRoundFeedback("");
    setSelectedIds([]);

    if (currentRoundIndex < 2) {
      setCurrentRoundIndex(prev => prev + 1);
    } else {
      handleFinishTask();
    }
  };

  const handleFinishTask = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    const totalTaskScore = Math.max(0, Math.min(100, roundScores[0] + roundScores[1] + roundScores[2]));

    setIsTaskCompleted(true);
    onComplete({
      taskId: "greedy_backpack",
      taskName: "Ryukzak Tanlovi",
      score: totalTaskScore,
      maxScore: 100,
      completed: true,
      attemptsCount,
      hintsUsed: 0,
      timeSpentSeconds: elapsedSeconds,
      feedback: totalTaskScore >= 95
        ? "Ajoyib! Bozor xaridi (0/1 Knapsack) masalasini barcha 3 ta raundda mukammal va optimal yechdingiz!"
        : `Yaxshi natija! Ryukzakdan ${totalTaskScore} ball yig'dingiz. Ochko'zlik (Greedy) tuzoqlarini chetlab o'tishni o'rgandingiz.`,
      details: {
        roundLogs,
        totalWeight: currentWeight,
        totalValue: currentValue,
        isOptimal: totalTaskScore >= 95,
      },
    });
  };

  const weightPercent = Math.min(100, (currentWeight / config.capacity) * 100);

  return (
    <div id="greedy-task-container" className="flex flex-col gap-6 text-slate-100 h-full justify-between">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2 font-mono">
          <Backpack className="w-6 h-6 text-amber-400" /> [ROUND_02: RYUKZAK TANLOVI] (Raund {currentRoundIndex + 1}/3)
        </h2>
        {/* Shartga urg'u attractive style */}
        <div className="mt-3 border-l-4 border-amber-500 bg-slate-900/90 px-4 py-3 rounded-r-xl shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block mb-1">Missiya Sharti:</span>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {config.desc} Tanlangan buyumlarning umumiy og'irligi savat sig'imidan oshmasligi kerak.
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col gap-6 w-full flex-1 my-2">
        {/* Row 1: Backpack Status Monitor */}
        <div className="w-full bg-slate-900/60 p-5 rounded-2xl border border-slate-850 flex flex-col lg:flex-row gap-5 items-center justify-between font-mono">
          {/* Left: Capacity Progress */}
          <div className="flex-1 w-full text-left">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">[XARID MONITORI]</span>
              <div className="text-xs text-slate-300">
                Savat sig'imi: <strong className={isOverweight ? "text-red-400" : "text-amber-400"}>{currentWeight} kg / {config.capacity} kg</strong>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-950 h-4 rounded-full overflow-hidden border border-slate-800 p-0.5 relative">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isOverweight ? "bg-gradient-to-r from-red-600 to-red-500" : currentWeight === config.capacity ? "bg-gradient-to-r from-emerald-600 to-emerald-500" : "bg-gradient-to-r from-amber-500 to-amber-600"
                }`}
                style={{ width: `${weightPercent}%` }}
              />
            </div>
          </div>

          {/* Middle: Total Value & Feedback */}
          <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="bg-slate-950/80 px-5 py-3 rounded-xl border border-slate-800 flex items-center justify-between gap-4 shrink-0">
              <div className="text-left">
                <span className="text-[9px] text-slate-500 block uppercase">JAMI QIYMAT</span>
                <span id="backpack-total-value" className="text-lg font-black text-amber-400">{currentValue} ball</span>
              </div>
              {isOverweight && (
                <span className="text-[9px] text-red-400 bg-red-950/50 px-2.5 py-1 rounded border border-red-900/50 animate-pulse font-bold">
                  ME'YOR OSHDI!
                </span>
              )}
            </div>

            {roundFeedback && (
              <div
                id="backpack-round-feedback"
                className={`px-4 py-2.5 rounded-xl border text-[11px] leading-snug flex-1 lg:max-w-xs ${
                  roundScores[currentRoundIndex] > 0
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                    : "bg-amber-950/20 border-amber-500/30 text-amber-400"
                }`}
              >
                {roundFeedback}
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="w-full lg:w-auto flex gap-2 shrink-0">
            <button
              id="backpack-reset-btn"
              onClick={() => setSelectedIds([])}
              disabled={selectedIds.length === 0 || roundChecked[currentRoundIndex]}
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-250 hover:bg-slate-900 text-xs font-bold rounded-lg disabled:opacity-30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              Tozalash
            </button>

            {!roundChecked[currentRoundIndex] ? (
              <button
                id="backpack-submit-round-btn"
                onClick={handleCheckRound}
                disabled={isOverweight || selectedIds.length === 0}
                className="px-5 py-2.5 rounded-lg font-bold transition-all shadow-md text-xs disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 cursor-pointer"
              >
                SAVATNI TEKSHIRISH
              </button>
            ) : (
              <button
                id="backpack-next-round-btn"
                onClick={handleNextRound}
                className="px-5 py-2.5 rounded-lg font-bold transition-all shadow-md text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-slate-950 cursor-pointer flex items-center gap-1.5"
              >
                {currentRoundIndex < 2 ? "KEYINGI RAUND" : "MISSIYANI YAKUNLASH"} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Items Selection Area */}
        <div className="w-full bg-slate-950/80 rounded-2xl p-5 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.03)] flex flex-col gap-4">
          <h3 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Mahsulotlarni tanlang (Ustiga bosing):</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-[440px] overflow-y-auto pr-1">
            {config.items.map((item) => {
              const isSelected = selectedIds.includes(item.id);

              return (
                <button
                  key={item.id}
                  id={`item-card-${item.id}`}
                  onClick={() => handleSelectItem(item.id)}
                  disabled={roundChecked[currentRoundIndex]}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all select-none text-left min-h-[145px] relative ${
                    isSelected
                      ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-950/25 ring-1 ring-amber-500/30"
                      : "bg-slate-900/40 border-slate-850 hover:bg-slate-850 hover:border-slate-750"
                  } ${roundChecked[currentRoundIndex] ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className={`p-2.5 rounded-lg shrink-0 ${isSelected ? "bg-amber-500/20 text-amber-400" : "bg-slate-800 text-slate-400"}`}>
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-slate-100 truncate pr-2" title={item.name}>{item.name}</span>
                  </div>

                  <div className="w-full flex justify-between items-end mt-2 pt-2 border-t border-slate-900/60">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <span className="text-slate-400">Vazn: <strong className="text-slate-200 font-mono font-bold">{item.weight} kg</strong></span>
                      <span className="text-slate-400">Qiymat: <strong className="text-amber-400 font-mono font-bold">{item.value} ball</strong></span>
                    </div>
                    {item.ratio && (
                      <div className="text-right bg-slate-950/50 px-2.5 py-1.5 rounded border border-slate-800/80 shrink-0">
                        <span className="text-[8px] text-slate-500 block font-mono leading-none mb-0.5">Zichlik</span>
                        <span className="text-xs font-mono font-bold text-slate-300">{item.ratio.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Educational Note */}
      {isTaskCompleted && (
        <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-4 flex gap-3 items-center">
          <Award className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide font-mono">[MUTAXASSIS TAHLILI]</h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              Ochko'zlik (Greedy) algoritmi ba'zan tez natija beradi, lekin 0/1 Knapsack (Ryukzak) kabi murakkab kombinatorik masalalarda xato (optimal bo'lmagan) yechimlarga olib kelishi mumkin. Bunday hollarda dinamik dasturlash yoki to'liq qidiruv usullaridan foydalanish zarur.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

