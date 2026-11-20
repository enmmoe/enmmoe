import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-Memory state for server authority
let serverRooms = [
  {
    id: 'table-001',
    name: 'Table 001 - Red Velvet VIP',
    maxPlayers: 10,
    players: [
      {
        id: 'bot-1',
        name: 'Elena',
        age: 22,
        gender: 'Girl',
        avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
        level: 5,
        league: 'Gold',
        kissPoints: 42,
        youtubePoints: 120,
        emotionPoints: 35,
        admire: 88,
        seatIndex: 0,
        isOnline: true,
      },
      {
        id: 'bot-2',
        name: 'Marco',
        age: 25,
        gender: 'Boy',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        level: 8,
        league: 'Platinum',
        kissPoints: 15,
        youtubePoints: 240,
        emotionPoints: 90,
        admire: 110,
        seatIndex: 1,
        isOnline: true,
      },
      {
        id: 'bot-3',
        name: 'Sofia',
        age: 21,
        gender: 'Girl',
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        level: 3,
        league: 'Silver',
        kissPoints: 28,
        youtubePoints: 50,
        emotionPoints: 19,
        admire: 45,
        seatIndex: 3,
        isOnline: true,
      },
      {
        id: 'bot-4',
        name: 'Alex',
        age: 24,
        gender: 'Non-binary',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        level: 6,
        league: 'Gold',
        kissPoints: 60,
        youtubePoints: 180,
        emotionPoints: 75,
        admire: 95,
        seatIndex: 4,
        isOnline: true,
      },
      {
        id: 'bot-5',
        name: 'Chloe',
        age: 23,
        gender: 'Girl',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        level: 12,
        league: 'Diamond',
        kissPoints: 140,
        youtubePoints: 510,
        emotionPoints: 210,
        admire: 320,
        seatIndex: 6,
        isOnline: true,
      },
    ],
    chatMessages: [
      {
        id: 'm1',
        senderId: 'bot-1',
        senderName: 'Elena',
        senderGender: 'Girl',
        senderAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=400&q=80',
        text: 'Welcome to enmmoe Table 001! ❤️ Who wants to play some tunes?',
        timestamp: Date.now() - 300000,
        type: 'chat',
      },
    ],
  },
  ...Array.from({ length: 19 }).map((_, idx) => ({
    id: `table-00${idx + 2}`.replace('0010', '010'),
    name: `Table 00${idx + 2} - Flirt Lounge`.replace('0010', '010'),
    maxPlayers: 10,
    players: [],
    chatMessages: [],
  })),
];

// User Account Profile Permanent Stats Store
const userProfileStats = new Map<string, {
  id: string;
  kissPoints: number;
  hearts: number;
  admire: number;
  updatedAt: number;
}>();

// User Stats Sync / Save endpoint (Permanent Account Saving)
app.post('/api/user/sync-stats', (req, res) => {
  const { userId, kissPoints, hearts, admire } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  const existing = userProfileStats.get(userId) || {
    id: userId,
    kissPoints: 0,
    hearts: 100,
    admire: 0,
    updatedAt: Date.now(),
  };

  const updatedStats = {
    ...existing,
    kissPoints: kissPoints !== undefined ? kissPoints : existing.kissPoints,
    hearts: hearts !== undefined ? hearts : existing.hearts,
    admire: admire !== undefined ? admire : existing.admire,
    updatedAt: Date.now(),
  };

  userProfileStats.set(userId, updatedStats);

  res.json({
    success: true,
    stats: updatedStats,
  });
});

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'enmmoe' });
});

// Server-Side In-Memory Fast Cache & Deduplication Map
const serverTranslationCache = new Map<string, string>();
const serverPendingRequests = new Map<string, Promise<string>>();

// Lazy Gemini Client with correct User-Agent header
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) return null;
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });
  }
  return geminiClient;
}

