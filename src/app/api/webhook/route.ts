import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedPrompt, cachePrompt } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { projectId, promptId, text } = await request.json();

    if (!projectId || !promptId || !text) {
      return NextResponse.json({ 
        error: 'projectId, promptId и text обязательны' 
      }, { status: 400 });
    }

    // Сначала пытаемся получить промпт из кеша Redis
    let promptInstructions = await getCachedPrompt(projectId, promptId);
    let geminiApiKey: string | null = null;
    let geminiModel: string = 'gemini-2.5-flash'; // значение по умолчанию
    let temperature: number = 0.7; // значение по умолчанию

    if (!promptInstructions) {
      // Если промпт не в кеше, получаем из базы данных
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          prompts: {
            where: { id: promptId }
          }
        }
      });

      if (!project) {
        return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
      }

      if (project.prompts.length === 0) {
        return NextResponse.json({ error: 'Промпт не найден' }, { status: 404 });
      }

      const prompt = project.prompts[0];
      promptInstructions = prompt.instruction;
      geminiApiKey = project.geminiApiKey;
      geminiModel = project.geminiModel || 'gemini-2.5-flash';
      temperature = project.temperature || 0.7;

      // Кешируем промпт для будущих запросов
      if (promptInstructions) {
        await cachePrompt(projectId, promptId, promptInstructions);
      }
    } else {
      // Если промпт был в кеше, нужно получить API ключ, модель и температуру отдельно
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { geminiApiKey: true, geminiModel: true, temperature: true }
      });

      if (!project) {
        return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
      }

      geminiApiKey = project.geminiApiKey;
      geminiModel = project.geminiModel || 'gemini-2.5-flash';
      temperature = project.temperature || 0.7;
    }

    if (!geminiApiKey) {
      return NextResponse.json({ 
        error: 'Gemini API ключ не настроен для этого проекта' 
      }, { status: 400 });
    }

    // Вызываем Gemini API
    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${promptInstructions}\n\nТекст для обработки: ${text}`
          }]
        }],
        generationConfig: {
          temperature: temperature
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Ошибка Gemini API:', errorData);
      return NextResponse.json({ 
        error: 'Ошибка при вызове Gemini API' 
      }, { status: 500 });
    }

    const geminiData = await geminiResponse.json();
    
    // Извлекаем текст ответа из структуры Gemini API
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа';

    return new NextResponse(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      }
    });

  } catch (error) {
    console.error('Ошибка webhook:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}