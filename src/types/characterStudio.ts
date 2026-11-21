export type CharacterFrame = 'female' | 'male';

export type FaceShape = 'oval' | 'heart' | 'round' | 'square' | 'sculpted';

export type GraphicsQuality = 'high' | 'medium' | 'low';

export type WorldDistrictId =
  | 'seongsu_street'
  | 'han_river_park'
  | 'hongdae_night'
  | 'busan_beach'
  | 'photo_studio';

export type TimeOfDayId = 'daytime' | 'sunset' | 'night';

export type WeatherId = 'clear' | 'cloudy' | 'rain';

export type FabricMaterialId =
  | 'cotton'
  | 'denim'
  | 'leather'
  | 'wool'
  | 'silk'
  | 'knit'
  | 'polyester';

export type HairStyleId =
  | 'long_waves'
  | 'silky_straight'
  | 'wolf_cut'
  | 'high_ponytail'
  | 'chic_buns'
  | 'bob_cut'
  | 'layered_curtains'
  | 'textured_curls'
  | 'korean_two_block'
  | 'comma_hair'
  | 'short_crop';

export type BangsStyle = 'none' | 'wispy' | 'side_part';

export type OutfitPresetId =
  | 'custom'
  | 'silk_slip_dress'
  | 'pleated_mini_dress'
  | 'evening_gown'
  | 'blazer_skirt_set'
  | 'trench_suit'
  | 'knit_dress'
  | 'tennis_set'
  | 'streetwear_set'
  | 'korean_casual_denim'
  | 'leather_city_look';

export type TopStyleId =
  | 'silk_blouse'
  | 'crop_top'
  | 'turtleneck'
  | 'fitted_tee'
  | 'blazer_top'
  | 'knit_sweater'
  | 'hoodie';

export type BottomStyleId =
  | 'pleated_skirt'
  | 'midi_skirt'
  | 'tailored_trousers'
  | 'denim_jeans'
  | 'tailored_shorts'
  | 'cargo_pants';

export type OuterwearStyleId =
  | 'none'
  | 'cropped_jacket'
  | 'trench_coat'
  | 'cardigan'
  | 'leather_jacket';

export type FootwearStyleId = 'classic_heels' | 'ankle_boots' | 'minimal_sneakers' | 'loafers';
export type GlassesStyleId = 'none' | 'cat_eye' | 'round_wire' | 'sunglasses';
export type JewelryStyleId = 'none' | 'pearl_earrings' | 'gold_hoops' | 'layered_necklace';
export type BagStyleId = 'none' | 'crossbody' | 'mini_tote';

export type CharacterPoseId =
  | 'natural_stand'
  | 'studio_sit'
  | 'runway_walk'
  | 'cute_wave'
  | 'fashion_hip'
  | 'confident_crossed'
  | 'playful_peace'
  | 'phone_check';

export type CharacterExpressionId =
  | 'warm_smile'
  | 'big_laugh'
  | 'serene_gaze'
  | 'shy_glance'
  | 'playful_wink'
  | 'soft_neutral';

export type StudioEnvironmentId =
  | 'white_studio'
  | 'golden_terrace'
  | 'botanical_conservatory'
  | 'twilight_rooftop'
  | 'cafe_patio';

export type StudioLightingId = 'studio_soft' | 'daylight' | 'sunset' | 'nighttime' | 'editorial';

export type StudioCameraPresetId =
  | 'editorial_portrait'
  | 'full_body'
  | 'three_quarter'
  | 'low_angle'
  | 'candid_side';

export type StudioPhotoFilterId = 'natural' | 'editorial_crisp' | 'warm_film' | 'monochrome' | 'golden_glow';

export type StudioPropId =
  | 'dog_retriever'
  | 'cat_fluffy'
  | 'velvet_chair'
  | 'flower_arch'
  | 'classic_coupe'
  | 'bistro_table'
  | 'lounge_sofa';

export interface CharacterConfig {
  id: string;
  name: string;
  frame: CharacterFrame;

  // Complexion & Facial Features
  skinTone: string;
  blushIntensity: number;
  frecklesIntensity: number;
  faceShape: FaceShape;
  jawWidth: number;
  cheekFullness: number;
  eyeSize: number;
  eyeColor: string;
  eyebrowArch: number;
  eyebrowThickness: number;
  noseBridgeWidth: number;
  noseTipLength: number;
  lipFullness: number;
  lipColor: string;

