import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Pause, Play, RotateCcw, ShieldCheck, Volume2, VolumeX } from "lucide-react";

export const Route = createFileRoute("/fuck/")({
  component: RouteComponent,
});

type Phase = "calm" | "rising" | "critical" | "danger" | "recovering" | "overload";
type Difficulty = "starter" | "focus" | "extreme";

type RecordBook = {
  highScore: number;
  bestCombo: number;
  privacyMode: boolean;
  muted: boolean;
  hasSeenGuide: boolean;
};

const STORAGE_KEY = "pulse-control-records";
const GAME_LENGTH = 45;
const DIFFICULTIES: Record<Difficulty, { label: string; gain: number; cooling: number }> = {
  starter: { label: "新手", gain: 0.75, cooling: 1.35 },
  focus: { label: "专注", gain: 0.95, cooling: 1.05 },
  extreme: { label: "极限", gain: 1.2, cooling: 0.78 },
};

const DEFAULT_RECORDS: RecordBook = {
  highScore: 0,
  bestCombo: 0,
  privacyMode: true,
  muted: true,
  hasSeenGuide: false,
};

function readRecords(): RecordBook {
  try {
    return { ...DEFAULT_RECORDS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") };
  } catch {
    return DEFAULT_RECORDS;
  }
}

function phaseFor(excitement: number, inputting: boolean): Phase {
  if (excitement >= 100) return "overload";
  if (!inputting && excitement >= 65 && excitement <= 75) return "recovering";
  if (excitement >= 95) return "danger";
  if (excitement >= 80) return "critical";
  if (excitement >= 45) return "rising";
  return "calm";
}

function usePulseControl() {
  const [records, setRecords] = useState<RecordBook>(DEFAULT_RECORDS);
  const [difficulty, setDifficulty] = useState<Difficulty>("starter");
  const [isReady, setIsReady] = useState(false);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [inputting, setInputting] = useState(false);
  const [excitement, setExcitement] = useState(12);
  const [stamina, setStamina] = useState(100);
  const [control, setControl] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_LENGTH);
  const [criticalTime, setCriticalTime] = useState(0);
  const [longestCritical, setLongestCritical] = useState(0);
  const [feedback, setFeedback] = useState("上拉复位，再向下压送，将能量注入储能管");
  const [pistonPosition, setPistonPosition] = useState(50);
  const [pumpCount, setPumpCount] = useState(0);
  const [released, setReleased] = useState(false);
  const inputRef = useRef(false);
  const lastY = useRef<number | null>(null);
  const motionRef = useRef(0);
  const lastDirection = useRef(0);
  const strokeArmed = useRef(false);
  const wasCritical = useRef(false);
  const reachedCritical = useRef(false);
  const recordRef = useRef(records);
  const releaseTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (releaseTimer.current !== null) window.clearTimeout(releaseTimer.current);
  }, []);

  useEffect(() => {
    const saved = readRecords();
    setRecords(saved);
    recordRef.current = saved;
  }, []);

  const updateRecords = useCallback((updates: Partial<RecordBook>) => {
    setRecords((current) => {
      const next = { ...current, ...updates };
      recordRef.current = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    inputRef.current = false;
    lastY.current = null;
    motionRef.current = 0;
    lastDirection.current = 0;
    strokeArmed.current = false;
    wasCritical.current = false;
    reachedCritical.current = false;
    setInputting(false);
    setPaused(false);
    setEnded(false);
    setExcitement(12);
    setStamina(100);
    setControl(3);
    setScore(0);
    setCombo(0);
    setTimeLeft(GAME_LENGTH);
    setCriticalTime(0);
    setLongestCritical(0);
    setPistonPosition(50);
    setPumpCount(0);
    setReleased(false);
    if (releaseTimer.current !== null) {
      window.clearTimeout(releaseTimer.current);
      releaseTimer.current = null;
    }
    setFeedback("上拉复位，再向下压送，将能量注入储能管");
  }, []);

  useEffect(() => {
    if (!isReady || paused || ended) return;
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - previous) / 1000, 0.05);
      previous = now;
      const config = DIFFICULTIES[difficulty];

      setTimeLeft((value) => {
        const next = Math.max(0, value - dt);
        if (next === 0) {
          setReleased(true);
          setEnded(true);
          setFeedback("时间结束 · 能量持续释放中");
        }
        return next;
      });
      setStamina((value) => {
        const next = inputRef.current ? Math.max(0, value - dt * 1.15) : Math.min(100, value + dt * 0.45);
        if (next === 0) {
          setReleased(true);
          setEnded(true);
          setFeedback("耐力耗尽 · 能量持续释放中");
        }
        return next;
      });
      setExcitement((value) => {
        const speed = Math.min(motionRef.current / 120, 1.5);
        const change = inputRef.current
          ? speed * 2.1 * config.gain * dt * 10
          : -config.cooling * dt * 10;
        const next = Math.max(0, Math.min(100, value + change));
        const inCritical = next >= 80 && next < 100;
        if (inCritical) {
          reachedCritical.current = true;
          setCriticalTime((seconds) => {
            const updated = seconds + dt;
            setLongestCritical((longest) => Math.max(longest, updated));
            return updated;
          });
          setScore((points) => points + Math.round((1 + combo * 0.25) * dt * 12));
          wasCritical.current = true;
        }
        if (!inputRef.current && wasCritical.current && next >= 65 && next <= 75) {
          const quality = Math.round(Math.max(0, Math.min(100, (95 - value) * 4 + criticalTime * 7)));
          const reward = Math.round(250 * (1 + combo * 0.3) + criticalTime * 40);
          setScore((points) => points + reward);
          setCombo((current) => {
            const updated = current + 1;
            updateRecords({ bestCombo: Math.max(recordRef.current.bestCombo, updated) });
            return updated;
          });
          setControl((value) => Math.min(5, value + 1));
          setFeedback(`控制成功 · 时机评分 ${quality} · 奖励 ${reward}`);
          wasCritical.current = false;
          reachedCritical.current = false;
          setCriticalTime(0);
          navigator.vibrate?.(18);
        }
        if (next >= 100) {
          setReleased(true);
          setFeedback("储能满载 · 安全阀正在释放能量");
          if (releaseTimer.current === null) {
            releaseTimer.current = window.setTimeout(() => {
              setExcitement(0);
              setEnded(true);
              releaseTimer.current = null;
            }, 650);
          }
        }
        return next;
      });
      motionRef.current *= 0.92;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [combo, criticalTime, difficulty, ended, isReady, paused, updateRecords]);

  useEffect(() => {
    if (!ended) return;
    updateRecords({ highScore: Math.max(recordRef.current.highScore, score) });
  }, [ended, score, updateRecords]);

  const startInput = useCallback((y: number, position = 50) => {
    if (paused || ended || !isReady) return;
    inputRef.current = true;
    lastY.current = y;
    setPistonPosition(position);
    setInputting(true);
  }, [ended, isReady, paused]);

  const moveInput = useCallback((y: number, position: number) => {
    if (!inputRef.current || lastY.current === null) return;
    const distance = y - lastY.current;
    const direction = Math.sign(distance);
    setPistonPosition(Math.max(8, Math.min(88, position)));
    if (direction < 0 && lastDirection.current >= 0) {
      strokeArmed.current = true;
      setFeedback("活塞已复位 · 向下压送以注入能量");
    }
    if (direction > 0 && strokeArmed.current && Math.abs(distance) > 4) {
      motionRef.current = Math.min(180, motionRef.current + Math.abs(distance) * 4);
      strokeArmed.current = false;
      setPumpCount((value) => value + 1);
      setFeedback("能量已压入储能管 · 继续上拉复位");
      navigator.vibrate?.(8);
    }
    if (direction !== 0) lastDirection.current = direction;
    lastY.current = y;
  }, []);

  const stopInput = useCallback(() => {
    inputRef.current = false;
    lastY.current = null;
    lastDirection.current = 0;
    strokeArmed.current = false;
    setInputting(false);
    if (reachedCritical.current) setFeedback("回落窗口已开启 · 保持松开直到稳定区");
  }, []);

  const useControl = useCallback(() => {
    if (control <= 0 || ended || paused) return;
    setControl((value) => value - 1);
    setExcitement((value) => Math.max(0, value - 13));
    setFeedback("控制力已释放 · 核心稳定");
    navigator.vibrate?.(12);
  }, [control, ended, paused]);

  const phase = phaseFor(excitement, inputting);
  return {
    records, difficulty, setDifficulty, isReady, setIsReady, paused, setPaused, ended, inputting,
    excitement, stamina, control, score, combo, timeLeft, longestCritical, feedback, phase, pistonPosition, pumpCount, released,
    updateRecords, reset, startInput, moveInput, stopInput, useControl,
  };
}

