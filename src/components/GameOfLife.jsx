import { useEffect, useRef, useState } from "react";

/**
 * Conway's Game of Life on a toroidal grid, rendered on <canvas> in the site's
 * amber-CRT style. Click/drag to draw. Controls: play/pause, step, random,
 * clear, speed. No dependencies.
 */
export default function GameOfLife({ cell = 13, height = 340 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const gridRef = useRef(null);
  const dimRef = useRef({ cols: 0, rows: 0 });
  const apiRef = useRef({});
  const paintRef = useRef({ active: false, val: 1 });

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const [running, setRunning] = useState(!prefersReduced);
  const [gen, setGen] = useState(0);
  const [pop, setPop] = useState(0);
  const [delay, setDelay] = useState(110);
  const [cellSize, setCellSize] = useState(cell); // user-adjustable cell size

  const runningRef = useRef(running);
  const delayRef = useRef(delay);
  runningRef.current = running;
  delayRef.current = delay;

  useEffect(() => {
    const cell = cellSize; // rebuild grid whenever the user changes the size
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const randomGrid = (cols, rows, p = 0.28) => {
      const g = new Uint8Array(cols * rows);
      for (let i = 0; i < g.length; i++) g[i] = Math.random() < p ? 1 : 0;
      return g;
    };
    const countPop = () => {
      const g = gridRef.current;
      let s = 0;
      for (let i = 0; i < g.length; i++) s += g[i];
      return s;
    };

    const draw = () => {
      const { cols, rows } = dimRef.current;
      const g = gridRef.current;
      const W = cols * cell;
      const H = rows * cell;
      ctx.fillStyle = "#14110c";
      ctx.fillRect(0, 0, W, H);
      // faint grid
      ctx.strokeStyle = "rgba(255,176,0,0.07)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= cols; x++) {
        ctx.moveTo(x * cell + 0.5, 0);
        ctx.lineTo(x * cell + 0.5, H);
      }
      for (let y = 0; y <= rows; y++) {
        ctx.moveTo(0, y * cell + 0.5);
        ctx.lineTo(W, y * cell + 0.5);
      }
      ctx.stroke();
      // live cells
      ctx.fillStyle = "#ffb000";
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (g[y * cols + x]) {
            ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
          }
        }
      }
    };

    const step = () => {
      const { cols, rows } = dimRef.current;
      const g = gridRef.current;
      const n = new Uint8Array(cols * rows);
      let population = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let c = 0;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx || dy) {
                const nx = (x + dx + cols) % cols;
                const ny = (y + dy + rows) % rows;
                c += g[ny * cols + nx];
              }
            }
          }
          const alive = g[y * cols + x];
          const next = (alive && (c === 2 || c === 3)) || (!alive && c === 3) ? 1 : 0;
          n[y * cols + x] = next;
          population += next;
        }
      }
      gridRef.current = n;
      return population;
    };

    const setup = () => {
      const w = wrapRef.current.clientWidth;
      const cols = Math.max(8, Math.floor(w / cell));
      const rows = Math.max(8, Math.floor(height / cell));
      const prev = dimRef.current;
      dimRef.current = { cols, rows };
      canvas.width = cols * cell * dpr;
      canvas.height = rows * cell * dpr;
      canvas.style.width = cols * cell + "px";
      canvas.style.height = rows * cell + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (!gridRef.current) {
        gridRef.current = randomGrid(cols, rows);
        setGen(0);
      } else if (prev.cols !== cols || prev.rows !== rows) {
        // preserve the overlapping region on resize
        const old = gridRef.current;
        const ng = new Uint8Array(cols * rows);
        const oc = prev.cols || 0;
        const or = prev.rows || 0;
        for (let y = 0; y < Math.min(rows, or); y++) {
          for (let x = 0; x < Math.min(cols, oc); x++) {
            ng[y * cols + x] = old[y * oc + x];
          }
        }
        gridRef.current = ng;
      }
      setPop(countPop());
      draw();
    };

    // --- expose controls to the buttons ---
    apiRef.current = {
      step: () => {
        const p = step();
        setGen((v) => v + 1);
        setPop(p);
        draw();
      },
      random: () => {
        const { cols, rows } = dimRef.current;
        gridRef.current = randomGrid(cols, rows);
        setGen(0);
        setPop(countPop());
        draw();
      },
      clear: () => {
        const { cols, rows } = dimRef.current;
        gridRef.current = new Uint8Array(cols * rows);
        setGen(0);
        setPop(0);
        draw();
      },
    };

    // --- drawing with the pointer ---
    const cellFromEvent = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: Math.floor((e.clientX - r.left) / cell),
        y: Math.floor((e.clientY - r.top) / cell),
      };
    };
    const paintAt = (e) => {
      const { x, y } = cellFromEvent(e);
      const { cols, rows } = dimRef.current;
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      gridRef.current[y * cols + x] = paintRef.current.val;
      draw();
    };
    const onDown = (e) => {
      const { x, y } = cellFromEvent(e);
      const { cols, rows } = dimRef.current;
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      const idx = y * cols + x;
      paintRef.current = { active: true, val: gridRef.current[idx] ? 0 : 1 };
      gridRef.current[idx] = paintRef.current.val;
      setPop(countPop());
      draw();
      canvas.setPointerCapture?.(e.pointerId);
    };
    const onMove = (e) => {
      if (paintRef.current.active) paintAt(e);
    };
    const onUp = () => {
      if (paintRef.current.active) {
        paintRef.current.active = false;
        setPop(countPop());
      }
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // --- run loop (self-scheduling; honours running/delay refs) ---
    let timer = null;
    const tick = () => {
      if (runningRef.current) {
        const p = step();
        setGen((v) => v + 1);
        setPop(p);
        draw();
      }
      timer = setTimeout(tick, delayRef.current);
    };

    const ro = new ResizeObserver(() => setup());
    ro.observe(wrapRef.current);
    setup();
    tick();

    return () => {
      clearTimeout(timer);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [cellSize, height]);

  const ctrlClass =
    "font-mono text-xs px-3 py-1.5 border border-ink bg-surface text-ink transition-colors hover:bg-accent hover:text-white";

  return (
    <div className="not-prose my-2">
      <div className="terminal">
        <div className="terminal-bar flex items-center gap-3 px-4 py-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 bg-[#ffb000]"></span>
            <span className="h-2.5 w-2.5 bg-[#ffb000]/55"></span>
            <span className="h-2.5 w-2.5 bg-[#ffb000]/30"></span>
          </span>
          <span className="font-mono text-xs text-[#ffb000]/70">
            life.c — gen {gen} · pop {pop}
          </span>
        </div>
        <div ref={wrapRef} className="crt relative flex justify-center">
          <canvas
            ref={canvasRef}
            className="block touch-none"
            style={{ cursor: "crosshair" }}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={ctrlClass}
          onClick={() => setRunning((r) => !r)}
        >
          {running ? "❚❚ pause" : "▶ play"}
        </button>
        <button
          type="button"
          className={ctrlClass}
          onClick={() => apiRef.current.step?.()}
        >
          → step
        </button>
        <button
          type="button"
          className={ctrlClass}
          onClick={() => apiRef.current.random?.()}
        >
          ⚂ random
        </button>
        <button
          type="button"
          className={ctrlClass}
          onClick={() => apiRef.current.clear?.()}
        >
          ✕ clear
        </button>

        <div className="flex items-center gap-1">
          <span className="mr-1 font-mono text-xs text-muted">size</span>
          {[
            { k: "S", v: 9 },
            { k: "M", v: 13 },
            { k: "L", v: 20 },
          ].map(({ k, v }) => (
            <button
              key={k}
              type="button"
              onClick={() => setCellSize(v)}
              className={`border px-2.5 py-1.5 font-mono text-xs transition-colors ${
                cellSize === v
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-ink bg-surface text-ink hover:bg-accent hover:text-white"
              }`}
            >
              {k}
            </button>
          ))}
        </div>

        <label className="ml-auto flex items-center gap-2 font-mono text-xs text-muted">
          speed
          <input
            type="range"
            min="30"
            max="300"
            step="10"
            value={330 - delay}
            onChange={(e) => setDelay(330 - Number(e.target.value))}
            className="accent-[#b45309]"
          />
        </label>
      </div>
    </div>
  );
}
