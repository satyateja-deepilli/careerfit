import { useState, useRef, useEffect } from "react";
import mammoth from "mammoth";

// ─── PALETTE ─────────────────────────────────────────────────────────────────
const C = {
  void:     "#070b12",
  bg:       "#0b1018",
  panel:    "#0d1420",
  border:   "#1e2d40",
  cyan:     "#00d4ff",
  magenta:  "#e040fb",
  green:    "#00e676",
  amber:    "#ffab40",
  red:      "#ff5252",
  text:     "#a8c0d8",
  textH:    "#ddf0ff",
  textMid:  "#506878",
  textDim:  "#253040",
};

const scoreColor = s => s >= 80 ? C.green : s >= 60 ? C.amber : C.red;
const STEPS = ["intro", "input", "analyzing", "results", "chat", "tailoring", "tailored"];

// ─── PROMPTS ─────────────────────────────────────────────────────────────────
const fitSystemPrompt = `You are a Brutally Honest Job Fit Analyzer with expertise in recruitment and industry hiring standards. You give candid, evidence-based assessments without sugarcoating.

Analyze the job description vs resume and respond ONLY with a valid JSON object — no markdown, no preamble:
{
  "score": <number 0-100>,
  "verdict": "<Apply | Upskill First | Look Elsewhere>",
  "strengths": ["<strength>", ...],
  "gaps": ["<gap>", ...],
  "realityCheck": "<2-3 sentences of brutally honest assessment>",
  "actionPlan": ["<specific action>", ...],
  "matchedSkills": ["<skill>", ...],
  "missingSkills": ["<skill>", ...]
}

Rules:
- Brutally honest, evidence-based only
- No assumptions about unstated skills
- Do not encourage applying if fit < 60%
- All recommendations specific to this exact job and candidate`;

const buildChatSystemPrompt = (analysis, jd, resume) => `You are a sharp Resume Intelligence Interviewer. Your job is to probe the candidate about gaps flagged in their job fit analysis — uncovering hidden experience, side projects, coursework, transferable skills, or context that did not make it into their resume.

CONTEXT:
- Job Fit Score: ${analysis.score}%
- Verdict: ${analysis.verdict}
- Critical Gaps: ${analysis.gaps?.join(", ")}
- Missing Skills: ${analysis.missingSkills?.join(", ")}
- Candidate Strengths: ${analysis.strengths?.join(", ")}

ORIGINAL JOB DESCRIPTION (summary):
${jd.substring(0, 600)}

YOUR MISSION:
1. Ask ONE focused question at a time about a specific gap or missing skill
2. Listen carefully — probe deeper if the answer reveals hidden experience
3. Be conversational but direct. No fluff or pleasantries.
4. After covering the main gaps (typically 4-6 exchanges), write EXACTLY this token on its own line to signal completion: [READY_TO_TAILOR]
5. Before [READY_TO_TAILOR], write a brief "Discovered:" summary of any new info the candidate revealed

Start by briefly acknowledging the analysis result, then ask your FIRST targeted question about the most critical gap.`;

const buildAtsPrompt = (analysis, chatHistory) => `You are an expert ATS Resume Optimizer. Your goal: rewrite the candidate resume to score 90+ on ATS for this specific role.

DISCOVERED INFO FROM INTERVIEW — incorporate ALL of this:
${chatHistory.filter(m => m.role === "user").map((m, i) => `Q${i + 1}: ${m.content}`).join("\n")}

ANALYSIS CONTEXT:
- Original Fit Score: ${analysis.score}% — Target: 90%+ ATS
- Critical Gaps: ${analysis.gaps?.join(", ")}
- Matched Skills: ${analysis.matchedSkills?.join(", ")}

RULES:
- Mirror exact keywords and phrases from the job description
- Incorporate ALL newly discovered experience and skills from the interview above
- Quantify achievements wherever possible (mark estimates with ~)
- Use standard headers: Professional Summary, Experience, Skills, Education, Certifications
- Strong action verbs on every bullet point
- Write a tailored Professional Summary targeting this exact role
- Do NOT fabricate anything — only use what the candidate confirmed
- Remove irrelevant content, keep it tight

Respond ONLY with the rewritten resume as clean plain text. Start with the candidate name and contact info.`;

