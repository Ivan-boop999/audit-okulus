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
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Notifications fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
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
