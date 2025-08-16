import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Простой эндпоинт: удаляет сообщения старше суток для всех чатов и обновляет lastClearedAt
export async function POST() {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Удаляем сообщения старше суток
  await (prisma as any).message.deleteMany({ where: { createdAt: { lt: dayAgo } } });
  // Обновляем отметку на чатах
  await (prisma as any).chat.updateMany({ data: { lastClearedAt: now } });
  return NextResponse.json({ ok: true, clearedAt: now.toISOString() });
}
