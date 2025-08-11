import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cachePrompt, deleteCachedPrompt, invalidateAllCache, type CachedPromptData } from '@/lib/redis';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    const { name, instruction } = await request.json();

    if (!name || !instruction) {
      return NextResponse.json({ error: 'Имя и инструкции промпта обязательны' }, { status: 400 });
    }

    // Проверяем, что проект принадлежит пользователю
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    const prompt = await prisma.prompt.create({
      data: {
        name,
        instruction,
        projectId: id
      }
    });

    // Кэшируем промпт в Redis с полными данными проекта
    const promptData: CachedPromptData = {
      instruction: prompt.instruction,
      geminiApiKey: project.geminiApiKey,
      geminiModel: project.geminiModel || 'gemini-2.5-flash',
      temperature: project.temperature ?? 0.7
    };
    
    await cachePrompt(id, prompt.id, promptData);
    
    // Инвалидируем общий кэш, чтобы он обновился при следующем запросе
    await invalidateAllCache();

    console.log(`Промпт ${prompt.name} создан и кэширован для проекта ${project.name}`);

    return NextResponse.json(prompt, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания промпта:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    // Проверяем, что проект принадлежит пользователю
    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    const prompts = await prisma.prompt.findMany({
      where: {
        projectId: id
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(prompts);
  } catch (error) {
    console.error('Ошибка получения промптов:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}