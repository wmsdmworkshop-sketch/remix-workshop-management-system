import FunnySpinner from "./FunnySpinner";
import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Send, 
  Bot, 
  User as UserIcon, 
  MessageSquare, 
  AlertCircle,
  HelpCircle,
  Megaphone,
  Briefcase,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Mic,
  MicOff,
  Video,
  Upload,
  Play,
  Loader,
  ShieldAlert,
  CheckCircle,
  Volume2,
  ArrowLeft,
  Download,
  Maximize2
} from "lucide-react";
import { Employee, Bay, JobCard, AlertLog } from "../types";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: { title: string; url: string }[];
}

interface GeminiAssistantProps {
  employees: Employee[];
  bays: Bay[];
  jobCards: JobCard[];
  alerts: AlertLog[];
}

type ChatRole = "service" | "ops" | "revenue" | "general";

export default function GeminiAssistant({
  employees,
  bays,
  jobCards,
  alerts
}: GeminiAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your **WMS Workshop Copilot**, powered by Gemini. I have live, real-time access to your bays, technicians, job cards, and revenue configurations.\n\nChoose a **specialized role** below to help you manage the shop floor more efficiently!"
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<ChatRole>("general");
  const [useSearch, setUseSearch] = useState(true); // default real-time web research to active
  const [useLite, setUseLite] = useState(false); // standard low-latency option
  const [useThinking, setUseThinking] = useState(false); // thinking mode option
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sub tab navigation: "chat" | "voice" | "video"
  const [activeSubTab, setActiveSubTab] = useState<"chat" | "voice" | "video">("chat");

  // --- LIVE VOICE ROOM STATES & REFS ---
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [voiceConnecting, setVoiceConnecting] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("Disconnected");
  
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  // --- VIDEO ANIMATOR STATES ---
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoAspectRatio, setVideoAspectRatio] = useState<"16:9" | "9:16">("16:9");
  const [selectedVideoImage, setSelectedVideoImage] = useState<string | null>(null);
  const [selectedVideoImageMime, setSelectedVideoImageMime] = useState<string>("");
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoGenStatus, setVideoGenStatus] = useState("");
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Clean up voice connection on unmount
  useEffect(() => {
    return () => {
      disconnectVoice();
    };
  }, []);

  // --- VOICE ENGINE HELPERS ---
  const floatTo16BitPCM = (inputBuffer: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(inputBuffer.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < inputBuffer.length; i++) {
      const s = Math.max(-1, Math.min(1, inputBuffer[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
  };

  const playAudioChunk = (base64Audio: string) => {
    try {
      if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = outputAudioCtxRef.current;
      
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }
      
      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
        nextStartTimeRef.current = currentTime + 0.05;
      }
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
    } catch (err) {
      console.error("Failed to play audio chunk:", err);
    }
  };

  const toggleVoiceSession = async () => {
    if (isVoiceConnected) {
      disconnectVoice();
    } else {
      await connectVoice();
    }
  };

  const connectVoice = async () => {
    setVoiceConnecting(true);
    setVoiceStatus("Requesting microphone permissions...");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${wsProtocol}//${window.location.host}/api/live`;
      setVoiceStatus("Connecting to live voice room...");
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsVoiceConnected(true);
        setVoiceConnecting(false);
        setVoiceStatus("Connected! Start speaking with Gemini Live.");
        startRecordingPCM(stream);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            playAudioChunk(msg.audio);
          }
          if (msg.interrupted) {
            console.log("Interrupted. Clearing playback timeline.");
            if (outputAudioCtxRef.current) {
              nextStartTimeRef.current = outputAudioCtxRef.current.currentTime;
            }
          }
        } catch (err) {
          console.error("Error reading socket frame:", err);
        }
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setVoiceStatus("Connection error occurred.");
      };

      ws.onclose = () => {
        disconnectVoice();
      };

    } catch (err: any) {
      console.error("Voice connection failed:", err);
      setVoiceStatus(`Microphone error: ${err.message || "Permission denied"}`);
      setVoiceConnecting(false);
    }
  };

  const disconnectVoice = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
      audioProcessorRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsVoiceConnected(false);
    setVoiceConnecting(false);
    setVoiceStatus("Disconnected");
  };

  const startRecordingPCM = (stream: MediaStream) => {
    try {
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      inputAudioCtxRef.current = inputCtx;
      
      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      audioProcessorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (isMicMuted) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = floatTo16BitPCM(inputData);
        
        const bytes = new Uint8Array(pcmBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ audio: base64 }));
        }
      };
    } catch (err) {
      console.error("Error starting audio context:", err);
    }
  };

  // --- VEO VIDEO GENERATOR ENGINE ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedVideoImageMime(file.type);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const base64String = (event.target.result as string).split(",")[1];
        setSelectedVideoImage(base64String);
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerVideoGeneration = async () => {
    if (!selectedVideoImage) return;

    setVideoGenerating(true);
    setVideoError(null);
    setGeneratedVideoUrl(null);
    setVideoGenStatus("Contacting Veo video generation engines...");

    try {
      const response = await fetch("/api/gemini/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: videoPrompt,
          aspectRatio: videoAspectRatio,
          image: {
            data: selectedVideoImage,
            mimeType: selectedVideoImageMime
          }
        })
      });

      const data = await response.json();
      if (!response.ok || !data.operationName) {
        throw new Error(data.error || "Failed to start video generation.");
      }

      setVideoGenStatus("Initializing neural dynamic loops (Veo)...");
      pollVideoStatus(data.operationName);
    } catch (err: any) {
      console.error(err);
      setVideoError(err.message || "An error occurred starting video generation.");
      setVideoGenerating(false);
    }
  };

  const pollVideoStatus = (operationName: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/gemini/video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName })
        });
        const data = await response.json();
        
        if (data.error) {
          clearInterval(interval);
          setVideoError(data.error.message || "Failed to generate video.");
          setVideoGenerating(false);
          return;
        }

        if (data.done) {
          clearInterval(interval);
          setVideoGenStatus("Retrieving cinematic mp4 byte streams...");
          await downloadGeneratedVideo(operationName);
        } else {
          const statuses = [
            "Analyzing spatial depth coordinates...",
            "Synthesizing mechanical frame transitions...",
            "Computing optical vector fields...",
            "Refining specular metallic surface highlights...",
            "Assembling cohesive 3D vehicle dynamics...",
            "Applying high-definition neural render loops..."
          ];
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          setVideoGenStatus(randomStatus);
        }
      } catch (err) {
        console.error("Error polling video status:", err);
      }
    }, 6000);
  };

  const downloadGeneratedVideo = async (operationName: string) => {
    try {
      const response = await fetch("/api/gemini/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName })
      });
      
      if (!response.ok) {
        throw new Error("Failed to download video bytes.");
      }

      const blob = await response.blob();
      const videoUrl = URL.createObjectURL(blob);
      setGeneratedVideoUrl(videoUrl);
      setVideoGenerating(false);
      setVideoGenStatus("Generation successful!");
    } catch (err: any) {
      console.error(err);
      setVideoError(err.message || "Failed to download the generated video.");
      setVideoGenerating(false);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const promptText = (textToSend || input).trim();
    if (!promptText) return;

    if (!textToSend) {
      setInput("");
    }

    setErrorMsg(null);
    const newMessages = [...messages, { role: "user" as const, content: promptText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          selectedRole,
          useSearch,
          useLite,
          useThinking
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply, sources: data.sources }]);
      } else {
        setErrorMsg(data.error || "Failed to communicate with Gemini assistant.");
        setMessages(prev => [
          ...prev, 
          { 
            role: "assistant", 
            content: "⚠️ **System Error**: I could not retrieve a response from Gemini. Please make sure your `GEMINI_API_KEY` is correctly set in your environment or Secrets config." 
          }
        ]);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to send message. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role: ChatRole) => {
    setSelectedRole(role);
    let intro = "";
    if (role === "general") {
      intro = "Switching to **General Workshop Companion**. Ask me anything about bays, technicians, or basic diagnostics!";
    } else if (role === "service") {
      intro = "Switching to **Service Advisor mode**. I can help you write warm customer update templates, diagnose customer complaints, and structure precise repair descriptions.";
    } else if (role === "ops") {
      intro = "Switching to **Operations Coordinator mode**. I can help you balance workloads, allocate co-techs, handle ETD warnings, and clear idle bays.";
    } else if (role === "revenue") {
      intro = "Switching to **Revenue & Business Analyst mode**. Ask me to explain the static split rules, calculate salary weightages, or evaluate job revenue totals.";
    }

    setMessages(prev => [...prev, { role: "assistant", content: intro }]);
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `Chat history reset. Ready to assist as your **${
          selectedRole === "general" ? "General Copilot" : 
          selectedRole === "service" ? "Service Advisor" : 
          selectedRole === "ops" ? "Operations Coordinator" : 
          "Revenue Analyst"
        }**!`
      }
    ]);
    setErrorMsg(null);
  };

  // Quick suggestions based on selected role
  const suggestions = {
    general: [
      "Which bays are currently Active vs Idle?",
      "List all senior technicians on shift",
      "Which job cards are waiting to start?"
    ],
    service: [
      "Draft a warm service update message for customer Anita Roy (+919876543202)",
      "How should I describe an engine overhaul repair plan simply?",
      "Give me a professional checklist for a 40k Swift maintenance service"
    ],
    ops: [
      "Do we have any urgent ETD warnings or breaches?",
      "Who are the assigned technicians for job card JC001?",
      "Which idle bays should we prioritize allocating new jobs to?"
    ],
    revenue: [
      "Explain the standard static split rules for Tech + Co-Tech",
      "Explain how a 5+ technician job split calculates salary weightage",
      "What is the total labour and parts revenue generated so far?"
    ]
  };

  // Simple formatting helper for markdown-like text
  const formatText = (text: string) => {
    return text.split("\n").map((line, lineIdx) => {
      // Process bold tags **text**
      let elements: React.ReactNode[] = [];
      let currentString = line;
      let boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;

      // Unordered lists
      const isListItem = line.trim().startsWith("-") || line.trim().startsWith("*");
      let displayLine = line;
      if (isListItem) {
        displayLine = line.replace(/^[-*]\s+/, "");
      }

      while ((match = boldRegex.exec(displayLine)) !== null) {
        // Add preceding text
        if (match.index > lastIndex) {
          elements.push(displayLine.substring(lastIndex, match.index));
        }
        // Add bold text
        elements.push(
          <strong key={match.index} className="font-bold text-slate-900">
            {match[1]}
          </strong>
        );
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < displayLine.length) {
        elements.push(displayLine.substring(lastIndex));
      }

      if (elements.length === 0) {
        elements = [displayLine];
      }

      if (isListItem) {
        return (
          <li key={lineIdx} className="ml-4 list-disc text-slate-700 text-xs py-0.5 font-medium">
            {elements}
          </li>
        );
      }

      return (
        <p key={lineIdx} className={`text-slate-700 text-xs leading-relaxed font-medium ${line.trim() === "" ? "h-2" : "py-0.5"}`}>
          {elements}
        </p>
      );
    });
  };

  // Count active stats
  const activeBaysCount = bays.filter(b => b.status === "Active").length;
  const activeJobsCount = jobCards.filter(j => j.status === "Active" || j.status === "Waiting").length;
  const activeAlertsCount = alerts.filter(a => a.status === "Active").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)]">
      
      {/* LEFT COLUMN: Role Selector & Live Status Metres */}
      <div className="lg:col-span-1 flex flex-col gap-5">
        
        {/* Assistant Roles Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs flex flex-col space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="h-4.5 w-4.5 text-orange-500" />
              Copilot Specialties
            </h3>
            <p className="text-[10px] text-slate-400 mt-1 font-semibold">Switch specialized models to assist with workflows.</p>
          </div>

          <div className="space-y-2 flex-1">
            <button 
              onClick={() => handleRoleChange("general")}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedRole === "general" 
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-700" 
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-bold">General Copilot</p>
                <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">Quick workshop Q&A</p>
              </div>
            </button>

            <button 
              onClick={() => handleRoleChange("service")}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedRole === "service" 
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-700" 
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              <Megaphone className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-bold">Service Advisor</p>
                <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">Customer updates & text</p>
              </div>
            </button>

            <button 
              onClick={() => handleRoleChange("ops")}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedRole === "ops" 
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-700" 
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              <Briefcase className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-bold">Operations Coordinator</p>
                <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">Workloads, priority & bays</p>
              </div>
            </button>

            <button 
              onClick={() => handleRoleChange("revenue")}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                selectedRole === "revenue" 
                  ? "bg-orange-500/10 border-orange-500/30 text-orange-700" 
                  : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
              }`}
            >
              <DollarSign className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-bold">Revenue Analyst</p>
                <p className="text-[9px] text-slate-400 font-semibold leading-none mt-0.5">Static splits & salary weight</p>
              </div>
            </button>
          </div>
        </div>

        {/* Live Context Dashboard Metrics */}
        <div className="bg-slate-900 text-slate-300 rounded-xl p-4 shadow-md space-y-3.5 border border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Live Database Context</h3>
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-1">Fed dynamically to system instruction</p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700/50 text-center">
              <p className="text-sm font-black text-white">{activeJobsCount}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Job Cards</p>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700/50 text-center">
              <p className="text-sm font-black text-white">{activeBaysCount}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Active Bays</p>
            </div>
            <div className="bg-slate-800/80 p-2.5 rounded border border-slate-700/50 text-center">
              <p className="text-sm font-black text-white">{activeAlertsCount}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight mt-0.5">Live Alerts</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 bg-slate-800/50 p-2.5 rounded border border-slate-800 leading-relaxed font-semibold">
            The Copilot updates automatically whenever work assignments, bays, or alerts change. Just ask!
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Chat Area / Workspace Tabs */}
      <div className="lg:col-span-3 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm h-full">
        
        {/* Sub-tab Pill Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button 
            onClick={() => setActiveSubTab("chat")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
              activeSubTab === "chat" 
                ? "border-orange-500 text-orange-600 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <MessageSquare className="h-4.5 w-4.5 text-orange-500" />
            Copilot Chat
          </button>
          <button 
            onClick={() => setActiveSubTab("voice")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
              activeSubTab === "voice" 
                ? "border-orange-500 text-orange-600 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Mic className="h-4.5 w-4.5 text-emerald-500" />
            Live Voice Room
          </button>
          <button 
            onClick={() => setActiveSubTab("video")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 cursor-pointer transition-all ${
              activeSubTab === "video" 
                ? "border-orange-500 text-orange-600 bg-white" 
                : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
            }`}
          >
            <Video className="h-4.5 w-4.5 text-rose-500" />
            Video Animator (Veo)
          </button>
        </div>

        {/* TAB 1: COPILOT MULTI-TURN CHAT */}
        {activeSubTab === "chat" && (
          <div className="flex flex-col flex-1 overflow-hidden h-full">
            {/* Chat Title / Header */}
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-orange-500/15 rounded-lg text-orange-600">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      WMS Copilot Workspace
                    </h2>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                      ⚡ {useLite ? "Gemini Lite" : useThinking ? "Gemini Pro (Thinking)" : "Gemini Flash"}
                    </span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                    Current mode: {selectedRole === "general" ? "General Copilot" : 
                                 selectedRole === "service" ? "Service Advisor" : 
                                 selectedRole === "ops" ? "Operations Coordinator" : 
                                 "Revenue split analyst"}
                  </p>
                </div>
              </div>

              {/* Toggles bar */}
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={useSearch}
                    onChange={(e) => setUseSearch(e.target.checked)}
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5"
                  />
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    🌐 Web Research
                  </span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={useLite}
                    onChange={(e) => {
                      setUseLite(e.target.checked);
                      if (e.target.checked) setUseThinking(false);
                    }}
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5"
                  />
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    ⚡ Low Latency (Lite)
                  </span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={useThinking}
                    onChange={(e) => {
                      setUseThinking(e.target.checked);
                      if (e.target.checked) setUseLite(false);
                    }}
                    className="rounded border-slate-300 text-orange-500 focus:ring-orange-500 h-3.5 w-3.5"
                  />
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    🧠 High Thinking (Pro)
                  </span>
                </label>

                <button 
                  onClick={clearChat}
                  className="text-[9px] text-slate-500 hover:text-slate-800 font-bold uppercase tracking-wider border border-slate-200 hover:bg-slate-100 rounded px-2 py-0.5 transition-all cursor-pointer shrink-0"
                >
                  Clear History
                </button>
              </div>
            </div>

            {/* Message View Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex items-start gap-3 max-w-[85%] ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                  }`}
                >
                  {/* Avatar Icon */}
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border shadow-3xs ${
                    msg.role === "user" 
                      ? "bg-slate-800 border-slate-900 text-white" 
                      : "bg-orange-500 border-orange-600 text-white"
                  }`}>
                    {msg.role === "user" ? <UserIcon className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>

                  {/* Chat Bubble content */}
                  <div className={`p-3.5 rounded-xl border ${
                    msg.role === "user" 
                      ? "bg-slate-800 text-slate-100 border-slate-900 rounded-tr-none shadow-3xs" 
                      : "bg-white text-slate-800 border-slate-200 rounded-tl-none shadow-xs"
                  }`}>
                    {msg.role === "user" ? (
                      <p className="text-xs font-bold leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="space-y-1">
                        {formatText(msg.content)}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                            <span className="text-[8px] font-black uppercase text-slate-400">🌐 Web References:</span>
                            {msg.sources.map((src, sIdx) => (
                              <a 
                                key={sIdx} 
                                href={src.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[9px] bg-slate-50 hover:bg-orange-50 hover:text-orange-600 border border-slate-200 rounded px-1.5 py-0.5 font-bold transition-all text-slate-600"
                              >
                                {src.title}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Assistant Writing / Thinking indicator */}
              {loading && (
                <div className="flex items-start gap-3 max-w-[80%]">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-orange-500 border border-orange-600 text-white shrink-0 animate-pulse">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="p-3.5 bg-white border border-slate-200 rounded-xl rounded-tl-none shadow-2xs flex items-center gap-2">
                    <span className="flex h-1.5 w-1.5 bg-orange-500 rounded-full animate-bounce"></span>
                    <span className="flex h-1.5 w-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="flex h-1.5 w-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    <span className="text-[10px] text-slate-400 font-semibold ml-1">Copilot is thinking...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Dynamic Suggestion Chips */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-2 items-center shrink-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mr-1 flex items-center gap-1">
                <HelpCircle className="h-3 w-3 text-orange-500" />
                Try Asking:
              </span>
              {suggestions[selectedRole].map((suggestion, sIdx) => (
                <button 
                  key={sIdx}
                  onClick={() => handleSend(suggestion)}
                  disabled={loading}
                  className="text-[10px] bg-white border border-slate-200 text-slate-600 font-bold hover:bg-orange-50 hover:text-orange-700 hover:border-orange-500/30 px-2.5 py-1 rounded transition-all cursor-pointer text-left shadow-3xs max-w-full truncate disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              {errorMsg && (
                <div className="mb-2 px-3 py-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="flex gap-2.5">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={
                    selectedRole === "general" ? "Ask about bays, status, or search context..." :
                    selectedRole === "service" ? "Draft a message, diagnose, or describe repairs..." :
                    selectedRole === "ops" ? "Ask about assignments, workloads, or alerts..." :
                    "Calculate commission, split amounts, or basic rates..."
                  }
                  disabled={loading}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded p-2.5 font-semibold focus:ring-1 focus:ring-orange-500 focus:outline-hidden disabled:opacity-50"
                />
                <button 
                  onClick={() => handleSend()}
                  disabled={loading || !input.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-transparent text-white font-bold px-4 py-2.5 rounded transition-all flex items-center gap-1.5 cursor-pointer shadow-sm disabled:cursor-not-allowed"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span className="text-xs uppercase tracking-wider">Send</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE VOICE ROOM */}
        {activeSubTab === "voice" && (
          <div className="flex flex-col flex-1 p-6 items-center justify-center bg-slate-950 text-white h-full relative overflow-hidden">
            
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 h-72 w-72 bg-emerald-500/10 rounded-full filter blur-3xl animate-pulse"></div>
            <div className="absolute bottom-1/4 right-1/4 h-72 w-72 bg-orange-500/10 rounded-full filter blur-3xl animate-pulse [animation-delay:2s]"></div>

            <div className="z-10 text-center max-w-md space-y-6">
              
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-emerald-500/20">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Gemini-3.1-Flash-Live
                </div>
                <h3 className="text-xl font-black uppercase tracking-wider text-slate-100">Live Workshop Voice Room</h3>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Have a real-time vocal conversation with Gemini. Ask questions about idle bays, check technician statuses, or dictate job details dynamically.
                </p>
              </div>

              {/* Glowing Soundwave Orb */}
              <div className="flex items-center justify-center py-6">
                <div className={`relative h-32 w-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isVoiceConnected 
                    ? "bg-emerald-500/10 border-2 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)] scale-105" 
                    : voiceConnecting
                      ? "bg-amber-500/10 border-2 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.2)] animate-pulse"
                      : "bg-slate-900 border-2 border-slate-800"
                }`}>
                  {isVoiceConnected ? (
                    <div className="flex items-center gap-1">
                      <span className="h-6 w-1 bg-emerald-400 rounded animate-bounce [animation-duration:1s]"></span>
                      <span className="h-10 w-1 bg-emerald-400 rounded animate-bounce [animation-delay:0.15s] [animation-duration:0.8s]"></span>
                      <span className="h-12 w-1 bg-emerald-400 rounded animate-bounce [animation-delay:0.3s] [animation-duration:1.2s]"></span>
                      <span className="h-8 w-1 bg-emerald-400 rounded animate-bounce [animation-delay:0.45s] [animation-duration:0.9s]"></span>
                      <span className="h-5 w-1 bg-emerald-400 rounded animate-bounce [animation-delay:0.6s] [animation-duration:1.1s]"></span>
                    </div>
                  ) : voiceConnecting ? (
                    <FunnySpinner className="h-8 w-8 text-amber-400" />
                  ) : (
                    <Mic className="h-10 w-10 text-slate-500" />
                  )}
                </div>
              </div>

              {/* Status Display Badge */}
              <div className="bg-slate-900/80 border border-slate-800/80 px-4 py-3 rounded-xl max-w-sm mx-auto shadow-lg">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Live System Feed</p>
                <p className="text-xs font-bold text-slate-200 mt-1">{voiceStatus}</p>
              </div>

              {/* Voice Room Action buttons */}
              <div className="flex items-center justify-center gap-4">
                
                {/* Mute button */}
                {isVoiceConnected && (
                  <button
                    onClick={() => setIsMicMuted(!isMicMuted)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isMicMuted 
                        ? "bg-rose-500/20 border-rose-500 text-rose-400 shadow-md" 
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                    title={isMicMuted ? "Unmute microphone" : "Mute microphone"}
                  >
                    {isMicMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                )}

                {/* Primary connection toggle button */}
                <button
                  onClick={toggleVoiceSession}
                  disabled={voiceConnecting}
                  className={`px-6 py-3.5 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                    isVoiceConnected 
                      ? "bg-rose-600 hover:bg-rose-700 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)]" 
                      : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                  }`}
                >
                  {isVoiceConnected ? (
                    <>
                      <Volume2 className="h-4.5 w-4.5 animate-pulse" />
                      Disconnect Session
                    </>
                  ) : (
                    <>
                      <Mic className="h-4.5 w-4.5" />
                      Connect Live Room
                    </>
                  )}
                </button>
              </div>

              <div className="text-[10px] text-slate-500 leading-relaxed max-w-xs mx-auto pt-2">
                Make sure you have granted microphone access to AI Studio. Audio streams are encrypted and processed in-memory.
              </div>

            </div>
          </div>
        )}

        {/* TAB 3: VIDEO ANIMATOR (VEO) */}
        {activeSubTab === "video" && (
          <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="max-w-3xl mx-auto space-y-6">
              
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-500/10 text-rose-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-rose-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
                  VEO Video loop rendering (veo-3.1-fast-generate-preview)
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">Dynamic Vehicle & Bay Animator</h3>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Upload a photo of a vehicle, workshop bay, or mechanical components and use Google Veo to synthesize a professional high-fidelity video loop. Perfect for creating social media posts or dramatic workshop service loops!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Image upload zone and controls */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                    1. Setup Animation Source
                  </h4>

                  {/* Image input selector */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Upload Reference Photo</label>
                    
                    {selectedVideoImage ? (
                      <div className="relative border border-slate-200 rounded-xl overflow-hidden group">
                        <img 
                          src={`data:${selectedVideoImageMime};base64,${selectedVideoImage}`} 
                          alt="Source Reference"
                          className="w-full h-40 object-cover"
                        />
                        <button 
                          onClick={() => setSelectedVideoImage(null)}
                          className="absolute top-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full p-1 text-[10px] uppercase font-bold px-2.5 cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-slate-300 hover:border-orange-400 rounded-xl bg-slate-50 hover:bg-orange-50/20 cursor-pointer transition-all">
                        <Upload className="h-8 w-8 text-slate-400 group-hover:text-orange-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2">Select Reference Image</span>
                        <span className="text-[8px] text-slate-400 mt-1 font-semibold">PNG, JPEG, WEBP up to 5MB</span>
                        <input 
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Aspect ratio picker */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Video Aspect Ratio</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setVideoAspectRatio("16:9")}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-all cursor-pointer ${
                          videoAspectRatio === "16:9" 
                            ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        📺 16:9 Landscape
                      </button>
                      <button
                        onClick={() => setVideoAspectRatio("9:16")}
                        className={`py-2 px-3 rounded-lg border text-xs font-bold uppercase transition-all cursor-pointer ${
                          videoAspectRatio === "9:16" 
                            ? "bg-slate-900 border-slate-900 text-white shadow-xs" 
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                        }`}
                      >
                        📱 9:16 Portrait
                      </button>
                    </div>
                  </div>

                  {/* Optional Text Guidance Prompt */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Animation Prompt Guidelines (Optional)
                    </label>
                    <textarea
                      value={videoPrompt}
                      onChange={(e) => setVideoPrompt(e.target.value)}
                      placeholder="e.g. Slowly pan around the car, steam rising from the engine, sparks flying from soldering..."
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold focus:ring-1 focus:ring-orange-500 h-20"
                    />
                  </div>

                  {/* Trigger button */}
                  <button
                    onClick={triggerVideoGeneration}
                    disabled={videoGenerating || !selectedVideoImage}
                    className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    {videoGenerating ? (
                      <>
                        <FunnySpinner className="h-4 w-4" />
                        Rendering Animation...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Generate Video
                      </>
                    )}
                  </button>

                  {videoError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs text-rose-700 font-bold flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      {videoError}
                    </div>
                  )}

                </div>

                {/* Video Generation Result Player output */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between h-full min-h-[350px]">
                  
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
                    2. Cinematic Output
                  </h4>

                  {/* Actual rendering state visualizer */}
                  {videoGenerating ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-4">
                      
                      {/* Bouncing rendering orb */}
                      <div className="relative h-16 w-16 bg-rose-500/10 rounded-full flex items-center justify-center shadow-inner">
                        <FunnySpinner className="h-8 w-8 text-rose-600" />
                      </div>

                      <div className="text-center space-y-1">
                        <p className="text-xs font-bold text-slate-700 animate-pulse uppercase tracking-wider">Veo is synthesizing video...</p>
                        <p className="text-[10px] text-slate-400 font-bold max-w-xs">{videoGenStatus}</p>
                      </div>

                      <div className="w-full max-w-[200px] bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-rose-500 h-full animate-[progress_15s_ease-in-out_infinite]" style={{ width: "70%" }}></div>
                      </div>

                    </div>
                  ) : generatedVideoUrl ? (
                    <div className="flex-1 flex flex-col space-y-4 items-center justify-center py-4">
                      
                      <div className={`relative border border-slate-200 rounded-xl overflow-hidden shadow-md ${
                        videoAspectRatio === "9:16" ? "max-w-[200px]" : "w-full"
                      }`}>
                        <video 
                          src={generatedVideoUrl} 
                          controls 
                          autoPlay 
                          loop 
                          className="w-full object-cover rounded-xl"
                        />
                      </div>

                      <div className="flex gap-2">
                        <a 
                          href={generatedVideoUrl}
                          download="WMS_Workshop_Dynamic_Loop.mp4"
                          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg text-[10px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-3xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download Loop
                        </a>
                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                      <Video className="h-12 w-12 text-slate-200" />
                      <p className="text-xs font-bold">Animation Output Screen</p>
                      <p className="text-[10px] text-slate-400 max-w-xs font-semibold">
                        Once you select a reference photo and trigger the rendering, your dynamic Veo MP4 video loop will appear here.
                      </p>
                    </div>
                  )}

                  <div className="text-[9px] text-slate-400 font-bold border-t border-slate-100 pt-2 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
                    Powered by Google Veo &bull; High resolution video formatting
                  </div>

                </div>

              </div>

            </div>
          </div>
        )}

      </div>
      
    </div>
  );
}
