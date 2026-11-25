import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { gameImages, initialRegistrations, initialResults, initialTeams, initialTournaments, initialUsers } from '../data/seed.js'
import { makeId } from '../utils/format.js'

const STORAGE_KEY = 'arena-portal-v1'
const AppContext = createContext(null)

function normalizeRules(rules = []) {
  return rules.map((rule, index) => typeof rule === 'string'
    ? { id: `rule-${index + 1}`, title: `Rule ${index + 1}`, body: rule }
    : { ...rule, id: rule.id || `rule-${index + 1}`, title: rule.title || `Rule ${index + 1}`, body: rule.body || '' })
}

function normalizeState(state) {
  return {
    ...state,
    tournaments: (state.tournaments || initialTournaments).map((tournament) => {
      const seed = initialTournaments.find((item) => item.id === tournament.id)
      const savedRules = tournament.rules || []
      const seedRuleText = seed?.rules.map((rule) => typeof rule === 'string' ? rule : rule.body)
      const savedRuleText = savedRules.map((rule) => typeof rule === 'string' ? rule : rule.body)
      const hasLegacySeedTitles = savedRules.every((rule, index) => typeof rule === 'string' || rule.title === `Rule ${index + 1}`)
      const matchesUnchangedSeed = seed && hasLegacySeedTitles && JSON.stringify(savedRuleText) === JSON.stringify(seedRuleText)
      return {
        ...tournament,
        imageUrl: tournament.imageUrl || gameImages[tournament.game] || '',
        rules: normalizeRules(matchesUnchangedSeed ? seed.rules : savedRules),
        ruleVersion: tournament.ruleVersion || 1,
      }
    }),
    registrations: (state.registrations || initialRegistrations).map((registration) => ({
      ...registration,
      acceptedBy: registration.acceptedBy || [],
      ruleVersion: registration.ruleVersion || 0,
    })),
    ruleAcknowledgements: state.ruleAcknowledgements || [],
    reports: state.reports || [],
  }
}

function readState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const state = JSON.parse(saved)
      return normalizeState(state)
    }
  } catch (error) {
    console.error('Could not read saved Arena data:', error)
  }
  return normalizeState({ tournaments: initialTournaments, users: initialUsers, teams: initialTeams, registrations: initialRegistrations, results: initialResults, currentUser: null })
}