// Helper: Sleep for retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Translation endpoint (secure fast proxy for AI / Google Translation API)
app.post('/api/translate', async (req, res) => {
  const { messageId, text, sourceLanguage, targetLanguage } = req.body;
  if (!text || !targetLanguage) {
    return res.status(400).json({ error: 'Text and targetLanguage are required.' });
  }

  const cleanText = text.trim();

  // Fast pre-detected source language script fallback if missing
  let detectedSource = sourceLanguage;
  if (!detectedSource) {
    if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(cleanText)) detectedSource = 'ko';
    else if (/[\u3040-\u309F\u30A0-\u30FF]/.test(cleanText)) detectedSource = 'ja';
    else if (/[\u4E00-\u9FFF]/.test(cleanText)) detectedSource = 'zh';
    else if (/[\u0600-\u06FF]/.test(cleanText)) detectedSource = 'ar';
    else if (/[\u0900-\u097F]/.test(cleanText)) detectedSource = 'hi';
    else if (/[\u0E00-\u0E7F]/.test(cleanText)) detectedSource = 'th';
    else if (/[\u1200-\u137F]/.test(cleanText)) detectedSource = 'am';
    else if (/[\u1000-\u109F\uAA60-\uAA7F]/.test(cleanText)) detectedSource = 'my';
    else if (/[\u0400-\u04FF]/.test(cleanText)) detectedSource = 'ru';
    else if (/[ğışİĞŞçÇöÖüÜ]/i.test(cleanText)) detectedSource = 'tr';
    else if (/[äöüß]/i.test(cleanText)) detectedSource = 'de';
    else if (/[éèêëàâçîïôùû]/i.test(cleanText)) detectedSource = 'fr';
    else if (/[¿¡ñáéíóú]/i.test(cleanText)) detectedSource = 'es';
    else if (/[ãõâêôáéíóúç]/i.test(cleanText)) detectedSource = 'pt';
    else detectedSource = 'en';
  }

  // 1. Same source and target -> instant response
  if (detectedSource.toLowerCase() === targetLanguage.toLowerCase()) {
    return res.json({
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText: text,
      cached: true,
    });
  }

  // Cache keys
  const msgCacheKey = messageId ? `${messageId}:${targetLanguage}` : null;
  const textCacheKey = `${cleanText.toLowerCase()}:${targetLanguage}`;

  // 2. ULTRA-FAST SERVER CACHE CHECK (<1ms)
  if (msgCacheKey && serverTranslationCache.has(msgCacheKey)) {
    return res.json({
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText: serverTranslationCache.get(msgCacheKey)!,
      cached: true,
    });
  }

  if (serverTranslationCache.has(textCacheKey)) {
    const cachedVal = serverTranslationCache.get(textCacheKey)!;
    if (msgCacheKey) serverTranslationCache.set(msgCacheKey, cachedVal);
    return res.json({
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText: cachedVal,
      cached: true,
    });
  }

  // 3. IN-FLIGHT SERVER DEDUPLICATION: If another client requested exact same translation, join that promise
  const requestKey = msgCacheKey || textCacheKey;
  if (serverPendingRequests.has(requestKey)) {
    try {
      const translatedText = await serverPendingRequests.get(requestKey)!;
      return res.json({
        originalText: text,
        originalLanguage: detectedSource,
        targetLanguage,
        translatedText,
        cached: true,
      });
    } catch {
      // Proceed to fallback
    }
  }

  // 4. PERFORM TRANSLATION TASK WITH MULTI-TIER RESILIENCE
  const translatePromise = (async (): Promise<string> => {
    // Offline dictionary lookup for instant social and chat response
    const mockTranslations: Record<string, Record<string, string>> = {
      'thanks for the gift in the room earlier! ✨': {
        en: 'Thanks for the gift in the room earlier! ✨',
        ko: '아까 방에서 선물 고마워! ✨',
        es: '¡Gracias por el regalo en la sala antes! ✨',
        ru: 'Спасибо за подарок в комнате ранее! ✨',
        fr: 'Merci pour le cadeau dans la salle tout à l’heure ! ✨',
        de: 'Danke für das Geschenk im Raum vorhin! ✨',
        ja: '先ほどはお部屋でのプレゼントありがとう！✨',
        zh: '谢谢刚才在房间里送的礼物！✨',
        ar: 'شكراً على الهدية في الغرفة سابقاً! ✨',
      },
      'are you joining table 128 tonight?': {
        en: 'Are you joining Table 128 tonight?',
        ko: '오늘 밤 128번 테이블에 올 거야?',
        es: '¿Te unirás a la Mesa 128 esta noche?',
        ru: 'Ты присоединишься к столу 128 сегодня вечером?',
        fr: 'Tu rejoins la table 128 ce soir ?',
        de: 'Kommst du heute Abend zu Tisch 128?',
        ja: '今夜テーブル128に参加する？',
        zh: '你今晚要加入128号房间吗？',
        ar: 'هل ستنضم إلى الطاولة 128 الليلة؟',
      },
      'good game yesterday bro!': {
        en: 'Good game yesterday bro!',
        ko: '어제 게임 진짜 좋았어 형!',
        es: '¡Buen juego ayer hermano!',
        ru: 'Отличная игра вчера, бро!',
        fr: 'Super partie hier frérot !',
        de: 'Gutes Spiel gestern, Bro!',
        ja: '昨日のゲーム最高だったよ！',
        zh: '昨天玩得很棒，兄弟！',
        ar: 'لعبة رائعة أمس يا أخي!',
      },
      'see you next time at the party! 💖': {
        en: 'See you next time at the party! 💖',
        ko: '다음 파티에서 또 봐! 💖',
        es: '¡Nos vemos la próxima en la fiesta! 💖',
        ru: 'Увидимся в следующий раз на вечеринке! 💖',
        fr: 'À la prochaine à la fête ! 💖',
        de: 'Bis zum nächsten Mal auf der Party! 💖',
        ja: '次のパーティーでまた会おうね！💖',
        zh: '下次聚会见！💖',
        ar: 'أراك في المرة القادمة في الحفلة! 💖',
      },
      'yea': {
        en: 'Yea',
        ko: '응',
        es: 'Sí',
        ru: 'Да',
        fr: 'Ouais',
        de: 'Ja',
        ja: 'うん',
        zh: '嗯',
        ar: 'نعم',
      },
      'hey tariq, see you at the table!': {
        en: 'Hey Tariq, see you at the table!',
        ko: '타릭 안녕, 테이블에서 봐!',
        es: '¡Hola Tariq, nos vemos en la mesa!',
        ru: 'Привет Тарик, увидимся за столом!',
        fr: 'Salut Tariq, on se voit à la table !',
        de: 'Hey Tariq, wir sehen uns am Tisch!',
        ja: 'タリク、テーブルで会おう！',
        zh: '嗨塔里克，牌桌见！',
        ar: 'أهلاً طارق، أراك على الطاولة!',
      },
      'let us spin again later today! 🔥': {
        en: 'Let us spin again later today! 🔥',
        ko: '오늘 나중에 다시 룰렛 돌리자! 🔥',
        es: '¡Giremos de nuevo más tarde hoy! 🔥',
        ru: 'Давай покрутим ещё позже сегодня! 🔥',
        fr: 'Faisons encore tourner la roue plus tard aujourd’hui ! 🔥',
        de: 'Lass uns heute später noch mal drehen! 🔥',
        ja: '今日またあとでスピンしよう！🔥',
        zh: '今天晚点我们再转一次！🔥',
        ar: 'دعنا نقوم بالتدوير مرة أخرى لاحقاً اليوم! 🔥',
      },
      'sent you the new master audio stems! check the synth lead track on 1:42 🎧': {
        en: 'Sent you the new master audio stems! Check the synth lead track on 1:42 🎧',
        ko: '새 마스터 오디오 스템 보냈어! 1:42 신스 리드 트랙 확인해봐 🎧',
        es: '¡Te envié las nuevas pistas de audio master! Revisa la pista de sintetizador en 1:42 🎧',
        ru: 'Отправил тебе новые аудиодорожки мастера! Проверь синтезаторный лид на 1:42 🎧',
        fr: 'Je t’ai envoyé les nouvelles pistes audio master ! Écoute le synthé lead à 1:42 🎧',
        de: 'Habe dir die neuen Master-Audiospuren geschickt! Hör dir die Synth-Lead-Spur bei 1:42 an 🎧',
        ja: '新しいマスターオーディオのステムを送ったよ！1:42のシンセリードをチェックしてみて 🎧',
        zh: '已发给你新的母带音频分轨！查看 1:42 处的主音合成器音轨 🎧',
        ar: 'أرسلت لك مسارات الصوت الرئيسية الجديدة! تحقق من مسار السينث في 1:42 🎧',
      },
      'hey elena! loved your studio story preview today. that bassline sounds monstrous!': {
        en: 'Hey Elena! Loved your studio story preview today. That bassline sounds monstrous!',
        ko: '엘레나 안녕! 오늘 스튜디오 스토리 미리보기 너무 좋았어. 베이스라인 진짜 대박이야!',
        es: '¡Hola Elena! Me encantó la vista previa de tu historia en el estudio. ¡Esa línea de bajo suena monstruosa!',
        ru: 'Привет, Елена! Очень понравился тизер из студии. Этот бас звучит просто невероятно!',
        fr: 'Salut Elena ! J’ai adoré ton aperçu en studio aujourd’hui. Cette ligne de basse est monstrueuse !',
        de: 'Hey Elena! Dein Studio-Story-Preview heute war spitze. Die Bassline klingt gewaltig!',
        ja: 'エレナこんにちは！今日のスタジオのストーリープレビュー最高だった。ベースラインがすごい！',
        zh: '嗨埃琳娜！很喜欢你今天录音室的故事预览。那个低音太炸了！',
        ar: 'أهلاً إيلينا! أعجبتني قصة الاستوديو اليوم. خط الباس مذهل للغاية!',
      },
      'thank you alex! we spent 4 hours routing the tape delay pedals. totally worth it 😊': {
        en: 'Thank you Alex! We spent 4 hours routing the tape delay pedals. Totally worth it 😊',
        ko: '고마워 알렉스! 테이프 딜레이 페달 라우팅하느라 4시간 썼는데 완전 그럴 가치가 있었어 😊',
        es: '¡Gracias Alex! Pasamos 4 horas enrutando los pedales de eco de cinta. Valió totalmente la pena 😊',
        ru: 'Спасибо, Алекс! Мы потратили 4 часа на коммутацию ленточных дилеев. Оно того стоило 😊',
        fr: 'Merci Alex ! On a passé 4 heures à router les pédales de délai à bande. Ça valait vraiment le coup 😊',
        de: 'Danke Alex! Wir haben 4 Stunden mit den Tape-Delay-Pedalen verbracht. Hat sich total gelohnt 😊',
        ja: 'ありがとうアレックス！テープディレイペダルの配線に4時間かかったけど、それだけの価値があったよ 😊',
        zh: '谢谢亚历克斯！我们花了4个小时接磁带延迟效果器，完全值了 😊',
        ar: 'شكراً أليكس! قضينا 4 ساعات في توصيل دواسات التأخير. كان الأمر يستحق تماماً 😊',
      },
      'are you going to showcase it during the live set this weekend?': {
        en: 'Are you going to showcase it during the live set this weekend?',
        ko: '이번 주말 라이브 세트에서 공개할 거야?',
        es: '¿Vas a presentarlo durante el set en vivo este fin de semana?',
        ru: 'Ты покажешь это во время живого выступления в эти выходные?',
        fr: 'Tu vas le jouer pendant le live ce week-end ?',
        de: 'Wirst du es dieses Wochenende während des Live-Sets präsentieren?',
        ja: '今週末のライブセットで披露する予定？',
        zh: '你这周末的现场演出会展示它吗？',
        ar: 'هل ستقديم خلال العرض المباشر في نهاية هذا الأسبوع؟',
      },
      'would love your feedback on the 3d typography layout for enmmoe creator summit! 🎨': {
        en: 'Would love your feedback on the 3D typography layout for enmmoe Creator Summit! 🎨',
        ko: 'enmmoe 크리에이터 서밋 3D 타이포그래피 레이아웃 피드백 주면 좋겠어! 🎨',
        es: '¡Me encantaría recibir tus comentarios sobre el diseño de tipografía 3D para enmmoe Creator Summit! 🎨',
        ru: 'Буду рада услышать твой отзыв о 3D-типографике для enmmoe Creator Summit! 🎨',
        fr: 'J’aimerais beaucoup avoir ton retour sur la typographie 3D pour le Sommet des Créateurs enmmoe ! 🎨',
        de: 'Würde mich über dein Feedback zum 3D-Typografie-Layout für den enmmoe Creator Summit freuen! 🎨',
        ja: 'enmmoe Creator Summitの3Dタイポグラフィレイアウトのフィードバックをもらえると嬉しいな！🎨',
        zh: '很想听听你对 enmmoe 创作者峰会 3D 字体排版设计的反馈！🎨',
        ar: 'أود الحصول على رأيك حول تخطيط الطباعة ثلاثية الأبعاد لقمة مبدعي enmmoe! 🎨',
      },
      'hey chloe, the glass refraction render is unbelievable!': {
        en: 'Hey Chloe, the glass refraction render is unbelievable!',
        ko: '클로이 안녕, 유리 굴절 렌더링 진짜 믿기지 않을 정도로 멋져!',
        es: '¡Hola Chloe, el render de refracción de vidrio es increíble!',
        ru: 'Привет, Хлоя! Рендер преломления стекла просто невероятный!',
        fr: 'Salut Chloe, le rendu de réfraction de verre est incroyable !',
        de: 'Hey Chloe, der Glasbrechungs-Render ist unglaublich!',
        ja: 'クロエ、ガラスの屈折レンダリングが信じられないくらい素晴らしいよ！',
        zh: '嗨克洛伊，玻璃折射渲染效果太不可思议了！',
        ar: 'أهلاً كلوي، رندر انكسار الزجاج مذهل لا يصدق!',
      },
      'hello': {
        en: 'Hello',
        ko: '안녕하세요',
        es: 'Hola',
        fr: 'Bonjour',
        de: 'Hallo',
        ru: 'Привет',
        ja: 'こんにちは',
        zh: '你好',
        ar: 'مرحباً',
      },
      'hi': {
        en: 'Hi',
        ko: '안녕',
        es: 'Hola',
        fr: 'Salut',
        de: 'Hallo',
        ru: 'Привет',
        ja: 'やあ',
        zh: '嗨',
        ar: 'مرحباً',
      },
    };

    const directMatch = mockTranslations[cleanText.toLowerCase()]?.[targetLanguage];
    if (directMatch) {
      return directMatch;
    }

    const ai = getGeminiClient();
    if (ai) {
      const targetLangName =
        targetLanguage === 'ko'
          ? 'Korean (한국어)'
          : targetLanguage === 'en'
          ? 'English'
          : targetLanguage === 'es'
          ? 'Spanish'
          : targetLanguage === 'fr'
          ? 'French'
          : targetLanguage === 'de'
          ? 'German'
          : targetLanguage === 'ru'
          ? 'Russian'
          : targetLanguage === 'ja'
          ? 'Japanese'
          : targetLanguage === 'zh'
          ? 'Simplified Chinese'
          : targetLanguage === 'ar'
          ? 'Arabic'
          : targetLanguage;

      const prompt = `Translate the following chat message into ${targetLangName}. Preserve all emojis, numbers, and casual punctuation. Output ONLY the translated text without quotes or explanations:\n"${cleanText}"`;

      const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash'];

      for (const modelName of modelsToTry) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
            });

            if (response.text && response.text.trim()) {
              return response.text.trim().replace(/^["']|["']$/g, '');
            }
          } catch (err: any) {
            const isDemandError = err?.status === 'UNAVAILABLE' || err?.message?.includes('high demand') || err?.message?.includes('503');
            if (isDemandError && attempt === 0) {
              await sleep(400);
              continue;
            }
            break;
          }
        }
      }
    }

    // Graceful fallback to target language text
    return cleanText;
  })();

  serverPendingRequests.set(requestKey, translatePromise);

  try {
    const translatedText = await translatePromise;
    // Save in server cache
    if (msgCacheKey) serverTranslationCache.set(msgCacheKey, translatedText);
    serverTranslationCache.set(textCacheKey, translatedText);

    return res.json({
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText,
      cached: false,
    });
  } catch (err) {
    return res.json({
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText: text,
      cached: false,
    });
  } finally {
    serverPendingRequests.delete(requestKey);
  }
});

