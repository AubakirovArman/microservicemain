import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cacheAllData, cacheProject, cachePrompt, type CachedAllData, type CachedProjectData, type CachedPromptData } from '@/lib/redis';

export async function POST() {
  try {
    console.log('Начинаем инициализацию кэша...');
    
    // Получаем все проекты с промптами из базы данных
    const projects = await prisma.project.findMany({
      include: {
        prompts: true
      }
    });

    console.log(`Найдено ${projects.length} проектов для кэширования`);

    // Подготавливаем данные для кэширования
    const cachedProjects: CachedProjectData[] = [];
    const cachedPrompts: { [projectId: string]: { [promptId: string]: CachedPromptData } } = {};

    for (const project of projects) {
      // Кэшируем проект
      const projectData: CachedProjectData = {
        id: project.id,
        name: project.name,
        geminiApiKey: project.geminiApiKey,
        geminiModel: project.geminiModel || 'gemini-2.5-flash',
        temperature: project.temperature ?? 0.7,
        userId: project.userId
      };
      
      cachedProjects.push(projectData);
      await cacheProject(projectData);

      // Кэшируем промпты проекта
      if (project.prompts.length > 0) {
        cachedPrompts[project.id] = {};
        
        for (const prompt of project.prompts) {
          const promptData: CachedPromptData = {
            instruction: prompt.instruction,
            geminiApiKey: project.geminiApiKey,
            geminiModel: project.geminiModel || 'gemini-2.5-flash',
            temperature: project.temperature ?? 0.7
          };
          
          cachedPrompts[project.id][prompt.id] = promptData;
          await cachePrompt(project.id, prompt.id, promptData);
        }
      }
    }

    // Кэшируем все данные в одном ключе для быстрого доступа
    const allData: CachedAllData = {
      projects: cachedProjects,
      prompts: cachedPrompts
    };
    
    await cacheAllData(allData);

    console.log('Кэш успешно инициализирован');
    console.log(`Кэшировано проектов: ${cachedProjects.length}`);
    console.log(`Кэшировано промптов: ${Object.values(cachedPrompts).reduce((total, projectPrompts) => total + Object.keys(projectPrompts).length, 0)}`);

    return NextResponse.json({
      success: true,
      message: 'Кэш успешно инициализирован',
      stats: {
        projects: cachedProjects.length,
        prompts: Object.values(cachedPrompts).reduce((total, projectPrompts) => total + Object.keys(projectPrompts).length, 0)
      }
    });
  } catch (error) {
    console.error('Ошибка инициализации кэша:', error);
    return NextResponse.json(
      { error: 'Ошибка инициализации кэша' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Используйте POST запрос для инициализации кэша'
  });
}