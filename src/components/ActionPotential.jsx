import { useEffect, useRef } from "react";

/**
 * A retro oscilloscope tracing a neuron's membrane potential: a sweeping beam
 * plots resting potential, threshold crossings, sharp action-potential spikes
 * and the after-hyperpolarisation undershoot, with CRT phosphor persistence
 * (old trace fades like a real scope). Amber on dark, no dependencies.
 * Honours prefers-reduced-motion (draws a static trace) and pauses off-screen.
 */
export default function ActionPotential({ height = 120 }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    const h = height;
    let speed = 1.4;
    let x = 0;
    let prevY = null;
    let sinceSpike = 0.5;
    let interval = 1.2;
    let raf = null;
    let running = false;
    const dt = 0.012;

    // Normalised membrane potential: rest = 0, spike peak ≈ 1.12,
    // after-hyperpolarisation undershoot ≈ −0.26.
    const ap = (t) => {
      if (t > 1.2) return 0;
      const peak = 1.12 * Math.exp(-((t - 0.13) ** 2) / (2 * 0.033 ** 2));
      const under = 0.26 * Math.exp(-((t - 0.32) ** 2) / (2 * 0.11 ** 2));
      return peak - under;
    };
    const rest = () => h * 0.7;
    const yOf = (v) => rest() - v * h * 0.5;
    const nextInterval = () => 0.6 + Math.random() * 0.7;

    const drawGrid = () => {
      ctx.strokeStyle = "rgba(255,176,0,0.06)";
      ctx.lineWidth = 1;
      const step = 24;
      for (let gx = 0; gx < w; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx + 0.5, 0);
        ctx.lineTo(gx + 0.5, h);
        ctx.stroke();
      }
      for (let gy = 0; gy < h; gy += step) {
        ctx.beginPath();
        ctx.moveTo(0, gy + 0.5);
        ctx.lineTo(w, gy + 0.5);
        ctx.stroke();
      }
      // reference levels
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255,176,0,0.16)";
      const ry = yOf(0);
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(w, ry);
      ctx.stroke();
      ctx.strokeStyle = "rgba(140,255,201,0.14)";
      const ty = yOf(0.32);
      ctx.beginPath();
      ctx.moveTo(0, ty);
      ctx.lineTo(w, ty);
      ctx.stroke();
      ctx.setLineDash([]);
      // labels
      ctx.font = "9px ui-monospace, monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillStyle = "rgba(255,224,178,0.5)";
      ctx.fillText("+40 mV", 6, yOf(1.06));
      ctx.fillText("V_rest  −70 mV", 6, ry - 7);
      ctx.fillStyle = "rgba(140,255,201,0.5)";
      ctx.fillText("threshold", 6, ty - 7);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(255,176,0,0.55)";
      ctx.fillText("membrane.v", w - 6, 11);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrapRef.current.clientWidth;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      speed = w / 560;
      x = 0;
      prevY = null;
      ctx.fillStyle = "#14110c";
      ctx.fillRect(0, 0, w, h);
      drawGrid();
      if (reduce) drawStatic();
    };

    // one full deterministic sweep, no animation
    const drawStatic = () => {
      ctx.strokeStyle = "#ffb000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      let ss = 0.3;
      let iv = 1.1;
      for (let px = 0; px <= w; px++) {
        ss += dt;
        if (ss >= iv) {
          ss = 0;
          iv = 1.1;
        }
        const y = yOf(ap(ss));
        px ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
      }
      ctx.stroke();
    };

    const frame = () => {
      // phosphor fade (softer = longer-lived trace)
      ctx.fillStyle = "rgba(20,17,12,0.055)";
      ctx.fillRect(0, 0, w, h);
      drawGrid();

      const steps = 2; // sub-steps per frame for a smooth trace
      for (let k = 0; k < steps; k++) {
        sinceSpike += dt / steps;
        if (sinceSpike >= interval) {
          sinceSpike = 0;
          interval = nextInterval();
        }
        const v = ap(sinceSpike) + (Math.random() - 0.5) * 0.03;
        const y = yOf(v);
        const nx = x + speed / steps;
        if (nx >= w) {
          x = 0;
          prevY = null;
          continue;
        }
        if (prevY != null) {
          ctx.strokeStyle = "#ffb000";
          ctx.lineWidth = 2;
          ctx.shadowColor = "rgba(255,176,0,0.7)";
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(x, prevY);
          ctx.lineTo(nx, y);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
        x = nx;
        prevY = y;
      }
      // bright beam head
      if (prevY != null) {
        ctx.beginPath();
        ctx.arc(x, prevY, 2, 0, Math.PI * 2);
        ctx.fillStyle = "#fff0d0";
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running || reduce) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    };
    const onVis = () => (document.hidden ? stop() : start());

    const ro = new ResizeObserver(() => resize());
    ro.observe(wrapRef.current);
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    io.observe(canvas);
    document.addEventListener("visibilitychange", onVis);

    resize();
    if (!reduce) start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [height]);

  return (
    <div ref={wrapRef} className="w-full">
      <canvas ref={canvasRef} className="block w-full" aria-hidden="true" />
    </div>
  );
}
