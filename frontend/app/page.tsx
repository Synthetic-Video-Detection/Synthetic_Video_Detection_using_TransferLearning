"use client";
import React, { useMemo, useState, useRef, useEffect } from "react";
import { Noto_Serif } from "next/font/google";
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

// Font "Noto Serif" có đầy đủ bảng chữ Việt (dấu thanh, ký tự ghép) —
// font-serif mặc định của Tailwind (Georgia/Times New Roman) thiếu glyph
// tiếng Việt nên trình duyệt phải chắp vá bằng font hệ thống, gây ra lỗi
// hiển thị kiểu "nhiề u" (chữ bị tách, lệch khoảng cách) như đã gặp.
const notoSerif = Noto_Serif({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

type ScorePoint = { time: number; score: number };

type AnalysisResult = { isSynthetic: boolean; confidence: number; probability_ai?: number };

type BatchStatus = "queued" | "processing" | "done" | "error";

type BatchItem = {
  id: string;
  file: File;
  url: string;
  status: BatchStatus;
  result?: AnalysisResult;
  scores?: ScorePoint[];
  error?: string;
};

// Ngưỡng mặc định khi mở trang. Có thể chỉnh trực tiếp trên giao diện
// (xem state `threshold` trong component) — không còn là hằng số cố định.
const DEFAULT_THRESHOLD = 0.5;

// REPLACE THIS with your active Ngrok URL from Colab
const NGROK_URL = "https://derived-expanse-roundish.ngrok-free.dev/upload";

let idCounter = 0;
function makeId() {
  idCounter += 1;
  return `vid_${Date.now()}_${idCounter}`;
}

// --------------------------------------------------------------------- //
// Vì backend trả về "probability_ai" (điểm thô 0..1) song song với "label"
// (nhãn backend tự chấm ở ngưỡng CỐ ĐỊNH 0.5), toàn bộ phần hiển thị/chấm
// điểm ở frontend đều nên tính lại nhãn + độ tin cậy từ probability_ai theo
// đúng threshold người dùng đang chỉnh trên UI — thay vì dùng thẳng "label"
// gốc từ backend. Nhờ vậy kéo thanh trượt threshold có thể đổi màu/nhãn
// NGAY LẬP TỨC cho toàn bộ video đã chạy, không cần gọi lại pipeline.
// --------------------------------------------------------------------- //
function classifyWithThreshold(result: AnalysisResult, threshold: number) {
  const p = result.probability_ai ?? (result.isSynthetic ? 1 : 0);
  const isSynthetic = p > threshold;
  const confidence = isSynthetic ? p : 1 - p;
  return { isSynthetic, confidence, probability_ai: p };
}

// Gọi đúng 1 lần API upload cho 1 file, trả về kết quả chuẩn hóa.
async function analyzeVideoFile(file: File): Promise<{ result: AnalysisResult; scores: ScorePoint[] }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(NGROK_URL, {
    method: "POST",
    body: formData,
    headers: {
      "ngrok-skip-browser-warning": "true",
    },
  });

  if (!response.ok) {
    // Backend (FastAPI) trả kèm JSON có trường "error" giải thích lý do cụ
    // thể (ví dụ "Could not sample 8 frames..."), đọc ra để hiện thẳng lên
    // card lỗi thay vì chỉ hiện mã trạng thái HTTP chung chung.
    let message = `Server returned status: ${response.status}`;
    try {
      const errBody = await response.json();
      if (errBody?.error) message = errBody.error;
    } catch {
      // Backend không trả JSON hợp lệ (vd: lỗi 502/504 từ Ngrok) -> giữ message mặc định
    }
    throw new Error(message);
  }

  const data = await response.json();

  const result: AnalysisResult = {
    isSynthetic: data.label,
    confidence: data.confidence,
    probability_ai: data.probability_ai,
  };

  const scores: ScorePoint[] = Array.isArray(data.scores)
    ? data.scores.map((p: any) => ({ time: Number(p.time), score: Number(p.score) }))
    : [];

  return { result, scores };
}

// --------------------------------------------------------------------- //
// CHẾ ĐỘ TEST (MOCK) — sinh kết quả giả để kiểm tra toàn bộ giao diện
// (lưới video, viền màu đúng/sai, chỉ số AUROC/Accuracy/..., thanh trượt
// threshold) mà KHÔNG cần gọi Ngrok/Colab. Dùng PRNG có seed theo tên file
// (mulberry32) để cùng 1 file luôn ra cùng 1 kết quả giả giữa các lần chạy
// — tiện để so sánh trước/sau khi chỉnh threshold, thay vì random loạn mỗi
// lần bấm "Chạy tất cả".
// --------------------------------------------------------------------- //
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

// groundTruth (nếu biết từ CSV) chỉ dùng để "lái" điểm giả cho GIỐNG một
// model hoạt động khá tốt (~80% đúng) thay vì random 50/50 vô nghĩa —
// hoàn toàn không đọc/không cần backend thật.
function generateMockResult(file: File, groundTruth?: number): Promise<{ result: AnalysisResult; scores: ScorePoint[] }> {
  return new Promise((resolve) => {
    const delay = 350 + Math.random() * 900; // mô phỏng độ trễ mạng/inference cho giống thật
    setTimeout(() => {
      const rng = mulberry32(stringSeed(file.name));

      let base: number;
      if (groundTruth === 1) base = 0.55 + rng() * 0.4; // thiên về AI nhưng có nhiễu
      else if (groundTruth === 0) base = rng() * 0.4; // thiên về Real nhưng có nhiễu
      else base = rng(); // không biết nhãn thật -> ngẫu nhiên đều

      const flip = rng() < 0.18; // ~18% khả năng "model giả" đoán sai hẳn, cho giống thật
      let probability_ai = flip ? 1 - base : base;
      probability_ai = Math.min(0.99, Math.max(0.01, probability_ai));

      const isSynthetic = probability_ai > 0.5; // nhãn baseline (backend quy ước threshold 0.5)
      const confidence = isSynthetic ? probability_ai : 1 - probability_ai;

      const duration = 8 + rng() * 40; // thời lượng giả 8-48s
      const scores: ScorePoint[] = [];
      for (let t = 0; t <= duration; t += 1) {
        const noise = (rng() - 0.5) * 0.25;
        scores.push({ time: Math.round(t * 100) / 100, score: Math.min(1, Math.max(0, probability_ai + noise)) });
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

// --------------------------------------------------------------------- //
// CSV parser tối giản (RFC4180: hỗ trợ field có dấu ngoặc kép / dấu phẩy
// bên trong). Chỉ bắt buộc CSV có cột "name" và "label" (0 = Real, 1 = AI),
// các cột khác (fps, model, ...) đều được bỏ qua an toàn nếu có.
// --------------------------------------------------------------------- //
function parseCsv(text: string): Record<string, string>[] {
  const clean = text.replace(/^\uFEFF/, ""); // bỏ BOM nếu có
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

// name -> 0 (Real) | 1 (AI). Chấp nhận vài tên cột thay thế phổ biến,
// và vài dạng giá trị chữ (AI/Real/Fake) phòng khi label không phải 0/1.
function buildLabelMap(rows: Record<string, string>[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    const name = (row["name"] ?? row["filename"] ?? row["file"] ?? row["video"] ?? "").trim();
    const rawLabel = row["label"] ?? row["class"] ?? row["ground_truth"] ?? row["y"] ?? "";
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
  // null = không đủ dữ liệu để tính (khác với 0%, vốn là một kết quả đo được)
  precision: number | null;
  recall: number | null;
  f1: number | null;
  auroc: number | null;
  nPos: number;
  nNeg: number;
};

// AUROC được tính bằng công thức Mann–Whitney U (dựa trên xếp hạng
// probability_ai), không phụ thuộc threshold và không cần thư viện ngoài.
// Các chỉ số còn lại (accuracy/precision/recall/f1) tính từ ma trận nhầm
// lẫn ở ĐÚNG threshold người dùng đang chỉnh trên UI.
function computeMetrics(items: BatchItem[], labelMap: Map<string, number>, threshold: number): Metrics | null {
  const evaluable = items
    .filter((it) => it.status === "done" && it.result && labelMap.has(it.file.name))
    .map((it) => {
      const truth = labelMap.get(it.file.name) as number;
      const classified = classifyWithThreshold(it.result!, threshold);
      const pred = classified.isSynthetic ? 1 : 0;
      const score = classified.probability_ai;
      return { score, pred, truth };
    });

  if (evaluable.length === 0) return null;

  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0;
  for (const e of evaluable) {
    if (e.pred === 1 && e.truth === 1) tp++;
    else if (e.pred === 1 && e.truth === 0) fp++;
    else if (e.pred === 0 && e.truth === 1) fn++;
    else tn++;
  }

  const n = evaluable.length;
  const accuracy = (tp + tn) / n;

  // Precision không xác định được nếu model không dự đoán "AI" cho video nào (TP+FP=0).
  // Recall không xác định được nếu tập nhãn không có video "AI" thật nào (TP+FN=0).
  const precision: number | null = tp + fp > 0 ? tp / (tp + fp) : null;
  const recall: number | null = tp + fn > 0 ? tp / (tp + fn) : null;
  const f1: number | null =
    precision != null && recall != null ? (precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0) : null;

  const nPos = evaluable.filter((e) => e.truth === 1).length;
  const nNeg = evaluable.filter((e) => e.truth === 0).length;
  let auroc: number | null = null;

  if (nPos > 0 && nNeg > 0) {
    const sorted = [...evaluable].sort((a, b) => a.score - b.score);
    const ranks = new Array(sorted.length).fill(0);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j + 1 < sorted.length && sorted[j + 1].score === sorted[i].score) j++;
      const avgRank = (i + 1 + j + 1) / 2; // rank trung bình cho các giá trị bằng nhau (ties), 1-based
      for (let k = i; k <= j; k++) ranks[k] = avgRank;
      i = j + 1;
    }
    let sumRankPos = 0;
    sorted.forEach((e, idx) => {
      if (e.truth === 1) sumRankPos += ranks[idx];
    });
    auroc = (sumRankPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
  }

  return { n, tp, fp, fn, tn, accuracy, precision, recall, f1, auroc, nPos, nNeg };
}

// --------------------------------------------------------------------- //
// Xuất CSV kết quả: tên video, nhãn dự đoán (theo threshold hiện tại),
// synthetic score thô, và nếu có nhãn CSV gốc thì kèm luôn nhãn thật + so
// khớp đúng/sai — để dễ đối chiếu ngoài Excel/Sheets.
// --------------------------------------------------------------------- //
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildResultsCsv(items: BatchItem[], labelMap: Map<string, number>, threshold: number): string {
  const header = ["name", "predicted_label", "synthetic_score", "ground_truth_label", "match"];
  const rows = items
    .filter((it) => it.status === "done" && it.result)
    .map((it) => {
      const classified = classifyWithThreshold(it.result!, threshold);
      const predictedLabel = classified.isSynthetic ? "AI" : "Real";
      const groundTruthRaw = labelMap.get(it.file.name);
      const groundTruthLabel = groundTruthRaw === undefined ? "" : groundTruthRaw === 1 ? "AI" : "Real";
      const match =
        groundTruthRaw === undefined ? "" : (classified.isSynthetic ? 1 : 0) === groundTruthRaw ? "correct" : "incorrect";
      return [
        escapeCsvField(it.file.name),
        predictedLabel,
        classified.probability_ai.toFixed(4),
        groundTruthLabel,
        match,
      ].join(",");
    });
  return [header.join(","), ...rows].join("\r\n");
}

function downloadResultsCsv(items: BatchItem[], labelMap: Map<string, number>, threshold: number) {
  const csvContent = buildResultsCsv(items, labelMap, threshold);
  // Thêm BOM (\uFEFF) để Excel nhận đúng UTF-8, không bị lỗi font tiếng Việt khi mở file.
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ket_qua_threshold_${Math.round(threshold * 100)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// --- Theme type dùng chung cho các component con ---
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

function ResultSummary({ result, theme, threshold }: { result: AnalysisResult; theme: Theme; threshold: number }) {
  const classified = classifyWithThreshold(result, threshold);
  const prob = classified.probability_ai;
  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <div
        className={`p-4 rounded-lg border flex items-center gap-4 ${
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
          <h3 className={`font-normal italic text-lg ${notoSerif.className}`}>
            {classified.isSynthetic ? "Khả năng cao Video AI" : "Video thật"}
          </h3>
          <p className={`text-xs opacity-80 mt-1 font-sans ${theme.textMain}`}>
            {classified.isSynthetic
              ? "Hệ thống phát hiện ra những artifact đặc trưng của các công cụ Diffusion"
              : "Khả năng cao video này là một video không được tạo bởi các công cụ Diffusion"}
          </p>
        </div>
      </div>

      {/* Gauge Metric */}
      <div className={`${theme.bgMain} p-4 rounded-lg border ${theme.border} transition-colors`}>
        <div className="flex justify-between text-xs mb-2 font-sans">
          <span className={theme.textSub}>Khả năng AI:</span>
          <span className={`font-bold ${theme.textHeading}`}>{(prob * 100).toFixed(1)}%</span>
        </div>
        <div className={`relative w-full ${theme.bgCard} h-3 rounded-full overflow-hidden`}>
          <div
            className="bg-[#dc322f] h-full rounded-full transition-all duration-1000"
            style={{ width: `${prob * 100}%` }}
          ></div>
          {/* Vạch đánh dấu ngưỡng (threshold) hiện tại trên thanh gauge */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/80"
            style={{ left: `${threshold * 100}%` }}
            title={`Threshold: ${(threshold * 100).toFixed(0)}%`}
          ></div>
        </div>
      </div>

      {/* Detailed Metadata Breakdown */}
      <div className="space-y-2 text-xs font-sans">
        <div className={`flex justify-between py-2 border-b ${theme.border}`}>
          <span className={theme.textMain}>Model Back-end:</span>
          <span className={`${theme.textHeading} font-mono`}>FastAPI + PyTorch Pipeline</span>
        </div>
        <div className={`flex justify-between py-2 border-b ${theme.border}`}>
          <span className={theme.textMain}>Điểm nghi ngờ:</span>
          <span className={`${theme.textHeading} font-mono`}>{prob.toFixed(4)}</span>
        </div>
        <div className={`flex justify-between py-2 border-b ${theme.border}`}>
          <span className={theme.textMain}>Threshold đang dùng:</span>
          <span className={`${theme.textHeading} font-mono`}>{threshold.toFixed(2)}</span>
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
        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#0a4a58" : "#d9d2b8"} />
        <XAxis
          dataKey="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          tick={{ fill: isDarkMode ? "#839496" : "#586e75", fontSize: 12 }}
          label={{
            value: "Time (seconds)",
            position: "bottom",
            offset: 0,
            fill: isDarkMode ? "#839496" : "#586e75",
          }}
        />
        <YAxis
          domain={[0, 1]}
          tick={{ fill: isDarkMode ? "#839496" : "#586e75", fontSize: 12 }}
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
          formatter={(v: number) => [Number(v).toFixed(3), "Synthetic score"]}
        />
        <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 12, paddingBottom: 8 }} />
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
          label={{ value: "Current Time", position: "top", fill: "#dc322f", fontSize: 11 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Một ô thống kê trong bảng chỉ số (AUROC / Accuracy / Precision / Recall / F1)
function MetricBox({ label, value, theme }: { label: string; value: string; theme: Theme }) {
  return (
    <div className={`${theme.bgMain} border ${theme.border} rounded-lg p-3 text-center`}>
      <p className={`text-[11px] uppercase tracking-wider ${theme.textSub} font-sans mb-1`}>{label}</p>
      <p className={`text-xl font-bold ${theme.textHeading} font-mono`}>{value}</p>
    </div>
  );
}

// Thẻ video dạng lưới cho tab xử lý hàng loạt. Viền màu phản ánh:
// - chưa chạy / đang chạy: màu trung tính hoặc xanh dương nhấp nháy
// - đã chạy NHƯNG không có nhãn CSV để đối chiếu: theo màu nhãn dự đoán (cam = AI, lam = Real)
// - đã chạy VÀ có nhãn CSV: xanh lá = dự đoán khớp nhãn thật, đỏ = dự đoán sai nhãn thật
// Nhãn dự đoán luôn tính lại theo `threshold` hiện tại, không dùng "label" gốc từ backend.
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
  const classified = item.status === "done" && item.result ? classifyWithThreshold(item.result, threshold) : null;
  const predicted = classified ? (classified.isSynthetic ? 1 : 0) : undefined;
  const hasGroundTruth = groundTruth !== undefined;
  const isCorrect = hasGroundTruth && predicted !== undefined ? predicted === groundTruth : undefined;

  let borderColor = "#0a4a58"; // mặc định (queued)
  if (item.status === "processing") borderColor = "#268bd2";
  else if (item.status === "error") borderColor = "#dc322f";
  else if (item.status === "done") {
    if (isCorrect === true) borderColor = "#859900"; // đúng nhãn CSV -> xanh lá
    else if (isCorrect === false) borderColor = "#dc322f"; // sai nhãn CSV -> đỏ
    else borderColor = predicted === 1 ? "#b58900" : "#268bd2"; // không có nhãn để so -> theo màu dự đoán
  }

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-[1.02] bg-black"
      style={{
        border: `3px solid ${borderColor}`,
        outline: isSelected ? "2px solid white" : "none",
        outlineOffset: isSelected ? "1px" : "0",
      }}
      onClick={onSelect}
    >
      <div className="aspect-video w-full bg-black">
        <video src={item.url} muted preload="metadata" className="w-full h-full object-cover pointer-events-none" />
      </div>

      {/* Thanh trên: tên file + nút xóa */}
      <div className="absolute top-0 inset-x-0 px-2 py-1 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between gap-1 font-sans">
        <span className="text-[10px] text-white/90 truncate">{item.file.name}</span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (!disableRemove) onRemove();
          }}
          className={`p-0.5 rounded hover:bg-white/20 text-white/80 shrink-0 ${disableRemove ? "opacity-30 pointer-events-none" : ""}`}
        >
          <X className="w-3 h-3" />
        </span>
      </div>

      {/* Overlay trạng thái khi đang chờ / đang chạy / lỗi */}
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

      {/* Thanh dưới: nhãn dự đoán + đối chiếu CSV (nếu có) */}
      {item.status === "done" && classified && (
        <div className="absolute bottom-0 inset-x-0 px-2 py-1 bg-black/75 flex items-center justify-between font-sans">
          <span className={`text-[10px] font-bold ${classified.isSynthetic ? "text-[#dc322f]" : "text-[#859900]"}`}>
            {classified.isSynthetic ? "AI" : "Real"} · {(classified.probability_ai * 100).toFixed(0)}%
          </span>
          {hasGroundTruth &&
            (isCorrect ? (
              <Check className="w-3.5 h-3.5 text-[#859900]" />
            ) : (
              <X className="w-3.5 h-3.5 text-[#dc322f]" />
            ))}
        </div>
      )}
    </div>
  );
}

export default function SyntheticVideoDetector() {
  const [activeTab, setActiveTab] = useState<"single" | "batch">("single");
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Ngưỡng phân loại — chỉnh được trực tiếp trên UI, áp dụng ngay lập tức
  // cho toàn bộ kết quả ĐÃ CÓ (không cần chạy lại pipeline) vì ta luôn giữ
  // nguyên probability_ai thô của từng video.
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  // Chế độ test bằng dữ liệu giả — bật lên để kiểm tra toàn bộ giao diện
  // khi chưa truy cập được backend (Colab/Ngrok).
  const [mockMode, setMockMode] = useState(false);

  // --- Single video tab state ---
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [scoreData, setScoreData] = useState<ScorePoint[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // --- Batch tab state ---
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchCurrentTime, setBatchCurrentTime] = useState(0);
  const batchVideoRef = useRef<HTMLVideoElement>(null);
  const batchUrlsRef = useRef<string[]>([]);

  // Nhãn thật (ground truth) lấy từ file CSV: tên file -> 0 (Real) | 1 (AI)
  const [labelMap, setLabelMap] = useState<Map<string, number>>(new Map());
  const [csvInfo, setCsvInfo] = useState<{ fileName: string; totalRows: number } | null>(null);

  // Tạo object URL đúng MỘT LẦN cho mỗi file, thay vì gọi
  // URL.createObjectURL() ngay trong JSX — gọi trong JSX tạo ra một blob URL
  // MỚI ở mỗi lần re-render (ví dụ mỗi lần onTimeUpdate chạy), khiến <video>
  // nghĩ src đã đổi và tự nạp lại/dừng phát. Đây là lý do video bấm Play không chạy.
  useEffect(() => {
    if (!selectedFile) {
      setVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  // Giải phóng toàn bộ blob URL của danh sách hàng loạt khi component unmount
  useEffect(() => {
    return () => {
      batchUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // Đổi video đang chọn trong tab hàng loạt -> reset mốc thời gian
  useEffect(() => {
    setBatchCurrentTime(0);
  }, [selectedBatchId]);

  // --- SOLARIZED THEME (WARM WHITE / DARK) ---
  const theme: Theme = {
    bgMain: isDarkMode ? "bg-[#002b36]" : "bg-[#fdf6e3]",
    bgCard: isDarkMode ? "bg-[#073642]" : "bg-[#eee8d5]",
    textMain: isDarkMode ? "text-[#93a1a1]" : "text-[#657b83]",
    textHeading: isDarkMode ? "text-[#eee8d5]" : "text-[#586e75]",
    textSub: isDarkMode ? "text-[#839496]" : "text-[#586e75]",
    border: isDarkMode ? "border-[#0a4a58]" : "border-[#d9d2b8]",
    inputBg: isDarkMode ? "bg-[#00212b]/60" : "bg-[#f5efdc]",
    btnCancel: isDarkMode ? "bg-[#00212b] hover:bg-[#0a4a58] text-[#93a1a1]" : "bg-[#f5efdc] hover:bg-[#e3dcc4] text-[#586e75]",
  };

  const tabBtn = (isActive: boolean) =>
    `flex items-center gap-2 px-4 py-2.5 text-sm font-sans font-medium rounded-lg border transition-all ${
      isActive
        ? `${theme.bgCard} ${theme.border} ${theme.textHeading}`
        : `bg-transparent border-transparent ${theme.textSub} hover:${theme.bgCard}`
    }`;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setResult(null);
    setScoreData([]);
    setCurrentTime(0);

    try {
      const { result: r, scores } = mockMode
        ? await generateMockResult(selectedFile)
        : await analyzeVideoFile(selectedFile);
      setResult(r);
      setScoreData(scores);
    } catch (error) {
      console.error("API Upload Error:", error);
      alert("Không thể kết nối tới model AI qua Ngrok. Vui lòng kiểm tra lại URL!");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Called continuously while the video plays, moves the red "Current Time" line
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Tua video tới đúng giây được bấm trên biểu đồ (giống demo NVIDIA)
  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // ================= BATCH TAB HANDLERS =================

  const handleBatchFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BatchItem[] = Array.from(files).map((file) => {
      const url = URL.createObjectURL(file);
      batchUrlsRef.current.push(url);
      return { id: makeId(), file, url, status: "queued" as BatchStatus };
    });

    setBatchItems((prev) => [...prev, ...newItems]);
    // Cho phép chọn lại đúng file đó lần nữa sau này
    e.target.value = "";
  };

  const handleCsvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // Xử lý 1 video, cập nhật đúng phần tử tương ứng trong danh sách.
  // labelMap được truyền vào để chế độ mock "lái" điểm giả theo nhãn CSV
  // thật (nếu có) cho ra kết quả giống một model thật hơn là random thuần.
  const processOneBatchItem = async (id: string, file: File) => {
    setBatchItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "processing", error: undefined } : it)));
    setSelectedBatchId(id);

    try {
      const { result: r, scores } = mockMode
        ? await generateMockResult(file, labelMap.get(file.name))
        : await analyzeVideoFile(file);
      setBatchItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, status: "done", result: r, scores } : it))
      );
    } catch (err: any) {
      console.error("Batch upload error:", err);
      setBatchItems((prev) =>
        prev.map((it) =>
          it.id === id ? { ...it, status: "error", error: err?.message ?? "Lỗi không xác định" } : it
        )
      );
    }
  };

  // Chạy lần lượt từng video một (không chạy song song) — video đứng trước
  // xử lý xong mới tới video tiếp theo, giống yêu cầu "chạy lần lượt".
  const runAllBatch = async () => {
    if (isBatchRunning) return;
    const queue = batchItems.filter((it) => it.status === "queued" || it.status === "error");
    if (queue.length === 0) return;

    setIsBatchRunning(true);
    for (const item of queue) {
      // eslint-disable-next-line no-await-in-loop
      await processOneBatchItem(item.id, item.file);
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

  const selectedBatchItem = batchItems.find((it) => it.id === selectedBatchId) || null;
  const doneCount = batchItems.filter((it) => it.status === "done").length;
  const pendingCount = batchItems.filter((it) => it.status === "queued" || it.status === "error").length;
  const matchedLabelCount = useMemo(
    () => batchItems.filter((it) => labelMap.has(it.file.name)).length,
    [batchItems, labelMap]
  );
  const metrics = useMemo(() => computeMetrics(batchItems, labelMap, threshold), [batchItems, labelMap, threshold]);

  return (
    <div
      className={`min-h-screen ${theme.bgMain} ${theme.textMain} ${notoSerif.className} antialiased transition-colors duration-300`}
    >
      {/* Header Section */}
      <header className={`border-b ${theme.border} ${theme.bgMain}/90 backdrop-blur sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`${theme.textHeading} font-bold text-lg tracking-wide transition-colors`}>
              [Tên dự án]
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-sans">
            {mockMode ? (
              <span className="flex items-center gap-1.5 text-[#b58900] bg-[#b58900]/10 px-3 py-1 rounded-full border border-[#b58900]/50">
                <FlaskConical className="w-3.5 h-3.5" />
                Chế độ test (dữ liệu giả)
              </span>
            ) : (
              <span className={`flex items-center gap-1.5 text-[#859900] ${theme.bgCard} px-3 py-1 rounded-full border ${theme.border} transition-colors`}>
                <span className="w-2 h-2 rounded-full bg-[#859900] animate-pulse"></span>
                Đã kết nối
              </span>
            )}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full ${theme.bgCard} border ${theme.border} hover:opacity-80 transition-all`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#b58900]" /> : <Moon className="w-4 h-4 text-[#6c71c4]" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-6">
          <h1 className={`text-3xl font-normal italic ${theme.textHeading} mb-2 transition-colors`}>
            Synthetic Video Detection
          </h1>
          <p className={`${theme.textSub} max-w-3xl text-sm transition-colors`}>
            Tải lên một video để dự đoán video có phải được các model Diffusion tạo ra
          </p>
        </div>

        {/* Bảng chỉ số đánh giá — đặt TRÊN thanh threshold để kéo thử ngưỡng
            là thấy ngay số liệu đổi theo, không cần cuộn xuống lưới video. */}
        {metrics && (
          <div className={`${theme.bgCard} border ${theme.border} rounded-lg p-6 mb-6 transition-colors duration-300`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className={`text-sm font-normal ${theme.textHeading} uppercase tracking-wider flex items-center gap-2 font-sans transition-colors`}>
                <Gauge className="w-4 h-4 text-[#268bd2]" /> Chỉ số đánh giá
              </h2>
              <div className="flex items-center gap-3 font-sans">
                <span className={`text-xs ${theme.textSub}`}>
                  Tính trên {metrics.n} video có nhãn CSV khớp tên file · threshold {(threshold * 100).toFixed(0)}%
                </span>
                <button
                  onClick={() => downloadResultsCsv(batchItems, labelMap, threshold)}
                  className={`text-xs px-3 py-1.5 rounded-lg border ${theme.border} ${theme.btnCancel} flex items-center gap-1.5 transition-colors shrink-0`}
                >
                  <Download className="w-3.5 h-3.5" /> Xuất CSV kết quả
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <MetricBox label="AUROC" value={metrics.auroc != null ? metrics.auroc.toFixed(3) : "N/A"} theme={theme} />
              <MetricBox label="Accuracy" value={`${(metrics.accuracy * 100).toFixed(1)}%`} theme={theme} />
              <MetricBox label="Precision" value={metrics.precision != null ? `${(metrics.precision * 100).toFixed(1)}%` : "N/A"} theme={theme} />
              <MetricBox label="Recall" value={metrics.recall != null ? `${(metrics.recall * 100).toFixed(1)}%` : "N/A"} theme={theme} />
              <MetricBox label="F1-score" value={metrics.f1 != null ? `${(metrics.f1 * 100).toFixed(1)}%` : "N/A"} theme={theme} />
            </div>
            <p className={`text-[11px] ${theme.textSub} font-sans mt-3`}>
              Ma trận nhầm lẫn: TP={metrics.tp} · FP={metrics.fp} · FN={metrics.fn} · TN={metrics.tn}
            </p>
            {(metrics.nPos === 0 || metrics.nNeg === 0) && (
              <p className={`text-[11px] text-[#b58900] font-sans mt-1`}>
                {metrics.nPos === 0
                  ? "Tập nhãn khớp hiện không có video nào gắn nhãn AI (1) — nên Recall, F1 và AUROC hiển thị N/A vì không đủ dữ liệu để tính, không phải model làm sai."
                  : "Tập nhãn khớp hiện không có video nào gắn nhãn Real (0) — nên AUROC hiển thị N/A vì không đủ dữ liệu để tính."}
              </p>
            )}
            {metrics.precision === 0 && metrics.tp === 0 && metrics.fp > 0 && (
              <p className={`text-[11px] text-[#dc322f] font-sans mt-1`}>
                Precision 0% có nghĩa: trong {metrics.fp} video model đoán là "AI", không cái nào thật sự là AI theo CSV — thử kéo threshold cao hơn để giảm báo động giả.
              </p>
            )}
          </div>
        )}

        {/* Bảng điều khiển chung: Threshold + Chế độ test — áp dụng cho cả 2 tab */}
        <div className={`${theme.bgCard} border ${theme.border} rounded-lg p-4 mb-6 flex flex-wrap items-center gap-6 font-sans transition-colors duration-300`}>
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            <SlidersHorizontal className="w-4 h-4 text-[#268bd2] shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1">
                <span className={theme.textSub}>Ngưỡng phân loại (threshold)</span>
                <span className={`font-bold ${theme.textHeading}`}>{(threshold * 100).toFixed(0)}%</span>
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
                Video có xác suất AI lớn hơn {(threshold * 100).toFixed(0)}% sẽ bị coi là AI-generated. Chỉnh xong áp dụng ngay, không cần chạy lại pipeline.
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
              <span className={`text-xs font-bold flex items-center gap-1 ${mockMode ? "text-[#b58900]" : theme.textHeading}`}>
                <FlaskConical className="w-3.5 h-3.5" /> Chế độ test (dữ liệu giả)
              </span>
              <span className={`text-[11px] ${theme.textSub} block mt-0.5`}>
                Sinh kết quả giả để test giao diện, không cần gọi backend Ngrok/Colab.
              </span>
            </span>
          </label>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-8 font-sans">
          <button className={tabBtn(activeTab === "single")} onClick={() => setActiveTab("single")}>
            <Film className="w-4 h-4" /> Video đơn
          </button>
          <button className={tabBtn(activeTab === "batch")} onClick={() => setActiveTab("batch")}>
            <Layers className="w-4 h-4" /> Xử lý hàng loạt
          </button>
        </div>

        {/* ================= SINGLE VIDEO TAB ================= */}
        {activeTab === "single" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Input & Media Player */}
              <div className="lg:col-span-7 space-y-6">
                <div className={`${theme.bgCard} xl border ${theme.border} p-6 transition-colors duration-300`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className={`text-sm font-normal ${theme.textHeading} uppercase tracking-wider flex items-center gap-2 font-sans transition-colors`}>
                      <Play className="w-4 h-4 text-[#859900]" /> Video Input
                    </h2>
                    {selectedFile && (
                      <span className={`text-xs ${theme.textSub} truncate max-w-[200px] font-sans`}>
                        {selectedFile.name}
                      </span>
                    )}
                  </div>

                  {!selectedFile ? (
                    <label className={`border-2 border-dashed ${theme.border} hover:border-[#859900] ${theme.inputBg} rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer transition-all group`}>
                      <Upload className="w-12 h-12 text-[#93a1a1] group-hover:text-[#859900] mb-4 transition-colors" />
                      <p className={`text-sm ${theme.textHeading} font-medium mb-1 font-sans transition-colors`}>
                        Drag and drop video here or <span className="text-[#268bd2]">browse files</span>
                      </p>
                      <p className={`text-xs ${theme.textMain} font-sans transition-colors`}>Supports MP4, MOV, AVI (Max 100MB)</p>
                      <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                    </label>
                  ) : (
                    <div className="space-y-4">
                      <div className={`relative aspect-video ${theme.bgMain} rounded-lg overflow-hidden border ${theme.border} flex items-center justify-center`}>
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

                      <div className="flex gap-3 font-sans">
                        <button
                          onClick={handleAnalyze}
                          disabled={isAnalyzing}
                          className="flex-1 bg-[#859900] hover:brightness-110 text-[#002b36] font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                          {isAnalyzing ? (
                            <>
                              <RefreshCw className="w-5 h-5 animate-spin" /> Analyzing frames...
                            </>
                          ) : (
                            <>
                              <Cpu className="w-5 h-5" /> Chạy pipeline AI xử lí
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedFile(null);
                            setResult(null);
                          }}
                          className={`px-4 py-3 border ${theme.border} ${theme.btnCancel} rounded-lg text-sm font-medium transition-colors`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Analysis Results */}
              <div className="lg:col-span-5 space-y-6">
                <div className={`${theme.bgCard} xl border ${theme.border} p-6 h-full flex flex-col justify-between transition-colors duration-300`}>
                  <div>
                    <h2 className={`text-sm font-normal ${theme.textHeading} uppercase tracking-wider mb-6 flex items-center gap-2 font-sans transition-colors`}>
                      <BarChart2 className="w-4 h-4 text-[#268bd2]" /> Analysis Results
                    </h2>

                    {!result && !isAnalyzing && (
                      <div className={`text-center py-16 ${theme.textMain}`}>
                        <Cpu className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-sans">No data available. Please upload a video and run the model.</p>
                      </div>
                    )}

                    {isAnalyzing && (
                      <div className="space-y-6 py-8">
                        <div className="animate-pulse space-y-3">
                          <div className={`h-4 ${theme.bgMain} rounded w-3/4`}></div>
                          <div className={`h-10 ${theme.bgMain} rounded`}></div>
                          <div className={`h-20 ${theme.bgMain} rounded`}></div>
                        </div>
                        <p className="text-xs text-center text-[#268bd2] font-sans animate-pulse">
                          Extracting Spatial & Temporal Features...
                        </p>
                      </div>
                    )}

                    {result && !isAnalyzing && <ResultSummary result={result} theme={theme} threshold={threshold} />}
                  </div>
                </div>
              </div>
            </div>

            {/* Real-time Score Chart */}
            {scoreData.length > 0 && (
              <div className={`${theme.bgCard} border ${theme.border} p-6 mt-8 transition-colors duration-300`}>
                <p className={`text-sm ${theme.textSub} mb-4 font-sans transition-colors`}>
                  Play the video to view real-time data below.
                </p>
                <h2 className={`text-sm font-normal ${theme.textHeading} uppercase tracking-wider mb-4 flex items-center gap-2 font-sans transition-colors`}>
                  <BarChart2 className="w-4 h-4 text-[#268bd2]" /> Video Analysis
                </h2>
                <p className={`text-xs ${theme.textMain} mb-2 font-sans transition-colors`}>
                  Bấm vào biểu đồ để tua video tới đúng thời điểm đó.
                </p>
                <ScoreChart
                  data={scoreData}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  isDarkMode={isDarkMode}
                  threshold={threshold}
                />
              </div>
            )}
          </>
        )}

        {/* ================= BATCH TAB ================= */}
        {activeTab === "batch" && (
          <div className="space-y-6">
            {/* Upload + Controls */}
            <div className={`${theme.bgCard} border ${theme.border} p-6 transition-colors duration-300`}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <h2 className={`text-sm font-normal ${theme.textHeading} uppercase tracking-wider flex items-center gap-2 font-sans transition-colors`}>
                  <Layers className="w-4 h-4 text-[#859900]" /> Xử lý nhiều video
                </h2>
                <div className="flex flex-wrap items-center gap-3 font-sans">
                  {batchItems.length > 0 && (
                    <span className={`text-xs ${theme.textSub}`}>
                      {doneCount}/{batchItems.length} đã xong
                    </span>
                  )}
                  <label
                    className={`text-xs px-3 py-2 rounded-lg border ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-2 transition-colors`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Thêm video
                    <input type="file" accept="video/*" multiple className="hidden" onChange={handleBatchFilesSelected} />
                  </label>
                  <label
                    className={`text-xs px-3 py-2 rounded-lg border ${theme.border} ${theme.btnCancel} cursor-pointer flex items-center gap-2 transition-colors`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Tải file nhãn CSV
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFileSelected} />
                  </label>
                  <button
                    onClick={runAllBatch}
                    disabled={isBatchRunning || pendingCount === 0}
                    className="text-xs font-bold px-4 py-2 rounded-lg bg-[#859900] hover:brightness-110 text-[#002b36] flex items-center gap-2 transition-all disabled:opacity-50"
                  >
                    {isBatchRunning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang chạy...
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5" /> Chạy tất cả ({pendingCount})
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => downloadResultsCsv(batchItems, labelMap, threshold)}
                    disabled={doneCount === 0}
                    className={`text-xs px-3 py-2 rounded-lg border ${theme.border} ${theme.btnCancel} flex items-center gap-2 transition-colors disabled:opacity-40`}
                  >
                    <Download className="w-3.5 h-3.5" /> Xuất CSV
                  </button>
                  <button
                    onClick={clearBatch}
                    disabled={isBatchRunning || batchItems.length === 0}
                    className={`text-xs px-3 py-2 rounded-lg border ${theme.border} ${theme.btnCancel} flex items-center gap-2 transition-colors disabled:opacity-40`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa tất cả
                  </button>
                </div>
              </div>

              {/* Thông tin file CSV nhãn đang dùng */}
              {csvInfo && (
                <div className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg ${theme.bgMain} border ${theme.border} font-sans text-xs`}>
                  <span className={theme.textSub}>
                    <span className={`${theme.textHeading} font-medium`}>{csvInfo.fileName}</span> · {csvInfo.totalRows} dòng nhãn
                    {batchItems.length > 0 && (
                      <> · khớp {matchedLabelCount}/{batchItems.length} video đã tải</>
                    )}
                  </span>
                  <button onClick={clearCsv} className="text-[#dc322f] hover:underline">
                    Bỏ file CSV
                  </button>
                </div>
              )}

              {batchItems.length === 0 ? (
                <label
                  className={`border-2 border-dashed ${theme.border} hover:border-[#859900] ${theme.inputBg} rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer transition-all group`}
                >
                  <Upload className="w-12 h-12 text-[#93a1a1] group-hover:text-[#859900] mb-4 transition-colors" />
                  <p className={`text-sm ${theme.textHeading} font-medium mb-1 font-sans transition-colors`}>
                    Kéo thả nhiều video vào đây hoặc <span className="text-[#268bd2]">chọn nhiều file</span>
                  </p>
                  <p className={`text-xs ${theme.textMain} font-sans transition-colors`}>
                    Sau khi tải lên, bấm "Chạy tất cả" để xử lý lần lượt từng video
                  </p>
                  <input type="file" accept="video/*" multiple className="hidden" onChange={handleBatchFilesSelected} />
                </label>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                  {batchItems.map((item) => (
                    <BatchGridCard
                      key={item.id}
                      item={item}
                      groundTruth={labelMap.get(item.file.name)}
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

            {/* Chi tiết video đang chọn */}
            {selectedBatchItem ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                  <div className={`${theme.bgCard} border ${theme.border} p-6 transition-colors duration-300`}>
                    <h2 className={`text-sm font-normal ${theme.textHeading} uppercase tracking-wider mb-4 flex items-center gap-2 font-sans transition-colors`}>
                      <Play className="w-4 h-4 text-[#859900]" /> {selectedBatchItem.file.name}
                    </h2>
                    <div className={`relative aspect-video ${theme.bgMain} rounded-lg overflow-hidden border ${theme.border} flex items-center justify-center`}>
                      <video
                        key={selectedBatchItem.id}
                        ref={batchVideoRef}
                        src={selectedBatchItem.url}
                        controls
                        onTimeUpdate={handleBatchTimeUpdate}
                        onSeeked={handleBatchTimeUpdate}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    {labelMap.has(selectedBatchItem.file.name) && (
                      <p className={`text-xs ${theme.textSub} font-sans mt-3`}>
                        Nhãn thật (CSV): <span className={`font-bold ${theme.textHeading}`}>
                          {labelMap.get(selectedBatchItem.file.name) === 1 ? "AI" : "Real"}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-5 space-y-6">
                  <div className={`${theme.bgCard} border ${theme.border} p-6 h-full transition-colors duration-300`}>
                    <h2 className={`text-sm font-normal ${theme.textHeading} uppercase tracking-wider mb-6 flex items-center gap-2 font-sans transition-colors`}>
                      <BarChart2 className="w-4 h-4 text-[#268bd2]" /> Analysis Results
                    </h2>

                    {selectedBatchItem.status === "queued" && (
                      <div className={`text-center py-16 ${theme.textMain}`}>
                        <Clock className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-sans">Video đang chờ trong hàng đợi.</p>
                      </div>
                    )}

                    {selectedBatchItem.status === "processing" && (
                      <div className="space-y-6 py-8">
                        <div className="animate-pulse space-y-3">
                          <div className={`h-4 ${theme.bgMain} rounded w-3/4`}></div>
                          <div className={`h-10 ${theme.bgMain} rounded`}></div>
                          <div className={`h-20 ${theme.bgMain} rounded`}></div>
                        </div>
                        <p className="text-xs text-center text-[#268bd2] font-sans animate-pulse">
                          Extracting Spatial & Temporal Features...
                        </p>
                      </div>
                    )}

                    {selectedBatchItem.status === "error" && (
                      <div className="text-center py-16 text-[#dc322f]">
                        <X className="w-12 h-12 mx-auto mb-3 opacity-60" />
                        <p className="text-sm font-sans">Xử lý thất bại: {selectedBatchItem.error}</p>
                      </div>
                    )}

                    {selectedBatchItem.status === "done" && selectedBatchItem.result && (
                      <ResultSummary result={selectedBatchItem.result} theme={theme} threshold={threshold} />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              batchItems.length > 0 && (
                <div className={`${theme.bgCard} border ${theme.border} p-10 text-center ${theme.textMain} font-sans`}>
                  Chọn một video trong lưới phía trên để xem chi tiết và biểu đồ.
                </div>
              )
            )}

            {/* Biểu đồ của video đang chọn */}
            {selectedBatchItem && selectedBatchItem.status === "done" && (selectedBatchItem.scores?.length ?? 0) > 0 && (
              <div className={`${theme.bgCard} border ${theme.border} p-6 transition-colors duration-300`}>
                <p className={`text-sm ${theme.textSub} mb-4 font-sans transition-colors`}>
                  Play the video to view real-time data below.
                </p>
                <h2 className={`text-sm font-normal ${theme.textHeading} uppercase tracking-wider mb-4 flex items-center gap-2 font-sans transition-colors`}>
                  <BarChart2 className="w-4 h-4 text-[#268bd2]" /> Video Analysis
                </h2>
                <p className={`text-xs ${theme.textMain} mb-2 font-sans transition-colors`}>
                  Bấm vào biểu đồ để tua video tới đúng thời điểm đó.
                </p>
                <ScoreChart
                  data={selectedBatchItem.scores as ScorePoint[]}
                  currentTime={batchCurrentTime}
                  onSeek={handleBatchSeek}
                  isDarkMode={isDarkMode}
                  threshold={threshold}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}