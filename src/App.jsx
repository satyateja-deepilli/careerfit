import { useState, useRef, useEffect, useCallback } from "react";
import mammoth from "mammoth";

function colWithAlpha(col, a) {
  if (col === 'var(--cyan)') return `rgba(0,245,255,${a})`;
  if (col === 'var(--magenta)') return `rgba(255,0,255,${a})`;
  if (col === 'var(--green)') return `rgba(57,255,20,${a})`;
  return col;
}

function GlitchText({ children, size = 48, color = 'var(--cyan)', className = '', style = {} }) {
  const [g, setG] = useState(false);
  useEffect(() => {
    const id = setInterval(() => { setG(true); setTimeout(() => setG(false), 200); }, Math.random() * 4000 + 3000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={`orb ${className}`} style={{ position: 'relative', display: 'inline-block', fontSize: size, color, letterSpacing: '-1px', fontWeight: 900, ...style }}>
      {children}
      {g && <>
        <span style={{ position: 'absolute', inset: 0, color: 'var(--magenta)', animation: 'glitch1 0.2s linear infinite', pointerEvents: 'none' }}>{children}</span>
        <span style={{ position: 'absolute', inset: 0, color: 'var(--cyan)', animation: 'glitch2 0.2s linear infinite', pointerEvents: 'none' }}>{children}</span>
      </>}
    </span>
  );
}

function NeonBtn({ children, onClick, color = 'cyan', disabled = false, size = 'md', style = {} }) {
  const [hov, setHov] = useState(false);
  const cols = { cyan: { c: 'var(--cyan)', g: 'rgba(0,245,255,0.3)' }, magenta: { c: 'var(--magenta)', g: 'rgba(255,0,255,0.3)' }, green: { c: 'var(--green)', g: 'rgba(57,255,20,0.3)' } };
  const col = cols[color] || cols.cyan;
  return (
    <button onClick={disabled ? undefined : onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: size === 'lg' ? '0 48px' : '0 24px', height: size === 'lg' ? 56 : 42, background: hov && !disabled ? col.g : 'transparent', border: `1px solid ${disabled ? 'rgba(255,255,255,0.1)' : col.c}`, color: disabled ? 'rgba(255,255,255,0.2)' : col.c, fontFamily: 'Share Tech Mono,monospace', fontSize: size === 'lg' ? 14 : 11, letterSpacing: '0.15em', cursor: disabled ? 'not-allowed' : 'pointer', clipPath: 'polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)', boxShadow: hov && !disabled ? `0 0 20px ${col.g},inset 0 0 20px ${col.g}` : 'none', textShadow: !disabled ? `0 0 10px ${col.c}` : 'none', transition: 'all 0.2s', position: 'relative', overflow: 'hidden', ...style }}>
      {hov && !disabled && <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(90deg,transparent,${col.g},transparent)`, animation: 'holoPan 1.5s linear infinite', backgroundSize: '200% 100%', pointerEvents: 'none' }} />}
      {children}
    </button>
  );
}

function CyberPanel({ children, style = {}, color = 'cyan', hover = true, onClick }) {
  const [hov, setHov] = useState(false);
  const col = color === 'magenta' ? 'var(--magenta)' : color === 'green' ? 'var(--green)' : 'var(--cyan)';
  const glow = color === 'magenta' ? 'rgba(255,0,255,0.15)' : color === 'green' ? 'rgba(57,255,20,0.12)' : 'rgba(0,245,255,0.12)';
  return (
    <div onMouseEnter={() => hover && setHov(true)} onMouseLeave={() => hover && setHov(false)} onClick={onClick}
      style={{ background: hov ? 'rgba(0,20,40,0.9)' : 'var(--panel)', border: `1px solid ${hov ? col : colWithAlpha(col, 0.3)}`, boxShadow: hov ? `0 0 30px ${glow},inset 0 0 30px ${glow}` : 'inset 0 0 10px rgba(0,0,0,0.5)', clipPath: 'polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)', transition: 'all 0.25s', position: 'relative', overflow: 'hidden', cursor: onClick ? 'pointer' : 'default', ...style }}>
      {hov && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg,transparent,${col},transparent)`, animation: 'holoPan 2s linear infinite', backgroundSize: '200% 100%' }} />}
      {children}
    </div>
  );
}

function HexScore({ score, size = 160 }) {
  const [display, setDisplay] = useState(0);
  const color = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--cyan)' : 'var(--red)';
  const label = score >= 75 ? 'STRONG FIT' : score >= 50 ? 'PARTIAL FIT' : 'WEAK FIT';
  useEffect(() => {
    let start = null;
    const raf = ts => { if (!start) start = ts; const p = Math.min((ts - start) / 1600, 1); const e = 1 - Math.pow(1 - p, 3); setDisplay(Math.round(e * score)); if (p < 1) requestAnimationFrame(raf); };
    const id = setTimeout(() => requestAnimationFrame(raf), 400);
    return () => clearTimeout(id);
  }, [score]);
  const s = size, cx = s / 2, cy = s / 2, r = s * 0.42, r2 = r * 0.85;
  const circ = 2 * Math.PI * r, offset = circ - display / 100 * circ;
  return (
    <div style={{ position: 'relative', width: s, height: s, flexShrink: 0 }}>
      <div style={{ position: 'absolute', inset: -8, border: `1px solid ${colWithAlpha(color, 0.2)}`, borderRadius: '50%', animation: 'orbitRing 8s linear infinite' }} />
      <div style={{ position: 'absolute', inset: -16, border: `1px dashed ${colWithAlpha(color, 0.1)}`, borderRadius: '50%', animation: 'orbitRing 12s linear infinite reverse' }} />
      <svg width={s} height={s} style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 6 }).map((_, i) => { const a = i / 6 * Math.PI * 2; return <line key={i} x1={cx} y1={cy} x2={cx + r2 * Math.cos(a)} y2={cy + r2 * Math.sin(a)} stroke={colWithAlpha(color, 0.08)} strokeWidth="1" />; })}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={colWithAlpha(color, 0.08)} strokeWidth={8} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="butt" strokeDasharray={`${circ}`} strokeDashoffset={offset} transform={`rotate(-90 ${cx} ${cy})`} style={{ filter: `drop-shadow(0 0 8px ${color})`, transition: 'stroke-dashoffset 0.05s linear' }} />
        <polygon points={Array.from({ length: 6 }).map((_, i) => { const a = i / 6 * Math.PI * 2 - Math.PI / 6; return `${cx + r2 * 0.88 * Math.cos(a)},${cy + r2 * 0.88 * Math.sin(a)}`; }).join(' ')} fill="none" stroke={colWithAlpha(color, 0.3)} strokeWidth="1" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <div className="orb" style={{ fontSize: s * 0.25, fontWeight: 900, color, lineHeight: 1, textShadow: `0 0 20px ${color}`, animation: 'countUp 0.4s ease-out' }}>{display}</div>
        <div className="mono" style={{ fontSize: 9, color: colWithAlpha(color, 0.7), letterSpacing: '0.2em' }}>/100</div>
        <div className="mono" style={{ fontSize: 8, color, letterSpacing: '0.15em', marginTop: 2, textShadow: `0 0 8px ${color}` }}>{label}</div>
      </div>
    </div>
  );
}

