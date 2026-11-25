import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, FileVideo2, Search, ShieldCheck } from 'lucide-react'
import { Button, EmptyState, StatusPill } from '../components/UI.jsx'
import { useApp } from '../context/AppContext.jsx'
import { getEvidence } from '../services/evidenceStorage.js'

const categories = ['Cheating or exploits', 'Rule violation', 'Harassment or misconduct', 'Match or score dispute', 'Technical problem', 'Prize concern', 'Other']
const statuses = ['Open', 'Needs information', 'Under investigation', 'Appealed', 'Dismissed', 'Warning issued', 'Result changed', 'Forfeited', 'Disqualified', 'Resolved']
const actions = ['Request more information', 'Dismiss report', 'Issue warning', 'Change match result', 'Forfeit player', 'Disqualify player', 'Forfeit team', 'Disqualify team', 'Place prize on hold', 'Release prize']
const consequentialActions = new Set(actions.filter((action) => action !== 'Request more information'))

export default function FairPlayInbox() {
  const { currentUser, reports, tournaments, teams, users, decideReport, notify } = useApp()
  const [query, setQuery] = useState('')
  const [tournamentFilter, setTournamentFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [action, setAction] = useState(actions[0])
  const [reason, setReason] = useState('')
  const [ruleId, setRuleId] = useState('')
  const [target, setTarget] = useState('')
  const [resultPlayer, setResultPlayer] = useState('')
  const [resultPlace, setResultPlace] = useState(1)
  const [resultPrize, setResultPrize] = useState(0)
  const [evidence, setEvidence] = useState(null)
  const [evidenceLoading, setEvidenceLoading] = useState(false)
  const [evidenceError, setEvidenceError] = useState('')

  const filtered = useMemo(() => reports.filter((report) => {
    const text = `${report.id} ${report.tournamentName} ${report.reporterName} ${report.description} ${report.matchReference || ''}`.toLowerCase()
    return (!query || text.includes(query.toLowerCase()))
      && (!tournamentFilter || report.tournamentId === tournamentFilter)
      && (!categoryFilter || report.category === categoryFilter)
      && (!statusFilter || report.status === statusFilter)
      && (!dateFilter || report.createdAt.slice(0, 10) === dateFilter)
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [reports, query, tournamentFilter, categoryFilter, statusFilter, dateFilter])
  const active = filtered.find((report) => report.id === selectedId) || filtered[0]
  const tournament = tournaments.find((item) => item.id === active?.tournamentId)
  const eligibleTeams = teams.filter((team) => team.tournamentId === active?.tournamentId)
  const eligiblePlayers = users.filter((user) => user.role === 'Player')
  const prizeDecision = action === 'Place prize on hold' || action === 'Release prize'
  const targetDecision = action === 'Forfeit player' || action === 'Disqualify player' || action === 'Forfeit team' || action === 'Disqualify team'
  const resultDecision = action === 'Change match result'

  useEffect(() => {
    setAction(actions[0])
    setReason('')
    setRuleId('')
    setTarget('')
    setResultPlayer('')
    setResultPlace(1)
    setResultPrize(0)
  }, [active?.id])

  useEffect(() => {
    let url = ''
    let cancelled = false
    setEvidence(null)
    setEvidenceError('')
    if (!active?.evidenceId) return undefined
    setEvidenceLoading(true)
    getEvidence(active.evidenceId).then((record) => {
      if (cancelled) return
      if (!record) { setEvidenceError('This video is not available in local evidence storage.'); return }
      url = URL.createObjectURL(record.blob)
      setEvidence({ ...record, url })
    }).catch((error) => {
      if (!cancelled) setEvidenceError(error.message || 'Could not load the video evidence.')
    }).finally(() => { if (!cancelled) setEvidenceLoading(false) })
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url) }
  }, [active?.id, active?.evidenceId])

  const submitDecision = (event) => {
    event.preventDefault()
    if (!active) return
    if (consequentialActions.has(action) && !window.confirm(`Confirm “${action}” for case ${active.id}? This will be recorded in the case history.`)) return
    const parsedTarget = target ? target.split(':') : []
    const result = decideReport(active.id, {
      action,
      reason,
      ruleId,
      targetId: parsedTarget[1] || '',
      targetType: parsedTarget[0] || '',
      resultPlayer,
      resultPlace,
      resultPrize,
    })
    if (result.error) notify(result.error, 'error')
    else { notify(`${action} recorded in the case history.`); setReason('') }
  }
  const targetOptions = action.endsWith('team')
    ? eligibleTeams.map((team) => ({ value: `team:${team.id}`, label: `Team · ${team.name}` }))
    : eligiblePlayers.map((player) => ({ value: `player:${player.id}`, label: `Player · ${player.gamerTag} — ${player.name}` }))
  const reporterRule = tournament?.rules.find((rule) => rule.id === active?.ruleId)

  return <section className="fairplay-inbox">
    <div className="section-title-row"><div><p className="eyebrow">PRIVATE CASE MANAGEMENT</p><h2>FairPlay case inbox</h2><p>Evidence and reports are private to reporters and admins.</p></div><span className="results-count">{reports.length} TOTAL CASES</span></div>
    <div className="case-filters">
      <label className="admin-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports" aria-label="Search reports" /></label>
      <label>Tournament<select value={tournamentFilter} onChange={(event) => setTournamentFilter(event.target.value)}><option value="">All tournaments</option>{tournaments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">All statuses</option>{statuses.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Date<input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} aria-label="Filter reports by date" /></label>
    </div>
    {!filtered.length ? <EmptyState icon={ShieldCheck} title={reports.length ? 'No matching reports' : 'The inbox is clear'} detail={reports.length ? 'Change or clear your filters to review more cases.' : 'Private player and viewer reports will appear here.'} /> : <div className="case-inbox-layout">
      <div className="case-list" aria-label="Report cases">{filtered.map((report) => <button className={`case-list-item ${active?.id === report.id ? 'selected' : ''}`} key={report.id} onClick={() => setSelectedId(report.id)}><div><span className="case-category">{report.category}</span><StatusPill status={report.status} /></div><strong>{report.tournamentName}</strong><p>{report.description}</p><small>{report.reporterName} · {new Date(report.createdAt).toLocaleString()}</small></button>)}</div>
      {active && <article className="case-detail">
        <div className="case-detail-heading"><div><p className="eyebrow">CASE {active.id}</p><h3>{active.tournamentName}</h3></div><StatusPill status={active.status} /></div>
        <div className="case-detail-grid"><span>Reported by <b>{active.reporterName}</b></span><span>Category <b>{active.category}</b></span><span>Submitted <b>{new Date(active.createdAt).toLocaleString()}</b></span>{active.matchReference && <span>Match / round <b>{active.matchReference}</b></span>}{active.reporterEmail && <span>Contact email <b>{active.reporterEmail}</b></span>}</div>
        <div className="case-description"><strong>Report details</strong><p>{active.description}</p></div>
        {(reporterRule || active.ruleTitle) && <div className="case-rule-reference"><FileVideo2 size={15} /><span>Reporter referenced rule v{active.ruleVersion}: <b>{reporterRule?.title || active.ruleTitle}</b> — {reporterRule?.body || active.ruleText}</span></div>}
        {active.targetPlayerId && <p className="muted">Player involved: {users.find((user) => user.id === active.targetPlayerId)?.gamerTag}</p>}
        {active.targetTeamId && <p className="muted">Team involved: {teams.find((team) => team.id === active.targetTeamId)?.name}</p>}
        <section className="admin-evidence"><h4><FileVideo2 size={16} /> Private video evidence</h4>{!active.evidenceId ? <p className="muted">No video evidence was attached.</p> : evidenceLoading ? <p className="muted">Loading local video evidence…</p> : evidenceError ? <p className="form-error" role="alert">{evidenceError}</p> : evidence && <><video src={evidence.url} controls preload="metadata" aria-label="Private report evidence" /><p className="muted">{evidence.name} · {(evidence.size / (1024 * 1024)).toFixed(1)} MB · IndexedDB local demo storage</p></>}</section>
        <details className="case-history" open><summary>Case history ({active.history.length})</summary>{active.history.map((entry, index) => <div key={`${entry.at}-${index}`}><b>{entry.action}</b><span>{entry.reason}</span><small>{entry.by} · {new Date(entry.at).toLocaleString()}{entry.ruleTitle && ` · Rule: ${entry.ruleTitle}`}</small></div>)}</details>
        {active.appeals?.map((appeal, index) => <div className="case-appeal" key={`${appeal.at}-${index}`}><b>Appeal from {appeal.by}</b><p>{appeal.message}</p><small>{new Date(appeal.at).toLocaleString()}</small></div>)}
        <form className="decision-form" onSubmit={submitDecision}>
          <div className="decision-heading"><AlertTriangle size={17} /><div><h4>Record admin decision</h4><p>Every action and reason is saved to the case history.</p></div></div>
          <label>Action<select value={action} onChange={(event) => { setAction(event.target.value); setTarget('') }}>{actions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Reason (required)<textarea required minLength="5" maxLength="1600" rows="3" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain the evidence and why this action follows the rules." /></label>
          <label>Published rule or section{prizeDecision && <span className="required-note">Required for prize decisions</span>}<select required={prizeDecision} value={ruleId} onChange={(event) => setRuleId(event.target.value)}><option value="">Select a rule reference (optional)</option>{(tournament?.rules || []).map((rule) => <option key={rule.id} value={rule.id}>{rule.title}: {rule.body.slice(0, 80)}</option>)}</select></label>
          {targetDecision && <label>Affected {action.endsWith('team') ? 'team' : 'player'}<select required value={target} onChange={(event) => setTarget(event.target.value)}><option value="">Choose affected {action.endsWith('team') ? 'team' : 'player'}</option>{targetOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}
          {resultDecision && <div className="form-two-col"><label>Correct result — player<input required value={resultPlayer} onChange={(event) => setResultPlayer(event.target.value)} placeholder="Player / gamer tag" /></label><label>Placement<input required type="number" min="1" value={resultPlace} onChange={(event) => setResultPlace(event.target.value)} /></label><label>Prize amount (₹)<input type="number" min="0" value={resultPrize} onChange={(event) => setResultPrize(event.target.value)} /></label></div>}
          {prizeDecision && <p className="prize-fairness-note">A report alone never changes a prize. A hold or release is applied only after this explicit decision, with your reason and a published rule reference.</p>}
          <Button type="submit">{action}</Button>
        </form>
      </article>}
    </div>}
  </section>
}
