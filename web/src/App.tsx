import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './components/layout/MainLayout'
import Dashboard from './pages/Dashboard'
import AssetList from './pages/assets/AssetList'
import AssetDetail from './pages/assets/AssetDetail'
import VulnerabilityList from './pages/vulnerabilities/VulnerabilityList'
import VulnerabilityDetail from './pages/vulnerabilities/VulnerabilityDetail'
import RiskList from './pages/grc/RiskList'
import RiskDetail from './pages/grc/RiskDetail'
import IncidentList from './pages/grc/IncidentList'
import IncidentDetail from './pages/grc/IncidentDetail'
import DrPlanList from './pages/grc/DrPlanList'
import DrPlanDetail from './pages/grc/DrPlanDetail'
import IsoControlList from './pages/grc/IsoControlList'
import IsoControlDetail from './pages/grc/IsoControlDetail'
import UserList from './pages/admin/UserList'
import UserDetail from './pages/admin/UserDetail'
import GroupList from './pages/admin/GroupList'
import Profile from './pages/admin/Profile'
import Login from './pages/auth/Login'
import Setup2FA from './pages/auth/Setup2FA'

function App() {
  return (
    <Routes>
      {/* Auth routes (no layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/setup-2fa" element={<Setup2FA />} />

      {/* App routes (with layout) */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />

        {/* Assets */}
        <Route path="/assets" element={<AssetList />} />
        <Route path="/assets/:id" element={<AssetDetail />} />

        {/* Vulnerabilities */}
        <Route path="/vulnerabilities" element={<VulnerabilityList />} />
        <Route path="/vulnerabilities/:id" element={<VulnerabilityDetail />} />

        {/* GRC */}
        <Route path="/grc/risks" element={<RiskList />} />
        <Route path="/grc/risks/:id" element={<RiskDetail />} />
        <Route path="/grc/incidents" element={<IncidentList />} />
        <Route path="/grc/incidents/:id" element={<IncidentDetail />} />
        <Route path="/grc/dr-plans" element={<DrPlanList />} />
        <Route path="/grc/dr-plans/:id" element={<DrPlanDetail />} />
        <Route path="/grc/iso-controls" element={<IsoControlList />} />
        <Route path="/grc/iso-controls/:id" element={<IsoControlDetail />} />

        {/* Admin */}
        <Route path="/admin/users" element={<UserList />} />
        <Route path="/admin/users/:id" element={<UserDetail />} />
        <Route path="/admin/groups" element={<GroupList />} />
        <Route path="/admin/profile" element={<Profile />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
