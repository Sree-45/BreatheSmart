import React, { useState } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';

const formatScore = (score) => {
  if (typeof score !== 'number') return '—';
  // Chroma uses L2 distance with normalized embeddings (lower = more similar).
  // Convert to a friendlier 0-100 "match" % so non-technical users can read it.
  const match = Math.max(0, Math.min(100, Math.round((1 - score / 2) * 100)));
  return `${match}%`;
};

const scopeLabel = (scope) => {
  if (!scope) return 'Source';
  if (scope === 'global') return 'Global guideline';
  if (scope.startsWith('user_')) return 'Your uploaded report';
  return scope;
};

export default function SourcesPanel({ sources, latencyMs }) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <section className="sources-panel">
      <button
        type="button"
        className="sources-panel-toggle"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <span className="sources-panel-toggle-left">
          <LibraryBooksIcon fontSize="small" />
          <span>Sources used ({sources.length})</span>
          {typeof latencyMs === 'number' && (
            <span className="sources-panel-latency">· {latencyMs} ms</span>
          )}
        </span>
        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </button>

      {expanded && (
        <ul className="sources-panel-list">
          {sources.map((s, idx) => (
            <li key={idx} className="source-card">
              <div className="source-card-head">
                <span className="source-card-title">{s.source || 'Unknown source'}</span>
                <span className={`source-card-scope ${s.scope?.startsWith('user_') ? 'user' : 'global'}`}>
                  {scopeLabel(s.scope)}
                </span>
                <span className="source-card-score" title={`distance ${s.score?.toFixed(3)}`}>
                  match {formatScore(s.score)}
                </span>
              </div>
              <p className="source-card-snippet">{s.snippet}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
