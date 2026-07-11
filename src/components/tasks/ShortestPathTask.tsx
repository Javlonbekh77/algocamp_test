import React, { useState, useEffect } from "react";
import { GRAPH_NODES, GRAPH_EDGES, OPTIMAL_ROUTE, OPTIMAL_COST } from "../../data/graphData";
import { getFeedbackAndScore } from "../../lib/scoring";
import { RotateCcw, Award, Navigation, ArrowRight, CheckCircle, AlertTriangle } from "lucide-react";
import { playClickSound, playCorrectSound, playIncorrectSound } from "../../lib/sound";

interface ShortestPathTaskProps {
  sessionId: string;
  onComplete: (result: any) => void;
  savedState?: any;
  onStateChange?: (state: any) => void;
}

export default function ShortestPathTask({ onComplete, savedState }: ShortestPathTaskProps) {
  const [currentPath, setCurrentPath] = useState<string[]>(["Toshkent"]);
  const [attemptsCount, setAttemptsCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("Toshkent shahridan boshlab Xiva shahrigacha eng qisqa va arzon yo'lni toping.");
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [startTime] = useState<number>(Date.now());

  // Restore state
  useEffect(() => {
    if (savedState) {
      if (savedState.currentPath) setCurrentPath(savedState.currentPath);
      if (savedState.attemptsCount !== undefined) setAttemptsCount(savedState.attemptsCount);
      if (savedState.isCompleted !== undefined) setIsCompleted(savedState.isCompleted);
      if (savedState.feedback) setFeedback(savedState.feedback);
    }
  }, [savedState]);

  const lastNode = currentPath[currentPath.length - 1];
  const isAtFinish = lastNode === "Xiva";

  // Calculate live path cost
  const getPathCost = (path: string[]): number => {
    let cost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const edge = GRAPH_EDGES.find(
        e => (e.from === path[i] && e.to === path[i + 1]) || (e.from === path[i + 1] && e.to === path[i])
      );
      if (edge) {
        cost += edge.cost;
      } else {
        return 999; // Invalid jump
      }
    }
    return cost;
  };

  const pathCost = getPathCost(currentPath);

  // Get available neighbors for the current last node
  const getNeighbors = (nodeId: string): string[] => {
    const neighbors: string[] = [];
    GRAPH_EDGES.forEach(edge => {
      if (edge.from === nodeId) neighbors.push(edge.to);
      if (edge.to === nodeId) neighbors.push(edge.from);
    });
    return neighbors;
  };

  const availableNeighbors = getNeighbors(lastNode);

  const handleNodeClick = (nodeId: string) => {
    if (isCompleted) return;

    if (nodeId === "Toshkent" && currentPath.length === 1) return;

    // If node is already in currentPath, and it is the second to last node, let's undo last step
    if (currentPath.length > 1 && currentPath[currentPath.length - 2] === nodeId) {
      playClickSound();
      setCurrentPath(prev => prev.slice(0, -1));
      return;
    }

    // If it's already in the path elsewhere, prevent loop cycles to keep it simple
    if (currentPath.includes(nodeId)) {
      playIncorrectSound();
      setFeedback("Shaharlar orqali faqat bir marta o'tishingiz tavsiya etiladi!");
      return;
    }

    // Check if connected
    if (availableNeighbors.includes(nodeId)) {
      playClickSound();
      const nextPath = [...currentPath, nodeId];
      setCurrentPath(nextPath);
      setFeedback(`Yo'nalishga ${nodeId} shahri ulandi. Jami yo'l xarajati (vaqt): ${getPathCost(nextPath)} soat (birlik)`);
      if (nodeId === "Xiva") {
        playCorrectSound();
      }
    } else {
      playIncorrectSound();
      setFeedback(`Xatolik! ${lastNode} shahridan ${nodeId} ga to'g'ridan-to'g'ri yo'l mavjud emas.`);
    }
  };

  const handleUndo = () => {
    if (isCompleted || currentPath.length <= 1) return;
    playClickSound();
    setCurrentPath(prev => prev.slice(0, -1));
    setFeedback("Oxirgi shahar bekor qilindi.");
  };

  const handleReset = () => {
    if (isCompleted) return;
    playClickSound();
    setCurrentPath(["Toshkent"]);
    setFeedback("Yo'l qaytadan Toshkentga tiklandi.");
  };

  const handleSubmitPath = () => {
    if (!isAtFinish) return;

    const nextAttempts = attemptsCount + 1;
    setAttemptsCount(nextAttempts);

    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    const isOptimal = pathCost === OPTIMAL_COST;

    if (isOptimal) {
      const finalResult = getFeedbackAndScore("shortest_path", {
        attemptsCount: nextAttempts,
        hintsUsed: 0,
        timeSpentSeconds: elapsedSeconds,
        details: {
          route: currentPath,
          cost: pathCost,
          isValid: true,
        }
      });

      playCorrectSound();
      setIsCompleted(true);
      setFeedback(`100% zo'r! ${finalResult.feedback}`);
      onComplete({
        taskId: "shortest_path",
        taskName: "Eng Arzon Yo'l",
        score: finalResult.score,
        maxScore: 100,
        completed: true,
        attemptsCount: nextAttempts,
        hintsUsed: 0,
        timeSpentSeconds: elapsedSeconds,
        feedback: finalResult.feedback,
        details: {
          route: currentPath,
          cost: pathCost,
          isValid: true,
        }
      });
    } else {
      playIncorrectSound();
      setFeedback(`Bu optimal yechim emas! Yo'l topildi, ammo uning sarf-xarajati (${pathCost} soat) optimal yo'ldan ko'ra ko'proq vaqt oladi. Iltimos, yo'nalishni tozalab boshqa variantni sinab ko'ring.`);
    }
  };

  // Helper to check if edge is selected
  const isEdgeSelected = (from: string, to: string): boolean => {
    for (let i = 0; i < currentPath.length - 1; i++) {
      if (
        (currentPath[i] === from && currentPath[i + 1] === to) ||
        (currentPath[i] === to && currentPath[i + 1] === from)
      ) {
        return true;
      }
    }
    return false;
  };

  return (
    <div id="path-task-container" className="flex flex-col gap-6 text-slate-100 h-full justify-between">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2 font-mono">
          <Navigation className="w-6 h-6 text-amber-400" /> [ROUND_04: ENG ARZON YO'L]
        </h2>
        {/* Shartga urg'u attractive style */}
        <div className="mt-3 border-l-4 border-amber-500 bg-slate-900/90 px-4 py-3 rounded-r-xl shadow-[0_0_15px_rgba(245,158,11,0.08)]">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500 block mb-1">Missiya Sharti:</span>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Savdogar yuk mashinasida mahsulot tashish uchun eng arzon yo'nalishni rejalashtirmoqda. <strong className="text-amber-400">Toshkent (Start)</strong>-dan <strong className="text-amber-400">Xiva (Marra)</strong>-gacha bo'lgan yo'llar va ularning soatda ifodalangan sarf-xarajati berilgan. Maqsad — eng kam xarajatli (eng tezkor/arzon) transport yo'lini topishdir!
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex flex-col gap-6 w-full flex-1 my-2">
        {/* Row 1: Yo'nalish Reestri / Harid Monitori */}
        <div className="w-full bg-slate-900/60 p-5 rounded-2xl border border-slate-850 flex flex-col lg:flex-row gap-5 items-center justify-between font-mono">
          {/* Left Side: Route Path Readout */}
          <div className="flex-1 w-full text-left">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1.5">[YO'NALISH REESTRI]</span>
            <div id="shortest-path-display" className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-amber-400">
              {currentPath.map((node, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                  <span className="bg-slate-950 px-2.5 py-1 rounded border border-slate-850 text-[10px] text-slate-200">{node}</span>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Middle Side: Live Cost and Feedback */}
          <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
            <div className="bg-slate-950/80 px-4 py-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-3 shrink-0">
              <span className="text-xs text-slate-400">Yo'l xarajati:</span>
              <span id="shortest-path-cost" className="text-base font-mono font-black text-amber-400">{pathCost === 999 ? "N/A" : `${pathCost} soat`}</span>
            </div>

            <div
              id="path-feedback"
              className={`px-4 py-2.5 rounded-lg border text-[11px] leading-snug flex-1 lg:max-w-xs ${
                isCompleted
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                  : "bg-slate-950/60 border-slate-850 text-slate-350"
              }`}
            >
              {feedback}
            </div>
          </div>

          {/* Right Side: Action Buttons */}
          <div className="w-full lg:w-auto flex gap-2 shrink-0">
            <button
              id="path-undo-btn"
              onClick={handleUndo}
              disabled={currentPath.length <= 1 || isCompleted}
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-250 hover:bg-slate-900 text-xs font-bold rounded-lg disabled:opacity-30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              Orqaga
            </button>
            <button
              id="path-reset-btn"
              onClick={handleReset}
              disabled={currentPath.length <= 1 || isCompleted}
              className="px-3.5 py-2.5 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-250 hover:bg-slate-900 text-xs font-bold rounded-lg disabled:opacity-30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Tozalash
            </button>
            <button
              id="path-submit-btn"
              onClick={handleSubmitPath}
              disabled={!isAtFinish || isCompleted}
              className="px-5 py-2.5 rounded-lg font-bold transition-all shadow-md text-xs disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-550 text-slate-950 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-600 font-mono cursor-pointer"
            >
              YO'LNI TEKSHIRISH
            </button>
          </div>
        </div>

        {/* Row 2: SVG Map Canvas (Takes full width, taller and incredibly spacious) */}
        <div className="w-full bg-slate-950/80 rounded-2xl p-5 border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.03)] relative">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3 block font-mono">O'zbekiston Shaharlari Transport Xaritasi</span>
          
          <div className="relative w-full h-[450px] bg-slate-900/40 border border-slate-850 rounded-xl overflow-hidden p-4">
            {/* SVG Connections Overlay */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
              {GRAPH_EDGES.map((edge, idx) => {
                const fromNode = GRAPH_NODES.find(n => n.id === edge.from);
                const toNode = GRAPH_NODES.find(n => n.id === edge.to);

                if (!fromNode || !toNode) return null;

                const isSelected = isEdgeSelected(edge.from, edge.to);

                return (
                  <g key={idx}>
                    {/* Background wider line for glow */}
                    {isSelected && (
                      <line
                        x1={`${fromNode.x}%`}
                        y1={`${fromNode.y}%`}
                        x2={`${toNode.x}%`}
                        y2={`${toNode.y}%`}
                        className="stroke-amber-500 opacity-40 stroke-[4px]"
                      />
                    )}
                    {/* Main path line */}
                    <line
                      x1={`${fromNode.x}%`}
                      y1={`${fromNode.y}%`}
                      x2={`${toNode.x}%`}
                      y2={`${toNode.y}%`}
                      className={`stroke-[2px] transition-all duration-300 ${
                        isSelected ? "stroke-amber-400" : "stroke-slate-800"
                      }`}
                    />
                    {/* Label cost box background */}
                    <rect
                      x={`${(fromNode.x + toNode.x) / 2 - 10}%`}
                      y={`${(fromNode.y + toNode.y) / 2 - 8}%`}
                      width="20"
                      height="16"
                      rx="3"
                      className="fill-slate-950 stroke-slate-850"
                    />
                    {/* Cost text label */}
                    <text
                      x={`${(fromNode.x + toNode.x) / 2}%`}
                      y={`${(fromNode.y + toNode.y) / 2 + 3}%`}
                      dominantBaseline="middle"
                      textAnchor="middle"
                      className="font-mono text-[9px] font-bold fill-amber-400"
                    >
                      {edge.cost}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Interactive City Nodes (overlaid on positions) */}
            {GRAPH_NODES.map((node) => {
              const isSelected = currentPath.includes(node.id);
              const isCurrent = lastNode === node.id;
              const isClickable = availableNeighbors.includes(node.id) && !isSelected && !isCompleted;

              let nodeClass = "bg-slate-950 border-slate-800 text-slate-500 font-mono";
              if (isSelected) {
                nodeClass = isCurrent
                  ? "bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/20 scale-105 font-mono"
                  : "bg-amber-950/40 text-amber-300 border-amber-500/50 scale-102 font-mono";
              } else if (isClickable) {
                nodeClass = "bg-slate-900 hover:bg-slate-850 border-amber-500/30 text-slate-200 hover:scale-105 animate-pulse font-mono";
              }

              return (
                <button
                  key={node.id}
                  id={`node-btn-${node.id}`}
                  onClick={() => handleNodeClick(node.id)}
                  disabled={isCompleted || (!isClickable && !isSelected)}
                  style={{
                    position: "absolute",
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className={`px-3 py-1.5 rounded-lg border text-[10px] sm:text-xs font-bold transition-all z-10 shadow-md ${nodeClass} cursor-pointer`}
                >
                  {node.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Educational Note */}
      {isCompleted && (
        <div className="bg-emerald-950/15 border border-emerald-500/20 rounded-xl p-4 flex gap-3 items-center">
          <Award className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide font-mono">[MUTAXASSIS TAHLILI]</h4>
            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed font-mono">
              Yo'nalishda eng kam shaharlar orqali o'tish eng arzon yo'l degani emas (masalan Toshkent {"->"} Guliston {"->"} Buxoro {"->"} Xiva jami 4 shahar bo'lsa ham uning qiymati 22 soat bo'ladi, lekin Toshkent {"->"} Guliston {"->"} Samarqand {"->"} Qarshi {"->"} Termiz {"->"} Xiva jami 6 shahar bo'lishiga qaramay atigi 17 soat vaqt oladi). Grafiklarda eng qisqa yo'lni topish algoritmlari (masalan Dijkstra) barcha oraliq yo'llarning og'irlik (narx) qiymatlarini to'liq hisobga oladi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