  // Hair
  hairStyle: HairStyleId;
  bangsStyle: BangsStyle;
  hairLength: number;
  hairColor: string;
  hairGloss: number;

  // Proportions
  heightScale: number;
  shoulderScale: number;
  waistScale: number;
  hipScale: number;

  // Wardrobe & Material Physics
  outfitPreset: OutfitPresetId;
  topStyle: TopStyleId;
  bottomStyle: BottomStyleId;
  outerwearStyle: OuterwearStyleId;
  footwearStyle: FootwearStyleId;
  primaryOutfitColor: string;
  secondaryOutfitColor: string;
  footwearColor: string;
  primaryFabric: FabricMaterialId;
  secondaryFabric: FabricMaterialId;
  glassesStyle: GlassesStyleId;
  jewelryStyle: JewelryStyleId;
  bagStyle: BagStyleId;

  // Pose & Expression
  pose: CharacterPoseId;
  expression: CharacterExpressionId;
  updatedAt: number;
}

export interface SavedOutfitLook {
  id: string;
  name: string;
  outfitPreset: OutfitPresetId;
  topStyle: TopStyleId;
  bottomStyle: BottomStyleId;
  outerwearStyle: OuterwearStyleId;
  footwearStyle: FootwearStyleId;
  primaryOutfitColor: string;
  secondaryOutfitColor: string;
  footwearColor: string;
  primaryFabric: FabricMaterialId;
  secondaryFabric: FabricMaterialId;
  glassesStyle: GlassesStyleId;
  jewelryStyle: JewelryStyleId;
  bagStyle: BagStyleId;
}

export interface StudioSceneConfig {
  district: WorldDistrictId;
  timeOfDay: TimeOfDayId;
  weather: WeatherId;
  environment: StudioEnvironmentId;
  lighting: StudioLightingId;
  cameraPreset: StudioCameraPresetId;
  photoFilter: StudioPhotoFilterId;
  zoomDistance: number;
  cameraHeightOffset: number;
  characterRotationY: number;
  props: StudioPropId[];
}

export interface SavedStudioPhoto {
  id: string;
  characterId: string;
  characterName: string;
  imageDataUrl: string;
  caption?: string;
  stickerLabel?: string;
  createdAt: number;
  environment: StudioEnvironmentId;
  lighting: StudioLightingId;
  district?: WorldDistrictId;
}

export interface WorldDistrictInfo {
  id: WorldDistrictId;
  name: string;
  koreanName: string;
  subtitle: string;
  description: string;
  travelCost: number;
  defaultTime: TimeOfDayId;
  defaultWeather: WeatherId;
  highlights: string[];
}

export interface StoreFashionItem {
  id: string;
  name: string;
  category: 'outfit' | 'outerwear' | 'footwear' | 'accessory';
  price: number;
  fabric: FabricMaterialId;
  description: string;
  previewColor: string;
  applyPatch: Partial<CharacterConfig>;
}

export interface WalletState {
  balance: number;
  ownedItemIds: string[];
  discoveredDistricts: WorldDistrictId[];
  photosTaken: number;
  lastDailyClaimAt: number;
}

