import { SUPPORTED_LANGUAGES, SupportedLanguage, LanguageCode } from './i18n';

export { SUPPORTED_LANGUAGES };
export type { SupportedLanguage, LanguageCode };

export interface TranslationRequest {
  text: string;
  sourceLanguage?: string;
  targetLanguage: string;
}

export interface TranslationResponse {
  originalText: string;
  originalLanguage: string;
  targetLanguage: string;
  translatedText: string;
  cached?: boolean;
}

// In-Memory Fast Client-Side Translation Cache
const clientTranslationCache = new Map<string, string>();

// In-Flight Request Deduplication: prevents duplicate parallel API calls
const pendingClientRequests = new Map<string, Promise<TranslationResponse>>();

/**
 * Fast synchronous cache check
 */
export function getCachedTranslation(messageId: string, targetLanguage: string): string | null {
  const key = `${messageId}:${targetLanguage}`;
  return clientTranslationCache.get(key) || null;
}

/**
 * Detect script/language of message text locally for instant feedback
 */
export function detectLanguageLocally(text: string): LanguageCode {
  if (!text || !text.trim()) return 'en';

  const clean = text.trim();

  // Korean Hangul
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(clean)) return 'ko';
  // Japanese Hiragana / Katakana
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(clean)) return 'ja';
  // Chinese Hanzi
  if (/[\u4E00-\u9FFF]/.test(clean)) return 'zh';
  // Arabic script
  if (/[\u0600-\u06FF]/.test(clean)) return 'ar';
  // Hindi Devanagari script
  if (/[\u0900-\u097F]/.test(clean)) return 'hi';
  // Thai script
  if (/[\u0E00-\u0E7F]/.test(clean)) return 'th';
  // Amharic (Ethiopic script)
  if (/[\u1200-\u137F]/.test(clean)) return 'am';
  // Myanmar (Burmese script)
  if (/[\u1000-\u109F\uAA60-\uAA7F]/.test(clean)) return 'my';
  // Cyrillic (Russian)
  if (/[\u0400-\u04FF]/.test(clean)) return 'ru';
  // Vietnamese specific characters
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(clean)) return 'vi';
  // Turkish specific characters
  if (/[ğışİĞŞçÇöÖüÜ]/i.test(clean) && !/[éèêëàâäôû]/i.test(clean)) return 'tr';
  // Polish specific characters
  if (/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(clean)) return 'pl';
  // German umlauts/eszett
  if (/[äöüß]/i.test(clean) && !/[ñç¿¡]/i.test(clean)) return 'de';
  // French accents
  if (/[éèêëàâçîïôùûœæ]/i.test(clean)) return 'fr';
  // Spanish inverted punctuation or ñ
  if (/[¿¡ñáéíóú]/i.test(clean)) return 'es';
  // Portuguese tildes and accents
  if (/[ãõâêôáéíóúç]/i.test(clean)) return 'pt';
  // Dutch specific diphthongs or patterns
  if (/\b(het|de|een|en|van|ik|je|we|zijn)\b/i.test(clean)) return 'nl';
  // Indonesian common words
  if (/\b(saya|kamu|kita|yang|di|dan|bisa|ini|itu)\b/i.test(clean)) return 'id';
  // Filipino common words
  if (/\b(ang|mga|ng|sa|ako|ikaw|kami|tayo|kumusta|salamat)\b/i.test(clean)) return 'fil';

  return 'en';
}

/**
 * High-Speed Phrase dictionary for instant (0ms) translations across all supported languages
 */
