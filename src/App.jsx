import { useState, useRef, useEffect } from "react";
import mammoth from "mammoth";

// ─── PROMPTS ────────────────────────────────────────────────────────────────

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

// ─── HELPERS ────────────────────────────────────────────────────────────────

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

const STEPS = ["input", "analyzing", "results", "chat", "tailoring", "tailored"];
const scoreColor = s => s >= 80 ? "#00e5a0" : s >= 60 ? "#f5a623" : "#ff4d4d";

// ─── SMALL COMPONENTS ───────────────────────────────────────────────────────

function Spinner({ color = "#ff6600" }) {
  return (
    <div style={{
      width: 70, height: 70, margin: "0 auto",
      border: `2px solid ${color}22`,
      borderTop: `2px solid ${color}`,
      borderRadius: "50%", animation: "spin 0.9s linear infinite"
    }} />
  );
}

function Tag({ children, color }) {
  return (
    <span style={{
      padding: "4px 10px", fontSize: 11,
      background: `${color}14`, border: `1px solid ${color}55`, color
    }}>{children}</span>
  );
}

function Panel({ children, style = {} }) {
  return (
    <div style={{ border: "1px solid #1a1a24", background: "#0d0d16", padding: 24, ...style }}>
      {children}
    </div>
  );
}

function SectionLabel({ color = "#ff6600", children }) {
  return <div style={{ fontSize: 10, letterSpacing: "0.2em", color, marginBottom: 14 }}>{children}</div>;
}

function Btn({ onClick, color = "#ff6600", textColor = "#000", children, outline = false, disabled = false, style = {} }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} disabled={disabled}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: outline ? "transparent" : h ? "#ff8533" : color,
        color: outline ? (h ? color : "#555") : textColor,
        border: outline ? `1px solid ${h ? color : "#2a2a3a"}` : "none",
        padding: "13px 28px", fontSize: 11, fontFamily: "inherit",
        fontWeight: 700, letterSpacing: "0.14em", cursor: disabled ? "not-allowed" : "pointer",
        textTransform: "uppercase", transition: "all 0.2s", opacity: disabled ? 0.4 : 1,
        clipPath: outline ? "none" : "polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)",
        ...style
      }}
    >{children}</button>
  );
}

