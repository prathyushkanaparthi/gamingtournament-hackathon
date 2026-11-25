import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock3, Coins, Copy, List, Search, ShieldCheck, SlidersHorizontal, Users, X } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Button, EmptyState, PageHeading, StatusPill, TournamentCard } from '../components/UI.jsx'
import { RuleSheet } from '../components/RuleSheet.jsx'
import { dateLabel, money } from '../utils/format.js'

export function TournamentListPage() {
  const { tournaments } = useApp()
  const [query, setQuery] = useState('')
  const [game, setGame] = useState('All games')
  const [status, setStatus] = useState('All statuses')
  const [prize, setPrize] = useState('Any prize')
  const [entry, setEntry] = useState('Any entry')
  const [view, setView] = useState('grid')
  const games = ['All games', ...new Set(tournaments.map((item) => item.game))]
  const filtered = useMemo(() => tournaments.filter((item) => {
    const textMatch = `${item.name} ${item.game}`.toLowerCase().includes(query.toLowerCase())
    return textMatch && (game === 'All games' || item.game === game) && (status === 'All statuses' || item.status === status) && (prize === 'Any prize' || item.prize >= Number(prize)) && (entry === 'Any entry' || (entry === 'Free' ? item.fee === 0 : item.fee > 0))
  }), [tournaments, query, game, status, prize, entry])
  return <div className="page-container"><PageHeading eyebrow="PICK YOUR BATTLE" title="Find your tournament" detail="Big bracket energy. Find an event that fits your game." action={<span className="results-count">{filtered.length} EVENTS</span>} />
    <section className="filter-panel"><label className="search-field"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tournaments or games" aria-label="Search tournaments" />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}</label><div className="filters"><label><span>GAME</span><select value={game} onChange={(event) => setGame(event.target.value)}>{games.map((item) => <option key={item}>{item}</option>)}</select></label><label><span>STATUS</span><select value={status} onChange={(event) => setStatus(event.target.value)}>{['All statuses', 'Open', 'Starting soon', 'Completed'].map((item) => <option key={item}>{item}</option>)}</select></label><label><span>PRIZE POOL (INR)</span><select value={prize} onChange={(event) => setPrize(event.target.value)}><option>Any prize</option><option value="500">₹500+</option><option value="1000">₹1,000+</option><option value="2000">₹2,000+</option></select></label><label><span>ENTRY FEE</span><select value={entry} onChange={(event) => setEntry(event.target.value)}><option>Any entry</option><option>Free</option><option>Paid</option></select></label><div className="view-switch" aria-label="Tournament display mode"><button className={view === 'grid' ? 'selected' : ''} onClick={() => setView('grid')} aria-label="Grid view"><SlidersHorizontal size={17} /></button><button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')} aria-label="List view"><List size={18} /></button></div></div></section>
    {filtered.length ? <div className={`tournament-grid ${view === 'list' ? 'list-view' : ''}`}>{filtered.map((item) => <TournamentCard key={item.id} tournament={item} view={view} />)}</div> : <EmptyState icon={Search} title="No tournaments found" detail="Try changing your search or filters to see more events." action={<Button variant="secondary" onClick={() => { setQuery(''); setGame('All games'); setStatus('All statuses'); setPrize('Any prize'); setEntry('Any entry') }}>Clear all filters</Button>} />}
  </div>
}

