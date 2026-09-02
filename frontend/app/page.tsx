"use client";
import React, { useState } from "react";
import { Upload, Play, ShieldAlert, ShieldCheck, Cpu, RefreshCw, BarChart2, Sun, Moon } from "lucide-react";

export default function SyntheticVideoDetector() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ isSynthetic: boolean; confidence: number } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // --- BẢNG MÀU ĐEN - XÁM CHÌ (DARK SLATE THEME) ---
  const theme = {
    bgMain: isDarkMode ? "bg-[#090d16]" : "bg-[#f8fafc]",       // Nền chính Đen Tuyền / Trắng Sương
    bgCard: isDarkMode ? "bg-[#131b2e]" : "bg-[#ffffff]",       // Thẻ container Xám Đen / Trắng
    textMain: isDarkMode ? "text-[#94a3b8]" : "text-[#475569]",   // Chữ phụ Xám
    textHeading: isDarkMode ? "text-[#f1f5f9]" : "text-[#0f172a]",// Chữ chính Sáng/Tối
    textSub: isDarkMode ? "text-[#cbd5e1]" : "text-[#64748b]",    // Chữ mô tả
    border: isDarkMode ? "border-[#1e293b]" : "border-[#e2e8f0]", // Đường viền mảnh
    inputBg: isDarkMode ? "bg-[#0f172a]/60" : "bg-[#f1f5f9]",   // Khung upload
    btnCancel: isDarkMode ? "bg-[#0f172a] hover:bg-[#1e293b] text-[#cbd5e1]" : "bg-[#f1f5f9] hover:bg-[#e2e8f0] text-[#475569]",
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleAnalyze = () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      setResult({ isSynthetic: true, confidence: 94.8 });
    }, 2500);
  };

  return (
    <div className={`min-h-screen ${theme.bgMain} ${theme.textMain} font-serif antialiased transition-colors duration-300`}>
      
      {/* Header Section */}
      <header className={`border-b ${theme.border} ${theme.bgMain}/90 backdrop-blur sticky top-0 z-50 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#10b981] text-[#090d16] p-1.5 rounded font-bold text-xs tracking-wider font-sans">
              AI LAB
            </div>
            <span className={`${theme.textHeading} font-semibold text-lg tracking-wide transition-colors`}>
              Synthetic Video Detector
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-sans">
            <span className={`flex items-center gap-1.5 text-[#10b981] ${theme.bgCard} px-3 py-1 rounded-full border ${theme.border} transition-colors`}>
              <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse"></span>
              FastAPI Engine Active
            </span>
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 rounded-full ${theme.bgCard} border ${theme.border} hover:opacity-80 transition-all`}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-[#f59e0b]" /> : <Moon className="w-4 h-4 text-[#6366f1]" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Title Section */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${theme.textHeading} mb-2 transition-colors`}>
            AI Video (Deepfake) Analysis & Detection
          </h1>
          <p className={`${theme.textSub} max-w-3xl text-sm transition-colors`}>
            Upload a video file to detect artificial intelligence interventions, face-swapping, or synthetic facial movements using our advanced models.
          </p>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Input & Media Player */}
          <div className="lg:col-span-7 space-y-6">
            <div className={`${theme.bgCard} rounded-xl border ${theme.border} p-6 shadow-2xl transition-colors duration-300`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider flex items-center gap-2 font-sans transition-colors`}>
                  <Play className="w-4 h-4 text-[#10b981]" /> Video Input
                </h2>
                {selectedFile && (
                  <span className={`text-xs ${theme.textSub} truncate max-w-[200px] font-sans`}>
                    {selectedFile.name}
                  </span>
                )}
              </div>

              {!selectedFile ? (
                <label className={`border-2 border-dashed ${theme.border} hover:border-[#10b981] ${theme.inputBg} rounded-lg p-12 flex flex-col items-center justify-center cursor-pointer transition-all group`}>
                  <Upload className="w-12 h-12 text-[#64748b] group-hover:text-[#10b981] mb-4 transition-colors" />
                  <p className={`text-sm ${theme.textHeading} font-medium mb-1 transition-colors`}>
                    Drag and drop video here or <span className="text-[#38bdf8]">browse files</span>
                  </p>
                  <p className={`text-xs ${theme.textMain} font-sans transition-colors`}>Supports MP4, MOV, AVI (Max 100MB)</p>
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className={`relative aspect-video ${theme.bgMain} rounded-lg overflow-hidden border ${theme.border} flex items-center justify-center`}>
                    <video src={URL.createObjectURL(selectedFile)} controls className="w-full h-full object-contain" />
                  </div>

                  <div className="flex gap-3 font-sans">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing}
                      className="flex-1 bg-[#10b981] hover:brightness-110 text-[#090d16] font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <><RefreshCw className="w-5 h-5 animate-spin" /> Analyzing frames...</>
                      ) : (
                        <><Cpu className="w-5 h-5" /> Run AI Analysis Model</>
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
            <div className={`${theme.bgCard} rounded-xl border ${theme.border} p-6 shadow-2xl h-full flex flex-col justify-between transition-colors duration-300`}>
              <div>
                <h2 className={`text-sm font-semibold ${theme.textHeading} uppercase tracking-wider mb-6 flex items-center gap-2 font-sans transition-colors`}>
                  <BarChart2 className="w-4 h-4 text-[#38bdf8]" /> Analysis Results
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
                    <p className="text-xs text-center text-[#38bdf8] font-sans animate-pulse">
                      Extracting Spatial & Temporal Features...
                    </p>
                  </div>
                )}

                {result && !isAnalyzing && (
                  <div className="space-y-6">
                    {/* Status Badge */}
                    <div className={`p-4 rounded-lg border flex items-center gap-4 ${
                      result.isSynthetic 
                        ? `${theme.bgMain} border-[#ef4444]/50 text-[#ef4444]` 
                        : `${theme.bgMain} border-[#10b981]/50 text-[#10b981]`
                    }`}>
                      {result.isSynthetic ? (
                        <ShieldAlert className="w-10 h-10 shrink-0 text-[#ef4444]" />
                      ) : (
                        <ShieldCheck className="w-10 h-10 shrink-0 text-[#10b981]" />
                      )}
                      <div>
                        <h3 className="font-bold text-lg font-sans">
                          {result.isSynthetic ? "Synthetic Video Detected" : "Authentic Video (Real)"}
                        </h3>
                        <p className={`text-xs opacity-80 mt-1 font-sans ${theme.textMain}`}>
                          {result.isSynthetic 
                            ? "Deep learning model detected facial manipulation traces." 
                            : "No anomalies detected in the video frames."}
                        </p>
                      </div>
                    </div>

                    {/* Gauge Metric */}
                    <div className={`${theme.bgMain} p-4 rounded-lg border ${theme.border} transition-colors`}>
                      <div className="flex justify-between text-xs mb-2 font-sans">
                        <span className={theme.textSub}>Synthetic Probability:</span>
                        <span className={`font-bold ${theme.textHeading}`}>{result.confidence}%</span>
                      </div>
                      <div className={`w-full ${theme.bgCard} h-3 rounded-full overflow-hidden`}>
                        <div
                          className="bg-[#ef4444] h-full rounded-full transition-all duration-1000"
                          style={{ width: `${result.confidence}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Detailed Metadata Breakdown */}
                    <div className="space-y-2 text-xs font-sans">
                      <div className={`flex justify-between py-2 border-b ${theme.border}`}>
                        <span className={theme.textMain}>Model Back-end:</span>
                        <span className={`${theme.textHeading} font-mono`}>FastAPI + EfficientNet-B4</span>
                      </div>
                      <div className={`flex justify-between py-2 border-b ${theme.border}`}>
                        <span className={theme.textMain}>Artifact Score:</span>
                        <span className={`${theme.textHeading} font-mono`}>0.9482</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className={theme.textMain}>Processing Time:</span>
                        <span className={`${theme.textHeading} font-mono`}>1.82s</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Note */}
              <div className={`mt-6 pt-4 border-t ${theme.border} text-[11px] ${theme.textSub} flex justify-between font-sans transition-colors`}>
                <span>Dark Slate Pro Theme</span>
                <span>v1.0.3</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}