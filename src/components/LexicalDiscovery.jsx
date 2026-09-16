import { useEffect, useRef, useState } from "react";

/**
 * A lightweight, LLM-free recreation of the referential game at the heart of
 * "Lexical discovery in unknown environments orchestrated by Large Language
 * Models" (Sendra-Arranz et al., arXiv:2607.22591).
 *
 * Alien referents live in a 2-D stand-in for the CLIP embedding space, next to
 * a fixed "English perceptual base" of descriptor words (for anchoring).
 * Agents keep a private lexicon of (alien word, grounding, confidence). Each
 * round a speaker and a hearer name the same referent: success raises both
 * confidences (+0.25); failure lowers them (−0.20) and the less-confident agent
 * adopts the other's word. Words are invented (3 syllables from a 45-syllable
 * inventory) when an agent has none. We track grounding consensus G,
 * vocabulary size V and T₀.₉₅ (first round with G ≥ 0.95), as in the paper.
 */

const SERIES = { v: "#c98500", target: "#199e70", g: "#ffb000" };
const TEXT = "rgba(255,224,178,0.75)";
const GRID = "rgba(255,176,0,0.10)";
const OK = "#46d18a";
const BAD = "#e5686a";
const OK_RGB = "70,209,138";
const BAD_RGB = "229,104,106";

// 45-syllable inventory (15 consonants × 3 vowels), 3-syllable words
const CONS = ["b", "d", "f", "g", "k", "l", "m", "n", "p", "r", "s", "t", "v", "z", "x"];
const VOW = ["a", "i", "o"];
const SYL = [];
for (const c of CONS) for (const v of VOW) SYL.push(c + v);

// the "English perceptual base": fixed descriptors in the embedding space
const DESCRIPTORS = [
  "spiky", "smooth", "organic", "crystalline", "tentacled", "porous",
  "glossy", "fibrous", "segmented", "luminous", "coiled", "jagged",
  "mossy", "metallic",
];
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const DESCR_POS = (() => {
  const r = mulberry32(7);
  return DESCRIPTORS.map((name) => ({ name, x: 0.08 + r() * 0.84, y: 0.08 + r() * 0.84 }));
})();

const CAP = 480;

