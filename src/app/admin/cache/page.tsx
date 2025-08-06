'use client';

import { useState } from 'react';
import Link from 'next/link';

interface CacheStats {
  projects: number;
  prompts: number;
}

export default function CacheManagementPage() {
  const [isInitializing, setIsInitializing] = useState(false);
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const initializeCache = async () => {
    setIsInitializing(true);
    setMessage('');
    setError('');
    
    try {
      const response = await fetch('/api/cache/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setStats(result.stats);
        setMessage(result.message);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка инициализации кэша');
      }
    } catch (error) {
      setError('Ошибка сети при инициализации кэша');
    } finally {
      setIsInitializing(false);
    }
  };

  const clearCache = async () => {
    try {
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setMessage('Кэш успешно очищен');
        setStats(null);
      } else {
        setError('Ошибка очистки кэша');
      }
    } catch (error) {
      setError('Ошибка сети при очистке кэша');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Управление кэшем Redis</h1>
            <Link 
              href="/admin" 
              className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded transition-colors"
            >
              Назад в админку
            </Link>
          </div>

          {message && (
            <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Инициализация кэша</h2>
              <p className="text-gray-600 mb-4">
                Загружает все проекты и промпты из базы данных в Redis кэш для быстрого доступа.
              </p>
              <button
                onClick={initializeCache}
                disabled={isInitializing}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded transition-colors"
              >
                {isInitializing ? 'Инициализация...' : 'Инициализировать кэш'}
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-4">Очистка кэша</h2>
              <p className="text-gray-600 mb-4">
                Полностью очищает Redis кэш. Данные будут загружены заново при следующем обращении.
              </p>
              <button
                onClick={clearCache}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition-colors"
              >
                Очистить кэш
              </button>
            </div>
          </div>

          {stats && (
            <div className="mt-6 bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Статистика кэша</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-gray-600">Проектов в кэше:</span>
                  <span className="ml-2 font-semibold">{stats.projects}</span>
                </div>
                <div>
                  <span className="text-gray-600">Промптов в кэше:</span>
                  <span className="ml-2 font-semibold">{stats.prompts}</span>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Автоматическое кэширование</h2>
            <p className="text-gray-600">
              Система автоматически:
            </p>
            <ul className="list-disc list-inside text-gray-600 mt-2">
              <li>Инициализирует кэш при запуске приложения</li>
              <li>Кэширует новые проекты и промпты при их создании</li>
              <li>Обновляет кэш при редактировании проектов и промптов</li>
              <li>Удаляет данные из кэша при их удалении</li>
              <li>Инвалидирует общий кэш при любых изменениях</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}