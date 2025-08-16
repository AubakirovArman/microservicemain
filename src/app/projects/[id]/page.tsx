'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  createdAt: string;
  prompts: Prompt[];
}

interface Prompt {
  id: string;
  name: string;
  instruction: string;
  createdAt: string;
}

export default function ProjectDetail() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewPromptForm, setShowNewPromptForm] = useState(false);
  const [newPrompt, setNewPrompt] = useState({ name: '', instruction: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [jsonChatId, setJsonChatId] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/auth/signin');
      return;
    }
    fetchProject();
  }, [session, status, router, projectId]);

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else if (response.status === 404) {
        setError('Проект не найден');
      } else {
        setError('Ошибка загрузки проекта');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/prompts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPrompt)
      });

      if (response.ok) {
        const prompt = await response.json();
        setProject(prev => prev ? {
          ...prev,
          prompts: [...prev.prompts, prompt]
        } : null);
        setNewPrompt({ name: '', instruction: '' });
        setShowNewPromptForm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Ошибка создания промпта');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот промпт?')) return;

    try {
      const response = await fetch(`/api/projects/${projectId}/prompts/${promptId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setProject(prev => prev ? {
          ...prev,
          prompts: prev.prompts.filter(p => p.id !== promptId)
        } : null);
      } else {
        setError('Ошибка удаления промпта');
      }
    } catch (error) {
      setError('Ошибка сети');
    }
  };

  const handleShowJson = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setJsonText('');
  setJsonChatId('');
    setShowJsonModal(true);
  };

  if (status === 'loading' || loading) {
    return <div className="flex justify-center items-center min-h-screen">Загрузка...</div>;
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
          <Link href="/dashboard" className="mt-4 inline-block text-blue-500 hover:text-blue-600">
            ← Назад к проектам
          </Link>
        </div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Link href="/dashboard" className="text-blue-500 hover:text-blue-600 mb-2 inline-block">
                ← Назад к проектам
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">
                Создан: {new Date(project.createdAt).toLocaleDateString('ru-RU')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push(`/projects/${projectId}/edit`)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Редактировать проект
              </button>
              <button
                onClick={() => setShowNewPromptForm(true)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
              >
                Создать промпт
              </button>
            </div>
          </div>

          {showNewPromptForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">Создать новый промпт</h3>
              <form onSubmit={handleCreatePrompt} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Название промпта
                  </label>
                  <input
                    type="text"
                    value={newPrompt.name}
                    onChange={(e) => setNewPrompt({ ...newPrompt, name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Введите название промпта"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Инструкция промпта
                  </label>
                  <textarea
                    value={newPrompt.instruction}
                    onChange={(e) => setNewPrompt({ ...newPrompt, instruction: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                    placeholder="Введите инструкцию для промпта"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded-md"
                  >
                    {submitting ? 'Создание...' : 'Создать'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewPromptForm(false);
                      setNewPrompt({ name: '', instruction: '' });
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Промпты ({project.prompts.length})
            </h2>
            
            {project.prompts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">В этом проекте пока нет промптов</p>
                <button
                  onClick={() => setShowNewPromptForm(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
                >
                  Создать первый промпт
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {project.prompts.map((prompt) => (
                  <div key={prompt.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{prompt.name}</h3>
                      <div className="flex gap-2">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          ID: {prompt.id}
                        </span>
                        <button
                          onClick={() => router.push(`/projects/${params.id}/prompts/${prompt.id}/edit`)}
                          className="text-indigo-600 hover:text-indigo-800 text-sm"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleShowJson(prompt)}
                          className="text-green-500 hover:text-green-700 text-sm"
                        >
                          Показать JSON
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(prompt.id)}
                          className="text-red-500 hover:text-red-700 text-sm"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 mb-2">{prompt.instruction}</p>
                    <p className="text-sm text-gray-500">
                      Создан: {new Date(prompt.createdAt).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* JSON Modal */}
      {showJsonModal && selectedPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">JSON для промпта: {selectedPrompt.name}</h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Текст для обработки:
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="Введите текст для обработки..."
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                rows={4}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ID чата (chatId)
              </label>
              <input
                type="text"
                value={jsonChatId}
                onChange={(e) => setJsonChatId(e.target.value)}
                placeholder="Можно указать телефон/логин клиента или внутренний chatId"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">Если это телефон/логин и чата ещё нет — он будет создан автоматически.</p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                JSON для webhook:
              </label>
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-60 text-gray-900">
{JSON.stringify({
  promptId: selectedPrompt.id,
  projectId: projectId,
  text: jsonText || "Ваш текст здесь",
  ...(jsonChatId ? { chatId: jsonChatId } : {})
}, null, 2)}
              </pre>
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  const jsonData = {
                    promptId: selectedPrompt.id,
                    projectId: projectId,
                    text: jsonText || "Ваш текст здесь",
                    ...(jsonChatId ? { chatId: jsonChatId } : {})
                  };
                  navigator.clipboard.writeText(JSON.stringify(jsonData, null, 2));
                  alert('JSON скопирован в буфер обмена!');
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md mr-2"
              >
                Копировать JSON
              </button>
              <button
                onClick={() => setShowJsonModal(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}