"use client";
import React, { useState, useRef, useEffect } from "react";
import { Upload, Play, ShieldAlert, ShieldCheck, Cpu, RefreshCw, BarChart2, Sun, Moon } from "lucide-react";
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

// Điểm ngưỡng phân loại AI-generated. Khớp với backend (sigmoid > 0.5).
const THRESHOLD = 0.5;

export default function SyntheticVideoDetector() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ isSynthetic: boolean; confidence: number; probability_ai?: number } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [scoreData, setScoreData] = useState<ScorePoint[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  // --- SOLARIZED THEME (WARM WHITE / DARK) ---
  const theme = {
    bgMain: isDarkMode ? "bg-[#002b36]" : "bg-[#fdf6e3]",
    bgCard: isDarkMode ? "bg-[#073642]" : "bg-[#eee8d5]",
    textMain: isDarkMode ? "text-[#93a1a1]" : "text-[#657b83]",
    textHeading: isDarkMode ? "text-[#eee8d5]" : "text-[#586e75]",
    textSub: isDarkMode ? "text-[#839496]" : "text-[#586e75]",
    border: isDarkMode ? "border-[#0a4a58]" : "border-[#d9d2b8]",
    inputBg: isDarkMode ? "bg-[#00212b]/60" : "bg-[#f5efdc]",
    btnCancel: isDarkMode ? "bg-[#00212b] hover:bg-[#0a4a58] text-[#93a1a1]" : "bg-[#f5efdc] hover:bg-[#e3dcc4] text-[#586e75]",
  };

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

    const formData = new FormData();
    // "file" must match the parameter name defined in FastAPI: `file: UploadFile = File(...)`
    formData.append("file", selectedFile);

    try {
      // REPLACE THIS with your active Ngrok URL from Colab
      const NGROK_URL = "https://derived-expanse-roundish.ngrok-free.dev/upload";

      const response = await fetch(NGROK_URL, {
        method: "POST",
        body: formData,
        headers: {
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();

      // Expecting FastAPI to return: { isSynthetic: boolean, confidence: number }
      setResult({
        isSynthetic: data.label,
        confidence: data.confidence,
        probability_ai: data.probability_ai,
      });

      // Expecting FastAPI to ALSO return a per-second (or per-frame) score series, e.g.:
      // data.scores = [{ time: 0.0, score: 0.98 }, { time: 1.0, score: 0.95 }, ...]
      if (Array.isArray(data.scores)) {
        setScoreData(
          data.scores.map((p: any) => ({ time: Number(p.time), score: Number(p.score) }))
        );
      }
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

  return (
    <div className={`min-h-screen ${theme.bgMain} ${theme.textMain} font-serif antialiased transition-colors duration-300`}>
      
      {/* Header Section */}
      <header className={`border-b ${theme.border} ${theme.bgMain}/90 backdrop-blur sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`${theme.textHeading} font-bold text-lg tracking-wide transition-colors`}>
              [Tên dự án]
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-sans">
            <span className={`flex items-center gap-1.5 text-[#859900] ${theme.bgCard} px-3 py-1 rounded-full border ${theme.border} transition-colors`}>
              <span className="w-2 h-2 rounded-full bg-[#859900] animate-pulse"></span>
              Đã kết nối
            </span>
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
        <div className="mb-8">
          <h1 className={`text-3xl font-normal italic ${theme.textHeading} mb-2 transition-colors`}>
            Synthetic Video Detection
          </h1>
          <p className={`${theme.textSub} max-w-3xl text-sm transition-colors`}>
            Tải lên một video để dự đoán video có phải được các model Diffusion tạo ra 
          </p>
        </div>

        {/* 2-Column Grid */}
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
                  <p className={`text-sm ${theme.textHeading} font-medium mb-1 transition-colors`}>
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
                        <><RefreshCw className="w-5 h-5 animate-spin" /> Analyzing frames...</>
                      ) : (
                        <><Cpu className="w-5 h-5" /> Chạy pipeline AI xử lí</>
                      )}
                    </button>

                    <button
                      onClick={() => { setSelectedFile(null); setResult(null); }}
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
                    <p className="text-sm">No data available. Please upload a video and run the model.</p>
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

                {result && !isAnalyzing && (
                  <div className="space-y-6">
                    {/* Status Badge */}
                    <div className={`p-4 rounded-lg border flex items-center gap-4 ${
                      result.isSynthetic 
                        ? `${theme.bgMain} border-[#dc322f]/50 text-[#dc322f]` 
                        : `${theme.bgMain} border-[#859900]/50 text-[#859900]`
                    }`}>
                      {result.isSynthetic ? (
                        <ShieldAlert className="w-10 h-10 shrink-0 text-[#dc322f]" />
                      ) : (
                        <ShieldCheck className="w-10 h-10 shrink-0 text-[#859900]" />
                      )}
                      <div>
                        <h3 className="font-normal italic text-lg font-serif">
                          {result.isSynthetic ? "Khả năng cao Video AI" : "Video thật"}
                        </h3>
                        <p className={`text-xs opacity-80 mt-1 font-sans ${theme.textMain}`}>
                          {result.isSynthetic 
                            ? "Hệ thống phát hiện ra những artifact đặc trưng của các công cụ Diffusion" 
                            : "Khả năng cao video này là một video không được tạo bởi các công cụ Diffusion"}
                        </p>
                      </div>
                    </div>

                    {/* Gauge Metric */}
                    <div className={`${theme.bgMain} p-4 rounded-lg border ${theme.border} transition-colors`}>
                      <div className="flex justify-between text-xs mb-2 font-sans">
                        <span className={theme.textSub}>Khả năng AI:</span>
                        <span className={`font-bold ${theme.textHeading}`}>{result.probability_ai*100}%</span>
                      </div>
                      <div className={`w-full ${theme.bgCard} h-3 rounded-full overflow-hidden`}>
                        <div
                          className="bg-[#dc322f] h-full rounded-full transition-all duration-1000"
                          style={{ width: `${result.probability_ai*100}%` }}
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
                        <span className={`${theme.textHeading} font-mono`}>{(result.probability_ai).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                )}
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
            <ResponsiveContainer width="100%" height={340}>
              <LineChart
                data={scoreData}
                margin={{ top: 10, right: 70, left: 0, bottom: 20 }}
                onClick={(state: any) => {
                  if (state && state.activeLabel != null) {
                    handleSeek(Number(state.activeLabel));
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
                  y={THRESHOLD}
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
          </div>
        )}
      </main>
    </div>
  );
}