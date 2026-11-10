import { memo, type ReactNode } from 'react';
import type { Problem } from '../lib/types';
import { srcGroup } from '../lib/filters';

/** Platforms that rate their own problems: no "referenced from" line unless the level was borrowed/estimated. */
const NATIVE = new Set(['LeetCode', 'Codeforces', 'Kattis', 'CodeChef']);

function ReferenceLine({ p }: { p: Problem }) {
  if (!p.level) return null;
  if (NATIVE.has(p.platform) && !/^(via|estimate|Pepcoding)/.test(p.lvsrc)) return null;
  let body: ReactNode;
  if (p.lvsrc.startsWith('via LeetCode')) {
    body = (
      <>
        difficulty referenced from LeetCode:{' '}
        <a href={p.lvurl} target="_blank" rel="noopener noreferrer">
          {p.lvsrc.replace('via LeetCode ', '')}
        </a>
      </>
    );
  } else if (p.lvsrc.startsWith('AtCoder Problems')) {
    body = <>difficulty referenced from AtCoder Problems (kenkoooo) estimate: {p.lvsrc.split(' ').pop()}</>;
  } else if (p.lvsrc.startsWith('Pepcoding')) {
    body = <>difficulty referenced from Pepcoding (label on Pepcoding's page for this problem; {p.platform} has no rating)</>;
  } else if (p.lvsrc.startsWith('estimate')) {
    body = <>estimated; {p.platform} has no difficulty rating and no comparable rated problem was found</>;
  } else {
    body = <>difficulty referenced from {p.lvsrc}</>;
  }
  return (
    <div className="ref">
      {p.level} — {body}
    </div>
  );
}

const CONF_BADGE: Record<string, { label: string; title: string } | undefined> = {
  best: { label: '≈', title: "Closest match – Pepcoding's original judge is offline" },
  practice: { label: 'practice', title: 'Concept video – linked to a canonical practice problem' },
  concept: { label: 'concept', title: 'Theory lesson – there is no judge problem; the link opens the video' },
  search: { label: 'search', title: 'Original not found – opens a search' },
};

interface RowProps {
  p: Problem;
  solved: boolean;
  onToggle: (pk: string, value: boolean) => void;
}

export const ProblemRow = memo(function ProblemRow({ p, solved, onToggle }: RowProps) {
  const est = p.lvsrc.startsWith('estimate');
  const isRating = p.platform !== 'LeetCode' && /^\d+$/.test(p.diff);
  const sub = p.notes.length ? p.notes.join(' — ') : p.tags.join(' · ');
  const conf = CONF_BADGE[p.conf];
  const groups = [...new Set(p.sources.map(srcGroup))];
  const levelClass = p.level ? `b ${p.level.toLowerCase()}` : 'b';

  return (
    <div className={`q${solved ? ' done' : ''}`}>
      <input type="checkbox" checked={solved} onChange={(e) => onToggle(p.pk, e.target.checked)} aria-label={`Mark ${p.title} solved`} />
      <div className="main">
        <a className="t" href={p.url} target="_blank" rel="noopener noreferrer">
          {p.title}
        </a>
        <span className="num">{p.platform === 'LeetCode' ? `#${p.num}` : (p.num ?? p.platform)}</span>
        {p.premium && <span className="b prem" title="LeetCode Premium"> ★ Premium</span>}
        {sub && (
          <div className="sub" title={sub}>
            {sub}
          </div>
        )}
        <ReferenceLine p={p} />
      </div>
      <div className="meta">
        {conf && (
          <span className="b warn" title={conf.title}>
            {conf.label}
          </span>
        )}
        {solved && <span className="b ok">Solved</span>}
        {p.level &&
          (p.lvurl ? (
            <a className={levelClass} href={p.lvurl} target="_blank" rel="noopener noreferrer" title={`Level taken ${p.lvsrc}`}>
              {p.level}
            </a>
          ) : (
            <span className={levelClass} title={p.lvsrc}>
              {p.level}
              {est && <small> est.</small>}
            </span>
          ))}
        {isRating && (
          <span className="b" title={`${p.platform} rating`}>
            {p.diff}
          </span>
        )}
        {groups.map((g) => (
          <span key={g} className="b src" title={p.sources.filter((s) => srcGroup(s) === g).join(', ')}>
            {g}
          </span>
        ))}
        {p.videos.map((v) => (
          <a key={v.u} className="vid" href={v.u} target="_blank" rel="noopener noreferrer" title={`${v.p}: ${v.t}`}>
            ▶
          </a>
        ))}
      </div>
    </div>
  );
});