function CyberBar({ label, score, delay = 0 }) {
  const [w, setW] = useState(0);
  const [hov, setHov] = useState(false);
  const color = score >= 75 ? 'var(--green)' : score >= 50 ? 'var(--cyan)' : 'var(--red)';
  useEffect(() => { const t = setTimeout(() => setW(score), delay + 300); return () => clearTimeout(t); }, [score, delay]);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 8px', background: hov ? 'rgba(0,245,255,0.04)' : 'transparent', transition: 'background 0.2s', cursor: 'default', animation: `slideInLeft 0.4s ${delay}ms both` }}>
      <div className="mono" style={{ width: 150, fontSize: 11, color: hov ? 'var(--text)' : 'var(--text-mid)', letterSpacing: '0.05em', flexShrink: 0, textAlign: 'right', transition: 'color 0.2s' }}>{label}</div>
      <div style={{ flex: 1, height: 3, background: 'rgba(0,245,255,0.08)', clipPath: 'polygon(0 0,100% 0,100% 100%,4px 100%)' }}>
        <div style={{ height: '100%', width: `${w}%`, background: `linear-gradient(90deg,${color},${colWithAlpha(color, 0.7)})`, transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: `0 0 12px ${color}` }} />
      </div>
      <div className="mono" style={{ width: 30, fontSize: 11, color, textAlign: 'right', textShadow: `0 0 8px ${color}` }}>{hov ? score : w}</div>
    </div>
  );
}

function CyberTag({ children, type = 'neutral' }) {
  const [hov, setHov] = useState(false);
  const cols = { good: 'var(--green)', bad: 'var(--red)', warn: 'var(--amber)', neutral: 'var(--text-dim)', cyan: 'var(--cyan)' };
  const col = cols[type] || cols.neutral;
  return (
    <span onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', background: hov ? colWithAlpha(col, 0.15) : 'transparent', border: `1px solid ${colWithAlpha(col, hov ? 0.8 : 0.4)}`, color: col, fontSize: 10, fontFamily: 'Share Tech Mono,monospace', letterSpacing: '0.12em', clipPath: 'polygon(4px 0,100% 0,100% calc(100% - 4px),calc(100% - 4px) 100%,0 100%,0 4px)', cursor: 'default', transition: 'all 0.2s', textShadow: hov ? `0 0 8px ${col}` : 'none', boxShadow: hov ? `0 0 12px ${colWithAlpha(col, 0.3)}` : 'none' }}>
      {children}
    </span>
  );
}

function Header({ stage }) {
  const stages = ['INPUT', 'SCAN', 'MATCH', 'INTERVIEW', 'ATS OUTPUT'];
  const [, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(id); }, []);
  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, flexShrink: 0, background: 'rgba(0,4,10,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,245,255,0.15)', position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <svg viewBox="0 0 32 32" width="32" height="32">
          <polygon points="16,2 30,10 30,22 16,30 2,22 2,10" fill="none" stroke="var(--cyan)" strokeWidth="1.5" style={{ filter: 'drop-shadow(0 0 4px var(--cyan))' }} />
          <polygon points="16,8 24,12.5 24,20 16,24 8,20 8,12.5" fill="rgba(0,245,255,0.08)" stroke="var(--cyan)" strokeWidth="1" />
          <text x="16" y="20" textAnchor="middle" fontFamily="Orbitron" fontSize="8" fontWeight="900" fill="var(--cyan)">CF</text>
        </svg>
        <div>
          <div className="orb" style={{ fontSize: 13, fontWeight: 900, letterSpacing: '0.2em', color: 'var(--cyan)', textShadow: 'var(--glow-cyan)', lineHeight: 1 }}>CAREERFIT</div>
          <div className="mono" style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.25em' }}>NEURAL MATCH ENGINE v2.0</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {stages.map((s, i) => {
          const active = i === stage, done = i < stage;
          const col = active ? 'var(--cyan)' : done ? 'var(--green)' : 'var(--text-dim)';
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && <div style={{ width: 32, height: 1, background: done ? 'linear-gradient(90deg,var(--green),var(--cyan))' : 'rgba(255,255,255,0.08)', transition: 'background 0.5s' }} />}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 10, height: 10, transform: 'rotate(45deg)', border: `1.5px solid ${col}`, background: done ? 'var(--green)' : active ? 'rgba(0,245,255,0.2)' : 'transparent', boxShadow: active ? '0 0 12px var(--cyan)' : done ? '0 0 8px var(--green)' : 'none', transition: 'all 0.4s' }} />
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.15em', color: col, textShadow: active ? '0 0 8px var(--cyan)' : 'none', transition: 'all 0.4s' }}>{s}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="mono" style={{ fontSize: 14, color: 'var(--cyan)', letterSpacing: '0.1em', textShadow: '0 0 10px var(--cyan)' }}>{ts}</div>
        <div className="mono" style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>SYS ONLINE</div>
      </div>
    </header>
  );
}

