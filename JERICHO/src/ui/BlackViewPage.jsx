import React, { useEffect, useState } from 'react';
import BlackMirrorView from './BlackMirrorView.jsx';

export default function BlackViewPage() {
  const [scene, setScene] = useState(null);
  const [narrative, setNarrative] = useState(null);
  const [directives, setDirectives] = useState(null);
  const [session, setSession] = useState(null);
  const [llmSuggestions, setLlmSuggestions] = useState(null);
  const [error, setError] = useState(null);
  const [viewerId, setViewerId] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/ai/narrative');
        const data = await res.json();
        if (active) {
          setScene(data.scene || null);
          setNarrative(data.narrative || null);
        }
        const dirRes = await fetch('/ai/directives');
        const dirData = await dirRes.json();
        if (active) {
          setDirectives(dirData.directives || null);
        }
        const sessionRes = await fetch(viewerId ? `/ai/session/view?viewerId=${viewerId}` : '/ai/session');
        const sessionData = await sessionRes.json();
        if (active) {
          setSession(sessionData.session || sessionData.session);
          if (sessionData.viewer) {
            // keep viewer
          }
        }
        const suggRes = await fetch('/ai/llm-suggestions');
        const suggData = await suggRes.json();
        if (active) {
          setLlmSuggestions(suggData);
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to load scene');
      }
    })();
    return () => {
      active = false;
    };
  }, [viewerId]);

  if (error) return <div>{error}</div>;
  if (!scene) return <div>Loading...</div>;

  const narrativeSections = [
    'identityNarrative',
    'goalNarrative',
    'taskNarrative',
    'scheduleNarrative',
    'governanceNarrative',
    'forecastNarrative',
    'metaHealthNarrative'
  ];

  return (
    <div>
      {session?.team?.users && (
        <div className="viewer-select">
          <label>
            Viewer:
            <select value={viewerId} onChange={(e) => setViewerId(e.target.value)}>
              <option value="">Team</option>
              {session.team.users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name || u.id}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <BlackMirrorView
        scene={scene}
        narrative={narrative}
        directives={directives}
        session={session}
        llmSuggestions={llmSuggestions}
      />
      {narrative && (
        <div className="narrative-panel">
          <h3>Narrative</h3>
          {narrativeSections.map((key) => (
            <div key={key}>
              <strong>{key}</strong>
              <ul>
                {(narrative[key] || []).map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <strong>Summary:</strong> {narrative.summary}
          </div>
        </div>
      )}
    </div>
  );
}