const COMMON_PHRASES: Record<string, Partial<Record<LanguageCode, string>>> = {
  'hey everyone! welcome to the table 😊': {
    en: 'Hey everyone! Welcome to the table 😊',
    ko: '여러분 안녕하세요! 테이블에 오신 것을 환영해요 😊',
    fr: 'Salut tout le monde ! Bienvenue à la table 😊',
    de: 'Hallo zusammen! Willkommen am Tisch 😊',
    es: '¡Hola a todos! Bienvenidos a la mesa 😊',
    pt: 'Olá a todos! Bem-vindos à mesa 😊',
    ar: 'أهلاً بالجميع! مرحباً بكم في الطاولة 😊',
    hi: 'सभी को नमस्ते! टेबल पर स्वागत है 😊',
    ru: 'Всем привет! Добро пожаловать за стол 😊',
    tr: 'Herkese merhaba! Masaya hoş geldiniz 😊',
    zh: '大家好！欢迎来到牌桌 😊',
    ja: 'みなさん、こんにちは！テーブルへようこそ 😊',
    it: 'Ciao a tutti! Benvenuti al tavolo 😊',
    id: 'Hai semuanya! Selamat datang di meja 😊',
    vi: 'Chào mọi người! Chào mừng đến với bàn chơi 😊',
    th: 'สวัสดีทุกคน! ยินดีต้อนรับสู่โต๊ะนะ 😊',
    fil: 'Kumusta sa lahat! Maligayang pagdating sa mesa 😊',
    pl: 'Cześć wszystkim! Witamy przy stole 😊',
    nl: 'Hallo allemaal! Welkom aan tafel 😊',
  },
  'hey everyone! welcome to the table': {
    en: 'Hey everyone! Welcome to the table',
    ko: '여러분 안녕하세요! 테이블에 오신 것을 환영해요',
    fr: 'Salut tout le monde ! Bienvenue à la table',
    de: 'Hallo zusammen! Willkommen am Tisch',
    es: '¡Hola a todos! Bienvenidos a la mesa',
    pt: 'Olá a todos! Bem-vindos à mesa',
    ar: 'أهلاً بالجميع! مرحباً بكم في الطاولة',
    hi: 'सभी को नमस्ते! टेबल पर स्वागत है',
    ru: 'Всем привет! Добро пожаловать за стол',
    tr: 'Herkese merhaba! Masaya hoş geldiniz',
    zh: '大家好！欢迎来到牌桌',
    ja: 'みなさん、こんにちは！テーブルへようこそ',
    it: 'Ciao a tutti! Benvenuti al tavolo',
    id: 'Hai semuanya! Selamat datang di meja',
    vi: 'Chào mọi người! Chào mừng đến với bàn chơi',
    th: 'สวัสดีทุกคน! ยินดีต้อนรับสู่โต๊ะนะ',
    fil: 'Kumusta sa lahat! Maligayang pagdating sa mesa',
    pl: 'Cześć wszystkim! Witamy przy stole',
    nl: 'Hallo allemaal! Welkom aan tafel',
  },
  'okay · 5 aug': {
    en: 'Okay · 5 Aug',
    ko: '알겠어요 · 8월 5일',
    fr: "D'accord · 5 août",
    de: 'Okay · 5. Aug.',
    es: 'De acuerdo · 5 de ago',
    pt: 'Tudo bem · 5 de ago',
    ar: 'حسناً · 5 أغسطس',
    hi: 'ठीक है · 5 अगस्त',
    ru: 'Хорошо · 5 авг',
    tr: 'Tamam · 5 Ağu',
    zh: '好的 · 8月5日',
    ja: '了解 · 8月5日',
    it: 'Va bene · 5 ago',
    id: 'Oke · 5 Agt',
    vi: 'Được rồi · 5 thg 8',
    th: 'ตกลง · 5 ส.ค.',
    fil: 'Sige · Ago 5',
    pl: 'Okej · 5 sie',
    nl: 'Oké · 5 aug',
  },
  'welcome to enmmoe table 001! ❤️ who wants to play some tunes?': {
    en: 'Welcome to enmmoe Table 001! ❤️ Who wants to play some tunes?',
    ko: 'enmmoe 테이블 001에 오신 것을 환영합니다! ❤️ 음악 틀고 싶으신 분 계신가요?',
    fr: 'Bienvenue sur la table 001 enmmoe ! ❤️ Qui veut mettre de la musique ?',
    de: 'Willkommen an enmmoe Tisch 001! ❤️ Wer möchte Musik anmachen?',
    es: '¡Bienvenidos a la Mesa 001 de enmmoe! ❤️ ¿Quién quiere poner música?',
    pt: 'Bem-vindos à Mesa 001 do enmmoe! ❤️ Quem quer tocar uma música?',
    ar: 'مرحباً بكم في طاولة enmmoe 001! ❤️ من يريد تشغيل بعض الأغاني؟',
    hi: 'enmmoe टेबल 001 में आपका स्वागत है! ❤️ कौन गाने बजाना चाहता है?',
    ru: 'Добро пожаловать за стол 001 enmmoe! ❤️ Кто хочет включить музыку?',
    tr: "enmmoe Masa 001'e hoş geldiniz! ❤️ Müzik açmak isteyen var mı?",
    zh: '欢迎来到 enmmoe 001 号房间！❤️ 谁想放首歌听听？',
    ja: 'enmmoe テーブル001へようこそ！❤️ 音楽をかけたい人はいますか？',
    it: 'Benvenuti al Tavolo 001 di enmmoe! ❤️ Chi vuole mettere un po\' di musica?',
    id: 'Selamat datang di enmmoe Meja 001! ❤️ Siapa yang mau memutar musik?',
    vi: 'Chào mừng đến với Bàn 001 enmmoe! ❤️ Ai muốn bật nhạc nào?',
    th: 'ยินดีต้อนรับสู่ enmmoe โต๊ะ 001! ❤️ ใครอยากเปิดเพลงบ้าง?',
    fil: 'Maligayang pagdating sa enmmoe Table 001! ❤️ Sinong gustong magpatugtog?',
    pl: 'Witamy przy stole 001 enmmoe! ❤️ Kto chce puścić trochę muzyki?',
    nl: 'Welkom bij enmmoe Tafel 001! ❤️ Wie wil er wat muziek draaien?',
  },
  'hello': {
    en: 'Hello',
    ko: '안녕하세요',
    fr: 'Bonjour',
    de: 'Hallo',
    es: 'Hola',
    pt: 'Olá',
    ar: 'مرحبا',
    hi: 'नमस्ते',
    ru: 'Привет',
    tr: 'Merhaba',
    zh: '你好',
    ja: 'こんにちは',
    it: 'Ciao',
    id: 'Halo',
    vi: 'Xin chào',
    th: 'สวัสดี',
    fil: 'Kamusta',
    pl: 'Cześć',
    nl: 'Hallo',
  },
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
    ar: 'هل ستقدمه خلال العرض المباشر في نهاية هذا الأسبوع؟',
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
  'hi': {
    en: 'Hi',
    ko: '안녕',
    fr: 'Salut',
    de: 'Hi',
    es: 'Hola',
    pt: 'Oi',
    ar: 'أهلاً',
    hi: 'नमस्ते',
    ru: 'Привет',
    tr: 'Selam',
    zh: '嗨',
    ja: 'やあ',
    it: 'Ciao',
    id: 'Hai',
    vi: 'Chào',
    th: 'หวัดดี',
    fil: 'Hi',
    pl: 'Hej',
    nl: 'Hoi',
  },
  'hey': {
    en: 'Hey',
    ko: '안녕~',
    fr: 'Salut',
    de: 'Hey',
    es: 'Oye',
    pt: 'Ei',
    ar: 'مرحباً',
    hi: 'हेय',
    ru: 'Хей',
    tr: 'Hey',
    zh: '嘿',
    ja: 'ヘイ',
    it: 'Ehi',
    id: 'Hei',
    vi: 'Nè',
    th: 'เฮ้',
    fil: 'Uy',
    pl: 'Hej',
    nl: 'Hey',
  },
  'hello everyone': {
    en: 'Hello everyone',
    ko: '모두들 안녕하세요!',
    fr: 'Bonjour à tous !',
    de: 'Hallo alle zusammen!',
    es: '¡Hola a todos!',
    pt: 'Olá a todos!',
    ar: 'أهلاً بالجميع!',
    hi: 'सभी को नमस्ते!',
    ru: 'Всем привет!',
    tr: 'Herkese merhaba!',
    zh: '大家好呀！',
    ja: '皆さん、こんにちは！',
    it: 'Ciao a tutti!',
    id: 'Halo semuanya!',
    vi: 'Chào mọi người!',
    th: 'สวัสดีทุกคน!',
    fil: 'Kamusta sa lahat!',
    pl: 'Cześć wszystkim!',
    nl: 'Hallo allemaal!',
  },
  'how are you?': {
    en: 'How are you?',
    ko: '어떻게 지내세요?',
    fr: 'Comment vas-tu ?',
    de: 'Wie geht es dir?',
    es: '¿Cómo estás?',
    pt: 'Como você está?',
    ar: 'كيف حالك؟',
    hi: 'आप कैसे हैं?',
    ru: 'Как дела?',
    tr: 'Nasılsın?',
    zh: '你最近怎么样？',
    ja: 'お元気ですか？',
    it: 'Come stai?',
    id: 'Apa kabar?',
    vi: 'Bạn thế nào rồi?',
    th: 'สบายดีไหม?',
    fil: 'Kumusta ka?',
    pl: 'Jak się masz?',
    nl: 'Hoe gaat het?',
  },
  'spin the bottle': {
    en: 'Spin the bottle',
    ko: '병을 돌려보세요',
    fr: 'Tournez la bouteille',
    de: 'Dreh die Flasche',
    es: 'Gira la botella',
    pt: 'Gire a garrafa',
    ar: 'قم بتدوير الزجاجة',
    hi: 'बोतल घुमाएं',
    ru: 'Крутите бутылочку',
    tr: 'Şişeyi çevir',
    zh: '转动酒瓶',
    ja: 'ボトルを回してみて',
    it: 'Gira la bottiglia',
    id: 'Putar botolnya',
    vi: 'Quay chai nào',
    th: 'หมุนขวดเลย',
    fil: 'Iikot ang bote',
    pl: 'Zakręć butelką',
    nl: 'Draai de fles',
  },
  'ready to spin the bottle! let’s have fun 🍾': {
    en: 'Ready to spin the bottle! Let’s have fun 🍾',
    ko: '병 돌릴 준비 완료! 재미있게 놀아봐요 🍾',
    fr: 'Prêt à faire tourner la bouteille ! Amusons-nous 🍾',
    de: 'Bereit für Flaschendrehen! Lasst uns Spaß haben 🍾',
    es: '¡Listo para girar la botella! A divertirnos 🍾',
    pt: 'Pronto para girar a garrafa! Vamos nos divertir 🍾',
    ar: 'مستعد لتدوير الزجاجة! دعونا نستمتع 🍾',
    hi: 'बोतल घुमाने के लिए तैयार! चलिए मस्ती करते हैं 🍾',
    ru: 'Готов крутить бутылочку! Повеселимся 🍾',
    tr: 'Şişeyi çevirmeye hazır! Hadi eğlenelim 🍾',
    zh: '准备好转酒瓶啦！玩得开心点 🍾',
    ja: 'ボトルを回す準備完了！楽しみましょう 🍾',
    it: 'Pronto a girare la bottiglia! Divertiamoci 🍾',
    id: 'Siap putar botol! Mari bersenang-senang 🍾',
    vi: 'Sẵn sàng quay chai rồi! Cùng quẩy thôi 🍾',
    th: 'พร้อมหมุนขวดแล้ว! มาสนุกกัน 🍾',
    fil: 'Handa nang iikot ang bote! Mag-enjoy tayo 🍾',
    pl: 'Gotowy na butelkę! Bawmy się 🍾',
    nl: 'Klaar om de fles te draaien! Laten we plezier maken 🍾',
  },
  'spin the bottle ready! let’s go 🚀': {
    en: 'Spin the bottle ready! Let’s go 🚀',
    ko: '병 돌리기 준비 완료! 가보자고 🚀',
    fr: 'Prêt pour la bouteille ! C\'est parti 🚀',
    de: 'Flaschendrehen startklar! Los geht\'s 🚀',
    es: '¡Listo para la botella! ¡Vamos! 🚀',
    pt: 'Pronto para a garrafa! Vamos lá 🚀',
    ar: 'جاهز للتدوير! هيا بنا 🚀',
    hi: 'बोतल घुमाने के लिए तैयार! चलिए शुरू करें 🚀',
    ru: 'Бутылочка готова! Погнали 🚀',
    tr: 'Şişe hazır! Hadi başlayalım 🚀',
    zh: '酒瓶准备就绪！冲冲冲 🚀',
    ja: 'ボトル準備OK！レッツゴー 🚀',
    it: 'Bottiglia pronta! Andiamo 🚀',
    id: 'Botol siap! Gaspol 🚀',
    vi: 'Chai đã sẵn sàng! Đi thôi 🚀',
    th: 'ขวดพร้อมแล้ว! ลุยเลย 🚀',
    fil: 'Handa na ang bote! Tara na 🚀',
    pl: 'Butelka gotowa! Lecimy 🚀',
    nl: 'Fles is klaar! Gaan met die banaan 🚀',
  },
  'hey tariq, see you at the table!': {
    en: 'Hey Tariq, see you at the table!',
    ko: '타릭 안녕, 테이블에서 봐요!',
    fr: 'Salut Tariq, on se voit à la table !',
    de: 'Hey Tariq, wir sehen uns am Tisch!',
    es: '¡Hola Tariq, nos vemos en la mesa!',
    pt: 'Oi Tariq, até logo na mesa!',
    ar: 'مرحباً طارق، أراك عند الطاولة!',
    hi: 'हेय तारिक, टेबल पर मिलते हैं!',
    ru: 'Привет Тарик, увидимся за столом!',
    tr: 'Selam Tarık, masada görüşürüz!',
    zh: '嗨 Tariq，我们牌桌见！',
    ja: 'タリク、テーブルで会おう！',
    it: 'Ehi Tariq, ci vediamo al tavolo!',
    id: 'Hai Tariq, sampai jumpa di meja!',
    vi: 'Chào Tariq, gặp lại ở bàn nhé!',
    th: 'เฮ้ ทาริค เจอกันที่โต๊ะนะ!',
    fil: 'Uy Tariq, kita-kits sa lamesa!',
    pl: 'Hej Tariq, do zobaczenia przy stole!',
    nl: 'Hey Tariq, zie je aan de tafel!',
  },
  'i will join your table in 5 minutes!': {
    en: 'I will join your table in 5 minutes!',
    ko: '5분 뒤에 테이블로 갈게요!',
    fr: 'Je rejoins ta table dans 5 minutes !',
    de: 'Ich komme in 5 Minuten an deinen Tisch!',
    es: '¡Me uno a tu mesa en 5 minutos!',
    pt: 'Entro na sua mesa em 5 minutos!',
    ar: 'سأنضم إلى طاولتك خلال 5 دقائق!',
    hi: 'मैं 5 मिनट में आपकी टेबल पर आता हूँ!',
    ru: 'Присоединюсь к твоему столу через 5 минут!',
    tr: '5 dakika içinde masana katılacağım!',
    zh: '我5分钟后就进你的房间！',
    ja: '5分後にあなたのテーブルに行きます！',
    it: 'Mi unisco al tuo tavolo tra 5 minuti!',
    id: 'Saya akan bergabung ke mejamu dalam 5 menit!',
    vi: 'Mình sẽ vào bàn của bạn sau 5 phút nữa!',
    th: 'ฉันจะเข้าร่วมโต๊ะของคุณใน 5 นาที!',
    fil: 'Sasali ako sa lamesa mo pagkatapos ng 5 minuto!',
    pl: 'Dołączę do twojego stołu za 5 minut!',
    nl: 'Ik kom over 5 minuten naar je tafel!',
  },
  'yeah, definitely!': {
    en: 'Yeah, definitely!',
    ko: '네, 당연하죠!',
    fr: 'Oui, carrément !',
    de: 'Ja, definitiv!',
    es: '¡Sí, definitivamente!',
    pt: 'Sim, com certeza!',
    ar: 'نعم، بكل تأكيد!',
    hi: 'हाँ, बिल्कुल!',
    ru: 'Да, обязательно!',
    tr: 'Evet, kesinlikle!',
    zh: '好啊，没问题！',
    ja: 'うん、もちろん！',
    it: 'Sì, decisamente!',
    id: 'Ya, tentu saja!',
    vi: 'Vâng, chắc chắn rồi!',
    th: 'ใช่ แน่นอนเลย!',
    fil: 'Oo naman, siguradong-siguro!',
    pl: 'Tak, zdecydowanie!',
    nl: 'Ja, zeker weten!',
  },
  'yea': {
    en: 'Yea',
    ko: '응',
    fr: 'Ouais',
    de: 'Ja',
    es: 'Sí',
    pt: 'Sim',
    ar: 'نعم',
    hi: 'हाँ',
    ru: 'Да',
    tr: 'Evet',
    zh: '嗯嗯',
    ja: 'うん',
    it: 'Sì',
    id: 'Iya',
    vi: 'Ừ',
    th: 'เย้',
    fil: 'Oo',
    pl: 'Tak',
    nl: 'Ja',
  },
  'okay': {
    en: 'Okay',
    ko: '알겠어요',
    fr: 'D\'accord',
    de: 'Okay',
    es: 'De acuerdo',
    pt: 'Tudo bem',
    ar: 'حسناً',
    hi: 'ठीक है',
    ru: 'Хорошо',
    tr: 'Tamam',
    zh: '好的',
    ja: '分かりました',
    it: 'Va bene',
    id: 'Oke',
    vi: 'Được rồi',
    th: 'ตกลง',
    fil: 'Sige',
    pl: 'Okej',
    nl: 'Oké',
  },
  'sent': {
    en: 'Sent',
    ko: '전송됨',
    fr: 'Envoyé',
    de: 'Gesendet',
    es: 'Enviado',
    pt: 'Enviado',
    ar: 'تم الإرسال',
    hi: 'भेजा गया',
    ru: 'Отправлено',
    tr: 'Gönderildi',
    zh: '已发送',
    ja: '送信済み',
    it: 'Inviato',
    id: 'Terkirim',
    vi: 'Đã gửi',
    th: 'ส่งแล้ว',
    fil: 'Naipadala',
    pl: 'Wysłano',
    nl: 'Verzonden',
  },
  'good morning': {
    en: 'Good morning',
    ko: '좋은 아침이에요!',
    fr: 'Bonjour !',
    de: 'Guten Morgen!',
    es: '¡Buenos días!',
    pt: 'Bom dia!',
    ar: 'صباح الخير!',
    hi: 'सुप्रभात!',
    ru: 'Доброе утро!',
    tr: 'Günaydın!',
    zh: '早上好！',
    ja: 'おはようございます！',
    it: 'Buongiorno!',
    id: 'Selamat pagi!',
    vi: 'Chào buổi sáng!',
    th: 'อรุณสวัสดิ์!',
    fil: 'Magandang umaga!',
    pl: 'Dzień dobry!',
    nl: 'Goedemorgen!',
  },
  'good night': {
    en: 'Good night',
    ko: '좋은 밤 되세요~',
    fr: 'Bonne nuit !',
    de: 'Gute Nacht!',
    es: '¡Buenas noches!',
    pt: 'Boa noite!',
    ar: 'تصبح على خير!',
    hi: 'शुभ रात्रि!',
    ru: 'Спокойной ночи!',
    tr: 'İyi geceler!',
    zh: '晚安！',
    ja: 'おやすみなさい！',
    it: 'Buonanotte!',
    id: 'Selamat malam!',
    vi: 'Chúc ngủ ngon!',
    th: 'ราตรีสวัสดิ์!',
    fil: 'Magandang gabi!',
    pl: 'Dobranoc!',
    nl: 'Goedenacht!',
  },
  'thank you': {
    en: 'Thank you',
    ko: '감사합니다',
    fr: 'Merci',
    de: 'Danke',
    es: 'Gracias',
    pt: 'Obrigado',
    ar: 'شكراً لك',
    hi: 'धन्यवाद',
    ru: 'Спасибо',
    tr: 'Teşekkürler',
    zh: '谢谢你',
    ja: 'ありがとうございます',
    it: 'Grazie',
    id: 'Terima kasih',
    vi: 'Cảm ơn bạn',
    th: 'ขอบคุณครับ/ค่ะ',
    fil: 'Salamat',
    pl: 'Dziękuję',
    nl: 'Dank je wel',
  },
  'thanks': {
    en: 'Thanks',
    ko: '고마워요',
    fr: 'Merci',
    de: 'Danke',
    es: 'Gracias',
    pt: 'Valeu',
    ar: 'شكراً',
    hi: 'शुक्रिया',
    ru: 'Спасибо',
    tr: 'Sağol',
    zh: '多谢',
    ja: 'ありがとう',
    it: 'Grazie',
    id: 'Makasih',
    vi: 'Cảm ơn nha',
    th: 'ขอบใจนะ',
    fil: 'Salamat',
    pl: 'Dzięki',
    nl: 'Bedankt',
  },
  'wow': {
    en: 'Wow',
    ko: '와우!',
    fr: 'Ouah !',
    de: 'Wow!',
    es: '¡Guau!',
    pt: 'Uau!',
    ar: 'واو!',
    hi: 'वाह!',
    ru: 'Вау!',
    tr: 'Vay canına!',
    zh: '哇塞！',
    ja: 'すごい！',
    it: 'Wow!',
    id: 'Wah!',
    vi: 'Oa!',
    th: 'ว้าว!',
    fil: 'Wow!',
    pl: 'Wow!',
    nl: 'Wauw!',
  },
  'cool': {
    en: 'Cool',
    ko: '멋지네요!',
    fr: 'Cool !',
    de: 'Cool!',
    es: '¡Genial!',
    pt: 'Legal!',
    ar: 'رائع!',
    hi: 'बढ़िया!',
    ru: 'Круто!',
    tr: 'Harika!',
    zh: '太酷了！',
    ja: 'かっこいい！',
    it: 'Forte!',
    id: 'Keren!',
    vi: 'Tuyệt vời!',
    th: 'เจ๋งมาก!',
    fil: 'Ayos ah!',
    pl: 'Super!',
    nl: 'Gaaf!',
  },
};

