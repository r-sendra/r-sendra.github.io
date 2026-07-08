import { useEffect, useRef, useState } from "react";

/**
 * A simplified, browser-friendly recreation of the pipeline in
 * Sendra-Arranz & Gutiérrez, *Cultural evolution of perceptually grounded
 * compositional lexicons in swarm robotics systems*, Applied Soft Computing
 * (2026). We recreate the paper's Experiment 1 referent set (3 object types),
 * so the swarm converges toward the same 17-word lexicon (6 elementary +
 * 11 composed).
 *
 * Robots SENSE nearby objects, DISCRIMINATE colour, shape and quality, GROUND
 * elementary meanings (inventing a word each), and build COMPOSED meanings by
 * Hebbian association (cascading: colour+shape, then +quality). Local naming
 * games converge the words. Plots track the vocabulary overshoot-and-collapse
 * and the lexicon sharing score; an inspector shows one robot's Meaning
 * Association Network.
 */

const COLORS = [
  { name: "red", hex: "#e5484d" },
  { name: "green", hex: "#46b04e" },
  { name: "blue", hex: "#4f8ff7" },
];
const SHAPES = ["cube", "sphere", "pyramid"];

// Experiment 1 referents: low-Q red cube, high-Q blue sphere, high-Q blue cube
const REFERENTS = [
  { c: 0, s: 0, q: 0 },
  { c: 2, s: 1, q: 1 },
  { c: 2, s: 0, q: 1 },
];

const SERIES = { total: "#c98500", elem: "#199e70", comp: "#3987e5" };
const TEXT = "rgba(255,224,178,0.75)";
const GRID = "rgba(255,176,0,0.10)";
const LVL = {
  1: { fill: "#173327", ring: "#46d18a" }, // elementary — green
  2: { fill: "#4a2f12", ring: "#e8912b" }, // composed lv1 — orange
  3: { fill: "#4a1717", ring: "#e5686a" }, // composed lv2 — red
};
const ELEM_SLOTS = ["c0", "c1", "c2", "s0", "s1", "s2", "q0", "q1"];

const CONS = "bdfghjklmnprstvwxz".split("");
const VOW = "aeiou".split("");
function wordName(id) {
  let n = (id * 2654435761 + 12345) >>> 0;
  let s = "";
  for (let k = 0; k < 3; k++) {
    s += CONS[n % CONS.length];
    n = Math.floor(n / CONS.length);
    s += VOW[n % VOW.length];
    n = ((n + 1) * 2246822519) >>> 0;
  }
  return s;
}

// concept = a set of elementary attribute tokens (c#, s#, q#), canonical id
// is the tokens sorted and joined by "|".  elementary = 1 token.
const attrsOf = (id) => id.split("|");
const canonical = (arr) => [...arr].sort().join("|");
const level = (id) => attrsOf(id).length;
const isComp = (id) => id.indexOf("|") >= 0;
const ATTR_ORDER = { c: 0, s: 1, q: 2 };
function attrLabel(a) {
  const i = +a[1];
  if (a[0] === "c") return COLORS[i].name;
  if (a[0] === "s") return SHAPES[i];
  return i === 1 ? "high-Q" : "low-Q";
}
function conceptLabel(id) {
  return attrsOf(id)
    .slice()
    .sort((x, y) => ATTR_ORDER[x[0]] - ATTR_ORDER[y[0]])
    .map(attrLabel)
    .join("+");
}
const attrDot = (a) =>
  a[0] === "c" ? COLORS[+a[1]].hex : a[0] === "s" ? "#c9beac" : +a[1] ? "#ffd479" : "#6f5c33";

const CAP = 480;

