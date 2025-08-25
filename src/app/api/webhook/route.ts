import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCachedPrompt, cachePrompt, type CachedPromptData } from '@/lib/redis';

export async function POST(request: NextRequest) {
  try {
  const { projectId, promptId, text, check, chatId, externalKey } = await request.json();

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
            return NextResponse.json({ text: 'автоответчик', endtalk: true }, { status: 200 });
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

    // Определение чата:
    // 1) Если нет chatId, но есть externalKey — находим/создаём по externalKey.
    // 2) Если есть chatId — пробуем найти по id; если не нашли, трактуем chatId как externalKey и находим/создаём.
    let effectiveChatId = chatId as string | undefined;
    if (!effectiveChatId && externalKey) {
      const existing = await (prisma as any).chat.findFirst({ where: { projectId: projectId, externalKey } });
      if (existing) {
        effectiveChatId = existing.id as string;
      } else {
        const created = await (prisma as any).chat.create({ data: { projectId: projectId, externalKey, name: externalKey } });
        effectiveChatId = created.id as string;
      }
    } else if (effectiveChatId) {
      const byId = await (prisma as any).chat.findFirst({ where: { id: effectiveChatId, projectId } });
      if (!byId) {
        const aliasKey = effectiveChatId;
        const existingByKey = await (prisma as any).chat.findFirst({ where: { projectId: projectId, externalKey: aliasKey } });
        if (existingByKey) {
          effectiveChatId = existingByKey.id as string;
        } else {
          const created = await (prisma as any).chat.create({ data: { projectId: projectId, externalKey: aliasKey, name: aliasKey } });
          effectiveChatId = created.id as string;
        }
      }
    }

    // Объявление инструмента-функции для завершения разговора (доступно для любого промпта)
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'endTalk',
            description: 'Вызови эту функцию, когда разговор завершается (пользователь прощается/говорит, что это всё). Передай короткое финальное сообщение в поле text.',
            parameters: {
              type: 'OBJECT',
              properties: {
                text: { type: 'STRING', description: 'Короткое финальное прощальное сообщение пользователю.' }
              },
              required: ['text']
            }
          }
        ]
      }
    ] as any;

  // Поддержка двух режимов: без chatId (старое поведение) и с chatId/ externalKey (диалог с контекстом)
    let geminiResponse: Response;
    // endtalk теперь определяется только вызовом функции endTalk со стороны модели
    const initialEndtalk = false;
    if (!effectiveChatId) {
      // старый режим
      const toolInstruction = 'Если пользователь завершает разговор, вместо обычного ответа вызови функцию endTalk с полем text — твоё короткое прощальное сообщение. В остальных случаях НЕ вызывай функцию.';
      geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${promptInstructions}\n\n${toolInstruction}\n\nТекст для обработки: ${text}` }] }],
          generationConfig: { temperature },
          tools
        })
      });
    } else {
      // режим чата: подтягиваем историю сообщений
      let chat = await (prisma as any).chat.findFirst({ where: { id: effectiveChatId, projectId } });
      if (!chat) {
        // Фолбэк: если chatId не найден — считаем, что прислали внешний ключ (телефон/логин)
        const ek = effectiveChatId;
        const foundByEk = await (prisma as any).chat.findFirst({ where: { projectId, externalKey: ek } });
        if (foundByEk) {
          chat = foundByEk;
          effectiveChatId = foundByEk.id;
        } else {
          const created = await (prisma as any).chat.create({ data: { projectId, externalKey: ek, name: ek } });
          chat = created;
          effectiveChatId = created.id;
        }
      }
      const messages = await (prisma as any).message.findMany({ where: { chatId: effectiveChatId }, orderBy: { createdAt: 'asc' }, take: 200 });

      // формируем контент: сначала инструкции и стиль, затем история, затем новый текст
      const systemParts: string[] = [];
      if (promptInstructions) systemParts.push(`Инструкции промпта: ${promptInstructions}`);
      if (chat.style) systemParts.push(`Стиль общения ассистента: ${chat.style}. Придерживайся этого стиля.`);
      // Добавляем инструкцию по вызову функции завершения
      systemParts.push('Если пользователь завершает разговор, вместо обычного ответа вызови функцию endTalk с полем text — твоё короткое прощальное сообщение. В остальных случаях НЕ вызывай функцию.');
      const systemText = systemParts.join('\n');

      const contents: any[] = [];
      if (systemText) contents.push({ role: 'user', parts: [{ text: systemText }] });
      // Примерный бюджет на историю: 12000 символов
      let total = systemText.length;
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        const piece = { role: m.role === 'ASSISTANT' ? 'model' : 'user', parts: [{ text: m.content }] } as any;
        const len = m.content.length + 10;
        if (total + len > 12000) break;
        contents.unshift(piece);
        total += len;
      }
      contents.push({ role: 'user', parts: [{ text }] });

      // сохраняем входящее сообщение пользователя
      await (prisma as any).message.create({ data: { chatId: effectiveChatId, role: 'USER', content: text } });

      geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig: { temperature }, tools })
      });
    }

    if (!geminiResponse.ok) {
      const errorData = await geminiResponse.text();
      console.error('Ошибка Gemini API:', errorData);
      return NextResponse.json({ 
        error: 'Ошибка при вызове Gemini API' 
      }, { status: 500 });
    }

    const geminiData = await geminiResponse.json();
    const parts = geminiData?.candidates?.[0]?.content?.parts || [];
    // Извлекаем текстовый ответ (если есть)
    let responseText: string = 'Нет ответа';
    for (const p of parts) {
      if (typeof p?.text === 'string' && p.text.trim()) { responseText = p.text; break; }
    }

    // Признак завершения разговора: либо модель вызвала функцию endTalk, либо сработала эвристика
    let endtalk = initialEndtalk;
    const fcPart = parts.find((p: any) => p && p.functionCall);
    if (fcPart?.functionCall?.name === 'endTalk') {
      endtalk = true;
      // Пытаемся извлечь финальный текст из аргументов функции
      const args: any = fcPart.functionCall.args;
      let endText = '';
      if (args && typeof args === 'object') {
        endText = args.text || '';
      } else if (typeof args === 'string') {
        try { const parsed = JSON.parse(args); endText = parsed?.text || ''; } catch {}
      }
      if (endText) responseText = endText;
    }

    // если чатовый режим — сохраняем ответ ассистента
    if (effectiveChatId) {
      await (prisma as any).message.create({ data: { chatId: effectiveChatId, role: 'ASSISTANT', content: responseText } });
      await (prisma as any).chat.update({ where: { id: effectiveChatId }, data: { updatedAt: new Date() } });
      if (endtalk) {
        try {
          await (prisma as any).message.deleteMany({ where: { chatId: effectiveChatId } });
          await (prisma as any).chat.update({ where: { id: effectiveChatId }, data: { summary: null } });
        } catch (cleanErr) {
          console.error('Ошибка очистки контекста (webhook):', cleanErr);
        }
      }
    }
    return NextResponse.json({ text: responseText, chatId: effectiveChatId, endtalk }, { status: 200 });

  } catch (error) {
    console.error('Ошибка webhook:', error);
    return NextResponse.json({ 
      error: 'Внутренняя ошибка сервера' 
    }, { status: 500 });
  }
}