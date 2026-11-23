export type GenderPresentation = 'feminine' | 'masculine' | 'neutral';

export type FaceShape = 'oval' | 'heart' | 'round' | 'sculpted' | 'defined';

export type HairStyleId =
  | 'silky_waves'
  | 'airy_bob'
  | 'wispy_long'
  | 'side_ponytail'
  | 'hime_cut'
  | 'comma_hair'
  | 'two_block'
  | 'soft_curls'
  | 'wolf_layers'
  | 'sleek_part';

export type ExpressionId =
  | 'happy'
  | 'shy'
  | 'sad'
  | 'angry'
  | 'surprised'
  | 'smiling';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export type LocationId =
  | 'street'
  | 'cafe'
  | 'boutique'
  | 'photo_studio'
  | 'metro'
  | 'taxi'
  | 'park'
  | 'home';

export type OutfitCategory =
  | 'streetwear'
  | 'casual'
  | 'dresses'
  | 'school'
  | 'hanbok'
  | 'winter'
  | 'formal'
  | 'special';

export type RelationshipStatus =
  | 'Acquaintance'
  | 'Friend'
  | 'Close Friend'
  | 'Mutual Crush'
  | 'Dating';

export type StudioPhotoMode = 'solo' | 'couple' | 'character' | 'outfit';

export type StudioPoseId =
  | 'wave'
  | 'heart'
  | 'peace'
  | 'cafe_pose'
  | 'editorial';

export type StudioFrameId =
  | 'pastel_ribbon'
  | 'webtoon_panel'
  | 'polaroid_seoul'
  | 'floral_diary'
  | 'minimal_white';

export type CharacterAppearance = {
  presentation: GenderPresentation;
  faceShape: FaceShape;
  hairStyle: HairStyleId;
  hairColor: string;
  skinTone: string;
  eyeColor: string;
  equippedOutfitId: string;
  accessory?: 'none' | 'glasses' | 'earrings' | 'beret' | 'headphones';
};

export interface PlayerCharacter extends CharacterAppearance {
  id: string;
  name: string;
  masterReferenceAssetId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface OutfitItem {
  id: string;
  name: string;
  category: OutfitCategory;
  price: number;
  description: string;
  fabricNote: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  silhouette: 'coat' | 'dress' | 'hanbok' | 'blazer' | 'hoodie' | 'knit' | 'suit' | 'stage';
  reactionMood: string;
  isGenerated?: boolean;
  customAssetId?: string;
}

export interface GiftItem {
  id: string;
  name: string;
  price: number;
  category: 'sweet' | 'craft' | 'flower' | 'keepsake';
  description: string;
  accentColor: string;
}

export interface CafeMenuItem {
  id: string;
  name: string;
  koreanName: string;
  kind: 'drink' | 'dessert';
  price: number;
  description: string;
  accentColor: string;
}

export interface StoryEventMilestone {
  id: string;
  title: string;
  requiredAffection: number;
  location: LocationId;
  teaser: string;
  dialogue: DialogueLine[];
}

export interface DialogueChoice {
  id: string;
  label: string;
  affectionDelta: number;
  expression: ExpressionId;
  replyText: string;
  rememberKey?: string;
  rememberValue?: string;
}

export interface DialogueLine {
  speaker: 'npc' | 'narrator' | 'player';
  speakerName?: string;
  expression?: ExpressionId;
  text: string;
  choices?: DialogueChoice[];
}

export interface MainCharacterProfile {
  id: string;
  name: string;
  koreanName: string;
  age: number;
  role: string;
  personality: string;
  backstory: string;
  appearance: CharacterAppearance;
  signatureColor: string;
  favoriteGifts: string[];
  likes: string[];
  dislikes: string[];
  schedule: Record<TimeOfDay, LocationId>;
  greetingByTime: Record<TimeOfDay, string>;
  outfitReactions: Partial<Record<OutfitCategory, string>>;
  cafePreferences: {
    favoriteDrinkId: string;
    favoriteDessertId: string;
    favoriteReply: string;
    otherReply: string;
  };
  storyEvents: StoryEventMilestone[];
}

export interface RelationshipState {
  affection: number;
  conversationsHad: number;
  datesHad: number;
  giftsGiven: number;
  unlockedEventIds: string[];
  rememberedChoices: Record<string, string>;
  lastMetDay: number;
}

export interface SavedStudioCreation {
  id: string;
  title: string;
  mode: StudioPhotoMode;
  backgroundId: LocationId;
  partnerId?: string;
  pose: StudioPoseId;
  expression: ExpressionId;
  frame: StudioFrameId;
  stickers: string[];
  caption: string;
  outfitId: string;
  assetId: string;
  createdAt: number;
}

export interface AssetRecord {
  id: string;
  kind:
    | 'character_reference'
    | 'character_expression'
    | 'outfit_illustration'
    | 'background'
    | 'story_scene'
    | 'studio_photo';
  characterId?: string;
  mimeType: string;
  dataUrl: string;
  width: number;
  height: number;
  source: 'gemini' | 'illustrated';
  promptHash?: string;
  createdAt: number;
}

export interface ArtworkGenerationState {
  status: 'idle' | 'loading' | 'cached' | 'unavailable' | 'error';
  dataUrl?: string;
  source?: 'gemini' | 'illustrated';
  message?: string;
  lastRequestedAt?: number;
}

export interface GameSettings {
  textSpeed: 'normal' | 'fast';
  soundEnabled: boolean;
  swipeMoveEnabled: boolean;
}

export interface GameSaveState {
  version: number;
  player: PlayerCharacter;
  money: number;
  day: number;
  timeOfDay: TimeOfDay;
  currentLocation: LocationId;
  playerX: number; // 0 - 100 world coordinate percentage on street
  facing: 'left' | 'right';
  ownedOutfitIds: string[];
  customOutfits: OutfitItem[];
  inventoryGifts: Record<string, number>;
  relationships: Record<string, RelationshipState>;
  unlockedLocations: LocationId[];
  choiceLog: Array<{ characterId: string; key: string; value: string; day: number }>;
  studioGallery: SavedStudioCreation[];
  settings: GameSettings;
  lastSavedAt: number;
}