export const WORLD_DISTRICTS: WorldDistrictInfo[] = [
  {
    id: 'seongsu_street',
    name: 'Seongsu Fashion Street',
    koreanName: '성수동 패션 거리',
    subtitle: 'Boutiques, flagship cafés & sunlit stone sidewalks',
    description:
      'Seoul’s creative fashion district lined with curated designer boutiques, warm bakery cafés, crosswalks, and ginkgo trees.',
    travelCost: 0,
    defaultTime: 'daytime',
    defaultWeather: 'clear',
    highlights: ['Mode Boutique', 'Seongsu Roastery Café', 'Crosswalk Plaza'],
  },
  {
    id: 'han_river_park',
    name: 'Han River Waterfront',
    koreanName: '한강 공원',
    subtitle: 'Riverside promenade, skyline bridge & golden reflections',
    description:
      'Open riverside walking path overlooking the Seoul skyline, illuminated bridges, park benches, and waterfront breeze.',
    travelCost: 2400,
    defaultTime: 'sunset',
    defaultWeather: 'clear',
    highlights: ['Waterfront Promenade', 'Sunset Photo Overlook', 'Riverside Café'],
  },
  {
    id: 'hongdae_night',
    name: 'Hongdae Evening Alley',
    koreanName: '홍대 야경 거리',
    subtitle: 'Warm storefront glow, night cafés & urban street style',
    description:
      'Vibrant evening street culture with warm boutique windows, tasteful Hangul signage, cozy café terraces, and wet-asphalt reflections.',
    travelCost: 3200,
    defaultTime: 'night',
    defaultWeather: 'rain',
    highlights: ['Night Apparel Shop', 'Terrace Bistro', 'Rain-Slick Alley'],
  },
  {
    id: 'busan_beach',
    name: 'Haeundae Coast',
    koreanName: '해운대 해변',
    subtitle: 'Coastal wooden boardwalk, ocean waves & seaside breeze',
    description:
      'Scenic southern coastline with timber boardwalks, gentle surf reflections, coastal palms, and bright ocean air.',
    travelCost: 6500,
    defaultTime: 'daytime',
    defaultWeather: 'clear',
    highlights: ['Boardwalk Deck', 'Ocean Lookouts', 'Seaside Terrace'],
  },
  {
    id: 'photo_studio',
    name: 'Editorial Photo Studio',
    koreanName: '서울 스튜디오',
    subtitle: 'Private cyclorama loft for crisp portrait & Story shoots',
    description:
      'Dedicated indoor photography loft with controlled studio key lighting and clean editorial framing.',
    travelCost: 0,
    defaultTime: 'daytime',
    defaultWeather: 'clear',
    highlights: ['Portrait Lighting', 'Clean Cyclorama', 'Avatar Framing'],
  },
];

export const FASHION_STORE_CATALOG: StoreFashionItem[] = [
  {
    id: 'store_seongsu_trench',
    name: 'Seongsu Wool Trench Set',
    category: 'outfit',
    price: 28000,
    fabric: 'wool',
    description: 'Tailored camel wool trench layered over fine knitwear and dark trousers.',
    previewColor: '#D8C7AE',
    applyPatch: {
      outfitPreset: 'trench_suit',
      outerwearStyle: 'trench_coat',
      topStyle: 'turtleneck',
      bottomStyle: 'tailored_trousers',
      footwearStyle: 'loafers',
      primaryOutfitColor: '#D8C7AE',
      secondaryOutfitColor: '#1A1B1E',
      primaryFabric: 'wool',
      secondaryFabric: 'cotton',
    },
  },
  {
    id: 'store_leather_city',
    name: 'Hannam Leather Jacket Look',
    category: 'outerwear',
    price: 34000,
    fabric: 'leather',
    description: 'Full-grain matte black leather jacket paired with selvedge denim and boots.',
    previewColor: '#1E1F24',
    applyPatch: {
      outfitPreset: 'leather_city_look',
      outerwearStyle: 'leather_jacket',
      topStyle: 'fitted_tee',
      bottomStyle: 'denim_jeans',
      footwearStyle: 'ankle_boots',
      primaryOutfitColor: '#F4F1EA',
      secondaryOutfitColor: '#2D4663',
      primaryFabric: 'leather',
      secondaryFabric: 'denim',
    },
  },
  {
    id: 'store_silk_slip',
    name: 'Apgujeong Silk Evening Set',
    category: 'outfit',
    price: 39000,
    fabric: 'silk',
    description: 'Fluid satin-silk dress with tailored drape and classic studio heels.',
    previewColor: '#6F2232',
    applyPatch: {
      outfitPreset: 'evening_gown',
      outerwearStyle: 'none',
      footwearStyle: 'classic_heels',
      primaryOutfitColor: '#6F2232',
      secondaryOutfitColor: '#D8C7AE',
      primaryFabric: 'silk',
      secondaryFabric: 'silk',
    },
  },
  {
    id: 'store_korean_denim',
    name: 'Hongdae Knit & Selvedge Denim',
    category: 'outfit',
    price: 22000,
    fabric: 'knit',
    description: 'Soft cable-knit sweater paired with indigo selvedge jeans and clean sneakers.',
    previewColor: '#495867',
    applyPatch: {
      outfitPreset: 'korean_casual_denim',
      topStyle: 'knit_sweater',
      bottomStyle: 'denim_jeans',
      outerwearStyle: 'none',
      footwearStyle: 'minimal_sneakers',
      primaryOutfitColor: '#495867',
      secondaryOutfitColor: '#2D4663',
      primaryFabric: 'knit',
      secondaryFabric: 'denim',
    },
  },
  {
    id: 'store_chelsea_boots',
    name: 'Suede & Leather Chelsea Boots',
    category: 'footwear',
    price: 16500,
    fabric: 'leather',
    description: 'Hand-finished ankle boots built for rainy Seoul sidewalks.',
    previewColor: '#3B2820',
    applyPatch: {
      footwearStyle: 'ankle_boots',
      footwearColor: '#4B3629',
    },
  },
  {
    id: 'store_sunglasses_editorial',
    name: 'Gentle Seoul Tinted Frames',
    category: 'accessory',
    price: 14000,
    fabric: 'polyester',
    description: 'Acetate editorial sunglasses with warm smoke lenses.',
    previewColor: '#181A1F',
    applyPatch: {
      glassesStyle: 'sunglasses',
    },
  },
  {
    id: 'store_mini_tote',
    name: 'Structured Calfskin Mini Tote',
    category: 'accessory',
    price: 24500,
    fabric: 'leather',
    description: 'Architectural leather handbag with brushed brass hardware.',
    previewColor: '#4B3629',
    applyPatch: {
      bagStyle: 'mini_tote',
    },
  },
];