/**
 * Normalizes input text and checks fast local translation dictionary
 */
function findFastDictionaryTranslation(
  cleanText: string,
  targetLanguage: LanguageCode
): string | null {
  const lower = cleanText.toLowerCase().trim();

  // 1. Direct match
  if (COMMON_PHRASES[lower] && COMMON_PHRASES[lower][targetLanguage]) {
    return COMMON_PHRASES[lower][targetLanguage]!;
  }

  // 2. Strip trailing punctuation
  const stripped = lower.replace(/[!?.~,]+$/, '').trim();
  if (COMMON_PHRASES[stripped] && COMMON_PHRASES[stripped][targetLanguage]) {
    const base = COMMON_PHRASES[stripped][targetLanguage]!;
    // Preserve exclamation / question mark if present in original
    if (cleanText.endsWith('!')) return base.endsWith('!') ? base : `${base}!`;
    if (cleanText.endsWith('?')) return base.endsWith('?') ? base : `${base}?`;
    return base;
  }

  // 3. Reverse match: If input is in Korean/Russian/etc. and dictionary contains that text value
  for (const entry of Object.values(COMMON_PHRASES)) {
    for (const [code, val] of Object.entries(entry)) {
      if (val && val.toLowerCase() === lower && entry[targetLanguage]) {
        return entry[targetLanguage]!;
      }
      if (val && val.toLowerCase().replace(/[!?.~,]+$/, '').trim() === stripped && entry[targetLanguage]) {
        return entry[targetLanguage]!;
      }
    }
  }

  return null;
}

