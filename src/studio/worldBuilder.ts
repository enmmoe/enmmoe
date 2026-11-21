import * as THREE from 'three';
import {
  CharacterConfig,
  GraphicsQuality,
  TimeOfDayId,
  WeatherId,
  WorldDistrictId,
  createDefaultCharacter,
} from '../types/characterStudio';
import {
  buildCharacterRig,
  CharacterRig,
  updateCharacterAnimation,
} from './characterBuilder';
import { disposeObject3D } from './environmentBuilder';
import {
  createKoreanSignTexture,
  createRoadSurfaceMaps,
  createSidewalkMaps,
  createStudioFloorTexture,
} from './textures';

export interface DistrictHotspot {
  id: string;
  type: 'shop' | 'cafe' | 'transit' | 'photo';
  label: string;
  koreanLabel: string;
  x: number;
  z: number;
  radius: number;
}

export interface AabbCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface NpcActor {
  rig: CharacterRig;
  mode: 'walk' | 'idle' | 'sit' | 'phone';
  waypoints: THREE.Vector3[];
  currentWaypoint: number;
  speed: number;
  yaw: number;
  expression: CharacterConfig['expression'];
}

export interface RainSystem {
  mesh: THREE.LineSegments;
  positions: Float32Array;
  count: number;
  dispose: () => void;
}

export interface DistrictWorldRig {
  group: THREE.Group;
  npcs: NpcActor[];
  hotspots: DistrictHotspot[];
  colliders: AabbCollider[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  nightLights: THREE.PointLight[];
  windTrees: THREE.Object3D[];
  waterMesh?: THREE.Mesh;
  rain?: RainSystem;
  dispose: () => void;
}

const NPC_PROFILES: Array<Partial<CharacterConfig> & { frame: 'female' | 'male'; name: string }> = [
  {
    name: 'Ji-woo',
    frame: 'female',
    skinTone: '#ECC6AE',
    hairStyle: 'silky_straight',
    hairColor: '#17171B',
    outfitPreset: 'trench_suit',
    outerwearStyle: 'trench_coat',
    primaryOutfitColor: '#D6C4AA',
    secondaryOutfitColor: '#1B1C20',
    primaryFabric: 'wool',
    secondaryFabric: 'cotton',
  },
  {
    name: 'Hyun-woo',
    frame: 'male',
    skinTone: '#DBA687',
    hairStyle: 'korean_two_block',
    hairColor: '#2B1D16',
    outfitPreset: 'korean_casual_denim',
    outerwearStyle: 'cropped_jacket',
    primaryOutfitColor: '#1B1C20',
    secondaryOutfitColor: '#2C445F',
    primaryFabric: 'cotton',
    secondaryFabric: 'denim',
  },
  {
    name: 'Ha-eun',
    frame: 'female',
    skinTone: '#F3DACB',
    hairStyle: 'bob_cut',
    hairColor: '#4A2F22',
    outfitPreset: 'knit_dress',
    primaryOutfitColor: '#6B2432',
    secondaryOutfitColor: '#4B3629',
    primaryFabric: 'knit',
    secondaryFabric: 'wool',
  },
  {
    name: 'Do-yun',
    frame: 'male',
    skinTone: '#E9C3AC',
    hairStyle: 'comma_hair',
    hairColor: '#17171B',
    outfitPreset: 'leather_city_look',
    outerwearStyle: 'leather_jacket',
    primaryOutfitColor: '#F2EFE8',
    secondaryOutfitColor: '#1B1C20',
    primaryFabric: 'leather',
    secondaryFabric: 'denim',
  },
  {
    name: 'Soo-jin',
    frame: 'female',
    skinTone: '#C38863',
    hairStyle: 'high_ponytail',
    hairColor: '#342219',
    outfitPreset: 'blazer_skirt_set',
    primaryOutfitColor: '#495867',
    secondaryOutfitColor: '#F2EFE8',
    primaryFabric: 'wool',
    secondaryFabric: 'cotton',
  },
  {
    name: 'Tae-yang',
    frame: 'male',
    skinTone: '#DBA687',
    hairStyle: 'textured_curls',
    hairColor: '#5E3926',
    outfitPreset: 'streetwear_set',
    primaryOutfitColor: '#647566',
    secondaryOutfitColor: '#1B1C20',
    primaryFabric: 'cotton',
    secondaryFabric: 'denim',
  },
];

function createStreetTree(trunkMat: THREE.Material, leafMat: THREE.Material): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 2.3, 10), trunkMat);
  trunk.position.y = 1.15;
  trunk.castShadow = true;
  tree.add(trunk);

  const canopyWrap = new THREE.Group();
  canopyWrap.position.y = 2.4;
  tree.add(canopyWrap);

  [
    [0, 0.45, 0, 0.95],
    [-0.48, 0.15, 0.25, 0.68],
    [0.52, 0.2, -0.22, 0.72],
    [0.1, 0.75, 0.22, 0.64],
  ].forEach(([cx, cy, cz, cr]) => {
    const cluster = new THREE.Mesh(new THREE.DodecahedronGeometry(cr, 1), leafMat);
    cluster.position.set(cx, cy, cz);
    cluster.castShadow = true;
    canopyWrap.add(cluster);
  });

  return tree;
}