export const FABRIC_MATERIALS: Array<{ id: FabricMaterialId; label: string }> = [
  { id: 'cotton', label: 'Cotton' },
  { id: 'denim', label: 'Denim' },
  { id: 'leather', label: 'Leather' },
  { id: 'wool', label: 'Wool' },
  { id: 'silk', label: 'Silk' },
  { id: 'knit', label: 'Knitwear' },
  { id: 'polyester', label: 'Tech Poly' },
];

export const SKIN_TONES = [
  { id: 'porcelain', label: 'Fair Porcelain', hex: '#F3DACB' },
  { id: 'ivory', label: 'Warm Ivory', hex: '#E9C3AC' },
  { id: 'beige', label: 'Natural Sand', hex: '#DBA687' },
  { id: 'honey', label: 'Golden Honey', hex: '#C38863' },
  { id: 'caramel', label: 'Caramel', hex: '#A56A48' },
  { id: 'chestnut', label: 'Chestnut', hex: '#814E33' },
  { id: 'espresso', label: 'Deep Espresso', hex: '#5A3422' },
];

export const HAIR_COLORS = [
  { id: 'obsidian', label: 'Natural Black', hex: '#17171B' },
  { id: 'espresso', label: 'Dark Espresso', hex: '#342219' },
  { id: 'chestnut', label: 'Warm Brown', hex: '#5E3926' },
  { id: 'caramel', label: 'Ash Caramel', hex: '#8E6242' },
  { id: 'honey_blonde', label: 'Honey Blonde', hex: '#C5AA7A' },
  { id: 'platinum', label: 'Ash Platinum', hex: '#DDD6C7' },
  { id: 'auburn', label: 'Deep Auburn', hex: '#6F2C22' },
  { id: 'silver_ash', label: 'Charcoal Ash', hex: '#636872' },
];

export const EYE_COLORS = [
  { id: 'dark_brown', label: 'Deep Brown', hex: '#281A14' },
  { id: 'amber', label: 'Warm Amber', hex: '#6C441D' },
  { id: 'hazel', label: 'Olive Hazel', hex: '#565D39' },
  { id: 'ocean_blue', label: 'Steel Blue', hex: '#2F5E8E' },
  { id: 'slate_grey', label: 'Ash Grey', hex: '#55616E' },
  { id: 'forest', label: 'Muted Moss', hex: '#3B5E4A' },
];