function IntroStage({ onEnter }) {
  const scrollRef = useRef(null);
  const canvasRef = useRef(null);
  const progressRef = useRef(0);
  const [progress, setProgress] = useState(0);
  const particlesRef = useRef([]);
  const enteredRef = useRef(false);

  useEffect(() => {
    particlesRef.current = Array.from({ length: 80 }, () => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.0004, vy: (Math.random() - 0.5) * 0.0004, size: Math.random() * 2 + 0.5, color: Math.random() < 0.6 ? 'rgba(0,245,255,' : 'rgba(255,0,255,', alpha: Math.random() * 0.5 + 0.1 }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); let alive = true;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener('resize', resize);
    const draw = () => {
      if (!alive) return;
      const p = progressRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2, cy = canvas.height / 2;
      const pull = Math.max(0, (p - 0.5) / 0.45);
      particlesRef.current.forEach(pt => {
        pt.x += pt.vx + (0.5 - pt.x) * pull * 0.05; pt.y += pt.vy + (0.5 - pt.y) * pull * 0.05;
        pt.x = (pt.x % 1 + 1) % 1; pt.y = (pt.y % 1 + 1) % 1;
        const fade = 1 - Math.max(0, (p - 0.82) / 0.18);
        ctx.beginPath(); ctx.arc(pt.x * canvas.width, pt.y * canvas.height, pt.size, 0, Math.PI * 2);
        ctx.fillStyle = `${pt.color}${pt.alpha * fade})`; ctx.fill();
      });
      if (pull > 0.2) {
        const la = Math.min(1, (pull - 0.2) / 0.5) * (1 - Math.max(0, (p - 0.88) / 0.12));
        for (let r = 0; r <= 6; r++) for (let c = 0; c <= 10; c++) {
          const ox = c / 10 * canvas.width, oy = r / 6 * canvas.height;
          const ep = 1 - Math.pow(1 - Math.min(1, (pull - 0.2) / 0.6), 3);
          const x = ox + (cx - ox) * ep, y = oy + (cy - oy) * ep;
          ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fillStyle = `rgba(0,245,255,${la * 0.5})`; ctx.fill();
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.strokeStyle = `rgba(0,245,255,${la * 0.08})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
      requestAnimationFrame(draw);
    };
    draw();
    return () => { alive = false; window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight; const p = max > 0 ? el.scrollTop / max : 0;
      progressRef.current = p; setProgress(p);
      if (p >= 0.99 && !enteredRef.current) { enteredRef.current = true; setTimeout(onEnter, 500); }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [onEnter]);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  const map = (p, a, b) => ease(clamp((p - a) / (b - a), 0, 1));

  const tagO = map(progress, 0, 0.08);
  const titleLX = -150 * (1 - map(progress, 0.06, 0.28));
  const titleRX = 150 * (1 - map(progress, 0.06, 0.28));
  const titleO = map(progress, 0.06, 0.25);
  const titleC = 1 - map(progress, 0.58, 0.80);
  const titleS = 1 - map(progress, 0.58, 0.83) * 0.6;
  const stepsO = map(progress, 0.28, 0.44);
  const stepsC = map(progress, 0.55, 0.80);
  const cScale = ease(map(progress, 0.70, 0.84));
  const cGlow = map(progress, 0.70, 0.94);
  const cExpand = map(progress, 0.88, 1);

  const steps = [
    { id: '01', label: 'INJECT DATA', desc: 'Feed the job spec and your CV into the neural pipeline', col: 'var(--cyan)', from: [-1, -1] },
    { id: '02', label: 'DEEP SCAN', desc: 'AI maps every skill, gap, and keyword with precision', col: 'var(--magenta)', from: [1, -1] },
    { id: '03', label: 'COMBAT BRIEF', desc: 'Role-specific interview questions with tactical hints', col: 'var(--green)', from: [-1, 1] },
    { id: '04', label: 'WEAPONIZE CV', desc: 'ATS-optimized resume engineered to score 90+', col: 'var(--amber)', from: [1, 1] },
  ];

  return (
    <div ref={scrollRef} style={{ height: '100vh', overflowY: 'scroll', overflowX: 'hidden', position: 'relative' }}>
      <div style={{ height: '500vh' }} />
      <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: '0.3em', color: 'var(--text-dim)', marginBottom: 24, opacity: tagO * (1 - map(progress, 0.55, 0.72)), transform: `translateY(${(1 - tagO) * 12}px)`, textShadow: '0 0 20px rgba(0,245,255,0.3)' }}>
          [ SYS // NEURAL MATCH ENGINE v2.0 // ONLINE ]
        </div>
        <div style={{ textAlign: 'center', opacity: titleO * titleC, transform: `scale(${titleS})`, marginBottom: 56, position: 'relative' }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ transform: `translateX(${titleLX}px)`, display: 'block' }}>
              <GlitchText size="clamp(60px,8vw,108px)" color="var(--text)" style={{ letterSpacing: '-2px', lineHeight: 0.9, textShadow: '0 0 40px rgba(255,255,255,0.1)' }}>JOB FIT</GlitchText>
            </div>
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ transform: `translateX(${titleRX}px)`, display: 'block' }}>
              <GlitchText size="clamp(60px,8vw,108px)" color="var(--cyan)" style={{ letterSpacing: '-2px', lineHeight: 0.9, textShadow: '0 0 40px rgba(0,245,255,0.5)' }}>ANALYSIS</GlitchText>
            </div>
          </div>
          <div style={{ transform: `translateX(${titleLX * 0.5}px)`, display: 'block' }}>
            <GlitchText size="clamp(60px,8vw,108px)" color="var(--magenta)" style={{ letterSpacing: '-2px', lineHeight: 0.9, textShadow: '0 0 40px rgba(255,0,255,0.4)' }}>ENGINE</GlitchText>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: 560, opacity: stepsO * (1 - stepsC), transform: `scale(${1 - stepsC * 0.7})` }}>
          {steps.map((s, i) => {
            const pull = [s.from[0] * -180, s.from[1] * -120];
            const e1 = ease(clamp((progress - 0.55) / 0.25, 0, 1));
            return (
              <div key={s.id} style={{ padding: '14px 18px', background: 'rgba(0,10,20,0.85)', border: `1px solid ${colWithAlpha(s.col, 0.4)}`, backdropFilter: 'blur(8px)', opacity: map(progress, 0.28 + i * 0.04, 0.44 + i * 0.04), transform: `translate(${pull[0] * e1}px,${pull[1] * e1}px)`, boxShadow: `inset 0 0 20px ${colWithAlpha(s.col, 0.05)},0 0 20px ${colWithAlpha(s.col, 0.1)}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span className="mono" style={{ fontSize: 9, color: s.col, letterSpacing: '0.2em', textShadow: `0 0 8px ${s.col}` }}>{s.id}</span>
                  <span className="orb" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: s.col }}>{s.label}</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            );
          })}
        </div>
        {cScale > 0.01 && (
          <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ position: 'absolute', left: '50%', top: '50%', width: 16, height: 16, marginLeft: -8, marginTop: -8, border: `1px solid ${i % 2 === 0 ? 'var(--cyan)' : 'var(--magenta)'}`, borderRadius: '50%', opacity: cGlow * 0.4, transform: `translate(-50%,-50%) scale(${1 + i * 1.2 + cGlow * 4})` }} />
            ))}
            <div style={{ width: 32 * cScale + 50 * cExpand, height: 32 * cScale + 50 * cExpand, background: 'conic-gradient(var(--cyan),var(--magenta),var(--green),var(--cyan))', transform: `rotate(45deg) scale(${1 + cExpand * 3})`, boxShadow: `0 0 ${60 * cGlow + cExpand * 120}px rgba(0,245,255,0.6),0 0 ${100 * cGlow + cExpand * 200}px rgba(255,0,255,0.3)`, opacity: cScale * (1 - cExpand * 0.6), borderRadius: '2px' }} />
          </div>
        )}
        {progress < 0.04 && (
          <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', opacity: 1 - progress * 25, animation: 'fadeUp 1s 1.5s both' }}>
            <div className="mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.3em', textAlign: 'center', marginBottom: 10 }}>[ SCROLL TO INITIATE ]</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 2, height: 8, background: 'var(--cyan)', opacity: 0.2 + i * 0.3, boxShadow: '0 0 4px var(--cyan)', animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InputStage({ onAnalyze }) {
  const [jd, setJd] = useState('');
  const [resume, setResume] = useState('');
  const [jdFocus, setJdFocus] = useState(false);
  const [rFocus, setRFocus] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [docxName, setDocxName] = useState('');
  const fileInputRef = useRef(null);
  const canAnalyze = jd.trim().length > 30 && resume.trim().length > 30;

  const parseDocx = async file => {
    setParsing(true); setDragOver(false);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      setResume(result.value.trim()); setDocxName(file.name);
    } catch { alert('Parse failed — paste text instead.'); }
    setParsing(false);
  };

  const handleDrop = e => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith('.docx') || f.type.includes('wordprocessingml'))) parseDocx(f);
  };

  const taStyle = { flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontFamily: 'Share Tech Mono,monospace', fontSize: 11, lineHeight: 1.9, resize: 'none', padding: '12px 16px', letterSpacing: '0.03em' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 28px 18px', gap: 16, minHeight: 0, animation: 'revealUp 0.6s ease-out' }}>
      <div style={{ textAlign: 'center', flexShrink: 0, padding: '4px 0 8px' }}>
        <GlitchText size={42} color="var(--cyan)" style={{ letterSpacing: '-1px', lineHeight: 1, textShadow: '0 0 30px rgba(0,245,255,0.6)' }}>NEURAL MATCH ENGINE</GlitchText>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.25em', marginTop: 8 }}>[ INJECT JD + CV → DEEP SCAN → INTERVIEW BRIEF → WEAPONIZED RESUME ]</div>
      </div>
      <div style={{ flex: 1, display: 'flex', gap: 14, minHeight: 0 }}>
        <CyberPanel style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} hover={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(0,245,255,0.12)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, background: 'var(--cyan)', transform: 'rotate(45deg)', boxShadow: '0 0 6px var(--cyan)' }} />
              <span className="orb" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--cyan)', fontWeight: 700 }}>JOB DESCRIPTION</span>
            </div>
            <span className="mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{jd.length} BYTES</span>
          </div>
          <textarea style={taStyle} placeholder={`// PASTE JOB DESCRIPTION
// Include full requirements, responsibilities, qualifications...`} value={jd} onChange={e => setJd(e.target.value)} onFocus={() => setJdFocus(true)} onBlur={() => setJdFocus(false)} />
          {jdFocus && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg,transparent,var(--cyan),transparent)', animation: 'holoPan 2s linear infinite', backgroundSize: '200% 100%' }} />}
        </CyberPanel>
        <CyberPanel style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }} color={rFocus || dragOver ? 'magenta' : 'cyan'} hover={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', borderBottom: '1px solid rgba(0,245,255,0.12)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, background: 'var(--magenta)', transform: 'rotate(45deg)', boxShadow: '0 0 6px var(--magenta)' }} />
              <span className="orb" style={{ fontSize: 10, letterSpacing: '0.2em', color: 'var(--magenta)', fontWeight: 700 }}>YOUR CV / RESUME</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {docxName && <span className="mono" style={{ fontSize: 9, color: 'var(--green)', letterSpacing: '0.08em', textShadow: '0 0 6px var(--green)' }}>✓ {docxName}</span>}
              <span className="mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>{resume.length} BYTES</span>
            </div>
          </div>
          {!resume && (
            <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop} onClick={() => fileInputRef.current.click()}
              style={{ margin: '12px 14px 0', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', transition: 'all 0.2s', border: `1px dashed ${dragOver ? 'var(--magenta)' : 'rgba(255,0,255,0.3)'}`, background: dragOver ? 'rgba(255,0,255,0.08)' : 'rgba(255,0,255,0.03)', boxShadow: dragOver ? '0 0 24px rgba(255,0,255,0.2)' : 'none', flexShrink: 0 }}>
              <div style={{ width: 40, height: 40, border: `1px solid ${dragOver ? 'var(--magenta)' : 'rgba(255,0,255,0.4)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                {parsing
                  ? <div style={{ width: 18, height: 18, border: '2px solid var(--magenta)', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  : <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={dragOver ? 'var(--magenta)' : 'rgba(255,0,255,0.6)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="2" width="14" height="16" rx="1" /><path d="M10 7v6M7 10l3-3 3 3" /><path d="M7 15h6" /></svg>}
              </div>
              <div>
                <div className="orb" style={{ fontSize: 11, letterSpacing: '0.15em', color: dragOver ? 'var(--magenta)' : 'rgba(255,0,255,0.8)', fontWeight: 700, marginBottom: 3 }}>{parsing ? 'PARSING DOCUMENT…' : dragOver ? 'DROP TO INJECT' : 'DROP .DOCX FILE'}</div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>or click to browse · .docx accepted</div>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={e => e.target.files[0] && parseDocx(e.target.files[0])} />
          <textarea style={{ ...taStyle, color: resume ? 'var(--text)' : 'var(--text-dim)' }} placeholder={`// OR PASTE RESUME TEXT
// Work history, skills, education, achievements...`} value={resume} onChange={e => { setResume(e.target.value); if (!e.target.value) setDocxName(''); }} onFocus={() => setRFocus(true)} onBlur={() => setRFocus(false)} />
          {resume && <button onClick={() => { setResume(''); setDocxName(''); }} style={{ alignSelf: 'flex-end', margin: '0 12px 10px', padding: '3px 12px', background: 'transparent', border: '1px solid rgba(255,0,255,0.3)', color: 'var(--text-dim)', fontFamily: 'Share Tech Mono', fontSize: 9, letterSpacing: '0.15em', cursor: 'pointer' }}>CLEAR</button>}
        </CyberPanel>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
        <NeonBtn onClick={() => canAnalyze && onAnalyze(jd, resume)} disabled={!canAnalyze} size="lg">
          <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="0,0 12,7 0,14" /></svg>
          INITIATE ANALYSIS
        </NeonBtn>
      </div>
    </div>
  );
}

function AnalyzingStage({ progress }) {
  const steps = ['PARSING JOB DESCRIPTION','EXTRACTING SKILL REQUIREMENTS','SCANNING CV NEURAL PATTERNS','CROSS-REFERENCING QUALIFICATIONS','SCORING EXPERIENCE DEPTH','MAPPING CAPABILITY GAPS','CALIBRATING FIT INDEX','GENERATING INTELLIGENCE REPORT'];
  const [chars, setChars] = useState('');
  useEffect(() => {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const id = setInterval(() => setChars(Array.from({ length: 12 }, () => alpha[Math.floor(Math.random() * alpha.length)]).join('')), 80);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 36, animation: 'fadeUp 0.4s ease-out' }}>
      <div style={{ position: 'relative', width: 180, height: 180 }}>
        {[0,1,2].map(i => <div key={i} style={{ position: 'absolute', inset: i * 12, border: `1px solid rgba(0,245,255,${0.3 - i * 0.08})`, transform: 'rotate(45deg)' }} />)}
        <svg width="180" height="180" style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }}>
          <circle cx="90" cy="90" r="78" fill="none" stroke="rgba(0,245,255,0.08)" strokeWidth="4" />
          <circle cx="90" cy="90" r="78" fill="none" stroke="var(--cyan)" strokeWidth="3" strokeLinecap="butt" strokeDasharray={2 * Math.PI * 78} strokeDashoffset={2 * Math.PI * 78 * (1 - progress / 100)} style={{ filter: 'drop-shadow(0 0 10px var(--cyan))', transition: 'stroke-dashoffset 0.4s ease' }} />
          <circle cx="90" cy="90" r="78" fill="none" stroke="var(--magenta)" strokeWidth="1" strokeLinecap="butt" strokeDasharray={`4 ${2 * Math.PI * 78 / 12 - 4}`} style={{ filter: 'drop-shadow(0 0 4px var(--magenta))', opacity: 0.4 }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <div className="orb" style={{ fontSize: 38, fontWeight: 900, color: 'var(--cyan)', letterSpacing: '-2px', textShadow: 'var(--glow-cyan)' }}>{progress}%</div>
          <div className="mono" style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.25em' }}>PROCESSING</div>
          <div className="mono" style={{ fontSize: 8, color: 'rgba(0,245,255,0.4)', letterSpacing: '0.1em', marginTop: 2 }}>{chars}</div>
        </div>
      </div>
      <div style={{ width: 480, display: 'flex', flexDirection: 'column', gap: 7 }}>
        {steps.map((step, i) => {
          const sp = i / (steps.length - 1) * 100;
          const done = progress > sp + 4, active = !done && progress >= sp - 5;
          return (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 12, opacity: done || active ? 1 : 0.25, transition: 'opacity 0.4s', padding: '4px 0' }}>
              <div style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {done ? <svg width="14" height="14" viewBox="0 0 14 14"><polyline points="2,7 6,11 12,3" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 4px var(--green))' }} /></svg>
                  : active ? <div style={{ width: 8, height: 8, background: 'var(--cyan)', transform: 'rotate(45deg)', animation: 'pulse 0.7s ease-in-out infinite', boxShadow: '0 0 8px var(--cyan)' }} />
                    : <div style={{ width: 4, height: 4, border: '1px solid rgba(0,245,255,0.2)', transform: 'rotate(45deg)' }} />}
              </div>
              <span className="mono" style={{ fontSize: 10, letterSpacing: '0.15em', color: done ? 'var(--green)' : active ? 'var(--cyan)' : 'var(--text-dim)', textShadow: active ? '0 0 8px var(--cyan)' : done ? '0 0 6px var(--green)' : 'none', transition: 'all 0.3s', flex: 1 }}>{step}</span>
              {active && <span className="mono" style={{ fontSize: 9, color: 'var(--cyan)', animation: 'blink 0.5s step-end infinite', textShadow: '0 0 8px var(--cyan)' }}>█</span>}
              {done && <span className="mono" style={{ fontSize: 9, color: 'var(--green)', letterSpacing: '0.1em' }}>OK</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResultsStage({ data, onNext }) {
  const [tab, setTab] = useState('overview');
  const tabCols = { overview: 'var(--cyan)', gaps: 'var(--red)', strengths: 'var(--green)' };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 28px', gap: 16, minHeight: 0, animation: 'revealUp 0.5s ease-out', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
        <HexScore score={data.fitScore} size={150} />
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', marginBottom: 4 }}>// ANALYSIS COMPLETE</div>
          <div className="orb" style={{ fontSize: 22, fontWeight: 900, letterSpacing: '0.05em', marginBottom: 6, color: 'var(--text)', textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>{data.role}</div>
          <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.6, maxWidth: 480, marginBottom: 10 }}>{data.summary}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{(data.topTags || []).map(t => <CyberTag key={t.label} type={t.type}>{t.label}</CyberTag>)}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, flexShrink: 0 }}>
          {(data.dimensions || []).map(d => {
            const col = d.score >= 75 ? 'var(--green)' : d.score >= 50 ? 'var(--cyan)' : 'var(--red)';
            return (
              <CyberPanel key={d.name} style={{ padding: '10px 14px' }} color={d.score >= 75 ? 'green' : 'cyan'}>
                <div className="mono" style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.18em', marginBottom: 3 }}>{d.name}</div>
                <div className="orb" style={{ fontSize: 22, fontWeight: 900, color: col, textShadow: `0 0 12px ${col}`, letterSpacing: '-1px' }}>{d.score}</div>
              </CyberPanel>
            );
          })}
        </div>
      </div>
      <div style={{ flexShrink: 0, display: 'flex', gap: 0, borderBottom: '1px solid rgba(0,245,255,0.12)' }}>
        {[['overview','SKILLS MATRIX'],['gaps','THREAT GAPS'],['strengths','STRENGTHS']].map(([id, label]) => {
          const active = tab === id, col = tabCols[id];
          return <button key={id} onClick={() => setTab(id)} style={{ padding: '8px 20px', background: active ? colWithAlpha(col, 0.08) : 'transparent', border: 'none', borderBottom: `2px solid ${active ? col : 'transparent'}`, color: active ? col : 'var(--text-dim)', cursor: 'pointer', fontFamily: 'Orbitron,monospace', fontSize: 9, letterSpacing: '0.2em', fontWeight: 700, transition: 'all 0.2s', textShadow: active ? `0 0 8px ${col}` : 'none' }}>{label}</button>;
        })}
      </div>
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {tab === 'overview' && <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>{(data.skills || []).map((s, i) => <CyberBar key={s.label} label={s.label} score={s.score} delay={i * 50} />)}</div>}
        {tab === 'gaps' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          {(data.gaps || []).map((g, i) => (
            <CyberPanel key={i} style={{ padding: '12px 16px', animation: `slideInLeft 0.3s ${i * 70}ms both` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div><div className="orb" style={{ fontSize: 12, fontWeight: 700, color: 'var(--red)', marginBottom: 4, textShadow: '0 0 8px var(--red)' }}>{g.skill}</div><div style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>{g.description}</div></div>
                <CyberTag type="bad">THREAT</CyberTag>
              </div>
            </CyberPanel>
          ))}
        </div>}
        {tab === 'strengths' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
          {(data.strengths || []).map((s, i) => (
            <CyberPanel key={i} style={{ padding: '12px 16px', animation: `slideInRight 0.3s ${i * 70}ms both` }} color="green">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div><div className="orb" style={{ fontSize: 12, fontWeight: 700, color: 'var(--green)', marginBottom: 4, textShadow: '0 0 8px var(--green)' }}>{s.skill}</div><div style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.6 }}>{s.description}</div></div>
                <CyberTag type="good">ASSET</CyberTag>
              </div>
            </CyberPanel>
          ))}
        </div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <NeonBtn onClick={onNext} color="magenta">PROCEED TO INTERVIEW BRIEF <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1,5 9,5 6,2 9,5 6,8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></NeonBtn>
      </div>
    </div>
  );
}

function InterviewStage({ data, onNext }) {
  const [active, setActive] = useState(null);
  const cols = { behavioral: 'var(--cyan)', technical: 'var(--magenta)', situational: 'var(--amber)' };
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 28px', gap: 16, minHeight: 0, animation: 'revealUp 0.5s ease-out' }}>
      <div style={{ flexShrink: 0 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', marginBottom: 4 }}>// AI-GENERATED COMBAT BRIEF // ROLE-SPECIFIC</div>
        <GlitchText size={28} color="var(--cyan)">INTERVIEW PREPARATION</GlitchText>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        {(data.questions || []).map((q, i) => {
          const col = cols[q.type] || 'var(--cyan)', isOpen = active === i;
          return (
            <CyberPanel key={i} style={{ animation: `slideInLeft 0.3s ${i * 40}ms both`, overflow: 'hidden' }} color={q.type === 'technical' ? 'magenta' : 'cyan'} hover={false}>
              <button onClick={() => setActive(isOpen ? null : i)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span className="mono" style={{ fontSize: 8, letterSpacing: '0.2em', color: col, width: 96, flexShrink: 0, textShadow: `0 0 6px ${col}` }}>{(q.type || '').toUpperCase()}</span>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', fontWeight: 600, fontFamily: 'Rajdhani,sans-serif' }}>{q.question}</span>
                <div style={{ width: 20, height: 20, border: `1px solid ${colWithAlpha(col, 0.4)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: isOpen ? 'rotate(45deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke={col} strokeWidth="1.5"><path d="M5 2v6M2 5h6" /></svg>
                </div>
              </button>
              {isOpen && (
                <div style={{ padding: '12px 16px 14px 126px', borderTop: '1px solid rgba(0,245,255,0.08)', animation: 'fadeUp 0.2s' }}>
                  <div className="mono" style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.2em', marginBottom: 6 }}>// TACTICAL APPROACH</div>
                  <p style={{ fontSize: 13, color: 'var(--text-mid)', lineHeight: 1.7 }}>{q.hint}</p>
                </div>
              )}
            </CyberPanel>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
        <NeonBtn onClick={onNext} color="green">GENERATE WEAPONIZED RESUME <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1,5 9,5 6,2 9,5 6,8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></NeonBtn>
      </div>
    </div>
  );
}

function ATSStage({ data, onRestart }) {
  const [copied, setCopied] = useState(false);

  const downloadAsWord = async () => {
    const { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } = await import("docx");
    const HDRS = ["PROFESSIONAL SUMMARY","SUMMARY","OBJECTIVE","EXPERIENCE","WORK EXPERIENCE","SKILLS","TECHNICAL SKILLS","EDUCATION","CERTIFICATIONS","PROJECTS","ACHIEVEMENTS","AWARDS","PUBLICATIONS","VOLUNTEER","LANGUAGES","INTERESTS"];
    const isHdr = line => { const t = line.trim(), up = t.toUpperCase(); return HDRS.some(h => up === h || up === h + ':' || up.startsWith(h + ' ')) || (t === up && t.length > 2 && t.length < 50 && !/[@|•\-\d(]/.test(t)); };
    const lines = data.resume.split('\n'), children = [];
    for (let i = 0; i < lines.length; i++) {
      const t = lines[i].trim();
      if (i === 0 && t) { children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [new TextRun({ text: t, bold: true, size: 36, font: 'Calibri' })] })); continue; }
      if (i === 1 && t && (t.includes('@') || t.includes('|') || t.toLowerCase().includes('linkedin'))) { children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: t, size: 20, color: '555555', font: 'Calibri' })] })); continue; }
      if (!t) { children.push(new Paragraph({ spacing: { after: 80 } })); continue; }
      if (isHdr(t)) { children.push(new Paragraph({ spacing: { before: 240, after: 80 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '005588', space: 4 } }, children: [new TextRun({ text: t.toUpperCase(), bold: true, size: 24, color: '005588', font: 'Calibri' })] })); continue; }
      if (/^[•\-·]\s/.test(t)) { children.push(new Paragraph({ bullet: { level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t.replace(/^[•\-·]\s*/, ''), size: 21, font: 'Calibri', color: '222222' })] })); continue; }
      children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: t, size: 21, bold: t.includes('|') && !t.includes('@'), font: 'Calibri', color: '222222' })] }));
    }
    const doc = new Document({ sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } } }, children }] });
    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'weaponized-resume.docx'; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '18px 28px', gap: 16, minHeight: 0, animation: 'revealUp 0.5s ease-out' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: '0.25em', color: 'var(--text-dim)', marginBottom: 4 }}>// ATS-ENGINEERED // KEYWORD OPTIMIZED</div>
          <GlitchText size={28} color="var(--green)">WEAPONIZED RESUME</GlitchText>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <CyberPanel style={{ padding: '8px 16px' }} color="green" hover={false}>
            <div className="mono" style={{ fontSize: 8, color: 'var(--text-dim)', letterSpacing: '0.2em' }}>ATS SCORE</div>
            <div className="orb" style={{ fontSize: 20, fontWeight: 900, color: 'var(--green)', textShadow: '0 0 12px var(--green)' }}>{data.atsScore}/100</div>
          </CyberPanel>
          <NeonBtn onClick={() => { navigator.clipboard.writeText(data.resume); setCopied(true); setTimeout(() => setCopied(false), 2000); }} color={copied ? 'green' : 'cyan'}>{copied ? '✓ COPIED' : 'COPY OUTPUT'}</NeonBtn>
          <NeonBtn onClick={downloadAsWord} color="magenta">↓ DOWNLOAD .DOCX</NeonBtn>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
        {(data.keywords || []).map(k => <CyberTag key={k} type="good">{k}</CyberTag>)}
        <span className="mono" style={{ fontSize: 10, color: 'var(--text-dim)', alignSelf: 'center', marginLeft: 4 }}>// keywords injected</span>
      </div>
      <CyberPanel style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: '20px 24px' }} hover={false} color="green">
        <pre style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: 11, lineHeight: 1.9, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{data.resume}</pre>
      </CyberPanel>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <NeonBtn onClick={onRestart} color="cyan" style={{ fontSize: 9 }}>← ANALYZE ANOTHER</NeonBtn>
        <div className="mono" style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.15em', alignSelf: 'center' }}>// PIPELINE COMPLETE // CAREERFIT v2.0</div>
      </div>
    </div>
  );
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [stage, setStage] = useState(() => { const s = localStorage.getItem('cf_stage'); return s ? parseInt(s) : 0; });
  const [progress, setProgress] = useState(0);
  const [analysisData, setAnalysisData] = useState(() => { try { const d = localStorage.getItem('cf_data'); return d ? JSON.parse(d) : null; } catch { return null; } });

  useEffect(() => { localStorage.setItem('cf_stage', stage); }, [stage]);
  useEffect(() => { if (analysisData) localStorage.setItem('cf_data', JSON.stringify(analysisData)); }, [analysisData]);

  const handleEnter = useCallback(() => { localStorage.setItem('cf_seen', '1'); setShowIntro(false); }, []);

  const getDemoData = () => ({
    fitScore: 72, role: 'Senior Product Manager',
    summary: 'Strong strategic and cross-functional leadership with solid product intuition. Technical depth is below the bar for this engineering-heavy role — SQL and ML exposure are primary threats.',
    topTags: [{ label: '5+ YRS PM', type: 'good' }, { label: 'MISSING: SQL', type: 'bad' }, { label: 'AGILE ✓', type: 'good' }, { label: 'NO ML EXP', type: 'warn' }, { label: 'LEADERSHIP ✓', type: 'good' }],
    dimensions: [{ name: 'EXPERIENCE', score: 81 }, { name: 'SKILLS', score: 64 }, { name: 'EDUCATION', score: 78 }, { name: 'CULTURE FIT', score: 70 }],
    skills: [{ label: 'Product Strategy', score: 88 }, { label: 'Stakeholder Mgmt', score: 82 }, { label: 'Data Analysis', score: 61 }, { label: 'Technical Writing', score: 75 }, { label: 'Agile / Scrum', score: 90 }, { label: 'SQL / Analytics', score: 38 }, { label: 'ML / AI Concepts', score: 42 }, { label: 'Go-to-Market', score: 79 }],
    gaps: [{ skill: 'SQL / Data Querying', description: 'Role requires hands-on SQL. No SQL evidence in resume.' }, { skill: 'ML / AI Product Sense', description: 'Team builds AI-native features. No ML product experience shown.' }, { skill: 'Enterprise Sales Cycle', description: 'Job targets enterprise. Background is primarily consumer/SMB.' }],
    strengths: [{ skill: 'Product Strategy', description: 'Consistent track record of roadmap ownership across multiple roles.' }, { skill: 'Cross-functional Leadership', description: 'Repeatedly led large squads through complex delivery.' }, { skill: 'Agile Execution', description: 'Deep agile fluency with measurable delivery improvements.' }, { skill: 'Go-to-Market', description: 'Authored GTM playbooks adopted as team standards.' }],
    questions: [{ type: 'behavioral', question: 'Walk me through a product decision where data contradicted your intuition.', hint: 'Show you can hold conviction while remaining data-informed.' }, { type: 'technical', question: 'How would you define and track the north star metric for a B2B SaaS platform?', hint: 'Demonstrate metric hierarchy thinking: north star → leading indicators → guardrail metrics.' }, { type: 'technical', question: 'Prioritize a 40-item backlog with 3 competing stakeholder groups.', hint: 'RICE or MoSCoW framework — show confident prioritization instincts.' }, { type: 'situational', question: 'Key enterprise customer threatening churn over a missing feature. Your move.', hint: 'Bridge consumer-to-enterprise transfer of experience.' }],
    ats: { atsScore: 94, keywords: ['Product Strategy', 'Agile', 'OKRs', 'Cross-functional', 'Roadmap'], resume: 'ALEX MORGAN\nSenior Product Manager\nalex@email.com  |  linkedin.com/in/alexmorgan\n\n── PROFESSIONAL SUMMARY ─────────────────────────────\nResults-driven Senior Product Manager with 6+ years owning cross-functional product strategy, roadmap execution, and go-to-market delivery.\n\n── EXPERIENCE ───────────────────────────────────────\nSenior Product Manager | TechCorp Inc.     2021 – Present\n• Owned end-to-end product roadmap (120K MAU), driving 34% YoY retention uplift\n• Led cross-functional squad of 9 through 3 major launches\n\n── CORE SKILLS ──────────────────────────────────────\nProduct Strategy · Agile/Scrum · OKR Framework · Roadmap Planning\n\n── EDUCATION ────────────────────────────────────────\nB.S. Business Administration  2018\nCertified Scrum Master (CSM)  2020' }
  });

  const doAnalyze = async (jd, resume) => {
    setStage(1); setProgress(0);
    let p = 0;
    const interval = setInterval(() => { p = Math.min(p + (Math.random() * 4 + 1), 88); setProgress(Math.round(p)); }, 180);
    try {
      const prompt = `You are an expert career intelligence system. Analyze this job application and return ONLY valid JSON.\n\nJOB DESCRIPTION:\n${jd.slice(0, 2000)}\n\nRESUME:\n${resume.slice(0, 2000)}\n\nReturn this exact JSON:\n{"fitScore":<0-100>,"role":"<job title>","summary":"<2-sentence honest assessment>","topTags":[{"label":"<keyword max 15 chars>","type":"<good|bad|warn|neutral>"}],"dimensions":[{"name":"EXPERIENCE","score":<0-100>},{"name":"SKILLS","score":<0-100>},{"name":"EDUCATION","score":<0-100>},{"name":"CULTURE FIT","score":<0-100>}],"skills":[{"label":"<skill max 18 chars>","score":<0-100>}],"gaps":[{"skill":"<title>","description":"<specific gap>"}],"strengths":[{"skill":"<title>","description":"<specific strength>"}],"questions":[{"type":"<behavioral|technical|situational>","question":"<question>","hint":"<tactical answer guidance>"}],"atsResume":{"score":<85-98>,"keywords":["<kw1>","<kw2>","<kw3>","<kw4>","<kw5>"],"text":"<full rewritten resume plain text>"}}\n\nProvide 6-8 skills, 3-4 gaps, 4-5 strengths, 8 questions, 4-6 topTags.`;
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: 'Return ONLY valid JSON.', messages: [{ role: 'user', content: prompt }], maxTokens: 4000 }) });
      const { text } = await res.json();
      clearInterval(interval); setProgress(100);
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON');
      const parsed = JSON.parse(match[0]);
      const data = { ...parsed, ats: { atsScore: parsed.atsResume?.score || 92, keywords: parsed.atsResume?.keywords || [], resume: parsed.atsResume?.text || resume } };
      await new Promise(r => setTimeout(r, 500));
      setAnalysisData(data); setStage(2);
    } catch {
      clearInterval(interval); setProgress(100);
      await new Promise(r => setTimeout(r, 500));
      setAnalysisData(getDemoData()); setStage(2);
    }
  };

  const restart = () => {
    setStage(0); setAnalysisData(null); setProgress(0);
    localStorage.removeItem('cf_stage'); localStorage.removeItem('cf_data'); localStorage.removeItem('cf_seen');
    setShowIntro(true);
  };

  if (showIntro) return <IntroStage onEnter={handleEnter} />;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header stage={stage === 0 ? 0 : stage === 1 ? 1 : stage === 2 ? 2 : stage === 3 ? 3 : 4} />
      {stage === 0 && <InputStage onAnalyze={doAnalyze} />}
      {stage === 1 && <AnalyzingStage progress={progress} />}
      {stage === 2 && analysisData && <ResultsStage data={analysisData} onNext={() => setStage(3)} />}
      {stage === 3 && analysisData && <InterviewStage data={analysisData} onNext={() => setStage(4)} />}
      {stage === 4 && analysisData?.ats && <ATSStage data={analysisData.ats} onRestart={restart} />}
    </div>
  );
}