function createStreetLamp(
  x: number,
  z: number,
  isNight: boolean,
  poleMat: THREE.Material,
  nightLights: THREE.PointLight[],
  addRealLight: boolean
): THREE.Group {
  const lamp = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 4.1, 10), poleMat);
  pole.position.y = 2.05;
  pole.castShadow = true;
  lamp.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.06, 0.06), poleMat);
  arm.position.set(x > 0 ? -0.35 : 0.35, 4.05, 0);
  lamp.add(arm);

  const bulb = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.06, 0.16),
    new THREE.MeshStandardMaterial({
      color: isNight ? '#FFF0CE' : '#E2E4E8',
      emissive: isNight ? '#FFD48C' : '#000000',
      emissiveIntensity: isNight ? 1.8 : 0,
    })
  );
  bulb.position.set(x > 0 ? -0.68 : 0.68, 4.0, 0);
  lamp.add(bulb);

  if (isNight && addRealLight) {
    const pt = new THREE.PointLight('#FFD89A', 5.5, 11, 1.8);
    pt.position.set(x + (x > 0 ? -0.68 : 0.68), 3.85, z);
    nightLights.push(pt);
  }

  lamp.position.set(x, 0, z);
  return lamp;
}

function createStorefrontBuilding(options: {
  width: number;
  height: number;
  depth: number;
  wallColor: string;
  trimColor: string;
  hangul: string;
  subtitle: string;
  signBg: string;
  signAccent: string;
  isNight: boolean;
  maxAnisotropy: number;
  faceDir: 1 | -1;
}): THREE.Group {
  const b = new THREE.Group();
  const wallMat = new THREE.MeshStandardMaterial({
    color: options.wallColor,
    roughness: 0.78,
    metalness: 0.06,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: options.trimColor,
    roughness: 0.35,
    metalness: 0.45,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: options.isNight ? '#FFE5B4' : '#B7C9D8',
    emissive: options.isNight ? '#FFB668' : '#000000',
    emissiveIntensity: options.isNight ? 0.55 : 0,
    roughness: 0.08,
    metalness: 0.12,
    clearcoat: 1.0,
    transparent: true,
    opacity: options.isNight ? 0.92 : 0.72,
  });

  // Main architecture shell
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(options.width, options.height, options.depth),
    wallMat
  );
  body.position.y = options.height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  b.add(body);

  // Roof cornice
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(options.width + 0.25, 0.22, options.depth + 0.25),
    trimMat
  );
  cornice.position.y = options.height + 0.11;
  b.add(cornice);

  const frontX = options.faceDir * (options.width / 2 + 0.02);

  // Ground-floor glass shopfront window
  const windowMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 2.55, options.depth * 0.78),
    glassMat
  );
  windowMesh.position.set(frontX, 1.4, 0);
  b.add(windowMesh);

  // Storefront mullions
  const frameTop = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.14, options.depth * 0.84),
    trimMat
  );
  frameTop.position.set(frontX, 2.75, 0);
  b.add(frameTop);

  // Korean Hangul Fascia Sign
  const signTex = createKoreanSignTexture(
    options.hangul,
    options.subtitle,
    options.signBg,
    '#FFFFFF',
    options.signAccent,
    options.maxAnisotropy
  );
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    emissive: options.isNight ? '#FFFFFF' : '#000000',
    emissiveMap: options.isNight ? signTex : null,
    emissiveIntensity: options.isNight ? 0.75 : 0,
    roughness: 0.35,
  });
  const signMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.85, Math.min(options.depth * 0.72, 3.6)),
    signMat
  );
  signMesh.position.set(frontX + options.faceDir * 0.08, 3.35, 0);
  b.add(signMesh);

  // Upper floor architectural windows
  if (options.height > 5.5) {
    const upperGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.5, options.depth * 0.65),
      glassMat
    );
    upperGlass.position.set(frontX, 5.1, 0);
    b.add(upperGlass);
  }

  return b;
}

