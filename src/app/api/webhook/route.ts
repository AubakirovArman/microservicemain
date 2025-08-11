import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedPrompt, cachePrompt, type CachedPromptData } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
    const { projectId, promptId, text, check } = await request.json();

    if (!projectId || !promptId || !text) {
      return NextResponse.json({ 
        error: 'projectId, promptId и text обязательны' 
      }, { status: 400 });
    }

    // Если check=true, проверяем на автоответчик через main_embeddings.py
    if (check === true) {
      try {
        const embeddingsResponse = await fetch('http://localhost:8001/check_phrase', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phrase: text,
            threshold: 0.9
          })
        });

        if (embeddingsResponse.ok) {
          const embeddingsData = await embeddingsResponse.json();
          if (embeddingsData.is_answering_machine) {
            return NextResponse.json({ text: 'автоответчик' }, { status: 200 });
          }
        }
      } catch (embeddingsError) {
        console.error('Ошибка при проверке автоответчика:', embeddingsError);
        // Продолжаем выполнение стандартной процедуры, если проверка не удалась
      }
    }

    // Сначала пытаемся получить данные из кеша Redis
    let cachedData = await getCachedPrompt(projectId, promptId);
    let promptInstructions: string;
    let geminiApiKey: string;
    let geminiModel: string;
    let temperature: number;

    if (!cachedData) {
      // Если данные не в кеше, получаем из базы данных
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
      temperature = project.temperature ?? 0.7;

      // Кешируем все данные для будущих запросов
      const dataToCache: CachedPromptData = {
        instruction: promptInstructions,
        geminiApiKey,
        geminiModel,
        temperature
      };
      await cachePrompt(projectId, promptId, dataToCache);
    } else {
      // Используем данные из кеша
      promptInstructions = cachedData.instruction;
      geminiApiKey = cachedData.geminiApiKey;
      geminiModel = cachedData.geminiModel;
      temperature = cachedData.temperature;
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

    return NextResponse.json({ text: responseText }, { status: 200 });

  } catch (error) {
    console.error('Ошибка webhook:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}