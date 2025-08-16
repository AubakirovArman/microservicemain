// Lightweight placeholder for future token-based summarization
export function maybeSummarize(history: Array<{ role: string; content: string }>, maxChars = 12000) {
  let total = 0;
  const kept: typeof history = [];
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    const len = h.content.length + 10;
    if (total + len > maxChars) break;
    kept.push(h);
    total += len;
  }
  return kept.reverse();
}

export function systemPrompt(instruction?: string, style?: string) {
  const parts: string[] = [];
  if (instruction) parts.push(`Инструкции промпта: ${instruction}`);
  if (style) parts.push(`Стиль общения ассистента: ${style}. Придерживайся этого стиля.`);
  return parts.join('\n');
}
