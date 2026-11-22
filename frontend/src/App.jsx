// Application routes: public pages at the top level, signed-in pages nested inside the AppLayout shell.
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { SignInPage } from './pages/SignInPage.jsx';
import { SignUpPage } from './pages/SignUpPage.jsx';
import AdminDashboard from './pages/dashboards/AdminDashboard.jsx';
import { CaretakerDashboard } from './pages/dashboards/CaretakerDashboard.jsx';
import { FamilyDashboard } from './pages/dashboards/FamilyDashboard.jsx';
import { ElderDashboard } from './pages/dashboards/ElderDashboard.jsx';
import { VolunteerDashboard } from './pages/dashboards/VolunteerDashboard.jsx';
import { AppointmentsPage } from './pages/AppointmentsPage.jsx';
import { ChittiPage } from './pages/ChittiPage.jsx';
import { MedicinesPage } from './pages/MedicinesPage.jsx';
import { CareTeamPage } from './pages/CareTeamPage.jsx';
import { InsurancePage } from './pages/InsurancePage.jsx';
import { CabPage } from './pages/CabPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';

// Top-level route table: public pages, then the signed-in shell, then a catch-all back to the landing page.
function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/signin" element={<SignInPage />} />
      <Route path="/signup" element={<SignUpPage />} />

      {/* Signed-in pages share the sidebar and top bar from AppLayout */}
      <Route element={<AppLayout />}>
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        <Route path="/dashboard/caretaker" element={<CaretakerDashboard />} />
        <Route path="/dashboard/family" element={<FamilyDashboard />} />
        <Route path="/dashboard/family/requests" element={<FamilyDashboard />} />
        <Route path="/dashboard/elder" element={<ElderDashboard />} />
        <Route path="/dashboard/volunteer" element={<VolunteerDashboard />} />
        <Route path="/dashboard/volunteer/requests" element={<VolunteerDashboard />} />
        <Route path="/dashboard/volunteer/elders" element={<VolunteerDashboard />} />
        <Route path="/chitti" element={<ChittiPage />} />
        <Route path="/appointments" element={<AppointmentsPage />} />
        <Route path="/medicines" element={<MedicinesPage />} />
        <Route path="/care-team" element={<CareTeamPage />} />
        <Route path="/insurance" element={<InsurancePage />} />
        <Route path="/cab" element={<CabPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      {/* Unknown paths go back to the landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
