const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  try {
    // Создаем админа
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Администратор',
        role: 'ADMIN'
      }
    });
    
    console.log('Админ создан:', admin);
    
    // Создаем тестового пользователя
    const userPassword = await bcrypt.hash('user123', 10);
    
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        password: userPassword,
        name: 'Тестовый пользователь',
        role: 'USER'
      }
    });
    
    console.log('Пользователь создан:', user);
    
    // Создаем тестовый проект для пользователя
    const project = await prisma.project.create({
      data: {
        name: 'Тестовый проект',
        geminiApiKey: 'your-gemini-api-key-here',
        userId: user.id
      }
    });
    
    console.log('Проект создан:', project);
    
    // Создаем тестовый промпт
    const prompt = await prisma.prompt.create({
      data: {
        name: 'Тестовый промпт',
        instruction: 'Ты полезный AI ассистент. Отвечай кратко и по делу.',
        projectId: project.id
      }
    });
    
    console.log('Промпт создан:', prompt);
    
  } catch (error) {
    console.error('Ошибка при заполнении базы данных:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();