export function TournamentDetailPage() {
  const { id } = useParams()
  const { tournaments, currentUser, users, teams, registrations, ruleAcknowledgements, acknowledgeTournamentRules, createTeam, joinTeam, registerEntry, notify } = useApp()
  const tournament = tournaments.find((item) => item.id === id)
  const [teamName, setTeamName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const navigate = useNavigate()
  if (!tournament) return <div className="page-container"><EmptyState title="Tournament not found" detail="This event may have been removed." action={<Link className="button button-primary" to="/tournaments">Browse tournaments</Link>} /></div>
  const myTeam = teams.find((team) => team.tournamentId === id && team.memberIds.includes(currentUser?.id))
  const myRegistration = registrations.find((item) => {
    if (item.tournamentId !== id || !currentUser) return false
    const registrationTeam = teams.find((team) => team.id === item.teamId)
    return item.playerId === currentUser.id || registrationTeam?.memberIds.includes(currentUser.id)
  })
  const acceptedCurrentRules = ruleAcknowledgements.some((item) => item.tournamentId === id && item.userId === currentUser?.id && item.ruleVersion === tournament.ruleVersion)
  const teamRuleStatus = myTeam?.memberIds.map((memberId) => ({
    id: memberId,
    name: users.find((user) => user.id === memberId)?.gamerTag || 'Player',
    acknowledged: ruleAcknowledgements.some((item) => item.tournamentId === id && item.userId === memberId && item.ruleVersion === tournament.ruleVersion),
  })) || []
  const teamRulesAccepted = !myTeam || teamRuleStatus.every((member) => member.acknowledged)
  const isIndividual = tournament.rosterSize === 1
  const create = (event) => { event.preventDefault(); const result = createTeam({ tournamentId: id, name: teamName }); if (result.error) notify(result.error, 'error'); else { notify('Team created. Share the invite code with your players.'); setTeamName('') } }
  const join = (event) => { event.preventDefault(); const result = joinTeam({ tournamentId: id, code: inviteCode }); if (result.error) notify(result.error, 'error'); else { notify(`You joined ${result.team.name}.`); setInviteCode('') } }
  const register = () => {
    if (!currentUser) { navigate('/signin'); return }
    if (!isIndividual && !myTeam) { notify('Create or join a team before registering for this team tournament.', 'error'); return }
    if (!isIndividual && myTeam.captainId !== currentUser.id) { notify('Only your team captain can register the team.', 'error'); return }
    if (!teamRulesAccepted) { notify('Every team member must acknowledge the current rules before team registration.', 'error'); return }
    if (!acceptedCurrentRules) { notify('Review and accept the current tournament rules before registering.', 'error'); return }
    const result = registerEntry(id, isIndividual ? null : myTeam?.id, tournament.ruleVersion)
    if (result.error) notify(result.error, 'error'); else notify('Registration confirmed. Good luck!')
  }
  const acknowledgeRules = () => {
    const result = acknowledgeTournamentRules(id, tournament.ruleVersion)
    if (result.error) notify(result.error, 'error'); else notify(`Tournament rules v${tournament.ruleVersion} acknowledged.`)
  }
  const teamRows = teams.filter((team) => team.tournamentId === id)
  return <div className="page-container detail-page"><Link to="/tournaments" className="back-link"><ArrowLeft size={16} /> All tournaments</Link><section className={`detail-hero accent-${tournament.accent}`}><div className="detail-art">{tournament.imageUrl && <img className="game-art-image" src={tournament.imageUrl} alt={`${tournament.game} official artwork`} onError={(event) => { event.currentTarget.hidden = true }} />}<span className="detail-letter">{tournament.game.slice(0, 1)}</span><span className="detail-tag"><StatusPill status={tournament.status} /></span><span className="detail-art-foot">{tournament.game.toUpperCase()} / COMMUNITY SERIES</span></div><div className="detail-intro"><p className="eyebrow">{tournament.format}</p><h1>{tournament.name}</h1><p>{tournament.description}</p><div className="detail-metrics"><div><span>PRIZE POOL</span><strong>{money(tournament.prize)}</strong></div><div><span>ENTRY FEE</span><strong>{tournament.fee ? money(tournament.fee) : 'Free'}</strong></div><div><span>AVAILABLE SLOTS</span><strong>{Math.max(0, tournament.slots - tournament.filled)}<small> / {tournament.slots}</small></strong></div></div>{tournament.prizeStatus === 'On hold' && <p className="prize-status-note">Prize status: On hold · {tournament.prizeReason}</p>}<Button onClick={register} disabled={Boolean(myRegistration) || tournament.status === 'Completed' || (Boolean(currentUser) && !acceptedCurrentRules)}>{myRegistration ? 'Already registered' : !currentUser ? 'Sign in to get started' : !acceptedCurrentRules ? 'Accept rules to register' : isIndividual ? 'Register solo' : myTeam?.captainId === currentUser.id ? 'Register your team' : myTeam ? 'Team captain registers' : 'Build or join a team'} <ArrowRight size={16} /></Button>{!isIndividual && !myTeam && <span className="detail-hint">Build or join your roster below before registering.</span>}</div></section>
    <div className="detail-columns"><div className="detail-main"><section className="content-card"><h2><CalendarDays size={18} /> Event schedule</h2><div className="schedule-line"><span>{dateLabel(tournament.date)}</span><span>{tournament.time} local time</span><span>{tournament.format}</span></div></section><RuleSheet tournament={tournament} acknowledged={acceptedCurrentRules} canAcknowledge={Boolean(currentUser)} onAcknowledge={acknowledgeRules} memberStatus={teamRuleStatus} /><section className="content-card"><div className="card-heading-inline"><h2><Users size={18} /> Registered teams <span className="count-chip">{teamRows.length}</span></h2><span className="muted">Roster size: {tournament.rosterSize}</span></div>{teamRows.length ? <div className="team-roster-list">{teamRows.map((team) => <div className="team-roster" key={team.id}><div className="team-avatar">{team.name.slice(0, 1).toUpperCase()}</div><div className="roster-details"><strong>{team.name}</strong><span>Captain: {users.find((user) => user.id === team.captainId)?.gamerTag || 'Player'} · {team.memberIds.length}/{tournament.rosterSize} players</span><div className="roster-members">{team.memberIds.map((memberId) => <span key={memberId}>{users.find((user) => user.id === memberId)?.gamerTag || 'Player'} · Joined</span>)}</div></div><StatusPill status={team.registration} /></div>)}</div> : <p className="muted">No teams have been formed yet. Be the first.</p>}</section></div>
      <aside className="detail-aside">{!currentUser ? <section className="side-card"><p className="eyebrow">READY TO COMPETE?</p><h3>Get in the game.</h3><p>Sign in or create a player account to register and manage your roster.</p><Link className="button button-primary full-button" to="/signin">Sign in to continue</Link></section> : !isIndividual && <section className="side-card"><p className="eyebrow">TEAM HUB</p><h3>{myTeam ? myTeam.name : 'Make your squad'}</h3>{myTeam ? <><div className="team-code"><span>INVITE CODE · ACTIVE</span><strong>{myTeam.inviteCode}</strong><button aria-label="Copy invite code" onClick={() => { navigator.clipboard?.writeText(myTeam.inviteCode); notify('Invite code copied.') }}><Copy size={15} /></button></div><p className="muted">Share this code with players to fill your {tournament.rosterSize}-person roster.</p>{myTeam.captainId === currentUser.id && <StatusPill status={myTeam.registration} />}</> : <><form className="compact-form" onSubmit={create}><label>Team name<input required maxLength="30" value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="e.g. Night Shift" /></label><Button type="submit">Create a team</Button></form><div className="divider-label"><span>OR JOIN A TEAM</span></div><form className="compact-form" onSubmit={join}><label>Captain's invite code<input required value={inviteCode} onChange={(event) => setInviteCode(event.target.value)} placeholder="ENTER CODE" /></label><Button variant="secondary" type="submit">Join roster</Button></form></>}</section>}
        <section className="side-card payment-card"><p className="eyebrow">DEMO PAYMENT INFO</p><h3>{tournament.fee ? `${money(tournament.fee)} entry fee` : 'Free entry'}</h3><p>Payment details are placeholders for demonstration only. No real payment is processed.</p><div className="upi-box"><span>DEMO UPI ID</span><strong>arena.demo@upi</strong></div><span className="demo-watermark">PLACEHOLDER · NOT FOR PAYMENT</span></section><section className="side-card checkin-card"><Clock3 size={18} /><span><strong>Check-in opens 30 min before</strong><small>Please arrive ready to play.</small></span></section></aside>
    </div>
  </div>
}
