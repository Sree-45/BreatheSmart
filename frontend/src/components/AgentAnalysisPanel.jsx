import React, { useState } from 'react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import BuildCircleOutlinedIcon from '@mui/icons-material/BuildCircleOutlined';
import { fetchAgenticAnalysis } from '../services/aiService';

const friendlyToolName = (tool) => {
  if (tool === 'fetch_aqi_for_city') return 'fetched live AQI';
  if (tool === 'get_health_recommendation') return 'ran RAG retrieval';
  return tool;
};

const computeAge = (dob) => {
  if (!dob) return null;
  try {
    const d = new Date(dob);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  } catch {
    return null;
  }
};

export default function AgentAnalysisPanel({ user }) {
  const [city, setCity] = useState(user?.primaryLocation?.name || '');
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const canRun = !loading && city.trim().length > 0;

  const run = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await fetchAgenticAnalysis({
        city: city.trim(),
        age: computeAge(user?.dob),
        medicalConditions: user?.medicalConditions || null,
        question: question.trim() || null,
      });
      if (!data) {
        setError('The agent did not return a response. Try again in a moment.');
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Agent analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  // Surface only AI-message tool calls + the final text — skip raw HumanMessage
  // and ToolMessage entries to keep the trace human-readable.
  const traceSteps = (result?.trace || [])
    .map((m) => ({
      type: m.type,
      tools: Array.isArray(m.tool_calls) ? m.tool_calls.filter(Boolean) : [],
    }))
    .filter((s) => s.tools.length > 0);

  return (
    <section className="agent-panel">
      <header className="agent-panel-header">
        <AutoAwesomeIcon fontSize="small" />
        <div>
          <h4>Agentic analysis</h4>
          <p className="agent-panel-subtitle">
            Let the agent fetch live AQI and run retrieval for you — it picks the tools.
          </p>
        </div>
      </header>

      <div className="agent-panel-form">
        <label className="agent-panel-field">
          <span>City</span>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g. Hyderabad"
            disabled={loading}
          />
        </label>
        <label className="agent-panel-field">
          <span>Question (optional)</span>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Is it safe to run outside this morning?"
            disabled={loading}
          />
        </label>
        <button
          type="button"
          className="agent-panel-run-btn"
          onClick={run}
          disabled={!canRun}
        >
          {loading ? 'Agent thinking…' : 'Run agentic analysis'}
        </button>
      </div>

      {error && <p className="agent-panel-error">{error}</p>}

      {result && (
        <div className="agent-panel-result">
          {traceSteps.length > 0 && (
            <div className="agent-trace">
              <h5>
                <BuildCircleOutlinedIcon fontSize="small" />
                Tool trace
              </h5>
              <ol>
                {traceSteps.flatMap((s, i) =>
                  s.tools.map((t, j) => (
                    <li key={`${i}-${j}`}>{friendlyToolName(t)}</li>
                  )),
                )}
              </ol>
            </div>
          )}
          <div className="agent-answer">
            <h5>Answer</h5>
            <p>{result.answer}</p>
          </div>
        </div>
      )}
    </section>
  );
}