function Meter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="min-w-0"><div className="mb-2 flex justify-between text-[10px] font-bold tracking-[0.18em] text-slate-400"><span>{label}</span><span className="font-mono text-slate-200">{Math.round(value)}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full transition-[width] duration-200 ${tone}`} style={{ width: `${value}%` }} /></div></div>;
}

function EnergyPump({ excitement, inputting, pistonPosition, pumpCount, critical, danger, released }: { excitement: number; inputting: boolean; pistonPosition: number; pumpCount: number; critical: boolean; danger: boolean; released: boolean }) {
  const liquidTone = danger ? "from-red-500 via-orange-400 to-amber-200" : critical ? "from-amber-500 via-orange-300 to-yellow-100" : "from-cyan-500 via-sky-300 to-cyan-100";
  const travel = ((pistonPosition - 50) / 50) * 88;
  return <div className="relative h-[340px] w-[290px] sm:h-[380px] sm:w-[330px]" aria-hidden="true">
    {released && <><div className={`absolute left-1/2 top-[-74px] h-32 w-16 -translate-x-1/2 rounded-full bg-gradient-to-t ${liquidTone} opacity-95 blur-sm animate-[pulse_.22s_ease-in-out_infinite]`} /><div className="absolute left-1/2 top-[-48px] h-16 w-44 -translate-x-1/2 rounded-[100%] bg-cyan-200/60 blur-xl" /><div className="absolute left-[43%] top-[-36px] h-24 w-2 rotate-12 rounded-full bg-cyan-100/80 blur-[1px]" /><div className="absolute left-[56%] top-[-38px] h-24 w-2 -rotate-12 rounded-full bg-cyan-100/70 blur-[1px]" /></>}
    <div className="absolute left-1/2 top-2 h-10 w-12 -translate-x-1/2 rounded-t-lg border-x border-t border-cyan-100/30 bg-slate-900/80" />
    <div className="absolute left-[calc(50%-8px)] top-10 h-20 w-4 rounded-full border border-cyan-100/30 bg-slate-800/80" />
    <div className="absolute left-1/2 top-[94px] h-[188px] w-[152px] -translate-x-1/2 overflow-hidden rounded-[2.4rem] border border-cyan-100/35 bg-slate-950/45 shadow-[inset_0_0_30px_rgba(34,211,238,.12)] sm:top-[104px] sm:h-[214px]">
      <div className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-cyan-100/15" />
      <div className="absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-cyan-100/10" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.13),transparent)] opacity-50" />
      <div className="absolute inset-x-0 top-3 text-center font-mono text-[10px] font-bold tracking-[.2em] text-cyan-50/70">PUMP CORE</div>
      <div className="absolute left-1/2 top-1/2 h-[58px] w-[136px] -translate-x-1/2 rounded-2xl border border-cyan-100/30 bg-[#0b2032]/95 shadow-lg will-change-transform" style={{ transform: `translateX(-50%) translateY(calc(-50% + ${travel}px))` }}>
        <div className="absolute inset-x-4 top-1/2 h-1 -translate-y-1/2 rounded-full bg-cyan-100/30" />
        <div className={`absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-100 bg-cyan-300 transition-transform ${inputting ? "scale-125 shadow-[0_0_20px_rgba(103,232,249,.9)]" : ""}`} />
      </div>
    </div>
    <div className="absolute bottom-10 left-1/2 h-3 w-56 -translate-x-1/2 overflow-hidden rounded-full border border-cyan-100/20 bg-white/8">
      <div className={`h-full rounded-full bg-gradient-to-r ${liquidTone} transition-[width] duration-150`} style={{ width: `${excitement}%` }} />
    </div>
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center"><p className="font-mono text-2xl font-bold text-slate-100">{Math.round(excitement)}<span className="text-xs text-slate-500">%</span></p><p className="mt-1 text-[9px] font-bold tracking-[.18em] text-slate-500">PUMP STROKES {pumpCount}</p></div>
  </div>;
}

function RouteComponent() {
  const game = usePulseControl();
  const danger = game.phase === "danger" || game.phase === "overload";
  const critical = game.phase === "critical" || danger;
  const status = danger ? "立即放缓" : critical ? "准备回落" : game.phase === "recovering" ? "临界回落" : game.inputting ? "维持节奏" : "等待输入";

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" || event.code === "ArrowUp" || event.code === "ArrowDown") {
        event.preventDefault(); game.startInput(window.innerHeight / 2, 50);
      }
      if (event.code === "KeyC") game.useControl();
    };
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", game.stopInput);
    return () => { window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", game.stopInput); };
  }, [game]);

  return <main className="min-h-dvh overflow-hidden bg-[#030914] font-sans text-slate-100 selection:bg-cyan-300/30">
    <div className="pointer-events-none fixed inset-0 opacity-70 [background-image:linear-gradient(rgba(94,234,212,.045)_1px,transparent_1px),linear-gradient(90deg,rgba(94,234,212,.045)_1px,transparent_1px)] [background-size:42px_42px]" />
    <div className={`pointer-events-none fixed inset-0 transition duration-500 ${danger ? "bg-[radial-gradient(circle_at_center,rgba(239,68,68,.25),transparent_55%)]" : "bg-[radial-gradient(circle_at_50%_38%,rgba(8,145,178,.18),transparent_50%)]"}`} />
    <section className="relative mx-auto flex min-h-dvh max-w-7xl flex-col px-4 pb-5 pt-4 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between border-b border-white/10 pb-4">
        <div><p className="text-[10px] font-bold tracking-[.28em] text-cyan-300">PULSE CONTROL</p><h1 className="mt-1 text-lg font-semibold tracking-tight">临界控制</h1></div>
        <div className="flex items-center gap-2">
          <select aria-label="选择难度" value={game.difficulty} onChange={(event) => game.setDifficulty(event.target.value as Difficulty)} className="h-10 rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-slate-200 outline-none focus:ring-2 focus:ring-cyan-300"><option value="starter">新手</option><option value="focus">专注</option><option value="extreme">极限</option></select>
          <button aria-label={game.records.muted ? "打开音效" : "关闭音效"} onClick={() => game.updateRecords({ muted: !game.records.muted })} className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10">{game.records.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
          <button aria-label={game.paused ? "继续" : "暂停"} onClick={() => game.setPaused(!game.paused)} disabled={!game.isReady || game.ended} className="grid size-10 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 disabled:opacity-40">{game.paused ? <Play size={17} /> : <Pause size={17} />}</button>
        </div>
      </header>

      <div className="grid flex-1 items-center gap-6 py-6 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
        <aside className="order-2 grid grid-cols-2 gap-4 rounded-2xl border border-white/8 bg-white/[.035] p-4 backdrop-blur-sm lg:order-1 lg:grid-cols-1"><Meter label="兴奋度" value={game.excitement} tone={danger ? "bg-red-400" : "bg-gradient-to-r from-cyan-400 to-amber-300"} /><Meter label="耐力" value={game.stamina} tone="bg-emerald-400" /><Meter label="控制力" value={game.control * 20} tone="bg-sky-300" /><div><p className="text-[10px] font-bold tracking-[.18em] text-slate-400">当前倍率</p><p className="mt-2 font-mono text-2xl text-amber-200">x{(1 + game.combo * 0.3).toFixed(1)}</p></div></aside>

        <section className="relative flex min-h-[430px] flex-col items-center justify-center overflow-hidden rounded-[2rem] border border-white/10 bg-[#071321]/70 px-5 py-10 shadow-2xl shadow-cyan-950/30" aria-label="压力储能泵互动区域">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/60 to-transparent" />
          <div className="absolute top-6 flex items-center gap-3 text-xs font-medium tracking-wide"><span className={`size-2 rounded-full ${danger ? "animate-ping bg-red-400" : "bg-cyan-300"}`} /><span className={danger ? "text-red-200" : "text-slate-400"}>{status}</span></div>
          <button type="button" aria-label="在压力储能泵上上拉复位并向下压送能量" onPointerDown={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); const position = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)); event.currentTarget.setPointerCapture(event.pointerId); game.startInput(event.clientY, position); }} onPointerMove={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); const position = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100)); game.moveInput(event.clientY, position); }} onPointerUp={game.stopInput} onPointerCancel={game.stopInput} onPointerLeave={game.stopInput} className="relative grid h-[390px] w-full max-w-md touch-none place-items-center rounded-3xl outline-none focus-visible:ring-4 focus-visible:ring-cyan-300/60">
            <div className={`absolute inset-x-12 bottom-8 top-12 rounded-[3rem] border border-cyan-200/10 bg-cyan-300/[.02] ${critical ? "animate-[pulse_1.2s_ease-in-out_infinite]" : ""}`} />
            <EnergyPump excitement={game.excitement} inputting={game.inputting} pistonPosition={game.pistonPosition} pumpCount={game.pumpCount} critical={critical} danger={danger} released={game.released} />
          </button>
          <p className="mt-8 max-w-sm text-center text-sm leading-6 text-slate-400">{game.feedback}</p>
          <p className="mt-2 text-center text-[10px] tracking-[.16em] text-slate-600">上拉复位，再向下压送 &nbsp;·&nbsp; 空格 / 上下方向键 &nbsp;·&nbsp; C 使用控制力</p>
          {game.ended && <button onClick={game.reset} className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"><RotateCcw size={16} />再来一次</button>}
        </section>

        <aside className="order-3 grid grid-cols-3 gap-3 lg:grid-cols-1"><div className="rounded-2xl border border-white/8 bg-white/[.035] p-4"><p className="text-[10px] font-bold tracking-[.18em] text-slate-400">本局得分</p><p className="mt-2 font-mono text-2xl text-white">{game.score.toLocaleString()}</p></div><div className="rounded-2xl border border-white/8 bg-white/[.035] p-4"><p className="text-[10px] font-bold tracking-[.18em] text-slate-400">连击</p><p className="mt-2 font-mono text-2xl text-cyan-200">{game.combo}</p></div><div className="rounded-2xl border border-white/8 bg-white/[.035] p-4"><p className="text-[10px] font-bold tracking-[.18em] text-slate-400">剩余时间</p><p className="mt-2 font-mono text-2xl text-amber-200">{Math.ceil(game.timeLeft)}<span className="text-sm">s</span></p></div><button onClick={game.useControl} disabled={game.control === 0 || game.ended} className="col-span-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-300/30 bg-sky-300/10 text-xs font-bold text-sky-100 transition hover:bg-sky-300/20 disabled:opacity-40 lg:col-span-1"><ShieldCheck size={16} />释放控制力 ({game.control})</button></aside>
      </div>
      <footer className="flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-medium tracking-[.12em] text-slate-500"><span>最高分 {game.records.highScore.toLocaleString()} · 最佳连击 {game.records.bestCombo}</span><button onClick={() => game.updateRecords({ privacyMode: !game.records.privacyMode })} className="underline decoration-cyan-500/50 underline-offset-4">隐私模式：{game.records.privacyMode ? "开启" : "关闭"}</button></footer>
    </section>

    {!game.isReady && <div className="fixed inset-0 z-20 grid place-items-center bg-[#020711]/85 p-4 backdrop-blur-md"><div className="w-full max-w-md rounded-3xl border border-cyan-200/15 bg-[#081524] p-7 shadow-2xl shadow-black/60"><div className="mb-5 grid size-12 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-200"><ShieldCheck /></div><p className="text-xs font-bold tracking-[.2em] text-cyan-300">PRIVATE FOCUS SESSION</p><h2 className="mt-2 text-2xl font-semibold">准备开始临界控制</h2><p className="mt-3 text-sm leading-6 text-slate-400">这是一个抽象节奏挑战。稳定升温，进入临界后主动回落；目标不是冲向终点，而是在边界前保持控制。</p><label className="mt-6 flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[.03] px-4 py-3 text-sm"><span>隐私模式</span><input checked={game.records.privacyMode} onChange={(event) => game.updateRecords({ privacyMode: event.target.checked })} type="checkbox" className="size-4 accent-cyan-300" /></label><button onClick={() => game.setIsReady(true)} className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-cyan-300 text-sm font-bold text-slate-950 transition hover:bg-cyan-200">进入挑战</button></div></div>}
  </main>;
}