/**
 * Main Translation Client Function:
 * Translates message text into the user's selected language.
 * Checks in-memory cache -> common phrase dictionary -> /api/translate endpoint.
 */
export async function translateText(
  messageId: string,
  text: string,
  targetLanguage: LanguageCode
): Promise<TranslationResponse> {
  const cleanText = text.trim();
  const detectedSource = detectLanguageLocally(cleanText);

  // If text is in the target language already, return directly
  if (detectedSource === targetLanguage) {
    return {
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText: text,
      cached: true,
    };
  }

  const cacheKey = `${messageId || cleanText}:${targetLanguage}`;

  // 1. Check in-memory cache
  if (clientTranslationCache.has(cacheKey)) {
    return {
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText: clientTranslationCache.get(cacheKey)!,
      cached: true,
    };
  }

  // 2. Instant dictionary lookup
  const fastDictResult = findFastDictionaryTranslation(cleanText, targetLanguage);
  if (fastDictResult) {
    clientTranslationCache.set(cacheKey, fastDictResult);
    return {
      originalText: text,
      originalLanguage: detectedSource,
      targetLanguage,
      translatedText: fastDictResult,
      cached: true,
    };
  }

  // 3. Check for in-flight requests to deduplicate
  if (pendingClientRequests.has(cacheKey)) {
    return pendingClientRequests.get(cacheKey)!;
  }

  // 4. Request server translation API (/api/translate)
  const reqPromise = (async (): Promise<TranslationResponse> => {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messageId,
          text: cleanText,
          sourceLanguage: detectedSource,
          targetLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data: TranslationResponse = await response.json();
      const resText = data.translatedText || fastDictResult || cleanText;

      clientTranslationCache.set(cacheKey, resText);
      return {
        ...data,
        translatedText: resText,
      };
    } catch {
      // Fallback on network failure
      const fallback = fastDictResult || cleanText;
      clientTranslationCache.set(cacheKey, fallback);
      return {
        originalText: text,
        originalLanguage: detectedSource,
        targetLanguage,
        translatedText: fallback,
      };
    } finally {
      pendingClientRequests.delete(cacheKey);
    }
  })();

  pendingClientRequests.set(cacheKey, reqPromise);
  return reqPromise;
}

export async function translateMessageText({
  text,
  targetLanguage,
  messageId = '',
}: {
  text: string;
  targetLanguage: LanguageCode;
  messageId?: string;
}): Promise<TranslationResponse> {
  return translateText(messageId, text, targetLanguage);
}
