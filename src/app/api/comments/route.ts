import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/comments?responseId=xxx — list comments for a response
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get('responseId');

    if (!responseId) {
      return NextResponse.json({ error: 'responseId is required' }, { status: 400 });
    }

    const comments = await db.auditComment.findMany({
      where: { responseId },
      include: {
        author: { select: { id: true, name: true, email: true, department: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('[comments GET]', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

// POST /api/comments — create a new comment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { responseId, content, userId } = body;

    if (!responseId || !content?.trim() || !userId) {
      return NextResponse.json({ error: 'responseId, content, and userId are required' }, { status: 400 });
    }

    const comment = await db.auditComment.create({
      data: {
        responseId,
        content: content.trim(),
        userId,
      },
      include: {
        author: { select: { id: true, name: true, email: true, department: true, role: true } },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('[comments POST]', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

// DELETE /api/comments?id=xxx — delete a comment
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await db.auditComment.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('[comments DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