export const LIP_COLORS = [
  { id: 'natural', label: 'Natural Matte', hex: '#B4726E' },
  { id: 'rosewood', label: 'MLBB Rosewood', hex: '#9D565B' },
  { id: 'peach', label: 'Soft Coral', hex: '#BE7466' },
  { id: 'berry', label: 'Muted Berry', hex: '#7A3241' },
  { id: 'crimson', label: 'Brick Red', hex: '#932D2E' },
  { id: 'nude', label: 'Skin Nude', hex: '#AC7C6D' },
];

export const FASHION_COLORS = [
  { id: 'ivory', label: 'Off-White', hex: '#F2EFE8' },
  { id: 'noir', label: 'Charcoal Black', hex: '#1B1C20' },
  { id: 'cobalt', label: 'Cobalt Blue', hex: '#007AFF' },
  { id: 'slate', label: 'Seoul Slate', hex: '#495867' },
  { id: 'champagne', label: 'Warm Trench', hex: '#D6C4AA' },
  { id: 'burgundy', label: 'Wine', hex: '#6B2432' },
  { id: 'sage', label: 'Olive Sage', hex: '#647566' },
  { id: 'espresso', label: 'Espresso', hex: '#4B3629' },
  { id: 'denim', label: 'Raw Indigo', hex: '#2C445F' },
  { id: 'blush_sand', label: 'Oatmeal', hex: '#CFC5BA' },
];

export const HAIR_STYLES: Array<{ id: HairStyleId; label: string; category: 'female' | 'male' | 'all' }> = [
  { id: 'long_waves', label: 'Korean Waves', category: 'female' },
  { id: 'silky_straight', label: 'Long Layered', category: 'female' },
  { id: 'wolf_cut', label: 'Textured Wolf', category: 'all' },
  { id: 'high_ponytail', label: 'Sleek Ponytail', category: 'female' },
  { id: 'chic_buns', label: 'Updo Chignon', category: 'female' },
  { id: 'bob_cut', label: 'Tassel Bob', category: 'all' },
  { id: 'layered_curtains', label: 'Leaf Curtain', category: 'all' },
  { id: 'textured_curls', label: 'Soft Perm', category: 'all' },
  { id: 'korean_two_block', label: 'Two-Block Cut', category: 'male' },
  { id: 'comma_hair', label: 'Comma Part', category: 'male' },
  { id: 'short_crop', label: 'Tailored Crop', category: 'male' },
];

export const OUTFIT_PRESETS: Array<{
  id: OutfitPresetId;
  label: string;
  frameHint: 'female' | 'all';
  primary: string;
  secondary: string;
  footwear: FootwearStyleId;
  outerwear: OuterwearStyleId;
  primaryFabric: FabricMaterialId;
  secondaryFabric: FabricMaterialId;
}> = [
  {
    id: 'silk_slip_dress',
    label: 'Silk Slip Dress',
    frameHint: 'female',
    primary: '#1B1C20',
    secondary: '#D6C4AA',
    footwear: 'classic_heels',
    outerwear: 'none',
    primaryFabric: 'silk',
    secondaryFabric: 'silk',
  },
  {
    id: 'pleated_mini_dress',
    label: 'Pleated Dress',
    frameHint: 'female',
    primary: '#F2EFE8',
    secondary: '#007AFF',
    footwear: 'classic_heels',
    outerwear: 'cropped_jacket',
    primaryFabric: 'cotton',
    secondaryFabric: 'wool',
  },
  {
    id: 'evening_gown',
    label: 'Evening Gown',
    frameHint: 'female',
    primary: '#6B2432',
    secondary: '#D6C4AA',
    footwear: 'classic_heels',
    outerwear: 'none',
    primaryFabric: 'silk',
    secondaryFabric: 'silk',
  },
  {
    id: 'blazer_skirt_set',
    label: 'Blazer & Skirt',
    frameHint: 'female',
    primary: '#495867',
    secondary: '#F2EFE8',
    footwear: 'ankle_boots',
    outerwear: 'cropped_jacket',
    primaryFabric: 'wool',
    secondaryFabric: 'cotton',
  },
  {
    id: 'knit_dress',
    label: 'Cozy Knit Dress',
    frameHint: 'female',
    primary: '#D6C4AA',
    secondary: '#4B3629',
    footwear: 'ankle_boots',
    outerwear: 'cardigan',
    primaryFabric: 'knit',
    secondaryFabric: 'wool',
  },
  {
    id: 'korean_casual_denim',
    label: 'Seoul Casual',
    frameHint: 'all',
    primary: '#495867',
    secondary: '#2C445F',
    footwear: 'minimal_sneakers',
    outerwear: 'none',
    primaryFabric: 'knit',
    secondaryFabric: 'denim',
  },
  {
    id: 'trench_suit',
    label: 'Tailored Trench',
    frameHint: 'all',
    primary: '#D6C4AA',
    secondary: '#1B1C20',
    footwear: 'loafers',
    outerwear: 'trench_coat',
    primaryFabric: 'wool',
    secondaryFabric: 'cotton',
  },
  {
    id: 'leather_city_look',
    label: 'Leather Jacket',
    frameHint: 'all',
    primary: '#F2EFE8',
    secondary: '#2C445F',
    footwear: 'ankle_boots',
    outerwear: 'leather_jacket',
    primaryFabric: 'leather',
    secondaryFabric: 'denim',
  },
  {
    id: 'streetwear_set',
    label: 'Urban Minimal',
    frameHint: 'all',
    primary: '#1B1C20',
    secondary: '#2C445F',
    footwear: 'minimal_sneakers',
    outerwear: 'cropped_jacket',
    primaryFabric: 'cotton',
    secondaryFabric: 'denim',
  },
];

