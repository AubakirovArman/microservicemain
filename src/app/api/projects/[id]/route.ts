import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cacheProject, cachePrompt, deleteCachedProject, invalidateAllCache, type CachedProjectData, type CachedPromptData } from '@/lib/redis';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        prompts: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Ошибка получения проекта:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;

    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id
      },
      include: {
        prompts: true
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    // Удаляем проект из базы данных
    await prisma.project.delete({
      where: {
        id: id
      }
    });

    // Удаляем проект из кэша
    await deleteCachedProject(id);
    
    // Удаляем все промпты проекта из кэша
    for (const prompt of project.prompts) {
      await deleteCachedPrompt(id, prompt.id);
    }
    
    // Инвалидируем общий кэш, чтобы он обновился при следующем запросе
    await invalidateAllCache();

    console.log(`Проект ${project.name} и ${project.prompts.length} промптов удалены из кэша`);

    return NextResponse.json({ message: 'Проект удален' });
  } catch (error) {
    console.error('Ошибка удаления проекта:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { id } = await params;
    const { name, geminiApiKey, geminiModel, temperature } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Имя проекта обязательно' }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: {
        id: id,
        userId: session.user.id
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
    }

    const updatedProject = await prisma.project.update({
      where: {
        id: id
      },
      data: {
        name,
        ...(geminiApiKey && { geminiApiKey }),
        ...(geminiModel && { geminiModel }),
        ...(temperature !== undefined && { temperature })
      },
      include: {
        prompts: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    // Кэшируем обновленный проект
    const projectData: CachedProjectData = {
      id: updatedProject.id,
      name: updatedProject.name,
      geminiApiKey: updatedProject.geminiApiKey,
      geminiModel: updatedProject.geminiModel || 'gemini-2.5-flash',
      temperature: updatedProject.temperature || 0.7,
      userId: updatedProject.userId
    };
    
    await cacheProject(projectData);

    // Обновляем кэш всех промптов проекта с новыми данными
    for (const prompt of updatedProject.prompts) {
      const promptData: CachedPromptData = {
        instruction: prompt.instruction,
        geminiApiKey: updatedProject.geminiApiKey,
        geminiModel: updatedProject.geminiModel || 'gemini-2.5-flash',
        temperature: updatedProject.temperature || 0.7
      };
      
      await cachePrompt(updatedProject.id, prompt.id, promptData);
    }
    
    // Инвалидируем общий кэш, чтобы он обновился при следующем запросе
    await invalidateAllCache();

    console.log(`Проект ${updatedProject.name} обновлен и кэширован вместе с ${updatedProject.prompts.length} промптами`);

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error('Ошибка обновления проекта:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}