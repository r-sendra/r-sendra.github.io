import { useRef, useState, useEffect } from "react";

const typeMeta = {
  paper: { label: "paper", cmd: "cat" },
  reflection: { label: "reflection", cmd: "echo" },
  project: { label: "project", cmd: "run" },
};

function Card({ item }) {
  const meta = typeMeta[item.type] ?? { label: item.type, cmd: "open" };
  return (
    <a
      href={item.url}
      className="group flex w-[300px] shrink-0 snap-start flex-col border border-ink bg-surface no-underline shadow-[4px_4px_0_var(--color-ink)] transition-transform hover:-translate-y-1 sm:w-[340px]"
    >
      {/* mini CRT cover */}
      <div className="terminal-bar flex items-center gap-2 px-3 py-1.5">
        <span className="flex gap-1">
          <span className="h-2 w-2 bg-[#ffb000]"></span>
          <span className="h-2 w-2 bg-[#ffb000]/55"></span>
          <span className="h-2 w-2 bg-[#ffb000]/30"></span>
        </span>
        <span className="font-mono text-[10px] text-[#ffb000]/70">
          {item.slug}.{item.type === "project" ? "c" : "md"}
        </span>
      </div>
      <div className="crt relative flex h-32 items-center px-5">
        <span className="phosphor font-mono text-sm">
          $ {meta.cmd} {item.slug}
          <span className="blink">▊</span>
        </span>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span className="border border-accent px-1.5 py-0.5 uppercase tracking-wide text-accent">
            {meta.label}
          </span>
          <span className="text-muted">{item.date}</span>
        </div>
        <h3 className="mt-3 font-display text-2xl uppercase leading-none text-ink">
          {item.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink/80">
          {item.description}
        </p>
        <span className="mt-4 font-mono text-xs text-accent group-hover:underline">
          &gt; open_entry
        </span>
      </div>
    </a>
  );
}

export default function PostGallery({ items }) {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = () => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  };

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    el?.addEventListener("scroll", updateEdges, { passive: true });
    window.addEventListener("resize", updateEdges);
    return () => {
      el?.removeEventListener("scroll", updateEdges);
      window.removeEventListener("resize", updateEdges);
    };
  }, []);

  const scrollByCard = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    const first = el.firstElementChild;
    const gap = 20;
    const amount = first ? first.getBoundingClientRect().width + gap : 340;
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const arrow =
    "flex h-10 w-10 items-center justify-center border border-ink bg-surface font-mono text-ink shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:shadow-none";

  return (
    <div>
      <div
        ref={trackRef}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") scrollByCard(1);
          if (e.key === "ArrowLeft") scrollByCard(-1);
        }}
        tabIndex={0}
        className="no-scrollbar flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 outline-none"
      >
        {items.map((item) => (
          <Card key={item.slug} item={item} />
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          className={arrow}
          aria-label="Previous"
          disabled={atStart}
          onClick={() => scrollByCard(-1)}
        >
          ◄
        </button>
        <button
          type="button"
          className={arrow}
          aria-label="Next"
          disabled={atEnd}
          onClick={() => scrollByCard(1)}
        >
          ►
        </button>
        <span className="ml-1 font-mono text-xs text-muted">
          {items.length} {items.length === 1 ? "entry" : "entries"} · drag or use ← →
        </span>
      </div>
    </div>
  );
}
