'use client';

import { useEffect, useState } from 'react';

interface CacheInitProviderProps {
  children: React.ReactNode;
}

export default function CacheInitProvider({ children }: CacheInitProviderProps) {
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeCache = async () => {
      try {
        console.log('Инициализируем кэш при загрузке приложения...');
        
        const response = await fetch('/api/cache/init', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Кэш успешно инициализирован:', result);
        } else {
          console.warn('Не удалось инициализировать кэш, продолжаем без кэша');
        }
      } catch (error) {
        console.warn('Ошибка инициализации кэша, продолжаем без кэша:', error);
        setError('Не удалось инициализировать кэш');
      } finally {
        setIsInitializing(false);
      }
    };

    // Запускаем инициализацию кэша только один раз при загрузке
    initializeCache();
  }, []);

  // Показываем детей сразу, не блокируя интерфейс
  // Кэш инициализируется в фоне
  return (
    <>
      {children}
      {isInitializing && (
        <div className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg text-sm">
          Инициализация кэша...
        </div>
      )}
      {error && (
        <div className="fixed bottom-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded shadow-lg text-sm">
          {error}
        </div>
      )}
    </>
  );
}