export const STUDIO_POSES: Array<{ id: CharacterPoseId; label: string }> = [
  { id: 'natural_stand', label: 'Standing' },
  { id: 'fashion_hip', label: 'Editorial' },
  { id: 'runway_walk', label: 'Striding' },
  { id: 'studio_sit', label: 'Sitting' },
  { id: 'phone_check', label: 'Phone Check' },
  { id: 'cute_wave', label: 'Wave' },
  { id: 'confident_crossed', label: 'Arms Crossed' },
  { id: 'playful_peace', label: 'Casual Peace' },
];

export const STUDIO_EXPRESSIONS: Array<{ id: CharacterExpressionId; label: string }> = [
  { id: 'warm_smile', label: 'Soft Smile' },
  { id: 'big_laugh', label: 'Candid Laugh' },
  { id: 'serene_gaze', label: 'Eye Contact' },
  { id: 'shy_glance', label: 'Side Glance' },
  { id: 'playful_wink', label: 'Wink' },
  { id: 'soft_neutral', label: 'Natural Calm' },
];

export const STUDIO_ENVIRONMENTS: Array<{ id: StudioEnvironmentId; label: string; subtitle: string }> = [
  { id: 'white_studio', label: 'Minimal Studio', subtitle: 'Seamless architectural cyclorama' },
  { id: 'golden_terrace', label: 'Sunset Terrace', subtitle: 'Stone overlook & Seoul horizon' },
  { id: 'botanical_conservatory', label: 'Conservatory', subtitle: 'Glasshouse & greenery' },
  { id: 'twilight_rooftop', label: 'Night Rooftop', subtitle: 'Evening city horizon' },
  { id: 'cafe_patio', label: 'Seongsu Patio', subtitle: 'Warm stone café courtyard' },
];

export const STUDIO_LIGHTING_MODES: Array<{ id: StudioLightingId; label: string }> = [
  { id: 'studio_soft', label: 'Studio' },
  { id: 'daylight', label: 'Daylight' },
  { id: 'sunset', label: 'Sunset' },
  { id: 'nighttime', label: 'Nighttime' },
  { id: 'editorial', label: 'Dramatic' },
];

export const STUDIO_CAMERA_PRESETS: Array<{ id: StudioCameraPresetId; label: string }> = [
  { id: 'editorial_portrait', label: 'Portrait' },
  { id: 'three_quarter', label: '3/4 Look' },
  { id: 'full_body', label: 'Full Body' },
  { id: 'low_angle', label: 'Low Angle' },
  { id: 'candid_side', label: 'Side Angle' },
];

export const STUDIO_PHOTO_FILTERS: Array<{ id: StudioPhotoFilterId; label: string; cssFilter: string }> = [
  { id: 'natural', label: 'Natural', cssFilter: 'none' },
  { id: 'editorial_crisp', label: 'Cinema Crisp', cssFilter: 'contrast(1.08) saturate(1.04)' },
  { id: 'warm_film', label: '35mm Film', cssFilter: 'sepia(0.14) saturate(1.08) contrast(1.05)' },
  { id: 'golden_glow', label: 'Golden Hour', cssFilter: 'brightness(1.03) sepia(0.16) saturate(1.14)' },
  { id: 'monochrome', label: 'Leica B&W', cssFilter: 'grayscale(1) contrast(1.16)' },
];

