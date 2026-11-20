export interface WebtoonEpisode {
  id: string;
  number: number;
  title: string;
  thumbnail: string;
  date: string;
  likes: number;
  isFree: boolean;
  panels: string[];
}

export interface WebtoonItem {
  id: string;
  title: string;
  author: string;
  genre: string;
  subGenres: string[];
  coverImage: string;
  bannerImage?: string;
  summary: string;
  rating: number;
  viewsCount: string;
  subscribersCount: string;
  subLabel: string; // e.g. "10+ more free episodes", "#4 in Drama", "Ship Tease", "Opposites Attract"
  subLabelColor?: string;
  topBadge?: 'New Episode' | 'New Series' | 'Returned' | 'Video' | 'Rank' | 'Popular' | 'Hot';
  topBadgeText?: string;
  rank?: number;
  matchScore?: number; // e.g. 98 -> 98% Match
  recommendationReason?: string;
  dayOfWeek?: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';
  isSubscribed?: boolean;
  lastReadEpisode?: number;
  totalEpisodes: number;
  episodes: WebtoonEpisode[];
}

export const SAMPLE_PANELS = [
  'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1563089145-599997674d42?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=800&auto=format&fit=crop&q=80',
];

export const FEATURED_WEBTOONS: WebtoonItem[] = [
  {
    id: 'otherworldly-family-man',
    title: 'THE OTHERWORLDLY FAMILY MAN',
    author: 'K-Story & Studio M',
    genre: 'Fantasy',
    subGenres: ['Isekai', 'Found Family', 'Cohabitation', 'Magic'],
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80',
    summary: 'After awakening in a magical realm, an ordinary chef adopts a cursed girl and an elven protector, building an unbreakable family against rival imperial guilds.',
    rating: 9.87,
    viewsCount: '18.4M',
    subscribersCount: '920K',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'New Episode',
    topBadgeText: 'New Episode',
    matchScore: 99,
    recommendationReason: 'Trending #1 in Fantasy',
    dayOfWeek: 'MON',
    isSubscribed: true,
    lastReadEpisode: 1,
    totalEpisodes: 65,
    episodes: [
      { id: 'ep-1', number: 1, title: 'Episode 1: The Golden Portal', thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80', date: 'Aug 24', likes: 24500, isFree: true, panels: SAMPLE_PANELS },
      { id: 'ep-2', number: 2, title: 'Episode 2: Unlikely Guardians', thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80', date: 'Aug 25', likes: 21200, isFree: true, panels: SAMPLE_PANELS },
      { id: 'ep-3', number: 3, title: 'Episode 3: The Hearth of Avalon', thumbnail: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=80', date: 'Aug 26', likes: 19800, isFree: true, panels: SAMPLE_PANELS },
      { id: 'ep-4', number: 4, title: 'Episode 4: Whispers in the Forest', thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80', date: 'Aug 27', likes: 28400, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'down-to-earth',
    title: 'Down To Earth',
    author: 'Pookie Senpai',
    genre: 'Romance',
    subGenres: ['Alien', 'Romance', 'Slice of Life', 'Comedy'],
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&auto=format&fit=crop&q=80',
    summary: 'Kade lives a normal, reclusive life until an adorable alien girl named Zaida crashes in his backyard, changing his world forever.',
    rating: 9.92,
    viewsCount: '45.2M',
    subscribersCount: '2.1M',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    matchScore: 97,
    topBadge: 'Hot',
    topBadgeText: 'Hot Series',
    dayOfWeek: 'TUE',
    isSubscribed: true,
    lastReadEpisode: 4,
    totalEpisodes: 180,
    episodes: [
      { id: 'dte-1', number: 1, title: 'Episode 1: Crash Landing', thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', date: 'Aug 10', likes: 45000, isFree: true, panels: SAMPLE_PANELS },
      { id: 'dte-2', number: 2, title: 'Episode 2: Strange Taste', thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80', date: 'Aug 17', likes: 42000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'the-mafia-nanny',
    title: 'The Mafia Nanny',
    author: 'Violet Matter',
    genre: 'Thriller',
    subGenres: ['Action', 'Romance', 'Mafia', 'Mystery'],
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&auto=format&fit=crop&q=80',
    bannerImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&auto=format&fit=crop&q=80',
    summary: 'An elite undercover bodyguard takes a job as the live-in nanny for a powerful crime syndicate leader’s young heir.',
    rating: 9.89,
    viewsCount: '28.1M',
    subscribersCount: '1.4M',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'New Episode',
    topBadgeText: 'New Episode',
    matchScore: 95,
    dayOfWeek: 'WED',
    isSubscribed: false,
    lastReadEpisode: 2,
    totalEpisodes: 94,
    episodes: [
      { id: 'tmn-1', number: 1, title: 'Episode 1: The Interview', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', date: 'Aug 12', likes: 31000, isFree: true, panels: SAMPLE_PANELS },
    ],
  }
];

export const CONTINUE_READING_ITEMS: WebtoonItem[] = [
  {
    id: 'father-i-dont-want-marriage',
    title: "Father, I don't Want This Marriage",
    author: 'Hong Heesu & Roal',
    genre: 'Fantasy Romance',
    subGenres: ['Reincarnation', 'Royalty', 'Misunderstandings'],
    coverImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    summary: 'Reborn as the notorious villainess Jubelian, she is determined to avoid execution by faking a romance with the tyrant crown prince.',
    rating: 9.85,
    viewsCount: '15.6M',
    subscribersCount: '780K',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'New Series',
    topBadgeText: 'New Series',
    dayOfWeek: 'THU',
    isSubscribed: true,
    lastReadEpisode: 14,
    totalEpisodes: 110,
    episodes: [
      { id: 'fwm-1', number: 1, title: 'Episode 1: The Rebirth', thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80', date: 'Aug 01', likes: 29000, isFree: true, panels: SAMPLE_PANELS },
      { id: 'fwm-14', number: 14, title: 'Episode 14: The Royal Banquet', thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80', date: 'Aug 18', likes: 34000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'down-to-earth-continue',
    title: 'Down To Earth',
    author: 'Pookie Senpai',
    genre: 'Romance',
    subGenres: ['Alien', 'Romance', 'Comedy'],
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    summary: 'Kade lives a normal, reclusive life until an alien girl named Zaida crashes in his backyard.',
    rating: 9.92,
    viewsCount: '45.2M',
    subscribersCount: '2.1M',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'New Episode',
    topBadgeText: 'Ep. 5 Dropped',
    dayOfWeek: 'TUE',
    isSubscribed: true,
    lastReadEpisode: 4,
    totalEpisodes: 180,
    episodes: [
      { id: 'dte-1', number: 1, title: 'Episode 1: Crash Landing', thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', date: 'Aug 10', likes: 45000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'the-mafia-nanny-continue',
    title: 'The Mafia Nanny',
    author: 'Violet Matter',
    genre: 'Thriller',
    subGenres: ['Action', 'Romance', 'Mafia'],
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    summary: 'An elite undercover bodyguard takes a job as the live-in nanny for a powerful crime boss.',
    rating: 9.89,
    viewsCount: '28.1M',
    subscribersCount: '1.4M',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    dayOfWeek: 'WED',
    isSubscribed: false,
    lastReadEpisode: 2,
    totalEpisodes: 94,
    episodes: [
      { id: 'tmn-1', number: 1, title: 'Episode 1: The Interview', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', date: 'Aug 12', likes: 31000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'school-bus-graveyard-continue',
    title: 'School Bus Graveyard',
    author: 'Red',
    genre: 'Horror',
    subGenres: ['Survival', 'Mystery', 'Supernatural'],
    coverImage: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80',
    summary: 'A group of high schoolers on a field trip gets transported to a nightmarish dimension where monsters hunt them at midnight.',
    rating: 9.94,
    viewsCount: '34.8M',
    subscribersCount: '1.8M',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'New Episode',
    topBadgeText: 'New Episode',
    dayOfWeek: 'THU',
    isSubscribed: true,
    lastReadEpisode: 9,
    totalEpisodes: 82,
    episodes: [
      { id: 'sbg-1', number: 1, title: 'Episode 1: The Field Trip', thumbnail: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&auto=format&fit=crop&q=80', date: 'Aug 04', likes: 38000, isFree: true, panels: SAMPLE_PANELS },
    ],
  }
];

export const TRENDING_WEBTOONS: WebtoonItem[] = [
  {
    id: 'trend-1',
    rank: 1,
    title: 'Down To Earth',
    author: 'Pookie Senpai',
    genre: 'Romance',
    subGenres: ['Alien', 'Romance', 'Slice of Life'],
    coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80',
    summary: 'An alien girl named Zaida crashes in Kade’s backyard, turning his solitary life into an adventure of human emotions.',
    rating: 9.92,
    viewsCount: '45.2M',
    subscribersCount: '2.1M',
    subLabel: 'Top #1 Trending',
    subLabelColor: '#0A84FF',
    topBadge: 'Rank',
    topBadgeText: '#1',
    dayOfWeek: 'TUE',
    totalEpisodes: 180,
    episodes: [
      { id: 't1-1', number: 1, title: 'Episode 1: Zaida Landing', thumbnail: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80', date: 'Aug 10', likes: 45000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'trend-2',
    rank: 2,
    title: 'The Summoner: Apocalypse',
    author: 'Overlord X',
    genre: 'Action',
    subGenres: ['System', 'Monsters', 'Level Up'],
    coverImage: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
    summary: 'The last survivor rewinds 10 years with all maxed beast-summoning skills intact.',
    rating: 9.88,
    viewsCount: '38.5M',
    subscribersCount: '1.7M',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'Rank',
    topBadgeText: '#2',
    dayOfWeek: 'WED',
    totalEpisodes: 76,
    episodes: [
      { id: 't2-1', number: 1, title: 'Episode 1: Re-roll', thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=400&auto=format&fit=crop&q=80', date: 'Aug 18', likes: 26000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'trend-3',
    rank: 3,
    title: 'School Bus Graveyard',
    author: 'Red',
    genre: 'Horror',
    subGenres: ['Survival', 'Mystery'],
    coverImage: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80',
    summary: 'High school students are trapped each night in a shadowy mirror world populated by phantom hunters.',
    rating: 9.94,
    viewsCount: '34.8M',
    subscribersCount: '1.8M',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'Rank',
    topBadgeText: '#3',
    dayOfWeek: 'THU',
    totalEpisodes: 82,
    episodes: [
      { id: 't3-1', number: 1, title: 'Episode 1: The Nightmare', thumbnail: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=400&auto=format&fit=crop&q=80', date: 'Aug 04', likes: 38000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'trend-4',
    rank: 4,
    title: 'Situationship',
    author: 'Nika V.',
    genre: 'Drama',
    subGenres: ['Urban', 'Nightlife', 'Passion'],
    coverImage: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&auto=format&fit=crop&q=80',
    summary: 'A high-flying fashion designer and a jazz pianist navigate the blurry lines between lovers and friends.',
    rating: 9.86,
    viewsCount: '29.7M',
    subscribersCount: '1.3M',
    subLabel: 'Opposites Attract',
    subLabelColor: '#0A84FF',
    topBadge: 'Rank',
    topBadgeText: '#4',
    dayOfWeek: 'FRI',
    totalEpisodes: 88,
    episodes: [
      { id: 't4-1', number: 1, title: 'Episode 1: Midnight Encounter', thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop&q=80', date: 'Aug 20', likes: 32000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'trend-5',
    rank: 5,
    title: 'Plus One',
    author: 'Minty Candy',
    genre: 'Slice of Life',
    subGenres: ['Family', 'Cute', 'Parenting'],
    coverImage: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=600&auto=format&fit=crop&q=80',
    summary: 'A wholesome look at newly married life and the hilarious everyday chaos of raising a baby.',
    rating: 9.95,
    viewsCount: '31.2M',
    subscribersCount: '1.6M',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'Rank',
    topBadgeText: '#5',
    dayOfWeek: 'SAT',
    totalEpisodes: 120,
    episodes: [
      { id: 't5-1', number: 1, title: 'Episode 1: Baby Steps', thumbnail: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=400&auto=format&fit=crop&q=80', date: 'Aug 21', likes: 41000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'trend-6',
    rank: 6,
    title: 'Osora: Skybound',
    author: 'Tonnerre',
    genre: 'Fantasy',
    subGenres: ['Angels', 'Demons', 'Destiny'],
    coverImage: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    summary: 'A sky realm warrior and an infernal prince form an alliance that shakes the cosmos.',
    rating: 9.87,
    viewsCount: '21.4M',
    subscribersCount: '980K',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'Rank',
    topBadgeText: '#6',
    dayOfWeek: 'SUN',
    totalEpisodes: 62,
    episodes: [
      { id: 't6-1', number: 1, title: 'Episode 1: Falling Feathers', thumbnail: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400&auto=format&fit=crop&q=80', date: 'Aug 22', likes: 25000, isFree: true, panels: SAMPLE_PANELS },
    ],
  }
];

export const NEW_RELEASES_WEBTOONS: WebtoonItem[] = [
  {
    id: 'new-1',
    title: 'A Spell For A Smith',
    author: 'V. R. Thorne',
    genre: 'Fantasy',
    subGenres: ['Crafting', 'Magic', 'Slow Burn'],
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    summary: 'A legendary dragon-smith and a banished high sorceress combine ancient forgecraft and rune magic.',
    rating: 9.90,
    viewsCount: '17.3M',
    subscribersCount: '940K',
    subLabel: 'New Episode',
    subLabelColor: '#0A84FF',
    topBadge: 'New Episode',
    topBadgeText: 'New Episode',
    dayOfWeek: 'FRI',
    totalEpisodes: 64,
    episodes: [
      { id: 'n1-1', number: 1, title: 'Episode 1: The Broken Anvil', thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&auto=format&fit=crop&q=80', date: 'Aug 26', likes: 27000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'new-2',
    title: 'Diner For Adas',
    author: 'Maya S.',
    genre: 'Supernatural',
    subGenres: ['Food', 'Ghosts', 'Mystery'],
    coverImage: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80',
    summary: 'A late-night diner opens exclusively between 1:00 AM and 4:00 AM, serving memories to wandering spirits.',
    rating: 9.83,
    viewsCount: '11.5M',
    subscribersCount: '610K',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'New Episode',
    topBadgeText: 'New Episode',
    dayOfWeek: 'THU',
    totalEpisodes: 52,
    episodes: [
      { id: 'n2-1', number: 1, title: 'Episode 1: Special Order', thumbnail: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&auto=format&fit=crop&q=80', date: 'Aug 25', likes: 21000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'new-3',
    title: 'Childhood Friend Complex',
    author: 'Nara',
    genre: 'Romance',
    subGenres: ['Friends to Lovers', 'College', 'Fluff'],
    coverImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80',
    summary: 'They swore they were just childhood buddies, but sharing a college apartment is making hearts race.',
    rating: 9.89,
    viewsCount: '24.1M',
    subscribersCount: '1.2M',
    subLabel: 'New Series',
    subLabelColor: '#0A84FF',
    topBadge: 'New Series',
    topBadgeText: 'New Series',
    dayOfWeek: 'TUE',
    totalEpisodes: 70,
    episodes: [
      { id: 'n3-1', number: 1, title: 'Episode 1: Roommate Contract', thumbnail: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80', date: 'Aug 24', likes: 33000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'new-4',
    title: 'Swole Mates',
    author: 'Gains Bro',
    genre: 'Comedy',
    subGenres: ['Gym', 'Fitness', 'Romance'],
    coverImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&auto=format&fit=crop&q=80',
    summary: 'A self-conscious nerd gets fitness training from a fierce female bodybuilder with a secret soft side.',
    rating: 9.79,
    viewsCount: '12.3M',
    subscribersCount: '630K',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    topBadge: 'New Episode',
    topBadgeText: 'New Episode',
    dayOfWeek: 'THU',
    totalEpisodes: 48,
    episodes: [
      { id: 'n4-1', number: 1, title: 'Episode 1: Leg Day Nightmare', thumbnail: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&auto=format&fit=crop&q=80', date: 'Aug 19', likes: 16000, isFree: true, panels: SAMPLE_PANELS },
    ],
  }
];

export const RECOMMENDED_WEBTOONS: WebtoonItem[] = [
  {
    id: 'rec-1',
    title: 'Acception',
    author: 'Colourbee',
    genre: 'Drama',
    subGenres: ['High School', 'Identity', 'Art'],
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    summary: 'Arvid embraces his colorful fashion despite ruthless school gossip, inspiring an unlikely squad of misfits.',
    rating: 9.91,
    viewsCount: '27.9M',
    subscribersCount: '1.3M',
    subLabel: '98% Match',
    subLabelColor: '#0A84FF',
    matchScore: 98,
    recommendationReason: 'Because you like Character-driven Stories',
    topBadge: 'Popular',
    topBadgeText: '98% Match',
    dayOfWeek: 'MON',
    totalEpisodes: 140,
    episodes: [
      { id: 'r1-1', number: 1, title: 'Episode 1: Neon Hair', thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&auto=format&fit=crop&q=80', date: 'Aug 23', likes: 36000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'rec-2',
    title: 'Love 4 a Walk',
    author: 'Tee & Jay',
    genre: 'Comedy',
    subGenres: ['Dogs', 'Romance', 'Neighbors'],
    coverImage: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&auto=format&fit=crop&q=80',
    summary: 'Two rival dog owners keep crossing paths in the dog park, until their golden retrievers fall in love first.',
    rating: 9.81,
    viewsCount: '9.4M',
    subscribersCount: '520K',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    matchScore: 96,
    recommendationReason: 'Top Pick in Wholesome Comedy',
    dayOfWeek: 'MON',
    totalEpisodes: 54,
    episodes: [
      { id: 'r2-1', number: 1, title: 'Episode 1: The Leash Mix-up', thumbnail: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=400&auto=format&fit=crop&q=80', date: 'Aug 15', likes: 18000, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'rec-3',
    title: 'THE OTHERWORLDLY FAMILY MAN',
    author: 'K-Story & Studio M',
    genre: 'Fantasy',
    subGenres: ['Isekai', 'Found Family', 'Magic'],
    coverImage: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    summary: 'An ordinary chef awakens in a magical realm, building an unbreakable family of misfits.',
    rating: 9.87,
    viewsCount: '18.4M',
    subscribersCount: '920K',
    subLabel: '99% Match',
    subLabelColor: '#0A84FF',
    matchScore: 99,
    recommendationReason: 'Trending #1 in Fantasy',
    dayOfWeek: 'MON',
    totalEpisodes: 65,
    episodes: [
      { id: 'r3-1', number: 1, title: 'Episode 1: The Golden Portal', thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&auto=format&fit=crop&q=80', date: 'Aug 24', likes: 24500, isFree: true, panels: SAMPLE_PANELS },
    ],
  },
  {
    id: 'rec-4',
    title: 'The Mafia Nanny',
    author: 'Violet Matter',
    genre: 'Thriller',
    subGenres: ['Action', 'Romance', 'Mafia'],
    coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80',
    summary: 'An elite undercover bodyguard takes a job as the live-in nanny for a powerful crime boss.',
    rating: 9.89,
    viewsCount: '28.1M',
    subscribersCount: '1.4M',
    subLabel: '10+ free episodes',
    subLabelColor: '#0A84FF',
    matchScore: 94,
    dayOfWeek: 'WED',
    totalEpisodes: 94,
    episodes: [
      { id: 'r4-1', number: 1, title: 'Episode 1: The Interview', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80', date: 'Aug 12', likes: 31000, isFree: true, panels: SAMPLE_PANELS },
    ],
  }
];

export const WEBTOON_GRID_ITEMS: WebtoonItem[] = [
  ...TRENDING_WEBTOONS,
  ...NEW_RELEASES_WEBTOONS,
  ...RECOMMENDED_WEBTOONS,
];

export const ALL_WEBTOONS: WebtoonItem[] = [
  ...FEATURED_WEBTOONS,
  ...CONTINUE_READING_ITEMS,
  ...TRENDING_WEBTOONS,
  ...NEW_RELEASES_WEBTOONS,
  ...RECOMMENDED_WEBTOONS,
];


