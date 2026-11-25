import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Gamepad2, Menu, X, UserRound, LogOut, ChevronDown } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'
import { Toasts } from './UI.jsx'

export function SiteLayout() {
  const { currentUser, logout, toasts, removeToast } = useApp()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const signOut = () => { logout(); setOpen(false); navigate('/') }
  const links = [['Tournaments', '/tournaments'], ['FairPlay', '/fairplay'], ['About', '/about'], ['FAQ', '/faq']]
  return <div className="app-shell"><header className="topbar"><Link to="/" className="brand"><span className="brand-mark"><Gamepad2 size={20} /></span><span>ARENA<span className="brand-dot">.</span></span></Link>
    <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? <X /> : <Menu />}</button>
    <nav className={`main-nav ${open ? 'nav-open' : ''}`}>{links.map(([label, path]) => <NavLink key={path} to={path} onClick={() => setOpen(false)}>{label}</NavLink>)}
      {currentUser ? <div className="nav-user"><NavLink to={currentUser.role === 'Admin' ? '/admin' : '/dashboard'} onClick={() => setOpen(false)}><span className="avatar-mini">{currentUser.avatar}</span>{currentUser.name.split(' ')[0]} <ChevronDown size={14} /></NavLink><button className="logout-btn" onClick={signOut}><LogOut size={15} /> Sign out</button></div> : <div className="nav-actions"><Link className="nav-signin" to="/signin" onClick={() => setOpen(false)}>Sign in</Link><Link className="button button-small button-primary" to="/signup" onClick={() => setOpen(false)}>Join the arena <span>↗</span></Link></div>}
    </nav></header><main><Outlet /></main><footer className="footer"><div className="footer-main"><Link to="/" className="brand"><span className="brand-mark"><Gamepad2 size={20} /></span><span>ARENA<span className="brand-dot">.</span></span></Link><p>Find your next match. Make it count.</p><div className="footer-links"><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/faq">FAQ</Link><Link to="/tournaments">Tournaments</Link><Link to="/fairplay">FairPlay Center</Link></div></div><div className="footer-bottom"><span>© 2026 Arena Community. Built for players.</span><span>Demo platform · No real payments</span></div></footer><Toasts items={toasts} remove={removeToast} /></div>
}
export function DashboardLayout() { return <div className="dashboard-wrap"><Outlet /></div> }