export const STUDIO_PROPS: Array<{ id: StudioPropId; label: string; category: 'pet' | 'furniture' | 'scene' }> = [
  { id: 'dog_retriever', label: 'Golden Retriever', category: 'pet' },
  { id: 'cat_fluffy', label: 'Street Cat', category: 'pet' },
  { id: 'velvet_chair', label: 'Velvet Chair', category: 'furniture' },
  { id: 'flower_arch', label: 'Botanicals', category: 'scene' },
  { id: 'classic_coupe', label: 'Seoul Coupe', category: 'scene' },
  { id: 'bistro_table', label: 'Café Table', category: 'furniture' },
  { id: 'lounge_sofa', label: 'Lounge Sofa', category: 'furniture' },
];

export function createDefaultCharacter(
  frame: CharacterFrame = 'female',
  id: string = `char-${Date.now()}`,
  name: string = frame === 'female' ? 'Seo-yeon' : 'Min-jun'
): CharacterConfig {
  const isFemale = frame === 'female';
  return {
    id,
    name,
    frame,
    skinTone: '#E9C3AC',
    blushIntensity: isFemale ? 0.28 : 0.1,
    frecklesIntensity: 0.08,
    faceShape: isFemale ? 'oval' : 'sculpted',
    jawWidth: isFemale ? 0.94 : 1.04,
    cheekFullness: isFemale ? 1.0 : 0.95,
    eyeSize: isFemale ? 1.02 : 0.96,
    eyeColor: '#281A14',
    eyebrowArch: isFemale ? 0.12 : 0.02,
    eyebrowThickness: isFemale ? 0.92 : 1.12,
    noseBridgeWidth: isFemale ? 0.94 : 1.02,
    noseTipLength: 1.0,
    lipFullness: isFemale ? 1.02 : 0.94,
    lipColor: isFemale ? '#9D565B' : '#AC7C6D',

    hairStyle: isFemale ? 'long_waves' : 'comma_hair',
    bangsStyle: isFemale ? 'wispy' : 'side_part',
    hairLength: isFemale ? 1.06 : 0.85,
    hairColor: '#17171B',
    hairGloss: 0.58,

    heightScale: isFemale ? 0.98 : 1.04,
    shoulderScale: isFemale ? 0.94 : 1.06,
    waistScale: isFemale ? 0.9 : 1.0,
    hipScale: isFemale ? 1.02 : 0.96,

    outfitPreset: isFemale ? 'blazer_skirt_set' : 'trench_suit',
    topStyle: isFemale ? 'silk_blouse' : 'turtleneck',
    bottomStyle: isFemale ? 'pleated_skirt' : 'tailored_trousers',
    outerwearStyle: isFemale ? 'cropped_jacket' : 'trench_coat',
    footwearStyle: isFemale ? 'ankle_boots' : 'loafers',
    primaryOutfitColor: isFemale ? '#495867' : '#D6C4AA',
    secondaryOutfitColor: isFemale ? '#F2EFE8' : '#1B1C20',
    footwearColor: '#1B1C20',
    primaryFabric: 'wool',
    secondaryFabric: 'cotton',
    glassesStyle: 'none',
    jewelryStyle: isFemale ? 'pearl_earrings' : 'none',
    bagStyle: isFemale ? 'crossbody' : 'none',

    pose: 'natural_stand',
    expression: 'soft_neutral',
    updatedAt: Date.now(),
  };
}

export const DEFAULT_STUDIO_SCENE: StudioSceneConfig = {
  district: 'seongsu_street',
  timeOfDay: 'daytime',
  weather: 'clear',
  environment: 'cafe_patio',
  lighting: 'daylight',
  cameraPreset: 'three_quarter',
  photoFilter: 'natural',
  zoomDistance: 3.1,
  cameraHeightOffset: 0.06,
  characterRotationY: 0.0,
  props: [],
};
