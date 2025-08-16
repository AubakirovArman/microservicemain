import { createClient } from 'redis';

const client = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => {
  console.error('Redis Client Error', err);
});

if (!client.isOpen) {
  client.connect();
}

export default client;

// Types for cached data
interface CachedPromptData {
  instruction: string;
  geminiApiKey: string;
  geminiModel: string;
  temperature: number;
}

interface CachedProjectData {
  id: string;
  name: string;
  geminiApiKey: string;
  geminiModel: string;
  temperature: number;
  userId: string;
  type?: 'SINGLE' | 'CHAT';
}

interface CachedAllData {
  projects: CachedProjectData[];
  prompts: { [projectId: string]: { [promptId: string]: CachedPromptData } };
}

// Utility functions for prompt caching
export const cachePrompt = async (projectId: string, promptId: string, data: CachedPromptData) => {
  const key = `prompt:${projectId}:${promptId}`;
  await client.set(key, JSON.stringify(data), { EX: 3600 }); // Cache for 1 hour
};

export const getCachedPrompt = async (projectId: string, promptId: string): Promise<CachedPromptData | null> => {
  const key = `prompt:${projectId}:${promptId}`;
  const cached = await client.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Error parsing cached prompt data:', error);
      return null;
    }
  }
  return null;
};

export const deleteCachedPrompt = async (projectId: string, promptId: string) => {
  const key = `prompt:${projectId}:${promptId}`;
  await client.del(key);
};

// Legacy function for backward compatibility
export const getCachedPromptInstruction = async (projectId: string, promptId: string): Promise<string | null> => {
  const data = await getCachedPrompt(projectId, promptId);
  return data?.instruction || null;
};

// Functions for caching all data at startup
export const cacheAllData = async (data: CachedAllData) => {
  const key = 'system:all_data';
  await client.set(key, JSON.stringify(data), { EX: 7200 }); // Cache for 2 hours
};

export const getCachedAllData = async (): Promise<CachedAllData | null> => {
  const key = 'system:all_data';
  const cached = await client.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Error parsing cached all data:', error);
      return null;
    }
  }
  return null;
};

// Functions for project caching
export const cacheProject = async (project: CachedProjectData) => {
  const key = `project:${project.id}`;
  await client.set(key, JSON.stringify(project), { EX: 3600 }); // Cache for 1 hour
};

export const getCachedProject = async (projectId: string): Promise<CachedProjectData | null> => {
  const key = `project:${projectId}`;
  const cached = await client.get(key);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (error) {
      console.error('Error parsing cached project data:', error);
      return null;
    }
  }
  return null;
};

export const deleteCachedProject = async (projectId: string) => {
  const key = `project:${projectId}`;
  await client.del(key);
};

// Function to invalidate all cache
export const invalidateAllCache = async () => {
  await client.del('system:all_data');
};

export type { CachedPromptData, CachedProjectData, CachedAllData };