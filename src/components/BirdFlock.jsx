import { useEffect, useRef } from "react";

/**
 * A flock of boids rendered as little flapping "V" birds on <canvas>.
 *
 * Classic Reynolds flocking (alignment, cohesion, separation); each bird is
 * drawn as a chevron oriented to its heading, wings gently flapping. The flock
 * is softly attracted to the pointer. Amber phosphor on a dark CRT — no deps.
 *
 * Honours `prefers-reduced-motion` (single static frame) and pauses when the
 * canvas is off-screen or the tab is hidden.
 */
export default function BirdFlock({ className = "", color = "255,176,0" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const CFG = {
      density: 0.00012,
      min: 34,
      max: 110,
      maxSpeed: 0.95,
      maxForce: 0.024,
      perception: 88,
      separation: 26,
      mouseRadius: 190,
    };

    let w = 0;
    let h = 0;
    let birds = [];
    let raf = null;
    let running = false;
    const mouse = { x: 0, y: 0, active: false };

    const limit = (x, y, max) => {
      const m = Math.hypot(x, y);
      return m > max ? [(x / m) * max, (y / m) * max] : [x, y];
    };

    const steer = (dx, dy, b) => {
      const m = Math.hypot(dx, dy);
      if (m === 0) return [0, 0];
      return limit(
        (dx / m) * CFG.maxSpeed - b.vx,
        (dy / m) * CFG.maxSpeed - b.vy,
        CFG.maxForce,
      );
    };

    const seed = () => {
      const n = Math.round(
        Math.min(CFG.max, Math.max(CFG.min, w * h * CFG.density)),
      );
      birds = Array.from({ length: n }, () => {
        const ang = Math.random() * Math.PI * 2;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(ang) * CFG.maxSpeed,
          vy: Math.sin(ang) * CFG.maxSpeed,
          size: 4.5 + Math.random() * 2.8,
          flapSpeed: 0.6 + Math.random() * 0.6,
          phase: Math.random() * Math.PI * 2,
        };
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.floor(w * dpr));
      canvas.height = Math.max(1, Math.floor(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    };

    const update = () => {
      const per2 = CFG.perception * CFG.perception;
      const sep2 = CFG.separation * CFG.separation;
      const mr2 = CFG.mouseRadius * CFG.mouseRadius;

      for (let i = 0; i < birds.length; i++) {
        const a = birds[i];
        let alX = 0, alY = 0, coX = 0, coY = 0, seX = 0, seY = 0;
        let cnt = 0, sep = 0;

        for (let j = 0; j < birds.length; j++) {
          if (i === j) continue;
          const b = birds[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < per2) {
            alX += b.vx; alY += b.vy;
            coX += b.x; coY += b.y;
            cnt++;
            if (d2 < sep2 && d2 > 0) {
              const d = Math.sqrt(d2);
              seX += dx / d; seY += dy / d;
              sep++;
            }
          }
        }

        let ax = 0, ay = 0;
        if (cnt > 0) {
          const [alx, aly] = steer(alX / cnt, alY / cnt, a);
          const [clx, cly] = steer(coX / cnt - a.x, coY / cnt - a.y, a);
          ax += alx * 0.9 + clx * 0.6;
          ay += aly * 0.9 + cly * 0.6;
        }
        if (sep > 0) {
          const [slx, sly] = steer(seX, seY, a);
          ax += slx * 1.6;
          ay += sly * 1.6;
        }
        if (mouse.active) {
          const dx = mouse.x - a.x;
          const dy = mouse.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < mr2) {
            const d = Math.sqrt(d2) || 1;
            ax += (dx / d) * 0.07;
            ay += (dy / d) * 0.07;
          }
        }

        a.vx += ax;
        a.vy += ay;
        [a.vx, a.vy] = limit(a.vx, a.vy, CFG.maxSpeed);
        a.x += a.vx;
        a.y += a.vy;

        const m = 24;
        if (a.x < -m) a.x = w + m;
        else if (a.x > w + m) a.x = -m;
        if (a.y < -m) a.y = h + m;
        else if (a.y > h + m) a.y = -m;
      }
    };

    const render = (t) => {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (const b of birds) {
        const ang = Math.atan2(b.vy, b.vx);
        // Wing openness oscillates → flapping.
        const flap = 0.55 + 0.32 * Math.sin(t * 0.006 * b.flapSpeed + b.phase);
        const back = ang + Math.PI;
        const s = b.size;
        const apexX = b.x + Math.cos(ang) * s * 0.7;
        const apexY = b.y + Math.sin(ang) * s * 0.7;
        const tipAx = b.x + Math.cos(back - flap) * s;
        const tipAy = b.y + Math.sin(back - flap) * s;
        const tipBx = b.x + Math.cos(back + flap) * s;
        const tipBy = b.y + Math.sin(back + flap) * s;
        ctx.strokeStyle = `rgba(${color},0.85)`;
        ctx.beginPath();
        ctx.moveTo(tipAx, tipAy);
        ctx.lineTo(apexX, apexY);
        ctx.lineTo(tipBx, tipBy);
        ctx.stroke();
      }
    };

    const tick = (t) => {
      update();
      render(t);
      raf = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running || reduce) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    };

    const onPointerMove = (e) => {
      if (e.pointerType === "touch") return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      mouse.x = x;
      mouse.y = y;
      mouse.active = x >= 0 && x <= w && y >= 0 && y <= h;
    };
    const onPointerLeave = () => (mouse.active = false);
    const onVisibility = () => (document.hidden ? stop() : start());

    const ro = new ResizeObserver(() => resize());
    ro.observe(canvas);
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { threshold: 0 },
    );
    io.observe(canvas);

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibility);

    resize();
    if (reduce) render(0);
    else start();

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [color]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      aria-hidden="true"
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