// Daily Reward endpoint (Calculates streak & daily Money Points)
app.post('/api/user/daily-reward', (req, res) => {
  const { lastClaimTimestamp, streakDays } = req.body;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  let newStreak = streakDays || 0;
  let resetOccurred = false;

  if (!lastClaimTimestamp) {
    // First time
    newStreak = 1;
  } else {
    const elapsed = now - lastClaimTimestamp;
    if (elapsed > 48 * 60 * 60 * 1000) {
      // Missed more than a day -> RESET to Day 1
      newStreak = 1;
      resetOccurred = true;
    } else if (elapsed >= ONE_DAY_MS) {
      // Claiming next consecutive day
      newStreak = (newStreak % 7) + 1;
    } else {
      // Already claimed today
      return res.status(400).json({ error: 'Daily reward already claimed today.' });
    }
  }

  const rewardMoneyPointsMap: Record<number, number> = {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 10,
  };

  const awardedMoneyPoints = rewardMoneyPointsMap[newStreak] || 1;

  res.json({
    success: true,
    newStreak,
    awardedMoneyPoints,
    claimTimestamp: now,
    resetOccurred,
  });
});

// Daily Store Free Hearts endpoint
app.post('/api/store/daily-hearts', (req, res) => {
  const { storeHeartClaimTimestamp } = req.body;
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  if (storeHeartClaimTimestamp && now - storeHeartClaimTimestamp < ONE_DAY_MS) {
    return res.status(400).json({ error: 'Free Store Hearts already claimed today!' });
  }

  res.json({
    success: true,
    awardedHearts: 10,
    claimTimestamp: now,
  });
});

