import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: список чатов проекта (для проектов типа CHAT)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const { id } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

  const chats = await (prisma as any).chat.findMany({ where: { projectId: id }, orderBy: { updatedAt: 'desc' } });
  return NextResponse.json(chats);
}

// POST: создать чат с необязательным стилем
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const { id } = await params;
  const { name, style, externalKey } = await request.json();

  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

  const chat = await (prisma as any).chat.create({ data: { projectId: id, name: name || 'Новый чат', style: style || null, externalKey: externalKey || null } });
  return NextResponse.json(chat, { status: 201 });
}
