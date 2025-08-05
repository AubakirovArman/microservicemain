'use client';

import { useState } from 'react';

export default function TestWebhookPage() {
  const [projectId, setProjectId] = useState('');
  const [promptId, setPromptId] = useState('');
  const [text, setText] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Новые состояния для JSON окна
  const [jsonInput, setJsonInput] = useState('');
  const [jsonResponse, setJsonResponse] = useState('');
  const [isJsonLoading, setIsJsonLoading] = useState(false);
  const [jsonError, setJsonError] = useState('');
  const [activeTab, setActiveTab] = useState('form'); // 'form' или 'json'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setResponse('');

    try {
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId, promptId, text }),
      });

      const data = await res.json();

      if (res.ok) {
        setResponse(data.response);
      } else {
        setError(data.error || 'Ошибка при вызове webhook');
      }
    } catch (error) {
      setError('Ошибка сети');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJsonSubmit = async () => {
    setIsJsonLoading(true);
    setJsonError('');
    setJsonResponse('');

    try {
      // Проверяем валидность JSON
      const parsedJson = JSON.parse(jsonInput);
      
      const res = await fetch('/api/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonInput,
      });

      const data = await res.json();

      if (res.ok) {
        setJsonResponse(data.response);
      } else {
        setJsonError(data.error || 'Ошибка при вызове webhook');
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        setJsonError('Неверный формат JSON');
      } else {
        setJsonError('Ошибка сети');
      }
    } finally {
      setIsJsonLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Тест Webhook API
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Протестируйте вызов Gemini AI через webhook
            </p>
          </div>

          {/* Табы */}
          <div className="mt-8">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('form')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'form'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Форма
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'json'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  JSON
                </button>
              </nav>
            </div>
          </div>

          <div className="mt-8">
            {activeTab === 'form' ? (
              <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="projectId" className="block text-sm font-medium text-gray-700">
                  Project ID
                </label>
                <div className="mt-1">
                  <input
                    id="projectId"
                    name="projectId"
                    type="text"
                    required
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    placeholder="Введите ID проекта"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="promptId" className="block text-sm font-medium text-gray-700">
                  Prompt ID
                </label>
                <div className="mt-1">
                  <input
                    id="promptId"
                    name="promptId"
                    type="text"
                    required
                    value={promptId}
                    onChange={(e) => setPromptId(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    placeholder="Введите ID промпта"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="text" className="block text-sm font-medium text-gray-700">
                  Текст для обработки
                </label>
                <div className="mt-1">
                  <textarea
                    id="text"
                    name="text"
                    rows={4}
                    required
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                    placeholder="Введите текст для обработки"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isLoading ? 'Обработка...' : 'Отправить запрос'}
                </button>
              </div>
              </form>
            ) : (
              <div className="space-y-6">
                {jsonError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                    {jsonError}
                  </div>
                )}

                <div>
                  <label htmlFor="jsonInput" className="block text-sm font-medium text-gray-700">
                    JSON для отправки
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="jsonInput"
                      name="jsonInput"
                      rows={8}
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900"
                      placeholder={`{\n  "projectId": "your-project-id",\n  "promptId": "your-prompt-id",\n  "text": "your text here"\n}`}
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={handleJsonSubmit}
                    disabled={isJsonLoading || !jsonInput.trim()}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {isJsonLoading ? 'Обработка...' : 'Отправить JSON'}
                  </button>
                </div>
              </div>
            )}

            {response && activeTab === 'form' && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ответ от Gemini AI:</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">{response}</pre>
                </div>
              </div>
            )}

            {jsonResponse && activeTab === 'json' && (
              <div className="mt-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Ответ от Gemini AI:</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800">{jsonResponse}</pre>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}