import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { cacheProject, invalidateAllCache, type CachedProjectData } from '@/lib/redis';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            prompts: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Ошибка получения проектов:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { name, geminiApiKey, geminiModel, temperature } = await request.json();

    if (!name || !geminiApiKey) {
      return NextResponse.json({ error: 'Имя проекта и API ключ обязательны' }, { status: 400 });
    }

    const project = await prisma.project.create({
      data: {
        name,
        geminiApiKey,
        geminiModel: geminiModel || 'gemini-2.5-flash',
        temperature: temperature !== undefined ? temperature : 0.7,
        userId: session.user.id
      },
      include: {
        _count: {
          select: {
            prompts: true
          }
        }
      }
    });

    // Кэшируем новый проект в Redis
    const projectData: CachedProjectData = {
      id: project.id,
      name: project.name,
      geminiApiKey: project.geminiApiKey,
      geminiModel: project.geminiModel || 'gemini-2.5-flash',
      temperature: project.temperature || 0.7,
      userId: project.userId
    };
    
    await cacheProject(projectData);
    
    // Инвалидируем общий кэш, чтобы он обновился при следующем запросе
    await invalidateAllCache();

    console.log(`Проект ${project.name} создан и кэширован`);

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error('Ошибка создания проекта:', error);
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 });
  }
}