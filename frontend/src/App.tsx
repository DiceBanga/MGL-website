import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
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
import Rules from './pages/Rules';
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

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true
    },
    children: [
      { index: true, element: <Home /> },
      { path: 'about', element: <About /> },
      { path: 'contact', element: <Contact /> },
      { path: 'faq', element: <FAQ /> },
      { path: 'privacy', element: <Privacy /> },
      { path: 'terms', element: <Terms /> },
      { path: 'rules', element: <Rules /> },
      
      // Feature Routes
      { path: 'games', element: <Games /> },
      { path: 'schedule', element: <Schedule /> },
      { path: 'tournaments', element: <Tournaments /> },
      { path: 'teams', element: <Teams /> },
      { path: 'players', element: <Players /> },
      { path: 'stats', element: <Stats /> },

      // Auth Routes
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      { path: 'forgot-password', element: <ForgotPassword /> },
      { path: 'reset-password', element: <ResetPassword /> },
      { path: 'email-verification', element: <EmailVerification /> },
      { path: 'email-verification/success', element: <EmailVerificationSuccess /> },
      { path: 'email-verification/failed', element: <EmailVerificationFailed /> },

      // Dashboard Routes
      { 
        path: 'dashboard', 
        element: <AuthGuard requireAuth><UserDashboard /></AuthGuard> 
      },
      { 
        path: 'team/:teamId/dashboard', 
        element: <AuthGuard requireAuth><TeamDashboard /></AuthGuard> 
      },

      // Profile Routes
      { path: 'user/:userId', element: <UserProfile /> },
      { path: 'team/:teamId', element: <TeamProfile /> },

      // Payment Routes
      { 
        path: 'payments', 
        element: <AuthGuard requireAuth><Payments /></AuthGuard> 
      },

      // Admin Routes
      {
        path: 'admin',
        element: <AuthGuard requireAuth requireAdmin><AdminDashboard /></AuthGuard>,
        children: [
          { path: 'users', element: <AdminUsers /> },
          { path: 'leagues', element: <AdminLeagues /> },
          { path: 'tournaments', element: <AdminTournaments /> },
          { path: 'teams', element: <AdminTeams /> },
          { path: 'players', element: <AdminPlayers /> },
          { path: 'games', element: <AdminGames /> },
          { path: 'news', element: <AdminNews /> },
          { path: 'sponsors', element: <AdminSponsors /> },
          { path: 'settings', element: <AdminSettings /> },
          { path: 'site-content', element: <AdminSiteContent /> },
          { path: 'management', element: <AdminManagement /> }
        ]
      },

      // Owner Routes
      {
        path: 'owner',
        element: <OwnerRoute><OwnerDashboard /></OwnerRoute>,
        children: [
          { path: 'admins', element: <OwnerManagement /> },
          { path: 'leagues', element: <OwnerLeagues /> },
          { path: 'players', element: <OwnerPlayers /> },
          { path: 'settings', element: <OwnerSettings /> },
          { path: 'site-content', element: <OwnerSiteContent /> },
          { path: 'sponsors', element: <OwnerSponsors /> },
          { path: 'users', element: <OwnerUsers /> },
          { path: 'teams', element: <OwnerTeams /> },
          { path: 'tournaments', element: <OwnerTournaments /> },
          { path: 'news', element: <OwnerNews /> }
        ]
      },

      // 404 Route
      { path: '*', element: <NotFound /> }
    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;