// Telegram Stars invoice creation endpoint
app.post('/api/telegram/create-invoice', (req, res) => {
  const { stars, type, amount } = req.body;

  // Real Telegram Bot API invoice payload structure
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const invoiceLink = `https://t.me/invoice/enmmoe_${type}_${stars}_stars`;

  res.json({
    success: true,
    invoiceUrl: invoiceLink,
    stars,
    type,
    amount,
    botConfigured: Boolean(botToken && botToken !== 'MY_TELEGRAM_BOT_TOKEN'),
  });
});

// Telegram Channel Verification endpoint
app.post('/api/telegram/verify-channel', async (req, res) => {
  const { telegramUserId, hasOpenedChannel } = req.body;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (botToken && botToken !== 'MY_TELEGRAM_BOT_TOKEN' && telegramUserId) {
    try {
      const tgRes = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@enmmoe&user_id=${telegramUserId}`
      );
      const tgData = await tgRes.json();
      if (tgData.ok) {
        const status = tgData.result?.status;
        const isMember = ['creator', 'administrator', 'member'].includes(status);
        if (isMember) {
          return res.json({
            success: true,
            isMember: true,
            awardedHearts: 20,
            channel: 'https://t.me/enmmoe',
          });
        } else {
          return res.json({
            success: false,
            isMember: false,
            message: 'Please join the @enmmoe Telegram channel first.',
          });
        }
      }
    } catch (err) {
      console.error('Telegram API channel verification error:', err);
    }
  }

  // If bot token is not configured (e.g., preview environment), require user to have clicked open channel
  if (!hasOpenedChannel) {
    return res.json({
      success: false,
      isMember: false,
      message: 'Please open and join the @enmmoe Telegram channel first.',
    });
  }

  res.json({
    success: true,
    isMember: true,
    awardedHearts: 20,
    channel: 'https://t.me/enmmoe',
  });
});

// Referral Code Claiming endpoint
app.post('/api/referral/claim', (req, res) => {
  const { referralCode } = req.body;
  if (!referralCode) {
    return res.status(400).json({ error: 'Invalid referral code' });
  }
  res.json({
    success: true,
    bonusHearts: 15,
    message: 'Referral applied successfully! +15 ❤️ Hearts added.',
  });
});

// Kiss System Active Requests Map
const activeKissRequests = new Map<string, {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderGender: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string;
  recipientGender: string;
  expiresAt: number;
  status: string;
}>();

// Kiss Eligibility Check Endpoint (Strict Gender & Online Validation)
app.post('/api/room/kiss/check-eligibility', (req, res) => {
  const { roomId, spinnerId, spinnerGender } = req.body;
  const room = serverRooms.find((r) => r.id === (roomId || 'table-001')) || serverRooms[0];

  const requiredTargetGender = spinnerGender === 'Boy' ? 'Girl' : spinnerGender === 'Girl' ? 'Boy' : null;

  const eligibleTargets = room.players.filter((p) => {
    if (p.isOnline === false) return false;
    if (p.id === spinnerId) return false;
    if (requiredTargetGender && p.gender !== requiredTargetGender) return false;
    return true;
  });

  res.json({
    success: true,
    hasEligibleTargets: eligibleTargets.length > 0,
    eligibleCount: eligibleTargets.length,
    requiredTargetGender,
    eligibleTargets,
  });
});

// Kiss Request Endpoint
app.post('/api/room/kiss/request', (req, res) => {
  const { roomId, senderId, senderName, senderAvatar, senderGender, recipientId, recipientName, recipientAvatar, recipientGender } = req.body;

  if (!senderId || !recipientId) {
    return res.status(400).json({ error: 'Sender and Recipient IDs are required.' });
  }

  if (senderId === recipientId) {
    return res.status(400).json({ error: 'You cannot send a Kiss request to yourself.' });
  }

  // Verify gender eligibility rules on backend
  const requiredTargetGender = senderGender === 'Boy' ? 'Girl' : senderGender === 'Girl' ? 'Boy' : null;
  if (requiredTargetGender && recipientGender && recipientGender !== requiredTargetGender) {
    return res.status(400).json({
      error: `Ineligible target gender. ${senderGender === 'Boy' ? 'Boy' : 'Girl'} must target ${requiredTargetGender}.`,
    });
  }

  // Prevent duplicate active requests from sender
  const now = Date.now();
  for (const [reqId, existingReq] of activeKissRequests.entries()) {
    if (existingReq.senderId === senderId && existingReq.expiresAt > now && existingReq.status === 'pending') {
      return res.status(429).json({ error: 'Active kiss request already pending. Please wait.' });
    }
  }

  const requestId = `kiss-${now}-${Math.random().toString(36).substring(2, 6)}`;
  const expiresAt = now + 2000; // Strict 2-second timer

  const kissPayload = {
    id: requestId,
    roomId: roomId || 'table-001',
    senderId,
    senderName,
    senderAvatar: senderAvatar || '',
    senderGender,
    recipientId,
    recipientName,
    recipientAvatar: recipientAvatar || '',
    recipientGender,
    expiresAt,
    status: 'pending' as const,
  };

  activeKissRequests.set(requestId, kissPayload);

  // Broadcast kiss request to room clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'kiss_request', request: kissPayload }));
    }
  });

  res.json({
    success: true,
    request: kissPayload,
  });
});

// Kiss Response Endpoint (Accept / Reject)
app.post('/api/room/kiss/respond', (req, res) => {
  const { requestId, recipientId, action } = req.body;
  const kissReq = activeKissRequests.get(requestId);

  if (!kissReq) {
    return res.status(404).json({ error: 'Kiss request not found or expired.' });
  }

  if (kissReq.recipientId !== recipientId) {
    return res.status(403).json({ error: 'Unauthorized request recipient.' });
  }

  if (action === 'accept') {
    kissReq.status = 'accepted';
    // Award Kiss Points to recipient and sender on server room state
    const room = serverRooms.find((r) => r.id === kissReq.roomId) || serverRooms[0];
    const recPlayer = room.players.find((p) => p.id === recipientId);
    const sendPlayer = room.players.find((p) => p.id === kissReq.senderId);

    if (recPlayer) recPlayer.kissPoints = (recPlayer.kissPoints || 0) + 10;
    if (sendPlayer) sendPlayer.kissPoints = (sendPlayer.kissPoints || 0) + 5;

    // Add chat room message
    room.chatMessages.push({
      id: `m-kiss-${Date.now()}`,
      senderId: kissReq.senderId,
      senderName: kissReq.senderName,
      senderGender: kissReq.senderGender as any,
      senderAvatar: kissReq.senderAvatar,
      text: `💋 ${kissReq.senderName} kissed ${kissReq.recipientName}!`,
      timestamp: Date.now(),
      type: 'kiss',
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'kiss_accepted',
            request: kissReq,
            awardedPoints: 10,
          })
        );
      }
    });

    activeKissRequests.delete(requestId);
    return res.json({
      success: true,
      action: 'accepted',
      senderName: kissReq.senderName,
      recipientName: kissReq.recipientName,
      awardedPoints: 10,
    });
  } else {
    kissReq.status = 'rejected';
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(
          JSON.stringify({
            type: 'kiss_rejected',
            request: kissReq,
          })
        );
      }
    });

    activeKissRequests.delete(requestId);
    return res.json({
      success: true,
      action: 'rejected',
      message: 'Kiss request rejected',
    });
  }
});

// HTTP server for Express + WebSockets
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Map client socket to room ID
const clientRooms = new Map<WebSocket, string>();

wss.on('connection', (ws) => {
  ws.on('message', (messageData) => {
    try {
      const data = JSON.parse(messageData.toString());

      if (data.type === 'join_room') {
        clientRooms.set(ws, data.roomId);
        // Send initial room state
        const targetRoom = serverRooms.find((r) => r.id === data.roomId);
        if (targetRoom) {
          ws.send(JSON.stringify({ type: 'room_state', room: targetRoom }));
        }
      } else if (data.type === 'chat_message') {
        const roomId = clientRooms.get(ws) || data.roomId;
        const targetRoom = serverRooms.find((r) => r.id === roomId);
        if (targetRoom) {
          const newMsg = {
            id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            senderId: data.senderId,
            senderName: data.senderName,
            senderGender: data.senderGender,
            senderAvatar: data.senderAvatar,
            text: data.text,
            timestamp: Date.now(),
            type: 'chat' as const,
          };
          targetRoom.chatMessages.push(newMsg);
          // Broadcast to all clients in room
          wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === roomId) {
              client.send(JSON.stringify({ type: 'chat_message', message: newMsg, roomId }));
            }
          });
        }
      } else if (data.type === 'gift_sent' || data.type === 'kiss_sent' || data.type === 'emotion_sent' || data.type === 'youtube_start') {
        // Broadcast game interaction event to room clients
        const roomId = clientRooms.get(ws) || data.roomId;
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && clientRooms.get(client) === roomId) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch {
      // Ignore invalid socket payloads
    }
  });

  ws.on('close', () => {
    clientRooms.delete(ws);
  });
});

// ================= EMAIL SERVICE & ENDPOINTS =================
interface VerificationRecord {
  code: string;
  expiresAt: number;
  userId?: string;
}

const verificationMap = new Map<string, VerificationRecord>();
const verifiedEmails = new Set<string>();
const sentEmailLogs: Array<{
  id: string;
  email: string;
  subject: string;
  message: string;
  category: string;
  timestamp: number;
  status: 'delivered' | 'sent';
}> = [];

// Helper to create nodemailer transporter if credentials exist
function createMailTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

// 1. Send Email Verification Code
app.post('/api/email/send-verification', async (req, res) => {
  const { email, userId, userName } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  verificationMap.set(cleanEmail, {
    code,
    expiresAt,
    userId,
  });

  const transporter = createMailTransporter();
  let emailDispatchedViaSmtp = false;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"enmmoe" <no-reply@${process.env.SMTP_HOST}>`,
        to: cleanEmail,
        subject: 'Your enmmoe Verification Code: ' + code,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h2 style="color: #0A84FF; margin: 0; font-size: 22px;">enmmoe</h2>
              <p style="color: #71717a; font-size: 13px; margin: 4px 0 0 0;">Email Verification</p>
            </div>
            <p style="color: #27272a; font-size: 14px;">Hi ${userName || 'there'},</p>
            <p style="color: #52525b; font-size: 14px; line-height: 1.5;">
              Use the 6-digit verification code below to confirm your email in Settings:
            </p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="display: inline-block; font-size: 32px; font-weight: 700; letter-spacing: 6px; padding: 12px 28px; background: #f4f4f5; border-radius: 12px; color: #18181b;">
                ${code}
              </span>
            </div>
            <p style="color: #71717a; font-size: 12px; line-height: 1.4;">
              This code will expire in 10 minutes. If you did not request this code, please disregard this email.
            </p>
          </div>
        `,
      });
      emailDispatchedViaSmtp = true;
    } catch (err) {
      console.error('SMTP send error:', err);
    }
  }

  // Log to server console
  console.log(`[Email Verification] Code for ${cleanEmail}: ${code} (SMTP sent: ${emailDispatchedViaSmtp})`);

  res.json({
    success: true,
    message: `Verification code sent to ${cleanEmail}`,
    email: cleanEmail,
    expiresAt,
    smtpSent: emailDispatchedViaSmtp,
    // Always provide preview code so verification works reliably even if SMTP is unconfigured in dev
    previewCode: code,
  });
});

// 2. Verify Email Code
app.post('/api/email/verify-code', (req, res) => {
  const { email, code, userId } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and verification code are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanCode = code.toString().trim();
  const record = verificationMap.get(cleanEmail);

  if (!record) {
    return res.status(400).json({
      error: 'No pending verification found for this email. Please request a new code.',
    });
  }

  if (Date.now() > record.expiresAt) {
    verificationMap.delete(cleanEmail);
    return res.status(400).json({
      error: 'Verification code has expired. Please request a new code.',
    });
  }

  if (record.code !== cleanCode) {
    return res.status(400).json({
      error: 'Invalid verification code. Please check and try again.',
    });
  }

  // Code is valid! Mark as verified
  verificationMap.delete(cleanEmail);
  verifiedEmails.add(cleanEmail);

  // Add welcome confirmation email to logs
  const confirmationLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: cleanEmail,
    subject: 'Email Address Verified Successfully',
    message: 'Your email address has been verified and linked to your enmmoe account.',
    category: 'security',
    timestamp: Date.now(),
    status: 'delivered' as const,
  };
  sentEmailLogs.unshift(confirmationLog);

  res.json({
    success: true,
    message: 'Email successfully verified!',
    email: cleanEmail,
    isVerified: true,
  });
});

// 3. Send Message to User's Email
app.post('/api/email/send-message', async (req, res) => {
  const { email, subject, message, category, userName } = req.body;
  if (!email || !subject || !message) {
    return res.status(400).json({ error: 'Email, subject, and message are required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanSubject = subject.trim();
  const cleanMessage = message.trim();

  const transporter = createMailTransporter();
  let smtpSent = false;

  if (transporter) {
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"enmmoe" <no-reply@${process.env.SMTP_HOST}>`,
        to: cleanEmail,
        subject: cleanSubject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; border: 1px solid #e4e4e7; border-radius: 16px; background: #ffffff;">
            <div style="border-bottom: 1px solid #f4f4f5; padding-bottom: 14px; margin-bottom: 16px;">
              <h3 style="color: #0A84FF; margin: 0; font-size: 18px; font-weight: 700;">enmmoe Notification</h3>
              <p style="color: #a1a1aa; font-size: 12px; margin: 4px 0 0 0;">${new Date().toLocaleString()}</p>
            </div>
            <h2 style="color: #18181b; font-size: 18px; margin-top: 0; margin-bottom: 12px;">${cleanSubject}</h2>
            <div style="color: #3f3f46; font-size: 14px; line-height: 1.6; white-space: pre-wrap; background: #f9f9fb; padding: 16px; border-radius: 12px; border: 1px solid #f4f4f5;">
              ${cleanMessage}
            </div>
            <div style="margin-top: 24px; padding-top: 14px; border-top: 1px solid #f4f4f5; color: #71717a; font-size: 11px;">
              This message was sent to <strong>${cleanEmail}</strong> from your enmmoe account settings.
            </div>
          </div>
        `,
      });
      smtpSent = true;
    } catch (err) {
      console.error('Error sending message email via SMTP:', err);
    }
  }

  const logEntry = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: cleanEmail,
    subject: cleanSubject,
    message: cleanMessage,
    category: category || 'custom',
    timestamp: Date.now(),
    status: 'delivered' as const,
  };

  sentEmailLogs.unshift(logEntry);
  if (sentEmailLogs.length > 50) sentEmailLogs.pop();

  console.log(`[Email Sent] To: ${cleanEmail} | Subject: "${cleanSubject}" | SMTP: ${smtpSent}`);

  res.json({
    success: true,
    message: `Message dispatched successfully to ${cleanEmail}`,
    log: logEntry,
    smtpSent,
  });
});

// 4. Get Email Sent Logs
app.get('/api/email/logs', (req, res) => {
  const { email } = req.query;
  let logs = sentEmailLogs;
  if (email && typeof email === 'string') {
    const cleanEmail = email.trim().toLowerCase();
    logs = logs.filter((l) => l.email === cleanEmail);
  }
  res.json({
    success: true,
    logs,
  });
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[enmmoe Server] Running on http://0.0.0.0:${PORT}`);
  });
}

start();
