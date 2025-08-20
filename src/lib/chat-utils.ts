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

// Detects if the user's message likely indicates the end of conversation (farewell/closing intent)
export function detectEndOfConversation(input: string): boolean {
  if (!input) return false;
  const s = String(input).toLowerCase();
  const patterns: RegExp[] = [
    /\bпока\b/i,
    /\bдо\s*свидан/i,
    /\bдо\s*встреч/i,
    /\bувидим/i,
    /\bвс[её]\s*[,!\.?\s]*пока/i,
    /\bспасибо[,!\.?\s]*\s*пока/i,
    /\bна\s+этом\s+вс[её]/i,
    /\bзаканчива(ем|ю)/i,
    /\bзаверша(ем|ю)/i,
    /\bвсего\s+добр/i,
    /\bвсего\s+хорош/i,
    /\bпрощай\b/i,
    /\boй\s*вс[её]\b/i,
    /\b(вешаю|кладу|положу)\s+трубк/i,
    /\bgoodbye\b/i,
    /\bbye\b/i,
    /\bsee\s+you\b/i,
    /\bttyl\b/i,
  ];
  return patterns.some((r) => r.test(s));
}
