import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper to trim history based on token/length budget and keep summary
function buildContext(messages: Array<{ role: string; content: string }>, style?: string, promptInstructions?: string) {
  // naive size control by char length; can be improved to token-based
  const maxChars = 12000; // rough budget
  const systemParts: string[] = [];
  if (promptInstructions) systemParts.push(`Инструкции промпта: ${promptInstructions}`);
  if (style) systemParts.push(`Стиль общения ассистента: ${style}. Говори в этом стиле во всех ответах.`);
  const systemText = systemParts.join('\n');

  const reversed = [...messages].reverse();
  const kept: typeof messages = [];
  let total = systemText.length;
  for (const m of reversed) {
    const len = m.content.length + 10;
    if (total + len > maxChars) break;
    kept.push(m);
    total += len;
  }
  kept.reverse();
  return { systemText, history: kept };
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string; chatId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const { id, chatId } = await params;
  const { promptId, text } = await request.json();
  if (!promptId || !text) return NextResponse.json({ error: 'promptId и text обязательны' }, { status: 400 });

  // Load project + prompt
  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id }, include: { prompts: { where: { id: promptId } } } });
  if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });
  if (!project.prompts[0]) return NextResponse.json({ error: 'Промпт не найден' }, { status: 404 });

  // Load chat and its messages
  const chat = await (prisma as any).chat.findFirst({ where: { id: chatId, projectId: id } });
  if (!chat) return NextResponse.json({ error: 'Чат не найден' }, { status: 404 });
  const messages = await (prisma as any).message.findMany({ where: { chatId }, orderBy: { createdAt: 'asc' } });

  // Optional summarization if too long
  const geminiModel = project.geminiModel || 'gemini-2.5-flash';
  const temperature = project.temperature ?? 0.7;
  const geminiApiKey = project.geminiApiKey;
  let summary: string | undefined = chat.summary || undefined;
  let approxLen = (summary?.length || 0) + messages.reduce((acc: number, m: any) => acc + m.content.length, 0);
  if (approxLen > 15000 && geminiApiKey) {
    // summarize first half of messages up to ~8000 chars
    let buffer = '';
    for (const m of messages) {
      const line = `${m.role}: ${m.content}\n`;
      if (buffer.length + line.length > 8000) break;
      buffer += line;
    }
    const sumReq = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Суммаризируй кратко и по делу следующую историю диалога, сохрани факты, намерения и открытые вопросы.\n\n${buffer}` }] }],
        generationConfig: { temperature: 0.3 }
      })
    });
    if (sumReq.ok) {
      const sumData = await sumReq.json();
      const sumText = sumData.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
      if (sumText) {
        summary = summary ? `${summary}\n${sumText}` : sumText;
        await (prisma as any).chat.update({ where: { id: chatId }, data: { summary } });
      }
    }
  }

  // Build context
  const { systemText, history } = buildContext(
    messages.map((m: any) => ({ role: m.role.toLowerCase(), content: m.content })),
    chat.style || undefined,
    [project.prompts[0].instruction, summary ? `Краткая сводка истории: ${summary}` : undefined].filter(Boolean).join('\n')
  );

  // Persist user message
  await (prisma as any).message.create({ data: { chatId, role: 'USER', content: text } });

  // Call Gemini
  if (!geminiApiKey) return NextResponse.json({ error: 'Gemini API ключ не настроен' }, { status: 400 });

  const contents = [] as any[];
  if (systemText) contents.push({ role: 'user', parts: [{ text: systemText }] });
  for (const m of history) {
    contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] });
  }
  contents.push({ role: 'user', parts: [{ text }] });

  const geminiResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents, generationConfig: { temperature } })
  });
  if (!geminiResp.ok) {
    const err = await geminiResp.text();
    console.error('Gemini error:', err);
    return NextResponse.json({ error: 'Ошибка при вызове Gemini API' }, { status: 500 });
  }
  const data = await geminiResp.json();
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Нет ответа';

  // Save assistant message
  await (prisma as any).message.create({ data: { chatId, role: 'ASSISTANT', content: responseText } });

  // Touch chat updatedAt
  await (prisma as any).chat.update({ where: { id: chatId }, data: { updatedAt: new Date() } });

  return NextResponse.json({ text: responseText });
}

// GET: история сообщений (ограниченная)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; chatId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  const { id, chatId } = await params;

  const project = await prisma.project.findFirst({ where: { id, userId: session.user.id } });
  if (!project) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

  const messages = await (prisma as any).message.findMany({ where: { chatId }, orderBy: { createdAt: 'asc' }, take: 200 });
  return NextResponse.json(messages);
}
