import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import ForcePasswordChange from './pages/ForcePasswordChange.jsx';
import ConfirmAccount from './pages/ConfirmAccount.jsx';
import UserManagement from './pages/UserManagement.jsx';
import FormulesManagement from './pages/FormulesManagement.jsx';
import AbonnementsManagement from './pages/AbonnementsManagement.jsx';
import AbonnementDetail from './pages/AbonnementDetail.jsx';
import AbonnementStats from './pages/AbonnementStats.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';
import DashboardLayout from './components/DashboardLayout.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ForcePasswordChange />} />
        <Route path="/confirmation/:token" element={<ConfirmAccount />} />

        {/* Admin Dashboard Protected Layout */}
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/stats" replace />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="formules" element={<FormulesManagement />} />
          <Route path="abonnements" element={<AbonnementsManagement />} />
          <Route path="abonnements/:id" element={<AbonnementDetail />} />
          <Route path="stats" element={<AbonnementStats />} />
          <Route path="profile" element={<ProfileSettings />} />
          <Route path="subscriptions" element={<Navigate to="/abonnements" replace />} />
        </Route>

        {/* Redirect any other path to /login for now */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

