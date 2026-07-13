import React, { useState, useEffect } from "react";
import { getFeedbackAndScore } from "../../lib/scoring";
import { Search, ChevronRight, Award, Lock, ShieldAlert, CheckCircle, AlertTriangle } from "lucide-react";

interface PrimeDetectiveTaskProps {
  sessionId: string;
  onComplete: (result: any) => void;
  savedState?: any;
  onStateChange?: (state: any) => void;
}

interface QueryHistory {
  divisor: number;
  isDivisible: boolean;
}

interface RoundConfig {
  number: number;
  isPrime: boolean;
  factors: number[];
  title: string;
}

export default function PrimeDetectiveTask({ onComplete, savedState, onStateChange }: PrimeDetectiveTaskProps) {
  // Harder target configurations
  const ROUND_CONFIGS: RoundConfig[] = [
    { number: 437, isPrime: false, factors: [19, 23], title: "1-raund: Sirli son" }, // 437 = 19 * 23
    { number: 607, isPrime: true, factors: [], title: "2-raund: Haqiqiy qulf" },  // 607 is prime
  ];

  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(0);
  const [queriesHistory, setQueriesHistory] = useState<QueryHistory[][]>([[], []]);
  const [currentDivisorInput, setCurrentDivisorInput] = useState<string>("");
  const [roundDecisions, setRoundDecisions] = useState<("Tub" | "Tub emas" | null)[]>([null, null]);
  const [userBonusFactors, setUserBonusFactors] = useState<string[]>(["", ""]);
  const [roundChecked, setRoundChecked] = useState<boolean[]>([false, false]);
  const [roundCorrect, setRoundCorrect] = useState<boolean[]>([false, false]);

  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("Ushbu sirli sonni bo'linishga so'rov berib tekshiring!");
  const [isTaskCompleted, setIsTaskCompleted] = useState<boolean>(false);
  const [startTime] = useState<number>(Date.now());

  // Restore state
  const hasLoadedRef = React.useRef(false);
  useEffect(() => {
    if (savedState && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      if (savedState.currentRoundIndex !== undefined) setCurrentRoundIndex(savedState.currentRoundIndex);
      if (savedState.queriesHistory) setQueriesHistory(savedState.queriesHistory);
      if (savedState.roundDecisions) setRoundDecisions(savedState.roundDecisions);
      if (savedState.userBonusFactors) setUserBonusFactors(savedState.userBonusFactors);
      if (savedState.roundChecked) setRoundChecked(savedState.roundChecked);
      if (savedState.roundCorrect) setRoundCorrect(savedState.roundCorrect);
      if (savedState.attemptsCount !== undefined) setAttemptsCount(savedState.attemptsCount);
      if (savedState.isTaskCompleted !== undefined) setIsTaskCompleted(savedState.isTaskCompleted);
      if (savedState.feedback) setFeedback(savedState.feedback);
    }
  }, [savedState]);

  // Synchronize state changes back to parent
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        currentRoundIndex,
        queriesHistory,
        roundDecisions,
        userBonusFactors,
        roundChecked,
        roundCorrect,
        attemptsCount,
        isTaskCompleted,
        feedback,
      });
    }
  }, [currentRoundIndex, queriesHistory, roundDecisions, userBonusFactors, roundChecked, roundCorrect, attemptsCount, isTaskCompleted, feedback]);

  const config = ROUND_CONFIGS[currentRoundIndex];
  const currentHistory = queriesHistory[currentRoundIndex];
  const currentDecision = roundDecisions[currentRoundIndex];
  const checked = roundChecked[currentRoundIndex];

  const handleAskQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (checked) return;

    const div = parseInt(currentDivisorInput);
    if (isNaN(div) || div <= 1 || div >= config.number) {
      setFeedback(`Iltimos, 1 dan katta va ${config.number} dan kichik butun son kiriting.`);
      return;
    }

    if (currentHistory.some(h => h.divisor === div)) {
      setFeedback(`Ushbu songa (${div}) bo'linishni allaqachon tekshirdingiz!`);
      return;
    }

    const isDivisible = config.number % div === 0;
    const newQuery: QueryHistory = { divisor: div, isDivisible };

    const updatedHistories = [...queriesHistory];
    updatedHistories[currentRoundIndex] = [...currentHistory, newQuery];
    setQueriesHistory(updatedHistories);

    setCurrentDivisorInput("");

    if (isDivisible) {
      setFeedback(`Ha! ${config.number} soni ${div} ga qoldiqsiz bo'linadi. ✅`);
    } else {
      setFeedback(`Yo'q! ${config.number} soni ${div} ga bo'linmaydi. ❌`);
    }
  };

  const handleMakeDecision = (decision: "Tub" | "Tub emas") => {
    if (checked) return;
    const updatedDecisions = [...roundDecisions];
    updatedDecisions[currentRoundIndex] = decision;
    setRoundDecisions(updatedDecisions);
  };

  const handleBonusFactorChange = (val: string) => {
    if (checked) return;
    const updatedFactors = [...userBonusFactors];
    updatedFactors[currentRoundIndex] = val;
    setUserBonusFactors(updatedFactors);
  };

  const handleCheckRound = () => {
    if (!currentDecision) {
      setFeedback("Iltimos, avval sonning turini (Tub yoki Tub emas) tanlang!");
      return;
    }

    setAttemptsCount(prev => prev + 1);

    const isAnswerCorrect = (currentDecision === "Tub" && config.isPrime) || (currentDecision === "Tub emas" && !config.isPrime);
    
    // Check if user specified a valid divisor for composite
    let userFoundFactor = false;
    if (currentDecision === "Tub emas") {
      const parsedFactor = parseInt(userBonusFactors[currentRoundIndex]);
      if (!isNaN(parsedFactor) && parsedFactor > 1 && parsedFactor < config.number && config.number % parsedFactor === 0) {
        userFoundFactor = true;
      }
    }

    const updatedCorrect = [...roundCorrect];
    updatedCorrect[currentRoundIndex] = isAnswerCorrect;
    setRoundCorrect(updatedCorrect);

    const updatedChecked = [...roundChecked];
    updatedChecked[currentRoundIndex] = true;
    setRoundChecked(updatedChecked);

    if (isAnswerCorrect) {
      if (currentDecision === "Tub emas" && userFoundFactor) {
        setFeedback(`To'g'ri! ${config.number} - tub emas son va uning bo'luvchisini to'g'ri topdingiz (Bo'luvchi: ${userBonusFactors[currentRoundIndex]}). Bonus +20 ball! 🌟`);
      } else if (currentDecision === "Tub emas") {
        setFeedback(`To'g'ri! ${config.number} - tub emas. Biroq uning bo'luvchisini topa olmadingiz.`);
      } else {
        setFeedback(`To'g'ri! ${config.number} haqiqatan ham tub son! Uni isbotlash uchun faqat ildizigacha (${Math.floor(Math.sqrt(config.number))}) bo'lgan sonlarni tekshirish yetarli edi. ⭐`);
      }
    } else {
      setFeedback(`Afsuski, xato xulosa! ${config.number} aslida ${config.isPrime ? "tub" : "tub emas"} son edi.`);
    }
  };

  const handleNextRound = () => {
    setFeedback("Ushbu sirli sonni bo'linishga so'rov berib tekshiring!");
    if (currentRoundIndex < 1) {
      setCurrentRoundIndex(prev => prev + 1);
    } else {
      handleFinishTask();
    }
  };

  const handleFinishTask = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    // Score calculations
    // Evaluate Round 1 (Max 50 points)
    const r1Correct = roundCorrect[0];
    const r1Queries = queriesHistory[0].length;
    let r1Score = 0;
    if (r1Correct) {
      r1Score = 30; // base for correct
      // query efficiency
      if (r1Queries >= 1 && r1Queries <= 5) r1Score += 10;
      else if (r1Queries >= 6 && r1Queries <= 10) r1Score += 6;
      else if (r1Queries >= 11 && r1Queries <= 15) r1Score += 2;

      // composite bonus factor
      const parsedFactor = parseInt(userBonusFactors[0]);
      if (!isNaN(parsedFactor) && parsedFactor > 1 && parsedFactor < 437 && 437 % parsedFactor === 0) {
        r1Score += 10; // bonus
      }
    } else {
      r1Score = 10; // small consolation for checking queries
    }

    // Evaluate Round 2 (Max 50 points)
    const r2Correct = roundCorrect[1];
    const r2Queries = queriesHistory[1].length;
    let r2Score = 0;
    if (r2Correct) {
      r2Score = 35; // base for correct harder prime
      if (r2Queries >= 1 && r2Queries <= 10) r2Score += 15;
      else if (r2Queries >= 11 && r2Queries <= 18) r2Score += 8;
      else if (r2Queries >= 19 && r2Queries <= 25) r2Score += 3;
    } else {
      r2Score = 10;
    }

    const totalTaskScore = Math.max(0, Math.min(100, r1Score + r2Score));

    setIsTaskCompleted(true);
    onComplete({
      taskId: "prime_detective",
      taskName: "Tub Son Detektivi",
      score: totalTaskScore,
      maxScore: 100,
      completed: true,
      attemptsCount,
      hintsUsed: 0,
      timeSpentSeconds: elapsedSeconds,
      feedback: totalTaskScore >= 80
        ? "Yuksak professional detektiv ish! Tub sonlarni tekshirish bo'yicha eng samarali yo'lni topdingiz!"
        : `Tub son detektivi missiyasidan ${totalTaskScore} ball yig'dingiz. Tajribani oshirishda davom eting!`,
      details: {
        roundLogs: [
          { round: 1, queries: r1Queries, correct: r1Correct, score: r1Score },
          { round: 2, queries: r2Queries, correct: r2Correct, score: r2Score },
        ],
        correct: r1Correct && r2Correct,
        queriesUsed: r1Queries + r2Queries,
      },
    });
  };

  return (
    <div id="prime-task-container" className="flex flex-col gap-6 text-slate-100 h-full justify-between animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2 font-mono">
          <Search className="w-6 h-6 text-amber-400" /> [ROUND_06: TUB SON DETEKTIVI] (Raund {currentRoundIndex + 1}/2)
        </h2>
        {/* Shartga urg'u attractive style */}
        <div className="mt-3 border-l-4 border-amber-500 bg-slate-900/90 px-4 py-3 rounded-r-xl shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block mb-1">Missiya Sharti:</span>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Siz matematik detektivsiz. Quyidagi katta sirli sonning <strong className="text-amber-400">tub (prime)</strong> yoki <strong className="text-amber-400">tub emas (composite)</strong> ekanini eng kam so'rov berish orqali fosh qiling!
          </p>
        </div>
      </div>

      {/* Main Sandbox Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1 my-2">
        {/* Left: Interactive safe locking evidence */}
        <div className="md:col-span-7 bg-slate-950/80 rounded-xl p-5 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.03)] flex flex-col justify-between">
          <div className="flex flex-col gap-5">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">Xavfsiz qulf tekshiruvi</span>
            
            {/* Locked Safe Board */}
            <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-900/40 rounded-xl border border-slate-850 p-5">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border-2 border-slate-800 flex flex-col items-center justify-center shadow-lg relative shrink-0">
                <div className="absolute top-1.5 right-1.5">
                  {checked ? <Lock className="w-3.5 h-3.5 text-emerald-400 font-mono" /> : <ShieldAlert className="w-3.5 h-3.5 text-amber-500 animate-pulse font-mono" />}
                </div>
                <span className="text-[9px] text-slate-500 font-mono font-bold tracking-wider">TARGET</span>
                <span id="prime-target-number" className="text-3xl font-black font-mono text-amber-400 mt-1">{config.number}</span>
              </div>

              {/* Form Input queries */}
              <div className="flex-1 w-full font-mono">
                <form id="divisor-query-form" onSubmit={handleAskQuery} className="flex flex-col gap-3">
                  <label className="text-[11px] text-slate-400 font-bold uppercase">Bo'linish so'rovi (Modulus Query):</label>
                  <div className="flex gap-2">
                    <input
                      id="divisor-input"
                      type="number"
                      min="2"
                      max={config.number - 1}
                      placeholder="Bo'luvchini kiriting..."
                      value={currentDivisorInput}
                      onChange={(e) => setCurrentDivisorInput(e.target.value)}
                      disabled={checked}
                      className="flex-1 px-3 py-2 rounded bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      id="divisor-submit-btn"
                      type="submit"
                      disabled={checked || !currentDivisorInput}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-450 disabled:bg-slate-900 disabled:text-slate-600 text-slate-950 font-bold rounded text-xs transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" /> So'rash
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Decision panel */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-850 flex flex-col gap-3 font-mono">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Yakuniy qaror tugmasi:</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  id="decision-prime-btn"
                  onClick={() => handleMakeDecision("Tub")}
                  disabled={checked}
                  className={`py-3 rounded border font-bold text-xs transition-all cursor-pointer ${
                    currentDecision === "Tub"
                      ? "bg-amber-500/10 border-amber-500 text-amber-300"
                      : "bg-slate-950 border-slate-900 text-slate-500 hover:bg-slate-900"
                  }`}
                >
                  Tub (Prime)
                </button>
                <button
                  id="decision-composite-btn"
                  onClick={() => handleMakeDecision("Tub emas")}
                  disabled={checked}
                  className={`py-3 rounded border font-bold text-xs transition-all cursor-pointer ${
                    currentDecision === "Tub emas"
                      ? "bg-amber-500/10 border-amber-500 text-amber-300"
                      : "bg-slate-950 border-slate-900 text-slate-500 hover:bg-slate-900"
                  }`}
                >
                  Tub emas (Composite)
                </button>
              </div>

              {/* Bonus input for composite */}
              {currentDecision === "Tub emas" && (
                <div className="mt-2 animate-fadeIn flex flex-col gap-2">
                  <label className="text-[10px] text-amber-500 font-bold uppercase">Bitta aniq bo'luvchini ko'rsating (Bonus +10 ball):</label>
                  <input
                    id="bonus-divisor-input"
                    type="number"
                    placeholder="Masalan: 19"
                    value={userBonusFactors[currentRoundIndex]}
                    onChange={(e) => handleBonusFactorChange(e.target.value)}
                    disabled={checked}
                    className="px-3 py-1.5 rounded bg-slate-950 border border-slate-850 text-xs text-amber-300 focus:outline-none focus:border-amber-500 font-mono w-48"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-mono mt-4">
            Skaner so'rovlari: <strong className="text-amber-400">{currentHistory.length} marta</strong> (Kam urinish = Yuqori ball)
          </div>
        </div>

        {/* Right Side: Queries History List, Scores */}
        <div className="md:col-span-5 flex flex-col justify-between gap-4 bg-slate-950/40 rounded-xl p-5 border border-slate-900">
          <div className="flex flex-col gap-4 font-mono">
            {/* History Table */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-2 font-mono">[LOG: SO'ROVLAR REESTRI]</span>
              {currentHistory.length === 0 ? (
                <p className="text-[10px] text-slate-600 italic py-4 text-center">Hali so'rovlar qilinmadi. 2 yoki 3 kabi butun sonlardan boshlang.</p>
              ) : (
                <div className="max-h-[120px] overflow-y-auto pr-1">
                  <table className="w-full text-[11px] text-left text-slate-300">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="pb-1.5 font-mono">Bo'luvchi (d)</th>
                        <th className="pb-1.5 text-right font-mono">Javob</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {currentHistory.map((h, idx) => (
                        <tr key={idx} className="border-b border-slate-850/50">
                          <td className="py-1">{h.divisor}</td>
                          <td className={`py-1 text-right font-bold ${h.isDivisible ? "text-emerald-400" : "text-slate-600"}`}>
                            {h.isDivisible ? "Ha, bo'linadi" : "Yo'q, bo'linmaydi"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Evidence prompt live feedback */}
            <div
              id="prime-feedback"
              className={`p-3.5 rounded-lg border text-xs leading-relaxed ${
                checked
                  ? roundCorrect[currentRoundIndex]
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                    : "bg-red-950/20 border-red-500/30 text-red-400"
                  : "bg-slate-900 border-slate-850 text-slate-300"
              }`}
            >
              {feedback}
            </div>
          </div>

          {/* Action check button */}
          <div className="mt-4 font-mono">
            {!checked ? (
              <button
                id="prime-submit-round-btn"
                onClick={handleCheckRound}
                disabled={!currentDecision}
                className="w-full py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 cursor-pointer"
              >
                QULFLI SONNI TEKSHIRISH
              </button>
            ) : (
              <button
                id="prime-next-round-btn"
                onClick={handleNextRound}
                className="w-full py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-slate-950 cursor-pointer"
              >
                {currentRoundIndex < 1 ? "KEYINGI RAUND" : "MISSIYANI YAKUNLASH"} <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Educational Note */}
      {isTaskCompleted && (
        <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-4 flex gap-3 items-center">
          <Award className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide font-mono">[MUTAXASSIS TAHLILI]</h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-mono">
              Son tub ekanini tekshirish uchun uning kvadrat ildizigacha (<span className="text-emerald-400 font-bold font-mono">√N</span>) bo'lgan sonlarga tekshirish kifoya. Masalan, 437 uchun ildiz <span className="text-amber-500">20.9</span>, ya'ni faqat 2, 3, 5, 7, 11, 13, 17, 19 sonlarigacha bo'lgan tub sonlarni tekshirish yetarli! Bu algoritmik tekshiruvlarni keskin tezlashtiradi!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
