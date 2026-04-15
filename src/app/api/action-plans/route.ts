import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// GET /api/action-plans — list action plans with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get('userId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const sourceId = searchParams.get('sourceId');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortDir = searchParams.get('sortDir') || 'desc';

    const where: Record<string, unknown> = {};
    if (userId) where.assigneeId = userId;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (sourceId) where.sourceId = sourceId;

    const orderBy: Record<string, string> = {};
    orderBy[sortBy] = sortDir;

    const actionPlans = await db.actionPlan.findMany({
      where,
      orderBy,
      include: {
        assignee: { select: { id: true, name: true, email: true, department: true } },
        auditResponse: {
          select: {
            id: true,
            score: true,
            status: true,
            assignment: {
              select: {
                id: true,
                template: { select: { id: true, title: true, category: true } },
                auditor: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(actionPlans);
  } catch (error) {
    console.error('Action plans fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch action plans' }, { status: 500 });
  }
}

// POST /api/action-plans — create a new action plan
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { title, description, priority, assigneeId, dueDate, sourceType, sourceId, score, auditResponseId } = data;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const actionPlan = await db.actionPlan.create({
      data: {
        title,
        description: description ?? null,
        priority: priority ?? 'MEDIUM',
        assigneeId: assigneeId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        sourceType: sourceType ?? 'AUDIT',
        sourceId: sourceId ?? null,
        score: score ?? null,
        auditResponseId: auditResponseId ?? null,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        auditResponse: {
          select: {
            id: true,
            score: true,
            status: true,
            assignment: {
              select: {
                id: true,
                template: { select: { id: true, title: true, category: true } },
                auditor: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(actionPlan, { status: 201 });
  } catch (error) {
    console.error('Action plan create error:', error);
    return NextResponse.json({ error: 'Failed to create action plan' }, { status: 500 });
  }
}

// PUT /api/action-plans — update an existing action plan
export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description ?? null;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId ?? null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    if (data.sourceType !== undefined) updateData.sourceType = data.sourceType;
    if (data.sourceId !== undefined) updateData.sourceId = data.sourceId ?? null;
    if (data.score !== undefined) updateData.score = data.score ?? null;
    if (data.auditResponseId !== undefined) updateData.auditResponseId = data.auditResponseId ?? null;

    const actionPlan = await db.actionPlan.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        auditResponse: {
          select: {
            id: true,
            score: true,
            status: true,
            assignment: {
              select: {
                id: true,
                template: { select: { id: true, title: true, category: true } },
                auditor: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    return NextResponse.json(actionPlan);
  } catch (error) {
    console.error('Action plan update error:', error);
    return NextResponse.json({ error: 'Failed to update action plan' }, { status: 500 });
  }
}

// DELETE /api/action-plans?id=xxx — delete an action plan
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.actionPlan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Action plan delete error:', error);
    return NextResponse.json({ error: 'Failed to delete action plan' }, { status: 500 });
  }
}
