import { prisma } from '@/lib/prisma';
import { cacheAllData, cacheProject, cachePrompt, getCachedAllData, type CachedAllData, type CachedProjectData, type CachedPromptData } from '@/lib/redis';

let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

export async function initializeCache(): Promise<void> {
  // Если уже инициализирован, ничего не делаем
  if (isInitialized) {
    return;
  }

  // Если инициализация уже идет, ждем ее завершения
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = performInitialization();
  await initializationPromise;
}

async function performInitialization(): Promise<void> {
  try {
    console.log('Проверяем кэш при запуске системы...');
    
    // Проверяем, есть ли уже данные в кэше
    const cachedData = await getCachedAllData();
    
    if (cachedData) {
      console.log('Кэш уже инициализирован, пропускаем загрузку');
      isInitialized = true;
      return;
    }

    console.log('Кэш пуст, начинаем инициализацию...');
    
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

    console.log('Кэш успешно инициализирован при запуске');
    console.log(`Кэшировано проектов: ${cachedProjects.length}`);
    console.log(`Кэшировано промптов: ${Object.values(cachedPrompts).reduce((total, projectPrompts) => total + Object.keys(projectPrompts).length, 0)}`);
    
    isInitialized = true;
  } catch (error) {
    console.error('Ошибка инициализации кэша при запуске:', error);
    // Сбрасываем флаги, чтобы можно было попробовать снова
    isInitialized = false;
    initializationPromise = null;
    throw error;
  }
}

// Функция для принудительной переинициализации кэша
export async function reinitializeCache(): Promise<void> {
  isInitialized = false;
  initializationPromise = null;
  await initializeCache();
}

// Функция для проверки статуса инициализации
export function isCacheInitialized(): boolean {
  return isInitialized;
}