// ─── AI ──────────────────────────────────────────────────────────────────────
const callClaude = async (systemPrompt, messages, maxTokens = 1000) => {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system: systemPrompt, messages, maxTokens })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Server error ${res.status}`);
  }
  const data = await res.json();
  return data.text || "";
};

// ─── CANVAS PARTICLES ────────────────────────────────────────────────────────
function ParticleBG() {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    let raf;
    const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({ length: 65 }, () => ({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
    }));
    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > cv.width) p.vx *= -1;
        if (p.y < 0 || p.y > cv.height) p.vy *= -1;
      });
      pts.forEach((a, i) => {
        pts.slice(i + 1).forEach(b => {
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < 140) {
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = `rgba(0,180,255,${(1 - d / 140) * 0.1})`; ctx.stroke();
          }
        });
        ctx.beginPath(); ctx.arc(a.x, a.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,180,255,0.35)"; ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

// ─── UI COMPONENTS ───────────────────────────────────────────────────────────
function CyberPanel({ children, accent = C.cyan, style = {} }) {
  return (
    <div style={{
      background: C.panel, borderTop: `2px solid ${accent}`,
      border: `1px solid ${accent}28`, padding: 22, position: "relative", ...style
    }}>
      <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderBottom: `2px solid ${accent}55`, borderRight: `2px solid ${accent}55` }} />
      {children}
    </div>
  );
}

function NeonBtn({ children, onClick, color = C.cyan, textColor = "#000", outline = false, disabled = false, sm = false, style = {} }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: outline ? "transparent" : h ? color : color + "cc",
        color: outline ? (h ? color : C.textMid) : textColor,
        border: `1px solid ${outline ? (h ? color : C.border) : color}`,
        padding: sm ? "7px 16px" : "13px 28px",
        fontFamily: "Orbitron, monospace", fontSize: sm ? 9 : 11,
        fontWeight: 700, letterSpacing: "0.15em",
        cursor: disabled ? "not-allowed" : "pointer", textTransform: "uppercase",
        transition: "all 0.2s", opacity: disabled ? 0.35 : 1,
        boxShadow: !outline && h ? `0 0 20px ${color}55, 0 0 40px ${color}22` : "none",
        ...style
      }}>
      {children}
    </button>
  );
}

function CyberTag({ children, color = C.cyan }) {
  return (
    <span style={{
      padding: "3px 9px", fontSize: 11,
      fontFamily: "'Share Tech Mono', monospace",
      background: color + "18", border: `1px solid ${color}44`, color,
    }}>{children}</span>
  );
}

function Lbl({ children, color = C.cyan, style = {} }) {
  return (
    <div style={{
      fontFamily: "Orbitron, monospace", fontSize: 9,
      letterSpacing: "0.25em", color, marginBottom: 12,
      textTransform: "uppercase", ...style
    }}>{children}</div>
  );
}

function HexScore({ score }) {
  const color = scoreColor(score);
  const r = 50, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 140, height: 140, margin: "0 auto" }}>
      <svg width={140} height={140} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={70} cy={70} r={r} fill="none" stroke={C.border} strokeWidth={7} />
        <circle cx={70} cy={70} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="butt"
          style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "Orbitron, monospace", fontSize: 36, fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: color + "88", letterSpacing: "0.15em", marginTop: 2 }}>/ 100</div>
      </div>
    </div>
  );
}

function Spin({ color = C.cyan }) {
  return (
    <div style={{ width: 72, height: 72, margin: "0 auto", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, border: `1px solid ${color}22`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "cfSpin 0.9s linear infinite", boxShadow: `0 0 14px ${color}33 inset` }} />
      <div style={{ position: "absolute", inset: 12, border: `1px solid ${color}11`, borderBottom: `1px solid ${color}88`, borderRadius: "50%", animation: "cfSpin 0.65s linear infinite reverse" }} />
    </div>
  );
}

function ChatBubble({ role, content }) {
  const isAI = role === "assistant";
  const color = isAI ? C.cyan : C.green;
  const display = content.replace("[READY_TO_TAILOR]", "").trim();
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 18, flexDirection: isAI ? "row" : "row-reverse" }}>
      <div style={{ width: 30, height: 30, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: color + "18", border: `1px solid ${color}44`, fontFamily: "Orbitron, monospace", fontSize: 7, fontWeight: 700, color, letterSpacing: "0.1em" }}>
        {isAI ? "SYS" : "YOU"}
      </div>
      <div style={{ maxWidth: "75%", padding: "10px 15px", fontSize: 13, lineHeight: 1.75, background: isAI ? "#0a1520" : "#0a1812", border: `1px solid ${color}20`, borderLeft: isAI ? `3px solid ${C.cyan}` : "none", borderRight: isAI ? "none" : `3px solid ${C.green}`, color: C.text, whiteSpace: "pre-wrap", fontFamily: "Rajdhani, sans-serif" }}>
        {display}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  const [step, setStep] = useState("intro");
  const [jd, setJd] = useState("");
  const [resume, setResume] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatDone, setChatDone] = useState(false);
  const [tailoredResume, setTailoredResume] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeDragOver, setResumeDragOver] = useState(false);

  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const stepIdx = STEPS.indexOf(step);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, chatLoading]);

  const runAnalysis = async () => {
    if (!jd.trim() || !resume.trim()) { setError("Please provide both the job description and your resume."); return; }
    setError(""); setStep("analyzing");
    try {
      const raw = await callClaude(fitSystemPrompt, [
        { role: "user", content: `JOB DESCRIPTION:\n${jd}\n\n---\n\nCANDIDATE RESUME:\n${resume}` }
      ]);
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      setAnalysis(parsed); setStep("results");
    } catch (e) { setError(`Analysis failed — ${e.message}`); setStep("input"); }
  };

  const startChat = async () => {
    setStep("chat"); setChatLoading(true); setChatHistory([]); setChatDone(false);
    try {
      const sys = buildChatSystemPrompt(analysis, jd, resume);
      const reply = await callClaude(sys, [{ role: "user", content: "Begin." }]);
      setChatHistory([{ role: "assistant", content: reply }]);
      if (reply.includes("[READY_TO_TAILOR]")) setChatDone(true);
    } catch (e) { setError(`Chat failed — ${e.message}`); }
    finally { setChatLoading(false); }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: "user", content: chatInput.trim() };
    const hist = [...chatHistory, userMsg];
    setChatHistory(hist); setChatInput(""); setChatLoading(true);
    try {
      const sys = buildChatSystemPrompt(analysis, jd, resume);
      const reply = await callClaude(sys, hist);
      const next = [...hist, { role: "assistant", content: reply }];
      setChatHistory(next);
      if (reply.includes("[READY_TO_TAILOR]")) setChatDone(true);
    } catch (e) { setError(`Message failed — ${e.message}`); }
    finally { setChatLoading(false); inputRef.current?.focus(); }
  };

  const tailorResume = async () => {
    setStep("tailoring");
    try {
      const sys = buildAtsPrompt(analysis, chatHistory);
      const text = await callClaude(sys, [
        { role: "user", content: `JOB DESCRIPTION:\n${jd}\n\n---\n\nORIGINAL RESUME:\n${resume}\n\nGenerate the ATS-optimized resume now.` }
      ], 4000);
      setTailoredResume(text); setStep("tailored");
    } catch (e) { setError(`Tailoring failed — ${e.message}`); setStep("chat"); }
  };

  const reset = () => {
    setStep("input"); setAnalysis(null); setChatHistory([]);
    setTailoredResume(""); setError(""); setJd(""); setResume("");
    setChatDone(false); setCopied(false); setResumeFileName("");
  };

  const copy = () => { navigator.clipboard.writeText(tailoredResume); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const processDocxFile = async (file) => {
    if (!file || !file.name.endsWith(".docx")) { setError("Please upload a .docx file."); return; }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setResume(result.value.trim());
      setResumeFileName(file.name);
      setError("");
    } catch (e) { setError(`Failed to read Word file — ${e.message}`); }
  };

  const downloadAsWord = async () => {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import("docx");

    const SECTION_HEADERS = ["PROFESSIONAL SUMMARY", "SUMMARY", "OBJECTIVE", "EXPERIENCE",
      "WORK EXPERIENCE", "SKILLS", "TECHNICAL SKILLS", "EDUCATION", "CERTIFICATIONS",
      "PROJECTS", "ACHIEVEMENTS", "AWARDS", "PUBLICATIONS", "VOLUNTEER", "LANGUAGES", "INTERESTS"];

    const isSectionHeader = (line) => {
      const t = line.trim(); const up = t.toUpperCase();
      return SECTION_HEADERS.some(h => up === h || up === h + ":" || up.startsWith(h + " ")) ||
        (t === up && t.length > 2 && t.length < 50 && !/[@|•\-\d(]/.test(t));
    };

    const lines = tailoredResume.split("\n");
    const children = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (i === 0 && trimmed) {
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: trimmed, bold: true, size: 36, font: "Calibri" })] }));
        continue;
      }
      if (i === 1 && trimmed && (trimmed.includes("@") || trimmed.includes("|") || trimmed.toLowerCase().includes("linkedin"))) {
        children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: trimmed, size: 20, color: "555555", font: "Calibri" })] }));
        continue;
      }
      if (!trimmed) { children.push(new Paragraph({ spacing: { after: 80 } })); continue; }
      if (isSectionHeader(trimmed)) {
        children.push(new Paragraph({ spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "005588", space: 4 } }, children: [new TextRun({ text: trimmed.toUpperCase(), bold: true, size: 24, color: "005588", font: "Calibri" })] }));
        continue;
      }
      if (/^[•\-·]\s/.test(trimmed)) {
        children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: trimmed.replace(/^[•\-·]\s*/, ""), size: 21, font: "Calibri", color: "222222" })] }));
        continue;
      }
      const isTitleLine = trimmed.includes("|") && !trimmed.includes("@");
      children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: trimmed, size: 21, bold: isTitleLine, font: "Calibri", color: "222222" })] }));
    }

    const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tailored-resume.docx"; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  const progressSteps = [
    { key: "input", label: "INPUT" },
    { key: "results", label: "ANALYSIS" },
    { key: "chat", label: "INTERVIEW" },
    { key: "tailored", label: "ATS RESUME" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.void, color: C.text, fontFamily: "Rajdhani, sans-serif" }}>
      <ParticleBG />

      {/* Scanlines */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.07) 2px, rgba(0,0,0,0.07) 4px)" }} />

      {/* Header */}
      {step !== "intro" && (
        <header style={{ position: "sticky", top: 0, zIndex: 100, borderBottom: `1px solid ${C.cyan}22`, padding: "13px 28px", display: "flex", alignItems: "center", gap: 16, background: "rgba(7,11,18,0.96)", backdropFilter: "blur(8px)" }}>
          <button onClick={() => setStep("intro")} style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
            <div style={{ width: 6, height: 6, background: C.cyan, boxShadow: `0 0 8px ${C.cyan}`, animation: "cfBlink 2s infinite" }} />
            <span style={{ fontFamily: "Orbitron, monospace", color: C.cyan, fontSize: 11, fontWeight: 700, letterSpacing: "0.2em" }}>CAREERFIT.AI</span>
          </button>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 0 }}>
            {progressSteps.map(({ key, label }, i) => {
              const done = stepIdx >= STEPS.indexOf(key);
              return (
                <div key={key} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && <div style={{ width: 28, height: 1, background: done ? C.cyan + "66" : C.border }} />}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                    <div style={{ width: 6, height: 6, background: done ? C.cyan : C.border, boxShadow: done ? `0 0 6px ${C.cyan}` : "none", transition: "all 0.4s" }} />
                    <span style={{ fontFamily: "Orbitron, monospace", fontSize: 7, color: done ? C.cyan : C.textDim, letterSpacing: "0.1em" }}>{label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </header>
      )}

      <main style={{ position: "relative", zIndex: 2, maxWidth: step === "intro" ? "100%" : 1000, margin: "0 auto", padding: step === "intro" ? 0 : "40px 24px 80px" }}>

        {/* ══ INTRO ════════════════════════════════════════════════════════════ */}
        {step === "intro" && (
          <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
              <div style={{ width: 2, height: 36, background: `linear-gradient(to bottom, transparent, ${C.cyan}, transparent)` }} />
              <span style={{ fontFamily: "Orbitron, monospace", fontSize: 10, color: C.textMid, letterSpacing: "0.4em" }}>NEURAL CAREER INTELLIGENCE</span>
              <div style={{ width: 2, height: 36, background: `linear-gradient(to bottom, transparent, ${C.cyan}, transparent)` }} />
            </div>

            <h1 className="glitch-title" data-text="CAREERFIT.AI" style={{ fontFamily: "Orbitron, monospace", fontSize: "clamp(44px,8vw,88px)", fontWeight: 900, margin: "0 0 8px", color: C.textH, letterSpacing: "-0.01em", lineHeight: 1 }}>
              CAREERFIT<span style={{ color: C.cyan }}>.</span>AI
            </h1>

            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "clamp(11px,1.8vw,15px)", color: C.cyan, letterSpacing: "0.28em", marginBottom: 52 }}>
              RESUME INTELLIGENCE PIPELINE v2.0
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 52, maxWidth: 620, width: "100%" }}>
              {[
                { icon: "◈", label: "FIT ANALYSIS", sub: "Score + gaps + strengths" },
                { icon: "◉", label: "AI INTERVIEW", sub: "Uncover hidden experience" },
                { icon: "◎", label: "ATS OPTIMIZER", sub: "90+ score resume" },
              ].map(({ icon, label, sub }) => (
                <div key={label} style={{ padding: "20px 14px", border: `1px solid ${C.border}`, background: C.panel + "99", textAlign: "center" }}>
                  <div style={{ fontFamily: "Orbitron, monospace", fontSize: 22, color: C.cyan, marginBottom: 8 }}>{icon}</div>
                  <div style={{ fontFamily: "Orbitron, monospace", fontSize: 9, color: C.textH, letterSpacing: "0.15em", marginBottom: 5 }}>{label}</div>
                  <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 12, color: C.textMid }}>{sub}</div>
                </div>
              ))}
            </div>

            <NeonBtn onClick={() => setStep("input")} style={{ padding: "16px 56px", fontSize: 13 }}>
              ▶ INITIALIZE SYSTEM
            </NeonBtn>

            <div style={{ marginTop: 28, fontFamily: "'Share Tech Mono', monospace", fontSize: 10, color: C.textDim, letterSpacing: "0.18em" }}>
              GROQ LLAMA-3.3-70B · MAMMOTH DOCX · ATS INTELLIGENCE
            </div>
          </div>
        )}

        {/* ══ INPUT ════════════════════════════════════════════════════════════ */}
        {step === "input" && (
          <div style={{ animation: "cfFadeUp 0.4s ease" }}>
            <div style={{ marginBottom: 32 }}>
              <h1 style={{ fontFamily: "Orbitron, monospace", fontSize: "clamp(22px,4vw,38px)", fontWeight: 900, color: C.textH, margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                JOB FIT <span style={{ color: C.cyan }}>ANALYSIS</span>
              </h1>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.textMid, letterSpacing: "0.1em", margin: 0 }}>
                PASTE JD + RESUME → BRUTAL ANALYSIS → AI INTERVIEW → 90+ ATS RESUME
              </p>
            </div>

            {error && (
              <div style={{ background: C.red + "12", border: `1px solid ${C.red}44`, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: C.red, fontFamily: "Rajdhani, sans-serif" }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>
              <CyberPanel>
                <Lbl>▸ Job Description</Lbl>
                <textarea value={jd} onChange={e => setJd(e.target.value)}
                  placeholder="Paste the full job description — requirements, responsibilities, qualifications..."
                  style={{ width: "100%", height: 300, padding: 12, background: C.void, border: `1px solid ${C.border}`, color: C.text, fontFamily: "Rajdhani, sans-serif", fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box" }} />
              </CyberPanel>

              <CyberPanel>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Lbl style={{ marginBottom: 0 }}>▸ Your Resume</Lbl>
                  <label style={{ fontFamily: "Orbitron, monospace", fontSize: 8, color: C.cyan, cursor: "pointer", padding: "4px 10px", border: `1px solid ${C.cyan}44`, letterSpacing: "0.1em", transition: "all 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.cyan + "15"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    ↑ UPLOAD .DOCX
                    <input type="file" accept=".docx" style={{ display: "none" }}
                      onChange={e => e.target.files[0] && processDocxFile(e.target.files[0])} />
                  </label>
                </div>
                {resumeFileName && (
                  <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: C.cyan + "88", letterSpacing: "0.1em", marginBottom: 6 }}>✓ {resumeFileName}</div>
                )}
                <div
                  onDragOver={e => { e.preventDefault(); setResumeDragOver(true); }}
                  onDragLeave={() => setResumeDragOver(false)}
                  onDrop={e => { e.preventDefault(); setResumeDragOver(false); e.dataTransfer.files[0] && processDocxFile(e.dataTransfer.files[0]); }}
                  style={{ position: "relative" }}
                >
                  {resumeDragOver && (
                    <div style={{ position: "absolute", inset: 0, zIndex: 10, background: C.cyan + "10", border: `2px dashed ${C.cyan}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Orbitron, monospace", fontSize: 11, color: C.cyan, letterSpacing: "0.15em", pointerEvents: "none" }}>
                      DROP .DOCX HERE
                    </div>
                  )}
                  <textarea value={resume} onChange={e => { setResume(e.target.value); setResumeFileName(""); }}
                    placeholder="Paste resume text — or drop / upload a .docx file above"
                    style={{ width: "100%", height: resumeFileName ? 286 : 300, padding: 12, background: resumeDragOver ? C.cyan + "08" : C.void, border: `1px solid ${C.border}`, color: C.text, fontFamily: "Rajdhani, sans-serif", fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.6, boxSizing: "border-box", transition: "background 0.2s" }} />
                </div>
              </CyberPanel>
            </div>
            <NeonBtn onClick={runAnalysis}>▶ ANALYZE FIT</NeonBtn>
          </div>
        )}

        {/* ══ ANALYZING ════════════════════════════════════════════════════════ */}
        {step === "analyzing" && (
          <div style={{ textAlign: "center", padding: "120px 0" }}>
            <Spin />
            <div style={{ fontFamily: "Orbitron, monospace", color: C.cyan, fontSize: 11, letterSpacing: "0.3em", marginTop: 30 }}>PROCESSING RESUME INTELLIGENCE</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", color: C.textDim, fontSize: 11, marginTop: 10, animation: "cfBlink 1.4s infinite" }}>
              PARSING JD → MAPPING SKILLS → CALCULATING FIT MATRIX_
            </div>
          </div>
        )}

        {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
        {step === "results" && analysis && (
          <div style={{ animation: "cfFadeUp 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "Orbitron, monospace", fontSize: 9, letterSpacing: "0.25em", color: C.cyan }}>▸ JOB FIT ANALYSIS</span>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${C.cyan}44, transparent)` }} />
              <NeonBtn onClick={reset} outline sm>↺ NEW ANALYSIS</NeonBtn>
            </div>

            <CyberPanel style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 28, alignItems: "center", marginBottom: 16 }}>
              <div style={{ textAlign: "center" }}>
                <HexScore score={analysis.score} />
                <div style={{ fontFamily: "Orbitron, monospace", fontSize: 8, color: C.textMid, marginTop: 8, letterSpacing: "0.2em" }}>FIT SCORE</div>
              </div>
              <div>
                <div style={{ display: "inline-block", padding: "5px 14px", marginBottom: 12, border: `1px solid ${scoreColor(analysis.score)}`, color: scoreColor(analysis.score), fontFamily: "Orbitron, monospace", fontSize: 10, letterSpacing: "0.2em" }}>
                  {analysis.verdict?.toUpperCase()}
                </div>
                <p style={{ color: C.text, fontSize: 14, lineHeight: 1.75, margin: 0, fontFamily: "Rajdhani, sans-serif" }}>{analysis.realityCheck}</p>
              </div>
            </CyberPanel>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <CyberPanel accent={C.green}>
                <Lbl color={C.green}>✓ Matched Skills</Lbl>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {analysis.matchedSkills?.map((s, i) => <CyberTag key={i} color={C.green}>{s}</CyberTag>)}
                </div>
              </CyberPanel>
              <CyberPanel accent={C.red}>
                <Lbl color={C.red}>✗ Missing Skills</Lbl>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {analysis.missingSkills?.map((s, i) => <CyberTag key={i} color={C.red}>{s}</CyberTag>)}
                </div>
              </CyberPanel>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <CyberPanel>
                <Lbl>▸ Strengths</Lbl>
                {analysis.strengths?.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, marginBottom: 9 }}>
                    <span style={{ color: C.cyan, fontSize: 10, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontFamily: "Rajdhani, sans-serif" }}>{s}</span>
                  </div>
                ))}
              </CyberPanel>
              <CyberPanel accent={C.amber}>
                <Lbl color={C.amber}>⚠ Critical Gaps</Lbl>
                {analysis.gaps?.map((g, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, marginBottom: 9 }}>
                    <span style={{ color: C.red, fontSize: 10, flexShrink: 0 }}>✗</span>
                    <span style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontFamily: "Rajdhani, sans-serif" }}>{g}</span>
                  </div>
                ))}
              </CyberPanel>
            </div>

            <CyberPanel style={{ marginBottom: 16 }}>
              <Lbl>▸ Action Plan</Lbl>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 10 }}>
                {analysis.actionPlan?.map((a, i) => (
                  <div key={i} style={{ background: C.void, border: `1px solid ${C.border}`, padding: "12px 14px", display: "flex", gap: 10 }}>
                    <span style={{ fontFamily: "Orbitron, monospace", color: C.cyan, fontSize: 9, fontWeight: 700, background: C.cyan + "18", padding: "2px 5px", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>
                    <span style={{ fontSize: 13, color: C.textMid, lineHeight: 1.5, fontFamily: "Rajdhani, sans-serif" }}>{a}</span>
                  </div>
                ))}
              </div>
            </CyberPanel>

            <CyberPanel style={{ borderLeft: `3px solid ${C.cyan}` }}>
              <Lbl>▸ Next: Intelligence Interview</Lbl>
              <p style={{ fontSize: 13, color: C.textMid, margin: "0 0 18px", lineHeight: 1.65, fontFamily: "Rajdhani, sans-serif" }}>
                Before tailoring your resume, our AI will interview you one gap at a time — uncovering hidden experience, side projects, and skills that did not make it into your original resume.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <NeonBtn onClick={startChat}>▶ START INTERVIEW</NeonBtn>
                <NeonBtn onClick={reset} outline>↺ NEW ANALYSIS</NeonBtn>
              </div>
            </CyberPanel>
          </div>
        )}

        {/* ══ CHAT ═════════════════════════════════════════════════════════════ */}
        {step === "chat" && (
          <div style={{ animation: "cfFadeUp 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
              <button onClick={() => setStep("results")} style={{ background: "transparent", border: "none", fontFamily: "Orbitron, monospace", color: C.textMid, fontSize: 9, cursor: "pointer", letterSpacing: "0.1em" }}>← BACK</button>
              <div style={{ flex: 1, height: 1, background: C.border }} />
              <span style={{ fontFamily: "Orbitron, monospace", fontSize: 9, color: C.cyan, letterSpacing: "0.2em" }}>▸ INTELLIGENCE INTERVIEW</span>
            </div>

            <CyberPanel style={{ padding: 14, marginBottom: 14 }}>
              <Lbl color={C.red}>Gaps being probed</Lbl>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {[...(analysis?.gaps || []), ...(analysis?.missingSkills || [])].map((g, i) => (
                  <CyberTag key={i} color={C.red}>{g}</CyberTag>
                ))}
              </div>
            </CyberPanel>

            <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderTop: `2px solid ${C.cyan}`, height: 400, overflowY: "auto", padding: 20 }}>
              {chatHistory.length === 0 && !chatLoading && (
                <div style={{ textAlign: "center", padding: "60px 0", fontFamily: "'Share Tech Mono', monospace", color: C.textDim, fontSize: 12 }}>
                  INITIALIZING INTERVIEW SEQUENCE_
                </div>
              )}
              {chatHistory.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
              {chatLoading && (
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 30, height: 30, background: C.cyan + "18", border: `1px solid ${C.cyan}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Orbitron, monospace", fontSize: 7, color: C.cyan }}>SYS</div>
                  <div style={{ padding: "10px 16px", border: `1px solid ${C.cyan}20`, borderLeft: `3px solid ${C.cyan}`, display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(j => <div key={j} style={{ width: 5, height: 5, background: C.cyan, animation: `cfPulse 1s ${j * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {!chatDone ? (
              <div style={{ display: "flex" }}>
                <input ref={inputRef} value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type your response... (Enter to send)"
                  disabled={chatLoading}
                  style={{ flex: 1, padding: "14px 16px", background: C.bg, border: `1px solid ${C.border}`, borderTop: "none", color: C.text, fontFamily: "Rajdhani, sans-serif", fontSize: 14, outline: "none", opacity: chatLoading ? 0.4 : 1 }}
                />
                <button onClick={sendMessage} disabled={chatLoading || !chatInput.trim()}
                  style={{ background: chatLoading || !chatInput.trim() ? C.border : C.cyan, border: "none", padding: "0 24px", color: "#000", fontFamily: "Orbitron, monospace", fontSize: 10, fontWeight: 700, cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer", letterSpacing: "0.1em", transition: "background 0.2s" }}>
                  SEND →
                </button>
              </div>
            ) : (
              <div style={{ background: C.green + "0d", border: `1px solid ${C.green}33`, borderTop: `2px solid ${C.green}`, padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontFamily: "Orbitron, monospace", fontSize: 9, color: C.green, letterSpacing: "0.2em", marginBottom: 5 }}>✓ INTERVIEW COMPLETE</div>
                  <div style={{ fontFamily: "Rajdhani, sans-serif", fontSize: 13, color: C.textMid }}>All gaps explored. Ready to generate your ATS-optimized resume with all discovered context.</div>
                </div>
                <NeonBtn onClick={tailorResume} color={C.green} textColor="#000">▶ GENERATE ATS RESUME</NeonBtn>
              </div>
            )}
          </div>
        )}

        {/* ══ TAILORING ════════════════════════════════════════════════════════ */}
        {step === "tailoring" && (
          <div style={{ textAlign: "center", padding: "120px 0" }}>
            <Spin color={C.green} />
            <div style={{ fontFamily: "Orbitron, monospace", color: C.green, fontSize: 11, letterSpacing: "0.3em", marginTop: 30 }}>GENERATING ATS-OPTIMIZED RESUME</div>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", color: C.textDim, fontSize: 11, marginTop: 10, animation: "cfBlink 1.4s infinite" }}>
              INJECTING KEYWORDS · WEAVING INSIGHTS · MAXIMIZING MATCH SCORE_
            </div>
          </div>
        )}

        {/* ══ TAILORED ═════════════════════════════════════════════════════════ */}
        {step === "tailored" && tailoredResume && (
          <div style={{ animation: "cfFadeUp 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
              <div style={{ padding: "6px 14px", background: C.green + "12", border: `1px solid ${C.green}44`, fontFamily: "Orbitron, monospace", color: C.green, fontSize: 9, letterSpacing: "0.15em" }}>
                ✓ ATS-OPTIMIZED RESUME READY
              </div>
              <span style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 11, color: C.textMid }}>Keywords injected · Interview insights woven in · Score maximized</span>
            </div>

            <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
              {[
                { label: "ORIGINAL FIT SCORE", val: `${analysis.score}%`, color: scoreColor(analysis.score) },
                { label: "TARGET ATS SCORE", val: "90%+", color: C.green },
                { label: "INTERVIEW ANSWERS", val: chatHistory.filter(m => m.role === "user").length, color: C.cyan },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: C.panel, border: `1px solid ${C.border}`, padding: "12px 18px", flex: 1, minWidth: 120 }}>
                  <div style={{ fontFamily: "Orbitron, monospace", fontSize: 8, letterSpacing: "0.18em", color: C.textMid, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: "Orbitron, monospace", fontSize: 22, fontWeight: 900, color }}>{val}</div>
                </div>
              ))}
            </div>

            <CyberPanel accent={C.green} style={{ padding: 28, marginBottom: 18 }}>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "Rajdhani, sans-serif", fontSize: 13, lineHeight: 1.9, color: C.text, margin: 0 }}>
                {tailoredResume}
              </pre>
            </CyberPanel>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <NeonBtn onClick={copy} color={C.green} textColor="#000">{copied ? "✓ COPIED!" : "⧉ COPY RESUME"}</NeonBtn>
              <NeonBtn onClick={downloadAsWord} color={C.cyan} textColor="#000">↓ DOWNLOAD AS WORD</NeonBtn>
              <NeonBtn onClick={() => setStep("chat")} outline>← BACK TO INTERVIEW</NeonBtn>
              <NeonBtn onClick={reset} outline>↺ START OVER</NeonBtn>
            </div>
          </div>
        )}

      </main>

      <style>{`
        @keyframes cfSpin   { to { transform: rotate(360deg); } }
        @keyframes cfBlink  { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes cfFadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        @keyframes cfPulse  { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        @keyframes glitch1  {
          0%,91%,100%{transform:none;opacity:0}
          92%{transform:translateX(-4px);opacity:0.65}
          94%{transform:translateX(4px);opacity:0.65}
          96%{transform:none;opacity:0}
        }
        @keyframes glitch2  {
          0%,93%,100%{transform:none;opacity:0}
          94%{transform:translateX(3px);opacity:0.55}
          96%{transform:translateX(-3px);opacity:0.55}
          98%{transform:none;opacity:0}
        }
        .glitch-title { position:relative; display:inline-block; }
        .glitch-title::before, .glitch-title::after {
          content:attr(data-text); position:absolute; top:0; left:0; width:100%; height:100%;
        }
        .glitch-title::before { color:#e040fb; animation:glitch1 4s infinite; clip-path:inset(20% 0 58% 0); }
        .glitch-title::after  { color:#00d4ff; animation:glitch2 4s infinite; clip-path:inset(58% 0 18% 0); }
        textarea, input { caret-color:${C.cyan}; }
        textarea::placeholder, input::placeholder { color:${C.textDim}; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:${C.void}; }
        ::-webkit-scrollbar-thumb { background:${C.cyan}44; }
        ::-webkit-scrollbar-thumb:hover { background:${C.cyan}; }
      `}</style>
    </div>
  );
}
