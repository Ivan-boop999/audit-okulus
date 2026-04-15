import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const equipment = await db.equipment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        auditTemplates: {
          include: { template: true },
        },
      },
    });
    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Equipment fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch equipment' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const equipment = await db.equipment.create({ data });
    return NextResponse.json(equipment, { status: 201 });
  } catch (error) {
    console.error('Equipment create error:', error);
    return NextResponse.json({ error: 'Failed to create equipment' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, ...data } = await request.json();
    const equipment = await db.equipment.update({ where: { id }, data });
    return NextResponse.json(equipment);
  } catch (error) {
    console.error('Equipment update error:', error);
    return NextResponse.json({ error: 'Failed to update equipment' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    
    await db.equipment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Equipment delete error:', error);
    return NextResponse.json({ error: 'Failed to delete equipment' }, { status: 500 });
  }
}
