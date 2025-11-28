import React from 'react';

export default function BlackMirrorView({ scene, narrative, directives, session, llmSuggestions }) {
  if (!scene) return null;

  return (
    <div className="black-mirror">
      {scene.panels?.map((panel) => {
        switch (panel.kind) {
          case 'gauge':
            return (
              <div key={panel.id} className="panel gauge">
                {panel.label}: {panel.value}
              </div>
            );
          case 'timeline':
            return (
              <div key={panel.id} className="panel timeline">
                {panel.items?.map((item, i) => (
                  <div key={i}>
                    {item.time} — {item.label}
                  </div>
                ))}
              </div>
            );
          case 'card':
            return (
              <div key={panel.id} className="panel card">
                <h3>{panel.title}</h3>
                <pre>{JSON.stringify(panel.details || {}, null, 2)}</pre>
              </div>
            );
          case 'list':
            return (
              <div key={panel.id} className="panel list">
                {panel.items?.map((x, i) => (
                  <div key={i}>{x}</div>
                ))}
              </div>
            );
          default:
            return null;
        }
      })}
      {narrative && (
        <div className="panel narrative">
          <pre>{JSON.stringify(narrative, null, 2)}</pre>
        </div>
      )}
      {directives && (
        <div className="panel directives">
          <h4>Directives</h4>
          <ul>
            {directives.map((d) => (
              <li key={d.id}>
                [P{d.priority}] {d.command?.type} — {d.reasonCode} {JSON.stringify(d.command?.payload || {})}
              </li>
            ))}
          </ul>
        </div>
      )}
      {session && (
        <div className="panel session-debug">
          <details>
            <summary>Session</summary>
            <div>Version: {session.version}</div>
            <div>Directives: {session.analysis?.directives?.list?.length ?? 0}</div>
            <div>Scene keys: {Object.keys(session.analysis?.scene || {}).join(', ')}</div>
            <div>Chain length: {session.analysis?.chain?.chain?.length ?? 0}</div>
            <pre className="reasoning-debug">{JSON.stringify(session.analysis?.chain, null, 2)}</pre>
            <div>Integrity deviations: {session.analysis?.integrityDeviations?.summary?.regressingCount ?? 0} regressing</div>
            <pre className="reasoning-debug">
              {JSON.stringify(session.analysis?.integrityDeviations, null, 2)}
            </pre>
            <div>Multi-goal: {session.analysis?.multiGoal?.portfolio?.activeGoalCount ?? 0} goals</div>
            <div>
              Team users: {session.team?.users?.length ?? 0} | Teams: {session.team?.teams?.length ?? 0}
            </div>
            <div>
              Shared goals:{' '}
              {Object.values(session.team?.goalsById || {}).filter((g) => g.type === 'shared').length}
            </div>
            <div>Team load status: {session.analysis?.teamGovernance?.summary?.teamLoadStatus || 'n/a'}</div>
            <div>Delegation count: {session.analysis?.teamGovernance?.delegation ? Object.keys(session.analysis.teamGovernance.delegation).length : 0}</div>
            <div>Team governance summary:</div>
            <pre className="reasoning-debug">
              {JSON.stringify(session.analysis?.teamGovernance, null, 2)}
            </pre>
            <div>Team narrative:</div>
            <pre className="reasoning-debug">
              {JSON.stringify(session.analysis?.teamNarrative || session.teamNarrative || {}, null, 2)}
            </pre>
            {session.teamHud && (
              <>
                <div>Team HUD:</div>
                <pre className="reasoning-debug">{JSON.stringify(session.teamHud, null, 2)}</pre>
              </>
            )}
          </details>
        </div>
      )}
      {session?.teamHud && (
        <div className="panel team-hud">
          <h4>Team Command HUD</h4>
          <div>
            Team: {session.teamHud.header.teamName} | Members: {session.teamHud.header.memberCount} | Goals:{' '}
            {session.teamHud.header.activeGoals}
          </div>
          <div>
            Integrity: {session.teamHud.header.integrityStatus} | Governance: {session.teamHud.header.governanceMode}
          </div>
          <div>Summary: {session.teamHud.header.summary}</div>
          <table>
            <thead>
              <tr>
                <th>Goal</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Next tasks</th>
              </tr>
            </thead>
            <tbody>
              {session.teamHud.dutyList.map((duty) => (
                <tr key={duty.goalId}>
                  <td>{duty.goalTitle}</td>
                  <td>{duty.owner}</td>
                  <td>{duty.cycleStatus}</td>
                  <td>{duty.nextTaskCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {session?.accountabilityStrip && (
        <div className="panel accountability-strip">
          <h4>Accountability Strip</h4>
          <table>
            <thead>
              <tr>
                <th>Goal</th>
                <th>Owner</th>
                <th>Role</th>
                <th>Status</th>
                <th>Next tasks</th>
              </tr>
            </thead>
            <tbody>
              {session.accountabilityStrip.map((item) => (
                <tr key={item.goalId}>
                  <td>{item.goalTitle}</td>
                  <td>{item.ownerName}</td>
                  <td>{item.ownerRole}</td>
                  <td>{item.cycleStatus}</td>
                  <td>{item.nextTaskCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {llmSuggestions && (
        <div className="panel llm-suggestions">
          <h4>LLM Suggestions (advisory only)</h4>
          <div>Model: {llmSuggestions.model}</div>
          <div>Generated: {llmSuggestions.generatedAt}</div>
          <div className="advisory-note">
            LLM suggestions are advisory only and do not change your plan until confirmed.
          </div>
          <ul>
            {(llmSuggestions.suggestions || []).map((sug) => (
              <li key={sug.id}>
                [{sug.domain}] {sug.type} → {sug.target} | rationale: {sug.rationale} | confidence:{' '}
                {sug.confidence}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
