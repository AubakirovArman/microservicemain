'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useParams } from 'next/navigation';

interface Project {
  id: string;
  name: string;
  geminiApiKey: string;
  geminiModel: string;
  temperature: number;
  createdAt: string;
  updatedAt: string;
}

export default function EditProjectPage() {
  const [name, setName] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');
  const [temperature, setTemperature] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const { data: session } = useSession();
  const params = useParams();
  const projectId = params.id as string;

  const geminiModels = [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' }
  ];

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (response.ok) {
          const project: Project = await response.json();
          setName(project.name);
          setGeminiApiKey(project.geminiApiKey);
          setGeminiModel(project.geminiModel || 'gemini-2.5-flash');
          setTemperature(project.temperature ?? 0.7);
        } else {
          setError('Ошибка загрузки проекта');
        }
      } catch (error) {
        setError('Ошибка сети');
      } finally {
        setIsLoadingProject(false);
      }
    };

    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, geminiApiKey, geminiModel, temperature }),
      });

      if (response.ok) {
        router.push(`/projects/${projectId}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Ошибка при обновлении проекта');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return <div>Загрузка...</div>;
  }

  if (isLoadingProject) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">Загрузка проекта...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Редактировать проект
            </h2>
          </div>

          <div className="mt-8">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Название проекта
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    placeholder="Введите название проекта"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="geminiApiKey" className="block text-sm font-medium text-gray-700">
                  Ключ Gemini API
                </label>
                <div className="mt-1">
                  <input
                    id="geminiApiKey"
                    name="geminiApiKey"
                    type="password"
                    required
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    placeholder="Введите ключ Gemini API"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Получите ключ API на{' '}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-500"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              <div>
                <label htmlFor="geminiModel" className="block text-sm font-medium text-gray-700">
                  Модель Gemini
                </label>
                <div className="mt-1">
                  <select
                    id="geminiModel"
                    name="geminiModel"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                  >
                    {geminiModels.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Выберите модель Gemini для обработки запросов
                </p>
              </div>

              <div>
                <label htmlFor="temperature" className="block text-sm font-medium text-gray-700">
                  Температура ({temperature})
                </label>
                <div className="mt-1">
                  <input
                    id="temperature"
                    name="temperature"
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Контролирует случайность ответов (0 = детерминированный, 2 = очень случайный)
                </p>
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => router.push(`/projects/${projectId}`)}
                  className="flex-1 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}