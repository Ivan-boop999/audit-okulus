import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const templates = await db.auditTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        questions: { orderBy: { order: 'asc' } },
        equipment: { include: { equipment: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { assignments: true } },
      },
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Templates fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, description, category, status, frequency, creatorId, questions, equipmentIds } = await request.json();

    const template = await db.auditTemplate.create({
      data: {
        title,
        description,
        category,
        status,
        frequency,
        creatorId,
        questions: {
          create: questions.map((q: { text: string; answerType: string; required: boolean; weight: number; order: number; helpText?: string; options?: string }, i: number) => ({
            text: q.text,
            answerType: q.answerType,
            required: q.required,
            weight: q.weight,
            order: q.order ?? i,
            helpText: q.helpText,
            options: q.options,
          })),
        },
      },
      include: { questions: true },
    });

    if (equipmentIds && equipmentIds.length > 0) {
      await Promise.all(
        equipmentIds.map((eqId: string) =>
          db.auditTemplateEquipment.create({
            data: { templateId: template.id, equipmentId: eqId },
          })
        )
      );
    }

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Template create error:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    const template = await db.auditTemplate.update({ where: { id }, data });
    return NextResponse.json(template);
  } catch (error) {
    console.error('Template update error:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.auditTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Template delete error:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