function ScoreRing({ score }) {
  const color = scoreColor(score);
  const r = 46, circ = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 120, height: 120 }}>
      <svg width={120} height={120} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={60} cy={60} r={r} fill="none" stroke="#1a1a24" strokeWidth={8} />
        <circle cx={60} cy={60} r={r} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${(score / 100) * circ} ${circ}`} strokeLinecap="square" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{score}</div>
        <div style={{ fontSize: 10, color: "#444" }}>/ 100</div>
      </div>
    </div>
  );
}

function ChatBubble({ role, content }) {
  const isAI = role === "assistant";
  const display = content.replace("[READY_TO_TAILOR]", "").trim();
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 18, flexDirection: isAI ? "row" : "row-reverse", animation: "fadeIn 0.3s ease" }}>
      <div style={{
        width: 28, height: 28, flexShrink: 0, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: isAI ? "#ff6600" : "#111", fontSize: 9,
        color: isAI ? "#000" : "#555", fontWeight: 700,
        border: isAI ? "none" : "1px solid #2a2a3a"
      }}>
        {isAI ? "AI" : "YOU"}
      </div>
      <div style={{
        maxWidth: "74%", padding: "12px 16px", fontSize: 13, lineHeight: 1.75,
        background: isAI ? "#0f0f1c" : "#0c0c14",
        border: `1px solid ${isAI ? "#ff660025" : "#00e5a025"}`,
        borderLeft: `3px solid ${isAI ? "#ff6600" : "#00e5a0"}`,
        color: isAI ? "#ccc" : "#999", whiteSpace: "pre-wrap"
      }}>
        {display}
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

export default function App() {
  const [step, setStep] = useState("input");
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

  // Stage 1: Fit Analysis
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

  // Stage 2a: Start Chat
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

  // Stage 2b: Send message
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

  // Stage 3: Tailor
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
    setChatDone(false); setCopied(false);
  };

  const copy = () => { navigator.clipboard.writeText(tailoredResume); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const processDocxFile = async (file) => {
    if (!file || !file.name.endsWith(".docx")) {
      setError("Please upload a .docx file."); return;
    }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setResume(result.value.trim());
      setResumeFileName(file.name);
      setError("");
    } catch (e) {
      setError(`Failed to read Word file — ${e.message}`);
    }
  };

  const downloadAsWord = async () => {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle, UnderlineType } = await import("docx");

    const SECTION_HEADERS = ["PROFESSIONAL SUMMARY", "SUMMARY", "OBJECTIVE", "EXPERIENCE",
      "WORK EXPERIENCE", "SKILLS", "TECHNICAL SKILLS", "EDUCATION", "CERTIFICATIONS",
      "PROJECTS", "ACHIEVEMENTS", "AWARDS", "PUBLICATIONS", "VOLUNTEER", "LANGUAGES", "INTERESTS"];

    const isSectionHeader = (line) => {
      const t = line.trim();
      const up = t.toUpperCase();
      return SECTION_HEADERS.some(h => up === h || up === h + ":" || up.startsWith(h + " ")) ||
        (t === up && t.length > 2 && t.length < 50 && !/[@|•\-\d(]/.test(t));
    };

    const lines = tailoredResume.split("\n");
    const children = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (i === 0 && trimmed) {
        // Name — large, centred, bold
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 60 },
          children: [new TextRun({ text: trimmed, bold: true, size: 36, font: "Calibri" })]
        }));
        continue;
      }

      if (i === 1 && trimmed && (trimmed.includes("@") || trimmed.includes("|") || trimmed.toLowerCase().includes("linkedin"))) {
        // Contact line
        children.push(new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: trimmed, size: 20, color: "555555", font: "Calibri" })]
        }));
        continue;
      }

      if (!trimmed) {
        children.push(new Paragraph({ spacing: { after: 80 } }));
        continue;
      }

      if (isSectionHeader(trimmed)) {
        children.push(new Paragraph({
          spacing: { before: 240, after: 80 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CC4400", space: 4 } },
          children: [new TextRun({ text: trimmed.toUpperCase(), bold: true, size: 24, color: "CC4400", font: "Calibri" })]
        }));
        continue;
      }

      if (/^[•\-·]\s/.test(trimmed)) {
        children.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 60 },
          children: [new TextRun({ text: trimmed.replace(/^[•\-·]\s*/, ""), size: 21, font: "Calibri", color: "222222" })]
        }));
        continue;
      }

      // Job title lines often have | separators — render slightly bolder
      const isTitleLine = trimmed.includes("|") && !trimmed.includes("@");
      children.push(new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: trimmed, size: 21, bold: isTitleLine, font: "Calibri", color: "222222" })]
      }));
    }

    const doc = new Document({
      sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children }]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "tailored-resume.docx"; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "#070710", color: "#e0e0d8", fontFamily: "'Courier New', monospace" }}>

      {/* Grid BG */}
      <div style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(rgba(255,102,0,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,102,0,0.025) 1px,transparent 1px)`,
        backgroundSize: "44px 44px"
      }} />

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 100,
        borderBottom: "1px solid #ff660033", padding: "14px 28px",
        display: "flex", alignItems: "center", gap: 14,
        background: "rgba(7,7,16,0.96)", backdropFilter: "blur(6px)"
      }}>
        <div style={{ width: 8, height: 8, background: "#ff6600", clipPath: "polygon(50% 0%,100% 100%,0% 100%)" }} />
        <span style={{ color: "#ff6600", fontSize: 10, letterSpacing: "0.28em" }}>
          CAREERFIT.AI // RESUME INTELLIGENCE PIPELINE
        </span>

        {/* Progress */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 0 }}>
          {[
            { key: "input", label: "INPUT" },
            { key: "results", label: "ANALYSIS" },
            { key: "chat", label: "INTERVIEW" },
            { key: "tailored", label: "ATS RESUME" }
          ].map(({ key, label }, i) => {
            const done = stepIdx >= STEPS.indexOf(key);
            return (
              <div key={key} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <div style={{ width: 24, height: 1, background: done ? "#ff6600" : "#1a1a24" }} />}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ width: 7, height: 7, background: done ? "#ff6600" : "#1a1a24", transition: "all 0.4s", boxShadow: done ? "0 0 7px #ff6600" : "none" }} />
                  <span style={{ fontSize: 8, color: done ? "#ff6600" : "#2a2a3a", letterSpacing: "0.15em" }}>{label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </header>

      <main style={{ position: "relative", zIndex: 1, maxWidth: 980, margin: "0 auto", padding: "36px 20px 60px" }}>

        {/* ══ INPUT ══════════════════════════════════════════════════════ */}
        {step === "input" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ marginBottom: 36 }}>
              <h1 style={{ fontSize: "clamp(24px,5vw,44px)", fontWeight: 700, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.1, margin: "0 0 8px" }}>
                JOB FIT<br /><span style={{ color: "#ff6600" }}>ANALYSIS ENGINE</span>
              </h1>
              <p style={{ color: "#444", fontSize: 11, letterSpacing: "0.07em", margin: 0 }}>
                PASTE JD + RESUME → BRUTAL ANALYSIS → AI INTERVIEW → 90+ ATS RESUME
              </p>
            </div>

            {error && <div style={{ background: "#ff4d4d12", border: "1px solid #ff4d4d44", padding: "12px 16px", marginBottom: 18, fontSize: 12, color: "#ff4d4d" }}>⚠ {error}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
              {/* Job Description */}
              <div>
                <label style={{ display: "block", fontSize: 10, letterSpacing: "0.2em", color: "#ff6600", marginBottom: 7 }}>▸ JOB DESCRIPTION</label>
                <textarea value={jd} onChange={e => setJd(e.target.value)}
                  placeholder="Paste the full job description — requirements, responsibilities, qualifications..."
                  style={{
                    width: "100%", height: 300, padding: 14,
                    background: "#0c0c17", border: "1px solid #1a1a24", borderTop: "2px solid #ff6600",
                    color: "#ddd", fontFamily: "inherit", fontSize: 12,
                    resize: "vertical", outline: "none", lineHeight: 1.7, boxSizing: "border-box"
                  }} />
              </div>

              {/* Resume with .docx upload */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                  <label style={{ fontSize: 10, letterSpacing: "0.2em", color: "#ff6600" }}>▸ YOUR RESUME</label>
                  <label style={{
                    fontSize: 9, letterSpacing: "0.15em", color: "#ff6600", cursor: "pointer",
                    padding: "3px 10px", border: "1px solid #ff660044",
                    transition: "all 0.2s"
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#ff660015"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    ↑ UPLOAD .DOCX
                    <input type="file" accept=".docx" style={{ display: "none" }}
                      onChange={e => e.target.files[0] && processDocxFile(e.target.files[0])} />
                  </label>
                </div>
                <div
                  onDragOver={e => { e.preventDefault(); setResumeDragOver(true); }}
                  onDragLeave={() => setResumeDragOver(false)}
                  onDrop={e => { e.preventDefault(); setResumeDragOver(false); e.dataTransfer.files[0] && processDocxFile(e.dataTransfer.files[0]); }}
                  style={{ position: "relative" }}
                >
                  {resumeDragOver && (
                    <div style={{
                      position: "absolute", inset: 0, zIndex: 10,
                      background: "#ff660018", border: "2px dashed #ff6600",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, color: "#ff6600", letterSpacing: "0.15em", pointerEvents: "none"
                    }}>DROP .DOCX HERE</div>
                  )}
                  {resumeFileName && (
                    <div style={{ fontSize: 9, color: "#ff660099", letterSpacing: "0.1em", marginBottom: 4 }}>
                      ✓ {resumeFileName}
                    </div>
                  )}
                  <textarea value={resume} onChange={e => { setResume(e.target.value); setResumeFileName(""); }}
                    placeholder="Paste your resume text — or drop / upload a .docx file above"
                    style={{
                      width: "100%", height: resumeFileName ? 288 : 300, padding: 14,
                      background: resumeDragOver ? "#ff660008" : "#0c0c17",
                      border: "1px solid #1a1a24", borderTop: "2px solid #ff6600",
                      color: "#ddd", fontFamily: "inherit", fontSize: 12,
                      resize: "vertical", outline: "none", lineHeight: 1.7, boxSizing: "border-box",
                      transition: "background 0.2s"
                    }} />
                </div>
              </div>
            </div>
            <Btn onClick={runAnalysis} style={{ padding: "15px 44px", fontSize: 12 }}>▶ ANALYZE FIT</Btn>
          </div>
        )}

        {/* ══ ANALYZING ══════════════════════════════════════════════════ */}
        {step === "analyzing" && (
          <div style={{ textAlign: "center", padding: "120px 0" }}>
            <Spinner />
            <div style={{ color: "#ff6600", fontSize: 11, letterSpacing: "0.3em", marginTop: 28 }}>PROCESSING RESUME INTELLIGENCE...</div>
            <div style={{ color: "#2a2a3a", fontSize: 11, marginTop: 10 }}>Parsing JD → Mapping skills → Calculating fit matrix</div>
          </div>
        )}

        {/* ══ RESULTS ════════════════════════════════════════════════════ */}
        {step === "results" && analysis && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, letterSpacing: "0.28em", color: "#ff6600" }}>▸ JOB FIT ANALYSIS</span>
              <div style={{ flex: 1, height: 1, background: "#1a1a24" }} />
              <Btn onClick={reset} outline style={{ padding: "7px 18px", fontSize: 9 }}>↺ NEW ANALYSIS</Btn>
            </div>

            {/* Score + Verdict */}
            <Panel style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 24, alignItems: "center", marginBottom: 16 }}>
              <div style={{ textAlign: "center" }}>
                <ScoreRing score={analysis.score} />
                <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "#333", marginTop: 7 }}>FIT SCORE</div>
              </div>
              <div>
                <div style={{ display: "inline-block", padding: "4px 14px", marginBottom: 10, border: `1px solid ${scoreColor(analysis.score)}`, color: scoreColor(analysis.score), fontSize: 10, letterSpacing: "0.2em" }}>
                  {analysis.verdict?.toUpperCase()}
                </div>
                <p style={{ color: "#888", fontSize: 13, lineHeight: 1.75, margin: 0 }}>{analysis.realityCheck}</p>
              </div>
            </Panel>

            {/* Matched / Missing */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <Panel>
                <SectionLabel color="#00e5a0">✓ MATCHED SKILLS</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {analysis.matchedSkills?.map((s, i) => <Tag key={i} color="#00e5a0">{s}</Tag>)}
                </div>
              </Panel>
              <Panel>
                <SectionLabel color="#ff4d4d">✗ MISSING SKILLS</SectionLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {analysis.missingSkills?.map((s, i) => <Tag key={i} color="#ff4d4d">{s}</Tag>)}
                </div>
              </Panel>
            </div>

            {/* Strengths / Gaps */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <Panel>
                <SectionLabel>▸ STRENGTHS</SectionLabel>
                {analysis.strengths?.map((s, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, marginBottom: 9 }}>
                    <span style={{ color: "#ff6600", fontSize: 9, flexShrink: 0, marginTop: 3 }}>→</span>
                    <span style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{s}</span>
                  </div>
                ))}
              </Panel>
              <Panel>
                <SectionLabel color="#ff4d4d">⚠ CRITICAL GAPS</SectionLabel>
                {analysis.gaps?.map((g, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, marginBottom: 9 }}>
                    <span style={{ color: "#ff4d4d", fontSize: 9, flexShrink: 0, marginTop: 3 }}>✗</span>
                    <span style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>{g}</span>
                  </div>
                ))}
              </Panel>
            </div>

            {/* Action Plan */}
            <Panel style={{ marginBottom: 24 }}>
              <SectionLabel>▸ ACTION PLAN</SectionLabel>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>
                {analysis.actionPlan?.map((a, i) => (
                  <div key={i} style={{ background: "#070710", border: "1px solid #1a1a24", padding: 12, display: "flex", gap: 10 }}>
                    <span style={{ color: "#ff6600", fontSize: 9, fontWeight: 700, background: "#ff660015", padding: "2px 5px", flexShrink: 0 }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>{a}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* CTA to Chat */}
            <div style={{
              background: "#0d0d1c", border: "1px solid #ff660025",
              borderLeft: "3px solid #ff6600", padding: 22, marginBottom: 8
            }}>
              <div style={{ fontSize: 10, color: "#ff6600", letterSpacing: "0.18em", marginBottom: 8 }}>▸ NEXT: INTELLIGENCE INTERVIEW</div>
              <p style={{ fontSize: 12, color: "#666", margin: "0 0 16px", lineHeight: 1.65 }}>
                Before tailoring your resume, our AI will interview you one gap at a time — uncovering hidden experience,
                side projects, and skills that did not make it into your original resume.
                Everything you share feeds directly into the ATS optimizer.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Btn onClick={startChat} style={{ padding: "13px 32px" }}>▶ START INTERVIEW</Btn>
                <Btn onClick={reset} outline style={{ padding: "13px 20px" }}>↺ NEW ANALYSIS</Btn>
              </div>
            </div>
          </div>
        )}

        {/* ══ CHAT ═══════════════════════════════════════════════════════ */}
        {step === "chat" && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
              <button onClick={() => setStep("results")} style={{ background: "transparent", border: "none", color: "#444", fontSize: 10, cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.1em" }}>
                ← BACK TO ANALYSIS
              </button>
              <div style={{ flex: 1, height: 1, background: "#1a1a24" }} />
              <span style={{ fontSize: 10, color: "#ff6600", letterSpacing: "0.2em" }}>▸ INTELLIGENCE INTERVIEW</span>
            </div>

            {/* Gaps reference bar */}
            <Panel style={{ padding: 14, marginBottom: 16 }}>
              <SectionLabel color="#ff4d4d">GAPS BEING PROBED IN THIS SESSION</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {[...(analysis?.gaps || []), ...(analysis?.missingSkills || [])].map((g, i) => (
                  <Tag key={i} color="#ff4d4d">{g}</Tag>
                ))}
              </div>
            </Panel>

            {/* Chat window */}
            <div style={{
              background: "#09090f", border: "1px solid #1a1a24",
              borderTop: "2px solid #ff6600", height: 400,
              overflowY: "auto", padding: 20
            }}>
              {chatHistory.length === 0 && !chatLoading && (
                <div style={{ textAlign: "center", padding: "60px 0", color: "#2a2a3a", fontSize: 12 }}>Starting interview...</div>
              )}
              {chatHistory.map((m, i) => <ChatBubble key={i} role={m.role} content={m.content} />)}
              {chatLoading && (
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 28, height: 28, background: "#ff6600", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#000", fontWeight: 700 }}>AI</div>
                  <div style={{ padding: "12px 16px", border: "1px solid #ff660025", borderLeft: "3px solid #ff6600", display: "flex", gap: 5, alignItems: "center" }}>
                    {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, background: "#ff6600", animation: `pulse 1s ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar or Done CTA */}
            {!chatDone ? (
              <div style={{ display: "flex" }}>
                <input
                  ref={inputRef} value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type your response… (Enter to send)"
                  disabled={chatLoading}
                  style={{
                    flex: 1, padding: "15px 18px",
                    background: "#0c0c17", border: "1px solid #1a1a24", borderTop: "none",
                    color: "#ddd", fontFamily: "inherit", fontSize: 13,
                    outline: "none", opacity: chatLoading ? 0.4 : 1
                  }}
                />
                <button
                  onClick={sendMessage} disabled={chatLoading || !chatInput.trim()}
                  style={{
                    background: chatLoading || !chatInput.trim() ? "#111" : "#ff6600",
                    border: "none", padding: "0 24px", color: "#000",
                    fontFamily: "inherit", fontSize: 11, fontWeight: 700,
                    cursor: chatLoading || !chatInput.trim() ? "not-allowed" : "pointer",
                    letterSpacing: "0.1em", transition: "background 0.2s"
                  }}
                >
                  SEND →
                </button>
              </div>
            ) : (
              <div style={{
                background: "#00e5a00d", border: "1px solid #00e5a033",
                borderTop: "2px solid #00e5a0", padding: 20,
                display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14
              }}>
                <div>
                  <div style={{ fontSize: 10, color: "#00e5a0", letterSpacing: "0.2em", marginBottom: 5 }}>✓ INTERVIEW COMPLETE</div>
                  <div style={{ fontSize: 12, color: "#555" }}>All gaps explored. Ready to generate your ATS-optimized resume with all discovered context.</div>
                </div>
                <Btn onClick={tailorResume} color="#00e5a0" textColor="#000" style={{ padding: "13px 28px" }}>▶ GENERATE ATS RESUME</Btn>
              </div>
            )}
          </div>
        )}

        {/* ══ TAILORING ══════════════════════════════════════════════════ */}
        {step === "tailoring" && (
          <div style={{ textAlign: "center", padding: "120px 0" }}>
            <Spinner color="#00e5a0" />
            <div style={{ color: "#00e5a0", fontSize: 11, letterSpacing: "0.3em", marginTop: 28 }}>GENERATING ATS-OPTIMIZED RESUME...</div>
            <div style={{ color: "#2a2a3a", fontSize: 11, marginTop: 10 }}>Injecting keywords · Incorporating interview insights · Maximizing match score</div>
          </div>
        )}

        {/* ══ TAILORED ═══════════════════════════════════════════════════ */}
        {step === "tailored" && tailoredResume && (
          <div style={{ animation: "fadeIn 0.5s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20, flexWrap: "wrap" }}>
              <div style={{ padding: "7px 16px", background: "#00e5a010", border: "1px solid #00e5a044", color: "#00e5a0", fontSize: 10, letterSpacing: "0.18em" }}>
                ✓ ATS-OPTIMIZED RESUME READY
              </div>
              <span style={{ fontSize: 11, color: "#444" }}>Keywords injected · Interview insights woven in · Score maximized</span>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: 14, marginBottom: 18, flexWrap: "wrap" }}>
              {[
                { label: "ORIGINAL FIT SCORE", val: `${analysis.score}%`, color: scoreColor(analysis.score) },
                { label: "TARGET ATS SCORE", val: "90%+", color: "#00e5a0" },
                { label: "INTERVIEW ANSWERS", val: chatHistory.filter(m => m.role === "user").length, color: "#ff6600" }
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: "#0d0d16", border: "1px solid #1a1a24", padding: "12px 18px", flex: 1, minWidth: 120 }}>
                  <div style={{ fontSize: 9, letterSpacing: "0.18em", color: "#333", marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>

            <Panel style={{ borderTop: "2px solid #00e5a0", padding: 26, marginBottom: 18 }}>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 12, lineHeight: 1.9, color: "#ccc", margin: 0 }}>
                {tailoredResume}
              </pre>
            </Panel>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn onClick={copy} color="#00e5a0" textColor="#000" style={{ padding: "13px 28px" }}>
                {copied ? "✓ COPIED!" : "⧉ COPY RESUME"}
              </Btn>
              <Btn onClick={downloadAsWord} color="#4da6ff" textColor="#000" style={{ padding: "13px 28px" }}>
                ↓ DOWNLOAD AS WORD
              </Btn>
              <Btn onClick={() => setStep("chat")} outline color="#ff6600" style={{ padding: "13px 20px" }}>← BACK TO INTERVIEW</Btn>
              <Btn onClick={reset} outline style={{ padding: "13px 20px" }}>↺ START OVER</Btn>
            </div>
          </div>
        )}

      </main>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.2;transform:scale(.8)} 50%{opacity:1;transform:scale(1.2)} }
        textarea::placeholder, input::placeholder { color: #1e1e2c; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-track { background:#070710; }
        ::-webkit-scrollbar-thumb { background:#ff660044; }
        ::-webkit-scrollbar-thumb:hover { background:#ff6600; }
        * { box-sizing:border-box; }
      `}</style>
    </div>
  );
}