function buildRainSystem(quality: GraphicsQuality): RainSystem {
  const count = quality === 'high' ? 950 : quality === 'medium' ? 500 : 250;
  const positions = new Float32Array(count * 6);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 26;
    const y = Math.random() * 14;
    const z = (Math.random() - 0.5) * 32;
    const idx = i * 6;
    positions[idx] = x;
    positions[idx + 1] = y;
    positions[idx + 2] = z;
    positions[idx + 3] = x - 0.04;
    positions[idx + 4] = y - 0.42;
    positions[idx + 5] = z;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color: '#D5E3F5',
    transparent: true,
    opacity: 0.48,
  });
  const mesh = new THREE.LineSegments(geo, mat);
  mesh.frustumCulled = false;

  return {
    mesh,
    positions,
    count,
    dispose: () => {
      geo.dispose();
      mat.dispose();
    },
  };
}

export function updateRainSystem(rain: RainSystem, centerX: number, centerZ: number, delta: number): void {
  const pos = rain.positions;
  const fall = delta * 15.5;
  for (let i = 0; i < rain.count; i++) {
    const idx = i * 6;
    pos[idx + 1] -= fall;
    pos[idx + 4] -= fall;
    if (pos[idx + 4] < 0) {
      const nx = centerX + (Math.random() - 0.5) * 24;
      const nz = centerZ + (Math.random() - 0.5) * 26;
      const ny = 11 + Math.random() * 4;
      pos[idx] = nx;
      pos[idx + 1] = ny;
      pos[idx + 2] = nz;
      pos[idx + 3] = nx - 0.04;
      pos[idx + 4] = ny - 0.42;
      pos[idx + 5] = nz;
    }
  }
  (rain.mesh.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
}

export function applyWorldAtmosphere(
  scene: THREE.Scene,
  lights: {
    keyLight: THREE.DirectionalLight;
    fillLight: THREE.DirectionalLight;
    rimLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
  },
  district: WorldDistrictId,
  timeOfDay: TimeOfDayId,
  weather: WeatherId
): void {
  const { keyLight, fillLight, rimLight, hemiLight } = lights;
  const isRain = weather === 'rain';
  const isCloudy = weather === 'cloudy';

  if (district === 'photo_studio') {
    scene.background = new THREE.Color('#F3F5F8');
    scene.fog = new THREE.FogExp2('#F3F5F8', 0.028);
    keyLight.color.set('#FFF9F3');
    keyLight.intensity = 2.35;
    keyLight.position.set(2.8, 4.8, 3.8);
    fillLight.color.set('#E2ECFF');
    fillLight.intensity = 1.05;
    rimLight.color.set('#FFFFFF');
    rimLight.intensity = 1.3;
    hemiLight.color.set('#F5F7FA');
    hemiLight.groundColor.set('#CED2D9');
    hemiLight.intensity = 1.05;
    return;
  }

  if (timeOfDay === 'night') {
    const sky = isRain ? '#151B27' : '#182133';
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.FogExp2(sky, isRain ? 0.036 : 0.025);
    keyLight.color.set('#A8C8F5');
    keyLight.intensity = 1.45;
    keyLight.position.set(-4, 7, 5);
    fillLight.color.set('#6E88B5');
    fillLight.intensity = 0.85;
    rimLight.color.set('#FFD4A3');
    rimLight.intensity = 1.65;
    hemiLight.color.set('#3A4D6D');
    hemiLight.groundColor.set('#282528');
    hemiLight.intensity = 0.95;
  } else if (timeOfDay === 'sunset') {
    const sky = isRain ? '#9A8885' : '#ECC3A8';
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.FogExp2(sky, isRain ? 0.032 : 0.02);
    keyLight.color.set('#FFB178');
    keyLight.intensity = isRain ? 1.85 : 2.85;
    keyLight.position.set(8, 3.6, 5);
    fillLight.color.set('#96B0DE');
    fillLight.intensity = 0.95;
    rimLight.color.set('#FFD5A4');
    rimLight.intensity = 1.8;
    hemiLight.color.set('#FFD4B8');
    hemiLight.groundColor.set('#6E5D5B');
    hemiLight.intensity = 1.0;
  } else {
    const sky = isRain ? '#9AA5B4' : isCloudy ? '#CFD8E3' : '#DDE9F6';
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.FogExp2(sky, isRain ? 0.035 : 0.018);
    keyLight.color.set(isRain ? '#E6EEFA' : '#FFF9F0');
    keyLight.intensity = isRain ? 1.65 : isCloudy ? 2.0 : 2.75;
    keyLight.position.set(5, 9, 6);
    fillLight.color.set('#C9DEFA');
    fillLight.intensity = 1.05;
    rimLight.color.set('#FFFFFF');
    rimLight.intensity = 1.25;
    hemiLight.color.set(isRain ? '#B2C0D1' : '#E3F0FF');
    hemiLight.groundColor.set('#8E8A84');
    hemiLight.intensity = 1.15;
  }
}

export function buildKoreanDistrictWorld(
  scene: THREE.Scene,
  district: WorldDistrictId,
  timeOfDay: TimeOfDayId,
  weather: WeatherId,
  quality: GraphicsQuality,
  maxAnisotropy: number
): DistrictWorldRig {
  const group = new THREE.Group();
  group.name = `enmmoe-district-${district}`;
  const nightLights: THREE.PointLight[] = [];
  const windTrees: THREE.Object3D[] = [];
  const hotspots: DistrictHotspot[] = [];
  const colliders: AabbCollider[] = [];
  const npcs: NpcActor[] = [];
  const isNight = timeOfDay === 'night';
  const isWet = weather === 'rain';

  let waterMesh: THREE.Mesh | undefined;
  let bounds = { minX: -7.5, maxX: 7.5, minZ: -16, maxZ: 16 };

  if (district === 'photo_studio') {
    bounds = { minX: -2.8, maxX: 2.8, minZ: -2.8, maxZ: 2.8 };
    const floorTex = createStudioFloorTexture('#F2F4F8', '#FFFFFF', false, maxAnisotropy);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(16, 64),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.82 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    const curvePts = [
      new THREE.Vector2(5.5, 0.005),
      new THREE.Vector2(3.8, 0.01),
      new THREE.Vector2(3.1, 0.28),
      new THREE.Vector2(2.8, 1.1),
      new THREE.Vector2(2.75, 4.8),
    ];
    const cyc = new THREE.Mesh(
      new THREE.LatheGeometry(curvePts, 48, Math.PI * 0.65, Math.PI * 0.7),
      new THREE.MeshStandardMaterial({ color: '#F6F7FA', roughness: 0.9, side: THREE.DoubleSide })
    );
    cyc.receiveShadow = true;
    group.add(cyc);
  } else if (district === 'han_river_park') {
    bounds = { minX: -5.5, maxX: 6.5, minZ: -18, maxZ: 18 };
    const sidewalkMaps = createSidewalkMaps(isWet, maxAnisotropy);
    const walkway = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 48),
      new THREE.MeshStandardMaterial({
        map: sidewalkMaps.map,
        roughnessMap: sidewalkMaps.roughnessMap,
        roughness: isWet ? 0.35 : 0.8,
      })
    );
    walkway.rotation.x = -Math.PI / 2;
    walkway.position.set(1.5, 0.01, 0);
    walkway.receiveShadow = true;
    group.add(walkway);

    // Park Lawn
    const lawn = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 48),
      new THREE.MeshStandardMaterial({ color: isNight ? '#2B3B2E' : '#587154', roughness: 0.92 })
    );
    lawn.rotation.x = -Math.PI / 2;
    lawn.position.set(16, 0.0, 0);
    lawn.receiveShadow = true;
    group.add(lawn);

    // Animated Han River Surface
    const river = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 60),
      new THREE.MeshPhysicalMaterial({
        color: isNight ? '#162438' : '#355A78',
        roughness: 0.14,
        metalness: 0.25,
        clearcoat: 0.9,
      })
    );
    river.rotation.x = -Math.PI / 2;
    river.position.set(-23.5, -0.35, 0);
    group.add(river);
    waterMesh = river;

    // Stone Riverside Rail
    const railMat = new THREE.MeshStandardMaterial({ color: '#C8C5BE', roughness: 0.6 });
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 44), railMat);
    rail.position.set(-3.4, 0.425, 0);
    rail.castShadow = true;
    group.add(rail);
    colliders.push({ minX: -3.7, maxX: -3.1, minZ: -22, maxZ: 22 });

    // Distant Seoul Skyline & Illuminated Bridge across Han River
    const skyMat = new THREE.MeshStandardMaterial({
      color: isNight ? '#20283A' : '#8592A3',
      roughness: 0.75,
    });
    for (let i = -3; i <= 3; i++) {
      const h = 10 + ((i * 7 + 19) % 14);
      const tower = new THREE.Mesh(new THREE.BoxGeometry(3.4, h, 3.4), skyMat);
      tower.position.set(-32 - (Math.abs(i) % 2) * 4, h / 2 - 0.5, i * 6.5);
      group.add(tower);
    }

    // Riverside Kiosk Café
    const kiosk = createStorefrontBuilding({
      width: 4.5,
      height: 3.8,
      depth: 6.2,
      wallColor: '#353A42',
      trimColor: '#1E2126',
      hangul: '한강 카페',
      subtitle: 'Han River Coffee',
      signBg: '#19212E',
      signAccent: '#007AFF',
      isNight,
      maxAnisotropy,
      faceDir: -1,
    });
    kiosk.position.set(8.6, 0, -4.5);
    group.add(kiosk);
    colliders.push({ minX: 6.2, maxX: 11.2, minZ: -7.8, maxZ: -1.2 });

    hotspots.push(
      {
        id: 'han_cafe',
        type: 'cafe',
        label: 'Han River Café',
        koreanLabel: '한강 카페',
        x: 5.5,
        z: -4.5,
        radius: 2.3,
      },
      {
        id: 'han_transit',
        type: 'transit',
        label: 'Park Transit Stop',
        koreanLabel: '여의도 정류장',
        x: 5.2,
        z: 6.5,
        radius: 2.3,
      }
    );

    const trunkMat = new THREE.MeshStandardMaterial({ color: '#4E3D31', roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({
      color: timeOfDay === 'sunset' ? '#6D7A54' : '#4E6B4B',
      roughness: 0.85,
    });
    [-12, -4, 4, 12].forEach((tz) => {
      const tree = createStreetTree(trunkMat, leafMat);
      tree.position.set(5.4, 0, tz);
      group.add(tree);
      windTrees.push(tree);
    });
  } else if (district === 'busan_beach') {
    bounds = { minX: -4.2, maxX: 5.2, minZ: -17, maxZ: 17 };
    const boardMat = new THREE.MeshStandardMaterial({
      color: isWet ? '#6E5340' : '#A98768',
      roughness: isWet ? 0.32 : 0.78,
    });
    const boardwalk = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.25, 44), boardMat);
    boardwalk.position.set(1.0, 0.125, 0);
    boardwalk.receiveShadow = true;
    group.add(boardwalk);

    const sand = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 52),
      new THREE.MeshStandardMaterial({ color: '#DFCDAE', roughness: 0.92 })
    );
    sand.rotation.x = -Math.PI / 2;
    sand.position.set(-12, -0.05, 0);
    sand.receiveShadow = true;
    group.add(sand);

    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 64),
      new THREE.MeshPhysicalMaterial({
        color: isNight ? '#152A42' : '#2C6A96',
        roughness: 0.12,
        clearcoat: 1.0,
      })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(-28, -0.1, 0);
    group.add(ocean);
    waterMesh = ocean;

    const beachCafe = createStorefrontBuilding({
      width: 4.8,
      height: 4.0,
      depth: 7.0,
      wallColor: '#EFECE6',
      trimColor: '#3B424D',
      hangul: '해운대 테라스',
      subtitle: 'Haeundae Seaside Café',
      signBg: '#1C2836',
      signAccent: '#007AFF',
      isNight,
      maxAnisotropy,
      faceDir: -1,
    });
    beachCafe.position.set(7.6, 0, -2);
    group.add(beachCafe);
    colliders.push({ minX: 5.1, maxX: 10.2, minZ: -5.6, maxZ: 1.6 });

    hotspots.push(
      {
        id: 'busan_cafe',
        type: 'cafe',
        label: 'Seaside Terrace Café',
        koreanLabel: '해운대 테라스',
        x: 4.5,
        z: -2,
        radius: 2.4,
      },
      {
        id: 'busan_transit',
        type: 'transit',
        label: 'Coastal Express Station',
        koreanLabel: '해운대역',
        x: 4.5,
        z: 7.5,
        radius: 2.3,
      }
    );
  } else {
    // Seongsu Fashion Street OR Hongdae Evening Alley
    const isHongdae = district === 'hongdae_night';
    bounds = { minX: -7.0, maxX: 7.0, minZ: -17, maxZ: 17 };

    const roadMaps = createRoadSurfaceMaps(isWet, maxAnisotropy);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 52),
      new THREE.MeshStandardMaterial({
        map: roadMaps.map,
        roughnessMap: roadMaps.roughnessMap,
        roughness: isWet ? 0.22 : 0.85,
        metalness: isWet ? 0.16 : 0.04,
      })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = 0.0;
    road.receiveShadow = true;
    group.add(road);

    // Crosswalk markings near center plaza
    const stripeMat = new THREE.MeshStandardMaterial({ color: '#EAECEF', roughness: 0.75 });
    for (let sx = -2.4; sx <= 2.4; sx += 0.8) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 2.5), stripeMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(sx, 0.008, 3.6);
      group.add(stripe);
    }

    // Left & Right Elevated Sidewalks
    const swMaps = createSidewalkMaps(isWet, maxAnisotropy);
    const swMat = new THREE.MeshStandardMaterial({
      map: swMaps.map,
      roughnessMap: swMaps.roughnessMap,
      roughness: isWet ? 0.34 : 0.82,
    });
    [-5.9, 5.9].forEach((sx) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.12, 52), swMat);
      sw.position.set(sx, 0.06, 0);
      sw.receiveShadow = true;
      group.add(sw);
    });

    // Korean Boutique Shop (Right side)
    const boutique = createStorefrontBuilding({
      width: 5.5,
      height: 7.4,
      depth: 8.6,
      wallColor: isHongdae ? '#2E323B' : '#EAE6DF',
      trimColor: '#1B1D22',
      hangul: isHongdae ? '홍대 셀렉트' : '모드 부티크',
      subtitle: 'Seoul Fashion Store',
      signBg: '#161920',
      signAccent: '#007AFF',
      isNight,
      maxAnisotropy,
      faceDir: -1,
    });
    boutique.position.set(10.6, 0, -4.5);
    group.add(boutique);
    colliders.push({ minX: 7.6, maxX: 13.5, minZ: -8.9, maxZ: -0.2 });

    // Korean Café & Bakery (Left side)
    const cafe = createStorefrontBuilding({
      width: 5.5,
      height: 6.8,
      depth: 8.4,
      wallColor: isHongdae ? '#3F3431' : '#DED5CA',
      trimColor: '#2B241F',
      hangul: isHongdae ? '카페 루나' : '성수 로스터리',
      subtitle: 'Korean Bakery & Coffee',
      signBg: '#231D1A',
      signAccent: '#E5C69B',
      isNight,
      maxAnisotropy,
      faceDir: 1,
    });
    cafe.position.set(-10.6, 0, -3.5);
    group.add(cafe);
    colliders.push({ minX: -13.5, maxX: -7.6, minZ: -7.8, maxZ: 0.8 });

    // 24h Convenience Mart + Residential Apartments down the street
    const mart = createStorefrontBuilding({
      width: 5.5,
      height: 8.2,
      depth: 8.0,
      wallColor: '#D6D8DD',
      trimColor: '#252932',
      hangul: '24시 편의점',
      subtitle: 'Seoul Mart & Transit',
      signBg: '#192230',
      signAccent: '#007AFF',
      isNight,
      maxAnisotropy,
      faceDir: -1,
    });
    mart.position.set(10.6, 0, 6.8);
    group.add(mart);
    colliders.push({ minX: 7.6, maxX: 13.5, minZ: 2.6, maxZ: 11.0 });

    const gallery = createStorefrontBuilding({
      width: 5.5,
      height: 7.8,
      depth: 8.0,
      wallColor: isHongdae ? '#282C35' : '#E5E2DC',
      trimColor: '#202228',
      hangul: '아틀리에',
      subtitle: 'Seoul Design House',
      signBg: '#1C1D22',
      signAccent: '#D8C7AE',
      isNight,
      maxAnisotropy,
      faceDir: 1,
    });
    gallery.position.set(-10.6, 0, 7.2);
    group.add(gallery);
    colliders.push({ minX: -13.5, maxX: -7.6, minZ: 3.0, maxZ: 11.4 });

    // Street Lamps & Ginkgo Trees
    const poleMat = new THREE.MeshStandardMaterial({ color: '#272A30', roughness: 0.4, metalness: 0.8 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#4E3D31', roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({
      color: isHongdae ? '#3C5442' : '#5E7C52',
      roughness: 0.82,
    });

    [-9, 1.5, 11].forEach((zPos, idx) => {
      const lampR = createStreetLamp(3.7, zPos, isNight, poleMat, nightLights, idx < 2);
      group.add(lampR);
      const lampL = createStreetLamp(-3.7, zPos, isNight, poleMat, nightLights, false);
      group.add(lampL);
    });

    [
      [-4.2, -9.5],
      [4.2, -9.5],
      [-4.2, 12.2],
      [4.2, 12.2],
    ].forEach(([tx, tz]) => {
      const tree = createStreetTree(trunkMat, leafMat);
      tree.position.set(tx, 0.1, tz);
      group.add(tree);
      windTrees.push(tree);
    });

    // Metro / Bus Shelter Sign
    const shelter = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 2.3, 2.4),
      new THREE.MeshStandardMaterial({ color: '#242933', roughness: 0.35, metalness: 0.7 })
    );
    shelter.position.set(4.1, 1.2, 1.2);
    group.add(shelter);

    hotspots.push(
      {
        id: 'fashion_boutique',
        type: 'shop',
        label: 'Seoul Fashion Boutique',
        koreanLabel: isHongdae ? '홍대 셀렉트' : '모드 부티크',
        x: 6.4,
        z: -4.5,
        radius: 2.6,
      },
      {
        id: 'korean_cafe',
        type: 'cafe',
        label: isHongdae ? 'Café Luna' : 'Seongsu Roastery',
        koreanLabel: isHongdae ? '카페 루나' : '성수 로스터리',
        x: -6.4,
        z: -3.5,
        radius: 2.6,
      },
      {
        id: 'city_transit',
        type: 'transit',
        label: 'Seoul Metro & Taxi',
        koreanLabel: '서울 메트로 정류장',
        x: 5.2,
        z: 1.2,
        radius: 2.3,
      }
    );
  }

  nightLights.forEach((pt) => group.add(pt));

  // Rain particle overlay when weather === 'rain'
  let rain: RainSystem | undefined;
  if (weather === 'rain' && district !== 'photo_studio') {
    rain = buildRainSystem(quality);
    group.add(rain.mesh);
  }

  // Spawn Varied Non-Clone Korean NPCs (scaled by quality tier)
  if (district !== 'photo_studio') {
    const npcCount = quality === 'high' ? 6 : quality === 'medium' ? 4 : 2;
    const baseSideX = district === 'han_river_park' ? 0.5 : district === 'busan_beach' ? 0.8 : 4.9;

    for (let i = 0; i < npcCount; i++) {
      const profile = NPC_PROFILES[i % NPC_PROFILES.length];
      const cfg: CharacterConfig = {
        ...createDefaultCharacter(profile.frame, `npc-${i}`, profile.name),
        ...profile,
        pose: i % 3 === 1 ? 'phone_check' : 'natural_stand',
        expression: i % 2 === 0 ? 'warm_smile' : 'soft_neutral',
      };
      const rig = buildCharacterRig(cfg, maxAnisotropy, { highDetail: false });

      const sideSign =
        district === 'han_river_park' || district === 'busan_beach' ? 1 : i % 2 === 0 ? 1 : -1;
      const laneX = sideSign * (baseSideX + (i % 2) * 0.65);

      const isWalking = i < Math.ceil(npcCount * 0.7);
      const startZ = -10 + i * 4.2;
      const endZ = startZ > 0 ? -12 : 12;

      rig.root.position.set(laneX, district === 'seongsu_street' || district === 'hongdae_night' ? 0.12 : 0.0, startZ);
      group.add(rig.root);

      npcs.push({
        rig,
        mode: isWalking ? 'walk' : i % 2 === 0 ? 'phone' : 'idle',
        waypoints: [
          new THREE.Vector3(laneX, rig.root.position.y, startZ),
          new THREE.Vector3(laneX, rig.root.position.y, endZ),
        ],
        currentWaypoint: 1,
        speed: 1.05 + (i % 3) * 0.18,
        yaw: endZ > startZ ? 0 : Math.PI,
        expression: cfg.expression,
      });
    }
  }

  return {
    group,
    npcs,
    hotspots,
    colliders,
    bounds,
    nightLights,
    windTrees,
    waterMesh,
    rain,
    dispose: () => {
      npcs.forEach((n) => n.rig.dispose());
      rain?.dispose();
      disposeObject3D(group);
    },
  };
}

