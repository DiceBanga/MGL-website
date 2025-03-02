import React from 'react';
import { Routes, Route, BrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import { OwnerRoute } from './components/OwnerRoute';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';

// Public Pages
import Home from './pages/Home';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';

// Feature Pages
import Games from './pages/Games';
import Schedule from './pages/Schedule';
import Tournaments from './pages/Tournaments';
import Teams from './pages/Teams';
import Players from './pages/Players';
import Stats from './pages/Stats';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import EmailVerification from './pages/auth/EmailVerification';
import EmailVerificationSuccess from './pages/auth/EmailVerificationSuccess';
import EmailVerificationFailed from './pages/auth/EmailVerificationFailed';

// Dashboard Pages
import UserDashboard from './pages/dashboard/UserDashboard';
import TeamDashboard from './pages/dashboard/TeamDashboard';

// Profile Pages
import UserProfile from './pages/profile/UserProfile';
import TeamProfile from './pages/profile/TeamProfile';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminLeagues from './pages/admin/Leagues';
import AdminTournaments from './pages/admin/Tournaments';
import AdminTeams from './pages/admin/Teams';
import AdminPlayers from './pages/admin/Players';
import AdminGames from './pages/admin/Games';
import AdminNews from './pages/admin/News';
import AdminSponsors from './pages/admin/Sponsors';
import AdminSettings from './pages/admin/Settings';
import AdminSiteContent from './pages/admin/SiteContent';
import AdminManagement from './pages/admin/Management';

// Owner Pages
import AdminLeagues from './pages/owner/Leagues';
import AdminPlayers from './pages/owner/Players';
import AdminSettings from './pages/owner/Settings';
import AdminSiteContent from './pages/owner/SiteContent';
import AdminSponsors from './pages/owner/Sponsors';
import AdminUsers from './pages/owner/Users';
import AdminTeams from './pages/owner/Teams';
import AdminTournaments from './pages/owner/Tournaments';
import AdminNews from './pages/owner/News';
import AdminManagement from './pages/owner/Management';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          {/* Public Routes */}
          <Route index element={<Home />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          
          {/* Feature Routes */}
          <Route path="games" element={<Games />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="tournaments" element={<Tournaments />} />
          <Route path="teams" element={<Teams />} />
          <Route path="players" element={<Players />} />
          <Route path="stats" element={<Stats />} />

          {/* Auth Routes */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="email-verification" element={<EmailVerification />} />
          <Route path="email-verification/success" element={<EmailVerificationSuccess />} />
          <Route path="email-verification/failed" element={<EmailVerificationFailed />} />

          {/* Dashboard Routes */}
          <Route path="dashboard" element={<AuthGuard requireAuth><UserDashboard /></AuthGuard>} />
          <Route path="team/:teamId/dashboard" element={<AuthGuard requireAuth><TeamDashboard /></AuthGuard>} />

          {/* Profile Routes */}
          <Route path="user/:userId" element={<UserProfile />} />
          <Route path="team/:teamId" element={<TeamProfile />} />

          {/* Admin Routes */}
          <Route path="admin" element={<AuthGuard requireAuth requireAdmin><AdminDashboard /></AuthGuard>} />
          <Route path="admin/users" element={<AuthGuard requireAuth requireAdmin><AdminUsers /></AuthGuard>} />
          <Route path="admin/leagues" element={<AuthGuard requireAuth requireAdmin><AdminLeagues /></AuthGuard>} />
          <Route path="admin/tournaments" element={<AuthGuard requireAuth requireAdmin><AdminTournaments /></AuthGuard>} />
          <Route path="admin/teams" element={<AuthGuard requireAuth requireAdmin><AdminTeams /></AuthGuard>} />
          <Route path="admin/players" element={<AuthGuard requireAuth requireAdmin><AdminPlayers /></AuthGuard>} />
          <Route path="admin/games" element={<AuthGuard requireAuth requireAdmin><AdminGames /></AuthGuard>} />
          <Route path="admin/news" element={<AuthGuard requireAuth requireAdmin><AdminNews /></AuthGuard>} />
          <Route path="admin/sponsors" element={<AuthGuard requireAuth requireAdmin><AdminSponsors /></AuthGuard>} />
          <Route path="admin/settings" element={<AuthGuard requireAuth requireAdmin><AdminSettings /></AuthGuard>} />
          <Route path="admin/site-content" element={<AuthGuard requireAuth requireAdmin><AdminSiteContent /></AuthGuard>} />
          <Route path="admin/management" element={<AuthGuard requireAuth requireAdmin><AdminManagement /></AuthGuard>} />

          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route
          path="/owner/*"
          element={
            <OwnerRoute>
              <Routes>
                <Route path="/" element={<OwnerDashboard />} />
                <Route path="admins" element={<AdminManagement />} />
                <Route path="leagues" element={<AdminLeagues />} />
                <Route path="players" element={<AdminPlayers />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="site-content" element={<AdminSiteContent />} />
                <Route path="sponsors" element={<AdminSponsors />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="teams" element={<AdminTeams />} />
                <Route path="tournaments" element={<AdminTournaments />} />
                <Route path="news" element={<AdminNews />} />
                {/* Add other owner routes */}
              </Routes>
            </OwnerRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;