export default function SwarmLexicon() {
  const rootRef = useRef(null);
  const arenaRef = useRef(null);
  const vocabRef = useRef(null);
  const shareRef = useRef(null);
  const manRef = useRef(null);
  const S = useRef({
    robots: [],
    objects: [],
    flashes: [],
    next: 0,
    hist: { u: [], ue: [], uc: [], lss: [] },
    pushEvery: 1,
    pushCount: 0,
    dims: {},
  });
  const apiRef = useRef({});

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [running, setRunning] = useState(!reduced);
  const [nRobots, setNRobots] = useState(24);
  const [speed, setSpeed] = useState(8);
  const [rangeFrac, setRangeFrac] = useState(0.18);
  const [focus, setFocus] = useState(0);
  const [readout, setReadout] = useState({ u: 0, lss: 0, comp: 0 });
  const [lexList, setLexList] = useState([]);

  const runRef = useRef(running);
  const nRef = useRef(nRobots);
  const spRef = useRef(speed);
  const rgRef = useRef(rangeFrac);
  const fRef = useRef(focus);
  runRef.current = running;
  nRef.current = nRobots;
  spRef.current = speed;
  rgRef.current = rangeFrac;
  fRef.current = focus;

  useEffect(() => {
    const st = S.current;
    const SENSE = 46;
    const COMP_TH = 5;
    const MOVE = 0.5;

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
      st.dims.arena = ctxOf(arenaRef, 340);
      st.dims.vocab = ctxOf(vocabRef, 160);
      st.dims.share = ctxOf(shareRef, 160);
      st.dims.man = ctxOf(manRef, 288);
    };

    const makeObjects = () => {
      const { w, h } = st.dims.arena;
      const list = [];
      for (let k = 0; k < 5; k++) for (const r of REFERENTS) list.push(r);
      st.objects = list.map((r) => ({
        c: r.c,
        s: r.s,
        q: r.q,
        x: 30 + Math.random() * (w - 60),
        y: 30 + Math.random() * (h - 60),
      }));
    };

    const seed = () => {
      const { w, h } = st.dims.arena;
      st.next = 0;
      st.hist = { u: [], ue: [], uc: [], lss: [] };
      st.pushEvery = 1;
      st.pushCount = 0;
      st.flashes = [];
      makeObjects();
      st.robots = Array.from({ length: nRef.current }, () => ({
        x: 20 + Math.random() * (w - 40),
        y: 20 + Math.random() * (h - 40),
        dir: Math.random() * Math.PI * 2,
        lex: {},
        g: new Set(),
        par: {},
        tr: {},
      }));
    };

    const ground = (r, cid, parents) => {
      if (!r.g.has(cid)) {
        r.g.add(cid);
        r.lex[cid] = [st.next++];
        if (parents) r.par[cid] = parents;
      }
    };

    const sense = (r) => {
      let best = null;
      let bd = SENSE * SENSE;
      for (const o of st.objects) {
        const dx = o.x - r.x;
        const dy = o.y - r.y;
        const d = dx * dx + dy * dy;
        if (d < bd) {
          bd = d;
          best = o;
        }
      }
      if (!best) return;
      const objAttrs = ["c" + best.c, "s" + best.s, "q" + best.q];
      for (const a of objAttrs) ground(r, a);
      // Hebbian: pairs of currently-active meanings (subset of object attrs)
      const active = [...r.g].filter((id) =>
        attrsOf(id).every((a) => objAttrs.includes(a)),
      );
      for (let i = 0; i < active.length; i++)
        for (let j = i + 1; j < active.length; j++) {
          const A = attrsOf(active[i]);
          const B = attrsOf(active[j]);
          if (A.some((a) => B.includes(a))) continue; // must be disjoint
          if (A.length + B.length > 3) continue;
          const uid = canonical([...A, ...B]);
          if (r.g.has(uid)) continue;
          r.tr[uid] = (r.tr[uid] || 0) + 1;
          if (r.tr[uid] >= COMP_TH) ground(r, uid, [active[i], active[j]]);
        }
      st.flashes.push({ x1: r.x, y1: r.y, x2: best.x, y2: best.y, t: 1, s: 1 });
    };

    const game = () => {
      const A = st.robots;
      const n = A.length;
      if (n < 2) return;
      const s = A[(Math.random() * n) | 0];
      const keys = Object.keys(s.lex);
      if (!keys.length) return;
      const R = rgRef.current * Math.min(st.dims.arena.w, st.dims.arena.h);
      const R2 = R * R;
      let h = null;
      let cnt = 0;
      for (const b of A) {
        if (b === s) continue;
        const dx = b.x - s.x;
        const dy = b.y - s.y;
        if (dx * dx + dy * dy < R2) {
          cnt++;
          if (Math.random() < 1 / cnt) h = b;
        }
      }
      if (!h) return;
      const cid = keys[(Math.random() * keys.length) | 0];
      const inv = s.lex[cid];
      const w = inv[(Math.random() * inv.length) | 0];
      let parents = null;
      if (isComp(cid)) {
        parents = s.par[cid];
        if (!parents || !(h.g.has(parents[0]) && h.g.has(parents[1]))) return;
      }
      if (h.g.has(cid)) {
        const hi = h.lex[cid];
        if (hi.includes(w)) {
          h.lex[cid] = [w];
          s.lex[cid] = [w];
          st.flashes.push({ x1: s.x, y1: s.y, x2: h.x, y2: h.y, t: 1, s: 0 });
        } else {
          hi.push(w);
        }
      } else {
        h.g.add(cid);
        h.lex[cid] = [w];
        if (parents) h.par[cid] = parents;
      }
    };

    const move = () => {
      const { w, h } = st.dims.arena;
      for (const r of st.robots) {
        r.dir += (Math.random() - 0.5) * 0.3;
        r.x += Math.cos(r.dir) * MOVE;
        r.y += Math.sin(r.dir) * MOVE;
        if (r.x < 8) {
          r.x = 8;
          r.dir = Math.PI - r.dir;
        } else if (r.x > w - 8) {
          r.x = w - 8;
          r.dir = Math.PI - r.dir;
        }
        if (r.y < 8) {
          r.y = 8;
          r.dir = -r.dir;
        } else if (r.y > h - 8) {
          r.y = h - 8;
          r.dir = -r.dir;
        }
      }
    };

    // ---------- drawing ----------
    const drawObject = (ctx, o) => {
      ctx.fillStyle = COLORS[o.c].hex;
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 1;
      const s = 9;
      if (o.s === 0) {
        ctx.fillRect(o.x - s / 2, o.y - s / 2, s, s);
        ctx.strokeRect(o.x - s / 2, o.y - s / 2, s, s);
      } else if (o.s === 1) {
        ctx.beginPath();
        ctx.arc(o.x, o.y, s / 2 + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(o.x, o.y - s / 2 - 1);
        ctx.lineTo(o.x + s / 2 + 1, o.y + s / 2);
        ctx.lineTo(o.x - s / 2 - 1, o.y + s / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      // quality bar underneath (bright = high, dim = low)
      ctx.fillStyle = o.q === 1 ? "#ffd479" : "#6f5c33";
      ctx.fillRect(o.x - 4, o.y + 8, 8, 2);
    };

    const drawRobot = (ctx, r, focused) => {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.dir);
      ctx.fillStyle = "#0b0906";
      ctx.fillRect(-3, -9, 6, 2.4);
      ctx.fillRect(-3, 6.6, 6, 2.4);
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fillStyle = "#231e16";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#46d18a";
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.lineTo(1.5, -2.4);
      ctx.lineTo(1.5, 2.4);
      ctx.closePath();
      ctx.fillStyle = "#8affc9";
      ctx.fill();
      ctx.restore();
      if (focused) {
        ctx.beginPath();
        ctx.arc(r.x, r.y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(255,176,0,0.95)";
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };

    const drawArena = () => {
      const { ctx, w, h } = st.dims.arena;
      ctx.fillStyle = "#14110c";
      ctx.fillRect(0, 0, w, h);
      for (let i = st.flashes.length - 1; i >= 0; i--) {
        const f = st.flashes[i];
        ctx.strokeStyle =
          f.s === 1
            ? `rgba(140,255,201,${f.t * 0.3})`
            : `rgba(255,176,0,${f.t * 0.55})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(f.x1, f.y1);
        ctx.lineTo(f.x2, f.y2);
        ctx.stroke();
        f.t -= 0.06;
        if (f.t <= 0) st.flashes.splice(i, 1);
      }
      for (const o of st.objects) drawObject(ctx, o);
      const fi = fRef.current;
      st.robots.forEach((r, i) => drawRobot(ctx, r, i === fi));
    };

    const drawChart = (dim, series, yMax, opts = {}) => {
      const { ctx, w, h } = dim;
      const padL = 26;
      const padB = 16;
      const padT = 8;
      const padR = 10;
      ctx.fillStyle = "#14110c";
      ctx.fillRect(0, 0, w, h);
      const x0 = padL;
      const y0 = h - padB;
      const x1 = w - padR;
      const y1 = padT;
      ctx.strokeStyle = GRID;
      ctx.lineWidth = 1;
      ctx.fillStyle = TEXT;
      ctx.font = "9px ui-monospace, monospace";
      ctx.textBaseline = "middle";
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
      const N = Math.max(2, ...series.map((s) => s.data.length));
      const sx = (i) => x0 + ((x1 - x0) * i) / (N - 1);
      const sy = (v) => y0 + ((y1 - y0) * v) / (yMax || 1);
      for (const s of series) {
        if (s.data.length < 2) continue;
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        s.data.forEach((v, i) => {
          const X = sx(i);
          const Y = sy(v);
          i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
        });
        ctx.stroke();
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(sx(s.data.length - 1), sy(s.data[s.data.length - 1]), 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = "left";
      ctx.fillStyle = TEXT;
      ctx.fillText("time →", x0, h - 6);
    };

    const drawVocab = () => {
      const H = st.hist;
      const yMax = Math.max(4, ...H.u);
      drawChart(
        st.dims.vocab,
        [
          { data: H.u, color: SERIES.total },
          { data: H.ue, color: SERIES.elem },
          { data: H.uc, color: SERIES.comp },
        ],
        yMax,
      );
    };
    const drawShare = () => {
      drawChart(st.dims.share, [{ data: st.hist.lss, color: "#ffb000" }], 1, {
        frac: true,
      });
    };

    const drawMAN = () => {
      const { ctx, w, h } = st.dims.man;
      ctx.fillStyle = "#14110c";
      ctx.fillRect(0, 0, w, h);
      const r = st.robots[fRef.current];
      if (!r) return;
      const padT = 14;
      const padB = 24;
      const yAt = (i, tot) =>
        padT + ((h - padT - padB) * (i + 0.5)) / Math.max(1, tot);
      const xE = Math.max(58, w * 0.15);
      const x2 = w * 0.5;
      const x3 = w - Math.max(58, w * 0.16);
      const pos = {};
      // elementary in fixed slots
      const groundedElem = ELEM_SLOTS.filter((id) => r.g.has(id));
      groundedElem.forEach((id) => {
        const slot = ELEM_SLOTS.indexOf(id);
        pos[id] = [xE, yAt(slot, ELEM_SLOTS.length)];
      });
      const lv2 = [...r.g].filter((id) => level(id) === 2).sort();
      const lv3 = [...r.g].filter((id) => level(id) === 3).sort();
      lv2.forEach((id, i) => (pos[id] = [x2, yAt(i, lv2.length)]));
      lv3.forEach((id, i) => (pos[id] = [x3, yAt(i, lv3.length)]));

      ctx.font = "9px ui-monospace, monospace";
      ctx.textBaseline = "middle";
      // edges
      ctx.strokeStyle = "rgba(255,224,178,0.2)";
      ctx.lineWidth = 1;
      for (const id of [...lv2, ...lv3]) {
        const par = r.par[id];
        if (!par) continue;
        for (const p of par) {
          if (pos[p]) {
            ctx.beginPath();
            ctx.moveTo(pos[id][0], pos[id][1]);
            ctx.lineTo(pos[p][0], pos[p][1]);
            ctx.stroke();
          }
        }
      }
      const node = (id, labelSide) => {
        const [x, y] = pos[id];
        const lv = level(id);
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fillStyle = LVL[lv].fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = LVL[lv].ring;
        ctx.stroke();
        if (lv === 1) {
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fillStyle = attrDot(id);
          ctx.fill();
          ctx.fillStyle = TEXT;
          ctx.textAlign = "right";
          ctx.fillText(conceptLabel(id), x - 11, y);
        } else {
          const inv = r.lex[id];
          const word = inv && inv.length === 1 ? wordName(inv[0]) : "…";
          if (labelSide === "left") {
            ctx.textAlign = "right";
            ctx.fillStyle = "rgba(255,176,0,0.85)";
            ctx.fillText(word, x - 11, y);
          } else {
            ctx.textAlign = "left";
            ctx.fillStyle = "rgba(255,176,0,0.85)";
            ctx.fillText(word, x + 11, y);
          }
        }
      };
      groundedElem.forEach((id) => node(id));
      lv2.forEach((id) => node(id, "right"));
      lv3.forEach((id) => node(id, "left"));

      // legend
      ctx.textAlign = "left";
      ctx.fillStyle = LVL[1].ring;
      ctx.fillText("● elementary", 8, h - 9);
      ctx.fillStyle = LVL[2].ring;
      ctx.fillText("● composed·2", 92, h - 9);
      ctx.fillStyle = LVL[3].ring;
      ctx.fillText("● composed·3", 184, h - 9);
    };

    const pushHist = (u, ue, uc, lss) => {
      st.pushCount++;
      if (st.pushCount % st.pushEvery !== 0) return;
      const H = st.hist;
      H.u.push(u);
      H.ue.push(ue);
      H.uc.push(uc);
      H.lss.push(lss);
      if (H.u.length > CAP) {
        for (const k of ["u", "ue", "uc", "lss"])
          H[k] = H[k].filter((_, i) => i % 2 === 0);
        st.pushEvery *= 2;
      }
    };

    const metrics = () => {
      const A = st.robots;
      const ue = new Set();
      const uc = new Set();
      const sets = [];
      for (const r of A) {
        const own = new Set();
        for (const cid in r.lex) {
          const target = isComp(cid) ? uc : ue;
          for (const wd of r.lex[cid]) {
            target.add(wd);
            own.add(wd);
          }
        }
        sets.push(own);
      }
      let sum = 0;
      let pairs = 0;
      for (let i = 0; i < sets.length; i++)
        for (let j = i + 1; j < sets.length; j++) {
          const a = sets[i];
          const b = sets[j];
          const [sm, bg] = a.size < b.size ? [a, b] : [b, a];
          let inter = 0;
          for (const x of sm) if (bg.has(x)) inter++;
          const uni = a.size + b.size - inter;
          sum += uni ? inter / uni : 1;
          pairs++;
        }
      const lss = pairs ? sum / pairs : 0;
      pushHist(ue.size + uc.size, ue.size, uc.size, lss);
      return { u: ue.size + uc.size, comp: uc.size, lss };
    };

    const syncPanels = () => {
      const r = st.robots[fRef.current];
      if (!r) return setLexList([]);
      const rows = [];
      for (const cid in r.lex) {
        const inv = r.lex[cid];
        rows.push({
          id: cid,
          label: conceptLabel(cid),
          lv: level(cid),
          word: inv.length === 1 ? wordName(inv[0]) : "…",
        });
      }
      rows.sort((a, b) => a.lv - b.lv);
      setLexList(rows);
    };

    let raf = null;
    let frame = 0;
    const tick = () => {
      if (runRef.current) {
        for (const r of st.robots) sense(r);
        const g = spRef.current;
        for (let i = 0; i < g; i++) game();
        move();
      }
      drawArena();
      if (frame % 8 === 0) {
        setReadout(metrics());
        drawVocab();
        drawShare();
        drawMAN();
      }
      if (frame % 12 === 0) syncPanels();
      frame++;
      raf = requestAnimationFrame(tick);
    };

    apiRef.current = {
      reset: () => {
        seed();
        metrics();
        drawArena();
        drawVocab();
        drawShare();
        drawMAN();
        syncPanels();
      },
      sync: () => {
        drawMAN();
        drawArena();
        syncPanels();
      },
    };

    const ro = new ResizeObserver(() => {
      layout();
      if (!st.robots.length) seed();
      drawArena();
      drawVocab();
      drawShare();
      drawMAN();
    });
    ro.observe(rootRef.current);
    layout();
    seed();
    tick();

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
  }, [nRobots]);

  useEffect(() => {
    apiRef.current.sync?.();
  }, [focus]);

  const ctrl =
    "font-mono text-xs px-3 py-1.5 border border-ink bg-surface text-ink transition-colors hover:bg-accent hover:text-white";
  const swatch = (c) => (
    <span
      className="inline-block h-2 w-2.5"
      style={{ backgroundColor: c }}
      aria-hidden="true"
    />
  );
  const lvColor = { 1: "text-ink", 2: "text-[#e8912b]", 3: "text-[#e5686a]" };

  return (
    <div ref={rootRef} className="not-prose my-2">
      {/* Arena */}
      <div className="terminal">
        <div className="terminal-bar flex items-center gap-3 px-4 py-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 bg-[#ffb000]"></span>
            <span className="h-2.5 w-2.5 bg-[#ffb000]/55"></span>
            <span className="h-2.5 w-2.5 bg-[#ffb000]/30"></span>
          </span>
          <span className="font-mono text-xs text-[#ffb000]/70">
            arena.py — words: {readout.u} · composed: {readout.comp} · sharing:{" "}
            {(readout.lss * 100) | 0}%
          </span>
        </div>
        <div>
          <canvas ref={arenaRef} className="block w-full" />
        </div>
      </div>

      {/* legend */}
      <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-muted">
        <span className="text-[#46d18a]">◉ robot (e-puck)</span>
        <span>■ ● ▲ = cube / sphere / pyramid</span>
        <span className="flex items-center gap-1">
          {swatch(COLORS[0].hex)}
          {swatch(COLORS[2].hex)} colour
        </span>
        <span className="flex items-center gap-1">
          {swatch("#ffd479")}
          {swatch("#6f5c33")} quality (hi / lo)
        </span>
        <span className="text-[#ffb000]">
          — game · <span className="text-[#8affc9]">— sensing</span>
        </span>
      </p>

      {/* Plots */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="border border-line">
          <div className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">
            vocabulary size (rise &amp; collapse)
          </div>
          <canvas ref={vocabRef} className="block w-full" />
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-3 pb-2 font-mono text-[10px] text-muted">
            <span className="flex items-center gap-1">{swatch(SERIES.total)} υ total</span>
            <span className="flex items-center gap-1">{swatch(SERIES.elem)} elementary</span>
            <span className="flex items-center gap-1">{swatch(SERIES.comp)} composed</span>
          </div>
        </div>
        <div className="border border-line">
          <div className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">
            lexicon sharing score (→ 1 = full agreement)
          </div>
          <canvas ref={shareRef} className="block w-full" />
          <div className="px-3 pb-2 font-mono text-[10px] text-muted">
            average vocabulary overlap between every pair of robots
          </div>
        </div>
      </div>

      {/* MAN */}
      <div className="mt-4 border border-line">
        <div className="flex items-center justify-between border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">
          <span>meaning association network — robot #{focus}</span>
          <button
            type="button"
            className="border border-line px-2 py-0.5 text-ink transition-colors hover:bg-accent hover:text-white"
            onClick={() => setFocus((f) => (f + 1) % Math.max(1, nRobots))}
          >
            ▸ next robot
          </button>
        </div>
        <canvas ref={manRef} className="block w-full" />
      </div>

      {/* lexicon list */}
      <div className="mt-4 border border-line">
        <div className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">
          its grounded lexicon (concept = word)
        </div>
        <div className="p-3 font-mono text-xs">
          {lexList.length === 0 && <span className="text-muted">exploring…</span>}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {lexList.map((r) => (
              <span key={r.id} className={lvColor[r.lv]}>
                {r.label}=<span className="text-accent">{r.word}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className={ctrl} onClick={() => setRunning((v) => !v)}>
          {running ? "❚❚ pause" : "▶ play"}
        </button>
        <button type="button" className={ctrl} onClick={() => apiRef.current.reset?.()}>
          ⟳ reset
        </button>
        <label className="flex items-center gap-2 font-mono text-xs text-muted">
          robots
          <input
            type="range"
            min="12"
            max="40"
            step="2"
            value={nRobots}
            onChange={(e) => setNRobots(Number(e.target.value))}
            className="accent-[#b45309]"
          />
          <span className="w-5 tabular-nums text-ink">{nRobots}</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-xs text-muted">
          range
          <input
            type="range"
            min="0.1"
            max="0.32"
            step="0.02"
            value={rangeFrac}
            onChange={(e) => setRangeFrac(Number(e.target.value))}
            className="accent-[#b45309]"
          />
        </label>
        <label className="ml-auto flex items-center gap-2 font-mono text-xs text-muted">
          speed
          <input
            type="range"
            min="1"
            max="18"
            step="1"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="accent-[#b45309]"
          />
        </label>
      </div>
    </div>
  );
}
