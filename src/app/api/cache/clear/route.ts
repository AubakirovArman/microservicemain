import { NextResponse } from 'next/server';
import client, { invalidateAllCache } from '@/lib/redis';

export async function POST() {
  try {
    console.log('Начинаем очистку кэша...');
    
    // Очищаем весь Redis кэш
    await client.flushAll();
    
    console.log('Кэш успешно очищен');

    return NextResponse.json({
      success: true,
      message: 'Кэш успешно очищен'
    });
  } catch (error) {
    console.error('Ошибка очистки кэша:', error);
    return NextResponse.json(
      { error: 'Ошибка очистки кэша' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Используйте POST запрос для очистки кэша'
  });
}