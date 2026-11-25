import { useState } from 'react'
import { CheckCircle2, FileText } from 'lucide-react'

export function RuleSheet({ tournament, acknowledged, canAcknowledge, onAcknowledge, memberStatus = [] }) {
  const [checked, setChecked] = useState(false)
  return <section className="content-card rule-sheet" aria-labelledby="tournament-rules-title">
    <div className="rule-sheet-heading"><h2 id="tournament-rules-title"><FileText size={18} /> Current tournament rules</h2><span className="rule-version">VERSION {tournament.ruleVersion || 1}</span></div>
    <ol className="rules-list">{(tournament.rules || []).map((rule, index) => {
      const section = typeof rule === 'string' ? { title: `Rule ${index + 1}`, body: rule } : rule
      return <li id={`rule-${section.id}`} key={section.id || index}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{section.title}</strong><p>{section.body}</p></div></li>
    })}</ol>
    {memberStatus.length > 1 && <div className="rule-roster-status"><strong>Team rule acknowledgements</strong>{memberStatus.map((member) => <span key={member.id}>{member.name}: {member.acknowledged ? 'Confirmed' : 'Needs review'}</span>)}</div>}
    {acknowledged ? <p className="rule-accepted"><CheckCircle2 size={16} /> You acknowledged version {tournament.ruleVersion || 1}.</p> : canAcknowledge ? <div className="rule-agreement">
      <label><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> I have read and agree to the current tournament rules.</label>
      <button className="button button-secondary" type="button" disabled={!checked} onClick={onAcknowledge}>Confirm rules</button>
    </div> : <p className="muted">Sign in to acknowledge the current rules and register.</p>}
  </section>
}
