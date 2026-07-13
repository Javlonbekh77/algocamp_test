import React, { useState, useEffect } from "react";
import { getFeedbackAndScore } from "../../lib/scoring";
import { Key, Lock, Unlock, HelpCircle, RefreshCw, CheckCircle, AlertTriangle, ArrowRight, BookOpen } from "lucide-react";

interface CaesarCipherTaskProps {
  sessionId: string;
  onComplete: (result: any) => void;
  savedState?: any;
  onStateChange?: (state: any) => void;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}

// English alphabet A-Z
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Clean and normalize name to standard English uppercase letters only
export function sanitizeName(name: string): string {
  if (!name) return "TEST USER";
  return name
    .toUpperCase()
    .replace(/G['`’‘"']/g, "G")
    .replace(/O['`’‘"']/g, "O")
    .replace(/SH/g, "SH")
    .replace(/CH/g, "CH")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^A-Z\s]/g, "") // allow only A-Z and spaces
    .replace(/\s+/g, " ") // normalize spacing
    .trim();
}

// Caesar Cipher Shift function (supports both encoding and decoding)
export function caesarShift(text: string, shift: number): string {
  const s = (shift % 26 + 26) % 26;
  return text
    .toUpperCase()
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      if (code >= 65 && code <= 90) {
        return String.fromCharCode(((code - 65 + s) % 26) + 65);
      }
      return char; // keep spaces/punctuation intact
    })
    .join("");
}

