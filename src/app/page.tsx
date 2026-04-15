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
import AuditorDashboard from '@/components/audit/auditor-dashboard';
import AuditResponseForm from '@/components/audit/audit-response-form';
import AuditHistory from '@/components/audit/audit-history';
import ActionPlans from '@/components/audit/action-plans';
import UserProfilePanel from '@/components/audit/user-profile';
import AuditReportDetail from '@/components/audit/audit-report';
import TeamMembers from '@/components/audit/team-members';
import EquipmentDetail from '@/components/audit/equipment-detail';
import NotificationCenter from '@/components/audit/notification-center';
import AuditorMyAudits from '@/components/audit/auditor-my-audits';
import MaintenanceScheduler from '@/components/audit/maintenance-scheduler';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const [activeView, setActiveView] = useState('dashboard');
  const [activeAuditId, setActiveAuditId] = useState<string | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [activeEquipmentId, setActiveEquipmentId] = useState<string | null>(null);
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

  const handleViewReport = (responseId: string) => {
    setActiveReportId(responseId);
    setActiveView('report');
  };

  const handleBackFromReport = () => {
    setActiveReportId(null);
    setActiveView('history');
  };

  const handleViewEquipment = (id: string) => {
    setActiveEquipmentId(id);
    setActiveView('equipment-detail');
  };

  const handleBackFromEquipment = () => {
    setActiveEquipmentId(null);
    setActiveView('equipment');
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
    // Equipment detail view
    if (activeView === 'equipment-detail' && activeEquipmentId) {
      return (
        <EquipmentDetail
          equipmentId={activeEquipmentId}
          onBack={handleBackFromEquipment}
        />
      );
    }

    // Audit report detail view
    if (activeView === 'report' && activeReportId) {
      return (
        <AuditReportDetail
          responseId={activeReportId}
          onBack={handleBackFromReport}
          userId={user.id}
          userName={user.name}
        />
      );
    }

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

    // Profile (shared between admin and auditor)
    if (activeView === 'profile') {
      return <UserProfilePanel />;
    }

    // Action Plans (shared between admin and auditor)
    if (activeView === 'action-plans') {
      return <ActionPlans isAdmin={isAdmin} userId={user.id} />;
    }

    // Notifications (shared between admin and auditor)
    if (activeView === 'notifications') {
      return <NotificationCenter isAdmin={isAdmin} />;
    }

    // Admin views
    if (isAdmin) {
      switch (activeView) {
        case 'dashboard':
          return <AdminDashboard />;
        case 'equipment':
          return <EquipmentManager onViewDetail={handleViewEquipment} />;
        case 'templates':
          return <TemplateBuilder creatorId={user.id} />;
        case 'scheduling':
          return <AuditScheduler />;
        case 'history':
          return <AuditHistory isAdmin={true} onViewReport={handleViewReport} userId={user.id} userName={user.name} />;
        case 'team':
          return <TeamMembers />;
        case 'maintenance':
          return <MaintenanceScheduler />;
        case 'analytics':
          return <AnalyticsDashboard />;
        default:
          return <AdminDashboard />;
      }
    }

    // Auditor views
    switch (activeView) {
      case 'dashboard':
        return <AuditorDashboard userId={user.id} onStartAudit={handleStartAudit} />;
      case 'calendar':
        return <AuditorCalendar userId={user.id} onStartAudit={handleStartAudit} />;
      case 'audits':
        return <AuditorMyAudits user={user} onStartAudit={handleStartAudit} onViewReport={handleViewReport} />;
      case 'history':
        return <AuditHistory userId={user.id} isAdmin={false} onViewReport={handleViewReport} userName={user.name} />;
      default:
        return <AuditorDashboard userId={user.id} onStartAudit={handleStartAudit} />;
    }
  };

  return (
    <AppShell activeView={activeView} onViewChange={setActiveView}>
      {renderContent()}
    </AppShell>
  );
}
