"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AGENTIC_RAG_STENCILS,
  DISTRIBUTED_BACKEND_STENCILS,
  extractExcalidrawTopology,
  extractSpreadsheetFormulaAst,
  injectSocraticHighlightsOntoScene,
  instantiateStencilElement,
  interpolateCanvasVoiceViewport,
  routeAndValidateSandboxExecution,
  type CanvasViewportKeyframe,
  type DomainStencilId,
  type SandboxRunnerKind,
  type SocraticNodeFeedback,
  type StyledExcalidrawElement,
  type UniverWorkbookPayload,
} from "@elluminar/domain-artifacts";

export type StudioTabMode = "SYSTEM_CANVAS" | "CODE_SANDBOX" | "DCF_SHEET";

export interface RubricCriterionItem {
  id: string;
  title: string;
  weightPercent: number;
  socraticCheckQuestion: string;
}

export interface StudioProblemScenario {
  id: string;
  slug: string;
  domainBadge: string;
  title: string;
  summary: string;
  defaultTab: StudioTabMode;
  rubric: RubricCriterionItem[];
  initialCanvasElements: StyledExcalidrawElement[];
  socraticFeedback: SocraticNodeFeedback[];
  defaultRunner: SandboxRunnerKind;
  defaultCodeSnippet: string;
  workbookPayload: UniverWorkbookPayload;
  mentorVoiceKeyframes: CanvasViewportKeyframe[];
  mentorVoiceDurationMs: number;
  mentorTranscriptCue: string;
}

export interface ArtifactWorkspaceShellProps {
  scenarios: StudioProblemScenario[];
}

