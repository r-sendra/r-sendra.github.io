import { useState } from "react";

const typeLabels = {
  journal: "Journal",
  conference: "Conference",
  chapter: "Chapter",
  thesis: "Thesis",
};

// Shared classes for the three action buttons / links — retro mono chips.
const actionBase =
  "font-mono text-xs px-2 py-1 border transition-colors";
const actionIdle =
  "border-line text-muted hover:border-ink hover:text-ink";
const actionActive = "border-accent bg-accent-soft text-accent";
const actionDisabled = "border-line/50 text-line cursor-not-allowed";

function Publication({ pub }) {
  const [open, setOpen] = useState(false); // bibtex panel open?

  return (
    <li className="group border-b border-line py-6 last:border-0">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-3">
          <span className="shrink-0 font-mono text-sm tabular-nums text-accent">
            {pub.year}
          </span>
          <h3 className="font-medium leading-snug text-ink">
            {pub.paperPage ? (
              <a
                href={pub.paperPage}
                className="decoration-accent/40 underline-offset-4 hover:text-accent hover:underline"
              >
                {pub.title}
              </a>
            ) : (
              pub.title
            )}
          </h3>
        </div>

        <p className="pl-10 text-sm text-muted">{pub.authors}</p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pl-10 pt-1">
          <span className="italic text-sm text-ink/80">{pub.venue}</span>
          {pub.type && (
            <span className="rounded-full border border-line px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {typeLabels[pub.type] ?? pub.type}
            </span>
          )}

          <span className="ml-auto flex items-center gap-1.5 text-sm">
            {/* Journal — links out to the DOI / publisher, disabled until set */}
            {pub.link ? (
              <a
                href={pub.link}
                target="_blank"
                rel="noopener noreferrer"
                className={`${actionBase} ${actionIdle}`}
              >
                journal ↗
              </a>
            ) : (
              <span
                className={`${actionBase} ${actionDisabled}`}
                title="Add the journal/DOI URL in publications.ts"
              >
                journal
              </span>
            )}

            {/* BibTeX — expands the citation in place */}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              disabled={!pub.bibtex}
              className={`${actionBase} ${
                !pub.bibtex
                  ? actionDisabled
                  : open
                    ? actionActive
                    : actionIdle
              }`}
              aria-expanded={open}
            >
              bibtex
            </button>

            {/* GitHub — links to the code repo, disabled until set */}
            {pub.github ? (
              <a
                href={pub.github}
                target="_blank"
                rel="noopener noreferrer"
                className={`${actionBase} ${actionIdle}`}
              >
                github ↗
              </a>
            ) : (
              <span
                className={`${actionBase} ${actionDisabled}`}
                title="Add the repository URL in publications.ts"
              >
                github
              </span>
            )}
          </span>
        </div>

        {open && pub.bibtex && (
          <pre className="ml-10 mt-3 overflow-x-auto rounded-lg bg-subtle p-4 text-xs leading-relaxed text-ink/90">
            <code>{pub.bibtex}</code>
          </pre>
        )}
      </div>
    </li>
  );
}

export default function PublicationList({ publications }) {
  return (
    <ol className="mt-2">
      {publications.map((pub, i) => (
        <Publication key={`${pub.year}-${i}`} pub={pub} />
      ))}
    </ol>
  );
}
