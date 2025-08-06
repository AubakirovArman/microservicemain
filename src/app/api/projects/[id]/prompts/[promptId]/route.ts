import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cachePrompt, deleteCachedPrompt, invalidateAllCache, type CachedPromptData } from '@/lib/redis';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string, promptId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id, promptId } = await params;

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

    // Проверяем, что промпт существует и принадлежит проекту
    const prompt = await prisma.prompt.findFirst({
      where: {
        id: promptId,
        projectId: id
      }
    });

    if (!prompt) {
      return NextResponse.json({ error: 'Промпт не найден' }, { status: 404 });
    }

    // Удаляем промпт из базы данных
    await prisma.prompt.delete({
      where: {
        id: promptId
      }
    });

    // Удаляем из кеша Redis
    await deleteCachedPrompt(id, promptId);
    
    // Инвалидируем общий кэш, чтобы он обновился при следующем запросе
    await invalidateAllCache();

    console.log(`Промпт ${prompt.name} удален из кэша`);

    return NextResponse.json({ message: 'Промпт удален' });
  } catch (error) {
    console.error('Ошибка удаления промпта:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string, promptId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id, promptId } = await params;
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

    // Проверяем, что промпт существует и принадлежит проекту
    const existingPrompt = await prisma.prompt.findFirst({
      where: {
        id: promptId,
        projectId: id
      }
    });

    if (!existingPrompt) {
      return NextResponse.json({ error: 'Промпт не найден' }, { status: 404 });
    }

    // Обновляем промпт
    const updatedPrompt = await prisma.prompt.update({
      where: {
        id: promptId
      },
      data: {
        name,
        instruction
      }
    });

    // Обновляем кеш в Redis с полными данными проекта
    const promptData: CachedPromptData = {
      instruction: updatedPrompt.instruction,
      geminiApiKey: project.geminiApiKey,
      geminiModel: project.geminiModel || 'gemini-2.5-flash',
      temperature: project.temperature || 0.7
    };
    
    await cachePrompt(id, promptId, promptData);
    
    // Инвалидируем общий кэш, чтобы он обновился при следующем запросе
    await invalidateAllCache();

    console.log(`Промпт ${updatedPrompt.name} обновлен и кэширован`);

    return NextResponse.json(updatedPrompt);
  } catch (error) {
    console.error('Ошибка обновления промпта:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}