import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';
import { OwnerRoute } from './components/OwnerRoute';

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

// Payment Pages
import Payments from './pages/Payments';

// Owner Pages
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerLeagues from './pages/owner/Leagues';
import OwnerPlayers from './pages/owner/Players';
import OwnerSettings from './pages/owner/Settings';
import OwnerSiteContent from './pages/owner/SiteContent';
import OwnerSponsors from './pages/owner/Sponsors';
import OwnerUsers from './pages/owner/Users';
import OwnerTeams from './pages/owner/Teams';
import OwnerTournaments from './pages/owner/Tournaments';
import OwnerNews from './pages/owner/News';
import OwnerManagement from './pages/owner/Management';

function App() {
  return (
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

        {/* Payment Routes */}
        <Route path="payments" element={<AuthGuard requireAuth><Payments /></AuthGuard>} />

        {/* Admin Routes - accessible by both admins and owners */}
        <Route
          path="/admin/*"
          element={
            <AuthGuard requireAuth requireAdmin>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="leagues" element={<AdminLeagues />} />
                <Route path="tournaments" element={<AdminTournaments />} />
                <Route path="teams" element={<AdminTeams />} />
                <Route path="players" element={<AdminPlayers />} />
                <Route path="games" element={<AdminGames />} />
                <Route path="news" element={<AdminNews />} />
                <Route path="sponsors" element={<AdminSponsors />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="site-content" element={<AdminSiteContent />} />
                <Route path="management" element={<AdminManagement />} />
              </Routes>
            </AuthGuard>
          }
        />

        {/* Owner Routes */}
        <Route
          path="/owner/*"
          element={
            <OwnerRoute>
              <Routes>
                <Route index element={<OwnerDashboard />} />
                <Route path="admins" element={<OwnerManagement />} />
                <Route path="leagues" element={<OwnerLeagues />} />
                <Route path="players" element={<OwnerPlayers />} />
                <Route path="settings" element={<OwnerSettings />} />
                <Route path="site-content" element={<OwnerSiteContent />} />
                <Route path="sponsors" element={<OwnerSponsors />} />
                <Route path="users" element={<OwnerUsers />} />
                <Route path="teams" element={<OwnerTeams />} />
                <Route path="tournaments" element={<OwnerTournaments />} />
                <Route path="news" element={<OwnerNews />} />
              </Routes>
            </OwnerRoute>
          }
        />

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;