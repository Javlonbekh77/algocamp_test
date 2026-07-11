import React, { useState, useEffect } from "react";
import { getFeedbackAndScore } from "../../lib/scoring";
import { Grid, RotateCcw, Award } from "lucide-react";

interface SlidingPuzzleTaskProps {
  sessionId: string;
  onComplete: (result: any) => void;
  savedState?: any;
  onStateChange?: (state: any) => void;
}

export default function SlidingPuzzleTask({ onComplete, savedState }: SlidingPuzzleTaskProps) {
  const solvedBoard = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0];

  const [board, setBoard] = useState<number[]>([]);
  const [initialScrambledBoard, setInitialScrambledBoard] = useState<number[]>([]);
  const [scrambleMovesCount, setScrambleMovesCount] = useState<number>(15);
  const [movesCount, setMovesCount] = useState<number>(0);
  const [solved, setSolved] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string>("Bloklarni surib, tartibga keltiring (1-15). 0 bo'sh katakdir.");
  const [shakeTileIdx, setShakeTileIdx] = useState<number | null>(null);
  const [startTime] = useState<number>(Date.now());

  // Generate scrambled board on load
  useEffect(() => {
    generateScramble();
  }, []);

  // Restore state
  useEffect(() => {
    if (savedState) {
      if (savedState.board) setBoard(savedState.board);
      if (savedState.initialScrambledBoard) setInitialScrambledBoard(savedState.initialScrambledBoard);
      if (savedState.scrambleMovesCount !== undefined) setScrambleMovesCount(savedState.scrambleMovesCount);
      if (savedState.movesCount !== undefined) setMovesCount(savedState.movesCount);
      if (savedState.solved !== undefined) setSolved(savedState.solved);
      if (savedState.isCompleted !== undefined) setIsCompleted(savedState.isCompleted);
      if (savedState.feedback) setFeedback(savedState.feedback);
    }
  }, [savedState]);

  // Check if board is solved
  const checkIsSolved = (currBoard: number[]): boolean => {
    return currBoard.every((val, idx) => val === solvedBoard[idx]);
  };

  // Get valid neighbor indices of the empty space (0)
  const getValidMoves = (emptyIdx: number): number[] => {
    const row = Math.floor(emptyIdx / 4);
    const col = emptyIdx % 4;
    const moves: number[] = [];

    if (row > 0) moves.push(emptyIdx - 4); // Up
    if (row < 3) moves.push(emptyIdx + 4); // Down
    if (col > 0) moves.push(emptyIdx - 1); // Left
    if (col < 3) moves.push(emptyIdx + 1); // Right

    return moves;
  };

  // Scramble the board from solved state
  const generateScramble = () => {
    let currBoard = [...solvedBoard];
    let emptyIdx = 15;
    let prevMoveIdx = -1;
    const depth = 15; // Harder difficulty scramble (depth 15)

    for (let i = 0; i < depth; i++) {
      const validIndices = getValidMoves(emptyIdx);
      // Filter out reverse move to prevent undoing
      const choices = validIndices.filter(idx => idx !== prevMoveIdx);
      const chosenIdx = choices[Math.floor(Math.random() * choices.length)];

      // Swap
      currBoard[emptyIdx] = currBoard[chosenIdx];
      currBoard[chosenIdx] = 0;

      prevMoveIdx = emptyIdx;
      emptyIdx = chosenIdx;
    }

    // If somehow generated a pre-solved board, retry
    if (currBoard.every((v, i) => v === solvedBoard[i])) {
      generateScramble();
      return;
    }

    setBoard(currBoard);
    setInitialScrambledBoard([...currBoard]);
    setScrambleMovesCount(depth);
    setMovesCount(0);
    setSolved(false);
    setIsCompleted(false);
    setFeedback("Sandiq bloklari aralashtirildi. Eng kam yurishlar soni bilan yig'ishga harakat qiling!");
  };

  const handleTileClick = (tileIdx: number) => {
    if (solved || isCompleted) return;

    const emptyIdx = board.indexOf(0);
    const validMoves = getValidMoves(emptyIdx);

    if (validMoves.includes(tileIdx)) {
      // Swapping
      const updatedBoard = [...board];
      updatedBoard[emptyIdx] = board[tileIdx];
      updatedBoard[tileIdx] = 0;

      setBoard(updatedBoard);
      setMovesCount(prev => prev + 1);
      setFeedback(`Yurishlar soni: ${movesCount + 1}`);

      if (checkIsSolved(updatedBoard)) {
        setSolved(true);
        setFeedback(`Tabriklaymiz! Sandiq muvaffaqiyatli tartiblandi! 🎉`);
      }
    } else {
      // Non-valid move, trigger temporary shake
      setShakeTileIdx(tileIdx);
      setTimeout(() => setShakeTileIdx(null), 300);
    }
  };

  const handleResetBoard = () => {
    if (solved || isCompleted) return;
    setBoard([...initialScrambledBoard]);
    setMovesCount(0);
    setFeedback("Sandiq dastlabki tartibsiz holatiga qaytarildi.");
  };

  // Calculate Manhattan distances to measure progress (for partial scoring)
  const getManhattanDistanceSum = (currBoard: number[]): number => {
    let sum = 0;
    currBoard.forEach((val, idx) => {
      if (val !== 0) {
        const solvedIdx = val - 1;
        const targetRow = Math.floor(solvedIdx / 4);
        const targetCol = solvedIdx % 4;

        const currRow = Math.floor(idx / 4);
        const currCol = idx % 4;

        sum += Math.abs(targetRow - currRow) + Math.abs(targetCol - currCol);
      }
    });
    return sum;
  };

  const initialManhattan = getManhattanDistanceSum(initialScrambledBoard);
  const currentManhattan = getManhattanDistanceSum(board);
  const progressPercent = Math.max(0, Math.min(100, Math.round((1 - currentManhattan / (initialManhattan || 1)) * 100)));

  const handleFinish = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    const finalResult = getFeedbackAndScore("sliding_puzzle", {
      attemptsCount: 1,
      hintsUsed: 0,
      timeSpentSeconds: elapsedSeconds,
      movesCount,
      details: {
        solved,
        scrambleMoves: scrambleMovesCount,
        manhattanImprovementPercent: progressPercent,
      }
    });

    setIsCompleted(true);
    onComplete({
      taskId: "sliding_puzzle",
      taskName: "15 Box Puzzle",
      score: finalResult.score,
      maxScore: 100,
      completed: true,
      attemptsCount: 1,
      hintsUsed: 0,
      timeSpentSeconds: elapsedSeconds,
      movesCount,
      feedback: finalResult.feedback,
      details: {
        solved,
        movesCount,
        progressPercent,
      }
    });
  };

  return (
    <div id="puzzle-task-container" className="flex flex-col gap-6 text-slate-100 h-full justify-between animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2 font-mono">
          <Grid className="w-6 h-6 text-amber-400" /> [ROUND_05: 15 BOX PUZZLE]
        </h2>
        {/* Shartga urg'u attractive style */}
        <div className="mt-3 border-l-4 border-amber-500 bg-slate-900/90 px-4 py-3 rounded-r-xl shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block mb-1">Missiya Sharti:</span>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Doskada 1 dan 15 gacha raqamlangan bloklar chalkash joylashgan. Faqatgina bo'sh joy (0) yonidagi bloklarni surish mumkin. Maqsad — minimal harakatlar soni bilan bloklarni <strong className="text-amber-400">1 dan 15 gacha tartibli</strong> holatga keltirishdir!
          </p>
        </div>
      </div>

      {/* Main Sandbox */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch flex-1 my-2">
        {/* Left Side: 4x4 Grid Board */}
        <div className="md:col-span-7 bg-slate-950/80 rounded-xl p-5 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.03)] flex flex-col justify-between items-center">
          <div className="w-full flex justify-between items-center mb-4 font-mono">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">O'yin Doskasi (4 x 4)</span>
            <div id="puzzle-progress-badge" className="text-xs bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg text-emerald-400 font-bold">
              To'g'rilik: {progressPercent}%
            </div>
          </div>

          {/* Puzzle board */}
          <div className="w-[280px] h-[280px] bg-slate-950 p-3 rounded-2xl border-2 border-slate-900 grid grid-cols-4 grid-rows-4 gap-2 relative shadow-inner">
            {board.map((val, idx) => {
              const isEmpty = val === 0;
              const isCorrectPosition = !isEmpty && val === solvedBoard[idx];
              const isShaking = shakeTileIdx === idx;

              let tileClass = "bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-850 hover:border-slate-700 active:scale-95";
              if (isEmpty) {
                tileClass = "bg-slate-950/60 border-slate-900 border-dashed border shadow-inner text-transparent";
              } else if (isCorrectPosition) {
                tileClass = "bg-gradient-to-br from-emerald-600/80 to-teal-800/85 text-emerald-100 border-emerald-500/50 shadow-md";
              }

              return (
                <button
                  key={idx}
                  id={`puzzle-tile-${val}`}
                  onClick={() => handleTileClick(idx)}
                  disabled={isEmpty || solved || isCompleted}
                  className={`rounded-lg border font-mono font-black text-base sm:text-lg flex items-center justify-center transition-all cursor-pointer ${tileClass} ${
                    isShaking ? "animate-shake border-red-500" : ""
                  }`}
                >
                  {isEmpty ? "" : val}
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-5 w-full justify-between items-center font-mono text-xs">
            <div className="text-slate-400">
              Yurishlar: <strong className="text-amber-400 font-mono text-sm">{movesCount}</strong> (Maqsad: ≤ 30)
            </div>
            <button
              id="puzzle-reset-btn"
              onClick={handleResetBoard}
              disabled={solved || isCompleted}
              className="text-[11px] text-slate-400 hover:text-slate-200 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors bg-slate-900/40 cursor-pointer"
            >
              Qaytadan tiklash
            </button>
          </div>
        </div>

        {/* Right Side: Instructions, Score Progress */}
        <div className="md:col-span-5 flex flex-col justify-between gap-4 bg-slate-950/40 rounded-xl p-5 border border-slate-900">
          <div className="flex flex-col gap-4">
            {/* Guide box */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-850 text-xs text-slate-400 space-y-2 leading-relaxed">
              <h4 className="font-bold text-amber-500 uppercase tracking-wide text-[10px] font-mono">[GOAL: TARTIB CHIZMASI]</h4>
              <div className="grid grid-cols-4 gap-1 w-24 font-mono text-[9px] text-center text-slate-500 bg-slate-950 p-1.5 rounded border border-slate-900">
                <span>1</span><span>2</span><span>3</span><span>4</span>
                <span>5</span><span>6</span><span>7</span><span>8</span>
                <span>9</span><span>10</span><span>11</span><span>12</span>
                <span>13</span><span>14</span><span>15</span><span className="text-amber-500">0</span>
              </div>
              <p>Faqat bo'sh katak yonidagi bloklar siljiydi. Raundni optimal yechishga harakat qiling.</p>
            </div>

            {/* Live Feedback */}
            <div
              id="puzzle-feedback"
              className={`p-3.5 rounded-lg border text-xs leading-relaxed font-mono ${
                solved
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-900 border-slate-850 text-slate-300"
              }`}
            >
              {feedback}
            </div>
          </div>

          {/* Finish */}
          <div className="mt-4">
            <button
              id="puzzle-finish-btn"
              onClick={handleFinish}
              className="w-full py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center gap-1.5 text-xs bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 font-mono"
            >
              MISSIYANI YAKUNLASH
            </button>
          </div>
        </div>
      </div>

      {/* Educational Note */}
      {(solved || isCompleted) && (
        <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-4 flex gap-3 items-center animate-fadeIn">
          <Award className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide font-mono">[MUTAXASSIS TAHLILI]</h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-mono">
              15 Box Puzzle - holatlar fazosini (state space search) qidirish masalasi hisoblanadi. Evristik funksiya sifatida barcha bloklarning maqsadli o'rnigacha bo'lgan Manhattan masofalari yig'indisi o'yin optimal yig'ilayotganini tekshirish uchun xizmat qiladi (A* algoritmi mantiqi).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
