"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { Baskervville, Source_Serif_4 } from "next/font/google";
import {
  Upload,
  Play,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  RefreshCw,
  BarChart2,
  Sun,
  Moon,
  Film,
  Layers,
  Clock,
  X,
  Check,
  Trash2,
  FileSpreadsheet,
  Gauge,
  FlaskConical,
  SlidersHorizontal,
  Download,
  Link2,
  Languages,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

// ── Fonts ────────────────────────────────────────────────────────────────
// Baskervville (bản Baskerville miễn phí của Google Fonts) chỉ có latin/latin-ext,
// KHÔNG có glyph tiếng Việt → tiếng Anh dùng Baskervville, tiếng Việt tự chuyển
// sang Source Serif 4 (serif chuyển tiếp, gần Baskerville, có đủ dấu tiếng Việt).
const baskerville = Baskervville({
  subsets: ["latin", "latin-ext"],
  variable: "--font-baskerville",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin", "latin-ext", "vietnamese"],
  variable: "--font-source-serif",
  display: "swap",
});

// ── i18n ─────────────────────────────────────────────────────────────────
// t(vi, en): trả về chuỗi theo ngôn ngữ hiện tại. CURRENT_LANG được component
// gốc cập nhật mỗi lần render nên mọi component con đều dùng được t() trực tiếp.
type Lang = "vi" | "en";
let CURRENT_LANG: Lang = "vi";
function t(vi: string, en: string): string {
  return CURRENT_LANG === "vi" ? vi : en;
}

// ── Nền mạng neural (node + liên kết + xung tín hiệu, seed cố định) ─────
function NeuralBackground({ isDarkMode }: { isDarkMode: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rand = mulberry32(20260614);
    const lineRGB = isDarkMode ? "38,139,210" : "88,110,117";
    const nodeRGB = isDarkMode ? "147,161,161" : "88,110,117";
    const pulseRGB = isDarkMode ? "42,161,152" : "38,139,210";
    const LINK = 150;

    type Node = { x: number; y: number; vx: number; vy: number; r: number };
    type Pulse = { a: number; b: number; p: number };
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];
    let w = 0, h = 0, frame = 0, raf = 0;

    const resize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(80, Math.max(24, (w * h) / 22000)));
      nodes = Array.from({ length: n }, () => ({
        x: rand() * w,
        y: rand() * h,
        vx: (rand() - 0.5) * 0.28,
        vy: (rand() - 0.5) * 0.28,
        r: 1.2 + rand() * 1.6,
      }));
      pulses = [];
    };

    const draw = (move: boolean) => {
      ctx.clearRect(0, 0, w, h);

      if (move) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < 0 || n.x > w) n.vx *= -1;
          if (n.y < 0 || n.y > h) n.vy *= -1;
        }
      }

      const near: [number, number][] = [];
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) {
            near.push([i, j]);
            ctx.strokeStyle = `rgba(${lineRGB},${(1 - d / LINK) * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      for (const n of nodes) {
        ctx.fillStyle = `rgba(${nodeRGB},0.75)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      if (move) {
        frame++;
        if (frame % 36 === 0 && near.length > 0 && pulses.length < 14) {
          const [a, b] = near[Math.floor(rand() * near.length)];
          pulses.push({ a, b, p: 0 });
        }
        pulses = pulses.filter((q) => q.p < 1);
        for (const q of pulses) {
          q.p += 0.018;
          const A = nodes[q.a], B = nodes[q.b];
          const x = A.x + (B.x - A.x) * q.p;
          const y = A.y + (B.y - A.y) * q.p;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
          g.addColorStop(0, `rgba(${pulseRGB},0.9)`);
          g.addColorStop(1, `rgba(${pulseRGB},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = () => {
      if (!document.hidden) draw(true);
      raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener("resize", resize);
    if (reduce) draw(false);
    else raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [isDarkMode]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none opacity-70"
    />
  );
}

type ScorePoint = { time: number; score: number };

type AnalysisResult = {
  isSynthetic: boolean;
  confidence: number;
  probability_ai?: number;
};

type BatchStatus = "queued" | "processing" | "done" | "error";

type VideoResult = {
  result: AnalysisResult;
  scores: ScorePoint[];
  error?: string;
  processingTime?: number; // giây: thời gian model xử lý xong video này
};

type BatchItem = {
  id: string;
  name: string;
  file?: File;
  sourceUrl?: string;
  previewUrl?: string;
  status: BatchStatus;
  result?: VideoResult;
  error?: string;
};

const DEFAULT_THRESHOLD = 0.5;
const NGROK_BASE = "https://derived-expanse-roundish.ngrok-free.dev";

let idCounter = 0;

function makeId() {
  idCounter += 1;
  return `vid_${Date.now()}_${idCounter}`;
}

function classifyWithThreshold(result: AnalysisResult, threshold: number) {
  const p = result.probability_ai ?? (result.isSynthetic ? 1 : 0);
  const isSynthetic = p > threshold;
  const confidence = isSynthetic ? p : 1 - p;
  return { isSynthetic, confidence, probability_ai: p };
}

function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  if (sec < 60) return `${sec.toFixed(2)} s`;
  const m = Math.floor(sec / 60);
  const r = sec - m * 60;
  return `${m} ${t("phút", "min")} ${r.toFixed(1)} s`;
}

// Đồng hồ chạy trực tiếp trong lúc video đang được xử lý.
function LiveTimer({ className = "" }: { className?: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const id = setInterval(
      () => setElapsed((performance.now() - start) / 1000),
      100
    );
    return () => clearInterval(id);
  }, []);

  return <span className={`tabular-nums ${className}`}>{formatDuration(elapsed)}</span>;
}

// Backend trả về 1 object phẳng: {label, probability_ai, confidence, scores}.
function parseBackendResult(r: any): VideoResult {
  if (!r || r.error) {
    return {
      result: { isSynthetic: false, confidence: 0, probability_ai: 0 },
      scores: [],
      error: r?.error ?? t("Không có kết quả trả về.", "No result was returned."),
    };
  }

  return {
    result: {
      isSynthetic: r.label,
      confidence: r.confidence,
      probability_ai: r.probability_ai,
    },
    processingTime:
      typeof r.processing_time_sec === "number"
        ? r.processing_time_sec
        : undefined,
    scores: Array.isArray(r.scores)
      ? r.scores.map((p: any) => ({
          time: Number(p.time),
          score: Number(p.score),
        }))
      : [],
  };
}

async function postToBackend(path: string, formData: FormData): Promise<VideoResult> {
  const startedAt = performance.now();
  const response = await fetch(`${NGROK_BASE}${path}`, {
    method: "POST",
    body: formData,
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!response.ok) {
    let message = `Server returned status: ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.error) message = errBody.error;
    } catch {}
    throw new Error(message);
  }

  const parsed = parseBackendResult(await response.json());
  // Ưu tiên thời gian model do backend đo; nếu backend cũ chưa trả về thì dùng
  // tổng thời gian chờ phía trình duyệt (gồm cả upload).
  if (parsed.processingTime === undefined && !parsed.error) {
    parsed.processingTime = (performance.now() - startedAt) / 1000;
  }
  return parsed;
}

async function analyzeVideoFile(file: File): Promise<VideoResult> {
  const formData = new FormData();
  formData.append("file", file);
  return postToBackend("/upload/", formData);
}

async function analyzeVideoUrl(url: string): Promise<VideoResult> {
  const formData = new FormData();
  formData.append("url", url);
  return postToBackend("/upload_url/", formData);
}

function stringSeed(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateMockResult(
  key: string,
  groundTruth?: number
): Promise<VideoResult> {
  return new Promise((resolve) => {
    const delay = 350 + Math.random() * 900;

    setTimeout(() => {
      const rng = mulberry32(stringSeed(key));

      let base: number;

      if (groundTruth === 1) base = 0.55 + rng() * 0.4;
      else if (groundTruth === 0) base = rng() * 0.4;
      else base = rng();

      const flip = rng() < 0.18;
      let probability_ai = flip ? 1 - base : base;
      probability_ai = Math.min(0.99, Math.max(0.01, probability_ai));

      const isSynthetic = probability_ai > 0.5;
      const confidence = isSynthetic ? probability_ai : 1 - probability_ai;

      const duration = 8 + rng() * 40;
      const scores: ScorePoint[] = [];

      for (let t = 0; t <= duration; t += 1) {
        const noise = (rng() - 0.5) * 0.25;
        scores.push({
          time: Math.round(t * 100) / 100,
          score: Math.min(1, Math.max(0, probability_ai + noise)),
        });
      }

      resolve({
        result: {
          isSynthetic,
          confidence: Math.round(confidence * 10000) / 10000,
          probability_ai: Math.round(probability_ai * 10000) / 10000,
        },
        scores,
        processingTime: Math.round(delay) / 1000,
      });
    }, delay);
  });
}

function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);

  if (lines.length === 0) return [];

  const parseLine = (line: string): string[] => {
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];

      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }

    cells.push(cur);
    return cells.map((c) => c.trim());
  };

  const headers = parseLine(lines[0]).map((h) => h.toLowerCase());

  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const row: Record<string, string> = {};

    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });

    return row;
  });
}

function buildLabelMap(rows: Record<string, string>[]): Map<string, number> {
  const map = new Map<string, number>();

  for (const row of rows) {
    const name = (
      row["name"] ??
      row["filename"] ??
      row["file"] ??
      row["video"] ??
      ""
    ).trim();

    const rawLabel =
      row["label"] ??
      row["class"] ??
      row["ground_truth"] ??
      row["y"] ??
      "";

    if (!name || rawLabel === "") continue;

    const num = Number(rawLabel);
    let label: number;

    if (!Number.isNaN(num)) {
      label = num > 0 ? 1 : 0;
    } else {
      label = /^(ai|fake|synthetic)$/i.test(rawLabel.trim()) ? 1 : 0;
    }

    map.set(name, label);
  }

  return map;
}

type Metrics = {
  n: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  accuracy: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
  auroc: number | null;
  nPos: number;
  nNeg: number;
};

