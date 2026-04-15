import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (userId) where.auditorId = userId;
    if (status) where.status = status;

    const assignments = await db.auditAssignment.findMany({
      where,
      orderBy: { scheduledDate: 'asc' },
      include: {
        template: { include: { questions: { orderBy: { order: 'asc' } } } },
        auditor: { select: { id: true, name: true, email: true, department: true } },
        responses: { include: { answers: true } },
      },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Assignments fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { templateId, auditorId, scheduledDate, dueDate, notes } = data;

    const assignment = await db.auditAssignment.create({
      data: {
        templateId,
        auditorId,
        scheduledDate: new Date(scheduledDate),
        dueDate: dueDate ? new Date(dueDate) : new Date(new Date(scheduledDate).getTime() + 8 * 3600000),
        notes,
        status: 'SCHEDULED',
      },
      include: {
        template: true,
        auditor: { select: { id: true, name: true, email: true } },
      },
    });

    // Create notification for auditor
    await db.notification.create({
      data: {
        userId: auditorId,
        title: 'Новый аудит назначен',
        message: `Вам назначен аудит «${assignment.template.title}» на ${new Date(scheduledDate).toLocaleDateString('ru-RU')}`,
        type: 'ASSIGNMENT',
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Assignment create error:', error);
    return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    const assignment = await db.auditAssignment.update({
      where: { id },
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      },
      include: {
        template: true,
        auditor: { select: { id: true, name: true, email: true } },
      },
    });
    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Assignment update error:', error);
    return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.auditAssignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Assignment delete error:', error);
    return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
  }
}