export function AppProvider({ children }) {
  const [state, setState] = useState(readState)
  const [toasts, setToasts] = useState([])
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch (error) { console.error('Could not save Arena data:', error) }
  }, [state])

  const notify = (message, type = 'success') => {
    const id = makeId('toast')
    setToasts((items) => [...items, { id, message, type }])
    window.setTimeout(() => setToasts((items) => items.filter((toast) => toast.id !== id)), 3600)
  }
  const login = (email, password, role) => {
    const user = state.users.find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password && item.role === role)
    if (!user) return { error: 'Those demo credentials do not match this role.' }
    setState((prev) => ({ ...prev, currentUser: user }))
    return { user }
  }
  const signup = ({ name, email, password, role, gamerTag }) => {
    if (state.users.some((user) => user.email.toLowerCase() === email.toLowerCase())) return { error: 'An account with this email already exists.' }
    const user = { id: makeId('user'), name, email, password, role, gamerTag, avatar: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() }
    setState((prev) => ({ ...prev, users: [...prev.users, user], currentUser: user }))
    return { user }
  }
  const logout = () => setState((prev) => ({ ...prev, currentUser: null }))
  const createTournament = (tournament) => setState((prev) => ({ ...prev, tournaments: [{ ...tournament, rules: normalizeRules(tournament.rules), ruleVersion: 1 }, ...prev.tournaments] }))
  const updateTournament = (tournament) => setState((prev) => ({
    ...prev,
    tournaments: prev.tournaments.map((item) => {
      if (item.id !== tournament.id) return item
      const rules = normalizeRules(tournament.rules)
      const changed = JSON.stringify(item.rules) !== JSON.stringify(rules)
      return { ...tournament, rules, ruleVersion: changed ? item.ruleVersion + 1 : item.ruleVersion }
    }),
  }))
  const deleteTournament = (id) => setState((prev) => ({ ...prev, tournaments: prev.tournaments.filter((item) => item.id !== id), registrations: prev.registrations.filter((item) => item.tournamentId !== id), teams: prev.teams.filter((item) => item.tournamentId !== id) }))

  const teamConflict = (playerId, tournamentId, exceptTeamId = null) => state.teams.find((team) => team.tournamentId === tournamentId && team.id !== exceptTeamId && team.memberIds.includes(playerId))
  const createTeam = ({ tournamentId, name }) => {
    const user = state.currentUser
    const tournament = state.tournaments.find((item) => item.id === tournamentId)
    if (tournament.status !== 'Open' || tournament.filled >= tournament.slots) return { error: 'Registration is closed or this tournament is full.' }
    if (state.registrations.some((registration) => registration.tournamentId === tournamentId && registration.playerId === user.id && !registration.teamId && registration.status !== 'Cancelled')) return { error: 'You already have a solo entry in this tournament.' }
    if (teamConflict(user.id, tournamentId)) return { error: 'You already belong to another team in this tournament.' }
    const team = { id: makeId('team'), tournamentId, name, captainId: user.id, memberIds: [user.id], inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(), registration: 'Not registered' }
    setState((prev) => ({ ...prev, teams: [...prev.teams, team] }))
    return { team }
  }
  const joinTeam = ({ tournamentId, code }) => {
    const user = state.currentUser
    const tournament = state.tournaments.find((item) => item.id === tournamentId)
    if (tournament.status !== 'Open' || tournament.filled >= tournament.slots) return { error: 'Registration is closed or this tournament is full.' }
    if (state.registrations.some((registration) => registration.tournamentId === tournamentId && registration.playerId === user.id && !registration.teamId && registration.status !== 'Cancelled')) return { error: 'You already have a solo entry in this tournament.' }
    if (teamConflict(user.id, tournamentId)) return { error: 'You already belong to a team in this tournament. Leave that team before joining another.' }
    const team = state.teams.find((item) => item.tournamentId === tournamentId && item.inviteCode.toLowerCase() === code.trim().toLowerCase())
    if (!team) return { error: 'Invite code not found for this tournament.' }
    if (team.memberIds.length >= tournament.rosterSize) return { error: 'This team roster is full.' }
    setState((prev) => ({ ...prev, teams: prev.teams.map((item) => item.id === team.id ? { ...item, memberIds: [...item.memberIds, user.id] } : item) }))
    return { team }
  }
  const editTeamMembers = (teamId, memberIds) => {
    const team = state.teams.find((item) => item.id === teamId)
    const tournament = state.tournaments.find((item) => item.id === team.tournamentId)
    const uniqueIds = [...new Set(memberIds)]
    if (uniqueIds.length > tournament.rosterSize) return { error: `Roster limit is ${tournament.rosterSize} players.` }
    const conflict = uniqueIds.find((id) => teamConflict(id, team.tournamentId, team.id))
    if (conflict) return { error: `${state.users.find((user) => user.id === conflict)?.name || 'A player'} already belongs to another team in this tournament.` }
    if (!uniqueIds.includes(team.captainId)) return { error: 'The captain must remain on the roster.' }
    setState((prev) => ({ ...prev, teams: prev.teams.map((item) => item.id === teamId ? { ...item, memberIds: uniqueIds } : item) }))
    return { success: true }
  }
  const acknowledgeTournamentRules = (tournamentId, ruleVersion) => {
    const user = state.currentUser
    const tournament = state.tournaments.find((item) => item.id === tournamentId)
    if (!user || !tournament || Number(ruleVersion) !== tournament.ruleVersion) return { error: 'The rules changed. Review the current version and try again.' }
    const acknowledgement = { tournamentId, userId: user.id, ruleVersion: tournament.ruleVersion, acceptedAt: new Date().toISOString() }
    setState((prev) => {
      const ruleAcknowledgements = [...prev.ruleAcknowledgements.filter((item) => item.tournamentId !== tournamentId || item.userId !== user.id), acknowledgement]
      const registrations = prev.registrations.map((registration) => {
        if (registration.tournamentId !== tournamentId) return registration
        const team = prev.teams.find((item) => item.id === registration.teamId)
        const appliesToUser = registration.playerId === user.id || team?.memberIds.includes(user.id)
        if (!appliesToUser) return registration
        const acceptedBy = [...(registration.acceptedBy || []).filter((item) => item.userId !== user.id), acknowledgement]
        const participantIds = team?.memberIds || [registration.playerId]
        const allAccepted = participantIds.every((id) => acceptedBy.some((item) => item.userId === id && item.ruleVersion === tournament.ruleVersion))
        return { ...registration, acceptedBy, ...(allAccepted ? { ruleVersion: tournament.ruleVersion } : {}) }
      })
      return { ...prev, ruleAcknowledgements, registrations }
    })
    return { success: true }
  }
  const registerEntry = (tournamentId, teamId = null, acceptedRuleVersion = null) => {
    const user = state.currentUser
    const tournament = state.tournaments.find((item) => item.id === tournamentId)
    if (!user || !tournament) return { error: 'Sign in and select a valid tournament before registering.' }
    if (tournament.status !== 'Open') return { error: 'Registration is closed for this tournament.' }
    if (tournament.filled >= tournament.slots) return { error: 'This tournament is full.' }
    if (tournament.rosterSize > 1 && !teamId) return { error: 'Create or join a team before registering for this team tournament.' }
    if (Number(acceptedRuleVersion) !== tournament.ruleVersion) return { error: 'Review and accept the current tournament rules before registering.' }
    if (teamId) {
      const team = state.teams.find((item) => item.id === teamId)
      if (!team || team.captainId !== user.id) return { error: 'Only the team captain can register this entry.' }
      if (team.memberIds.length !== tournament.rosterSize) return { error: `Complete the ${tournament.rosterSize}-player roster before registering.` }
      if (team.memberIds.some((memberId) => !state.ruleAcknowledgements.some((item) => item.tournamentId === tournamentId && item.userId === memberId && item.ruleVersion === tournament.ruleVersion))) return { error: 'Every team member must review and accept the current tournament rules before registration.' }
      const conflict = team.memberIds.find((id) => teamConflict(id, tournamentId, teamId))
      if (conflict) return { error: 'A team member is already registered on another team in this tournament.' }
      if (team.memberIds.some((id) => state.registrations.some((registration) => registration.tournamentId === tournamentId && registration.playerId === id && !registration.teamId && registration.status !== 'Cancelled'))) return { error: 'A team member already has a solo entry in this tournament. Ask an admin to cancel it first.' }
      if (team.registration === 'Registered') return { error: 'This team is already registered.' }
      const acceptedBy = team.memberIds.map((memberId) => state.ruleAcknowledgements.find((item) => item.tournamentId === tournamentId && item.userId === memberId && item.ruleVersion === tournament.ruleVersion))
      setState((prev) => ({ ...prev, tournaments: prev.tournaments.map((item) => item.id === tournamentId ? { ...item, filled: item.filled + 1 } : item), teams: prev.teams.map((item) => item.id === teamId ? { ...item, registration: 'Registered' } : item), registrations: [...prev.registrations, { id: makeId('reg'), tournamentId, playerId: user.id, teamId, status: 'Confirmed', ruleVersion: tournament.ruleVersion, acceptedBy, createdAt: new Date().toISOString().slice(0, 10) }] }))
      return { success: true }
    }
    if (!state.ruleAcknowledgements.some((item) => item.tournamentId === tournamentId && item.userId === user.id && item.ruleVersion === tournament.ruleVersion)) return { error: 'Review and accept the current tournament rules before registering.' }
    if (teamConflict(user.id, tournamentId)) return { error: 'You belong to a team in this tournament. Register through your captain instead.' }
    if (state.registrations.some((registration) => registration.tournamentId === tournamentId && registration.playerId === user.id)) return { error: 'You are already registered for this tournament.' }
    const acceptedBy = [state.ruleAcknowledgements.find((item) => item.tournamentId === tournamentId && item.userId === user.id && item.ruleVersion === tournament.ruleVersion)]
    setState((prev) => ({ ...prev, tournaments: prev.tournaments.map((item) => item.id === tournamentId ? { ...item, filled: item.filled + 1 } : item), registrations: [...prev.registrations, { id: makeId('reg'), tournamentId, playerId: user.id, teamId: null, status: 'Confirmed', ruleVersion: tournament.ruleVersion, acceptedBy, createdAt: new Date().toISOString().slice(0, 10) }] }))
    return { success: true }
  }
  const submitReport = (form) => {
    const tournament = state.tournaments.find((item) => item.id === form.tournamentId)
    if (!tournament || !form.description.trim()) return { error: 'Select a tournament and describe what happened.' }
    const reportId = makeId('case')
    const reporter = state.currentUser
    const referencedRule = tournament.rules.find((item) => item.id === form.ruleId)
    const report = {
      ...form,
      id: reportId,
      reporterId: reporter?.id || null,
      reporterName: reporter?.name || 'Anonymous viewer',
      reporterEmail: form.reporterEmail || reporter?.email || '',
      tournamentName: tournament.name,
      ruleTitle: referencedRule?.title || '',
      ruleText: referencedRule?.body || '',
      status: 'Open',
      createdAt: new Date().toISOString(),
      history: [{ action: 'Report submitted', reason: 'Case opened for private review.', by: reporter?.name || 'Anonymous viewer', at: new Date().toISOString() }],
      appeals: [],
    }
    setState((prev) => ({ ...prev, reports: [report, ...prev.reports] }))
    return { reportId }
  }
  const appendReportResponse = (reportId, message, accessCode = '') => {
    const report = state.reports.find((item) => item.id === reportId)
    const reporter = state.currentUser
    if (!report || (reporter ? report.reporterId !== reporter.id : Boolean(report.reporterId) || report.id !== accessCode)) return { error: 'You do not have permission to access this case.' }
    if (!message.trim()) return { error: 'Enter a response before sending.' }
    setState((prev) => ({ ...prev, reports: prev.reports.map((item) => item.id === reportId ? {
      ...item,
      status: item.status === 'Needs information' ? 'Open' : item.status,
      history: [...item.history, { action: 'Reporter response', reason: message.trim(), by: reporter?.name || 'Case reporter', at: new Date().toISOString() }],
    } : item) }))
    return { success: true }
  }
  const appealReport = (reportId, message, accessCode = '') => {
    const report = state.reports.find((item) => item.id === reportId)
    const reporter = state.currentUser
    if (!report || (reporter ? report.reporterId !== reporter.id : Boolean(report.reporterId) || report.id !== accessCode)) return { error: 'You do not have permission to appeal this case.' }
    if (!message.trim()) return { error: 'Enter a reason for your appeal.' }
    setState((prev) => ({ ...prev, reports: prev.reports.map((item) => item.id === reportId ? {
      ...item,
      status: 'Appealed',
      appeals: [...(item.appeals || []), { message: message.trim(), by: reporter?.name || 'Case reporter', at: new Date().toISOString() }],
      history: [...item.history, { action: 'Decision appealed', reason: message.trim(), by: reporter?.name || 'Case reporter', at: new Date().toISOString() }],
    } : item) }))
    return { success: true }
  }
  const decideReport = (reportId, decision) => {
    const admin = state.currentUser
    if (admin?.role !== 'Admin') return { error: 'Only an admin can decide a report.' }
    const report = state.reports.find((item) => item.id === reportId)
    if (!report) return { error: 'This case could not be found.' }
    if (!decision.reason?.trim()) return { error: 'A reason is required for every case decision.' }
    const tournament = state.tournaments.find((item) => item.id === report.tournamentId)
    const rule = tournament?.rules.find((item) => item.id === decision.ruleId)
    const prizeAction = decision.action === 'Place prize on hold' || decision.action === 'Release prize'
    if (prizeAction && !rule) return { error: 'Prize decisions must reference a published tournament rule.' }
    if (decision.action === 'Change match result' && (!decision.resultPlayer?.trim() || !Number(decision.resultPlace))) return { error: 'Enter the corrected player and placement.' }
    if (['Forfeit player', 'Disqualify player', 'Forfeit team', 'Disqualify team'].includes(decision.action)) {
      if (!decision.targetId) return { error: 'Select the player or team affected by this decision.' }
      const teamDecision = decision.action.endsWith('team')
      const targetExists = teamDecision
        ? state.teams.some((team) => team.id === decision.targetId && team.tournamentId === report.tournamentId)
        : state.users.some((user) => user.id === decision.targetId && user.role === 'Player')
      if (!targetExists || (!teamDecision && !state.teams.some((team) => team.tournamentId === report.tournamentId && team.memberIds.includes(decision.targetId)) && !state.registrations.some((registration) => registration.tournamentId === report.tournamentId && registration.playerId === decision.targetId))) return { error: 'The selected player or team is not part of this tournament.' }
    }
    const at = new Date().toISOString()
    const historyEntry = {
      ...decision,
      reason: decision.reason.trim(),
      ruleTitle: rule?.title || '',
      by: admin.name,
      adminId: admin.id,
      at,
    }
    let status = 'Resolved'
    if (decision.action === 'Request more information') status = 'Needs information'
    if (decision.action === 'Dismiss report') status = 'Dismissed'
    if (decision.action === 'Issue warning') status = 'Warning issued'
    if (decision.action === 'Change match result') status = 'Result changed'
    if (decision.action === 'Forfeit player' || decision.action === 'Forfeit team') status = 'Forfeited'
    if (decision.action === 'Disqualify player' || decision.action === 'Disqualify team') status = 'Disqualified'
    if (decision.action === 'Place prize on hold') status = 'Under investigation'
    const updates = {
      reports: state.reports.map((item) => item.id === reportId ? { ...item, status, history: [...item.history, historyEntry], lastDecision: historyEntry } : item),
    }
    if (prizeAction) updates.tournaments = state.tournaments.map((item) => item.id === report.tournamentId ? {
      ...item,
      prizeStatus: decision.action === 'Place prize on hold' ? 'On hold' : 'Released',
      prizeReason: historyEntry.reason,
      prizeRuleId: historyEntry.ruleId,
    } : item)
    if (decision.action === 'Change match result') updates.results = [
      ...state.results.filter((item) => item.tournamentId !== report.tournamentId || item.place !== Number(decision.resultPlace)),
      { tournamentId: report.tournamentId, place: Number(decision.resultPlace), player: decision.resultPlayer.trim(), prize: Number(decision.resultPrize || 0), sourceCaseId: reportId },
    ]
    if (['Forfeit player', 'Disqualify player', 'Forfeit team', 'Disqualify team'].includes(decision.action)) {
      const teamDecision = decision.action.endsWith('team')
      const sanction = decision.action.startsWith('Forfeit') ? 'Forfeited' : 'Disqualified'
      const targetTeam = teamDecision ? state.teams.find((team) => team.id === decision.targetId && team.tournamentId === report.tournamentId) : null
      const targetMemberIds = targetTeam ? targetTeam.memberIds : [decision.targetId]
      const sanctionedTeams = state.teams.filter((team) => team.tournamentId === report.tournamentId && (team.id === decision.targetId || team.memberIds.some((id) => targetMemberIds.includes(id))))
      updates.teams = state.teams.map((team) => sanctionedTeams.some((item) => item.id === team.id) ? { ...team, registration: sanction } : team)
      updates.registrations = state.registrations.map((registration) => {
        const registeredTeam = state.teams.find((team) => team.id === registration.teamId)
        const applies = teamDecision
          ? registration.teamId === decision.targetId
          : registration.playerId === decision.targetId || registeredTeam?.memberIds.includes(decision.targetId)
        return registration.tournamentId === report.tournamentId && applies ? { ...registration, status: sanction } : registration
      })
    }
    setState((prev) => ({ ...prev, ...updates }))
    return { success: true }
  }
  const updateRegistrationStatus = (id, status) => setState((prev) => ({ ...prev, registrations: prev.registrations.map((item) => item.id === id ? { ...item, status } : item) }))
  const updatePlayer = (id, profile) => {
    if (state.users.some((user) => user.id !== id && user.email.toLowerCase() === profile.email.toLowerCase())) return { error: 'Another account already uses this email.' }
    setState((prev) => {
      const users = prev.users.map((user) => user.id === id ? { ...user, ...profile } : user)
      return { ...prev, users, currentUser: prev.currentUser?.id === id ? { ...prev.currentUser, ...profile } : prev.currentUser }
    })
    return { success: true }
  }
  const publishResult = (result) => setState((prev) => ({ ...prev, results: [...prev.results.filter((item) => item.tournamentId !== result.tournamentId || item.place !== Number(result.place)), { ...result, place: Number(result.place), prize: Number(result.prize) }] }))

  const value = useMemo(() => ({
    ...state, toasts, notify, login, signup, logout, createTournament, updateTournament, deleteTournament, createTeam, joinTeam, editTeamMembers, registerEntry, acknowledgeTournamentRules, updateRegistrationStatus, updatePlayer, publishResult, submitReport, appendReportResponse, appealReport, decideReport, teamConflict,
    setProfile: (profile) => setState((prev) => ({ ...prev, currentUser: { ...prev.currentUser, ...profile }, users: prev.users.map((user) => user.id === prev.currentUser.id ? { ...user, ...profile } : user) })),
    removeToast: (id) => setToasts((items) => items.filter((item) => item.id !== id)),
  }), [state, toasts])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)