function computeMetrics(
  items: BatchItem[],
  labelMap: Map<string, number>,
  threshold: number
): Metrics | null {
  const evaluable = items
    .filter(
      (it) =>
        it.status === "done" &&
        it.result &&
        !it.result.error &&
        labelMap.has(it.name)
    )
    .map((it) => {
      const truth = labelMap.get(it.name) as number;
      const classified = classifyWithThreshold(it.result!.result, threshold);
      const pred = classified.isSynthetic ? 1 : 0;
      const score = classified.probability_ai;

      return { score, pred, truth };
    });

  if (evaluable.length === 0) return null;

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;

  for (const e of evaluable) {
    if (e.pred === 1 && e.truth === 1) tp++;
    else if (e.pred === 1 && e.truth === 0) fp++;
    else if (e.pred === 0 && e.truth === 1) fn++;
    else tn++;
  }

  const n = evaluable.length;
  const accuracy = (tp + tn) / n;

  const precision: number | null = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall: number | null = tp + fn > 0 ? tp / (tp + fn) : null;
  const f1: number | null =
    precision != null && recall != null
      ? precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0
      : null;

  const nPos = evaluable.filter((e) => e.truth === 1).length;
  const nNeg = evaluable.filter((e) => e.truth === 0).length;

  let auroc: number | null = null;

  if (nPos > 0 && nNeg > 0) {
    const sorted = [...evaluable].sort((a, b) => a.score - b.score);
    const ranks = new Array(sorted.length).fill(0);

    let i = 0;

    while (i < sorted.length) {
      let j = i;

      while (j + 1 < sorted.length && sorted[j + 1].score === sorted[i].score) {
        j++;
      }

      const avgRank = (i + 1 + j + 1) / 2;

      for (let k = i; k <= j; k++) {
        ranks[k] = avgRank;
      }

      i = j + 1;
    }

    let sumRankPos = 0;

    sorted.forEach((e, idx) => {
      if (e.truth === 1) sumRankPos += ranks[idx];
    });

    auroc = (sumRankPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
  }

  return {
    n,
    tp,
    fp,
    fn,
    tn,
    accuracy,
    precision,
    recall,
    f1,
    auroc,
    nPos,
    nNeg,
  };
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildResultsCsv(
  items: BatchItem[],
  labelMap: Map<string, number>,
  threshold: number
): string {
  const header = [
    "name",
    "predicted_label",
    "synthetic_score",
    "ground_truth_label",
    "match",
    "processing_time_sec",
  ];

  const rows: string[] = [];

  items.forEach((it) => {
    if (it.status !== "done" || !it.result || it.result.error) return;

    const classified = classifyWithThreshold(it.result.result, threshold);
    const predictedLabel = classified.isSynthetic ? "AI" : "Real";
    const groundTruthRaw = labelMap.get(it.name);
    const groundTruthLabel =
      groundTruthRaw === undefined ? "" : groundTruthRaw === 1 ? "AI" : "Real";

    const match =
      groundTruthRaw === undefined
        ? ""
        : (classified.isSynthetic ? 1 : 0) === groundTruthRaw
        ? "correct"
        : "incorrect";

    rows.push(
      [
        escapeCsvField(it.name),
        predictedLabel,
        classified.probability_ai.toFixed(4),
        groundTruthLabel,
        match,
        it.result.processingTime !== undefined
          ? it.result.processingTime.toFixed(2)
          : "",
      ].join(",")
    );
  });

  return [header.join(","), ...rows].join("\r\n");
}

function downloadResultsCsv(
  items: BatchItem[],
  labelMap: Map<string, number>,
  threshold: number
) {
  const csvContent = buildResultsCsv(items, labelMap, threshold);
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = `ket_qua_threshold_${Math.round(threshold * 100)}.csv`;

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type Theme = {
  bgMain: string;
  bgCard: string;
  textMain: string;
  textHeading: string;
  textSub: string;
  border: string;
  inputBg: string;
  btnCancel: string;
};

const INTEGRITY_CSS = `
  .integrity-ui,
  .integrity-ui * {
    font-family: var(--font-ui), Baskerville, "Baskerville Old Face", Georgia, "Times New Roman", serif !important;
  }

  html { scroll-behavior: smooth; }

  .integrity-ui {
    line-height: 1.6;
    font-variant-numeric: lining-nums tabular-nums;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }
  .integrity-ui h1 { letter-spacing: -0.01em; line-height: 1.15; }
  .integrity-ui h2 { letter-spacing: 0.08em; }

  /* Chuyển động mượt cho mọi thành phần tương tác */
  .integrity-ui :where(div, button, a, span, label, input, select, textarea, p, tr, td, th) {
    transition-property: color, background-color, border-color, opacity, transform, box-shadow, filter;
    transition-duration: 0.25s;
    transition-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* Góc bo nhẹ, bóng rất mờ, không gradient */
  .integrity-ui :where(button, input, select, textarea, label) { border-radius: 4px; }
  .integrity-ui div[class*="border"] { border-radius: 4px; }
  .integrity-ui .app-header,
  .integrity-ui .app-header div[class*="border"] { border-radius: 0; }
  .integrity-ui .app-header div[class*="border"] { border-radius: 4px; }
  .integrity-ui button[class*="border-b"] { border-radius: 0; }
  .integrity-ui video { border-radius: 4px; }
  .integrity-ui div[class*="bg-[#073642]"],
  .integrity-ui div[class*="bg-[#eee8d5]"] {
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 6px 16px -12px rgba(0, 0, 0, 0.25);
  }
  .integrity-ui .app-header { box-shadow: 0 4px 12px -10px rgba(0, 0, 0, 0.35); }

  /* Phản hồi khi di chuột / bấm */
  .integrity-ui [class*="cursor-pointer"]:hover { transform: translateY(-1px); }
  .integrity-ui button:not(:disabled):hover { filter: brightness(1.07); }
  .integrity-ui button:not(:disabled):active { transform: scale(0.98); }
  .integrity-ui :focus-visible { outline: 2px solid #268bd2; outline-offset: 2px; }

  @keyframes fade-in-up {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: none; }
  }
  .fade-in-up { animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .fade-in-up { animation: none; }
    .integrity-ui :where(div, button, a, span, label, input, select, textarea, p, tr, td, th) {
      transition-duration: 0.01ms;
    }
  }
`;


function ResultSummary({
  result,
  theme,
  threshold,
  processingTime,
}: {
  result: AnalysisResult;
  theme: Theme;
  threshold: number;
  processingTime?: number;
}) {
  const classified = classifyWithThreshold(result, threshold);
  const prob = classified.probability_ai;

  return (
    <div className="space-y-6">
      <div
        className={`p-4 border flex items-center gap-4 ${
          classified.isSynthetic
            ? `${theme.bgMain} border-[#dc322f]/50 text-[#dc322f]`
            : `${theme.bgMain} border-[#859900]/50 text-[#859900]`
        }`}
      >
        {classified.isSynthetic ? (
          <ShieldAlert className="w-10 h-10 shrink-0 text-[#dc322f]" />
        ) : (
          <ShieldCheck className="w-10 h-10 shrink-0 text-[#859900]" />
        )}

        <div>
          <h3 className="font-semibold text-lg">
            {classified.isSynthetic ? t("Khả năng cao Video AI", "Likely an AI video") : t("Video thật", "Real video")}
          </h3>
          <p className={`text-xs opacity-80 mt-1 ${theme.textMain}`}>
            {classified.isSynthetic
              ? t("Hệ thống phát hiện ra những artifact đặc trưng của các công cụ Diffusion.", "The system detected artifacts typical of Diffusion tools.")
              : t("Khả năng cao video này không được tạo bởi các công cụ Diffusion.", "This video was most likely not made by Diffusion tools.")}
          </p>
        </div>
      </div>

      <div
        className={`${theme.bgMain} p-4 border ${theme.border} transition-colors`}
      >
        <div className="flex justify-between text-xs mb-2">
          <span className={theme.textSub}>{t("Khả năng AI:", "AI probability:")}</span>
          <span className={`font-bold ${theme.textHeading}`}>
            {(prob * 100).toFixed(1)}%
          </span>
        </div>

        <div
          className={`relative w-full ${theme.bgCard} h-3 overflow-hidden border ${theme.border}`}
        >
          <div
            className="bg-[#dc322f] h-full transition-all duration-1000"
            style={{ width: `${prob * 100}%` }}
          ></div>

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80"
            style={{ left: `${threshold * 100}%` }}
            title={`Threshold: ${(threshold * 100).toFixed(0)}%`}
          ></div>
        </div>
      </div>

      <div className="space-y-2 text-xs">
        <div className={`flex justify-between py-2 border-b ${theme.border}`}>
          <span className={theme.textMain}>{t("Model Back-end:", "Backend model:")}</span>
          <span className={`${theme.textHeading} tabular-nums`}>
            FastAPI + PyTorch Pipeline
          </span>
        </div>

        <div className={`flex justify-between py-2 border-b ${theme.border}`}>
          <span className={theme.textMain}>{t("Điểm nghi ngờ:", "Suspicion score:")}</span>
          <span className={`${theme.textHeading} tabular-nums`}>
            {prob.toFixed(4)}
          </span>
        </div>

        {processingTime !== undefined && (
          <div className={`flex justify-between py-2 border-b ${theme.border}`}>
            <span className={`${theme.textMain} flex items-center gap-1.5`}>
              <Clock className="w-3.5 h-3.5 text-[#268bd2]" />
              {t("Thời gian xử lý:", "Processing time:")}
            </span>
            <span className={`${theme.textHeading} tabular-nums font-semibold`}>
              {formatDuration(processingTime)}
            </span>
          </div>
        )}

        <div className={`flex justify-between py-2 border-b ${theme.border}`}>
          <span className={theme.textMain}>{t("Threshold đang dùng:", "Active threshold:")}</span>
          <span className={`${theme.textHeading} tabular-nums`}>
            {threshold.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

function ScoreChart({
  data,
  currentTime,
  onSeek,
  isDarkMode,
  threshold,
  height = 340,
}: {
  data: ScorePoint[];
  currentTime: number;
  onSeek: (t: number) => void;
  isDarkMode: boolean;
  threshold: number;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 70, left: 0, bottom: 20 }}
        onClick={(state: any) => {
          if (state && state.activeLabel != null) {
            onSeek(Number(state.activeLabel));
          }
        }}
        style={{ cursor: "pointer" }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={isDarkMode ? "#0a4a58" : "#d9d2b8"}
        />
        <XAxis
          dataKey="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          tick={{
            fill: isDarkMode ? "#839496" : "#586e75",
            fontSize: 12,
          }}
          label={{
            value: t("Thời gian (giây)", "Time (seconds)"),
            position: "bottom",
            offset: 0,
            fill: isDarkMode ? "#839496" : "#586e75",
          }}
        />
        <YAxis
          domain={[0, 1]}
          tick={{
            fill: isDarkMode ? "#839496" : "#586e75",
            fontSize: 12,
          }}
          label={{
            value: t("Điểm AI", "Synthetic score"),
            angle: -90,
            position: "insideLeft",
            fill: isDarkMode ? "#839496" : "#586e75",
          }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: isDarkMode ? "#073642" : "#eee8d5",
            border: `1px solid ${isDarkMode ? "#0a4a58" : "#d9d2b8"}`,
            fontSize: 12,
          }}
          labelFormatter={(t) => `t = ${Number(t).toFixed(2)}s`}
          formatter={(v) => [Number(v).toFixed(3), "Synthetic score"]}
        />
        <Legend
          verticalAlign="top"
          align="right"
          wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
        />
        <Line
          type="monotone"
          dataKey="score"
          name="Synthetic score"
          stroke="#859900"
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <ReferenceLine
          y={threshold}
          stroke={isDarkMode ? "#839496" : "#586e75"}
          strokeDasharray="4 4"
          label={{
            value: t("Ngưỡng", "Threshold"),
            position: "right",
            fill: isDarkMode ? "#839496" : "#586e75",
            fontSize: 11,
          }}
        />
        <ReferenceLine
          x={currentTime}
          stroke="#dc322f"
          strokeWidth={2}
          label={{
            value: t("Thời điểm hiện tại", "Current time"),
            position: "top",
            fill: "#dc322f",
            fontSize: 11,
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function MetricBox({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: Theme;
}) {
  return (
    <div
      className={`${theme.bgMain} border ${theme.border} p-3 text-center`}
    >
      <p className={`text-[11px] uppercase tracking-wider ${theme.textSub} mb-1`}>
        {label}
      </p>
      <p className={`text-xl font-bold ${theme.textHeading} tabular-nums`}>
        {value}
      </p>
    </div>
  );
}

function BatchGridCard({
  item,
  groundTruth,
  threshold,
  isSelected,
  onSelect,
  onRemove,
  disableRemove,
}: {
  item: BatchItem;
  groundTruth: number | undefined;
  threshold: number;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  disableRemove: boolean;
}) {
  const activeEntry = item.status === "done" ? item.result : undefined;

  const classified =
    activeEntry && !activeEntry.error
      ? classifyWithThreshold(activeEntry.result, threshold)
      : null;

  const predicted = classified ? (classified.isSynthetic ? 1 : 0) : undefined;
  const hasGroundTruth = groundTruth !== undefined;
  const isCorrect =
    hasGroundTruth && predicted !== undefined
      ? predicted === groundTruth
      : undefined;

  const missingResult = item.status === "done" && !classified;

  let borderColor = "#0a4a58";

  if (item.status === "processing") borderColor = "#268bd2";
  else if (item.status === "error") borderColor = "#dc322f";
  else if (item.status === "done") {
    if (!classified) borderColor = "#586e75";
    else if (isCorrect === true) borderColor = "#859900";
    else if (isCorrect === false) borderColor = "#dc322f";
    else borderColor = predicted === 1 ? "#b58900" : "#268bd2";
  }

  return (
    <div
      className="relative overflow-hidden cursor-pointer bg-black"
      style={{
        border: `3px solid ${borderColor}`,
        outline: isSelected ? "2px solid white" : "none",
        outlineOffset: isSelected ? "1px" : "0",
      }}
      onClick={onSelect}
    >
      <div className="aspect-video w-full bg-black flex items-center justify-center">
        {item.previewUrl ? (
          <video
            src={item.previewUrl}
            muted
            preload="metadata"
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <Link2 className="w-6 h-6 text-white/40" />
        )}
      </div>

      <div className="absolute top-0 inset-x-0 px-2 py-1 bg-black/80 flex items-center justify-between gap-1">
        <span className="text-[10px] text-white/90 truncate">{item.name}</span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (!disableRemove) onRemove();
          }}
          className={`p-0.5 text-white/80 shrink-0 ${
            disableRemove ? "opacity-30 pointer-events-none" : "hover:opacity-70"
          }`}
        >
          <X className="w-3 h-3" />
        </span>
      </div>

      {item.status === "queued" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Clock className="w-6 h-6 text-white/70" />
        </div>
      )}

      {item.status === "processing" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <RefreshCw className="w-6 h-6 text-white animate-spin" />
        </div>
      )}

      {item.status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <X className="w-6 h-6 text-[#dc322f]" />
        </div>
      )}

      {item.status === "done" && classified && (
        <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-black/75 flex items-center justify-between">
          <span
            className={`text-[10px] font-bold ${
              classified.isSynthetic ? "text-[#dc322f]" : "text-[#859900]"
            }`}
          >
            {classified.isSynthetic ? "AI" : "Real"} ·{" "}
            {(classified.probability_ai * 100).toFixed(0)}%
          </span>

          {activeEntry?.processingTime !== undefined && (
            <span className="text-[10px] text-white/70 tabular-nums">
              {activeEntry.processingTime.toFixed(1)}s
            </span>
          )}

          {hasGroundTruth &&
            (isCorrect ? (
              <Check className="w-3.5 h-3.5 text-[#859900]" />
            ) : (
              <X className="w-3.5 h-3.5 text-[#dc322f]" />
            ))}
        </div>
      )}

      {missingResult && (
        <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-black/75">
          <span className="text-[10px] text-[#93a1a1]">
            {t("Chưa có kết quả", "No result yet")}
          </span>
        </div>
      )}
    </div>
  );
}

function DashboardView({
  theme,
  isDarkMode,
  mockMode,
  setMockMode,
  threshold,
  setThreshold,
  batchItems,
  labelMap,
  metrics,
  isBatchRunning,
  runAllBatch,
  removeBatchItem,
  handleBatchFilesSelected,
  handleAddBatchUrls,
  showBatchUrlBox,
  setShowBatchUrlBox,
  batchUrlText,
  setBatchUrlText,
  handleCsvFileSelected,
  csvInfo,
  downloadResultsCsv,
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  labelFilter,
  setLabelFilter,
  selectedBatchId,
  setSelectedBatchId,
  selectedBatchItem,
  activeBatchEntry,
  batchVideoRef,
  batchCurrentTime,
  handleBatchTimeUpdate,
  handleBatchSeek,
}: {
  theme: Theme;
  isDarkMode: boolean;
  mockMode: boolean;
  setMockMode: (v: boolean) => void;
  threshold: number;
  setThreshold: (v: number) => void;
  batchItems: BatchItem[];
  labelMap: Map<string, number>;
  metrics: ReturnType<typeof computeMetrics>;
  isBatchRunning: boolean;
  runAllBatch: () => void;
  removeBatchItem: (id: string) => void;
  handleBatchFilesSelected: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  handleAddBatchUrls: () => void;
  showBatchUrlBox: boolean;
  setShowBatchUrlBox: (v: boolean | ((prev: boolean) => boolean)) => void;
  batchUrlText: string;
  setBatchUrlText: (v: string) => void;
  handleCsvFileSelected: (
    e: React.ChangeEvent<HTMLInputElement>
  ) => void;
  csvInfo: { fileName: string; totalRows: number } | null;
  downloadResultsCsv: (
    items: BatchItem[],
    labelMap: Map<string, number>,
    threshold: number
  ) => void;
  search: string;
  setSearch: (v: string) => void;
  statusFilter: "all" | BatchStatus;
  setStatusFilter: (v: "all" | BatchStatus) => void;
  labelFilter: "all" | "ai" | "real" | "mismatch";
  setLabelFilter: (v: "all" | "ai" | "real" | "mismatch") => void;
  selectedBatchId: string | null;
  setSelectedBatchId: (id: string | null) => void;
  selectedBatchItem: BatchItem | null;
  activeBatchEntry: VideoResult | undefined;
  batchVideoRef: React.RefObject<HTMLVideoElement | null>;
  batchCurrentTime: number;
  handleBatchTimeUpdate: () => void;
  handleBatchSeek: (t: number) => void;
}) {
  const doneItems = batchItems.filter((it) => it.status === "done");

  const aiCount = doneItems.filter((it) => {
    const entry = it.result;

    return (
      entry &&
      !entry.error &&
      classifyWithThreshold(entry.result, threshold).isSynthetic
    );
  }).length;

  const queueCount = batchItems.filter(
    (it) => it.status === "queued" || it.status === "processing"
  ).length;

  const errorCount = batchItems.filter((it) => it.status === "error").length;

  const filteredItems = batchItems.filter((it) => {
    if (
      search.trim() &&
      !it.name.toLowerCase().includes(search.trim().toLowerCase())
    ) {
      return false;
    }

    if (statusFilter !== "all" && it.status !== statusFilter) {
      return false;
    }

    if (labelFilter !== "all") {
      const entry = it.result;

      if (!entry || entry.error) return false;

      const classified = classifyWithThreshold(entry.result, threshold);
      const truth = labelMap.get(it.name);

      if (labelFilter === "ai" && !classified.isSynthetic) return false;
      if (labelFilter === "real" && classified.isSynthetic) return false;

      if (
        labelFilter === "mismatch" &&
        (truth === undefined || (classified.isSynthetic ? 1 : 0) === truth)
      ) {
        return false;
      }
    }

    return true;
  });

  const statusLabel: Record<BatchStatus, string> = {
    queued: t("Chờ", "Queued"),
    processing: t("Đang chạy", "Running"),
    done: t("Xong", "Done"),
    error: t("Lỗi", "Error"),
  };

  const statusStyle: Record<BatchStatus, string> = {
    queued: "text-[#93a1a1] border-[#93a1a1]/40",
    processing: "text-[#268bd2] border-[#268bd2]/40",
    done: "text-[#859900] border-[#859900]/40",
    error: "text-[#dc322f] border-[#dc322f]/40",
  };

  return (
    <div className="relative">
      <h1 className={`text-2xl font-semibold ${theme.textHeading} mb-4`}>
        {t("Dashboard vận hành", "Operations dashboard")}
      </h1>

      <div
        className={`${theme.bgCard} border ${theme.border} p-4 mb-4 flex flex-wrap items-center gap-6`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <SlidersHorizontal className="w-4 h-4 text-[#268bd2] shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className={theme.textSub}>
                {t("Ngưỡng phân loại (threshold)", "Classification threshold")}
              </span>
              <span className={`font-bold ${theme.textHeading}`}>
                {(threshold * 100).toFixed(0)}%
              </span>
            </div>

            <input
              type="range"
              min={0.01}
              max={0.99}
              step={0.01}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full accent-[#859900] cursor-pointer"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer shrink-0 text-xs">
          <input
            type="checkbox"
            checked={mockMode}
            onChange={(e) => setMockMode(e.target.checked)}
            className="accent-[#b58900]"
          />
          <span
            className={`font-bold flex items-center gap-1 ${
              mockMode ? "text-[#b58900]" : theme.textHeading
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" /> {t("Chế độ test", "Test mode")}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <MetricBox
          label={t("Tổng video", "Total videos")}
          value={String(batchItems.length)}
          theme={theme}
        />
        <MetricBox
          label={t("Gắn nhãn AI", "Predicted AI")}
          value={
            doneItems.length
              ? `${Math.round((aiCount / doneItems.length) * 100)}%`
              : "—"
          }
          theme={theme}
        />
        <MetricBox
          label={t("Gắn nhãn Real", "Predicted Real")}
          value={
            doneItems.length
              ? `${Math.round(
                  ((doneItems.length - aiCount) / doneItems.length) * 100
                )}%`
              : "—"
          }
          theme={theme}
        />
        <MetricBox
          label="Accuracy (CSV)"
          value={
            metrics && metrics.n > 0
              ? `${(metrics.accuracy * 100).toFixed(1)}%`
              : "N/A"
          }
          theme={theme}
        />
        <MetricBox
          label="AUROC (CSV)"
          value={
            metrics && metrics.auroc != null ? metrics.auroc.toFixed(3) : "N/A"
          }
          theme={theme}
        />
        <MetricBox
          label={t("Đang xử lý / lỗi", "Processing / errors")}
          value={`${queueCount} / ${errorCount}`}
          theme={theme}
        />
      </div>

      {(!metrics || metrics.auroc == null) && (
        <p className={`text-[11px] ${theme.textSub} mb-4`}>
          {t(
            "AUROC và Accuracy cần file nhãn CSV, và AUROC cần có cả video Real lẫn AI trong tập đã chạy.",
            "AUROC and Accuracy need a CSV label file, and AUROC needs both Real and AI videos among the processed ones."
          )}
        </p>
      )}

      <div
        className={`${theme.bgCard} border ${theme.border} p-3 mb-2 flex flex-wrap items-center gap-2`}
      >
        <label
          className={`text-xs px-3 py-2 border ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-1.5`}
        >
          <Upload className="w-3.5 h-3.5" /> {t("Thêm video", "Add videos")}
          <input
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={handleBatchFilesSelected}
          />
        </label>

        <button
          onClick={() => setShowBatchUrlBox((v) => !v)}
          className={`text-xs px-3 py-2 border ${theme.border} ${theme.btnCancel} flex items-center gap-1.5`}
        >
          <Link2 className="w-3.5 h-3.5" /> {t("Thêm từ URL", "Add from URL")}
        </button>

        <label
          className={`text-xs px-3 py-2 border ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-1.5`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> {t("Nhãn CSV", "CSV labels")}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvFileSelected}
          />
        </label>

        <button
          onClick={() => downloadResultsCsv(batchItems, labelMap, threshold)}
          className={`text-xs px-3 py-2 border ${theme.border} ${theme.btnCancel} flex items-center gap-1.5`}
        >
          <Download className="w-3.5 h-3.5" /> {t("Xuất CSV", "Export CSV")}
        </button>

        <button
          onClick={runAllBatch}
          disabled={isBatchRunning}
          className="ml-auto text-xs font-bold px-4 py-2 border bg-[#859900] hover:brightness-110 text-[#002b36] disabled:opacity-50 flex items-center gap-1.5"
        >
          {isBatchRunning ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Cpu className="w-3.5 h-3.5" />
          )}
          {t("Chạy tất cả", "Run all")}
        </button>

        {csvInfo && (
          <span className={`text-[11px] ${theme.textSub} w-full`}>
            {t("Nhãn:", "Labels:")} {csvInfo.fileName} · {csvInfo.totalRows} {t("dòng", "rows")}
          </span>
        )}
      </div>

      {showBatchUrlBox && (
        <div
          className={`mb-4 p-3 border ${theme.border} ${theme.bgMain}`}
        >
          <textarea
            value={batchUrlText}
            onChange={(e) => setBatchUrlText(e.target.value)}
            placeholder={t("Dán link YouTube / TikTok / Facebook..., mỗi dòng 1 link", "Paste YouTube / TikTok / Facebook links, one per line")}
            rows={3}
            className={`w-full px-3 py-2 border ${theme.border} ${theme.inputBg} ${theme.textHeading} text-xs outline-none focus:border-[#859900] mb-2`}
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBatchUrlBox(false)}
              className={`text-xs px-3 py-1.5 border ${theme.border} ${theme.btnCancel}`}
            >
              {t("Hủy", "Cancel")}
            </button>

            <button
              onClick={handleAddBatchUrls}
              disabled={!batchUrlText.trim()}
              className="text-xs font-bold px-3 py-1.5 border bg-[#859900] hover:brightness-110 text-[#002b36] disabled:opacity-50"
            >
              {t("Thêm vào danh sách", "Add to list")}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Tìm tên hoặc URL video...", "Search by video name or URL...")}
          className={`flex-1 min-w-[200px] text-xs px-3 py-2 border ${theme.border} ${theme.inputBg} ${theme.textHeading} outline-none focus:border-[#859900]`}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className={`text-xs px-2 py-2 border ${theme.border} ${theme.inputBg} ${theme.textHeading}`}
        >
          <option value="all">{t("Tất cả trạng thái", "All statuses")}</option>
          <option value="queued">{t("Chờ", "Queued")}</option>
          <option value="processing">{t("Đang chạy", "Running")}</option>
          <option value="done">{t("Xong", "Done")}</option>
          <option value="error">{t("Lỗi", "Error")}</option>
        </select>

        <select
          value={labelFilter}
          onChange={(e) => setLabelFilter(e.target.value as any)}
          className={`text-xs px-2 py-2 border ${theme.border} ${theme.inputBg} ${theme.textHeading}`}
        >
          <option value="all">{t("Tất cả nhãn", "All labels")}</option>
          <option value="ai">{t("Dự đoán AI", "Predicted AI")}</option>
          <option value="real">{t("Dự đoán Real", "Predicted Real")}</option>
          <option value="mismatch">{t("Sai so với CSV", "Mismatch vs CSV")}</option>
        </select>
      </div>

      <div
        className={`${theme.bgCard} border ${theme.border} overflow-hidden`}
      >
        <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
          <table className="w-full text-xs">
            <thead className={`sticky top-0 ${theme.bgMain} z-10`}>
              <tr>
                <th
                  className={`text-left px-4 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  {t("Video / URL", "Video / URL")}
                </th>
                <th
                  className={`text-left px-2 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  {t("Trạng thái", "Status")}
                </th>
                <th
                  className={`text-left px-2 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  {t("Dự đoán", "Prediction")}
                </th>
                <th
                  className={`text-left px-2 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  {t("Xác suất", "Probability")}
                </th>
                <th
                  className={`text-left px-2 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  {t("Nhãn thật", "True label")}
                </th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className={`px-4 py-8 text-center ${theme.textSub}`}
                  >
                    {t("Chưa có video nào khớp bộ lọc. Thêm video hoặc URL ở thanh công cụ phía trên.", "No video matches the filters. Add videos or URLs from the toolbar above.")}
                  </td>
                </tr>
              )}

              {filteredItems.map((it) => {
                const entry = it.result;

                const classified =
                  entry && !entry.error
                    ? classifyWithThreshold(entry.result, threshold)
                    : null;

                const truth = labelMap.get(it.name);
                const truthLabel =
                  truth === undefined ? "—" : truth === 1 ? "AI" : "Real";

                const isMismatch =
                  classified &&
                  truth !== undefined &&
                  (classified.isSynthetic ? 1 : 0) !== truth;

                return (
                  <tr
                    key={it.id}
                    onClick={() => setSelectedBatchId(it.id)}
                    className={`border-t ${theme.border} cursor-pointer hover:opacity-80 ${
                      selectedBatchId === it.id ? `${theme.bgMain}` : ""
                    }`}
                  >
                    <td
                      className={`px-4 py-2 max-w-[280px] ${theme.textHeading} flex items-center gap-2`}
                    >
                      <div
                        className={`w-11 h-7 shrink-0 overflow-hidden ${theme.bgMain} border ${theme.border} flex items-center justify-center`}
                      >
                        {it.previewUrl ? (
                          <video
                            src={it.previewUrl}
                            muted
                            preload="metadata"
                            className="w-full h-full object-cover pointer-events-none"
                          />
                        ) : it.sourceUrl ? (
                          <Link2 className="w-3.5 h-3.5 text-[#93a1a1]" />
                        ) : (
                          <Film className="w-3.5 h-3.5 text-[#93a1a1]" />
                        )}
                      </div>
                      <span className="truncate">{it.name}</span>
                    </td>

                    <td className="px-2 py-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 border ${statusStyle[it.status]}`}
                      >
                        {statusLabel[it.status]}
                      </span>
                    </td>

                    <td className="px-2 py-2">
                      {classified ? (
                        <span
                          className={`font-bold ${
                            classified.isSynthetic
                              ? "text-[#dc322f]"
                              : "text-[#859900]"
                          }`}
                        >
                          {classified.isSynthetic ? "AI" : "Real"}
                        </span>
                      ) : (
                        <span className={theme.textSub}>—</span>
                      )}
                    </td>

                    <td className="px-2 py-2">
                      {classified ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-12 h-1.5 border ${theme.border} ${theme.bgMain} overflow-hidden`}
                          >
                            <div
                              className={
                                classified.isSynthetic
                                  ? "bg-[#dc322f] h-full"
                                  : "bg-[#859900] h-full"
                              }
                              style={{
                                width: `${classified.probability_ai * 100}%`,
                              }}
                            />
                          </div>
                          <span className={theme.textSub}>
                            {(classified.probability_ai * 100).toFixed(0)}%
                          </span>
                        </div>
                      ) : (
                        <span className={theme.textSub}>—</span>
                      )}
                    </td>

                    <td className="px-2 py-2">
                      <span
                        className={
                          isMismatch
                            ? "text-[#dc322f] font-bold"
                            : theme.textSub
                        }
                      >
                        {truthLabel}
                      </span>
                    </td>

                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBatchItem(it.id);
                        }}
                        className={`p-1 hover:opacity-70 ${theme.textSub}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBatchItem && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedBatchId(null)}
          />

          <div
            className={`fixed top-0 right-0 h-full w-full max-w-xl ${theme.bgCard} border-l-2 ${theme.border} z-50 overflow-y-auto p-6`}
          >
            <div className="flex items-center justify-between mb-4">
              <h2
                className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider truncate`}
              >
                {selectedBatchItem.name}
              </h2>

              <button
                onClick={() => setSelectedBatchId(null)}
                className={`p-1.5 hover:opacity-70 ${theme.textSub} shrink-0 ml-2`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`relative aspect-video ${theme.bgMain} border ${theme.border} overflow-hidden flex items-center justify-center mb-4`}
            >
              {selectedBatchItem.previewUrl ? (
                <video
                  key={selectedBatchItem.id}
                  ref={batchVideoRef}
                  src={selectedBatchItem.previewUrl}
                  controls
                  onTimeUpdate={handleBatchTimeUpdate}
                  onSeeked={handleBatchTimeUpdate}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-center px-6">
                  <Link2 className={`w-8 h-8 ${theme.textSub}`} />
                  {selectedBatchItem.sourceUrl && (
                    <a
                      href={selectedBatchItem.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[#268bd2] hover:underline break-all"
                    >
                      {selectedBatchItem.sourceUrl}
                    </a>
                  )}
                </div>
              )}
            </div>

            {selectedBatchItem.status === "error" && (
              <p className="text-xs text-[#dc322f] mb-4">
                {selectedBatchItem.error}
              </p>
            )}

            {activeBatchEntry && !activeBatchEntry.error && (
              <>
                <ResultSummary
                  result={activeBatchEntry.result}
                  theme={theme}
                  threshold={threshold}
                  processingTime={activeBatchEntry.processingTime}
                />

                {activeBatchEntry.scores.length > 0 && (
                  <div className="mt-4">
                    <p className={`text-xs ${theme.textMain} mb-2`}>
                      {t("Bấm vào biểu đồ để tua video tới đúng thời điểm đó.", "Click the chart to seek the video to that moment.")}
                    </p>

                    <ScoreChart
                      data={activeBatchEntry.scores}
                      currentTime={batchCurrentTime}
                      onSeek={handleBatchSeek}
                      isDarkMode={isDarkMode}
                      threshold={threshold}
                      height={260}
                    />
                  </div>
                )}
              </>
            )}

            {activeBatchEntry?.error && (
              <p className="text-xs text-[#dc322f] mt-2">
                {activeBatchEntry.error}
              </p>
            )}

          </div>
        </>
      )}
    </div>
  );
}

export default function SyntheticVideoDetector() {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [appMode, setAppMode] = useState<"classic" | "dashboard">("classic");

  const [dashboardSearch, setDashboardSearch] = useState("");
  const [dashboardStatusFilter, setDashboardStatusFilter] =
    useState<"all" | BatchStatus>("all");
  const [dashboardLabelFilter, setDashboardLabelFilter] = useState<
    "all" | "ai" | "real" | "mismatch"
  >("all");

  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState<Lang>("vi");
  CURRENT_LANG = lang;

  useEffect(() => {
    try {
      const saved = localStorage.getItem("svd-lang");
      if (saved === "vi" || saved === "en") setLang(saved);
    } catch {}
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("svd-lang", lang);
    } catch {}
  }, [lang]);
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [mockMode, setMockMode] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [singleSourceMode, setSingleSourceMode] = useState<"file" | "url">(
    "file"
  );
  const [singleUrlInput, setSingleUrlInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [singleEntry, setSingleEntry] = useState<VideoResult | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchCurrentTime, setBatchCurrentTime] = useState(0);
  const batchVideoRef = useRef<HTMLVideoElement>(null);
  const batchUrlsRef = useRef<string[]>([]);

  const [showBatchUrlBox, setShowBatchUrlBox] = useState(false);
  const [batchUrlText, setBatchUrlText] = useState("");

  const [labelMap, setLabelMap] = useState<Map<string, number>>(new Map());
  const [csvInfo, setCsvInfo] = useState<{
    fileName: string;
    totalRows: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedFile) {
      setVideoUrl(null);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setVideoUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  useEffect(() => {
    return () => {
      batchUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  useEffect(() => {
    setBatchCurrentTime(0);
  }, [selectedBatchId]);

  const theme: Theme = {
    bgMain: isDarkMode ? "bg-[#002b36]" : "bg-[#fdf6e3]",
    bgCard: isDarkMode ? "bg-[#073642]" : "bg-[#eee8d5]",
    textMain: isDarkMode ? "text-[#93a1a1]" : "text-[#657b83]",
    textHeading: isDarkMode ? "text-[#eee8d5]" : "text-[#586e75]",
    textSub: isDarkMode ? "text-[#839496]" : "text-[#586e75]",
    border: isDarkMode ? "border-[#0a4a58]" : "border-[#d9d2b8]",
    inputBg: isDarkMode ? "bg-[#00212b]/60" : "bg-[#f5efdc]",
    btnCancel: isDarkMode
      ? "bg-[#00212b] hover:bg-[#0a4a58] text-[#93a1a1]"
      : "bg-[#f5efdc] hover:bg-[#e3dcc4] text-[#586e75]",
  };

  const tabBtn = (isActive: boolean) =>
    `flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all ${
      isActive
        ? `border-[#268bd2] ${theme.textHeading} font-bold`
        : `border-transparent ${theme.textSub} hover:opacity-80`
    }`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setSingleEntry(null);
    }
  };

  const handleAnalyze = async () => {
    const isUrlMode = singleSourceMode === "url";
    const trimmedUrl = singleUrlInput.trim();

    if (isUrlMode ? !trimmedUrl : !selectedFile) return;

    setIsAnalyzing(true);
    setSingleEntry(null);
    setCurrentTime(0);

    try {
      const entry = mockMode
        ? await generateMockResult(isUrlMode ? trimmedUrl : selectedFile!.name)
        : isUrlMode
        ? await analyzeVideoUrl(trimmedUrl)
        : await analyzeVideoFile(selectedFile!);

      setSingleEntry(entry);
    } catch (error) {
      console.error("API Upload Error:", error);
      alert(
        t("Không thể kết nối tới model AI qua Ngrok. Vui lòng kiểm tra lại URL!", "Cannot reach the AI model through Ngrok. Please check the URL!")
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleBatchFilesSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;

    if (!files || files.length === 0) return;

    const newItems: BatchItem[] = Array.from(files).map((file) => {
      const previewUrl = URL.createObjectURL(file);
      batchUrlsRef.current.push(previewUrl);

      return {
        id: makeId(),
        name: file.name,
        file,
        previewUrl,
        status: "queued" as BatchStatus,
      };
    });

    setBatchItems((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const handleAddBatchUrls = () => {
    const urls = Array.from(
      new Set(
        batchUrlText
          .split(/\r?\n/)
          .map((u) => u.trim())
          .filter(Boolean)
      )
    );

    if (urls.length === 0) return;

    const newItems: BatchItem[] = urls.map((u) => ({
      id: makeId(),
      name: u,
      sourceUrl: u,
      status: "queued" as BatchStatus,
    }));

    setBatchItems((prev) => [...prev, ...newItems]);
    setBatchUrlText("");
    setShowBatchUrlBox(false);
  };

  const handleCsvFileSelected = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const text = String(reader.result ?? "");
      const rows = parseCsv(text);
      const map = buildLabelMap(rows);

      setLabelMap(map);
      setCsvInfo({ fileName: file.name, totalRows: rows.length });
    };

    reader.onerror = () => {
      alert(t("Không đọc được file CSV này. Vui lòng kiểm tra lại định dạng.", "Could not read this CSV file. Please check its format."));
    };

    reader.readAsText(file);
    e.target.value = "";
  };

  const clearCsv = () => {
    setLabelMap(new Map());
    setCsvInfo(null);
  };

  const removeBatchItem = (id: string) => {
    setBatchItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedBatchId === id) setSelectedBatchId(null);
  };

  const clearBatch = () => {
    if (isBatchRunning) return;

    batchUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    batchUrlsRef.current = [];

    setBatchItems([]);
    setSelectedBatchId(null);
  };

  const processOneBatchItem = async (item: BatchItem) => {
    const { id } = item;

    setBatchItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, status: "processing", error: undefined }
          : it
      )
    );

    setSelectedBatchId(id);

    try {
      const entry = mockMode
        ? await generateMockResult(item.name, labelMap.get(item.name))
        : item.file
        ? await analyzeVideoFile(item.file)
        : await analyzeVideoUrl(item.sourceUrl as string);

      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status: "done", result: entry } : it
        )
      );
    } catch (err: any) {
      console.error("Batch upload error:", err);

      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: "error",
                error: err?.message ?? t("Lỗi không xác định", "Unknown error"),
              }
            : it
        )
      );
    }
  };

  const runAllBatch = async () => {
    if (isBatchRunning) return;

    const queue = batchItems.filter(
      (it) => it.status === "queued" || it.status === "error"
    );

    if (queue.length === 0) return;

    setIsBatchRunning(true);

    for (const item of queue) {
      await processOneBatchItem(item);
    }

    setIsBatchRunning(false);
  };

  const handleBatchTimeUpdate = () => {
    if (batchVideoRef.current) {
      setBatchCurrentTime(batchVideoRef.current.currentTime);
    }
  };

  const handleBatchSeek = (time: number) => {
    if (batchVideoRef.current) {
      batchVideoRef.current.currentTime = time;
      setBatchCurrentTime(time);
    }
  };

  const selectedBatchItem =
    batchItems.find((it) => it.id === selectedBatchId) || null;

  const doneCount = batchItems.filter((it) => it.status === "done").length;
  const pendingCount = batchItems.filter(
    (it) => it.status === "queued" || it.status === "error"
  ).length;

  const matchedLabelCount = useMemo(
    () => batchItems.filter((it) => labelMap.has(it.name)).length,
    [batchItems, labelMap]
  );

  const metrics = useMemo(
    () => computeMetrics(batchItems, labelMap, threshold),
    [batchItems, labelMap, threshold]
  );

  const singleResult =
    singleEntry && !singleEntry.error ? singleEntry.result : null;

  const singleScores = singleEntry?.scores ?? [];

  const activeBatchEntry = selectedBatchItem?.result;

  return (
    <div
      className={`integrity-ui ${baskerville.variable} ${sourceSerif.variable} relative min-h-screen ${theme.bgMain} ${theme.textMain} transition-colors duration-500`}
      style={
        {
          "--font-ui":
            lang === "en" ? "var(--font-baskerville)" : "var(--font-source-serif)",
        } as React.CSSProperties
      }
    >
      <style>{INTEGRITY_CSS}</style>
      <NeuralBackground isDarkMode={isDarkMode} />

      <header
        className={`app-header border-b ${theme.border} ${theme.bgCard} sticky top-0 z-50 transition-colors duration-500`}
      >
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`${theme.textHeading} font-bold text-lg tracking-wide`}
            >
              [Tên dự án]
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div
              className={`flex items-center gap-1 p-1 border ${theme.border} ${theme.bgMain}`}
            >
              <button
                onClick={() => setAppMode("classic")}
                className={`px-3 py-1 transition-colors ${
                  appMode === "classic"
                    ? "bg-[#268bd2] text-white font-bold"
                    : `${theme.textSub} hover:opacity-80`
                }`}
              >
                {t("Giao diện chuẩn", "Standard view")}
              </button>

              <button
                onClick={() => setAppMode("dashboard")}
                className={`px-3 py-1 transition-colors flex items-center gap-1.5 ${
                  appMode === "dashboard"
                    ? "bg-[#268bd2] text-white font-bold"
                    : `${theme.textSub} hover:opacity-80`
                }`}
              >
                <Gauge className="w-3.5 h-3.5" /> Dashboard
              </button>
            </div>

            {mockMode ? (
              <span className="flex items-center gap-1.5 text-[#b58900] bg-[#b58900]/10 px-3 py-1 border border-[#b58900]/50">
                <FlaskConical className="w-3.5 h-3.5" />
                {t("Chế độ test (dữ liệu giả)", "Test mode (mock data)")}
              </span>
            ) : (
              <span
                className={`flex items-center gap-1.5 text-[#859900] ${theme.bgMain} px-3 py-1 border ${theme.border}`}
              >
                <span className="w-2 h-2 bg-[#859900] animate-pulse"></span>
                {t("Đã kết nối", "Connected")}
              </span>
            )}

            <div
              className={`flex items-center gap-1 p-1 border ${theme.border} ${theme.bgMain}`}
              role="group"
              aria-label={t("Ngôn ngữ", "Language")}
            >
              <Languages className="w-3.5 h-3.5 mx-1.5 opacity-70" />
              {(["vi", "en"] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  aria-pressed={lang === l}
                  className={`px-2.5 py-1 font-semibold uppercase transition-colors ${
                    lang === l
                      ? "bg-[#268bd2] text-white"
                      : `${theme.textSub} hover:opacity-80`
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              aria-label={t("Đổi giao diện sáng/tối", "Toggle light/dark theme")}
              className={`p-2 ${theme.bgMain} border ${theme.border} hover:opacity-80 transition-all`}
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-[#b58900]" />
              ) : (
                <Moon className="w-4 h-4 text-[#6c71c4]" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main key={appMode} className="relative z-10 max-w-7xl mx-auto px-6 py-10 fade-in-up">
        {appMode === "classic" ? (
          <>
            <div className="mb-6">
              <h1
                className={`text-3xl font-semibold ${theme.textHeading} mb-2`}
              >
                Synthetic Video Detection
              </h1>
              <p className={`${theme.textSub} max-w-3xl text-sm`}>
                {t("Tải lên một video để dự đoán video có phải được các model Diffusion tạo ra.", "Upload a video to predict whether it was generated by Diffusion models.")}
              </p>
            </div>

            {metrics && (
              <div
                className={`${theme.bgCard} border ${theme.border} p-6 mb-6`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2
                    className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider flex items-center gap-2`}
                  >
                    <Gauge className="w-4 h-4 text-[#268bd2]" /> {t("Chỉ số đánh giá", "Evaluation metrics")}
                  </h2>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${theme.textSub}`}>
                      {metrics.n} {t("video có nhãn CSV khớp tên file", "videos with CSV labels matching the file name")} · threshold{" "}
                      {(threshold * 100).toFixed(0)}%
                    </span>

                    <button
                      onClick={() =>
                        downloadResultsCsv(batchItems, labelMap, threshold)
                      }
                      className={`text-xs px-3 py-1.5 border ${theme.border} ${theme.btnCancel} flex items-center gap-1.5`}
                    >
                      <Download className="w-3.5 h-3.5" /> {t("Xuất CSV", "Export CSV")}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <MetricBox
                    label="AUROC"
                    value={
                      metrics.auroc != null ? metrics.auroc.toFixed(3) : "N/A"
                    }
                    theme={theme}
                  />
                  <MetricBox
                    label="Accuracy"
                    value={`${(metrics.accuracy * 100).toFixed(1)}%`}
                    theme={theme}
                  />
                  <MetricBox
                    label="Precision"
                    value={
                      metrics.precision != null
                        ? `${(metrics.precision * 100).toFixed(1)}%`
                        : "N/A"
                    }
                    theme={theme}
                  />
                  <MetricBox
                    label="Recall"
                    value={
                      metrics.recall != null
                        ? `${(metrics.recall * 100).toFixed(1)}%`
                        : "N/A"
                    }
                    theme={theme}
                  />
                  <MetricBox
                    label="F1-score"
                    value={
                      metrics.f1 != null
                        ? `${(metrics.f1 * 100).toFixed(1)}%`
                        : "N/A"
                    }
                    theme={theme}
                  />
                </div>

                <p className={`text-[11px] ${theme.textSub} mt-3`}>
                  {t("Ma trận nhầm lẫn:", "Confusion matrix:")} TP={metrics.tp} · FP={metrics.fp} · FN=
                  {metrics.fn} · TN={metrics.tn}
                </p>

                {(metrics.nPos === 0 || metrics.nNeg === 0) && (
                  <p className={`text-[11px] text-[#b58900] mt-1`}>
                    {metrics.nPos === 0
                      ? t("Tập nhãn khớp hiện không có video nào gắn nhãn AI (1) — nên Recall, F1 và AUROC hiển thị N/A vì không đủ dữ liệu để tính, không phải model làm sai.", "No matched video is labelled AI (1), so Recall, F1 and AUROC show N/A: there is not enough data to compute them. The model is not at fault.")
                      : t("Tập nhãn khớp hiện không có video nào gắn nhãn Real (0) — nên AUROC hiển thị N/A vì không đủ dữ liệu để tính.", "No matched video is labelled Real (0), so AUROC shows N/A: there is not enough data to compute it.")}
                  </p>
                )}

                {metrics.precision === 0 &&
                  metrics.tp === 0 &&
                  metrics.fp > 0 && (
                    <p className={`text-[11px] text-[#dc322f] mt-1`}>
                      {t("Precision 0% có nghĩa: trong", "Precision 0% means: among")} {metrics.fp} {t("video model đoán là \"AI\", không cái nào thật sự là AI theo CSV — thử kéo threshold cao hơn để giảm báo động giả.", "videos the model predicted as \"AI\", none is actually AI according to the CSV. Try raising the threshold to reduce false alarms.")}
                    </p>
                  )}
              </div>
            )}

            <div
              className={`${theme.bgCard} border ${theme.border} p-4 mb-6 flex flex-wrap items-center gap-6`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <SlidersHorizontal className="w-4 h-4 text-[#268bd2] shrink-0" />

                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={theme.textSub}>
                      {t("Ngưỡng phân loại (threshold)", "Classification threshold")}
                    </span>
                    <span className={`font-bold ${theme.textHeading}`}>
                      {(threshold * 100).toFixed(0)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0.01}
                    max={0.99}
                    step={0.01}
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-[#859900] cursor-pointer"
                  />

                  <p className={`text-[11px] ${theme.textSub} mt-1`}>
                    {t("Video có xác suất AI lớn hơn", "Videos with an AI probability above")} {(threshold * 100).toFixed(0)}%
                    {t("sẽ bị coi là AI-generated. Chỉnh xong áp dụng ngay, không cần chạy lại pipeline.", "are treated as AI-generated. Changes apply instantly, no need to rerun the pipeline.")}
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer shrink-0 max-w-xs">
                <input
                  type="checkbox"
                  checked={mockMode}
                  onChange={(e) => setMockMode(e.target.checked)}
                  className="accent-[#b58900] mt-0.5"
                />

                <span>
                  <span
                    className={`text-xs font-bold flex items-center gap-1 ${
                      mockMode ? "text-[#b58900]" : theme.textHeading
                    }`}
                  >
                    <FlaskConical className="w-3.5 h-3.5" /> {t("Chế độ test (dữ liệu giả)", "Test mode (mock data)")}
                  </span>

                  <span className={`text-[11px] ${theme.textSub} block mt-0.5`}>
                    {t("Sinh kết quả giả để test giao diện, không cần gọi backend Ngrok/Colab.", "Generates mock results to test the UI without calling the Ngrok/Colab backend.")}
                  </span>
                </span>
              </label>
            </div>

            <div
              className={`flex items-center gap-2 mb-8 border-b ${theme.border}`}
            >
              <button
                className={tabBtn(activeTab === "single")}
                onClick={() => setActiveTab("single")}
              >
                <Film className="w-4 h-4" /> {t("Video đơn", "Single video")}
              </button>

              <button
                className={tabBtn(activeTab === "batch")}
                onClick={() => setActiveTab("batch")}
              >
                <Layers className="w-4 h-4" /> {t("Xử lý hàng loạt", "Batch processing")}
              </button>
            </div>

            {activeTab === "single" && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7 space-y-6">
                    <div
                      className={`${theme.bgCard} border ${theme.border} p-6`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h2
                          className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider flex items-center gap-2`}
                        >
                          <Play className="w-4 h-4 text-[#859900]" /> {t("Video đầu vào", "Video input")}
                        </h2>

                        {singleSourceMode === "file" && selectedFile && (
                          <span
                            className={`text-xs ${theme.textSub} truncate max-w-[200px]`}
                          >
                            {selectedFile.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => setSingleSourceMode("file")}
                          className={tabBtn(singleSourceMode === "file")}
                        >
                          <Upload className="w-3.5 h-3.5" /> {t("Tải file", "Upload file")}
                        </button>

                        <button
                          onClick={() => setSingleSourceMode("url")}
                          className={tabBtn(singleSourceMode === "url")}
                        >
                          <Link2 className="w-3.5 h-3.5" /> {t("Dán URL", "Paste URL")}
                        </button>
                      </div>

                      {singleSourceMode === "file" ? (
                        !selectedFile ? (
                          <label
                            className={`border border-dashed ${theme.border} hover:border-[#859900] ${theme.inputBg} p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group`}
                          >
                            <Upload className="w-12 h-12 text-[#93a1a1] group-hover:text-[#859900] mb-4 transition-colors" />

                            <p
                              className={`text-sm ${theme.textHeading} font-medium mb-1`}
                            >
                              Drag and drop video here or{" "}
                              <span className="text-[#268bd2]">
                                {t("browse files", "browse files")}
                              </span>
                            </p>

                            <p className={`text-xs ${theme.textMain}`}>
                              {t("Supports MP4, MOV, AVI (Max 100MB)", "Supports MP4, MOV, AVI (max 100MB)")}
                            </p>

                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={handleFileChange}
                            />
                          </label>
                        ) : (
                          <div className="space-y-4">
                            <div
                              className={`relative aspect-video ${theme.bgMain} border ${theme.border} overflow-hidden flex items-center justify-center`}
                            >
                              {videoUrl && (
                                <video
                                  ref={videoRef}
                                  src={videoUrl}
                                  controls
                                  onTimeUpdate={handleTimeUpdate}
                                  onSeeked={handleTimeUpdate}
                                  className="w-full h-full object-contain"
                                />
                              )}
                            </div>

                            <div className="flex gap-3">
                              <button
                                onClick={handleAnalyze}
                                disabled={isAnalyzing}
                                className="flex-1 bg-[#859900] hover:brightness-110 text-[#002b36] font-bold py-3 px-6 border border-[#859900] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                              >
                                {isAnalyzing ? (
                                  <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />{" "}
                                    Analyzing frames...
                                  </>
                                ) : (
                                  <>
                                    <Cpu className="w-5 h-5" /> {t("Chạy pipeline AI", "Run AI pipeline")}
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedFile(null);
                                  setSingleEntry(null);
                                }}
                                className={`px-4 py-3 border ${theme.border} ${theme.btnCancel} text-sm font-medium`}
                              >
                                {t("Cancel", "Cancel")}
                              </button>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="space-y-4">
                          <input
                            type="url"
                            value={singleUrlInput}
                            onChange={(e) =>
                              setSingleUrlInput(e.target.value)
                            }
                            placeholder={t("Dán link YouTube / TikTok / Facebook...", "Paste a YouTube / TikTok / Facebook link...")}
                            className={`w-full px-4 py-3 border ${theme.border} ${theme.inputBg} ${theme.textHeading} text-sm outline-none focus:border-[#859900]`}
                          />

                          <div
                            className={`aspect-video ${theme.bgMain} border ${theme.border} flex flex-col items-center justify-center gap-2 px-6 text-center`}
                          >
                            <Link2 className={`w-8 h-8 ${theme.textSub}`} />

                            {singleUrlInput.trim() ? (
                              <p
                                className={`text-xs ${theme.textSub} break-all`}
                              >
                                {singleUrlInput.trim()}
                              </p>
                            ) : (
                              <p className={`text-xs ${theme.textMain}`}>
                                {t("Video sẽ được backend tải trực tiếp từ link này (yt-dlp) rồi chạy pipeline — không xem trước được ở đây.", "The backend downloads the video directly from this link (yt-dlp) and runs the pipeline. No preview is available here.")}
                              </p>
                            )}
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={handleAnalyze}
                              disabled={isAnalyzing || !singleUrlInput.trim()}
                              className="flex-1 bg-[#859900] hover:brightness-110 text-[#002b36] font-bold py-3 px-6 border border-[#859900] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                              {isAnalyzing ? (
                                <>
                                  <RefreshCw className="w-5 h-5 animate-spin" />{" "}
                                  {t("Đang tải & phân tích...", "Downloading & analyzing...")}
                                </>
                              ) : (
                                <>
                                  <Cpu className="w-5 h-5" /> {t("Tải & chạy pipeline AI", "Download & run AI pipeline")}
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                setSingleUrlInput("");
                                setSingleEntry(null);
                              }}
                              className={`px-4 py-3 border ${theme.border} ${theme.btnCancel} text-sm font-medium`}
                            >
                              {t("Cancel", "Cancel")}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-6">
                    <div
                      className={`${theme.bgCard} border ${theme.border} p-6 h-full flex flex-col justify-between`}
                    >
                      <div>
                        <h2
                          className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-6 flex items-center gap-2`}
                        >
                          <BarChart2 className="w-4 h-4 text-[#268bd2]" />{" "}
                          {t("Kết quả phân tích", "Analysis Results")}
                        </h2>

                        {!singleEntry &&
                          !isAnalyzing && (
                            <div
                              className={`text-center py-16 ${theme.textMain}`}
                            >
                              <Cpu className="w-12 h-12 mx-auto mb-3 opacity-40" />
                              <p className="text-sm">
                                No data available. Please upload a video and run
                                the model.
                              </p>
                            </div>
                          )}

                        {isAnalyzing && (
                          <div className="space-y-6 py-8">
                            <div className="animate-pulse space-y-3">
                              <div
                                className={`h-4 ${theme.bgMain} w-3/4`}
                              ></div>
                              <div className={`h-10 ${theme.bgMain}`}></div>
                              <div className={`h-20 ${theme.bgMain}`}></div>
                            </div>

                            <p className="text-xs text-center text-[#268bd2] animate-pulse">
                              {t("Extracting Spatial & Temporal Features...", "Extracting spatial & temporal features...")}
                            </p>

                            <p className={`text-xs text-center ${theme.textSub}`}>
                              {t("Đã chạy:", "Elapsed:")} <LiveTimer />
                            </p>
                          </div>
                        )}

                        {!isAnalyzing && singleEntry?.error && (
                          <div className="text-center py-16 text-[#dc322f]">
                            <X className="w-12 h-12 mx-auto mb-3 opacity-60" />
                            <p className="text-sm">
                              {t("Lỗi:", "Error:")} {singleEntry.error}
                            </p>
                          </div>
                        )}

                        {!isAnalyzing && singleResult && (
                          <ResultSummary
                            result={singleResult}
                            theme={theme}
                            threshold={threshold}
                            processingTime={singleEntry?.processingTime}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {singleScores.length > 0 && !singleEntry?.error && (
                  <div
                    className={`${theme.bgCard} border ${theme.border} p-6 mt-8`}
                  >
                    <p className={`text-sm ${theme.textSub} mb-4`}>
                      Play the video to view real-time data below.
                    </p>

                    <h2
                      className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-4 flex items-center gap-2`}
                    >
                      <BarChart2 className="w-4 h-4 text-[#268bd2]" /> {t("Phân tích video", "Video Analysis")}
                    </h2>

                    <p className={`text-xs ${theme.textMain} mb-2`}>
                      {t("Bấm vào biểu đồ để tua video tới đúng thời điểm đó.", "Click the chart to seek the video to that moment.")}
                    </p>

                    <ScoreChart
                      data={singleScores}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                      isDarkMode={isDarkMode}
                      threshold={threshold}
                    />
                  </div>
                )}
              </>
            )}

            {activeTab === "batch" && (
              <div className="space-y-6">
                <div
                  className={`${theme.bgCard} border ${theme.border} p-6`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h2
                      className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider flex items-center gap-2`}
                    >
                      <Layers className="w-4 h-4 text-[#859900]" /> {t("Xử lý nhiều", "Process multiple")}
                      video
                    </h2>

                    <div className="flex flex-wrap items-center gap-3">
                      {batchItems.length > 0 && (
                        <span className={`text-xs ${theme.textSub}`}>
                          {doneCount}/{batchItems.length} {t("đã xong", "done")}
                        </span>
                      )}

                      <label
                        className={`text-xs px-3 py-2 border ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-2`}
                      >
                        <Upload className="w-3.5 h-3.5" /> {t("Thêm video", "Add videos")}
                        <input
                          type="file"
                          accept="video/*"
                          multiple
                          className="hidden"
                          onChange={handleBatchFilesSelected}
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => setShowBatchUrlBox((v) => !v)}
                        className={`text-xs px-3 py-2 border ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-2`}
                      >
                        <Link2 className="w-3.5 h-3.5" /> {t("Thêm từ URL", "Add from URL")}
                      </button>

                      <label
                        className={`text-xs px-3 py-2 border ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-2`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> {t("Tải file nhãn CSV", "Upload CSV labels")}
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={handleCsvFileSelected}
                        />
                      </label>

                      <button
                        onClick={runAllBatch}
                        disabled={isBatchRunning || pendingCount === 0}
                        className="text-xs font-bold px-4 py-2 border bg-[#859900] hover:brightness-110 text-[#002b36] flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isBatchRunning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                            {t("Đang chạy...", "Running...")}
                          </>
                        ) : (
                          <>
                            <Cpu className="w-3.5 h-3.5" /> {t("Chạy tất cả (", "Run all (")}
                            {pendingCount})
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          downloadResultsCsv(batchItems, labelMap, threshold)
                        }
                        disabled={doneCount === 0}
                        className={`text-xs px-3 py-2 border ${theme.border} ${theme.btnCancel} flex items-center gap-2 transition-colors disabled:opacity-40`}
                      >
                        <Download className="w-3.5 h-3.5" /> {t("Xuất CSV", "Export CSV")}
                      </button>

                      <button
                        onClick={clearBatch}
                        disabled={isBatchRunning || batchItems.length === 0}
                        className={`text-xs px-3 py-2 border ${theme.border} ${theme.btnCancel} flex items-center gap-2 transition-colors disabled:opacity-40`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> {t("Xóa tất cả", "Clear all")}
                      </button>
                    </div>
                  </div>

                  {showBatchUrlBox && (
                    <div
                      className={`mb-4 p-3 border ${theme.border} ${theme.bgMain}`}
                    >
                      <textarea
                        value={batchUrlText}
                        onChange={(e) => setBatchUrlText(e.target.value)}
                        placeholder={
                          t("Dán link YouTube / TikTok / Facebook..., mỗi dòng 1 link", "Paste YouTube / TikTok / Facebook links, one per line")
                        }
                        rows={3}
                        className={`w-full px-3 py-2 border ${theme.border} ${theme.inputBg} ${theme.textHeading} text-xs outline-none focus:border-[#859900] mb-2`}
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowBatchUrlBox(false);
                            setBatchUrlText("");
                          }}
                          className={`text-xs px-3 py-1.5 border ${theme.border} ${theme.btnCancel}`}
                        >
                          {t("Hủy", "Cancel")}
                        </button>

                        <button
                          onClick={handleAddBatchUrls}
                          disabled={!batchUrlText.trim()}
                          className="text-xs font-bold px-3 py-1.5 border bg-[#859900] hover:brightness-110 text-[#002b36] disabled:opacity-50"
                        >
                          {t("Thêm vào danh sách", "Add to list")}
                        </button>
                      </div>
                    </div>
                  )}

                  {csvInfo && (
                    <div
                      className={`flex items-center justify-between mb-4 px-3 py-2 border ${theme.bgMain} ${theme.border} text-xs`}
                    >
                      <span className={theme.textSub}>
                        <span
                          className={`${theme.textHeading} font-medium`}
                        >
                          {csvInfo.fileName}
                        </span>{" "}
                        · {csvInfo.totalRows} {t("dòng nhãn", "label rows")}
                        {batchItems.length > 0 && (
                          <>
                            {" "}
                            {t("· khớp", "· matched")} {matchedLabelCount}/{batchItems.length} {t("video đã tải", "uploaded videos")}
                          </>
                        )}
                      </span>

                      <button
                        onClick={clearCsv}
                        className="text-[#dc322f] hover:underline"
                      >
                        {t("Bỏ file CSV", "Remove CSV")}
                      </button>
                    </div>
                  )}

                  {batchItems.length === 0 ? (
                    <label
                      className={`border border-dashed ${theme.border} hover:border-[#859900] ${theme.inputBg} p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group`}
                    >
                      <Upload className="w-12 h-12 text-[#93a1a1] group-hover:text-[#859900] mb-4 transition-colors" />

                      <p
                        className={`text-sm ${theme.textHeading} font-medium mb-1`}
                      >
                        {t("Kéo thả nhiều video vào đây hoặc", "Drag & drop multiple videos here or")}{" "}
                        <span className="text-[#268bd2]">{t("chọn nhiều file", "select multiple files")}</span>
                      </p>

                      <p className={`text-xs ${theme.textMain}`}>
                        {t("Sau khi tải lên, bấm \"Chạy tất cả\" để xử lý lần lượt từng video", "After uploading, click \"Run all\" to process the videos one by one")}
                      </p>

                      <input
                        type="file"
                        accept="video/*"
                        multiple
                        className="hidden"
                        onChange={handleBatchFilesSelected}
                      />
                    </label>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                      {batchItems.map((item) => (
                        <BatchGridCard
                          key={item.id}
                          item={item}
                          groundTruth={labelMap.get(item.name)}
                          threshold={threshold}
                          isSelected={selectedBatchId === item.id}
                          onSelect={() => setSelectedBatchId(item.id)}
                          onRemove={() => removeBatchItem(item.id)}
                          disableRemove={item.status === "processing"}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {selectedBatchItem ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-7 space-y-6">
                      <div
                        className={`${theme.bgCard} border ${theme.border} p-6`}
                      >
                        <h2
                          className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-4 flex items-center gap-2 truncate`}
                        >
                          <Play className="w-4 h-4 text-[#859900] shrink-0" />{" "}
                          <span className="truncate">
                            {selectedBatchItem.name}
                          </span>
                        </h2>

                        <div
                          className={`relative aspect-video ${theme.bgMain} border ${theme.border} overflow-hidden flex items-center justify-center`}
                        >
                          {selectedBatchItem.previewUrl ? (
                            <video
                              key={selectedBatchItem.id}
                              ref={batchVideoRef}
                              src={selectedBatchItem.previewUrl}
                              controls
                              onTimeUpdate={handleBatchTimeUpdate}
                              onSeeked={handleBatchTimeUpdate}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-center px-6">
                              <Link2 className={`w-8 h-8 ${theme.textSub}`} />

                              {selectedBatchItem.sourceUrl && (
                                <a
                                  href={selectedBatchItem.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs text-[#268bd2] hover:underline break-all"
                                >
                                  {selectedBatchItem.sourceUrl}
                                </a>
                              )}

                              <p className={`text-[11px] ${theme.textMain}`}>
                                {t("Video được backend tải trực tiếp từ link này để phân tích, không xem trước được ở đây.", "The backend downloads the video directly from this link for analysis. No preview is available here.")}
                              </p>
                            </div>
                          )}
                        </div>

                        {labelMap.has(selectedBatchItem.name) && (
                          <p className={`text-xs ${theme.textSub} mt-3`}>
                            {t("Nhãn thật (CSV):", "True label (CSV):")}{" "}
                            <span
                              className={`font-bold ${theme.textHeading}`}
                            >
                              {labelMap.get(selectedBatchItem.name) === 1
                                ? "AI"
                                : "Real"}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-5 space-y-6">
                      <div
                        className={`${theme.bgCard} border ${theme.border} p-6 h-full`}
                      >
                        <h2
                          className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-6 flex items-center gap-2`}
                        >
                          <BarChart2 className="w-4 h-4 text-[#268bd2]" />{" "}
                          {t("Kết quả phân tích", "Analysis Results")}
                        </h2>

                        {selectedBatchItem.status === "queued" && (
                          <div
                            className={`text-center py-16 ${theme.textMain}`}
                          >
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">
                              {t("Video đang chờ trong hàng đợi.", "This video is waiting in the queue.")}
                            </p>
                          </div>
                        )}

                        {selectedBatchItem.status === "processing" && (
                          <div className="space-y-6 py-8">
                            <div className="animate-pulse space-y-3">
                              <div
                                className={`h-4 ${theme.bgMain} w-3/4`}
                              ></div>
                              <div className={`h-10 ${theme.bgMain}`}></div>
                              <div className={`h-20 ${theme.bgMain}`}></div>
                            </div>

                            <p className="text-xs text-center text-[#268bd2] animate-pulse">
                              {t("Extracting Spatial & Temporal Features...", "Extracting spatial & temporal features...")}
                            </p>

                            <p className={`text-xs text-center ${theme.textSub}`}>
                              {t("Đã chạy:", "Elapsed:")} <LiveTimer />
                            </p>
                          </div>
                        )}

                        {selectedBatchItem.status === "error" && (
                          <div className="text-center py-16 text-[#dc322f]">
                            <X className="w-12 h-12 mx-auto mb-3 opacity-60" />
                            <p className="text-sm">
                              {t("Xử lý thất bại:", "Processing failed:")} {selectedBatchItem.error}
                            </p>
                          </div>
                        )}

                        {selectedBatchItem.status === "done" &&
                          activeBatchEntry?.error && (
                            <div className="text-center py-16 text-[#dc322f]">
                              <X className="w-12 h-12 mx-auto mb-3 opacity-60" />
                              <p className="text-sm">
                                {t("Lỗi:", "Error:")} {activeBatchEntry.error}
                              </p>
                            </div>
                          )}

                        {selectedBatchItem.status === "done" &&
                          activeBatchEntry &&
                          !activeBatchEntry.error && (
                            <ResultSummary
                              result={activeBatchEntry.result}
                              theme={theme}
                              threshold={threshold}
                              processingTime={activeBatchEntry.processingTime}
                            />
                          )}
                      </div>
                    </div>
                  </div>
                ) : (
                  batchItems.length > 0 && (
                    <div
                      className={`${theme.bgCard} border ${theme.border} p-10 text-center ${theme.textMain}`}
                    >
                      {t("Chọn một video trong lưới phía trên để xem chi tiết và biểu đồ.", "Select a video in the grid above to see details and charts.")}
                    </div>
                  )
                )}

                {selectedBatchItem &&
                  selectedBatchItem.status === "done" &&
                  activeBatchEntry &&
                  !activeBatchEntry.error &&
                  (activeBatchEntry.scores?.length ?? 0) > 0 && (
                    <div
                      className={`${theme.bgCard} border ${theme.border} p-6`}
                    >
                      <p className={`text-sm ${theme.textSub} mb-4`}>
                        Play the video to view real-time data below.
                      </p>

                      <h2
                        className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-4 flex items-center gap-2`}
                      >
                        <BarChart2 className="w-4 h-4 text-[#268bd2]" /> {t("Phân tích video", "Video Analysis")}
                      </h2>

                      <p className={`text-xs ${theme.textMain} mb-2`}>
                        {t("Bấm vào biểu đồ để tua video tới đúng thời điểm đó.", "Click the chart to seek the video to that moment.")}
                      </p>

                      <ScoreChart
                        data={activeBatchEntry.scores}
                        currentTime={batchCurrentTime}
                        onSeek={handleBatchSeek}
                        isDarkMode={isDarkMode}
                        threshold={threshold}
                      />
                    </div>
                  )}
              </div>
            )}
          </>
        ) : (
          <DashboardView
            theme={theme}
            isDarkMode={isDarkMode}
            mockMode={mockMode}
            setMockMode={setMockMode}
            threshold={threshold}
            setThreshold={setThreshold}
            batchItems={batchItems}
            labelMap={labelMap}
            metrics={metrics}
            isBatchRunning={isBatchRunning}
            runAllBatch={runAllBatch}
            removeBatchItem={removeBatchItem}
            handleBatchFilesSelected={handleBatchFilesSelected}
            handleAddBatchUrls={handleAddBatchUrls}
            showBatchUrlBox={showBatchUrlBox}
            setShowBatchUrlBox={setShowBatchUrlBox}
            batchUrlText={batchUrlText}
            setBatchUrlText={setBatchUrlText}
            handleCsvFileSelected={handleCsvFileSelected}
            csvInfo={csvInfo}
            downloadResultsCsv={downloadResultsCsv}
            search={dashboardSearch}
            setSearch={setDashboardSearch}
            statusFilter={dashboardStatusFilter}
            setStatusFilter={setDashboardStatusFilter}
            labelFilter={dashboardLabelFilter}
            setLabelFilter={setDashboardLabelFilter}
            selectedBatchId={selectedBatchId}
            setSelectedBatchId={setSelectedBatchId}
            selectedBatchItem={selectedBatchItem}
            activeBatchEntry={activeBatchEntry}
            batchVideoRef={batchVideoRef}
            batchCurrentTime={batchCurrentTime}
            handleBatchTimeUpdate={handleBatchTimeUpdate}
            handleBatchSeek={handleBatchSeek}
          />
        )}
      </main>
    </div>
  );
}