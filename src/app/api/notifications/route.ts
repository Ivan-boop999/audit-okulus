import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const notifications = await db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = searchParams.get('ids');

    if (ids) {
      const idList = ids.split(',');
      await db.notification.deleteMany({
        where: { id: { in: idList } },
      });
      return NextResponse.json({ deleted: idList.length });
    }

    const id = searchParams.get('id');
    if (id) {
      await db.notification.delete({ where: { id } });
      return NextResponse.json({ deleted: 1 });
    }

    return NextResponse.json({ error: 'id or ids required' }, { status: 400 });
  } catch (error) {
    console.error('Notification delete error:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, isRead } = await request.json();
    const notification = await db.notification.update({
      where: { id },
      data: { isRead: isRead !== undefined ? isRead : true },
    });
    return NextResponse.json(notification);
  } catch (error) {
    console.error('Notification update error:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId, title, message, type } = await request.json();
    const notification = await db.notification.create({
      data: { userId, title, message, type: type || 'INFO' },
    });
    return NextResponse.json(notification, { status: 201 });
  } catch (error) {
    console.error('Notification create error:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}
