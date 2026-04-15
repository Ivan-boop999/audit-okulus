import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/action-plans — list all action plans, optionally filtered
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const assigneeId = searchParams.get('assigneeId');
    const responseId = searchParams.get('responseId');

    if (id) {
      const plan = await db.actionPlan.findUnique({
        where: { id },
        include: {
          assignee: { select: { id: true, name: true, email: true, department: true } },
          auditResponse: {
            select: {
              id: true, score: true, status: true,
              assignment: {
                select: {
                  template: { select: { title: true, category: true } },
                  auditor: { select: { name: true } },
                },
              },
            },
          },
        },
      });
      return NextResponse.json(plan);
    }

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigneeId) where.assigneeId = assigneeId;
    if (responseId) where.auditResponseId = responseId;

    const plans = await db.actionPlan.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        assignee: { select: { id: true, name: true, email: true, department: true } },
        auditResponse: {
          select: {
            id: true, score: true, status: true,
            assignment: {
              select: {
                template: { select: { title: true, category: true } },
                auditor: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ status: 'asc' }, { priority: 'asc' }, { dueDate: 'asc' }],
    });

    return NextResponse.json(plans);
  } catch (error) {
    console.error('[action-plans GET]', error);
    return NextResponse.json({ error: 'Failed to fetch action plans' }, { status: 500 });
  }
}

// POST /api/action-plans — create a new action plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, priority, assigneeId, dueDate, sourceType, sourceId, score, auditResponseId } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const plan = await db.actionPlan.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        priority: priority || 'MEDIUM',
        status: 'NEW',
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        sourceType: sourceType || 'AUDIT',
        sourceId: sourceId || null,
        score: score ?? null,
        auditResponseId: auditResponseId || null,
      },
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('[action-plans POST]', error);
    return NextResponse.json({ error: 'Failed to create action plan' }, { status: 500 });
  }
}

// PUT /api/action-plans — update an existing action plan
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.description !== undefined) updateData.description = data.description?.trim() || null;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId || null;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;

    const plan = await db.actionPlan.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(plan);
  } catch (error) {
    console.error('[action-plans PUT]', error);
    return NextResponse.json({ error: 'Failed to update action plan' }, { status: 500 });
  }
}

// DELETE /api/action-plans?id=xxx — delete an action plan
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.actionPlan.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[action-plans DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete action plan' }, { status: 500 });
  }
}
