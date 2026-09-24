import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import MarkdownMessage from "./MarkdownMessage";
import { buildRemotePlan, REMOTE_MODEL_NAME, streamRemoteChat } from "./remoteAI";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  BrainCircuit,
  Check,
  CirclePower,
  Code2,
  Copy,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Gauge,
  Globe2,
  HardDrive,
  Heart,

  MemoryStick,
  Mic,
  MicOff,
  MonitorCog,
  Pencil,
  Plus,
  RefreshCw,
  Repeat2,
  Rocket,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Square,
  Timer,
  Trash2,
  Upload,
  UserRound,
  Volume2,
  VolumeX,
  WandSparkles,
  Wifi,
  X,
  Zap
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  streaming?: boolean;
  stopped?: boolean;
};

type Session = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
};

type LocalFile = {
  id: string;
  name: string;
  text: string;
  size: number;
  type: string;
};

type ModelState = "idle" | "loading" | "ready" | "error";
type ModelKey = "lite" | "standard" | "power";
type ModelPreference = "auto" | ModelKey;
type PerformanceMode = "turbo" | "balanced" | "smart";
type PerformancePreference = "auto" | PerformanceMode;
type Personality = "standard" | "buddy" | "programmer" | "study";
type AgentStepStatus = "pending" | "active" | "done" | "skipped";
type AgentStep = { id: string; text: string; status: AgentStepStatus };
type AgentPlan = {
  id: string;
  goal: string;
  steps: AgentStep[];
  createdAt: number;
};
type PermissionState = {
  microphone: boolean;
  files: boolean;
  clipboard: boolean;
  notifications: boolean;
};

const MODEL_INFO: Record<
  ModelPreference,
  { label: string; detail: string; estimate: string; icon: typeof Rocket }
> = {
  auto: {
    label: "Auto Cloud",
    detail: "Fast remote route",
    estimate: "No device AI",
    icon: WandSparkles
  },
  lite: {
    label: "Fast Cloud",
    detail: "GPT-5.6 Luna",
    estimate: "Remote",
    icon: Rocket
  },
  standard: {
    label: "Balanced Cloud",
    detail: "GPT-5.6 Luna",
    estimate: "Remote",
    icon: Gauge
  },
  power: {
    label: "Smart Cloud",
    detail: "GPT-5.6 Luna",
    estimate: "Remote",
    icon: BrainCircuit
  }
};

const MODE_INFO: Record<
  PerformancePreference,
  { label: string; detail: string; icon: typeof Rocket }
> = {
  auto: { label: "Auto", detail: "Adaptive", icon: WandSparkles },
  turbo: { label: "Turbo", detail: "Fastest", icon: Rocket },
  balanced: { label: "Balanced", detail: "Daily", icon: Gauge },
  smart: { label: "Smart", detail: "Deeper", icon: BrainCircuit }
};

const PERSONALITY_INFO: Record<
  Personality,
  { label: string; detail: string; icon: typeof UserRound }
> = {
  standard: {
    label: "Standard",
    detail: "Calm + concise",
    icon: UserRound
  },
  buddy: {
    label: "Buddy",
    detail: "Friendly",
    icon: Heart
  },
  programmer: {
    label: "Programmer",
    detail: "Technical",
    icon: Code2
  },
  study: {
    label: "Study",
    detail: "Teacher mode",
    icon: BookOpen
  }
};

const QUICK_PROMPTS = [
  "Explain something difficult simply",
  "Help me plan a project",
  "Debug this problem with me",
  "Give me five creative ideas"
];

const starterMessage: Message = {
  id: "welcome-v5",
  role: "assistant",
  content:
    "J.A.R.V.I.S. V5 Cloud online. Remote AI routing, failover, Research mode, and responsive vertical scrolling are ready.",
  createdAt: Date.now()
};

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function newSession(messages: Message[] = [starterMessage]): Session {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New Session",
    createdAt: now,
    updatedAt: now,
    messages
  };
}

function migrateLegacyMessages(messages: Message[]) {
  const cleaned = messages.filter((message) => {
    if (message.role !== "assistant") return true;

    const text = message.content.toLowerCase();
    const legacyWelcome =
      message.id === "welcome" ||
      message.id === "welcome-v3" ||
      message.id === "welcome-v4" ||
      text.includes("local browser model") ||
      text.includes("activate the ai core") ||
      text.includes("web core online");

    return !legacyWelcome;
  });

  return [starterMessage, ...cleaned].slice(-80);
}

function initialSessions(): Session[] {
  const current = readStored<Session[]>("jarvis.sessions.v4_1", []);
  if (current.length) {
    return current.map((session) => ({
      ...session,
      messages: migrateLegacyMessages(session.messages || [])
    }));
  }

  const stored = readStored<Session[]>("jarvis.sessions.v3", []);
  if (stored.length) {
    return stored.map((session) => ({
      ...session,
      messages: migrateLegacyMessages(session.messages || [])
    }));
  }

  const legacyMessages = readStored<Message[]>("jarvis.messages", []);
  return [newSession(migrateLegacyMessages(legacyMessages))];
}