const _npcTarget = new THREE.Vector3();

export function updateKoreanDistrictWorld(
  world: DistrictWorldRig,
  playerPos: THREE.Vector3,
  elapsed: number,
  delta: number,
  isSoftwareGl: boolean
): void {
  // Subtle wind sway on street trees
  for (let i = 0; i < world.windTrees.length; i++) {
    world.windTrees[i].rotation.z = Math.sin(elapsed * 1.1 + i * 1.3) * 0.018;
  }

  // Gentle water ripple shimmer
  if (world.waterMesh) {
    world.waterMesh.position.y = -0.25 + Math.sin(elapsed * 1.4) * 0.025;
  }

  // Rain streaks
  if (world.rain) {
    updateRainSystem(world.rain, playerPos.x, playerPos.z, delta);
  }

  // NPC autonomous sidewalk walking & reactions
  for (let i = 0; i < world.npcs.length; i++) {
    const npc = world.npcs[i];
    if (npc.mode === 'walk') {
      const wp = npc.waypoints[npc.currentWaypoint];
      _npcTarget.copy(wp);
      const dx = _npcTarget.x - npc.rig.root.position.x;
      const dz = _npcTarget.z - npc.rig.root.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.35) {
        npc.currentWaypoint = (npc.currentWaypoint + 1) % npc.waypoints.length;
      } else {
        const moveStep = Math.min(dist, npc.speed * delta);
        npc.rig.root.position.x += (dx / dist) * moveStep;
        npc.rig.root.position.z += (dz / dist) * moveStep;
        const desiredYaw = Math.atan2(dx, dz);
        npc.yaw = desiredYaw;
        npc.rig.root.rotation.y = THREE.MathUtils.damp(npc.rig.root.rotation.y, desiredYaw, 10, delta);
      }

      updateCharacterAnimation(npc.rig, 'natural_stand', npc.expression, elapsed + i * 1.1, delta, isSoftwareGl, {
        isMoving: true,
        speedRatio: 0.48,
      });
    } else {
      updateCharacterAnimation(
        npc.rig,
        npc.mode === 'phone' ? 'phone_check' : 'natural_stand',
        npc.expression,
        elapsed + i * 1.7,
        delta,
        isSoftwareGl,
        { isMoving: false, speedRatio: 0 }
      );
    }
  }
}
