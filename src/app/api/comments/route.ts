import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const responseId = searchParams.get('responseId');

    if (!responseId) {
      return NextResponse.json({ error: 'responseId required' }, { status: 400 });
    }

    const comments = await db.auditComment.findMany({
      where: { responseId },
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: { id: true, name: true, email: true, department: true, role: true },
        },
      },
      take: 100,
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { responseId, content, userId } = await request.json();

    if (!responseId || !content?.trim() || !userId) {
      return NextResponse.json(
        { error: 'responseId, content, and userId are required' },
        { status: 400 },
      );
    }

    const comment = await db.auditComment.create({
      data: {
        responseId,
        userId,
        content: content.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true, department: true, role: true },
        },
      },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    console.error('Comment create error:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await db.auditComment.delete({ where: { id } });
    return NextResponse.json({ deleted: 1 });
  } catch (error) {
    console.error('Comment delete error:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
