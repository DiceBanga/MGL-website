import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import AuthGuard from './components/AuthGuard';

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

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminLeagues from './pages/admin/Leagues';
import AdminTournaments from './pages/admin/Tournaments';
import AdminTeams from './pages/admin/Teams';
import AdminPlayers from './pages/admin/Players';
import AdminGames from './pages/admin/Games';
import AdminNews from './pages/admin/News';
import AdminSponsors from './pages/admin/Sponsors';
import AdminSettings from './pages/admin/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
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

        {/* Admin Routes */}
        <Route path="admin" element={<AuthGuard requireAuth requireAdmin />}>
          <Route index element={<AdminDashboard />} />
          <Route path="leagues" element={<AdminLeagues />} />
          <Route path="tournaments" element={<AdminTournaments />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="players" element={<AdminPlayers />} />
          <Route path="games" element={<AdminGames />} />
          <Route path="news" element={<AdminNews />} />
          <Route path="sponsors" element={<AdminSponsors />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;