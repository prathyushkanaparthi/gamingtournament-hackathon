import { Link } from 'react-router-dom'
import { ArrowUpRight, CalendarDays, Check, Clock3, Coins, Users, X } from 'lucide-react'
import { dateLabel, money } from '../utils/format.js'

export function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>
}
export function Toasts({ items, remove }) {
  return <div className="toast-stack" aria-live="polite">{items.map((toast) => <div key={toast.id} className={`toast toast-${toast.type}`} role="status">{toast.type === 'success' ? <Check size={17} /> : <X size={17} />}<span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => remove(toast.id)}><X size={15} /></button></div>)}</div>
}
export function StatusPill({ status }) { return <span className={`status-pill status-${status.toLowerCase().replace(/\s+/g, '-')}`}>{status}</span> }
export function TournamentCard({ tournament, view = 'grid' }) {
  return <article className={`tournament-card ${view === 'list' ? 'tournament-list-card' : ''} accent-${tournament.accent}`}>
    <div className="card-art">{tournament.imageUrl && <img className="game-art-image" src={tournament.imageUrl} alt={`${tournament.game} official artwork`} loading="lazy" onError={(event) => { event.currentTarget.hidden = true }} />}<span className="game-mark">{tournament.game === 'Valorant' ? 'V' : tournament.game === 'BGMI' ? 'B' : tournament.game.slice(0, 1)}</span><span className="art-glow" /><StatusPill status={tournament.status} /><span className="card-game">{tournament.game}</span></div>
    <div className="card-content"><div className="card-title-row"><div><p className="eyebrow">{tournament.format}</p><h3>{tournament.name}</h3></div><div className="prize-label"><span>PRIZE POOL</span><strong>{money(tournament.prize)}</strong></div></div>
      <div className="card-meta"><span><CalendarDays size={15} />{dateLabel(tournament.date)}</span><span><Users size={15} />{tournament.filled}/{tournament.slots} slots</span><span><Coins size={15} />{tournament.fee ? money(tournament.fee) : 'Free entry'}</span></div>
      <div className="card-bottom"><div className="slot-track"><span style={{ width: `${Math.min(100, tournament.filled / tournament.slots * 100)}%` }} /></div><Link className="text-link" to={`/tournaments/${tournament.id}`}>View tournament <ArrowUpRight size={16} /></Link></div>
    </div>
  </article>
}
export function EmptyState({ icon: Icon = Clock3, title, detail, action }) {
  return <div className="empty-state"><span className="empty-icon"><Icon size={22} /></span><h3>{title}</h3><p>{detail}</p>{action}</div>
}
export function PageHeading({ eyebrow, title, detail, action }) {
  return <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{detail && <p className="page-detail">{detail}</p>}</div>{action}</div>
}
