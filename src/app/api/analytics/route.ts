import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Get overall statistics
    const totalEquipment = await db.equipment.count();
    const totalTemplates = await db.auditTemplate.count();
    const totalAuditors = await db.user.count({ where: { role: 'AUDITOR' } });
    const totalAssignments = await db.auditAssignment.count();

    const completedAssignments = await db.auditAssignment.count({ where: { status: 'COMPLETED' } });
    const scheduledAssignments = await db.auditAssignment.count({ where: { status: 'SCHEDULED' } });
    const inProgressAssignments = await db.auditAssignment.count({ where: { status: 'IN_PROGRESS' } });
    const overdueAssignments = await db.auditAssignment.count({ where: { status: 'OVERDUE' } });

    // Get average score from completed audits
    const completedResponses = await db.auditResponse.findMany({
      where: { status: 'COMPLETED', score: { not: null } },
      select: { score: true },
    });
    const avgScore = completedResponses.length > 0
      ? completedResponses.reduce((sum, r) => sum + (r.score || 0), 0) / completedResponses.length
      : 0;

    // Get scores over time (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const responsesWithDates = await db.auditResponse.findMany({
      where: {
        status: 'COMPLETED',
        score: { not: null },
        completedAt: { gte: thirtyDaysAgo },
      },
      select: { score: true, completedAt: true },
      orderBy: { completedAt: 'asc' },
    });

    // Get assignments per category
    const templates = await db.auditTemplate.findMany({
      include: { _count: { select: { assignments: true } } },
    });
    const categoryData = templates.map(t => ({
      name: t.category,
      count: t._count.assignments,
    }));

    // Get auditor performance
    const auditors = await db.user.findMany({
      where: { role: 'AUDITOR' },
      include: {
        completedAudits: { where: { status: 'COMPLETED', score: { not: null } } },
        assignedAudits: { where: { status: 'COMPLETED' }, select: { id: true } },
      },
    });

    const auditorPerformance = auditors.map(a => ({
      name: a.name,
      department: a.department,
      totalAudits: a.assignedAudits.length,
      avgScore: a.completedAudits.length > 0
        ? a.completedAudits.reduce((sum, r) => sum + (r.score || 0), 0) / a.completedAudits.length
        : 0,
    }));

    // Get equipment categories
    const equipmentCategories = await db.equipment.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    // Get recent activity
    const recentAssignments = await db.auditAssignment.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        template: { select: { title: true } },
        auditor: { select: { name: true } },
      },
    });

    return NextResponse.json({
      overview: {
        totalEquipment,
        totalTemplates,
        totalAuditors,
        totalAssignments,
        completedAssignments,
        scheduledAssignments,
        inProgressAssignments,
        overdueAssignments,
        avgScore: Math.round(avgScore * 10) / 10,
        completionRate: totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0,
      },
      scoresOverTime: responsesWithDates.map(r => ({
        date: r.completedAt?.toISOString().split('T')[0],
        score: Math.round((r.score || 0) * 10) / 10,
      })),
      categoryData,
      auditorPerformance,
      equipmentCategories: equipmentCategories.map(e => ({
        name: e.category,
        count: e._count.id,
      })),
      recentActivity: recentAssignments.map(a => ({
        id: a.id,
        templateTitle: a.template.title,
        auditorName: a.auditor.name,
        status: a.status,
        date: a.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Analytics fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
