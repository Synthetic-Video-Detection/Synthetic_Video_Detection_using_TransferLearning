"use client";
import React, { useState } from "react";
import { Upload, Play, ShieldAlert, ShieldCheck, Cpu, RefreshCw, BarChart2, Sun, Moon } from "lucide-react";

export default function SyntheticVideoDetector() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ isSynthetic: boolean; confidence: number } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // --- BẢNG MÀU SOLARIZED (WARM WHITE / DARK) ---
  // Solarized base3 #fdf6e3, base2 #eee8d5, base1 #93a1a1, base0 #839496,
  // base00 #657b83, base01 #586e75, base02 #073642, base03 #002b36
  const theme = {
    bgMain: isDarkMode ? "bg-[#002b36]" : "bg-[#fdf6e3]",        // Nền chính base03 / base3 (trắng ấm)
    bgCard: isDarkMode ? "bg-[#073642]" : "bg-[#eee8d5]",        // Thẻ container base02 / base2
    textMain: isDarkMode ? "text-[#93a1a1]" : "text-[#657b83]",  // Chữ phụ base1 / base00
    textHeading: isDarkMode ? "text-[#eee8d5]" : "text-[#586e75]", // Chữ chính base2 / base01
    textSub: isDarkMode ? "text-[#839496]" : "text-[#586e75]",   // Chữ mô tả base0 / base01
    border: isDarkMode ? "border-[#0a4a58]" : "border-[#d9d2b8]", // Đường viền mảnh
    inputBg: isDarkMode ? "bg-[#00212b]/60" : "bg-[#f5efdc]",    // Khung upload
    btnCancel: isDarkMode ? "bg-[#00212b] hover:bg-[#0a4a58] text-[#93a1a1]" : "bg-[#f5efdc] hover:bg-[#e3dcc4] text-[#586e75]",
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
            <div className="bg-[#859900] text-[#002b36] p-1.5 rounded font-bold text-xs tracking-wider font-sans">
              AI LAB
            </div>
            <span className={`${theme.textHeading} font-normal italic text-lg tracking-wide transition-colors`}>
              Synthetic Video Detector
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-sans">
            <span className={`flex items-center gap-1.5 text-[#859900] ${theme.bgCard} px-3 py-1 rounded-full border ${theme.border} transition-colors`}>
              <span className="w-2 h-2 rounded-full bg-[#859900] animate-pulse"></span>
              FastAPI Engine Active
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
                    <video src={URL.createObjectURL(selectedFile)} controls className="w-full h-full object-contain" />
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
                          className="bg-[#dc322f] h-full rounded-full transition-all duration-1000"
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