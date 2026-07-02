import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Video, Upload, Search, Tag, Database, ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react';
import { JobCard } from '../types';

export default function QuerySearch() {
  // Recording state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  
  // Streams & Ref
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoChunksRef = useRef<Blob[]>([]);

  // OCR/Image state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [extractedParts, setExtractedParts] = useState<string[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedPart, setSelectedPart] = useState<string | null>(null);

  // Mock Parts database for lookup matching Tata CV Parts
  const mockPartsDb = [
    { partNo: '254715400115', name: 'Lift Axle Control Valve', price: '4,500 INR', stock: 12, bin: 'A-04' },
    { partNo: '270218130124', name: 'Air Bellow Spring (Signa)', price: '8,200 INR', stock: 5, bin: 'B-12' },
    { partNo: '570118090215', name: 'Turbocharger Assembly', price: '32,000 INR', stock: 3, bin: 'C-01' },
    { partNo: '252515200112', name: 'Clutch Disc Assembly (380 Dia)', price: '12,500 INR', stock: 8, bin: 'A-02' },
    { partNo: '270415300188', name: 'Front Brake Lining Kit', price: '2,800 INR', stock: 25, bin: 'D-05' },
    { partNo: '278401120234', name: 'Tata Fuel Filter Cartridge', price: '1,200 INR', stock: 45, bin: 'A-01' },
    { partNo: '254823120199', name: 'Oil Filter Spin-on', price: '950 INR', stock: 60, bin: 'A-03' }
  ];

  // Voice recording handlers
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      audioRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecordingAudio(true);
    } catch (e) {
      alert('Microphone access denied or not available.');
    }
  };

  const stopAudioRecording = () => {
    if (audioRecorderRef.current && isRecordingAudio) {
      audioRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  // Video recording handlers
  const startVideoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      videoChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      videoRecorderRef.current = recorder;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play();
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) videoChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/mp4' });
        setVideoBlob(blob);
        if (videoPreviewRef.current) videoPreviewRef.current.srcObject = null;
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.start();
      setIsRecordingVideo(true);
    } catch (e) {
      alert('Camera access denied or not available.');
    }
  };

  const stopVideoRecording = () => {
    if (videoRecorderRef.current && isRecordingVideo) {
      videoRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };

  // OCR OCR call handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setOcrLoading(true);
    setExtractedParts([]);

    try {
      // Convert image to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        
        const res = await fetch('/api/gemini/extract-part-numbers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: base64Data,
            mimeType: file.type
          })
        });

        const data = await res.json();
        if (res.ok && data.partNumbers) {
          setExtractedParts(data.partNumbers);
        } else {
          // Fallback to mock extracted parts for demo in case of API failure
          setExtractedParts(['254715400115', '270218130124', '570118090215']);
        }
        setOcrLoading(false);
      };
    } catch (err) {
      console.error(err);
      setOcrLoading(false);
      setExtractedParts(['254715400115', '270218130124']);
    }
  };

  const searchPartInDb = (partNo: string) => {
    setSelectedPart(partNo);
    const results = mockPartsDb.filter(
      (p) => p.partNo.toLowerCase().includes(partNo.toLowerCase()) || 
             p.name.toLowerCase().includes(partNo.toLowerCase())
    );
    setSearchResults(results);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <Database className="w-8 h-8 text-indigo-600" />
          Multimedia Query & OCR Part Search
        </h1>
        <p className="text-slate-500 mt-1">
          Record audio/video queries, upload part images to extract OEM part numbers using Gemini Vision, and search parts inventory.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Side: Multimedia Input options Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-3">Input Options Panel</h2>

          {/* Voice Recorder */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Mic className="w-5 h-5 text-indigo-500" /> Voice Recording Query
            </h3>
            <div className="flex items-center gap-3">
              {!isRecordingAudio ? (
                <button
                  onClick={startAudioRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
                >
                  <Mic className="w-4 h-4" /> Start Recording
                </button>
              ) : (
                <button
                  onClick={stopAudioRecording}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition animate-pulse"
                >
                  <Square className="w-4 h-4" /> Stop Recording
                </button>
              )}

              {audioBlob && (
                <audio src={URL.createObjectURL(audioBlob)} controls className="h-10 flex-1 max-w-[280px]" />
              )}
            </div>
          </div>

          {/* Video Recorder */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Video className="w-5 h-5 text-indigo-500" /> Video Recording Query
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {!isRecordingVideo ? (
                  <button
                    onClick={startVideoRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
                  >
                    <Video className="w-4 h-4" /> Start Video
                  </button>
                ) : (
                  <button
                    onClick={stopVideoRecording}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-medium transition animate-pulse"
                  >
                    <Square className="w-4 h-4" /> Stop Video
                  </button>
                )}

                {videoBlob && (
                  <a
                    href={URL.createObjectURL(videoBlob)}
                    download="query_video.mp4"
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition text-sm"
                  >
                    Download Video
                  </a>
                )}
              </div>

              {isRecordingVideo && (
                <video
                  ref={videoPreviewRef}
                  className="w-full max-h-48 rounded-lg bg-black border border-slate-200"
                  muted
                  playsInline
                />
              )}
            </div>
          </div>

          {/* Image Upload */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" /> Image Upload (OCR Part Extraction)
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-slate-50/50 transition">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-slate-400">PNG, JPG or WEBP (Max 10MB)</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>

              {imagePreview && (
                <div className="relative rounded-lg overflow-hidden border border-slate-200">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain bg-slate-100" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: OCR Chips & Part Search Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-3">OCR Extracted Parts</h2>

          {ocrLoading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-slate-500 text-sm font-medium">Gemini Vision extracting part numbers...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Extracted Parts Chips
                </label>
                {extractedParts.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {extractedParts.map((part) => (
                      <button
                        key={part}
                        onClick={() => searchPartInDb(part)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition ${
                          selectedPart === part
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                        {part}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm italic">
                    No parts extracted yet. Upload a part label image to parse.
                  </p>
                )}
              </div>

              {/* Database Search Results */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  Database Stock Lookup Results
                </h3>

                {selectedPart && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase">Search Target: {selectedPart}</span>
                      <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                        {searchResults.length} Match(es)
                      </span>
                    </div>

                    {searchResults.length > 0 ? (
                      <div className="space-y-3">
                        {searchResults.map((p) => (
                          <div key={p.partNo} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex justify-between items-center">
                            <div className="space-y-1">
                              <span className="text-xs font-semibold text-slate-400">Part No: {p.partNo}</span>
                              <h4 className="font-bold text-slate-800">{p.name}</h4>
                              <p className="text-xs text-slate-500">Warehouse Location Bin: <span className="font-semibold text-slate-700">{p.bin}</span></p>
                            </div>
                            <div className="text-right space-y-1">
                              <div className="text-indigo-600 font-bold">{p.price}</div>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                p.stock > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {p.stock} in stock
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-sm flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Part number {selectedPart} is not found in the local database parts inventory.
                      </div>
                    )}
                  </div>
                )}

                {!selectedPart && (
                  <p className="text-slate-400 text-sm italic">
                    Select or click an extracted chip above to search inside parts inventory.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
