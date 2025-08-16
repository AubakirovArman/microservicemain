import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; chatId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const { id, chatId } = await params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
  const chat = await (prisma as any).chat.findFirst({ where: { id: chatId, projectId: id } });
  if (!chat) return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });
  return NextResponse.json(chat);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string; chatId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const { id, chatId } = await params;
  const { name, style, externalKey } = await request.json();
  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
  const chat = await (prisma as any).chat.update({ where: { id: chatId }, data: { ...(name && { name }), ...(style !== undefined && { style }), ...(externalKey !== undefined && { externalKey }) } });
  return NextResponse.json(chat);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string; chatId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const { id, chatId } = await params;
  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
  await (prisma as any).message.deleteMany({ where: { chatId } });
  await (prisma as any).chat.delete({ where: { id: chatId } });
  return NextResponse.json({ ok: true });
}
