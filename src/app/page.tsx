'use client';

import { useState, useSyncExternalStore } from 'react';
import { useAuthStore } from '@/stores/auth';
import LoginScreen from '@/components/audit/login-screen';
import AppShell from '@/components/audit/app-shell';
import AdminDashboard from '@/components/audit/admin-dashboard';
import EquipmentManager from '@/components/audit/equipment-manager';
import TemplateBuilder from '@/components/audit/template-builder';
import AuditScheduler from '@/components/audit/audit-scheduler';
import AnalyticsDashboard from '@/components/audit/analytics-dashboard';
import AuditorCalendar from '@/components/audit/auditor-calendar';
import AuditResponseForm from '@/components/audit/audit-response-form';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const [activeView, setActiveView] = useState('dashboard');
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const mounted = useMounted();

  // Redirect to dashboard on login
  const handleLogin = () => {
    setActiveView('dashboard');
  };

  const handleStartAudit = (assignmentId: string) => {
    setActiveAuditId(assignmentId);
    setActiveView('audit-form');
  };

  const handleAuditComplete = () => {
    setActiveAuditId(null);
    setActiveView('calendar');
  };

  const handleCancelAudit = () => {
    setActiveAuditId(null);
    setActiveView(user?.role === 'ADMIN' ? 'scheduling' : 'calendar');
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated → show login
  if (!isAuthenticated || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const isAdmin = user.role === 'ADMIN';

  // Render active view content
  const renderContent = () => {
    // Audit response form (shared between admin and auditor)
    if (activeView === 'audit-form' && activeAuditId) {
      return (
        <AuditResponseForm
          assignmentId={activeAuditId}
          userId={user.id}
          onComplete={handleAuditComplete}
          onCancel={handleCancelAudit}
        />
      );
    }

    // Admin views
    if (isAdmin) {
      switch (activeView) {
        case 'dashboard':
          return <AdminDashboard />;
        case 'equipment':
          return <EquipmentManager />;
        case 'templates':
          return <TemplateBuilder creatorId={user.id} />;
        case 'scheduling':
          return <AuditScheduler />;
        case 'analytics':
          return <AnalyticsDashboard />;
        default:
          return <AdminDashboard />;
      }
    }

    // Auditor views
    switch (activeView) {
      case 'dashboard':
        return <AuditorCalendar userId={user.id} onStartAudit={handleStartAudit} />;
      case 'calendar':
        return <AuditorCalendar userId={user.id} onStartAudit={handleStartAudit} />;
      case 'audits':
        return <AuditorCalendar userId={user.id} onStartAudit={handleStartAudit} />;
      default:
        return <AuditorCalendar userId={user.id} onStartAudit={handleStartAudit} />;
    }
  };

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </AppShell>
  );
}
