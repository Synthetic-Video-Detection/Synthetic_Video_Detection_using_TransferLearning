"use client";
import React, { useState } from "react";
import { Upload, Play, ShieldAlert, ShieldCheck, Cpu, RefreshCw, BarChart2, Sun, Moon } from "lucide-react";

export default function SyntheticVideoDetector() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ isSynthetic: boolean; confidence: number } | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

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

    const formData = new FormData();
    // "file" must match the parameter name defined in FastAPI: `file: UploadFile = File(...)`
    formData.append("file", selectedFile);

    try {
      // REPLACE THIS with your active Ngrok URL from Colab
      const NGROK_URL = "https://countable-plotless-aubrielle.ngrok-free.dev/upload";

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
    } catch (error) {
      console.error("API Upload Error:", error);
      alert("Không thể kết nối tới model AI qua Ngrok. Vui lòng kiểm tra lại URL!");
    } finally {
      setIsAnalyzing(false);
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
      </main>
    </div>
  );
}