const express = require('express');
const crypto = require('crypto');
const axios = require('axios');
const Redis = require('redis');

const app = express();
app.use(express.json());

// ------------------
// Конфигурация
// ------------------
const BOT_SECRET = process.env.BOT_SECRET || '***';
const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL || 'https://yarkozloff.ru';
const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3000;
const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

// ------------------
// Redis
// ------------------
let redis;
async function initializeRedis() {
  redis = Redis.createClient({ url: REDIS_URL });
  redis.on('error', (err) => console.log('Redis Error:', err));
  redis.on('connect', () => console.log('Redis connected'));
  redis.on('ready', () => console.log('Redis ready'));
  try {
    await redis.connect();
    console.log('Redis client successfully connected');
  } catch (err) {
    console.error('Failed to connect to Redis:', err);
  }
}

async function saveUserRoomToken(userId, roomToken) {
  const key = `room:${userId}`;
  await redis.set(key, roomToken);
}

async function getUserRoomToken(userId) {
  const key = `room:${userId}`;
  return await redis.get(key);
}

async function getUserContext(userId, roomToken) {
  const key = `context:${userId}:${roomToken}`;
  const ctx = await redis.get(key);
  return ctx ? JSON.parse(ctx) : [];
}

async function saveUserContext(userId, roomToken, messages) {
  const key = `context:${userId}:${roomToken}`;
  await redis.set(key, JSON.stringify(messages.slice(-10)));
}

async function resetUserContext(userId, roomToken) {
  const key = `context:${userId}:${roomToken}`;
  await redis.del(key);
  console.log(`✅ Context cleared for user ${userId}, room ${roomToken}`);
}
// ------------------
// Генерация Random + Signature
// ------------------
function generateBotHeaders(secret, messageText) {
  const random = crypto.randomBytes(32).toString('hex');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(random + messageText);
  const signature = hmac.digest('hex');
  return { random, signature };
}

// ------------------
// Добавление чата с ИИ новому юзеру
// ------------------
async function createPrivateChatWithBot(userId) {
  // название комнаты
  const roomName = `Чат с ИИ`;

  const body = {
    name: roomName,
    participants: [userId, BOT_ID], // добавляем пользователя + бота
    isPrivate: true
  };

  const response = await axios.post(
    `${NEXTCLOUD_URL}/ocs/v2.php/apps/spreed/api/v1/rooms`,
    body,
    {
      headers: {
        'OCS-APIRequest': 'true',
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }
  );

  if (response.data?.ocs?.meta?.status !== 'ok') {
    throw new Error('Failed to create room: ' + JSON.stringify(response.data));
  }

  // Возвращаем token комнаты для использования бота
  return response.data.ocs.data.id; 
}

// ------------------
// Отправка сообщения в чат
// ------------------
async function sendMessage(roomToken, messageText) {
  const { random, signature } = generateBotHeaders(BOT_SECRET, messageText);
  const body = { message: messageText };

  console.log('--- sendMessage debug ---');
  console.log('roomToken:', roomToken);
  console.log('URL:', `${NEXTCLOUD_URL}/ocs/v2.php/apps/spreed/api/v1/bot/${roomToken}/message`);
  console.log('Body:', body);
  console.log('RANDOM:', random);
  console.log('SIGNATURE:', signature);

  try {
    const response = await axios.post(
      `${NEXTCLOUD_URL}/ocs/v2.php/apps/spreed/api/v1/bot/${roomToken}/message`,
      body,
      {
        headers: {
          'OCS-APIRequest': 'true',
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Nextcloud-Talk-Bot-Random': random,
          'X-Nextcloud-Talk-Bot-Signature': signature,
        },
        timeout: 5000,
      }
    );
    console.log('✅ Message sent successfully:', messageText);
    return true;
  } catch (err) {
    console.error('❌ Error sending message to chat:', err.response?.data || err.message);
    console.log('Full request body:', JSON.stringify(body));
    console.log('RANDOM used:', random);
    console.log('SIGNATURE used:', signature);
    return false;
  }
}

// ------------------
// Yandex GPT
// ------------------
async function callYandexGPT(context, userMessage) {
  const messages = context.map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    text: msg.content,
  }));
  messages.push({ role: 'user', text: userMessage });

  const payload = {
    modelUri: `gpt://${process.env.YANDEX_CLOUD_FOLDER_ID}/yandexgpt/latest`,
    completionOptions: { stream: false, temperature: 0.7, maxTokens: 500 },
    messages,
  };

  try {
    const response = await axios.post(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      payload,
      {
        headers: {
          Authorization: `Api-Key ${process.env.YANDEX_CLOUD_SECRET}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data.result.alternatives[0].message.text;
  } catch (err) {
    console.error('❌ Error calling Yandex GPT:', err.response?.data || err.message);
    return 'Ошибка при обращении к GPT';
  }
}

// ------------------
// Обработка сообщений
// ------------------
async function handleMessage(text, roomToken, userId) {
  try {
    // -------------------
    // Проверка на команду сброса
    // -------------------
    if (text.trim().toLowerCase() === '/reset') {
      await resetUserContext(userId, roomToken);
      await sendMessage(roomToken, '✅ Контекст очищен. Начнём с чистого листа!');
      return; // не вызываем GPT
    }

    // -------------------
    // Работа с GPT
    // -------------------
    const context = await getUserContext(userId, roomToken);

    const gptResponse = await callYandexGPT(context, text);

    const newContext = [
      ...context,
      { role: 'user', content: text },
      { role: 'assistant', content: gptResponse }
    ];
    await saveUserContext(userId, roomToken, newContext);

    await sendMessage(roomToken, gptResponse);

  } catch (err) {
    console.error('Error in handleMessage:', err);
  }
}

// ------------------
// Вебхук
// ------------------
app.post('/webhook', async (req, res) => {
  console.log('=== WEBHOOK RECEIVED ===');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);

  const data = req.body;

  let message, roomToken, senderId;

  if (data.object?.content) {
    try {
      const parsed = JSON.parse(data.object.content);
      message = parsed.message;
    } catch {
      message = '';
    }
    roomToken = data.target?.id;
    senderId = data.actor?.id;
  } else {
    message = data.message;
    roomToken = data.room?.token;
    senderId = data.sender?.id;
  }

  if (!message || !roomToken || !senderId) {
    console.log('❌ Missing required fields in webhook');
    return res.status(400).send('Missing required fields');
  }

  await handleMessage(message, roomToken, senderId);
  res.status(200).send('OK');
});

// ------------------
// Новый пользователь
// ------------------
app.post('/webhook/new_user', async (req, res) => {
  console.log('=== NEW USER REGISTERED ===');
  console.log('Body:', req.body);

  const userId = req.body.user_id || req.body.uid; // зависит от структуры webhook
  if (!userId) {
    console.log('❌ Missing user_id');
    return res.status(400).send('Missing user_id');
  }

  try {
    const roomToken = await createPrivateChatWithBot(userId);
    console.log(`✅ Private chat created for ${userId} with token ${roomToken}`);
    res.status(200).send({ roomToken });
  } catch (err) {
    console.error('❌ Error creating private chat:', err);
    res.status(500).send('Error creating private chat');
  }
});

// ------------------
// Запуск сервера
// ------------------
(async () => {
  await initializeRedis();
  app.listen(WEBHOOK_PORT, () => {
    console.log(`🚀 Webhook server running on port ${WEBHOOK_PORT}`);
  });
})();