export default function CaesarCipherTask({
  sessionId,
  onComplete,
  savedState,
  onStateChange,
  firstName = "Algoritm",
  lastName = "Dasturchi",
  fullName = "ALGORITM DASTURCHI",
}: CaesarCipherTaskProps) {
  
  // 1. Sanitize the target name
  const targetName = sanitizeName(fullName);

  // 2. Setup randomized but stable shift and hint word
  // We want to ensure shift is not 0
  const [shiftKey, setShiftKey] = useState<number>(5);
  const [hintWordDecrypted] = useState<string>("ALGORITM");
  const [hintWordEncrypted, setHintWordEncrypted] = useState<string>("");
  const [encryptedName, setEncryptedName] = useState<string>("");

  // UI state
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [isTaskCompleted, setIsTaskCompleted] = useState<boolean>(false);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [startTime] = useState<number>(Date.now());

  // Generate encryption once we have shiftKey and targetName
  useEffect(() => {
    // Generate a random shift key on initial load (stable for the session)
    // We use a pseudo-random hash of the sessionId to keep it stable but different for users
    let hash = 0;
    for (let i = 0; i < sessionId.length; i++) {
      hash = sessionId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const finalShift = Math.abs(hash % 23) + 2; // Shift between 2 and 24
    setShiftKey(finalShift);
    
    const encName = caesarShift(targetName, finalShift);
    setEncryptedName(encName);

    const encHint = caesarShift(hintWordDecrypted, finalShift);
    setHintWordEncrypted(encHint);
  }, [sessionId, targetName, hintWordDecrypted]);

  // Restore saved state if available
  const hasLoadedRef = React.useRef(false);
  useEffect(() => {
    if (savedState && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      if (savedState.userAnswer !== undefined) setUserAnswer(savedState.userAnswer);
      if (savedState.attemptsCount !== undefined) setAttemptsCount(savedState.attemptsCount);
      if (savedState.isTaskCompleted !== undefined) setIsTaskCompleted(savedState.isTaskCompleted);
      if (savedState.feedback !== undefined) setFeedback(savedState.feedback);
    }
  }, [savedState]);

  // Synchronize state with parent challenge page
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        userAnswer,
        attemptsCount,
        hintsUsed: 0,
        isTaskCompleted,
        solved: isTaskCompleted,
        progressPercentage: isTaskCompleted ? 100 : (sanitizeName(userAnswer) === targetName ? 90 : 0)
      });
    }
  }, [userAnswer, attemptsCount, isTaskCompleted]);

  // Submit Answer validation
  const handleCheckAnswer = () => {
    if (!userAnswer.trim()) {
      setFeedback("Iltimos, avval deshifrlangan matnni kiriting.");
      return;
    }

    setAttemptsCount((prev) => prev + 1);

    const cleanUserAnswer = sanitizeName(userAnswer);
    const isCorrect = cleanUserAnswer === targetName;

    if (isCorrect) {
      setIsTaskCompleted(true);
      setFeedback(`Ajoyib! Matn muvaffaqiyatli deshifrlashdi: "${targetName}". Ball topshirish uchun tugmani bosing! ✨`);
    } else {
      setFeedback(`Kiritilgan matn noto'g'ri. Berilgan yordamchi o'zgarishdan foydalanib qayta urining.`);
    }
  };

  const handleFinishTask = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    const finalResult = getFeedbackAndScore("caesar_cipher", {
      attemptsCount,
      hintsUsed: 0,
      timeSpentSeconds: elapsedSeconds,
      details: { solved: true },
    });

    onComplete({
      taskId: "caesar_cipher",
      taskName: "Sirli Maktub",
      score: finalResult.score,
      maxScore: 100,
      completed: true,
      attemptsCount,
      hintsUsed: 0,
      timeSpentSeconds: elapsedSeconds,
      feedback: finalResult.feedback,
      details: {
        solved: true,
        shiftKey,
        userAnswer,
        attemptsCount,
        hintsUsed: 0,
        timeSpentSeconds: elapsedSeconds,
      },
    });
  };

  return (
    <div id="caesar-task-container" className="flex flex-col gap-6 text-slate-100 h-full justify-between">
      {/* Task Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2 font-mono">
          <Key className="w-6 h-6 text-amber-400" /> [ROUND_07: SHIFRLANGAN MATN]
        </h2>
        <div className="mt-3 border-l-4 border-amber-500 bg-slate-900/90 px-4 py-3 rounded-r-xl shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block mb-1">Topshiriq:</span>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Berilgan shifrlangan matnni deshifrlang. Kalitni aniqlash uchun quyidagi yordamchi o'zgarishdan foydalaning: <strong className="text-cyan-400">"{hintWordDecrypted}" &rarr; "{hintWordEncrypted}"</strong>.
          </p>
        </div>
      </div>

      {/* Main Game Interface */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1 my-2">
        
        {/* Left column: Letter visual and Decryption workspace */}
        <div className="md:col-span-7 flex flex-col gap-5 bg-slate-950/80 rounded-xl p-5 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.03)] pb-8">
          
          {/* Locked Letter Box */}
          <div className="bg-slate-900/70 rounded-xl p-6 border border-slate-800 relative overflow-hidden">
            <div className="absolute top-2 right-3 font-mono text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              {isTaskCompleted ? "Deshifrlangan" : "Shifrlangan matn"}
            </div>
            
            <div className="flex gap-4 items-start">
              <div className={`p-3 rounded-lg border ${isTaskCompleted ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400" : "bg-amber-950/20 border-amber-500/20 text-amber-500"}`}>
                {isTaskCompleted ? <Unlock className="w-6 h-6" /> : <Lock className="w-6 h-6 animate-pulse" />}
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">Shifrlangan matn:</p>
                <div className="mt-1.5 font-mono text-xl tracking-widest font-bold text-amber-200">
                  {encryptedName || "YUKLANMOQDA..."}
                </div>
              </div>
            </div>
          </div>

          {/* Form and Answer Submission */}
          <div className="flex flex-col gap-3 mt-4">
            <label className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wide">
              Deshifrlangan matn (Katta harflarda):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userAnswer}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  setFeedback("");
                }}
                disabled={isTaskCompleted}
                placeholder="Deshifrlangan matnni kiriting"
                className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500/50 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none text-slate-100 disabled:opacity-55"
              />
              <button
                onClick={handleCheckAnswer}
                disabled={isTaskCompleted || !userAnswer.trim()}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 disabled:from-slate-800 disabled:to-slate-900 text-slate-950 disabled:text-slate-600 font-bold text-xs uppercase font-mono tracking-wider transition-all"
              >
                Tekshirish
              </button>
            </div>
          </div>

        </div>

        {/* Right column: Game Rules & Hint System */}
        <div className="md:col-span-5 flex flex-col justify-between gap-4 bg-slate-950/40 rounded-xl p-5 border border-slate-900">
          
          <div className="flex flex-col gap-4">
            
            {/* Rules */}
            <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-850 text-xs">
              <h4 className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2 font-mono flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" /> [YORDAMCHI KO'RSATKICH]
              </h4>
              <p className="text-slate-400 leading-relaxed">
                Asl so'z quyidagi qoida bo'yicha o'zgargan:
                <br /><br />
                <span className="font-mono text-cyan-400 font-bold block mt-1 text-center bg-slate-950/60 py-2 rounded border border-slate-850 text-sm">
                  {hintWordDecrypted} &rarr; {hintWordEncrypted}
                </span>
              </p>
            </div>

            {/* Task live feedback messages */}
            {feedback && (
              <div
                id="caesar-round-feedback"
                className={`p-3.5 rounded-lg border flex gap-3 text-xs animate-fadeIn leading-relaxed ${
                  isTaskCompleted
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                    : "bg-amber-950/20 border-amber-500/30 text-amber-400"
                }`}
              >
                {isTaskCompleted ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>{feedback}</div>
              </div>
            )}

          </div>

          {/* Action Trigger for completing task */}
          <div className="mt-4">
            {isTaskCompleted ? (
              <button
                id="caesar-finish-btn"
                onClick={handleFinishTask}
                className="w-full py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-450 hover:to-teal-550 text-slate-950 font-mono"
              >
                MISSIYANI YAKUNLASH <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                disabled
                className="w-full py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 text-xs bg-slate-900 text-slate-600 border border-slate-800 font-mono cursor-not-allowed"
              >
                MATNNI TO'G'RI DESHIFRLANG
              </button>
            )}
          </div>

        </div>

      </div>

      {/* Task Completion Banner */}
      {isTaskCompleted && (
        <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-4 flex gap-3 items-center">
          <CheckCircle className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide font-mono">[MUHANDIS TAHLILI]</h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
              Sezar shifri (Caesar Cipher) dunyodagi eng qadimgi va sodda simmetrik shifrlash usullaridan biridir. Biroq, uni chastotali tahlil (frequency analysis) yoki brute-force usuli bilan soniyalar ichida sindirish mumkin, chunki jami kalitlar fazosi atigi 25 ga teng.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
