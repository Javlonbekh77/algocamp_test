import React, { useState, useEffect } from "react";
import { HelpCircle, CheckCircle, AlertTriangle, RefreshCw, Key, Award, ArrowRight } from "lucide-react";
import { playClickSound, playCorrectSound, playTransitionSound } from "../../lib/sound";

interface BinaryTreasureTaskProps {
  sessionId: string;
  onComplete: (result: any) => void;
  savedState?: any;
  onStateChange?: (state: any) => void;
}

export default function BinaryTreasureTask({ onComplete, savedState, onStateChange }: BinaryTreasureTaskProps) {
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(() => savedState?.currentRoundIndex ?? 0); // 0 = Round 1 (1-100, max 7), 1 = Round 2 (1-1000, max 10)
  const [targetNumber, setTargetNumber] = useState<number>(() => savedState?.targetNumber ?? 0);
  const [guesses, setGuesses] = useState<number[]>(() => savedState?.guesses ?? []);
  const [minRange, setMinRange] = useState<number>(() => savedState?.minRange ?? 1);
  const [maxRange, setMaxRange] = useState<number>(() => savedState?.maxRange ?? (savedState?.currentRoundIndex === 1 ? 1000 : 100));
  const [found, setFound] = useState<boolean>(() => savedState?.found ?? false);
  const [gameOver, setGameOver] = useState<boolean>(() => savedState?.gameOver ?? false);
  const [feedback, setFeedback] = useState<string>(() => savedState?.feedback ?? "");
  const [startTime] = useState<number>(Date.now());
  const [roundScores, setRoundScores] = useState<number[]>(() => savedState?.roundScores ?? [0, 0]);
  const [roundChecked, setRoundChecked] = useState<boolean[]>(() => savedState?.roundChecked ?? [false, false]);
  const [manualInputVal, setManualInputVal] = useState<string>("");
  
  // Historical round trackers for final report
  const [roundGuesses, setRoundGuesses] = useState<number[][]>(() => savedState?.roundGuesses ?? [[], []]);
  const [roundTargets, setRoundTargets] = useState<number[]>(() => savedState?.roundTargets ?? [0, 0]);
  const [roundFounds, setRoundFounds] = useState<boolean[]>(() => savedState?.roundFounds ?? [false, false]);

  // Helper to count optimal binary search steps
  const countBinarySearchSteps = (target: number, minVal: number, maxVal: number): number => {
    let low = minVal;
    let high = maxVal;
    let steps = 0;
    while (low <= high) {
      steps++;
      const mid = Math.floor((low + high) / 2);
      if (mid === target) {
        return steps;
      } else if (mid < target) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return steps;
  };

  // Initialize target number only if not restored
  useEffect(() => {
    if (targetNumber === 0) {
      resetRound(currentRoundIndex);
    }
  }, []);

  // Synchronize state changes back to parent
  useEffect(() => {
    if (onStateChange && targetNumber !== 0) {
      onStateChange({
        currentRoundIndex,
        targetNumber,
        guesses,
        minRange,
        maxRange,
        found,
        gameOver,
        feedback,
        roundScores,
        roundChecked,
        roundGuesses,
        roundTargets,
        roundFounds,
      });
    }
  }, [currentRoundIndex, targetNumber, guesses, minRange, maxRange, found, gameOver, feedback, roundScores, roundChecked, roundGuesses, roundTargets, roundFounds]);

  const resetRound = (roundIdx: number) => {
    const maxVal = roundIdx === 0 ? 100 : 1000;
    
    // Find candidate pool of hardest numbers (leaf nodes of the binary search tree)
    const pool: number[] = [];
    for (let i = 1; i <= maxVal; i++) {
      const steps = countBinarySearchSteps(i, 1, maxVal);
      if (roundIdx === 0) {
        // Round 1 hardest are 6 or 7 steps
        if (steps === 6 || steps === 7) pool.push(i);
      } else {
        // Round 2 hardest are 9 or 10 steps
        if (steps === 9 || steps === 10) pool.push(i);
      }
    }
    
    // Pick target from pool
    const target = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : Math.floor(Math.random() * maxVal) + 1;
    
    setTargetNumber(target);
    setGuesses([]);
    setMinRange(1);
    setMaxRange(maxVal);
    setFound(false);
    setGameOver(false);
    setManualInputVal("");
    
    const maxAttempts = roundIdx === 0 ? 7 : 10;
    setFeedback(`Sandiqlardan biriga xazina yashirilgan. Uni ${maxAttempts} urinishda topa olasizmi?`);
  };

  const handleGuess = (val: number) => {
    if (gameOver || found) return;
    if (guesses.includes(val)) return;

    playClickSound();
    const newGuesses = [...guesses, val];
    setGuesses(newGuesses);

    const maxAttempts = currentRoundIndex === 0 ? 7 : 10;

    if (val === targetNumber) {
      playCorrectSound();
      setFound(true);
      setGameOver(true);
      setFeedback(`Tabriklaymiz! G'azina aynan ${val}-sandiqda ekan! Uni ${newGuesses.length} urinishda topdingiz! 🎉`);
      
      // Calculate score for this round
      let score = 0;
      if (currentRoundIndex === 0) {
        if (newGuesses.length <= 4) score = 50;
        else if (newGuesses.length === 5) score = 42;
        else if (newGuesses.length === 6) score = 35;
        else if (newGuesses.length === 7) score = 28;
      } else {
        if (newGuesses.length <= 7) score = 50;
        else if (newGuesses.length === 8) score = 42;
        else if (newGuesses.length === 9) score = 35;
        else if (newGuesses.length === 10) score = 28;
      }
      
      const updatedScores = [...roundScores];
      updatedScores[currentRoundIndex] = score;
      setRoundScores(updatedScores);
      
      const updatedFounds = [...roundFounds];
      updatedFounds[currentRoundIndex] = true;
      setRoundFounds(updatedFounds);
    } else {
      if (val < targetNumber) {
        setMinRange(prev => Math.max(prev, val + 1));
        setFeedback(`G'azina sandig'i ${val} raqamli sandiqdan KATTAROQ raqamli sandiqlar ichida! ⬆️`);
      } else {
        setMaxRange(prev => Math.min(prev, val - 1));
        setFeedback(`G'azina sandig'i ${val} raqamli sandiqdan KICHIKROQ raqamli sandiqlar ichida! ⬇️`);
      }

      if (newGuesses.length >= maxAttempts) {
        setGameOver(true);
        // Do NOT reveal targetNumber to the user as requested
        setFeedback(`Urinishlar tugadi. G'azinani o'z vaqtida topa olmadingiz! Qayta urinib ko'ring. 😢`);
        
        // Calculate partial score
        const totalMax = currentRoundIndex === 0 ? 100 : 1000;
        const currentRangeWidth = Math.max(1, (val < targetNumber ? (maxRange - (val + 1) + 1) : ((val - 1) - minRange + 1)));
        const narrowedRatio = (totalMax - currentRangeWidth) / totalMax;
        const score = Math.max(0, Math.round(narrowedRatio * 15));
        
        const updatedScores = [...roundScores];
        updatedScores[currentRoundIndex] = score;
        setRoundScores(updatedScores);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(manualInputVal);
    if (isNaN(val) || val < 1 || val > (currentRoundIndex === 0 ? 100 : 1000)) return;
    handleGuess(val);
    setManualInputVal("");
  };

  const resetGame = () => {
    resetRound(currentRoundIndex);
  };

  const handleNextRound = () => {
    playTransitionSound();
    
    // Save Round 1 status
    const updatedGuesses = [...roundGuesses];
    updatedGuesses[0] = guesses;
    setRoundGuesses(updatedGuesses);
    
    const updatedTargets = [...roundTargets];
    updatedTargets[0] = targetNumber;
    setRoundTargets(updatedTargets);
    
    // Set Round 1 checked
    const updatedChecked = [...roundChecked];
    updatedChecked[0] = true;
    setRoundChecked(updatedChecked);

    // Transition to Round 2
    setCurrentRoundIndex(1);
    resetRound(1);
  };

  const handleFinish = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    
    // Combined round answers
    const finalScore = Math.max(0, Math.min(100, roundScores[0] + roundScores[1]));
    
    let combinedFeedback = "";
    if (roundFounds[0] && roundFounds[1]) {
      combinedFeedback = `Ajoyib! Ikkala raundda ham xazinani muvaffaqiyatli topdingiz! (Round 1: ${roundScores[0]} ball, Round 2: ${roundScores[1]} ball). Ikkilik qidiruv (Binary Search) strategiyasini a'lo darajada qo'lladingiz!`;
    } else if (roundFounds[0] || roundFounds[1]) {
      combinedFeedback = `Yaxshi natija! Raundlardan birida xazinani topdingiz! (Round 1: ${roundScores[0]} ball, Round 2: ${roundScores[1]} ball).`;
    } else {
      combinedFeedback = `Raundlarda xazinalar topilmadi, lekin qidiruv diapazonini sezilarli darajada kichraytirdingiz. (Sizning balingiz: ${finalScore} ball).`;
    }

    onComplete({
      taskId: "binary_treasure",
      taskName: "Xazina Sandiqlari",
      score: finalScore,
      maxScore: 100,
      completed: true,
      attemptsCount: roundGuesses[0].length + guesses.length,
      hintsUsed: 0,
      timeSpentSeconds: elapsedSeconds,
      feedback: combinedFeedback,
      details: {
        roundScores,
        roundFounds,
        foundRound1: roundFounds[0],
        foundRound2: found,
        guessesRound1: roundGuesses[0],
        guessesRound2: guesses,
        targetRound1: roundTargets[0],
        targetRound2: targetNumber
      }
    });
  };

  // Helper to get ALL chests so nothing ever disappears!
  const getRenderedChests = () => {
    const list: number[] = [];
    const maxVal = currentRoundIndex === 0 ? 100 : 1000;
    for (let i = 1; i <= maxVal; i++) {
      list.push(i);
    }
    return list;
  };

  const limitAttempts = currentRoundIndex === 0 ? 7 : 10;
  const maxNumber = currentRoundIndex === 0 ? 100 : 1000;

  return (
    <div id="binary-task-container" className="flex flex-col gap-6 text-slate-100 h-full justify-between">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2 font-mono">
            <Key className="w-6 h-6 text-amber-400" /> [ROUND_03: XAZINA SANDIQLARI]
          </h2>
          <div className="flex gap-2 font-mono">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${currentRoundIndex === 0 ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
              1-Raund (1-100)
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${currentRoundIndex === 1 ? "bg-amber-500/20 border-amber-500 text-amber-400 animate-pulse" : "bg-slate-900 border-slate-800 text-slate-500"}`}>
              2-Raund (1-1000)
            </span>
          </div>
        </div>

        {/* Dynamic Mission Box */}
        <div className="mt-3 border-l-4 border-amber-500 bg-slate-900/90 px-4 py-3 rounded-r-xl shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block mb-1">
            {currentRoundIndex === 0 ? "1-Raund Missiyasi" : "2-Raund Missiyasi"}:
          </span>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            {currentRoundIndex === 0 ? (
              <>Sizning oldingizda <strong className="text-amber-400">1 dan 100 gacha</strong> raqamlangan sandiqlar turibdi. Ulardan faqat bittasiga xazina kaliti yashirilgan. Uni maksimal <strong className="text-amber-400">7 ta urinishda</strong> ochishingiz kerak! Tizim har bir xato urinish uchun yo'nalish ko'rsatadi.</>
            ) : (
              <>Oldingizda endi ancha kattaroq <strong className="text-amber-400">1 dan 1000 gacha</strong> raqamlangan sandiqlar maydoni bor! Uni maksimal <strong className="text-amber-400">10 ta urinishda</strong> ochishingiz lozim! Oraliqni kichraytirish mantiqini ishlating.</>
            )}
          </p>
        </div>
      </div>

      {/* Main Arena Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1 my-2">
        {/* Left: Interactive Field */}
        <div className="md:col-span-8 bg-slate-950/80 rounded-xl p-5 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.03)] flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4 font-mono">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Sandiqlar maydoni (1 - {maxNumber})
              </span>
              <div id="search-range" className="text-xs bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg text-amber-400 font-bold">
                Urinishlar: {guesses.length}/{limitAttempts}
              </div>
            </div>

            {/* Round 2 Visual Range Timeline */}
            {currentRoundIndex === 1 && (
              <div className="mb-6 bg-slate-900/80 p-5 rounded-xl border border-slate-800 flex flex-col gap-4">
                {/* Visual indicator explaining why they need to input numbers */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs leading-relaxed text-amber-300">
                  <span className="font-extrabold uppercase tracking-wider block mb-1">📢 MUHIM TUSHUNTIRISH:</span>
                  Ushbu raundda sandiqlar soni juda ko'p (<strong className="text-white">1000 ta</strong>). Ularni birma-bir bosib qidirish noqulay va sekin. Shuning uchun, <strong className="text-white">quyidagi maydonga sandiq raqamini yozib</strong> "OCHISH" tugmasini bosing. Bu sizga qidiruv sohasini soniyalar ichida optimal tarzda toraytirish imkonini beradi!
                </div>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Sandiq #1</span>
                  <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">Aktiv qidiruv sohasi: [{minRange} - {maxRange}]</span>
                  <span>Sandiq #1000</span>
                </div>
                <div className="h-4 bg-slate-950 rounded-full overflow-hidden border border-slate-850 relative flex">
                  {/* Left disqualified segment */}
                  <div 
                    className="h-full bg-red-950/40 border-r border-red-500/20 transition-all duration-300" 
                    style={{ width: `${((minRange - 1) / 1000) * 100}%` }}
                  />
                  {/* Active segment */}
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 transition-all duration-300 relative flex justify-center items-center" 
                    style={{ width: `${((maxRange - minRange + 1) / 1000) * 100}%` }}
                  >
                    <div className="absolute inset-0 bg-amber-400/5 animate-pulse" />
                  </div>
                  {/* Right disqualified segment */}
                  <div 
                    className="h-full bg-red-950/40 border-l border-red-500/20 transition-all duration-300" 
                    style={{ width: `${((1000 - maxRange) / 1000) * 100}%` }}
                  />
                </div>
                
                {/* Manual text input for quick guessing in 1-1000 */}
                <form onSubmit={handleManualSubmit} className="mt-2 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={manualInputVal}
                      onChange={(e) => setManualInputVal(e.target.value)}
                      disabled={gameOver || found}
                      placeholder={`Sandiq raqamini yozing (${minRange} - ${maxRange} tavsiya etiladi)`}
                      className="w-full px-4 py-3 bg-slate-950 text-slate-100 text-sm rounded-lg border-2 border-slate-800 focus:border-amber-500 focus:outline-none font-mono placeholder:text-slate-600 transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={gameOver || found || !manualInputVal}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 text-sm font-extrabold rounded-lg font-mono transition-all uppercase cursor-pointer shadow-lg shadow-amber-500/10"
                  >
                    Ochish
                  </button>
                </form>
              </div>
            )}

            {/* Active grid of chests */}
            <div className="text-[10px] text-slate-500 font-mono mb-2">
              {currentRoundIndex === 0 
                ? "Sandiq ustiga bosib taxmin qiling (barcha sandiqlar doim faol):" 
                : "Barcha 1000 ta sandiqlar ro'yxati (istalgan birini bosishingiz yoki yuqorida yozishingiz mumkin):"}
            </div>
            
            <div className={`${currentRoundIndex === 1 ? "max-h-[220px] overflow-y-auto pr-1 border border-slate-900 p-3 rounded-xl bg-slate-950/50" : ""}`}>
              <div className={`grid ${currentRoundIndex === 0 ? "grid-cols-10" : "grid-cols-8 sm:grid-cols-10 md:grid-cols-12"} gap-1.5`}>
                {getRenderedChests().map((num) => {
                  const isGuessed = guesses.includes(num);
                  const isTarget = num === targetNumber;

                  let bgClass = "bg-slate-900 border-amber-500/30 hover:border-amber-500 hover:text-white text-slate-200 shadow-[0_0_10px_rgba(245,158,11,0.02)]";
                  let textClass = "font-mono font-bold text-[10px] sm:text-xs";
                  let disabledState = isGuessed || gameOver || found;

                  if (isGuessed) {
                    if (isTarget && found) {
                      bgClass = "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/20";
                    } else {
                      bgClass = "bg-slate-850 text-slate-600 border-slate-900 opacity-40";
                    }
                  }

                  return (
                    <button
                      key={num}
                      id={`chest-cell-${num}`}
                      onClick={() => handleGuess(num)}
                      disabled={disabledState}
                      className={`aspect-square rounded flex items-center justify-center transition-all ${bgClass} ${textClass} hover:scale-105 active:scale-95 cursor-pointer`}
                    >
                      {isGuessed && isTarget && found ? "💎" : num}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-5 justify-end items-center">
            <button
              id="binary-restart-btn"
              onClick={resetGame}
              className="text-[11px] text-slate-400 hover:text-slate-200 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors bg-slate-900/40 font-mono cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Qaytadan boshlash
            </button>
          </div>
        </div>

        {/* Right: Feedback */}
        <div className="md:col-span-4 flex flex-col justify-between gap-4 bg-slate-950/40 rounded-xl p-5 border border-slate-900">
          <div className="flex flex-col gap-4">
            {/* Analyzer monitor */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 font-mono">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2">[ANALIZATOR MATNITSA]</span>
              <div className="text-xs text-slate-400 space-y-1.5">
                <p>Joriy raund: <span className="text-amber-400 font-bold">#0{currentRoundIndex + 1}</span></p>
                <p>Raund ball: <span className="text-amber-400 font-bold">{roundScores[currentRoundIndex]} ball</span></p>
                <p>Oxirgi tanlov: <span className="text-amber-300">{guesses.length > 0 ? guesses[guesses.length - 1] : "N/A"}</span></p>
              </div>
            </div>

            {/* Game feedback */}
            <div
              id="binary-feedback"
              className={`p-4 rounded-lg border flex gap-3 text-xs leading-relaxed ${
                found
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                  : gameOver
                  ? "bg-red-950/20 border-red-500/30 text-red-300"
                  : "bg-slate-900 border-slate-800 text-slate-200"
              }`}
            >
              {found ? (
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : gameOver ? (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              ) : (
                <Key className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="font-mono">{feedback}</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4">
            {currentRoundIndex === 0 && (gameOver || found) ? (
              <button
                id="binary-next-btn"
                onClick={handleNextRound}
                className="w-full py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-450 hover:to-cyan-550 text-slate-950 font-mono cursor-pointer"
              >
                2-RAUNDGA O'TISH <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="binary-finish-btn"
                onClick={handleFinish}
                disabled={currentRoundIndex === 0 ? (!gameOver && !found) : (!gameOver && !found)}
                className="w-full py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 font-mono cursor-pointer"
              >
                MISSIYANI YAKUNLASH
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Educational Note */}
      {(gameOver || found) && (
        <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-4 flex gap-3 items-center">
          <Award className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide font-mono">[MUTAXASSIS TAHLILI]</h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-mono">
              Ikkilik qidiruv (Binary Search) algoritmi o'rtadagi qiymatni tanlash orqali har qadamda qidiruv sohasini roppa-rosa 50% ga kamaytiradi. Shu sababli, 100 ta sandiqdan birini maksimal log2(100) ≈ 7 urinishda, 1000 ta sandiqdan birini esa maksimal log2(1000) ≈ 10 urinishda kafolatlangan holda topish mumkin!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