export default function LexicalDiscovery() {
  const rootRef = useRef(null);
  const spaceRef = useRef(null);
  const gRef = useRef(null);
  const vRef = useRef(null);
  const rasterRef = useRef(null);
  const S = useRef({
    refs: [], agents: [], words: new Set(), round: 0,
    hist: { g: [], v: [] }, pushEvery: 1, pushCount: 0, lastPushed: -1,
    flash: null, raster: [], t95: null, dims: {},
  });
  const apiRef = useRef({});

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [running, setRunning] = useState(!reduced);
  const [nA, setNA] = useState(6);
  const [nE, setNE] = useState(5);
  const [speed, setSpeed] = useState(25); // rounds per second
  const [focus, setFocus] = useState(0);
  const [readout, setReadout] = useState({ round: 0, g: 0, v: 0, t95: null });
  const [refRows, setRefRows] = useState([]);
  const [agentRows, setAgentRows] = useState([]);

  const runRef = useRef(running);
  const nARef = useRef(nA);
  const nERef = useRef(nE);
  const spRef = useRef(speed);
  const fRef = useRef(focus);
  runRef.current = running;
  nARef.current = nA;
  nERef.current = nE;
  spRef.current = speed;
  fRef.current = focus;

  useEffect(() => {
    const st = S.current;

    const ctxOf = (ref, h) => {
      const canvas = ref.current;
      const ctx = canvas.getContext("2d");
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.parentElement.clientWidth;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { ctx, w, h };
    };
    const layout = () => {
      st.dims.space = ctxOf(spaceRef, 300);
      st.dims.g = ctxOf(gRef, 150);
      st.dims.v = ctxOf(vRef, 150);
      st.dims.raster = ctxOf(rasterRef, 16);
    };

    const invent = () => {
      let w;
      do {
        w = SYL[(Math.random() * 45) | 0] + SYL[(Math.random() * 45) | 0] + SYL[(Math.random() * 45) | 0];
      } while (st.words.has(w));
      st.words.add(w);
      return w;
    };

    const makeRefs = () => {
      const r = mulberry32((Math.random() * 1e9) | 0);
      const refs = [];
      for (let i = 0; i < nERef.current; i++) {
        let x, y, tries = 0;
        do {
          x = 0.1 + r() * 0.8;
          y = 0.1 + r() * 0.8;
          tries++;
        } while (tries < 200 && refs.some((o) => Math.hypot(o.x - x, o.y - y) < 0.2));
        const hue = (i * 137.508 + r() * 20) % 360;
        const poly = Array.from({ length: 16 }, () => {
          let rf = 0.62 + 0.45 * r();
          if (r() < 0.28) rf *= 1.35;
          return rf;
        });
        const anchors = DESCR_POS.map((d) => ({ name: d.name, d: Math.hypot(d.x - x, d.y - y) }))
          .sort((a, b) => a.d - b.d).slice(0, 3).map((a) => a.name);
        refs.push({ x, y, hue, poly, anchors });
      }
      st.refs = refs;
    };

    const seed = () => {
      st.words = new Set();
      st.round = 0;
      st.hist = { g: [], v: [] };
      st.pushEvery = 1;
      st.pushCount = 0;
      st.lastPushed = -1;
      st.flash = null;
      st.raster = [];
      st.t95 = null;
      makeRefs();
      st.agents = Array.from({ length: nARef.current }, () => ({ lex: {} }));
    };

    // one referential game round
    const playRound = () => {
      const A = st.agents;
      const nA = A.length;
      const nE = st.refs.length;
      if (nA < 2 || nE < 1) return;
      const si = (Math.random() * nA) | 0;
      let hi = (Math.random() * (nA - 1)) | 0;
      if (hi >= si) hi++;
      const e = (Math.random() * nE) | 0;
      const sp = A[si];
      const he = A[hi];
      const say = (ag) => {
        let en = ag.lex[e];
        if (!en) {
          en = { word: invent(), conf: 0 }; // grounded to this referent, c = 0
          ag.lex[e] = en;
        }
        return en;
      };
      const ws = say(sp);
      const wh = say(he);
      const ok = ws.word === wh.word;
      if (ok) {
        ws.conf = Math.min(1, ws.conf + 0.25);
        wh.conf = Math.min(1, wh.conf + 0.25);
      } else {
        ws.conf = Math.max(0, ws.conf - 0.2);
        wh.conf = Math.max(0, wh.conf - 0.2);
        // the less-confident agent replaces its word with the other's
        if (wh.conf <= ws.conf) he.lex[e] = { word: ws.word, conf: wh.conf };
        else sp.lex[e] = { word: wh.word, conf: ws.conf };
      }
      st.round++;
      st.raster.push(ok ? 1 : 0);
      if (st.raster.length > 400) st.raster.shift();
      st.flash = { si, hi, e, ok, t: 1 };
    };

    const pushHist = (g, v) => {
      st.pushCount++;
      if (st.pushCount % st.pushEvery !== 0) return;
      st.hist.g.push(g);
      st.hist.v.push(v);
      if (st.hist.g.length > CAP) {
        st.hist.g = st.hist.g.filter((_, i) => i % 2 === 0);
        st.hist.v = st.hist.v.filter((_, i) => i % 2 === 0);
        st.pushEvery *= 2;
      }
    };

    const metrics = () => {
      const A = st.agents;
      const nA = A.length;
      const nE = st.refs.length;
      let agree = 0;
      let pairs = 0;
      const vocab = new Set();
      for (let e = 0; e < nE; e++) {
        for (let i = 0; i < nA; i++) {
          const a = A[i].lex[e];
          if (a) vocab.add(a.word);
          for (let j = i + 1; j < nA; j++) {
            pairs++;
            const b = A[j].lex[e];
            if (a && b && a.word === b.word) agree++;
          }
        }
      }
      const g = pairs ? agree / pairs : 0;
      const v = vocab.size;
      if (g >= 0.95 && st.t95 === null && st.round > 0) st.t95 = st.round;
      if (st.round !== st.lastPushed) {
        pushHist(g, v);
        st.lastPushed = st.round;
      }
      return { round: st.round, g, v, t95: st.t95 };
    };

    // ---------- drawing ----------
    const drawSpace = () => {
      const { ctx, w, h } = st.dims.space;
      ctx.fillStyle = "#14110c";
      ctx.fillRect(0, 0, w, h);
      const plotH = h - 44;
      const px = (x) => 16 + x * (w - 32);
      const py = (y) => 12 + y * (plotH - 24);
      ctx.font = "9px ui-monospace, monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      for (const d of DESCR_POS) {
        ctx.fillStyle = "rgba(255,224,178,0.26)";
        ctx.fillText(d.name, px(d.x), py(d.y));
      }
      const A = st.agents;
      const nA = A.length;
      st.refs.forEach((rf, e) => {
        const cnt = new Map();
        for (const a of A) {
          const en = a.lex[e];
          if (en) cnt.set(en.word, (cnt.get(en.word) || 0) + 1);
        }
        let best = null;
        let bc = 0;
        for (const [wd, c] of cnt) if (c > bc) { bc = c; best = wd; }
        const share = nA ? bc / nA : 0;
        const cx = px(rf.x);
        const cy = py(rf.y);
        // consensus ring
        ctx.beginPath();
        ctx.arc(cx, cy, 21, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,176,0,0.12)";
        ctx.lineWidth = 2;
        ctx.stroke();
        if (share > 0) {
          ctx.beginPath();
          ctx.arc(cx, cy, 21, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2);
          ctx.strokeStyle = `rgba(255,176,0,${0.35 + 0.65 * share})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // alien glyph
        ctx.beginPath();
        rf.poly.forEach((rfac, k) => {
          const ang = (k / rf.poly.length) * Math.PI * 2;
          const X = cx + Math.cos(ang) * 13 * rfac;
          const Y = cy + Math.sin(ang) * 13 * rfac;
          k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        });
        ctx.closePath();
        ctx.fillStyle = `hsla(${rf.hue},58%,52%,0.9)`;
        ctx.fill();
        ctx.strokeStyle = `hsl(${rf.hue},70%,72%)`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 2, cy - 2, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = "#14110c";
        ctx.fill();
        // label
        ctx.font = "10px ui-monospace, monospace";
        ctx.fillStyle = best ? "#ffb000" : "rgba(255,224,178,0.4)";
        ctx.fillText(best || "—", cx, cy + 31);
        if (best) {
          ctx.font = "9px ui-monospace, monospace";
          ctx.fillStyle = TEXT;
          ctx.fillText(Math.round(share * 100) + "%", cx, cy + 42);
        }
      });
      // agents row
      const ay = h - 16;
      const ax = (i) => (nA > 1 ? 18 + (i * (w - 36)) / (nA - 1) : w / 2);
      for (let i = 0; i < nA; i++) {
        ctx.beginPath();
        ctx.arc(ax(i), ay, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#231e16";
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = i === fRef.current ? "#ffb000" : OK;
        ctx.stroke();
      }
      ctx.font = "9px ui-monospace, monospace";
      ctx.fillStyle = "rgba(255,224,178,0.4)";
      ctx.textAlign = "left";
      ctx.fillText("agents", 6, ay - 14);
      // last round
      const f = st.flash;
      if (f && f.t > 0) {
        const rf = st.refs[f.e];
        if (rf) {
          const cx = px(rf.x);
          const cy = py(rf.y);
          ctx.strokeStyle = `rgba(${f.ok ? OK_RGB : BAD_RGB},${f.t * 0.9})`;
          ctx.lineWidth = 1.2;
          for (const i of [f.si, f.hi]) {
            ctx.beginPath();
            ctx.moveTo(ax(i), ay - 5);
            ctx.lineTo(cx, cy + 22);
            ctx.stroke();
          }
          ctx.fillStyle = `rgba(255,224,178,${f.t})`;
          ctx.textAlign = "center";
          ctx.fillText("S", ax(f.si), ay - 12);
          ctx.fillText("H", ax(f.hi), ay - 12);
        }
        f.t -= 0.05;
      }
    };

    const drawChart = (dim, series, yMax, opts = {}) => {
      const { ctx, w, h } = dim;
      const padL = 26, padB = 16, padT = 8, padR = 10;
      ctx.fillStyle = "#14110c";
      ctx.fillRect(0, 0, w, h);
      const x0 = padL, y0 = h - padB, x1 = w - padR, y1 = padT;
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.fillStyle = TEXT;
      ctx.font = "9px ui-monospace, monospace";
      ctx.textBaseline = "middle";
      const sy = (v) => y0 + ((y1 - y0) * v) / (yMax || 1);
      for (let g = 0; g <= 2; g++) {
        const yy = y0 + ((y1 - y0) * g) / 2;
        ctx.beginPath();
        ctx.moveTo(x0, yy);
        ctx.lineTo(x1, yy);
        ctx.stroke();
        const val = (yMax * g) / 2;
        ctx.textAlign = "right";
        ctx.fillText(opts.frac ? val.toFixed(1) : Math.round(val), x0 - 4, yy);
      }
      if (opts.hline != null) {
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = opts.hlineColor || TEXT;
        ctx.beginPath();
        ctx.moveTo(x0, sy(opts.hline));
        ctx.lineTo(x1, sy(opts.hline));
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const N = Math.max(2, ...series.map((s) => s.data.length));
      const sx = (i) => x0 + ((x1 - x0) * i) / (N - 1);
      for (const s of series) {
        if (s.data.length < 2) continue;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        s.data.forEach((v, i) => (i ? ctx.lineTo(sx(i), sy(v)) : ctx.moveTo(sx(i), sy(v))));
        ctx.stroke();
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(sx(s.data.length - 1), sy(s.data[s.data.length - 1]), 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = "left";
      ctx.fillStyle = TEXT;
      ctx.fillText("rounds →", x0, h - 6);
    };
    const drawG = () =>
      drawChart(st.dims.g, [{ data: st.hist.g, color: SERIES.g }], 1, {
        frac: true, hline: 0.95, hlineColor: "rgba(70,209,138,0.55)",
      });
    const drawV = () => {
      const yMax = Math.max(nERef.current + 2, ...st.hist.v);
      drawChart(st.dims.v, [{ data: st.hist.v, color: SERIES.v }], yMax, {
        hline: nERef.current, hlineColor: SERIES.target,
      });
    };
    const drawRaster = () => {
      const { ctx, w, h } = st.dims.raster;
      ctx.fillStyle = "#14110c";
      ctx.fillRect(0, 0, w, h);
      const cell = 4;
      const n = Math.min(st.raster.length, Math.floor(w / cell));
      const start = st.raster.length - n;
      for (let k = 0; k < n; k++) {
        const ok = st.raster[start + k];
        ctx.fillStyle = ok ? OK : BAD;
        ctx.fillRect(k * cell, ok ? 2 : 7, 3, ok ? 12 : 7);
      }
    };

    const syncTables = () => {
      const A = st.agents;
      const nA = A.length;
      setRefRows(
        st.refs.map((rf, e) => {
          const cnt = new Map();
          for (const a of A) {
            const en = a.lex[e];
            if (en) cnt.set(en.word, (cnt.get(en.word) || 0) + 1);
          }
          let best = null;
          let bc = 0;
          for (const [wd, c] of cnt) if (c > bc) { bc = c; best = wd; }
          return { e, hue: rf.hue, word: best || "—", share: nA ? bc / nA : 0, anchors: rf.anchors, distinct: cnt.size };
        }),
      );
      const ag = A[fRef.current];
      setAgentRows(
        ag
          ? st.refs.map((rf, e) => {
              const en = ag.lex[e];
              return { e, hue: rf.hue, word: en ? en.word : "—", conf: en ? en.conf : 0 };
            })
          : [],
      );
    };

    const redrawAll = () => {
      drawSpace();
      drawRaster();
      setReadout(metrics());
      drawG();
      drawV();
      syncTables();
    };

    let raf = null;
    let frame = 0;
    let lastT = null;
    let acc = 0;
    const tick = (t) => {
      if (lastT === null) lastT = t;
      const dt = Math.min(0.1, (t - lastT) / 1000);
      lastT = t;
      if (runRef.current) {
        acc += spRef.current * dt; // speed = rounds per second
        let guard = 0;
        while (acc >= 1 && guard < 500) {
          playRound();
          acc -= 1;
          guard++;
        }
      } else acc = 0;
      drawSpace();
      drawRaster();
      if (frame % 6 === 0) {
        setReadout(metrics());
        drawG();
        drawV();
      }
      if (frame % 10 === 0) syncTables();
      frame++;
      raf = requestAnimationFrame(tick);
    };

    apiRef.current = {
      reset: () => { seed(); redrawAll(); },
      step: () => { playRound(); redrawAll(); },
      sync: () => { drawSpace(); syncTables(); },
    };

    const ro = new ResizeObserver(() => {
      layout();
      if (!st.refs.length) seed();
      redrawAll();
    });
    ro.observe(rootRef.current);
    layout();
    seed();
    raf = requestAnimationFrame(tick);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current) {
      setFocus(0);
      apiRef.current.reset?.();
    } else mounted.current = true;
  }, [nA, nE]);
  useEffect(() => {
    apiRef.current.sync?.();
  }, [focus]);

  const ctrl =
    "font-mono text-xs px-3 py-1.5 border border-ink bg-surface text-ink transition-colors hover:bg-accent hover:text-white";
  const swatch = (c) => (
    <span className="inline-block h-2 w-2.5" style={{ backgroundColor: c }} aria-hidden="true" />
  );
  const chip = (hue) => (
    <span
      className="inline-block h-2.5 w-2.5 rounded-sm align-middle"
      style={{ backgroundColor: `hsl(${hue},58%,52%)` }}
      aria-hidden="true"
    />
  );

  return (
    <div ref={rootRef} className="not-prose my-2">
      {/* Embedding space */}
      <div className="terminal">
        <div className="terminal-bar flex items-center gap-3 px-4 py-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 bg-[#ffb000]"></span>
            <span className="h-2.5 w-2.5 bg-[#ffb000]/55"></span>
            <span className="h-2.5 w-2.5 bg-[#ffb000]/30"></span>
          </span>
          <span className="font-mono text-xs text-[#ffb000]/70">
            nsld.py — round {readout.round} · G: {(readout.g * 100) | 0}% · V: {readout.v} · T₀.₉₅:{" "}
            {readout.t95 == null ? "—" : readout.t95 + " ✓"}
          </span>
        </div>
        <div>
          <canvas ref={spaceRef} className="block w-full" />
        </div>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
        <span>blob = alien referent</span>
        <span className="text-[#ffb000]">◔ ring = share of agents agreeing</span>
        <span>faint words = English perceptual base</span>
        <span>
          S/H = speaker/hearer · <span className="text-[#46d18a]">success</span> ·{" "}
          <span className="text-[#e5686a]">failure</span>
        </span>
      </p>

      {/* Raster */}
      <div className="mt-4 border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">
          <span>game outcomes (recent rounds)</span>
          <span>
            <span className="text-[#46d18a]">▮ success</span> <span className="text-[#e5686a]">▮ failure</span>
          </span>
        </div>
        <canvas ref={rasterRef} className="block w-full" />
      </div>

      {/* Plots */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="border border-line">
          <div className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">
            grounding consensus G (dashed = 0.95 threshold)
          </div>
          <canvas ref={gRef} className="block w-full" />
          <div className="px-3 pb-2 font-mono text-[10px] text-muted">
            fraction of agent pairs using the same word for the same referent
          </div>
        </div>
        <div className="border border-line">
          <div className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">
            vocabulary size V (rise, overshoot &amp; collapse)
          </div>
          <canvas ref={vRef} className="block w-full" />
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pb-2 font-mono text-[10px] text-muted">
            <span className="flex items-center gap-1">{swatch(SERIES.v)} words alive</span>
            <span className="flex items-center gap-1">{swatch(SERIES.target)} target n_e (one per referent)</span>
          </div>
        </div>
      </div>

      {/* Referents */}
      <div className="mt-4 border border-line">
        <div className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">
          referents — leading word · agreement · nearest English anchors
        </div>
        <div className="grid gap-x-6 gap-y-1.5 p-3 font-mono text-xs sm:grid-cols-2">
          {refRows.map((r) => (
            <div key={r.e} className="flex items-baseline gap-2">
              {chip(r.hue)}
              <span className="text-accent">{r.word}</span>
              <span className="text-muted">{Math.round(r.share * 100)}%</span>
              {r.distinct > 1 && <span className="text-[#e5686a]">({r.distinct} rivals)</span>}
              <span className="ml-auto text-right text-[11px] text-muted">≈ {r.anchors.join(" · ")}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Agent inspector */}
      <div className="mt-4 border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">
          <span>private lexicon of agent #{focus} (word · confidence)</span>
          <button
            type="button"
            className="border border-line px-2 py-0.5 text-ink transition-colors hover:bg-accent hover:text-white"
            onClick={() => setFocus((f) => (f + 1) % Math.max(1, nA))}
          >
            ▸ next agent
          </button>
        </div>
        <div className="grid gap-x-6 gap-y-1.5 p-3 font-mono text-xs sm:grid-cols-2">
          {agentRows.map((r) => (
            <div key={r.e} className="flex items-center gap-2">
              {chip(r.hue)}
              <span className={r.word === "—" ? "text-muted" : "text-ink"}>{r.word}</span>
              <span className="ml-auto h-1.5 w-20 bg-subtle">
                <span className="block h-full bg-accent" style={{ width: `${Math.round(r.conf * 100)}%` }} />
              </span>
              <span className="w-8 text-right text-muted">{r.conf.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className={ctrl} onClick={() => setRunning((v) => !v)}>
          {running ? "❚❚ pause" : "▶ play"}
        </button>
        <button type="button" className={ctrl} onClick={() => apiRef.current.step?.()}>
          → step
        </button>
        <button type="button" className={ctrl} onClick={() => apiRef.current.reset?.()}>
          ⟳ reset
        </button>
        <label className="flex items-center gap-2 font-mono text-xs text-muted">
          agents
          <input type="range" min="2" max="20" step="1" value={nA}
            onChange={(e) => setNA(Number(e.target.value))} className="accent-[#b45309]" />
          <span className="w-5 tabular-nums text-ink">{nA}</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-xs text-muted">
          referents
          <input type="range" min="3" max="10" step="1" value={nE}
            onChange={(e) => setNE(Number(e.target.value))} className="accent-[#b45309]" />
          <span className="w-5 tabular-nums text-ink">{nE}</span>
        </label>
        <label className="ml-auto flex items-center gap-2 font-mono text-xs text-muted">
          speed (rounds/s)
          <input type="range" min="5" max="400" step="5" value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))} className="accent-[#b45309]" />
          <span className="w-8 tabular-nums text-ink">{speed}</span>
        </label>
      </div>
    </div>
  );
}
