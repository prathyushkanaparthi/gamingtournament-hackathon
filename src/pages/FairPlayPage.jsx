import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, FileText, LockKeyhole, MessageSquareText, ShieldCheck } from 'lucide-react'
import { Button, EmptyState, PageHeading, StatusPill } from '../components/UI.jsx'
import { EvidenceCapture } from '../components/EvidenceCapture.jsx'
import { useApp } from '../context/AppContext.jsx'
import { deleteEvidence, getEvidence, saveEvidence } from '../services/evidenceStorage.js'
import { makeId } from '../utils/format.js'

const categories = ['Cheating or exploits', 'Rule violation', 'Harassment or misconduct', 'Match or score dispute', 'Technical problem', 'Prize concern', 'Other']

function ReporterEvidence({ evidenceId }) {
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [url, setUrl] = useState('')
  useEffect(() => {
    let active = true
    let objectUrl = ''
    if (!expanded) return undefined
    getEvidence(evidenceId).then((value) => {
      if (!active) return
      if (!value) { setError('This video is no longer available in local evidence storage.'); return }
      objectUrl = URL.createObjectURL(value.blob)
      setUrl(objectUrl)
      setRecord(value)
    }).catch((loadError) => { if (active) setError(loadError.message || 'Could not load local evidence.') })
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [expanded, evidenceId])
  return <div className="reporter-evidence">{!expanded ? <button className="text-link as-button" onClick={() => setExpanded(true)}>Open my attached evidence</button> : error ? <p className="form-error" role="alert">{error}</p> : record ? <video src={url} controls preload="metadata" aria-label="Your private report evidence" /> : <p className="muted">Loading evidence from local IndexedDB…</p>}</div>
}

export default function FairPlayPage() {
  const { currentUser, tournaments, teams, users, reports, submitReport, appendReportResponse, appealReport, notify } = useApp()
  const [form, setForm] = useState({ tournamentId: '', category: categories[0], matchReference: '', targetPlayerId: '', targetTeamId: '', ruleId: '', description: '', reporterEmail: '' })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [caseCode, setCaseCode] = useState('')
  const [trackingCode, setTrackingCode] = useState('')
  const [responseDrafts, setResponseDrafts] = useState({})
  const [appealDrafts, setAppealDrafts] = useState({})
  const tournament = tournaments.find((item) => item.id === form.tournamentId)
  const tournamentReports = useMemo(() => reports.filter((report) => currentUser
    ? report.reporterId === currentUser.id
    : !report.reporterId && report.id === trackingCode.trim()), [reports, currentUser, trackingCode])
  const tournamentTeams = teams.filter((team) => team.tournamentId === form.tournamentId)
  const availablePlayers = users.filter((user) => user.role === 'Player')

  const updateForm = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))
  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setProgress(0)
    let evidenceId = ''
    try {
      if (file) {
        evidenceId = makeId('evidence')
        await saveEvidence(file, evidenceId, setProgress)
      }
      const result = submitReport({ ...form, evidenceId, ruleVersion: tournament?.ruleVersion || 1 })
      if (result.error) throw new Error(result.error)
      setCaseCode(result.reportId)
      if (!currentUser) setTrackingCode(result.reportId)
      setForm((prev) => ({ ...prev, category: categories[0], matchReference: '', targetPlayerId: '', targetTeamId: '', ruleId: '', description: '' }))
      setFile(null)
      notify('Private report submitted. Your case reference is shown below.')
    } catch (error) {
      if (evidenceId) {
        try { await deleteEvidence(evidenceId) } catch (cleanupError) { console.error('Could not remove orphaned evidence:', cleanupError) }
      }
      setProgress(0)
      notify(error.message || 'The report could not be saved. Try again.', 'error')
    } finally {
      setBusy(false)
    }
  }
  const sendResponse = (report) => {
    const result = appendReportResponse(report.id, responseDrafts[report.id] || '', trackingCode.trim())
    if (result.error) notify(result.error, 'error')
    else { setResponseDrafts((prev) => ({ ...prev, [report.id]: '' })); notify('Your response was added to the private case history.') }
  }
  const sendAppeal = (report) => {
    const result = appealReport(report.id, appealDrafts[report.id] || '', trackingCode.trim())
    if (result.error) notify(result.error, 'error')
    else { setAppealDrafts((prev) => ({ ...prev, [report.id]: '' })); notify('Appeal submitted for admin review.') }
  }
  const subjectLabel = (report) => report.targetTeamId
    ? teams.find((team) => team.id === report.targetTeamId)?.name
    : users.find((user) => user.id === report.targetPlayerId)?.gamerTag

  return <div className="page-container fairplay-page">
    <PageHeading eyebrow="FAIRPLAY CENTER" title="Evidence & dispute center" detail="Raise a concern privately. Every case is reviewed by tournament admins." action={<span className="private-label"><LockKeyhole size={13} /> PRIVATE CASES</span>} />
    <div className="fairplay-notice"><ShieldCheck size={18} /><p><strong>Private by design</strong><span>Reports and evidence are only visible to the reporter and authorized admins in this local demo. A report alone never changes a prize decision.</span></p></div>
    <div className="fairplay-columns">
      <form className="form-card report-form" onSubmit={submit}>
        <div className="section-title-row"><div><p className="eyebrow">OPEN A PRIVATE CASE</p><h2>Submit a report</h2></div><AlertTriangle size={19} className="report-icon" /></div>
        {!currentUser && <label>Contact email (optional)<input type="email" value={form.reporterEmail} onChange={updateForm('reporterEmail')} placeholder="you@example.com" /></label>}
        <label>Tournament<select required value={form.tournamentId} onChange={(event) => setForm((prev) => ({ ...prev, tournamentId: event.target.value, ruleId: '', targetTeamId: '', targetPlayerId: '' }))}><option value="">Choose a tournament</option>{tournaments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Report category<select value={form.category} onChange={updateForm('category')}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        {tournament && <label>Relevant published rule (optional)<select value={form.ruleId} onChange={updateForm('ruleId')}><option value="">Not sure / no specific rule</option>{tournament.rules.map((rule, index) => <option key={rule.id} value={rule.id}>Section {index + 1}: {rule.title}</option>)}</select></label>}
        <div className="form-two-col"><label>Match or round reference<input value={form.matchReference} onChange={updateForm('matchReference')} placeholder="Match ID, round, or approximate time" /></label><label>Player involved (optional)<select value={form.targetPlayerId} onChange={(event) => setForm((prev) => ({ ...prev, targetPlayerId: event.target.value, targetTeamId: '' }))}><option value="">Select a player</option>{availablePlayers.map((player) => <option value={player.id} key={player.id}>{player.gamerTag} — {player.name}</option>)}</select></label></div>
        <label>Team involved (optional)<select value={form.targetTeamId} onChange={(event) => setForm((prev) => ({ ...prev, targetTeamId: event.target.value, targetPlayerId: '' }))}><option value="">Select a tournament team</option>{tournamentTeams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label>
        <label>What happened?<textarea required minLength="20" maxLength="4000" rows="6" value={form.description} onChange={updateForm('description')} placeholder="Describe what you observed, when it happened, and any useful context. Avoid sharing sensitive personal information." /><small className="form-help">{form.description.length}/4000 characters · Minimum 20 characters</small></label>
        <EvidenceCapture file={file} onFileChange={setFile} />
        {busy && <div className="upload-progress" role="status"><span>Saving evidence in local demo storage…</span><progress max="100" value={progress} /><b>{progress}%</b></div>}
        <Button type="submit" disabled={busy}>{busy ? 'Submitting report…' : 'Submit private report'} <ArrowRight size={16} /></Button>
        <small className="muted">Report details are stored in this browser. Evidence files are stored separately in IndexedDB.</small>
      </form>

      <section className="my-cases-panel">
        <div className="section-title-row"><div><p className="eyebrow">PRIVATE FOLLOW-UP</p><h2>My reports</h2></div><MessageSquareText size={19} className="report-icon" /></div>
        {!currentUser && <form className="track-case-form" onSubmit={(event) => event.preventDefault()}><label>Track a report with its private case reference<input value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="CASE-…" /></label><small className="form-help">Your case reference was shown after submitting. It is your private access key in this demo.</small></form>}
        {caseCode && <div className="case-code-alert" role="status"><strong>Report received</strong><span>Save this private case reference to track status{currentUser ? ' from this account' : ''}.</span><code>{caseCode}</code></div>}
        {tournamentReports.length ? <div className="report-list">{tournamentReports.map((report) => <article className="report-card" key={report.id}><div className="report-card-heading"><div><span className="eyebrow">{report.category}</span><h3>{report.tournamentName}</h3></div><StatusPill status={report.status} /></div><p className="report-summary">{report.description}</p><div className="report-meta"><span>Case {report.id}</span><span>{new Date(report.createdAt).toLocaleDateString()}</span>{report.matchReference && <span>{report.matchReference}</span>}{subjectLabel(report) && <span>Involved: {subjectLabel(report)}</span>}</div>
            {report.evidenceId && <ReporterEvidence evidenceId={report.evidenceId} />}
            {report.lastDecision && <div className="decision-summary"><strong>{report.lastDecision.action}</strong><span>{report.lastDecision.reason}</span>{report.lastDecision.ruleTitle && <small>Rule: {report.lastDecision.ruleTitle} · version {report.lastDecision.ruleVersion}</small>}</div>}
            <details className="case-history"><summary>Case history ({report.history.length})</summary>{report.history.map((entry, index) => <div key={`${entry.at}-${index}`}><b>{entry.action}</b><span>{entry.reason}</span><small>{entry.by} · {new Date(entry.at).toLocaleString()}{entry.ruleTitle && ` · Rule: ${entry.ruleTitle}`}</small></div>)}</details>
            {report.status === 'Needs information' && <div className="report-followup"><label>Reply to the admin<textarea rows="3" value={responseDrafts[report.id] || ''} onChange={(event) => setResponseDrafts((prev) => ({ ...prev, [report.id]: event.target.value }))} /></label><Button variant="secondary" onClick={() => sendResponse(report)}>Send response</Button></div>}
            {report.lastDecision && !['Needs information', 'Under investigation', 'Appealed'].includes(report.status) && <div className="report-followup"><label>Appeal this decision<textarea rows="3" value={appealDrafts[report.id] || ''} onChange={(event) => setAppealDrafts((prev) => ({ ...prev, [report.id]: event.target.value }))} placeholder="Explain why you believe this decision should be reviewed." /></label><Button variant="secondary" onClick={() => sendAppeal(report)}>Submit appeal</Button></div>}
          </article>)}</div> : <EmptyState icon={FileText} title={currentUser ? 'No reports from this account' : 'No report found'} detail={currentUser ? 'Reports you submit will appear here with private status updates.' : 'Enter a valid case reference to review an anonymous report.'} />}
        <p className="muted">Never post reports or evidence publicly. If there is immediate danger, contact local emergency services.</p>
      </section>
    </div>
    <p className="fairplay-footer"><Link to="/faq">How case reviews work <ArrowRight size={14} /></Link><span>Frontend demo · no report data leaves this browser</span></p>
  </div>
}