export function ArtifactWorkspaceShell({
  scenarios,
}: ArtifactWorkspaceShellProps) {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const activeScenario = scenarios[selectedScenarioIdx] ?? scenarios[0]!;

  const [activeTab, setActiveTab] = useState<StudioTabMode>(
    activeScenario.defaultTab
  );
  const [canvasElements, setCanvasElements] = useState<
    StyledExcalidrawElement[]
  >(activeScenario.initialCanvasElements);
  const [showSocraticOverlay, setShowSocraticOverlay] = useState(true);

  const [sandboxRunner, setSandboxRunner] = useState<SandboxRunnerKind>(
    activeScenario.defaultRunner
  );
  const [sandboxCode, setSandboxCode] = useState<string>(
    activeScenario.defaultCodeSnippet
  );
  const [judge0UsedCount, setJudge0UsedCount] = useState<number>(14);
  const [sandboxExecutionLog, setSandboxExecutionLog] = useState<string | null>(
    null
  );

  // Synchronized 60fps Voice-over-Canvas Mentor Replay state
  const [playbackTimeMs, setPlaybackTimeMs] = useState<number>(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);

  // Sync state when switching scenario
  const handleSelectScenario = (index: number) => {
    const next = scenarios[index];
    if (!next) return;
    setSelectedScenarioIdx(index);
    setActiveTab(next.defaultTab);
    setCanvasElements(next.initialCanvasElements);
    setSandboxRunner(next.defaultRunner);
    setSandboxCode(next.defaultCodeSnippet);
    setPlaybackTimeMs(0);
    setIsPlayingVoice(false);
    setSandboxExecutionLog(null);
  };

  useEffect(() => {
    if (!isPlayingVoice) return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const step = (now: number) => {
      const deltaMs = now - lastTimestamp;
      lastTimestamp = now;

      setPlaybackTimeMs((prev) => {
        const nextMs = prev + deltaMs;
        if (nextMs >= activeScenario.mentorVoiceDurationMs) {
          setIsPlayingVoice(false);
          return activeScenario.mentorVoiceDurationMs;
        }
        return nextMs;
      });

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlayingVoice, activeScenario.mentorVoiceDurationMs]);

  const annotatedScene = useMemo(() => {
    const baseScene = {
      type: "excalidraw" as const,
      elements: canvasElements,
    };
    if (!showSocraticOverlay) {
      return baseScene;
    }
    return injectSocraticHighlightsOntoScene(
      baseScene,
      activeScenario.socraticFeedback
    );
  }, [canvasElements, showSocraticOverlay, activeScenario.socraticFeedback]);

  const topologyGraph = useMemo(
    () => extractExcalidrawTopology(annotatedScene),
    [annotatedScene]
  );

  const formulaAst = useMemo(
    () => extractSpreadsheetFormulaAst(activeScenario.workbookPayload),
    [activeScenario.workbookPayload]
  );

  const interpolatedViewport = useMemo(
    () =>
      interpolateCanvasVoiceViewport(
        activeScenario.mentorVoiceKeyframes,
        playbackTimeMs
      ),
    [activeScenario.mentorVoiceKeyframes, playbackTimeMs]
  );

  const handleAddStencilNode = (stencilId: DomainStencilId) => {
    const nextX = 80 + ((canvasElements.length * 145) % 520);
    const nextY = 90 + Math.floor(canvasElements.length / 4) * 115;
    const created = instantiateStencilElement(
      stencilId,
      nextX,
      nextY,
      `${stencilId}_${canvasElements.length + 1}`
    );
    setCanvasElements((prev) => [...prev, created]);
  };

  const handleRunSandbox = () => {
    const decision = routeAndValidateSandboxExecution(
      {
        requestId: `exec_${Date.now()}`,
        userId: "usr_demo_architect",
        runner: sandboxRunner,
        compiledLanguage: sandboxRunner === "JUDGE0_COMPILED" ? "go" : undefined,
        sourceCode: sandboxCode,
        timeoutMs: 5_000,
      },
      {
        userId: "usr_demo_architect",
        utcDateKey: "2026-10-07",
        judge0ExecutionsUsedToday: judge0UsedCount,
      }
    );

    if (!decision.allowed) {
      setSandboxExecutionLog(
        `[GUARD REJECTED: ${decision.rejectionCode}] ${decision.reason}`
      );
      return;
    }

    if (sandboxRunner === "JUDGE0_COMPILED") {
      setJudge0UsedCount((c) => c + 1);
    }

    setSandboxExecutionLog(
      `[DISPATCH OK -> ${decision.tier}] Runner=${decision.dispatchMessage.runner} | Marginal Server Cost=₹0.00 | Remaining Daily Remote Quota=${decision.remainingDailyRemoteQuota}`
    );
  };

  const backendStencilEntries = Object.values(DISTRIBUTED_BACKEND_STENCILS);
  const ragStencilEntries = Object.values(AGENTIC_RAG_STENCILS);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Studio Header & Scenario Switcher */}
      <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center rounded-md bg-indigo-500/15 px-2.5 py-1 text-xs font-semibold text-indigo-300 border border-indigo-500/30">
            Elluminar Studio v2
          </span>
          <h1 className="text-base font-semibold tracking-tight text-white">
            {activeScenario.title}
          </h1>
          <span className="text-xs text-slate-400 hidden md:inline">
            ({activeScenario.domainBadge})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Scenario:</span>
          {scenarios.map((sc, idx) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => handleSelectScenario(idx)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
                idx === selectedScenarioIdx
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {sc.domainBadge}
            </button>
          ))}
        </div>
      </header>

      {/* Main Split-Screen 2-Column Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT PANE: Problem Brief & Rubric Criteria */}
        <aside className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/50 p-5 flex flex-col gap-5 overflow-y-auto">
          <div>
            <div className="text-xs uppercase tracking-wider text-indigo-400 font-semibold mb-1">
              Architectural Problem Brief
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {activeScenario.summary}
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                Socratic Evaluation Rubric
              </h2>
              <span className="text-xs text-emerald-400 font-mono">
                100% Weight
              </span>
            </div>

            {activeScenario.rubric.map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 space-y-1.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-slate-100">
                    {item.title}
                  </span>
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs font-mono text-indigo-300">
                    {item.weightPercent}%
                  </span>
                </div>
                <p className="text-xs text-slate-400 italic">
                  &ldquo;{item.socraticCheckQuestion}&rdquo;
                </p>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-lg border border-amber-500/30 bg-amber-950/20 p-3.5">
            <div className="text-xs font-semibold text-amber-300 mb-1">
              Zero-Spoiler Socratic Policy
            </div>
            <p className="text-xs text-amber-200/80 leading-relaxed">
              AI & Human Mentors highlight structural bottlenecks directly on
              your canvas and formula AST using guided inquiry rather than
              handing out pre-built reference answers.
            </p>
          </div>
        </aside>

        {/* RIGHT PANE: Pluggable Interactive Artifact Studio */}
        <main className="lg:col-span-8 flex flex-col bg-slate-950 overflow-hidden">
          {/* Artifact Plugin Mode Tabs */}
          <div className="border-b border-slate-800 bg-slate-900/60 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("SYSTEM_CANVAS")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === "SYSTEM_CANVAS"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                1. System Design Stencil Canvas
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("CODE_SANDBOX")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === "CODE_SANDBOX"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                2. Pyodide / WASM Code Runner
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("DCF_SHEET")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                  activeTab === "DCF_SHEET"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                3. DCF Financial Sheet Inspector
              </button>
            </div>

            {activeTab === "SYSTEM_CANVAS" && (
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showSocraticOverlay}
                  onChange={(e) => setShowSocraticOverlay(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-500"
                />
                <span>Show Socratic Node Highlights</span>
              </label>
            )}
          </div>

          {/* TAB 1: SYSTEM DESIGN STENCIL CANVAS */}
          {activeTab === "SYSTEM_CANVAS" && (
            <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
              {/* Stencil Palette Bar */}
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 space-y-2.5">
                <div className="text-xs font-semibold text-slate-300">
                  Click Domain Stencil to Place on Canvas:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {backendStencilEntries.map((st) => (
                    <button
                      key={st.stencilId}
                      type="button"
                      onClick={() => handleAddStencilNode(st.stencilId)}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-sky-950/60 text-sky-300 border border-sky-700/40 hover:bg-sky-900/60 transition"
                    >
                      + {st.label}
                    </button>
                  ))}
                  {ragStencilEntries.map((st) => (
                    <button
                      key={st.stencilId}
                      type="button"
                      onClick={() => handleAddStencilNode(st.stencilId)}
                      className="px-2.5 py-1 rounded text-xs font-medium bg-purple-950/60 text-purple-300 border border-purple-700/40 hover:bg-purple-900/60 transition"
                    >
                      + {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interactive Canvas Stage with Mentor Laser Pointer & Socratic Callouts */}
              <div className="relative min-h-[300px] rounded-xl border border-slate-800 bg-slate-900/40 p-4 overflow-hidden">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span>
                    Extracted Graph: <strong>{topologyGraph.nodeCount}</strong>{" "}
                    nodes, <strong>{topologyGraph.edgeCount}</strong> flows (
                    {topologyGraph.danglingArrowCount} unbound)
                  </span>
                  <span className="font-mono text-indigo-300">
                    Camera Zoom: {(interpolatedViewport.zoom * 100).toFixed(0)}%
                    | Laser: ({Math.round(interpolatedViewport.pointerX)},{" "}
                    {Math.round(interpolatedViewport.pointerY)})
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {annotatedScene.elements
                    .filter((el) => el.type !== "arrow")
                    .map((node) => (
                      <div
                        key={node.id}
                        style={{
                          borderColor: node.strokeColor ?? "#475569",
                          backgroundColor: node.backgroundColor
                            ? `${node.backgroundColor}18`
                            : undefined,
                        }}
                        className="rounded-lg border-2 p-3 transition flex flex-col gap-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs text-white">
                            {node.text ?? node.id}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            {node.type} ({node.x}, {node.y})
                          </span>
                        </div>

                        {node.socraticAnnotation && (
                          <div className="mt-1 rounded bg-slate-950/90 p-2 border border-slate-700/80 text-xs">
                            <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 mr-1.5">
                              {node.socraticAnnotation.severity}
                            </span>
                            <span className="text-slate-200">
                              {node.socraticAnnotation.socraticQuestion}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: 3-TIER SANDBOX RUNNER */}
          {activeTab === "CODE_SANDBOX" && (
            <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {(
                    [
                      "PYODIDE_PYTHON",
                      "DUCKDB_SQL",
                      "SANDPACK_TS",
                      "JUDGE0_COMPILED",
                    ] as const
                  ).map((runner) => (
                    <button
                      key={runner}
                      type="button"
                      onClick={() => setSandboxRunner(runner)}
                      className={`px-3 py-1 rounded text-xs font-mono transition ${
                        sandboxRunner === runner
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                      }`}
                    >
                      {runner}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleRunSandbox}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
                >
                  Execute in Sandbox
                </button>
              </div>

              <textarea
                value={sandboxCode}
                onChange={(e) => setSandboxCode(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-slate-800 bg-slate-900 p-3.5 font-mono text-xs text-emerald-300 focus:outline-none focus:border-indigo-500"
              />

              {sandboxExecutionLog && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 font-mono text-xs text-emerald-200">
                  {sandboxExecutionLog}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DCF FINANCIAL SHEET INSPECTOR */}
          {activeTab === "DCF_SHEET" && (
            <div className="flex-1 p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="text-xs text-slate-400">Populated Cells</div>
                  <div className="text-lg font-bold text-white">
                    {formulaAst.totalPopulatedCells}
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="text-xs text-slate-400">Dynamic Formulas</div>
                  <div className="text-lg font-bold text-emerald-400">
                    {formulaAst.dynamicFormulaCells} (
                    {(formulaAst.dynamicFormulaRatioBps / 100).toFixed(1)}%)
                  </div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div className="text-xs text-slate-400">
                    Hardcoded Inputs
                  </div>
                  <div className="text-lg font-bold text-amber-400">
                    {formulaAst.hardcodedNumericCells}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-900 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950 text-slate-400">
                      <th className="py-2 px-3">Cell</th>
                      <th className="py-2 px-3">Classification</th>
                      <th className="py-2 px-3">Formula / Literal</th>
                      <th className="py-2 px-3">Referenced Ranges</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {formulaAst.cells.map((cell) => (
                      <tr key={`${cell.sheetName}_${cell.cellRef}`}>
                        <td className="py-2 px-3 font-mono font-semibold text-indigo-300">
                          {cell.cellRef}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                              cell.classification === "DYNAMIC_FORMULA"
                                ? "bg-emerald-500/15 text-emerald-300"
                                : "bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            {cell.classification}
                          </span>
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-200">
                          {cell.rawFormula ?? String(cell.literalValue ?? "")}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-400">
                          {cell.referencedRanges.join(", ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* BOTTOM PANE: Synchronized 60fps Opus Voice-over-Canvas Mentor Replay Bar */}
      <footer className="border-t border-slate-800 bg-slate-900 px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setIsPlayingVoice((p) => !p)}
            className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
          >
            {isPlayingVoice ? "Pause Mentor Replay" : "Play 60fps Voice Replay"}
          </button>
          <div className="text-xs text-slate-300 truncate max-w-md">
            <span className="font-semibold text-indigo-300 mr-1.5">
              Mentor Opus Stream:
            </span>
            {activeScenario.mentorTranscriptCue}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-96">
          <span className="text-xs font-mono text-slate-400">
            {(playbackTimeMs / 1000).toFixed(1)}s
          </span>
          <input
            type="range"
            min={0}
            max={activeScenario.mentorVoiceDurationMs}
            value={Math.round(playbackTimeMs)}
            onChange={(e) => {
              setIsPlayingVoice(false);
              setPlaybackTimeMs(Number(e.target.value));
            }}
            className="flex-1 accent-indigo-500 cursor-pointer"
          />
          <span className="text-xs font-mono text-slate-400">
            {(activeScenario.mentorVoiceDurationMs / 1000).toFixed(1)}s
          </span>
        </div>
      </footer>
    </div>
  );
}