function formatStorage(bytes?: number) {
  if (!bytes) return "—";
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

function formatLatency(ms?: number) {
  if (!ms) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function openExternal(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

function resolveModel(
  preference: ModelPreference,
  _hasWebGPU: boolean,
  _cpuThreads: number,
  _deviceMemory?: number
): ModelKey {
  if (preference !== "auto") return preference;
  return "lite";
}

function resolveMode(
  preference: PerformancePreference,
  modelKey: ModelKey,
  _hasWebGPU: boolean
): PerformanceMode {
  if (preference !== "auto") return preference;
  if (modelKey === "power") return "smart";
  if (modelKey === "standard") return "balanced";
  return "turbo";
}

function deviceTier(_hasWebGPU: boolean, _cpuThreads: number, _deviceMemory?: number) {
  return "THIN CLIENT";
}

function safeCalculate(expression: string) {
  const clean = expression.trim();

  if (!clean || clean.length > 90 || !/^[0-9+\-*/%().\s]+$/.test(clean)) {
    throw new Error("Use only numbers, parentheses, +, -, *, /, and %.");
  }

  const value = Function(`"use strict"; return (${clean});`)();

  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("That calculation did not produce a finite number.");
  }

  return value;
}

function convertUnit(value: number, from: string, to: string) {
  const source = from.toLowerCase();
  const target = to.toLowerCase();

  if (source === target) return value;

  const pairs: Record<string, (numberValue: number) => number> = {
    "km:mi": (numberValue) => numberValue * 0.621371,
    "mi:km": (numberValue) => numberValue / 0.621371,
    "kg:lb": (numberValue) => numberValue * 2.2046226218,
    "lb:kg": (numberValue) => numberValue / 2.2046226218,
    "c:f": (numberValue) => (numberValue * 9) / 5 + 32,
    "f:c": (numberValue) => ((numberValue - 32) * 5) / 9
  };

  const converter = pairs[`${source}:${target}`];

  if (!converter) {
    throw new Error("Supported conversions: km↔mi, kg↔lb, C↔F.");
  }

  return converter(value);
}

function App() {
  const [sessions, setSessions] = useState<Session[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState(() => {
    const storedId = readStored<string>("jarvis.activeSession.v3", "");
    const first = initialSessions()[0];
    return storedId || first.id;
  });
  const [memories, setMemories] = useState<string[]>(() =>
    readStored<string[]>("jarvis.memories", [])
  );
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [input, setInput] = useState("");
  const [memoryDraft, setMemoryDraft] = useState("");
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceConversation, setVoiceConversation] = useState(false);
  const [modelState, setModelState] = useState<ModelState>("ready");
  const [modelProgress, setModelProgress] = useState(1);
  const [modelStatus, setModelStatus] = useState("Remote AI ready");
  const [backend, setBackend] = useState("REMOTE");
  const [loadedModelKey, setLoadedModelKey] = useState<ModelKey | null>(null);
  const [notice, setNotice] = useState("");
  const [online, setOnline] = useState(navigator.onLine);
  const [storageUsage, setStorageUsage] = useState<number | undefined>();
  const [modelPreference, setModelPreference] = useState<ModelPreference>(() =>
    readStored<ModelPreference>("jarvis.model.v3", "auto")
  );
  const [performancePreference, setPerformancePreference] =
    useState<PerformancePreference>(() =>
      readStored<PerformancePreference>("jarvis.mode.v3", "auto")
    );
  const [personality, setPersonality] = useState<Personality>(() =>
    readStored<Personality>("jarvis.personality.v3", "standard")
  );
  const [autoBoot, setAutoBoot] = useState<boolean>(() =>
    readStored<boolean>("jarvis.autoboot", "gpu" in navigator)
  );
  const [firstChunkMs, setFirstChunkMs] = useState<number | undefined>();
  const [totalMs, setTotalMs] = useState<number | undefined>();
  const [memoriesUsed, setMemoriesUsed] = useState(0);
  const [fileChunksUsed, setFileChunksUsed] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [queuedPrompt, setQueuedPrompt] = useState<{
    text: string;
    sessionId: string;
  } | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentGoal, setAgentGoal] = useState("");
  const [agentPlan, setAgentPlan] = useState<AgentPlan | null>(() =>
    readStored<AgentPlan | null>("jarvis.agent.v4", null)
  );
  const [agentPlanning, setAgentPlanning] = useState(false);
  const [agentRequestId, setAgentRequestId] = useState<string | null>(null);
  const [tokensPerSecond, setTokensPerSecond] = useState<number | undefined>();
  const [estimatedTokens, setEstimatedTokens] = useState<number | undefined>();
  const [researchMode, setResearchMode] = useState<boolean>(() =>
    readStored<boolean>("jarvis.research.v5", false)
  );
  const [modelUsed, setModelUsed] = useState("Remote router");
  const [userScrolledAway, setUserScrolledAway] = useState(false);
  const [permissions, setPermissions] = useState<PermissionState>(() =>
    readStored<PermissionState>("jarvis.permissions.v4", {
      microphone: true,
      files: true,
      clipboard: true,
      notifications: false
    })
  );
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const chatStreamRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const stopRequestedRef = useRef(false);

  const hasWebGPU = "gpu" in navigator;
  const cpuThreads = navigator.hardwareConcurrency || 0;
  const deviceMemory = navigator.deviceMemory;

  const resolvedModel = useMemo(
    () => resolveModel(modelPreference, hasWebGPU, cpuThreads, deviceMemory),
    [modelPreference, hasWebGPU, cpuThreads, deviceMemory]
  );

  const resolvedMode = useMemo(
    () => resolveMode(performancePreference, resolvedModel, hasWebGPU),
    [performancePreference, resolvedModel, hasWebGPU]
  );

  const tier = useMemo(
    () => deviceTier(hasWebGPU, cpuThreads, deviceMemory),
    [hasWebGPU, cpuThreads, deviceMemory]
  );

  const activeSession =
    sessions.find((session) => session.id === activeSessionId) || sessions[0];
  const messages = activeSession?.messages || [];

  function updateSessionMessages(
    sessionId: string,
    updater: (current: Message[]) => Message[]
  ) {
    setSessions((current) =>
      current.map((session) => {
        if (session.id !== sessionId) return session;

        const nextMessages = updater(session.messages);
        const firstUser = nextMessages.find((message) => message.role === "user");

        return {
          ...session,
          title:
            session.title === "New Session" && firstUser
              ? firstUser.content.slice(0, 34)
              : session.title,
          updatedAt: Date.now(),
          messages: nextMessages
        };
      })
    );
  }

  function addLocalAssistant(sessionId: string, content: string) {
    const message: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      createdAt: Date.now()
    };
    updateSessionMessages(sessionId, (current) => [...current, message]);
  }

  useEffect(() => {
    if (!sessions.some((session) => session.id === activeSessionId)) {
      setActiveSessionId(sessions[0]?.id || "");
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    setModelState("ready");
    setModelProgress(1);
    setModelStatus("Remote AI ready");
    setBackend("REMOTE");
  }, []);

  useEffect(() => {
    localStorage.setItem("jarvis.sessions.v4_1", JSON.stringify(sessions.slice(0, 30)));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem("jarvis.activeSession.v3", JSON.stringify(activeSessionId));
  }, [activeSessionId]);

  useEffect(() => {
    localStorage.setItem("jarvis.memories", JSON.stringify(memories));
  }, [memories]);

  useEffect(() => {
    localStorage.setItem("jarvis.model.v3", JSON.stringify(modelPreference));
  }, [modelPreference]);

  useEffect(() => {
    localStorage.setItem("jarvis.mode.v3", JSON.stringify(performancePreference));
  }, [performancePreference]);

  useEffect(() => {
    localStorage.setItem("jarvis.personality.v3", JSON.stringify(personality));
  }, [personality]);

  useEffect(() => {
    localStorage.setItem("jarvis.autoboot", JSON.stringify(autoBoot));
  }, [autoBoot]);

  useEffect(() => {
    localStorage.setItem("jarvis.permissions.v4", JSON.stringify(permissions));
  }, [permissions]);

  useEffect(() => {
    localStorage.setItem("jarvis.research.v5", JSON.stringify(researchMode));
  }, [researchMode]);

  useEffect(() => {
    if (agentPlan) {
      localStorage.setItem("jarvis.agent.v4", JSON.stringify(agentPlan));
    } else {
      localStorage.removeItem("jarvis.agent.v4");
    }
  }, [agentPlan]);

  useEffect(() => {
    if (!userScrolledAway) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, userScrolledAway]);


  useEffect(() => {
    if (!queuedPrompt || busy) {
      return;
    }

    const queued = queuedPrompt;
    setQueuedPrompt(null);

    const session = sessions.find((item) => item.id === queued.sessionId);
    if (session) {
      void runModelPrompt(queued.text, queued.sessionId, session.messages);
    }
  }, [queuedPrompt, modelState, loadedModelKey, resolvedModel, busy, sessions]);

  useEffect(() => {
    if (!loadedModelKey || loadedModelKey === resolvedModel || busy) return;
    loadModel(resolvedModel, true);
  }, [resolvedModel, loadedModelKey, busy]);

  useEffect(() => {
    const updateOnline = () => setOnline(navigator.onLine);
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    window.addEventListener("beforeinstallprompt", beforeInstall as EventListener);

    if (navigator.storage?.estimate) {
      void navigator.storage.estimate().then((estimate) => {
        setStorageUsage(estimate.usage);
      });
    }

    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      window.removeEventListener("beforeinstallprompt", beforeInstall as EventListener);
    };
  }, [modelState]);

  const status = useMemo(() => {
    if (stopping) return "STOPPING";
    if (busy) return "GENERATING";
    if (modelState === "loading") return "BOOTING";
    if (modelState === "ready") return "ONLINE";
    if (modelState === "error") return "ERROR";
    return "STANDBY";
  }, [busy, stopping, modelState]);

  function handleChatScroll() {
    const element = chatStreamRef.current;
    if (!element) return;

    const distanceFromBottom =
      element.scrollHeight - element.scrollTop - element.clientHeight;

    setUserScrolledAway(distanceFromBottom > 90);
  }

  function jumpToLatest() {
    setUserScrolledAway(false);
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function jumpToTop() {
    const element = chatStreamRef.current;
    if (!element) return;
    setUserScrolledAway(true);
    element.scrollTo({ top: 0, behavior: "smooth" });
  }

  function speak(text: string) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.04;
    utterance.pitch = 0.88;

    if (voiceConversation) {
      utterance.onend = () => {
        window.setTimeout(() => startListening(), 350);
      };
    }

    window.speechSynthesis.speak(utterance);
  }

  function unloadModel() {
    setNotice("No AI model is loaded on this device. J.A.R.V.I.S. inference is remote.");
  }

  async function createAgentPlan() {
    const goal = agentGoal.trim();
    if (!goal || busy || agentPlanning) return;

    const id = crypto.randomUUID();
    setAgentPlanning(true);
    setAgentRequestId(id);
    setNotice("Remote J.A.R.V.I.S. is building an approval-based task plan…");

    try {
      const result = await buildRemotePlan(goal, resolvedMode, personality);
      setAgentPlan({
        id,
        goal: result.goal,
        steps: result.steps.map((text) => ({
          id: crypto.randomUUID(),
          text,
          status: "pending"
        })),
        createdAt: Date.now()
      });
      setAgentOpen(true);
      setNotice("Agent plan ready. Approve each step as you work through it.");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Remote AI error: ${error.message}`
          : "Remote AI could not build the plan."
      );
    } finally {
      setAgentPlanning(false);
      setAgentRequestId(null);
    }
  }

  function updateAgentStep(stepId: string, status: AgentStepStatus) {
    setAgentPlan((current) =>
      current
        ? {
            ...current,
            steps: current.steps.map((step) =>
              step.id === stepId ? { ...step, status } : step
            )
          }
        : current
    );
  }

  function askAboutAgentStep(step: AgentStep) {
    setAgentOpen(false);
    void sendMessage(
      `Help me complete this approved task step: ${step.text}\n\nGive me the practical next actions only.`
    );
  }

  async function setPermission(
    key: keyof PermissionState,
    enabled: boolean
  ) {
    if (key === "notifications" && enabled && "Notification" in window) {
      const result = await Notification.requestPermission();
      enabled = result === "granted";
      if (!enabled) setNotice("Browser notification permission was not granted.");
    }

    setPermissions((current) => ({ ...current, [key]: enabled }));
  }

  function loadModel(target: ModelKey = resolvedModel, _force = false) {
    setLoadedModelKey(target);
    setModelState("ready");
    setModelProgress(1);
    setModelStatus("Remote AI ready");
    setBackend("REMOTE");
    setNotice(`${MODEL_INFO[target].label} selected. AI compute stays off this device.`);
  }

  function switchModel(preference: ModelPreference) {
    if (busy) return;

    setModelPreference(preference);
    const target = resolveModel(preference, hasWebGPU, cpuThreads, deviceMemory);
    loadModel(target, true);
  }

  function createSession() {
    const session = newSession();
    setSessions((current) => [session, ...current].slice(0, 30));
    setActiveSessionId(session.id);
    setInput("");
    setEditingMessageId(null);
  }

  function deleteActiveSession() {
    setSessions((current) => {
      const remaining = current.filter((session) => session.id !== activeSessionId);

      if (remaining.length) {
        setActiveSessionId(remaining[0].id);
        return remaining;
      }

      const replacement = newSession();
      setActiveSessionId(replacement.id);
      return [replacement];
    });
  }

  function clearActiveChat() {
    updateSessionMessages(activeSessionId, () => [starterMessage]);
    setNotice("Session cleared.");
    setFirstChunkMs(undefined);
    setTotalMs(undefined);
    setMemoriesUsed(0);
    setFileChunksUsed(0);
  }

  async function copyMessage(message: Message) {
    if (!permissions.clipboard) {
      setNotice("Clipboard access is disabled in V5 Permissions.");
      return;
    }
    if (!message.content.trim()) return;

    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(null), 1200);
    } catch {
      setNotice("Clipboard access was blocked by the browser.");
    }
  }

  function editMessage(message: Message) {
    if (message.role !== "user") return;
    setInput(message.content);
    setEditingMessageId(message.id);
    setNotice("Editing message. Send to replace this point in the conversation.");
  }

  function regenerate(messageId: string) {
    if (busy) return;

    const index = messages.findIndex((message) => message.id === messageId);
    if (index < 0) return;

    let userIndex = index - 1;
    while (userIndex >= 0 && messages[userIndex].role !== "user") {
      userIndex -= 1;
    }

    if (userIndex < 0) return;

    const prompt = messages[userIndex].content;
    const baseMessages = messages.slice(0, userIndex);
    void runModelPrompt(prompt, activeSessionId, baseMessages);
  }

  function stopGeneration() {
    if (!busy) return;
    stopRequestedRef.current = true;
    setStopping(true);
    setNotice("Stopping remote response…");
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!permissions.files) {
      setNotice("Local file access is disabled in V5 Permissions.");
      event.target.value = "";
      return;
    }

    const selected = Array.from(event.target.files || []);

    if (!selected.length) return;

    const acceptedExtensions = [
      ".txt",
      ".md",
      ".json",
      ".csv",
      ".js",
      ".ts",
      ".tsx",
      ".jsx",
      ".py",
      ".html",
      ".css",
      ".xml",
      ".yaml",
      ".yml"
    ];

    const room = Math.max(0, 5 - files.length);
    const nextFiles: LocalFile[] = [];

    for (const file of selected.slice(0, room)) {
      const lower = file.name.toLowerCase();
      const accepted = acceptedExtensions.some((extension) => lower.endsWith(extension));

      if (!accepted) {
        setNotice(`${file.name} is not a supported text/code file.`);
        continue;
      }

      if (file.size > 300_000) {
        setNotice(`${file.name} is over the 300 KB V5 file limit.`);
        continue;
      }

      const text = await file.text();

      nextFiles.push({
        id: crypto.randomUUID(),
        name: file.name,
        text,
        size: file.size,
        type: file.type || "text/plain"
      });
    }

    setFiles((current) => [...current, ...nextFiles].slice(0, 5));
    if (nextFiles.length) {
      setNotice(`${nextFiles.length} local file${nextFiles.length === 1 ? "" : "s"} attached. V5 will retrieve relevant excerpts only.`);
    }

    event.target.value = "";
  }

  async function handleLocalCommand(text: string, sessionId: string) {
    const normalized = text.trim().toLowerCase();

    if (normalized === "/clear" || normalized === "/new") {
      clearActiveChat();
      return true;
    }

    if (normalized === "/load" || normalized === "load ai") {
      addLocalAssistant(
        sessionId,
        "V5 Cloud is already ready. There is no local AI model to initialize or download."
      );
      return true;
    }

    if (normalized.startsWith("/calc ")) {
      try {
        const expression = text.slice(6);
        const value = safeCalculate(expression);
        addLocalAssistant(sessionId, `${expression.trim()} = ${value}`);
      } catch (error) {
        addLocalAssistant(
          sessionId,
          error instanceof Error ? error.message : "Calculation failed."
        );
      }
      return true;
    }

    if (normalized.startsWith("/convert ")) {
      const match = text
        .slice(9)
        .trim()
        .match(/^(-?\d+(?:\.\d+)?)\s*(km|mi|kg|lb|c|f)\s+(?:to\s+)?(km|mi|kg|lb|c|f)$/i);

      if (!match) {
        addLocalAssistant(
          sessionId,
          "Use /convert like: /convert 5 km to mi, /convert 10 kg to lb, or /convert 30 c to f."
        );
        return true;
      }

      try {
        const value = Number(match[1]);
        const result = convertUnit(value, match[2], match[3]);
        addLocalAssistant(
          sessionId,
          `${value} ${match[2]} = ${Number(result.toFixed(4))} ${match[3]}`
        );
      } catch (error) {
        addLocalAssistant(
          sessionId,
          error instanceof Error ? error.message : "Conversion failed."
        );
      }

      return true;
    }

    if (normalized.startsWith("/timer ")) {
      const match = text
        .slice(7)
        .trim()
        .match(/^(\d+(?:\.\d+)?)\s*(s|sec|m|min|h)$/i);

      if (!match) {
        addLocalAssistant(sessionId, "Use /timer like: /timer 30s, /timer 5m, or /timer 1h.");
        return true;
      }

      const amount = Number(match[1]);
      const unit = match[2].toLowerCase();
      const seconds =
        unit.startsWith("h") ? amount * 3600 : unit.startsWith("m") ? amount * 60 : amount;

      if (seconds <= 0 || seconds > 86_400) {
        addLocalAssistant(sessionId, "V5 timers must be between 1 second and 24 hours.");
        return true;
      }

      addLocalAssistant(sessionId, `Timer started for ${amount}${match[2]}.`);

      window.setTimeout(() => {
        addLocalAssistant(sessionId, `Timer finished: ${amount}${match[2]}.`);
        if (
          permissions.notifications &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          new Notification("J.A.R.V.I.S. V5 Timer", {
            body: `Timer finished: ${amount}${match[2]}.`
          });
        }
      }, seconds * 1000);

      return true;
    }

    if (normalized.startsWith("/note ")) {
      const note = text.slice(6).trim();

      if (note) {
        setMemories((current) => [...current, note].slice(-40));
        addLocalAssistant(sessionId, "Saved to local memory.");
      }

      return true;
    }

    if (normalized === "/youtube" || normalized === "open youtube") {
      openExternal("https://www.youtube.com");
      setNotice("Opened YouTube.");
      return true;
    }

    if (normalized === "/github" || normalized === "open github") {
      openExternal("https://github.com/dvilrgamerz/J.A.R.V.I.S.");
      setNotice("Opened the repository.");
      return true;
    }

    if (normalized.startsWith("/search ")) {
      const query = text.slice(8).trim();

      if (query) {
        openExternal(`https://www.google.com/search?q=${encodeURIComponent(query)}`);
        setNotice("Opened browser search.");
      }

      return true;
    }

    return false;
  }

  async function runModelPrompt(
    text: string,
    sessionId: string,
    baseMessages: Message[]
  ) {
    if (!text.trim() || busy) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      createdAt: Date.now()
    };

    const assistantMessage: Message = {
      id: `assistant-${userMessage.id}`,
      role: "assistant",
      content: "",
      createdAt: Date.now(),
      streaming: true
    };

    const history = [...baseMessages, userMessage]
      .filter((message) => message.id !== "welcome-v5" && !message.streaming)
      .slice(-24)
      .map(({ role, content }) => ({ role, content }));

    const responseId = assistantMessage.id;
    updateSessionMessages(sessionId, () => [...baseMessages, userMessage, assistantMessage]);

    setBusy(true);
    setStopping(false);
    stopRequestedRef.current = false;
    setFirstChunkMs(undefined);
    setTotalMs(undefined);
    setModelState("ready");
    setModelStatus("Remote AI streaming");
    setBackend("REMOTE");

    try {
      const result = await streamRemoteChat({
        messages: history,
        memories,
        files: files.map(({ name, text }) => ({ name, text })),
        mode: resolvedMode,
        profile: resolvedModel,
        personality,
        research: researchMode,
        shouldStop: () => stopRequestedRef.current,
        onToken: (token, firstMs) => {
          if (firstMs) setFirstChunkMs(firstMs);
          updateSessionMessages(sessionId, (current) =>
            current.map((message) =>
              message.id === responseId
                ? {
                    ...message,
                    content: message.content + token,
                    streaming: true
                  }
                : message
            )
          );
        }
      });

      updateSessionMessages(sessionId, (current) =>
        current.map((message) =>
          message.id === responseId
            ? {
                ...message,
                content: result.answer,
                streaming: false,
                stopped: result.stopped
              }
            : message
        )
      );

      setFirstChunkMs(result.firstChunkMs || undefined);
      setTotalMs(result.totalMs || undefined);
      setMemoriesUsed(result.memoriesUsed);
      setFileChunksUsed(result.fileChunksUsed);
      setEstimatedTokens(result.estimatedTokens);
      setTokensPerSecond(result.tokensPerSecond);
      setModelUsed(result.modelUsed);
      setBackend(result.researchUsed ? "WEB + REMOTE" : "REMOTE");

      if (!result.stopped) {
        speak(result.answer);
      } else {
        setNotice("Remote generation stopped.");
      }
    } catch (error) {
      updateSessionMessages(sessionId, (current) =>
        current.map((message) =>
          message.id === responseId
            ? {
                ...message,
                content:
                  message.content ||
                  "Remote AI request failed. Please try again.",
                streaming: false
              }
            : message
        )
      );
      setNotice(
        error instanceof Error
          ? `Remote AI error: ${error.message}`
          : "Remote AI request failed."
      );
    } finally {
      setBusy(false);
      setStopping(false);
      stopRequestedRef.current = false;
      setModelStatus("Remote AI ready");
    }
  }

  async function sendMessage(raw = input) {
    const text = raw.trim();
    if (!text || busy || !activeSession) return;

    setInput("");
    setNotice("");

    if (await handleLocalCommand(text, activeSession.id)) {
      setEditingMessageId(null);
      return;
    }

    let baseMessages = activeSession.messages;

    if (editingMessageId) {
      const index = baseMessages.findIndex((message) => message.id === editingMessageId);
      if (index >= 0) {
        baseMessages = baseMessages.slice(0, index);
      }
      setEditingMessageId(null);
    }

    await runModelPrompt(text, activeSession.id, baseMessages);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function startListening() {
    if (!permissions.microphone) {
      setNotice("Microphone access is disabled in V5 Permissions.");
      return;
    }

    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setNotice("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice("Voice recognition stopped. Check microphone permission.");
    };
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results || [])
        .map((result: any) => result?.[0]?.transcript || "")
        .join("")
        .trim();

      if (transcript) setInput(transcript);

      const last = event.results?.[event.results.length - 1];
      if (last?.isFinal && transcript) {
        void sendMessage(transcript);
      }
    };

    recognition.start();
  }

  function saveMemory() {
    const value = memoryDraft.trim();
    if (!value || memories.includes(value)) return;

    setMemories((current) => [...current, value].slice(-40));
    setMemoryDraft("");
  }

  function exportData() {
    const payload = {
      version: 5,
      exportedAt: new Date().toISOString(),
      sessions,
      memories,
      settings: {
        modelPreference,
        performancePreference,
        personality,
        autoBoot,
        voiceEnabled,
        voiceConversation,
        researchMode,
        permissions
      },
      agentPlan
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "jarvis-v5-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());

      if (Array.isArray(parsed.sessions) && parsed.sessions.length) {
        setSessions(parsed.sessions.slice(0, 30));
        setActiveSessionId(parsed.sessions[0].id);
      }

      if (Array.isArray(parsed.memories)) {
        setMemories(parsed.memories.slice(-40));
      }

      if (typeof parsed.settings?.researchMode === "boolean") {
        setResearchMode(parsed.settings.researchMode);
      }

      if (parsed.settings?.permissions) {
        setPermissions({
          microphone: parsed.settings.permissions.microphone !== false,
          files: parsed.settings.permissions.files !== false,
          clipboard: parsed.settings.permissions.clipboard !== false,
          notifications: parsed.settings.permissions.notifications === true
        });
      }

      if (parsed.agentPlan?.goal && Array.isArray(parsed.agentPlan.steps)) {
        setAgentPlan(parsed.agentPlan);
      }

      setNotice("J.A.R.V.I.S. V5 data imported.");
      setPrivacyOpen(false);
    } catch {
      setNotice("That backup file could not be imported.");
    }

    event.target.value = "";
  }

  async function clearCaches() {
    if (!("caches" in window)) {
      setNotice("Cache controls are unavailable in this browser.");
      return;
    }

    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
    setNotice("Accessible J.A.R.V.I.S. caches cleared. Browser-managed model storage may also require site-data controls.");
  }

  function clearLocalData() {
    const session = newSession();
    setSessions([session]);
    setActiveSessionId(session.id);
    setMemories([]);
    setFiles([]);
    setInput("");
    setAgentPlan(null);
    setAgentGoal("");
    setPermissions({
      microphone: true,
      files: true,
      clipboard: true,
      notifications: false
    });

    [
      "jarvis.sessions.v4_1",
      "jarvis.sessions.v3",
      "jarvis.activeSession.v3",
      "jarvis.memories",
      "jarvis.model.v3",
      "jarvis.mode.v3",
      "jarvis.personality.v3",
      "jarvis.autoboot",
      "jarvis.messages",
      "jarvis.permissions.v4",
      "jarvis.agent.v4",
      "jarvis.research.v5"
    ].forEach((key) => localStorage.removeItem(key));

    setPrivacyOpen(false);
    setNotice("Local J.A.R.V.I.S. chat, memory, and settings data cleared.");
  }

  async function installApp() {
    if (!installPrompt) {
      setNotice("Install is not currently offered by this browser. You can still use Add to Home screen / Install app from the browser menu.");
      return;
    }

    await installPrompt.prompt?.();
    setInstallPrompt(null);
  }

  return (
    <div className={`app-shell v3-shell v4-shell v5-shell ${busy ? "is-thinking" : ""}`}>
      <div className="scanlines" />
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <aside className="side-panel">
        <div className="brand">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div>
            <h1>J.A.R.V.I.S.</h1>
            <p>CLOUD INTELLIGENCE · V5</p>
          </div>
        </div>

        <section className="reactor-card">
          <div className="reactor-shell">
            <div className="reactor" aria-hidden="true">
              <div className="reactor-ring ring-one" />
              <div className="reactor-ring ring-two" />
              <div className="reactor-ring ring-three" />
              <div className="reactor-ticks" />
              <div className="reactor-core"><CirclePower size={31} /></div>
            </div>
            <div className="reactor-orbit orbit-a" />
            <div className="reactor-orbit orbit-b" />
          </div>

          <div className="status-line">
            <span className={`status-dot ${modelState === "ready" ? "online" : "warning"}`} />
            <span>{status}</span>
          </div>

          <p className="model-name">
            {MODEL_INFO[resolvedModel].detail} · {backend}
          </p>

          <div className="core-meter">
            <span>CORE</span>
            <div>
              <i
                style={{
                  width:
                    modelState === "ready"
                      ? "100%"
                      : `${Math.round(modelProgress * 100)}%`
                }}
              />
            </div>
            <strong>
              {modelState === "ready" ? "100" : Math.round(modelProgress * 100)}%
            </strong>
          </div>
        </section>

        <section className="panel-section">
          <div className="section-title">
            <MonitorCog size={15} />
            <span>CLOUD TELEMETRY</span>
          </div>

          <div className="device-tier-card">
            <span>{tier}</span>
            <strong>{resolvedModel.toUpperCase()}</strong>
            <small>{resolvedMode.toUpperCase()} INFERENCE</small>
          </div>

          <div className="telemetry-grid">
            <div className="telemetry-item">
              <Cpu size={16} />
              <span>THREADS</span>
              <strong>{cpuThreads || "—"}</strong>
            </div>
            <div className="telemetry-item">
              <MemoryStick size={16} />
              <span>MEMORY</span>
              <strong>{deviceMemory ? `${deviceMemory} GB+` : "Hidden"}</strong>
            </div>
            <div className="telemetry-item">
              <Gauge size={16} />
              <span>ACCELERATOR</span>
              <strong>"REMOTE GPU"</strong>
            </div>
            <div className="telemetry-item">
              <HardDrive size={16} />
              <span>CACHE</span>
              <strong>{formatStorage(storageUsage)}</strong>
            </div>
          </div>

          <div className="latency-row">
            <div>
              <span>FIRST TEXT</span>
              <strong>{formatLatency(firstChunkMs)}</strong>
            </div>
            <div>
              <span>TOTAL</span>
              <strong>{formatLatency(totalMs)}</strong>
            </div>
          </div>
        </section>

        <section className="panel-section memory-section">
          <div className="section-title v3-section-head">
            <div>
              <BrainCircuit size={15} />
              <span>VECTOR MEMORY</span>
            </div>
            <span>{memoriesUsed}/{memories.length}</span>
          </div>

          <div className="memory-list">
            {memories.length === 0 ? (
              <p className="empty-note">No saved memories yet.</p>
            ) : (
              memories.slice(-12).map((memory, index) => (
                <div className="memory-chip" key={`${memory}-${index}`}>
                  <span>{memory}</span>
                  <button
                    aria-label="Remove memory"
                    onClick={() =>
                      setMemories((items) =>
                        items.filter((item) => item !== memory)
                      )
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="memory-add">
            <input
              value={memoryDraft}
              onChange={(event) => setMemoryDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveMemory();
              }}
              placeholder="Remember something…"
              maxLength={360}
            />
            <button onClick={saveMemory} aria-label="Save memory">
              <Plus size={16} />
            </button>
          </div>
        </section>

        <div className="security-badge">
          <ShieldCheck size={16} />
          <span>Remote inference · light client</span>
        </div>
      </aside>

      <main className="main-panel v3-main v4-main">
        <header className="topbar">
          <div className="hero-copy">
            <span className="eyebrow">AGENTIC REMOTE INTELLIGENCE</span>
            <h2>
              J.A.R.V.I.S. <em>V5</em>
            </h2>
            <p>Agent workspace · models · memory · files · tools · permissions</p>
          </div>

          <div className="top-actions">
            <div className="live-pill">
              <span className={online ? "live-dot" : "live-dot offline"} />
              {online ? "NETWORK" : "OFFLINE"}
            </div>

            <button
              className={`icon-button ${voiceConversation ? "active" : ""}`}
              onClick={() => setVoiceConversation((value) => !value)}
              title="Toggle hands-free conversation mode"
            >
              <Mic size={18} />
            </button>

            <button
              className={`icon-button ${voiceEnabled ? "active" : ""}`}
              onClick={() => setVoiceEnabled((value) => !value)}
              title={voiceEnabled ? "Disable spoken replies" : "Enable spoken replies"}
            >
              {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <button
              className={`icon-button ${agentOpen ? "active" : ""}`}
              onClick={() => setAgentOpen(true)}
              title="Agent Workspace"
            >
              <WandSparkles size={18} />
            </button>

            <button
              className={`icon-button ${permissionsOpen ? "active" : ""}`}
              onClick={() => setPermissionsOpen(true)}
              title="Permissions"
            >
              <SlidersHorizontal size={18} />
            </button>

            <button className="icon-button" onClick={installApp} title="Install web app">
              <Download size={18} />
            </button>

            <button
              className="icon-button"
              onClick={() => setPrivacyOpen(true)}
              title="Privacy center"
            >
              <ShieldCheck size={18} />
            </button>

            <button
              className="github-button"
              onClick={() =>
                openExternal("https://github.com/dvilrgamerz/J.A.R.V.I.S.")
              }
            >
              Repository <ExternalLink size={15} />
            </button>
          </div>
        </header>

        <section className="v3-session-bar">
          <div className="session-switcher">
            <select
              value={activeSessionId}
              onChange={(event) => setActiveSessionId(event.target.value)}
              disabled={busy}
            >
              {sessions
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
            </select>

            <button onClick={createSession} disabled={busy}>
              <Plus size={14} /> New
            </button>

            <button onClick={deleteActiveSession} disabled={busy}>
              <Trash2 size={14} />
            </button>
          </div>

          <div className="v3-context-badges">
            <span><BrainCircuit size={12} /> {memories.length} memories</span>
            <span><FileText size={12} /> {files.length} files</span>
            <span><SlidersHorizontal size={12} /> {PERSONALITY_INFO[personality].label}</span>
            <span><Zap size={12} /> {tokensPerSecond ? `${tokensPerSecond} tok/s` : "— tok/s"}</span>
          </div>
        </section>

        <section className="v3-control-grid">
          <div className="v3-control-card">
            <div className="v3-control-title">
              <Cpu size={15} />
              <span>REMOTE PROFILE</span>
            </div>

            <div className="v3-selector">
              {(Object.keys(MODEL_INFO) as ModelPreference[]).map((key) => {
                const item = MODEL_INFO[key];
                const Icon = item.icon;

                return (
                  <button
                    key={key}
                    className={modelPreference === key ? "selected" : ""}
                    onClick={() => switchModel(key)}
                    disabled={busy}
                  >
                    <Icon size={14} />
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                    <em>{item.estimate}</em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="v3-control-card">
            <div className="v3-control-title">
              <Gauge size={15} />
              <span>INFERENCE MODE</span>
            </div>

            <div className="v3-selector compact">
              {(Object.keys(MODE_INFO) as PerformancePreference[]).map((key) => {
                const item = MODE_INFO[key];
                const Icon = item.icon;

                return (
                  <button
                    key={key}
                    className={performancePreference === key ? "selected" : ""}
                    onClick={() => setPerformancePreference(key)}
                    disabled={busy}
                  >
                    <Icon size={14} />
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="v3-control-card">
            <div className="v3-control-title">
              <UserRound size={15} />
              <span>PERSONALITY</span>
            </div>

            <div className="v3-selector compact">
              {(Object.keys(PERSONALITY_INFO) as Personality[]).map((key) => {
                const item = PERSONALITY_INFO[key];
                const Icon = item.icon;

                return (
                  <button
                    key={key}
                    className={personality === key ? "selected" : ""}
                    onClick={() => setPersonality(key)}
                    disabled={busy}
                  >
                    <Icon size={14} />
                    <strong>{item.label}</strong>
                    <small>{item.detail}</small>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="cloud-ready-banner">
          <div>
            <strong>V5 CLOUD AI READY</strong>
            <span>No local model download · remote routing + failover · {REMOTE_MODEL_NAME}</span>
          </div>
          <span className="cloud-ready-dot" />
        </div>

        <section className="v3-attachments">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            accept=".txt,.md,.json,.csv,.js,.ts,.tsx,.jsx,.py,.html,.css,.xml,.yaml,.yml"
            onChange={(event) => void handleFileUpload(event)}
          />

          <button className="attach-button" onClick={() => fileInputRef.current?.click()}>
            <Upload size={14} />
            Add local files
          </button>

          {files.map((file) => (
            <div className="file-chip" key={file.id}>
              <FileText size={13} />
              <span>{file.name}</span>
              <small>{Math.ceil(file.size / 1024)} KB</small>
              <button onClick={() => setFiles((items) => items.filter((item) => item.id !== file.id))}>
                <X size={12} />
              </button>
            </div>
          ))}

          {files.length > 0 && (
            <span className="retrieval-stat">
              {fileChunksUsed} excerpt{fileChunksUsed === 1 ? "" : "s"} used last reply
            </span>
          )}
        </section>

        <section className="quick-prompt-deck">
          {QUICK_PROMPTS.map((prompt) => (
            <button key={prompt} onClick={() => void sendMessage(prompt)} disabled={busy}>
              <Sparkles size={14} />
              {prompt}
            </button>
          ))}
        </section>

        <section className="quick-actions">
          <button onClick={() => void sendMessage("/calc 12 * (3 + 4)")} disabled={busy}>
            <Cpu size={15} /> Calculator
          </button>
          <button onClick={() => void sendMessage("/convert 5 km to mi")} disabled={busy}>
            <Repeat2 size={15} /> Convert
          </button>
          <button onClick={() => void sendMessage("/timer 30s")} disabled={busy}>
            <Timer size={15} /> Timer
          </button>
          <button onClick={clearActiveChat} disabled={busy}>
            <Trash2 size={15} /> Clear Session
          </button>
          <button
            className={researchMode ? "research-active" : ""}
            onClick={() => setResearchMode((value) => !value)}
            disabled={busy}
            title="Use live web search for current answers"
          >
            <Globe2 size={15} /> {researchMode ? "Research ON" : "Research"}
          </button>
          <button onClick={() => openExternal("https://www.google.com")}>
            <Search size={15} /> Search
          </button>
          <button onClick={unloadModel} disabled={busy || agentPlanning}>
            <Wifi size={15} /> Remote AI
          </button>
        </section>

        <section className="chat-card v3-chat v4-chat">
          <div className="chat-glow" />

          <div className="chat-stream" ref={chatStreamRef} onScroll={handleChatScroll}>
            {messages.map((message) => (
              <article
                className={`message-row ${message.role} ${message.streaming ? "streaming" : ""}`}
                key={message.id}
              >
                <div className="message-avatar">
                  {message.role === "assistant" ? <Sparkles size={17} /> : "YOU"}
                </div>

                <div className="message-content">
                  <div className="message-meta">
                    <strong>{message.role === "assistant" ? "J.A.R.V.I.S." : "YOU"}</strong>

                    {message.streaming ? (
                      <span className="stream-badge">LIVE</span>
                    ) : message.stopped ? (
                      <span className="stopped-badge">STOPPED</span>
                    ) : (
                      <span>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    )}

                    <div className="message-actions">
                      {message.role === "user" && (
                        <button onClick={() => editMessage(message)} title="Edit and resend">
                          <Pencil size={12} />
                        </button>
                      )}

                      {message.role === "assistant" &&
                        message.id !== "welcome-v5" &&
                        !message.streaming && (
                          <>
                            <button onClick={() => regenerate(message.id)} title="Regenerate">
                              <Repeat2 size={12} />
                            </button>
                            <button onClick={() => void copyMessage(message)} title="Copy">
                              {copiedMessageId === message.id ? (
                                <Check size={12} />
                              ) : (
                                <Copy size={12} />
                              )}
                            </button>
                          </>
                        )}
                    </div>
                  </div>

                  <div className="rendered-message">
                    {message.role === "assistant" ? (
                      <MarkdownMessage content={message.content} />
                    ) : (
                      <p>{message.content}</p>
                    )}
                    {message.streaming && <span className="cursor-block" />}
                  </div>
                </div>
              </article>
            ))}

            <div ref={endRef} />
          </div>

          <div className="scroll-controls" aria-label="Chat scroll controls">
            <button onClick={jumpToTop} title="Jump to top">
              <ArrowUp size={16} />
            </button>
            <button
              className={userScrolledAway ? "attention" : ""}
              onClick={jumpToLatest}
              title="Jump to latest"
            >
              <ArrowDown size={16} />
            </button>
          </div>

          <div className="composer-zone">
            {notice && <div className="notice">{notice}</div>}

            {listening && (
              <div className="voice-wave">
                <span /><span /><span /><span /><span /><span />
                <strong>LISTENING</strong>
              </div>
            )}

            <form className="composer" onSubmit={submit}>
              <button
                type="button"
                className={`mic-button ${listening ? "listening" : ""}`}
                onClick={listening ? undefined : startListening}
                aria-label="Use microphone"
              >
                {listening ? <MicOff size={19} /> : <Mic size={19} />}
              </button>

              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={
                  editingMessageId
                    ? "Edit the message, then send…"
                    : listening
                      ? "Listening…"
                      : `Command J.A.R.V.I.S. · ${MODEL_INFO[resolvedModel].label} · ${resolvedMode}`
                }
                rows={1}
                maxLength={6000}
              />

              {busy ? (
                <button
                  className="stop-button"
                  type="button"
                  onClick={stopGeneration}
                  disabled={stopping}
                  title="Stop generation"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button className="send-button" type="submit" disabled={!input.trim()}>
                  <Send size={18} />
                </button>
              )}
            </form>

            <div className="composer-footer">
              <span>{MODEL_INFO[resolvedModel].label.toUpperCase()}</span>
              <i />
              <span>{resolvedMode.toUpperCase()}</span>
              <i />
              <span>{PERSONALITY_INFO[personality].label.toUpperCase()}</span>
              <i />
              <span>{researchMode ? "RESEARCH" : backend}</span>
              <i />
              <span title={modelUsed}>{modelUsed.toUpperCase().slice(0, 28)}</span>
              <i />
              <span>{estimatedTokens ? `~${estimatedTokens} TOKENS` : "TOKEN ESTIMATE —"}</span>
              <i />
              <span>NO DEV API KEY</span>
            </div>
          </div>
        </section>
      </main>

      {agentOpen && (
        <div className="modal-backdrop" onMouseDown={() => setAgentOpen(false)}>
          <section className="agent-modal" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>V5 APPROVAL-BASED WORKFLOW</span>
                <h3>Agent Workspace</h3>
              </div>
              <button onClick={() => setAgentOpen(false)}><X size={18} /></button>
            </header>

            <p>
              J.A.R.V.I.S. can plan a goal, but V5 does not silently execute browser or system actions. You approve and track every step.
            </p>

            <div className="agent-goal">
              <textarea
                value={agentGoal}
                onChange={(event) => setAgentGoal(event.target.value)}
                placeholder="Describe a goal, e.g. Plan and build the next version of my website…"
                rows={3}
                maxLength={1800}
              />
              <button onClick={createAgentPlan} disabled={!agentGoal.trim() || busy || agentPlanning}>
                <WandSparkles size={15} />
                {agentPlanning ? "Planning…" : "Build Plan"}
              </button>
            </div>

            {agentPlan && (
              <div className="agent-plan">
                <div className="agent-plan-head">
                  <div>
                    <span>ACTIVE GOAL</span>
                    <strong>{agentPlan.goal}</strong>
                  </div>
                  <button onClick={() => setAgentPlan(null)}>Reset</button>
                </div>

                <div className="agent-step-list">
                  {agentPlan.steps.map((step, index) => (
                    <article className={`agent-step ${step.status}`} key={step.id}>
                      <div className="agent-step-number">{index + 1}</div>
                      <div className="agent-step-copy">
                        <strong>{step.text}</strong>
                        <span>{step.status.toUpperCase()}</span>
                      </div>
                      <div className="agent-step-actions">
                        {step.status === "pending" && (
                          <button onClick={() => updateAgentStep(step.id, "active")}>Start</button>
                        )}
                        {step.status === "active" && (
                          <>
                            <button onClick={() => askAboutAgentStep(step)}>Ask JARVIS</button>
                            <button onClick={() => updateAgentStep(step.id, "done")}>Complete</button>
                          </>
                        )}
                        {(step.status === "pending" || step.status === "active") && (
                          <button onClick={() => updateAgentStep(step.id, "skipped")}>Skip</button>
                        )}
                        {(step.status === "done" || step.status === "skipped") && (
                          <button onClick={() => updateAgentStep(step.id, "pending")}>Reopen</button>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {permissionsOpen && (
        <div className="modal-backdrop" onMouseDown={() => setPermissionsOpen(false)}>
          <section className="permissions-modal" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>V5 CAPABILITY CONTROLS</span>
                <h3>Permissions</h3>
              </div>
              <button onClick={() => setPermissionsOpen(false)}><X size={18} /></button>
            </header>

            <p>
              These switches control what J.A.R.V.I.S. features may request or use. Browser permission prompts still apply separately.
            </p>

            <div className="permission-list">
              {([
                ["microphone", "Microphone", "Voice input and hands-free conversation"],
                ["files", "Local files", "User-selected text/code file chat"],
                ["clipboard", "Clipboard", "Copy assistant responses"],
                ["notifications", "Notifications", "Timer-finished browser notifications"]
              ] as const).map(([key, label, detail]) => (
                <label className="permission-row" key={key}>
                  <div>
                    <strong>{label}</strong>
                    <span>{detail}</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={permissions[key]}
                    onChange={(event) => void setPermission(key, event.target.checked)}
                  />
                </label>
              ))}
            </div>
          </section>
        </div>
      )}

      {privacyOpen && (
        <div className="modal-backdrop" onMouseDown={() => setPrivacyOpen(false)}>
          <section className="privacy-modal" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div>
                <span>LOCAL DATA CONTROLS</span>
                <h3>Privacy Center</h3>
              </div>
              <button onClick={() => setPrivacyOpen(false)}><X size={18} /></button>
            </header>

            <p>
              V5 keeps chat sessions, memories, settings, permissions, and agent-plan state in this browser. Attached files stay in the current page session and are only passed to the local model worker.
            </p>

            <div className="privacy-stats">
              <div><strong>{sessions.length}</strong><span>SESSIONS</span></div>
              <div><strong>{memories.length}</strong><span>MEMORIES</span></div>
              <div><strong>{files.length}</strong><span>FILES ATTACHED</span></div>
            </div>

            <div className="privacy-actions">
              <button onClick={exportData}><Download size={15} /> Export data</button>
              <button onClick={() => importInputRef.current?.click()}><Upload size={15} /> Import data</button>
              <button onClick={() => void clearCaches()}><RefreshCw size={15} /> Clear app caches</button>
              <button className="danger" onClick={clearLocalData}><Trash2 size={15} /> Clear local data</button>
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(event) => void importData(event)}
            />

            <small>
              Browser-managed HTTP/model storage can also be cleared from your browser’s site-data settings.
            </small>
          </section>
        </div>
      )}
    </div>
  );
}

export default App;
