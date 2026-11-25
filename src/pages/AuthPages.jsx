import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Gamepad2, ShieldCheck, UserRound } from 'lucide-react'
import { useApp } from '../context/AppContext.jsx'

function AuthShell({ children, title, detail, mode }) {
  return <div className="auth-page"><div className="auth-visual"><Link to="/" className="brand"><span className="brand-mark"><Gamepad2 size={20} /></span><span>ARENA<span className="brand-dot">.</span></span></Link><div className="auth-art"><span className="auth-cross">✳</span><p className="eyebrow">YOUR NEXT MATCH STARTS HERE</p><h2>Find your<br /><span>competitive edge.</span></h2><p>Compete with your community. Build your legacy.</p></div><div className="auth-visual-foot"><span>ARENA COMMUNITY PORTAL</span><span>01 / 04</span></div></div><div className="auth-main"><div className="auth-card"><div className="auth-mobile-brand"><Link to="/" className="brand"><span className="brand-mark"><Gamepad2 size={20} /></span><span>ARENA<span className="brand-dot">.</span></span></Link></div><p className="eyebrow">{mode === 'signup' ? 'CREATE YOUR PLAYER ID' : 'WELCOME BACK'}</p><h1>{title}</h1><p className="auth-detail">{detail}</p>{children}</div><div className="auth-safe"><ShieldCheck size={15} /> Demo platform · Your data stays in this browser</div></div></div>
}

export function SignInPage() {
  const { login, notify } = useApp()
  const navigate = useNavigate()
  const [role, setRole] = useState('Player')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const fillDemo = (selectedRole) => {
    setRole(selectedRole)
    setEmail(selectedRole === 'Admin' ? 'admin@arena.demo' : 'player@arena.demo')
    setPassword(selectedRole === 'Admin' ? 'admin123' : 'player123')
    setError('')
  }
  const submit = (event) => {
    event.preventDefault()
    const result = login(email, password, role)
    if (result.error) { setError(result.error); return }
    notify(`Welcome back, ${result.user.name.split(' ')[0]}!`)
    navigate(role === 'Admin' ? '/admin' : '/dashboard')
  }
  return <AuthShell mode="signin" title="Good to see you." detail="Sign in and get back in the game."><form className="auth-form" onSubmit={submit}><div className="role-select"><button type="button" className={role === 'Player' ? 'active' : ''} onClick={() => setRole('Player')}><UserRound size={16} /> Player</button><button type="button" className={role === 'Admin' ? 'active' : ''} onClick={() => setRole('Admin')}><ShieldCheck size={16} /> Admin</button></div><label>Email address<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><label>Password<span className="password-input"><input type={show ? 'text' : 'password'} required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary full-button" type="submit">Sign in <span>→</span></button></form><div className="demo-box"><div><strong>Try a demo account</strong><small>Credentials are placeholders for this demo.</small></div><div className="demo-quick"><button onClick={() => fillDemo('Player')}>Player demo</button><button onClick={() => fillDemo('Admin')}>Admin demo</button></div><small>Player: player@arena.demo / player123</small><small>Admin: admin@arena.demo / admin123</small></div><p className="auth-switch">New to Arena? <Link to="/signup">Create an account</Link></p></AuthShell>
}

export function SignUpPage() {
  const { signup, notify } = useApp()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', gamerTag: '', email: '', password: '', confirm: '', role: 'Player' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const change = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }))
  const submit = (event) => {
    event.preventDefault()
    if (form.password.length < 8) { setError('Use at least 8 characters for your password.'); return }
    if (form.password !== form.confirm) { setError('Your passwords do not match.'); return }
    const result = signup(form)
    if (result.error) { setError(result.error); return }
    notify('Your Arena profile is ready.')
    navigate('/dashboard')
  }
  return <AuthShell mode="signup" title="Join the arena." detail="Create your player profile and find your first tournament."><form className="auth-form" onSubmit={submit}><div className="role-select"><button type="button" className={form.role === 'Player' ? 'active' : ''} onClick={() => setForm((prev) => ({ ...prev, role: 'Player' }))}><UserRound size={16} /> Player</button><button type="button" className={form.role === 'Admin' ? 'active' : ''} onClick={() => setForm((prev) => ({ ...prev, role: 'Admin' }))}><ShieldCheck size={16} /> Admin</button></div><div className="form-two-col"><label>Full name<input required value={form.name} onChange={change('name')} placeholder="Your name" autoComplete="name" /></label><label>Gamer tag<input required value={form.gamerTag} onChange={change('gamerTag')} placeholder="Your handle" /></label></div><label>Email address<input type="email" required value={form.email} onChange={change('email')} placeholder="you@example.com" autoComplete="email" /></label><label>Password<span className="password-input"><input type={show ? 'text' : 'password'} required minLength="8" value={form.password} onChange={change('password')} placeholder="At least 8 characters" autoComplete="new-password" /><button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><label>Confirm password<input type={show ? 'text' : 'password'} required value={form.confirm} onChange={change('confirm')} placeholder="Enter your password again" autoComplete="new-password" /></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary full-button" type="submit">Create account <span>→</span></button><small className="muted">Player and admin accounts are demo-only and saved in this browser.</small></form><p className="auth-switch">Already have an account? <Link to="/signin">Sign in</Link></p></AuthShell>
}
