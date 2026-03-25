import { useState } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import AppLayout, { PageKey } from '@/components/AppLayout';
import DashboardPage from '@/pages/DashboardPage';
import EquipmentPage from '@/pages/EquipmentPage';
import InventoryPage from '@/pages/InventoryPage';
import SuppliersPage from '@/pages/SuppliersPage';
import DepartmentsPage from '@/pages/DepartmentsPage';
import RequestsPage from '@/pages/RequestsPage';
import AllocationsPage from '@/pages/AllocationsPage';
import ExportsPage from '@/pages/ExportsPage';
import ImportsPage from '@/pages/ImportsPage';
import UsersPage from '@/pages/UsersPage';
import NotificationsPage from '@/pages/NotificationsPage';
import DamageReportsPage from '@/pages/DamageReportsPage';
import ProfilePage from '@/pages/ProfilePage';
import ReportsPage from '@/pages/ReportsPage';
import ImportRequestsPage from '@/pages/ImportRequestsPage';

const pages: Record<PageKey, React.ComponentType> = {
  dashboard: DashboardPage,
  equipment: EquipmentPage,
  inventory: InventoryPage,
  suppliers: SuppliersPage,
  departments: DepartmentsPage,
  requests: RequestsPage,
  allocations: AllocationsPage,
  exports: ExportsPage,
  imports: ImportsPage,
  users: UsersPage,
  notifications: NotificationsPage,
  damage_reports: DamageReportsPage,
  profile: ProfilePage,
  reports: ReportsPage,
  import_requests: ImportRequestsPage,
};

function AppContent() {
  const { isLoggedIn } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');

  if (!isLoggedIn) return <LoginPage />;

  const PageComponent = pages[currentPage];

  return (
    <AppLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      <PageComponent />
    </AppLayout>
  );
}

export default function Index() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
