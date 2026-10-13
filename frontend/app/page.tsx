"use client";

import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
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
  Database,
  AlertTriangle,
  Link2,
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

type ScorePoint = { time: number; score: number };

type AnalysisResult = {
  isSynthetic: boolean;
  confidence: number;
  probability_ai?: number;
};

type BatchStatus = "queued" | "processing" | "done" | "error";

type WeightInfo = {
  id: string;
  name: string;
  updated_at: number;
  ready: boolean;
};

type WeightResult = {
  result: AnalysisResult;
  scores: ScorePoint[];
  error?: string;
};

type BatchItem = {
  id: string;
  name: string;
  file?: File;
  sourceUrl?: string;
  previewUrl?: string;
  status: BatchStatus;
  resultsByWeight?: Record<string, WeightResult>;
  error?: string;
};

const DEFAULT_THRESHOLD = 0.5;
const NGROK_BASE = "https://derived-expanse-roundish.ngrok-free.dev";
const WEIGHTS_POLL_INTERVAL_MS = 8000;

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

function formatWeightTime(unixSeconds: number): string {
  if (!unixSeconds) return "";
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchAvailableWeights(): Promise<WeightInfo[]> {
  const response = await fetch(`${NGROK_BASE}/weights`, {
    headers: { "ngrok-skip-browser-warning": "true" },
  });

  if (!response.ok) throw new Error(`Server returned status: ${response.status}`);

  const data = await response.json();
  return Array.isArray(data.weights) ? data.weights : [];
}

async function analyzeVideoFile(
  file: File,
  weightIds: string[]
): Promise<Record<string, WeightResult>> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("weights", weightIds.join(","));

  const response = await fetch(`${NGROK_BASE}/upload/`, {
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

  const data = await response.json();
  const rawResults: Record<string, any> = data.results ?? {};
  const out: Record<string, WeightResult> = {};

  for (const wid of weightIds) {
    const r = rawResults[wid];

    if (!r || r.error) {
      out[wid] = {
        result: { isSynthetic: false, confidence: 0, probability_ai: 0 },
        scores: [],
        error: r?.error ?? "Không có kết quả trả về cho weight này.",
      };
      continue;
    }

    out[wid] = {
      result: {
        isSynthetic: r.label,
        confidence: r.confidence,
        probability_ai: r.probability_ai,
      },
      scores: Array.isArray(r.scores)
        ? r.scores.map((p: any) => ({
            time: Number(p.time),
            score: Number(p.score),
          }))
        : [],
    };
  }

  return out;
}

async function analyzeVideoUrl(
  url: string,
  weightIds: string[]
): Promise<Record<string, WeightResult>> {
  const formData = new FormData();
  formData.append("url", url);
  formData.append("weights", weightIds.join(","));

  const response = await fetch(`${NGROK_BASE}/upload_url/`, {
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

  const data = await response.json();
  const rawResults: Record<string, any> = data.results ?? {};
  const out: Record<string, WeightResult> = {};

  for (const wid of weightIds) {
    const r = rawResults[wid];

    if (!r || r.error) {
      out[wid] = {
        result: { isSynthetic: false, confidence: 0, probability_ai: 0 },
        scores: [],
        error: r?.error ?? "Không có kết quả trả về cho weight này.",
      };
      continue;
    }

    out[wid] = {
      result: {
        isSynthetic: r.label,
        confidence: r.confidence,
        probability_ai: r.probability_ai,
      },
      scores: Array.isArray(r.scores)
        ? r.scores.map((p: any) => ({
            time: Number(p.time),
            score: Number(p.score),
          }))
        : [],
    };
  }

  return out;
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

function generateMockWeightsList(): WeightInfo[] {
  const now = Date.now() / 1000;
  return [
    {
      id: "mock_v1",
      name: "CLIP-DinoResidual-BiLSTM (v1, giả lập)",
      updated_at: now - 3600,
      ready: true,
    },
    {
      id: "mock_v2",
      name: "CLIP-DinoResidual-BiLSTM (v2, giả lập)",
      updated_at: now - 300,
      ready: true,
    },
  ];
}

function generateMockResult(
  key: string,
  weightId: string,
  groundTruth?: number
): Promise<WeightResult> {
  return new Promise((resolve) => {
    const delay = 350 + Math.random() * 900;

    setTimeout(() => {
      const rng = mulberry32(stringSeed(`${key}::${weightId}`));

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
      });
    }, delay);
  });
}

async function generateMockResultsForWeights(
  key: string,
  weightIds: string[],
  groundTruth?: number
): Promise<Record<string, WeightResult>> {
  const entries = await Promise.all(
    weightIds.map(
      async (wid) => [wid, await generateMockResult(key, wid, groundTruth)] as const
    )
  );

  return Object.fromEntries(entries);
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
  threshold: number,
  weightId: string | null
): Metrics | null {
  if (!weightId) return null;

  const evaluable = items
    .filter(
      (it) =>
        it.status === "done" &&
        it.resultsByWeight?.[weightId] &&
        !it.resultsByWeight[weightId].error &&
        labelMap.has(it.name)
    )
    .map((it) => {
      const truth = labelMap.get(it.name) as number;
      const classified = classifyWithThreshold(
        it.resultsByWeight![weightId].result,
        threshold
      );
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
    "weight",
    "predicted_label",
    "synthetic_score",
    "ground_truth_label",
    "match",
  ];

  const rows: string[] = [];

  items.forEach((it) => {
    if (it.status !== "done" || !it.resultsByWeight) return;

    Object.entries(it.resultsByWeight).forEach(([wid, entry]) => {
      if (entry.error) return;

      const classified = classifyWithThreshold(entry.result, threshold);
      const predictedLabel = classified.isSynthetic ? "AI" : "Real";
      const groundTruthRaw = labelMap.get(it.name);
      const groundTruthLabel =
        groundTruthRaw === undefined
          ? ""
          : groundTruthRaw === 1
          ? "AI"
          : "Real";

      const match =
        groundTruthRaw === undefined
          ? ""
          : (classified.isSynthetic ? 1 : 0) === groundTruthRaw
          ? "correct"
          : "incorrect";

      rows.push(
        [
          escapeCsvField(it.name),
          escapeCsvField(wid),
          predictedLabel,
          classified.probability_ai.toFixed(4),
          groundTruthLabel,
          match,
        ].join(",")
      );
    });
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
  a.download = `ket_qua_tat_ca_weight_threshold_${Math.round(threshold * 100)}.csv`;

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
    font-family: Baskerville, "Baskerville Old Face", "Libre Baskerville", Georgia, "Times New Roman", serif !important;
  }

  .integrity-ui .rounded,
  .integrity-ui .rounded-sm,
  .integrity-ui .rounded-md,
  .integrity-ui .rounded-lg,
  .integrity-ui .rounded-xl,
  .integrity-ui .rounded-2xl,
  .integrity-ui .rounded-3xl,
  .integrity-ui .rounded-full {
    border-radius: 0 !important;
  }

  .integrity-ui .border {
    border-width: 2px;
  }

  .integrity-ui .border-b {
    border-bottom-width: 2px;
  }

  .integrity-ui .border-t {
    border-top-width: 2px;
  }

  .integrity-ui .border-l {
    border-left-width: 2px;
  }

  .integrity-ui .border-r {
    border-right-width: 2px;
  }

  .integrity-ui .shadow-sm,
  .integrity-ui .shadow,
  .integrity-ui .shadow-md,
  .integrity-ui .shadow-lg,
  .integrity-ui .shadow-xl,
  .integrity-ui .shadow-2xl {
    box-shadow: none !important;
  }

  .integrity-ui .backdrop-blur,
  .integrity-ui .backdrop-blur-sm,
  .integrity-ui .backdrop-blur-md,
  .integrity-ui .backdrop-blur-lg {
    backdrop-filter: none !important;
  }
`;

function ResultSummary({
  result,
  theme,
  threshold,
}: {
  result: AnalysisResult;
  theme: Theme;
  threshold: number;
}) {
  const classified = classifyWithThreshold(result, threshold);
  const prob = classified.probability_ai;

  return (
    <div className="space-y-6">
      <div
        className={`p-4 border-2 flex items-center gap-4 ${
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
            {classified.isSynthetic ? "Khả năng cao Video AI" : "Video thật"}
          </h3>
          <p className={`text-xs opacity-80 mt-1 ${theme.textMain}`}>
            {classified.isSynthetic
              ? "Hệ thống phát hiện ra những artifact đặc trưng của các công cụ Diffusion."
              : "Khả năng cao video này không được tạo bởi các công cụ Diffusion."}
          </p>
        </div>
      </div>

      <div
        className={`${theme.bgMain} p-4 border-2 ${theme.border} transition-colors`}
      >
        <div className="flex justify-between text-xs mb-2">
          <span className={theme.textSub}>Khả năng AI:</span>
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
          <span className={theme.textMain}>Model Back-end:</span>
          <span className={`${theme.textHeading} tabular-nums`}>
            FastAPI + PyTorch Pipeline
          </span>
        </div>

        <div className={`flex justify-between py-2 border-b ${theme.border}`}>
          <span className={theme.textMain}>Điểm nghi ngờ:</span>
          <span className={`${theme.textHeading} tabular-nums`}>
            {prob.toFixed(4)}
          </span>
        </div>

        <div className={`flex justify-between py-2 border-b ${theme.border}`}>
          <span className={theme.textMain}>Threshold đang dùng:</span>
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
            value: "Time (seconds)",
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
            value: "Synthetic score",
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
            value: "Threshold",
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
            value: "Current Time",
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
      className={`${theme.bgMain} border-2 ${theme.border} p-3 text-center`}
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

function WeightResultTabs({
  weights,
  resultsByWeight,
  activeWeightId,
  onSelect,
  theme,
}: {
  weights: WeightInfo[];
  resultsByWeight: Record<string, WeightResult>;
  activeWeightId: string | null;
  onSelect: (id: string) => void;
  theme: Theme;
}) {
  const knownIds = weights.map((w) => w.id);
  const extraIds = Object.keys(resultsByWeight).filter(
    (id) => !knownIds.includes(id)
  );
  const orderedIds = [
    ...knownIds.filter((id) => resultsByWeight[id]),
    ...extraIds,
  ];

  if (orderedIds.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {orderedIds.map((id) => {
        const info = weights.find((w) => w.id === id);
        const entry = resultsByWeight[id];
        const hasError = !!entry?.error;
        const isActive = activeWeightId === id;

        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`text-xs px-3 py-1.5 border-2 flex items-center gap-1.5 transition-all ${
              isActive
                ? `${theme.bgMain} border-[#268bd2] ${theme.textHeading} font-bold`
                : `${theme.bgCard} ${theme.border} ${theme.textSub} hover:opacity-80`
            }`}
            title={info?.name ?? id}
          >
            {hasError && (
              <span className="w-1.5 h-1.5 bg-[#dc322f] shrink-0" />
            )}
            <span className="truncate max-w-[160px]">{info?.name ?? id}</span>
          </button>
        );
      })}
    </div>
  );
}

function BatchGridCard({
  item,
  groundTruth,
  threshold,
  activeWeightId,
  isSelected,
  onSelect,
  onRemove,
  disableRemove,
}: {
  item: BatchItem;
  groundTruth: number | undefined;
  threshold: number;
  activeWeightId: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  disableRemove: boolean;
}) {
  const activeEntry =
    item.status === "done" && activeWeightId
      ? item.resultsByWeight?.[activeWeightId]
      : undefined;

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

  const missingForActiveWeight = item.status === "done" && !classified;

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

          {hasGroundTruth &&
            (isCorrect ? (
              <Check className="w-3.5 h-3.5 text-[#859900]" />
            ) : (
              <X className="w-3.5 h-3.5 text-[#dc322f]" />
            ))}
        </div>
      )}

      {missingForActiveWeight && (
        <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-black/75">
          <span className="text-[10px] text-[#93a1a1]">
            Chưa có KQ cho weight này
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
  availableWeights,
  selectedWeightIds,
  toggleWeightSelected,
  activeWeightId,
  setActiveWeightId,
  weightsError,
  loadWeights,
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
  availableWeights: WeightInfo[];
  selectedWeightIds: string[];
  toggleWeightSelected: (id: string) => void;
  activeWeightId: string | null;
  setActiveWeightId: (id: string) => void;
  weightsError: string | null;
  loadWeights: () => void;
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
  activeBatchEntry: WeightResult | undefined;
  batchVideoRef: React.RefObject<HTMLVideoElement | null>;
  batchCurrentTime: number;
  handleBatchTimeUpdate: () => void;
  handleBatchSeek: (t: number) => void;
}) {
  const doneItems = batchItems.filter((it) => it.status === "done");

  const aiCount = doneItems.filter((it) => {
    const entry = activeWeightId
      ? it.resultsByWeight?.[activeWeightId]
      : undefined;

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
      const entry = activeWeightId
        ? it.resultsByWeight?.[activeWeightId]
        : undefined;

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
    queued: "Chờ",
    processing: "Đang chạy",
    done: "Xong",
    error: "Lỗi",
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
        Dashboard vận hành
      </h1>

      <div
        className={`${theme.bgCard} border-2 ${theme.border} p-4 mb-4 flex flex-wrap items-center gap-6`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-[280px]">
          <SlidersHorizontal className="w-4 h-4 text-[#268bd2] shrink-0" />
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className={theme.textSub}>
                Ngưỡng phân loại (threshold)
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
            <FlaskConical className="w-3.5 h-3.5" /> Chế độ test
          </span>
        </label>
      </div>

      <div
        className={`${theme.bgCard} border-2 ${theme.border} p-4 mb-4`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span
            className={`text-xs uppercase tracking-wider ${theme.textSub} flex items-center gap-1.5`}
          >
            <Database className="w-3.5 h-3.5 text-[#6c71c4]" /> Weight
          </span>

          <button
            onClick={loadWeights}
            className={`text-[11px] px-2 py-1 border-2 ${theme.border} ${theme.btnCancel} flex items-center gap-1`}
          >
            <RefreshCw className="w-3 h-3" /> Làm mới
          </button>
        </div>

        {weightsError && (
          <p className="text-[11px] text-[#dc322f] mb-2">{weightsError}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {availableWeights.map((w) => (
            <label
              key={w.id}
              className={`text-xs px-2.5 py-1.5 border-2 cursor-pointer flex items-center gap-1.5 transition-colors ${
                theme.border
              } ${
                selectedWeightIds.includes(w.id)
                  ? `${theme.bgMain} font-bold ${theme.textHeading}`
                  : `${theme.inputBg} ${theme.textSub}`
              } ${!w.ready ? "opacity-50" : ""}`}
            >
              <input
                type="checkbox"
                checked={selectedWeightIds.includes(w.id)}
                onChange={() => toggleWeightSelected(w.id)}
                disabled={!w.ready}
                className="accent-[#859900]"
              />
              {w.name}
            </label>
          ))}
        </div>

        <WeightResultTabs
          weights={availableWeights}
          resultsByWeight={Object.fromEntries(
            batchItems.flatMap((it) =>
              it.resultsByWeight
                ? Object.keys(it.resultsByWeight).map((k) => [
                    k,
                    it.resultsByWeight![k],
                  ])
                : []
            )
          )}
          activeWeightId={activeWeightId}
          onSelect={setActiveWeightId}
          theme={theme}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
        <MetricBox
          label="Tổng video"
          value={String(batchItems.length)}
          theme={theme}
        />
        <MetricBox
          label="Gắn nhãn AI"
          value={
            doneItems.length
              ? `${Math.round((aiCount / doneItems.length) * 100)}%`
              : "—"
          }
          theme={theme}
        />
        <MetricBox
          label="Gắn nhãn Real"
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
          label="Đang xử lý / lỗi"
          value={`${queueCount} / ${errorCount}`}
          theme={theme}
        />
      </div>

      <div
        className={`${theme.bgCard} border-2 ${theme.border} p-3 mb-2 flex flex-wrap items-center gap-2`}
      >
        <label
          className={`text-xs px-3 py-2 border-2 ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-1.5`}
        >
          <Upload className="w-3.5 h-3.5" /> Thêm video
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
          className={`text-xs px-3 py-2 border-2 ${theme.border} ${theme.btnCancel} flex items-center gap-1.5`}
        >
          <Link2 className="w-3.5 h-3.5" /> Thêm từ URL
        </button>

        <label
          className={`text-xs px-3 py-2 border-2 ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-1.5`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" /> Nhãn CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvFileSelected}
          />
        </label>

        <button
          onClick={() => downloadResultsCsv(batchItems, labelMap, threshold)}
          className={`text-xs px-3 py-2 border-2 ${theme.border} ${theme.btnCancel} flex items-center gap-1.5`}
        >
          <Download className="w-3.5 h-3.5" /> Xuất CSV
        </button>

        <button
          onClick={runAllBatch}
          disabled={isBatchRunning || selectedWeightIds.length === 0}
          className="ml-auto text-xs font-bold px-4 py-2 border-2 bg-[#859900] hover:brightness-110 text-[#002b36] disabled:opacity-50 flex items-center gap-1.5"
        >
          {isBatchRunning ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Cpu className="w-3.5 h-3.5" />
          )}
          Chạy tất cả
        </button>

        {csvInfo && (
          <span className={`text-[11px] ${theme.textSub} w-full`}>
            Nhãn: {csvInfo.fileName} · {csvInfo.totalRows} dòng
          </span>
        )}
      </div>

      {showBatchUrlBox && (
        <div
          className={`mb-4 p-3 border-2 ${theme.border} ${theme.bgMain}`}
        >
          <textarea
            value={batchUrlText}
            onChange={(e) => setBatchUrlText(e.target.value)}
            placeholder="Dán link YouTube / TikTok / Facebook..., mỗi dòng 1 link"
            rows={3}
            className={`w-full px-3 py-2 border-2 ${theme.border} ${theme.inputBg} ${theme.textHeading} text-xs outline-none focus:border-[#859900] mb-2`}
          />

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowBatchUrlBox(false)}
              className={`text-xs px-3 py-1.5 border-2 ${theme.border} ${theme.btnCancel}`}
            >
              Hủy
            </button>

            <button
              onClick={handleAddBatchUrls}
              disabled={!batchUrlText.trim()}
              className="text-xs font-bold px-3 py-1.5 border-2 bg-[#859900] hover:brightness-110 text-[#002b36] disabled:opacity-50"
            >
              Thêm vào danh sách
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên hoặc URL video..."
          className={`flex-1 min-w-[200px] text-xs px-3 py-2 border-2 ${theme.border} ${theme.inputBg} ${theme.textHeading} outline-none focus:border-[#859900]`}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className={`text-xs px-2 py-2 border-2 ${theme.border} ${theme.inputBg} ${theme.textHeading}`}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="queued">Chờ</option>
          <option value="processing">Đang chạy</option>
          <option value="done">Xong</option>
          <option value="error">Lỗi</option>
        </select>

        <select
          value={labelFilter}
          onChange={(e) => setLabelFilter(e.target.value as any)}
          className={`text-xs px-2 py-2 border-2 ${theme.border} ${theme.inputBg} ${theme.textHeading}`}
        >
          <option value="all">Tất cả nhãn</option>
          <option value="ai">Dự đoán AI</option>
          <option value="real">Dự đoán Real</option>
          <option value="mismatch">Sai so với CSV</option>
        </select>
      </div>

      <div
        className={`${theme.bgCard} border-2 ${theme.border} overflow-hidden`}
      >
        <div className="overflow-y-auto" style={{ maxHeight: 520 }}>
          <table className="w-full text-xs">
            <thead className={`sticky top-0 ${theme.bgMain} z-10`}>
              <tr>
                <th
                  className={`text-left px-4 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  Video / URL
                </th>
                <th
                  className={`text-left px-2 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  Trạng thái
                </th>
                <th
                  className={`text-left px-2 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  Dự đoán
                </th>
                <th
                  className={`text-left px-2 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  Xác suất
                </th>
                <th
                  className={`text-left px-2 py-2 ${theme.textSub} font-semibold uppercase tracking-wide`}
                >
                  Nhãn thật
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
                    Chưa có video nào khớp bộ lọc. Thêm video hoặc URL ở thanh
                    công cụ phía trên.
                  </td>
                </tr>
              )}

              {filteredItems.map((it) => {
                const entry = activeWeightId
                  ? it.resultsByWeight?.[activeWeightId]
                  : undefined;

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
                        className={`text-[10px] px-2 py-0.5 border-2 ${statusStyle[it.status]}`}
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
              className={`relative aspect-video ${theme.bgMain} border-2 ${theme.border} overflow-hidden flex items-center justify-center mb-4`}
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

            {selectedBatchItem.resultsByWeight && (
              <WeightResultTabs
                weights={availableWeights}
                resultsByWeight={selectedBatchItem.resultsByWeight}
                activeWeightId={activeWeightId}
                onSelect={setActiveWeightId}
                theme={theme}
              />
            )}

            {activeBatchEntry && !activeBatchEntry.error && (
              <>
                <ResultSummary
                  result={activeBatchEntry.result}
                  theme={theme}
                  threshold={threshold}
                />

                {activeBatchEntry.scores.length > 0 && (
                  <div className="mt-4">
                    <p className={`text-xs ${theme.textMain} mb-2`}>
                      Bấm vào biểu đồ để tua video tới đúng thời điểm đó.
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

            {selectedBatchItem.status === "done" && !activeWeightId && (
              <p className={`text-xs ${theme.textSub} mt-2`}>
                Chọn 1 weight ở trên để xem kết quả chi tiết.
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
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [mockMode, setMockMode] = useState(false);

  const [availableWeights, setAvailableWeights] = useState<WeightInfo[]>([]);
  const [selectedWeightIds, setSelectedWeightIds] = useState<string[]>([]);
  const [activeWeightId, setActiveWeightId] = useState<string | null>(null);
  const [weightsError, setWeightsError] = useState<string | null>(null);
  const hasAutoSelectedRef = useRef(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [singleSourceMode, setSingleSourceMode] = useState<"file" | "url">(
    "file"
  );
  const [singleUrlInput, setSingleUrlInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [singleResultsByWeight, setSingleResultsByWeight] = useState<
    Record<string, WeightResult>
  >({});
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

  const loadWeights = useCallback(async () => {
    try {
      const list = mockMode
        ? generateMockWeightsList()
        : await fetchAvailableWeights();

      setAvailableWeights(list);
      setWeightsError(null);
    } catch (e: any) {
      setWeightsError(
        "Không lấy được danh sách weight từ backend. Kiểm tra lại URL Ngrok / Colab có đang chạy không."
      );
    }
  }, [mockMode]);

  useEffect(() => {
    loadWeights();
    const interval = setInterval(loadWeights, WEIGHTS_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadWeights]);

  useEffect(() => {
    const availableIds = new Set(availableWeights.map((w) => w.id));

    setSelectedWeightIds((prev) =>
      prev.filter((id) => availableIds.has(id))
    );

    if (!hasAutoSelectedRef.current && availableWeights.length > 0) {
      setSelectedWeightIds(
        availableWeights.filter((w) => w.ready).map((w) => w.id)
      );
      hasAutoSelectedRef.current = true;
    }
  }, [availableWeights]);

  const toggleWeightSelected = (id: string) => {
    setSelectedWeightIds((prev) =>
      prev.includes(id)
        ? prev.filter((w) => w !== id)
        : [...prev, id]
    );
  };

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
      setSingleResultsByWeight({});
    }
  };

  const handleAnalyze = async () => {
    const isUrlMode = singleSourceMode === "url";
    const trimmedUrl = singleUrlInput.trim();

    if (isUrlMode ? !trimmedUrl : !selectedFile) return;
    if (selectedWeightIds.length === 0) return;

    setIsAnalyzing(true);
    setSingleResultsByWeight({});
    setCurrentTime(0);

    try {
      const resultsMap = isUrlMode
        ? mockMode
          ? await generateMockResultsForWeights(
              trimmedUrl,
              selectedWeightIds
            )
          : await analyzeVideoUrl(trimmedUrl, selectedWeightIds)
        : mockMode
        ? await generateMockResultsForWeights(
            selectedFile!.name,
            selectedWeightIds
          )
        : await analyzeVideoFile(selectedFile!, selectedWeightIds);

      setSingleResultsByWeight(resultsMap);

      const firstOk =
        selectedWeightIds.find(
          (id) => resultsMap[id] && !resultsMap[id].error
        ) ?? selectedWeightIds[0];

      setActiveWeightId(firstOk ?? null);
    } catch (error) {
      console.error("API Upload Error:", error);
      alert(
        "Không thể kết nối tới model AI qua Ngrok. Vui lòng kiểm tra lại URL!"
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
      alert("Không đọc được file CSV này. Vui lòng kiểm tra lại định dạng.");
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

  const processOneBatchItem = async (
    item: BatchItem,
    weightIds: string[]
  ) => {
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
      const resultsMap = mockMode
        ? await generateMockResultsForWeights(
            item.name,
            weightIds,
            labelMap.get(item.name)
          )
        : item.file
        ? await analyzeVideoFile(item.file, weightIds)
        : await analyzeVideoUrl(item.sourceUrl as string, weightIds);

      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? { ...it, status: "done", resultsByWeight: resultsMap }
            : it
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
                error: err?.message ?? "Lỗi không xác định",
              }
            : it
        )
      );
    }
  };

  const runAllBatch = async () => {
    if (isBatchRunning || selectedWeightIds.length === 0) return;

    const queue = batchItems.filter(
      (it) => it.status === "queued" || it.status === "error"
    );

    if (queue.length === 0) return;

    setIsBatchRunning(true);

    for (const item of queue) {
      await processOneBatchItem(item, selectedWeightIds);
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
    () => computeMetrics(batchItems, labelMap, threshold, activeWeightId),
    [batchItems, labelMap, threshold, activeWeightId]
  );

  const activeWeightName =
    availableWeights.find((w) => w.id === activeWeightId)?.name ??
    activeWeightId ??
    "";

  const activeSingleEntry = activeWeightId
    ? singleResultsByWeight[activeWeightId]
    : undefined;

  const singleResult =
    activeSingleEntry && !activeSingleEntry.error
      ? activeSingleEntry.result
      : null;

  const singleScores = activeSingleEntry?.scores ?? [];

  const activeBatchEntry =
    selectedBatchItem && activeWeightId
      ? selectedBatchItem.resultsByWeight?.[activeWeightId]
      : undefined;

  return (
    <div
      className={`integrity-ui min-h-screen ${theme.bgMain} ${theme.textMain} transition-colors duration-300`}
    >
      <style>{INTEGRITY_CSS}</style>

      <header
        className={`border-b-2 ${theme.border} ${theme.bgCard} sticky top-0 z-50 transition-colors duration-300`}
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
              className={`flex items-center gap-1 p-1 border-2 ${theme.border} ${theme.bgMain}`}
            >
              <button
                onClick={() => setAppMode("classic")}
                className={`px-3 py-1 transition-colors ${
                  appMode === "classic"
                    ? "bg-[#268bd2] text-white font-bold"
                    : `${theme.textSub} hover:opacity-80`
                }`}
              >
                Giao diện chuẩn
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
              <span className="flex items-center gap-1.5 text-[#b58900] bg-[#b58900]/10 px-3 py-1 border-2 border-[#b58900]/50">
                <FlaskConical className="w-3.5 h-3.5" />
                Chế độ test (dữ liệu giả)
              </span>
            ) : (
              <span
                className={`flex items-center gap-1.5 text-[#859900] ${theme.bgMain} px-3 py-1 border-2 ${theme.border}`}
              >
                <span className="w-2 h-2 bg-[#859900] animate-pulse"></span>
                Đã kết nối
              </span>
            )}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 ${theme.bgMain} border-2 ${theme.border} hover:opacity-80 transition-all`}
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

      <main className="max-w-7xl mx-auto px-6 py-8">
        {appMode === "classic" ? (
          <>
            <div className="mb-6">
              <h1
                className={`text-3xl font-semibold ${theme.textHeading} mb-2`}
              >
                Synthetic Video Detection
              </h1>
              <p className={`${theme.textSub} max-w-3xl text-sm`}>
                Tải lên một video để dự đoán video có phải được các model
                Diffusion tạo ra.
              </p>
            </div>

            {metrics && (
              <div
                className={`${theme.bgCard} border-2 ${theme.border} p-6 mb-6`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h2
                    className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider flex items-center gap-2`}
                  >
                    <Gauge className="w-4 h-4 text-[#268bd2]" /> Chỉ số đánh
                    giá
                  </h2>

                  <div className="flex items-center gap-3">
                    <span className={`text-xs ${theme.textSub}`}>
                      Weight:{" "}
                      <span className={`font-bold ${theme.textHeading}`}>
                        {activeWeightName}
                      </span>{" "}
                      · {metrics.n} video có nhãn CSV khớp tên file · threshold{" "}
                      {(threshold * 100).toFixed(0)}%
                    </span>

                    <button
                      onClick={() =>
                        downloadResultsCsv(batchItems, labelMap, threshold)
                      }
                      className={`text-xs px-3 py-1.5 border-2 ${theme.border} ${theme.btnCancel} flex items-center gap-1.5`}
                    >
                      <Download className="w-3.5 h-3.5" /> Xuất CSV (tất cả
                      weight)
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
                  Ma trận nhầm lẫn: TP={metrics.tp} · FP={metrics.fp} · FN=
                  {metrics.fn} · TN={metrics.tn}
                </p>

                {(metrics.nPos === 0 || metrics.nNeg === 0) && (
                  <p className={`text-[11px] text-[#b58900] mt-1`}>
                    {metrics.nPos === 0
                      ? "Tập nhãn khớp hiện không có video nào gắn nhãn AI (1) — nên Recall, F1 và AUROC hiển thị N/A vì không đủ dữ liệu để tính, không phải model làm sai."
                      : "Tập nhãn khớp hiện không có video nào gắn nhãn Real (0) — nên AUROC hiển thị N/A vì không đủ dữ liệu để tính."}
                  </p>
                )}

                {metrics.precision === 0 &&
                  metrics.tp === 0 &&
                  metrics.fp > 0 && (
                    <p className={`text-[11px] text-[#dc322f] mt-1`}>
                      Precision 0% có nghĩa: trong {metrics.fp} video model
                      đoán là "AI", không cái nào thật sự là AI theo CSV — thử
                      kéo threshold cao hơn để giảm báo động giả.
                    </p>
                  )}
              </div>
            )}

            <div
              className={`${theme.bgCard} border-2 ${theme.border} p-4 mb-6 flex flex-wrap items-center gap-6`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                <SlidersHorizontal className="w-4 h-4 text-[#268bd2] shrink-0" />

                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className={theme.textSub}>
                      Ngưỡng phân loại (threshold)
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
                    Video có xác suất AI lớn hơn {(threshold * 100).toFixed(0)}%
                    sẽ bị coi là AI-generated. Chỉnh xong áp dụng ngay, không
                    cần chạy lại pipeline.
                  </p>
                </div>
              </div>

              <label className="flex items-start gap-2 cursor-pointer shrink-0 max-w-xs">
                <input
                  type="checkbox"
                  checked={mockMode}
                  onChange={(e) => {
                    setMockMode(e.target.checked);
                    hasAutoSelectedRef.current = false;
                  }}
                  className="accent-[#b58900] mt-0.5"
                />

                <span>
                  <span
                    className={`text-xs font-bold flex items-center gap-1 ${
                      mockMode ? "text-[#b58900]" : theme.textHeading
                    }`}
                  >
                    <FlaskConical className="w-3.5 h-3.5" /> Chế độ test (dữ
                    liệu giả)
                  </span>

                  <span className={`text-[11px] ${theme.textSub} block mt-0.5`}>
                    Sinh kết quả giả để test giao diện, không cần gọi backend
                    Ngrok/Colab.
                  </span>
                </span>
              </label>
            </div>

            <div
              className={`${theme.bgCard} border-2 ${theme.border} p-4 mb-6`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <h2
                  className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider flex items-center gap-2`}
                >
                  <Database className="w-4 h-4 text-[#6c71c4]" /> Weight
                  (Google Drive)
                </h2>

                <div className="flex items-center gap-3">
                  <span className={`text-[11px] ${theme.textSub}`}>
                    Đã chọn {selectedWeightIds.length}/
                    {availableWeights.length} · tự làm mới mỗi{" "}
                    {WEIGHTS_POLL_INTERVAL_MS / 1000}s
                  </span>

                  <button
                    onClick={loadWeights}
                    className={`text-xs px-3 py-1.5 border-2 ${theme.border} ${theme.btnCancel} flex items-center gap-1.5`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Làm mới
                  </button>
                </div>
              </div>

              {weightsError && (
                <p className="text-[11px] text-[#dc322f] flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{" "}
                  {weightsError}
                </p>
              )}

              {availableWeights.length === 0 && !weightsError ? (
                <p className={`text-xs ${theme.textSub}`}>
                  Chưa tìm thấy weight nào. Kiểm tra lại thư mục WEIGHTS_ROOT
                  trên Google Drive (mỗi weight là 1 thư mục con chứa
                  best_model.pt + scaler.joblib).
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availableWeights.map((w) => (
                    <label
                      key={w.id}
                      className={`flex items-start gap-2 px-3 py-2 border-2 ${theme.border} ${theme.inputBg} cursor-pointer transition-colors ${
                        !w.ready ? "opacity-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedWeightIds.includes(w.id)}
                        onChange={() => toggleWeightSelected(w.id)}
                        disabled={!w.ready}
                        className="accent-[#859900] mt-0.5 shrink-0"
                      />

                      <span className="min-w-0">
                        <span
                          className={`text-xs font-medium block truncate ${theme.textHeading}`}
                        >
                          {w.name}
                        </span>

                        <span
                          className={`text-[10px] block ${theme.textSub}`}
                        >
                          Cập nhật lúc {formatWeightTime(w.updated_at)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {selectedWeightIds.length === 0 &&
                availableWeights.length > 0 && (
                  <p className="text-[11px] text-[#b58900] mt-2">
                    Chọn ít nhất 1 weight để chạy.
                  </p>
                )}
            </div>

            <div
              className={`flex items-center gap-2 mb-8 border-b ${theme.border}`}
            >
              <button
                className={tabBtn(activeTab === "single")}
                onClick={() => setActiveTab("single")}
              >
                <Film className="w-4 h-4" /> Video đơn
              </button>

              <button
                className={tabBtn(activeTab === "batch")}
                onClick={() => setActiveTab("batch")}
              >
                <Layers className="w-4 h-4" /> Xử lý hàng loạt
              </button>
            </div>

            {activeTab === "single" && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7 space-y-6">
                    <div
                      className={`${theme.bgCard} border-2 ${theme.border} p-6`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h2
                          className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider flex items-center gap-2`}
                        >
                          <Play className="w-4 h-4 text-[#859900]" /> Video
                          Input
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
                          <Upload className="w-3.5 h-3.5" /> Tải file
                        </button>

                        <button
                          onClick={() => setSingleSourceMode("url")}
                          className={tabBtn(singleSourceMode === "url")}
                        >
                          <Link2 className="w-3.5 h-3.5" /> Dán URL
                        </button>
                      </div>

                      {singleSourceMode === "file" ? (
                        !selectedFile ? (
                          <label
                            className={`border-2 border-dashed ${theme.border} hover:border-[#859900] ${theme.inputBg} p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group`}
                          >
                            <Upload className="w-12 h-12 text-[#93a1a1] group-hover:text-[#859900] mb-4 transition-colors" />

                            <p
                              className={`text-sm ${theme.textHeading} font-medium mb-1`}
                            >
                              Drag and drop video here or{" "}
                              <span className="text-[#268bd2]">
                                browse files
                              </span>
                            </p>

                            <p className={`text-xs ${theme.textMain}`}>
                              Supports MP4, MOV, AVI (Max 100MB)
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
                              className={`relative aspect-video ${theme.bgMain} border-2 ${theme.border} overflow-hidden flex items-center justify-center`}
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
                                disabled={
                                  isAnalyzing || selectedWeightIds.length === 0
                                }
                                className="flex-1 bg-[#859900] hover:brightness-110 text-[#002b36] font-bold py-3 px-6 border-2 border-[#859900] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                              >
                                {isAnalyzing ? (
                                  <>
                                    <RefreshCw className="w-5 h-5 animate-spin" />{" "}
                                    Analyzing frames...
                                  </>
                                ) : (
                                  <>
                                    <Cpu className="w-5 h-5" /> Chạy pipeline AI
                                    xử lí ({selectedWeightIds.length} weight)
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedFile(null);
                                  setSingleResultsByWeight({});
                                }}
                                className={`px-4 py-3 border-2 ${theme.border} ${theme.btnCancel} text-sm font-medium`}
                              >
                                Cancel
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
                            placeholder="Dán link YouTube / TikTok / Facebook..."
                            className={`w-full px-4 py-3 border-2 ${theme.border} ${theme.inputBg} ${theme.textHeading} text-sm outline-none focus:border-[#859900]`}
                          />

                          <div
                            className={`aspect-video ${theme.bgMain} border-2 ${theme.border} flex flex-col items-center justify-center gap-2 px-6 text-center`}
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
                                Video sẽ được backend tải trực tiếp từ link này
                                (yt-dlp) rồi chạy pipeline — không xem trước
                                được ở đây.
                              </p>
                            )}
                          </div>

                          <div className="flex gap-3">
                            <button
                              onClick={handleAnalyze}
                              disabled={
                                isAnalyzing ||
                                selectedWeightIds.length === 0 ||
                                !singleUrlInput.trim()
                              }
                              className="flex-1 bg-[#859900] hover:brightness-110 text-[#002b36] font-bold py-3 px-6 border-2 border-[#859900] flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                              {isAnalyzing ? (
                                <>
                                  <RefreshCw className="w-5 h-5 animate-spin" />{" "}
                                  Đang tải & phân tích...
                                </>
                              ) : (
                                <>
                                  <Cpu className="w-5 h-5" /> Tải & chạy
                                  pipeline AI ({selectedWeightIds.length}{" "}
                                  weight)
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                setSingleUrlInput("");
                                setSingleResultsByWeight({});
                              }}
                              className={`px-4 py-3 border-2 ${theme.border} ${theme.btnCancel} text-sm font-medium`}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-5 space-y-6">
                    <div
                      className={`${theme.bgCard} border-2 ${theme.border} p-6 h-full flex flex-col justify-between`}
                    >
                      <div>
                        <h2
                          className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-6 flex items-center gap-2`}
                        >
                          <BarChart2 className="w-4 h-4 text-[#268bd2]" />{" "}
                          Analysis Results
                        </h2>

                        {Object.keys(singleResultsByWeight).length > 0 && (
                          <WeightResultTabs
                            weights={availableWeights}
                            resultsByWeight={singleResultsByWeight}
                            activeWeightId={activeWeightId}
                            onSelect={setActiveWeightId}
                            theme={theme}
                          />
                        )}

                        {Object.keys(singleResultsByWeight).length === 0 &&
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
                              Extracting Spatial & Temporal Features...
                            </p>
                          </div>
                        )}

                        {!isAnalyzing && activeSingleEntry?.error && (
                          <div className="text-center py-16 text-[#dc322f]">
                            <X className="w-12 h-12 mx-auto mb-3 opacity-60" />
                            <p className="text-sm">
                              Lỗi với weight này: {activeSingleEntry.error}
                            </p>
                          </div>
                        )}

                        {!isAnalyzing && singleResult && (
                          <ResultSummary
                            result={singleResult}
                            theme={theme}
                            threshold={threshold}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {singleScores.length > 0 && !activeSingleEntry?.error && (
                  <div
                    className={`${theme.bgCard} border-2 ${theme.border} p-6 mt-8`}
                  >
                    <p className={`text-sm ${theme.textSub} mb-4`}>
                      Play the video to view real-time data below.
                    </p>

                    <h2
                      className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-4 flex items-center gap-2`}
                    >
                      <BarChart2 className="w-4 h-4 text-[#268bd2]" /> Video
                      Analysis
                    </h2>

                    <p className={`text-xs ${theme.textMain} mb-2`}>
                      Bấm vào biểu đồ để tua video tới đúng thời điểm đó.
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
                  className={`${theme.bgCard} border-2 ${theme.border} p-6`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <h2
                      className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider flex items-center gap-2`}
                    >
                      <Layers className="w-4 h-4 text-[#859900]" /> Xử lý nhiều
                      video
                    </h2>

                    <div className="flex flex-wrap items-center gap-3">
                      {batchItems.length > 0 && (
                        <span className={`text-xs ${theme.textSub}`}>
                          {doneCount}/{batchItems.length} đã xong
                        </span>
                      )}

                      <label
                        className={`text-xs px-3 py-2 border-2 ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-2`}
                      >
                        <Upload className="w-3.5 h-3.5" /> Thêm video
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
                        className={`text-xs px-3 py-2 border-2 ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-2`}
                      >
                        <Link2 className="w-3.5 h-3.5" /> Thêm từ URL
                      </button>

                      <label
                        className={`text-xs px-3 py-2 border-2 ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-2`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> Tải file
                        nhãn CSV
                        <input
                          type="file"
                          accept=".csv,text/csv"
                          className="hidden"
                          onChange={handleCsvFileSelected}
                        />
                      </label>

                      <button
                        onClick={runAllBatch}
                        disabled={
                          isBatchRunning ||
                          pendingCount === 0 ||
                          selectedWeightIds.length === 0
                        }
                        className="text-xs font-bold px-4 py-2 border-2 bg-[#859900] hover:brightness-110 text-[#002b36] flex items-center gap-2 transition-all disabled:opacity-50"
                      >
                        {isBatchRunning ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />{" "}
                            Đang chạy...
                          </>
                        ) : (
                          <>
                            <Cpu className="w-3.5 h-3.5" /> Chạy tất cả (
                            {pendingCount}) · {selectedWeightIds.length} weight
                          </>
                        )}
                      </button>

                      <button
                        onClick={() =>
                          downloadResultsCsv(batchItems, labelMap, threshold)
                        }
                        disabled={doneCount === 0}
                        className={`text-xs px-3 py-2 border-2 ${theme.border} ${theme.btnCancel} flex items-center gap-2 transition-colors disabled:opacity-40`}
                      >
                        <Download className="w-3.5 h-3.5" /> Xuất CSV
                      </button>

                      <button
                        onClick={clearBatch}
                        disabled={isBatchRunning || batchItems.length === 0}
                        className={`text-xs px-3 py-2 border-2 ${theme.border} ${theme.btnCancel} flex items-center gap-2 transition-colors disabled:opacity-40`}
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                      </button>
                    </div>
                  </div>

                  {showBatchUrlBox && (
                    <div
                      className={`mb-4 p-3 border-2 ${theme.border} ${theme.bgMain}`}
                    >
                      <textarea
                        value={batchUrlText}
                        onChange={(e) => setBatchUrlText(e.target.value)}
                        placeholder={
                          "Dán link YouTube / TikTok / Facebook..., mỗi dòng 1 link"
                        }
                        rows={3}
                        className={`w-full px-3 py-2 border-2 ${theme.border} ${theme.inputBg} ${theme.textHeading} text-xs outline-none focus:border-[#859900] mb-2`}
                      />

                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setShowBatchUrlBox(false);
                            setBatchUrlText("");
                          }}
                          className={`text-xs px-3 py-1.5 border-2 ${theme.border} ${theme.btnCancel}`}
                        >
                          Hủy
                        </button>

                        <button
                          onClick={handleAddBatchUrls}
                          disabled={!batchUrlText.trim()}
                          className="text-xs font-bold px-3 py-1.5 border-2 bg-[#859900] hover:brightness-110 text-[#002b36] disabled:opacity-50"
                        >
                          Thêm vào danh sách
                        </button>
                      </div>
                    </div>
                  )}

                  {csvInfo && (
                    <div
                      className={`flex items-center justify-between mb-4 px-3 py-2 border-2 ${theme.bgMain} ${theme.border} text-xs`}
                    >
                      <span className={theme.textSub}>
                        <span
                          className={`${theme.textHeading} font-medium`}
                        >
                          {csvInfo.fileName}
                        </span>{" "}
                        · {csvInfo.totalRows} dòng nhãn
                        {batchItems.length > 0 && (
                          <>
                            {" "}
                            · khớp {matchedLabelCount}/{batchItems.length} video
                            đã tải
                          </>
                        )}
                      </span>

                      <button
                        onClick={clearCsv}
                        className="text-[#dc322f] hover:underline"
                      >
                        Bỏ file CSV
                      </button>
                    </div>
                  )}

                  {batchItems.length === 0 ? (
                    <label
                      className={`border-2 border-dashed ${theme.border} hover:border-[#859900] ${theme.inputBg} p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group`}
                    >
                      <Upload className="w-12 h-12 text-[#93a1a1] group-hover:text-[#859900] mb-4 transition-colors" />

                      <p
                        className={`text-sm ${theme.textHeading} font-medium mb-1`}
                      >
                        Kéo thả nhiều video vào đây hoặc{" "}
                        <span className="text-[#268bd2]">chọn nhiều file</span>
                      </p>

                      <p className={`text-xs ${theme.textMain}`}>
                        Sau khi tải lên, bấm "Chạy tất cả" để xử lý lần lượt
                        từng video (mỗi video chạy hết các weight đã chọn cùng
                        lúc)
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
                          activeWeightId={activeWeightId}
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
                        className={`${theme.bgCard} border-2 ${theme.border} p-6`}
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
                          className={`relative aspect-video ${theme.bgMain} border-2 ${theme.border} overflow-hidden flex items-center justify-center`}
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
                                Video được backend tải trực tiếp từ link này để
                                phân tích, không xem trước được ở đây.
                              </p>
                            </div>
                          )}
                        </div>

                        {labelMap.has(selectedBatchItem.name) && (
                          <p className={`text-xs ${theme.textSub} mt-3`}>
                            Nhãn thật (CSV):{" "}
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
                        className={`${theme.bgCard} border-2 ${theme.border} p-6 h-full`}
                      >
                        <h2
                          className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-6 flex items-center gap-2`}
                        >
                          <BarChart2 className="w-4 h-4 text-[#268bd2]" />{" "}
                          Analysis Results
                        </h2>

                        {selectedBatchItem.status === "done" &&
                          selectedBatchItem.resultsByWeight && (
                            <WeightResultTabs
                              weights={availableWeights}
                              resultsByWeight={
                                selectedBatchItem.resultsByWeight
                              }
                              activeWeightId={activeWeightId}
                              onSelect={setActiveWeightId}
                              theme={theme}
                            />
                          )}

                        {selectedBatchItem.status === "queued" && (
                          <div
                            className={`text-center py-16 ${theme.textMain}`}
                          >
                            <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p className="text-sm">
                              Video đang chờ trong hàng đợi.
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
                              Extracting Spatial & Temporal Features...
                            </p>
                          </div>
                        )}

                        {selectedBatchItem.status === "error" && (
                          <div className="text-center py-16 text-[#dc322f]">
                            <X className="w-12 h-12 mx-auto mb-3 opacity-60" />
                            <p className="text-sm">
                              Xử lý thất bại: {selectedBatchItem.error}
                            </p>
                          </div>
                        )}

                        {selectedBatchItem.status === "done" &&
                          !activeWeightId && (
                            <div
                              className={`text-center py-16 ${theme.textMain}`}
                            >
                              <p className="text-sm">
                                Chọn 1 tab weight ở trên để xem kết quả.
                              </p>
                            </div>
                          )}

                        {selectedBatchItem.status === "done" &&
                          activeWeightId &&
                          !activeBatchEntry && (
                            <div
                              className={`text-center py-16 ${theme.textMain}`}
                            >
                              <p className="text-sm">
                                Video này chưa được chạy với weight đang xem.
                              </p>
                            </div>
                          )}

                        {selectedBatchItem.status === "done" &&
                          activeBatchEntry?.error && (
                            <div className="text-center py-16 text-[#dc322f]">
                              <X className="w-12 h-12 mx-auto mb-3 opacity-60" />
                              <p className="text-sm">
                                Lỗi với weight này: {activeBatchEntry.error}
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
                            />
                          )}
                      </div>
                    </div>
                  </div>
                ) : (
                  batchItems.length > 0 && (
                    <div
                      className={`${theme.bgCard} border-2 ${theme.border} p-10 text-center ${theme.textMain}`}
                    >
                      Chọn một video trong lưới phía trên để xem chi tiết và
                      biểu đồ.
                    </div>
                  )
                )}

                {selectedBatchItem &&
                  selectedBatchItem.status === "done" &&
                  activeBatchEntry &&
                  !activeBatchEntry.error &&
                  (activeBatchEntry.scores?.length ?? 0) > 0 && (
                    <div
                      className={`${theme.bgCard} border-2 ${theme.border} p-6`}
                    >
                      <p className={`text-sm ${theme.textSub} mb-4`}>
                        Play the video to view real-time data below.
                      </p>

                      <h2
                        className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-4 flex items-center gap-2`}
                      >
                        <BarChart2 className="w-4 h-4 text-[#268bd2]" /> Video
                        Analysis
                      </h2>

                      <p className={`text-xs ${theme.textMain} mb-2`}>
                        Bấm vào biểu đồ để tua video tới đúng thời điểm đó.
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
            setMockMode={(v: boolean) => {
              setMockMode(v);
              hasAutoSelectedRef.current = false;
            }}
            threshold={threshold}
            setThreshold={setThreshold}
            availableWeights={availableWeights}
            selectedWeightIds={selectedWeightIds}
            toggleWeightSelected={toggleWeightSelected}
            activeWeightId={activeWeightId}
            setActiveWeightId={setActiveWeightId}
            weightsError={weightsError}
            loadWeights={loadWeights}
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