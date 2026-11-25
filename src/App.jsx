import { Navigate, Route, Routes } from 'react-router-dom'
import { useApp } from './context/AppContext.jsx'
import { SiteLayout } from './components/Layout.jsx'
import HomePage, { AboutPage, ContactPage, FAQPage } from './pages/HomePage.jsx'
import { TournamentDetailPage, TournamentListPage } from './pages/TournamentPages.jsx'
import { SignInPage, SignUpPage } from './pages/AuthPages.jsx'
import PlayerDashboard from './pages/DashboardPages.jsx'
import AdminPage from './pages/AdminPage.jsx'
import FairPlayPage from './pages/FairPlayPage.jsx'

function Protected({ role, children }) {
  const { currentUser } = useApp()
  if (!currentUser) return <Navigate to="/signin" replace />
  if (role && currentUser.role !== role) return <Navigate to={currentUser.role === 'Admin' ? '/admin' : '/dashboard'} replace />
  return children
}

export default function App() {
  const { currentUser } = useApp()
  return <Routes><Route element={<SiteLayout />}><Route index element={<HomePage />} /><Route path="tournaments" element={<TournamentListPage />} /><Route path="tournaments/:id" element={<TournamentDetailPage />} /><Route path="fairplay" element={<FairPlayPage />} /><Route path="about" element={<AboutPage />} /><Route path="contact" element={<ContactPage />} /><Route path="faq" element={<FAQPage />} /><Route path="signin" element={currentUser ? <Navigate to={currentUser.role === 'Admin' ? '/admin' : '/dashboard'} replace /> : <SignInPage />} /><Route path="signup" element={currentUser ? <Navigate to={currentUser.role === 'Admin' ? '/admin' : '/dashboard'} replace /> : <SignUpPage />} /><Route path="dashboard" element={<Protected role="Player"><PlayerDashboard /></Protected>} /><Route path="admin" element={<Protected role="Admin"><AdminPage /></Protected>} /><Route path="*" element={<Navigate to="/" replace />} /></Route></Routes>
}
