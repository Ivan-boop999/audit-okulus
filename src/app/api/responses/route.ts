import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');

    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId required' }, { status: 400 });
    }

    const responses = await db.auditResponse.findMany({
      where: { assignmentId },
      include: {
        answers: { include: { question: true } },
        auditor: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(responses);
  } catch (error) {
    console.error('Responses fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch responses' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { assignmentId, auditorId, answers, notes } = await request.json();

    // Calculate score
    const template = await db.auditTemplate.findUnique({
      where: { id: (await db.auditAssignment.findUnique({ where: { id: assignmentId } }))?.templateId },
      include: { questions: true },
    });

    let totalScore = 0;
    let maxScore = 0;

    if (template) {
      for (const question of template.questions) {
        if (question.weight > 0) {
          maxScore += question.weight;
          const answer = answers.find((a: { questionId: string }) => a.questionId === question.id);
          if (answer?.answer) {
            if (question.answerType === 'YES_NO') {
              totalScore += answer.answer === 'yes' ? question.weight : 0;
            } else if (question.answerType.startsWith('SCALE')) {
              const val = parseInt(answer.answer);
              if (!isNaN(val)) totalScore += (val / 10) * question.weight;
            }
          }
        }
      }
    }

    const scorePercent = maxScore > 0 ? (totalScore / maxScore) * 100 : null;

    const response = await db.auditResponse.create({
      data: {
        assignmentId,
        auditorId,
        score: scorePercent,
        maxScore: 100,
        status: 'COMPLETED',
        completedAt: new Date(),
        notes,
        answers: {
          create: answers.map((a: { questionId: string; answer: string; comment?: string }) => ({
            questionId: a.questionId,
            answer: a.answer,
            comment: a.comment,
          })),
        },
      },
      include: { answers: true },
    });

    // Update assignment status
    await db.auditAssignment.update({
      where: { id: assignmentId },
      data: { status: 'COMPLETED' },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Response create error:', error);
    return NextResponse.json({ error: 'Failed to submit response' }, { status: 500 });
  }
}
