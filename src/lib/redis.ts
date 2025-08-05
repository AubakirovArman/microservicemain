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

// Utility functions for prompt caching
export const cachePrompt = async (projectId: string, promptId: string, instruction: string) => {
  const key = `prompt:${projectId}:${promptId}`;
  await client.set(key, instruction, { EX: 3600 }); // Cache for 1 hour
};

export const getCachedPrompt = async (projectId: string, promptId: string): Promise<string | null> => {
  const key = `prompt:${projectId}:${promptId}`;
  return await client.get(key);
};

export const deleteCachedPrompt = async (projectId: string, promptId: string) => {
  const key = `prompt:${projectId}:${promptId}`;
  await client.del(key);
};