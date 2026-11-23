import {
  DialogueLine,
  LocationId,
  MainCharacterProfile,
  OutfitCategory,
  RelationshipState,
  RelationshipStatus,
  TimeOfDay,
} from './types';

export const MAIN_CHARACTERS: MainCharacterProfile[] = [
  {
    id: 'npc_jiyeon',
    name: 'Ji-yeon Kang',
    koreanName: '강지연',
    age: 23,
    role: 'Pastry Chef & Watercolorist at Cafe Bomnal',
    personality: 'Warm, perceptive, easily flustered when complimented sincerely.',
    backstory:
      'Former fine-arts student who opened a sunlit corner pastry bar in Seongsu to fund her illustrated recipe zine.',
    signatureColor: '#F39CB2',
    appearance: {
      presentation: 'feminine',
      faceShape: 'heart',
      hairStyle: 'silky_waves',
      hairColor: '#3B2822',
      skinTone: '#FCE3D4',
      eyeColor: '#5B3E31',
      equippedOutfitId: 'special_patissier_apron',
      accessory: 'earrings',
    },
    favoriteGifts: ['gift_strawberry_daifuku', 'gift_pastel_sketchbook', 'gift_freesia_bouquet'],
    likes: ['Cream Einspänner', 'Soft morning light', 'Pastel linen fabrics', 'Handwritten notes'],
    dislikes: ['Over-roasted burnt espresso', 'Loud crowded rush hours', 'Skipping lunch'],
    schedule: {
      morning: 'cafe',
      afternoon: 'park',
      evening: 'cafe',
    },
    greetingByTime: {
      morning: 'Good morning! I just pulled strawberry cream mochi off the tray—want to sit by the window?',
      afternoon: 'I brought my watercolor tin out to the park bench before the golden light slips away.',
      evening: 'The evening lamps in Cafe Bomnal finally look calm. Rough day, or a good kind of busy?',
    },
    outfitReactions: {
      casual: 'Oh, that pastel palette looks effortless on you—like an early spring chapter cover.',
      dresses: 'Wait… you really dressed up today? Sorry, I got completely distracted by how soft that silhouette looks.',
      hanbok: 'The silk lines on that modern hanbok suit you so well! Promise we’ll take a photo together later?',
      special: 'Hold on, matching bakery vibes?! Now you look like co-owner of Bomnal.',
      winter: 'You look so cozy in that coat! Come warm up your hands over a latte.',
    },
    cafePreferences: {
      favoriteDrinkId: 'cafe_einspanner',
      favoriteDessertId: 'cafe_strawberry_bingsu',
      favoriteReply:
        'Wait—how did you remember I always crave sweet cream Einspänner and berry bingsu?! That honestly made my whole afternoon.',
      otherReply:
        'Ooh, thank you for treating me! Sharing dessert at a sunny table always slows time down in the best way.',
    },
    storyEvents: [
      {
        id: 'jiyeon_ev_1',
        title: 'Sugar & Paint Stains',
        requiredAffection: 25,
        location: 'cafe',
        teaser: 'Ji-yeon drops her recipe sketchbook behind the espresso bar.',
        dialogue: [
          {
            speaker: 'npc',
            expression: 'surprised',
            text: 'Ah—careful! My flour-dusted sketchbook just slid right under your shoes.',
          },
          {
            speaker: 'npc',
            expression: 'shy',
            text: 'Don’t laugh if you saw the margin doodles. Half of them are dessert ideas… and the last page might be a quick sketch of you waiting at the counter.',
            choices: [
              {
                id: 'jy1_c1',
                label: '“Can I see? I’d feel honored to be in your book.”',
                affectionDelta: 12,
                expression: 'shy',
                replyText:
                  'Seriously?! Okay… look quickly before my ears turn even redder. You just always have the calmest expression when you visit.',
                rememberKey: 'jiyeon_sketch',
                rememberValue: 'praised',
              },
              {
                id: 'jy1_c2',
                label: '“Trade you: keep sketching, and I’ll test all the pastries.”',
                affectionDelta: 9,
                expression: 'happy',
                replyText:
                  'Haha, official quality control inspector? Deal! Starting tomorrow you get first bite of every warm batch.',
                rememberKey: 'jiyeon_sketch',
                rememberValue: 'taster',
              },
            ],
          },
        ],
      },
      {
        id: 'jiyeon_ev_2',
        title: 'Cherry Blossom Bench',
        requiredAffection: 55,
        location: 'park',
        teaser: 'Golden hour petals drift across the park fountain with Ji-yeon.',
        dialogue: [
          {
            speaker: 'npc',
            expression: 'smiling',
            text: 'Look at how pink the park feels before sunset. Usually I worry if the café will stay afloat—then you walk up and my shoulders just drop.',
          },
          {
            speaker: 'npc',
            expression: 'happy',
            text: 'Tell me honestly: what made you stay around this neighborhood?',
            choices: [
              {
                id: 'jy2_c1',
                label: '“Honestly? Coming to see you makes every day brighter.”',
                affectionDelta: 15,
                expression: 'shy',
                replyText:
                  '…You can’t say something that gentle out of nowhere! My heart just skipped like a dropped teacup.',
                rememberKey: 'jiyeon_confess_tone',
                rememberValue: 'direct',
              },
              {
                id: 'jy2_c2',
                label: '“Good coffee, quiet parks, and great company.”',
                affectionDelta: 10,
                expression: 'smiling',
                replyText:
                  'Good coffee and great company—I’ll gladly defend our title as your favorite part of Seoul.',
                rememberKey: 'jiyeon_confess_tone',
                rememberValue: 'gentle',
              },
            ],
          },
        ],
      },
      {
        id: 'jiyeon_ev_3',
        title: 'After Closing Time',
        requiredAffection: 90,
        location: 'cafe',
        teaser: 'Bomnal glows softly after hours as Ji-yeon saves two warm seats.',
        dialogue: [
          {
            speaker: 'npc',
            expression: 'shy',
            text: 'The sign on the door already says Closed… I left the fairy lights on just for us.',
          },
          {
            speaker: 'npc',
            expression: 'happy',
            text: 'I don’t think this is just polite neighbor small talk anymore. Whenever my day gets busy, the first person I want to tell is you.',
            choices: [
              {
                id: 'jy3_c1',
                label: '“Same here, Ji-yeon. Let’s walk home together slowly.”',
                affectionDelta: 18,
                expression: 'happy',
                replyText:
                  'Yes—no rushing, no alarms. Just the warm evening breeze and you right beside me.',
                rememberKey: 'jiyeon_route',
                rememberValue: 'dating',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'npc_minjun',
    name: 'Min-jun Seo',
    koreanName: '서민준',
    age: 25,
    role: 'Editorial Fashion Director & Analog Photographer',
    personality: 'Composed, subtly witty, sharply observant with quiet warmth underneath.',
    backstory:
      'Grew up in Busan before moving to Seoul to launch an independent lookbook studio in a converted brick warehouse.',
    signatureColor: '#7EA6E0',
    appearance: {
      presentation: 'masculine',
      faceShape: 'sculpted',
      hairStyle: 'comma_hair',
      hairColor: '#1E222E',
      skinTone: '#F7DBC8',
      eyeColor: '#2F384A',
      equippedOutfitId: 'special_film_director',
      accessory: 'glasses',
    },
    favoriteGifts: ['gift_vintage_film', 'gift_earl_grey_macaron', 'gift_pastel_sketchbook'],
    likes: ['35mm film grain', 'Minimalist tailoring', 'Late evening walks', 'Bergamot tea'],
    dislikes: ['Forced small talk', 'Harsh flash photography', 'Overpriced gimmicks'],
    schedule: {
      morning: 'boutique',
      afternoon: 'photo_studio',
      evening: 'metro',
    },
    greetingByTime: {
      morning: 'Up early? I was just checking fabric weights before the boutique gets crowded.',
      afternoon: 'Perfect timing—natural light in the Photo Studio hits the backdrop just right right now.',
      evening: 'Heading toward the metro as well? Everyone rushes at this hour, yet somehow you never look flustered.',
    },
    outfitReactions: {
      streetwear: 'Clean silhouette. The layering hits that effortless Seongsu alley energy.',
      formal: 'Sharp tailoring. Honestly, step into my studio—that look deserves a full editorial frame.',
      winter: 'Smart coat choice. Good wool drapes completely differently in winter light.',
      hanbok: 'Modern hanbok lines are criminally underrated. You carry the collar line cleanly.',
      school: 'Preppy but intentional—definitely works on you.',
    },
    cafePreferences: {
      favoriteDrinkId: 'cafe_matcha_latte',
      favoriteDessertId: 'cafe_earl_grey_cake',
      favoriteReply:
        'Matcha and Earl Grey chiffon… alright, either you read my mind or you actually pay close attention to what I order.',
      otherReply:
        'Appreciate the quiet break. Sitting down with good company beats staring at contact sheets all day.',
    },
    storyEvents: [
      {
        id: 'minjun_ev_1',
        title: 'Test Frame on Frame 36',
        requiredAffection: 25,
        location: 'photo_studio',
        teaser: 'Min-jun realizes his last 35mm exposure was aimed at you.',
        dialogue: [
          {
            speaker: 'npc',
            expression: 'surprised',
            text: 'Huh. There’s still one frame left on this roll before I rewind it.',
          },
          {
            speaker: 'npc',
            expression: 'smiling',
            text: 'Don’t stiffen up—just stand right there by the window. Why do you think good portraits work?',
            choices: [
              {
                id: 'mj1_c1',
                label: '“Because of the person behind the camera noticing small details.”',
                affectionDelta: 13,
                expression: 'shy',
                replyText:
                  '…That’s a dangerously flattering answer. Stand still before I miss the light.',
                rememberKey: 'minjun_portrait',
                rememberValue: 'photographer',
              },
              {
                id: 'mj1_c2',
                label: '“Natural light and feeling comfortable around you.”',
                affectionDelta: 10,
                expression: 'happy',
                replyText:
                  'Good. Then don’t move—that easy half-smile is already framed cleanly.',
                rememberKey: 'minjun_portrait',
                rememberValue: 'comfortable',
              },
            ],
          },
        ],
      },
      {
        id: 'minjun_ev_2',
        title: 'Last Train Platform',
        requiredAffection: 55,
        location: 'metro',
        teaser: 'Under warm station lights, Min-jun lets the next train pass.',
        dialogue: [
          {
            speaker: 'npc',
            expression: 'smiling',
            text: 'Wait—that was our train. Looks like we’re waiting eight more minutes.',
          },
          {
            speaker: 'npc',
            expression: 'shy',
            text: 'Actually, I didn’t rush for the doors on purpose. Is it weird that even standing by a subway sign feels good when you’re around?',
            choices: [
              {
                id: 'mj2_c1',
                label: '“Not weird at all. I’d miss another train to keep talking.”',
                affectionDelta: 15,
                expression: 'shy',
                replyText:
                  'Careful—if you say things like that, I might forget my whole schedule tomorrow.',
                rememberKey: 'minjun_train',
                rememberValue: 'stayed',
              },
              {
                id: 'mj2_c2',
                label: '“Eight minutes sounds like plenty of time for warm canned coffee.”',
                affectionDelta: 11,
                expression: 'happy',
                replyText:
                  'Haha, practical and thoughtful. Let’s grab two from the machine.',
                rememberKey: 'minjun_train',
                rememberValue: 'coffee',
              },
            ],
          },
        ],
      },
      {
        id: 'minjun_ev_3',
        title: 'Private Contact Sheet',
        requiredAffection: 90,
        location: 'photo_studio',
        teaser: 'Min-jun pins a print inside his personal journal.',
        dialogue: [
          {
            speaker: 'npc',
            expression: 'smiling',
            text: 'Clients only see my studio work. Nobody else gets to step behind this curtain when the lights dim.',
          },
          {
            speaker: 'npc',
            expression: 'shy',
            text: 'Every candid shot I’ve liked best lately has you in it. Let me be honest for once—I want more time with you outside work.',
            choices: [
              {
                id: 'mj3_c1',
                label: '“Then let’s make our own schedule starting tonight, Min-jun.”',
                affectionDelta: 18,
                expression: 'happy',
                replyText:
                  'Best creative decision I’ve made all year. Walk with me?',
                rememberKey: 'minjun_route',
                rememberValue: 'dating',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'npc_haneul',
    name: 'Ha-neul Baek',
    koreanName: '백하늘',
    age: 24,
    role: 'Webtoon Background Illustrator & Acoustic Busker',
    personality: 'Sunny, expressive, delightfully chaotic yet fiercely loyal.',
    backstory:
      'Draws skyline webtoon backgrounds by morning and strums soft indie songs by the fountain in the evening.',
    signatureColor: '#B59DF0',
    appearance: {
      presentation: 'neutral',
      faceShape: 'oval',
      hairStyle: 'wolf_layers',
      hairColor: '#69538F',
      skinTone: '#FFE9DB',
      eyeColor: '#6B52A3',
      equippedOutfitId: 'special_acoustic_stage',
      accessory: 'headphones',
    },
    favoriteGifts: ['gift_plush_bunny', 'gift_pastel_sketchbook', 'gift_strawberry_daifuku'],
    likes: ['Matcha cream brioche', 'Golden sky gradients', 'Cute charms', 'Spontaneous photo booths'],
    dislikes: ['Art block at 2 a.m.', 'Dead battery on headphones', 'Silent awkwardness'],
    schedule: {
      morning: 'park',
      afternoon: 'cafe',
      evening: 'street',
    },
    greetingByTime: {
      morning: 'Yoo-hoo! Look at the clouds above the fountain—total Season Finale sky!',
      afternoon: 'Saving my soul at Cafe Bomnal! Have you survived deadline hour yet?',
      evening: 'Neon lights are flickering on! Up for wandering the street or ducking into the photo booth?',
    },
    outfitReactions: {
      streetwear: 'Whoa, huge main-character energy! Seriously, look at those jacket proportions!',
      special: 'STOP—that outfit looks straight out of a trending romance episode!',
      casual: 'Ooh comfy chic! We look like we’re about to go grab waffles and complain about deadlines.',
      dresses: 'Wait you look super pretty today!! Can I borrow your color palette for Chapter 14?',
      hanbok: 'Pastel traditional lines in daylight?! That’s peak Korean webtoon cover art!',
    },
    cafePreferences: {
      favoriteDrinkId: 'cafe_strawberry_milk',
      favoriteDessertId: 'cafe_melonpan',
      favoriteReply:
        'BERRY CLOUD MILK AND MATCHA BRIOCHE?! You officially hold VIP seats in my heart forever!!',
      otherReply:
        'Aaaah thank you!! Nothing revives a drained illustrator faster than sugar and good banter.',
    },
    storyEvents: [
      {
        id: 'haneul_ev_1',
        title: 'Missing Ink Brush',
        requiredAffection: 25,
        location: 'park',
        teaser: 'Ha-neul tumbles off the bench chasing windblown storyboard notes.',
        dialogue: [
          {
            speaker: 'npc',
            expression: 'surprised',
            text: 'Nooo my sky reference pages—!! Thank goodness you caught page four before the fountain got it!',
          },
          {
            speaker: 'npc',
            expression: 'happy',
            text: 'Wait, look at you rescuing an artist in crisis like a literal webtoon cameo. Tell me what genre our story is!',
            choices: [
              {
                id: 'hn1_c1',
                label: '“Definitely cozy comedy-romance with great snacks.”',
                affectionDelta: 13,
                expression: 'happy',
                replyText:
                  'YES! Cozy comedy-romance with snacks beats tragic cliffhangers ten times out of ten!',
                rememberKey: 'haneul_genre',
                rememberValue: 'romcom',
              },
              {
                id: 'hn1_c2',
                label: '“Slice-of-life adventure through every alley in Seoul.”',
                affectionDelta: 10,
                expression: 'smiling',
                replyText:
                  'Ooh, exploration buddy! Then prepare for mandatory bakery detours.',
                rememberKey: 'haneul_genre',
                rememberValue: 'slice',
              },
            ],
          },
        ],
      },
      {
        id: 'haneul_ev_2',
        title: 'Two Earbuds on the Curb',
        requiredAffection: 55,
        location: 'street',
        teaser: 'Ha-neul hands over one side of their wireless headphones.',
        dialogue: [
          {
            speaker: 'npc',
            expression: 'smiling',
            text: 'Here, take the left earbud. Listen—I wrote this chorus right after hanging out with you.',
          },
          {
            speaker: 'npc',
            expression: 'shy',
            text: 'Usually I joke around so nobody notices when I get nervous… why does my voice shake slightly right now?',
            choices: [
              {
                id: 'hn2_c1',
                label: '“Because it’s honest. Your music is my favorite part of the street.”',
                affectionDelta: 15,
                expression: 'shy',
                replyText:
                  'Whoa—okay, full blush achieved. Thank you for always actually listening to me.',
                rememberKey: 'haneul_song',
                rememberValue: 'treasured',
              },
              {
                id: 'hn2_c2',
                label: '“Play it again? Let’s hum along until the crosswalk turns green.”',
                affectionDelta: 11,
                expression: 'happy',
                replyText:
                  'Haha, deal! Best duet partner in the district.',
                rememberKey: 'haneul_song',
                rememberValue: 'duet',
              },
            ],
          },
        ],
      },
      {
        id: 'haneul_ev_3',
        title: 'Two-Cut Photo Booth Promise',
        requiredAffection: 90,
        location: 'street',
        teaser: 'Pastel curtain light flickers softly with Ha-neul.',
        dialogue: [
          {
            speaker: 'npc',
            expression: 'shy',
            text: 'Hey—before we snap another goofy photo strip, listen for ten seconds?',
          },
          {
            speaker: 'npc',
            expression: 'happy',
            text: 'Everything in Seoul feels brighter, funnier, and infinitely sweeter when you’re on my side of the frame. Wanna be officially more than friends?',
            choices: [
              {
                id: 'hn3_c1',
                label: '“Count me in, Ha-neul—every episode from here on.”',
                affectionDelta: 18,
                expression: 'happy',
                replyText:
                  'Best plot twist EVER!! Smile—countdown starts in 3, 2, 1!',
                rememberKey: 'haneul_route',
                rememberValue: 'dating',
              },
            ],
          },
        ],
      },
    ],
  },
];

export function getRelationshipStatusLabel(affection: number): RelationshipStatus {
  if (affection >= 95) return 'Dating';
  if (affection >= 65) return 'Mutual Crush';
  if (affection >= 40) return 'Close Friend';
  if (affection >= 15) return 'Friend';
  return 'Acquaintance';
}

export function getCharactersAtLocation(
  location: LocationId,
  timeOfDay: TimeOfDay
): MainCharacterProfile[] {
  return MAIN_CHARACTERS.filter((c) => c.schedule[timeOfDay] === location);
}

export function buildConversationLines(
  char: MainCharacterProfile,
  rel: RelationshipState,
  timeOfDay: TimeOfDay,
  equippedOutfitCategory: OutfitCategory
): DialogueLine[] {
  // First check unlocked milestone events that haven't played yet
  const pendingMilestone = char.storyEvents.find(
    (ev) =>
      rel.affection >= ev.requiredAffection &&
      !rel.unlockedEventIds.includes(ev.id)
  );
  if (pendingMilestone) {
    return pendingMilestone.dialogue;
  }

  const outfitNote = char.outfitReactions[equippedOutfitCategory];
  const greeting = char.greetingByTime[timeOfDay];

  const recalledKeys = Object.keys(rel.rememberedChoices);
  let memoryLine = '';
  if (recalledKeys.includes('jiyeon_sketch')) {
    memoryLine = 'Still keeping that page in my sketchbook safe, by the way.';
  } else if (recalledKeys.includes('minjun_portrait')) {
    memoryLine = 'I checked that 35mm contact sheet this morning—turned out even sharper than I hoped.';
  } else if (recalledKeys.includes('haneul_genre')) {
    memoryLine = 'Added two new bakery doodles to the storyboard after our last chat!';
  }

  const openingText = memoryLine ? `${greeting} ${memoryLine}` : greeting;

  const lines: DialogueLine[] = [
    {
      speaker: 'npc',
      expression: rel.affection >= 45 ? 'happy' : 'smiling',
      text: openingText,
    },
  ];

  if (outfitNote && rel.conversationsHad % 2 === 0) {
    lines.push({
      speaker: 'npc',
      expression: 'shy',
      text: outfitNote,
    });
  }

  lines.push({
    speaker: 'npc',
    expression: 'smiling',
    text:
      timeOfDay === 'morning'
        ? 'Any plans before the afternoon rush hits?'
        : timeOfDay === 'afternoon'
        ? 'How’s your day treating you so far?'
        : 'Do you usually unwind slowly in the evening?',
    choices: [
      {
        id: `chat_${char.id}_${timeOfDay}_warm`,
        label: '“Spending a little quiet time talking with you was the plan.”',
        affectionDelta: 7,
        expression: 'shy',
        replyText:
          char.id === 'npc_minjun'
            ? 'Careful saying that so casually—you’ll make me clear my whole afternoon.'
            : char.id === 'npc_jiyeon'
            ? 'Aha… you always know how to melt a busy schedule in one sentence.'
            : 'Wait seriously?! Now I’m grinning like an idiot on a webtoon banner!',
        rememberKey: `vibe_${char.id}`,
        rememberValue: 'warm',
      },
      {
        id: `chat_${char.id}_${timeOfDay}_playful`,
        label: '“Just exploring Seongsu for good snacks and cool outfits.”',
        affectionDelta: 5,
        expression: 'happy',
        replyText:
          char.id === 'npc_minjun'
            ? 'Solid taste. Don’t pass up the corner boutique if you have spare won.'
            : char.id === 'npc_jiyeon'
            ? 'Tell me which dessert wins! And save room if you come back to Bomnal.'
            : 'Ooh classic! Grab me a strawberry milk if you hit the café!',
        rememberKey: `vibe_${char.id}`,
        rememberValue: 'playful',
      },
      {
        id: `chat_${char.id}_${timeOfDay}_busy`,
        label: '“Working a mini-job first—gotta save up won for later.”',
        affectionDelta: 4,
        expression: 'smiling',
        replyText:
          char.id === 'npc_minjun'
            ? 'Respect the hustle. Just remember not to skip breaks.'
            : char.id === 'npc_jiyeon'
            ? 'You work hard! Don’t forget to rest at Home or grab a drink later.'
            : 'Ooh industrious protagonist mode! Treat yourself afterward!',
        rememberKey: `vibe_${char.id}`,
        rememberValue: 'diligent',
      },
    ],
  });

  return lines;
}
