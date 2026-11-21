import * as THREE from 'three';
import {
  StudioEnvironmentId,
  StudioLightingId,
  StudioPropId,
} from '../types/characterStudio';
import { createContactShadowTexture, createStudioFloorTexture } from './textures';

export interface StudioEnvironmentRig {
  group: THREE.Group;
  propsGroup: THREE.Group;
  keyLight: THREE.DirectionalLight;
  fillLight: THREE.DirectionalLight;
  rimLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  dogTail?: THREE.Object3D;
  dogHead?: THREE.Object3D;
  catTail?: THREE.Object3D;
  dispose: () => void;
}

export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const std = m as THREE.MeshStandardMaterial;
        std.map?.dispose();
        std.normalMap?.dispose();
        std.roughnessMap?.dispose();
        m.dispose();
      });
    }
  });
}

export function createStudioLightingRig(scene: THREE.Scene, isSoftwareGl: boolean) {
  const hemiLight = new THREE.HemisphereLight(0xf5f8ff, 0xd8dce3, 1.0);
  hemiLight.position.set(0, 8, 0);
  scene.add(hemiLight);

  const keyLight = new THREE.DirectionalLight(0xfff5e8, 2.2);
  keyLight.position.set(2.8, 4.8, 3.6);
  keyLight.castShadow = !isSoftwareGl;
  keyLight.shadow.mapSize.width = isSoftwareGl ? 512 : 1024;
  keyLight.shadow.mapSize.height = isSoftwareGl ? 512 : 1024;
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 16;
  const d = 3.6;
  keyLight.shadow.camera.left = -d;
  keyLight.shadow.camera.right = d;
  keyLight.shadow.camera.top = d;
  keyLight.shadow.camera.bottom = -d;
  keyLight.shadow.bias = -0.0005;
  keyLight.shadow.normalBias = 0.02;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xdbe8ff, 0.85);
  fillLight.position.set(-3.2, 2.4, 2.5);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0xffffff, 1.35);
  rimLight.position.set(-1.4, 3.6, -3.4);
  scene.add(rimLight);

  return { keyLight, fillLight, rimLight, hemiLight };
}

export function applyLightingPreset(
  lights: {
    keyLight: THREE.DirectionalLight;
    fillLight: THREE.DirectionalLight;
    rimLight: THREE.DirectionalLight;
    hemiLight: THREE.HemisphereLight;
  },
  lighting: StudioLightingId
): void {
  const { keyLight, fillLight, rimLight, hemiLight } = lights;

  switch (lighting) {
    case 'daylight':
      keyLight.color.set('#FFF9EE');
      keyLight.intensity = 2.6;
      keyLight.position.set(3.2, 5.5, 3.4);
      fillLight.color.set('#CFE2FF');
      fillLight.intensity = 1.1;
      rimLight.color.set('#FFFFFF');
      rimLight.intensity = 1.2;
      hemiLight.color.set('#E6F0FF');
      hemiLight.groundColor.set('#C9C5BA');
      hemiLight.intensity = 1.15;
      break;

    case 'sunset':
      keyLight.color.set('#FFB677');
      keyLight.intensity = 2.8;
      keyLight.position.set(4.5, 2.4, 2.6);
      fillLight.color.set('#8FA9DC');
      fillLight.intensity = 0.9;
      rimLight.color.set('#FFCE96');
      rimLight.intensity = 1.9;
      hemiLight.color.set('#FFD8BE');
      hemiLight.groundColor.set('#6E5A58');
      hemiLight.intensity = 0.95;
      break;

    case 'nighttime':
      keyLight.color.set('#C7DFFF');
      keyLight.intensity = 1.9;
      keyLight.position.set(-2.5, 4.2, 3.4);
      fillLight.color.set('#5C7AA8');
      fillLight.intensity = 0.85;
      rimLight.color.set('#96C2FF');
      rimLight.intensity = 2.2;
      hemiLight.color.set('#3E506E');
      hemiLight.groundColor.set('#1F232C');
      hemiLight.intensity = 0.8;
      break;

    case 'editorial':
      keyLight.color.set('#FFF7F0');
      keyLight.intensity = 3.0;
      keyLight.position.set(2.2, 4.2, 2.8);
      fillLight.color.set('#BCC8DB');
      fillLight.intensity = 0.45;
      rimLight.color.set('#FFFFFF');
      rimLight.intensity = 2.1;
      hemiLight.color.set('#E8EDF5');
      hemiLight.groundColor.set('#9DA2AB');
      hemiLight.intensity = 0.65;
      break;

    case 'studio_soft':
    default:
      keyLight.color.set('#FFF9F3');
      keyLight.intensity = 2.25;
      keyLight.position.set(2.6, 4.6, 3.8);
      fillLight.color.set('#E4EEFF');
      fillLight.intensity = 1.05;
      rimLight.color.set('#FFFFFF');
      rimLight.intensity = 1.35;
      hemiLight.color.set('#F5F7FA');
      hemiLight.groundColor.set('#D2D5DC');
      hemiLight.intensity = 1.1;
      break;
  }
}

export function buildStudioEnvironment(
  scene: THREE.Scene,
  envId: StudioEnvironmentId,
  maxAnisotropy: number
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'studio-environment';

  let bgHex = '#F6F7FA';
  let fogHex = '#F6F7FA';
  let floorPrimary = '#F2F4F8';
  let floorAccent = '#FFFFFF';
  let tiled = false;

  if (envId === 'golden_terrace') {
    bgHex = '#F4D8C1';
    fogHex = '#EED0BA';
    floorPrimary = '#E5DDD5';
    floorAccent = '#CFC3B7';
    tiled = true;
  } else if (envId === 'botanical_conservatory') {
    bgHex = '#E9F0EA';
    fogHex = '#E3EBE5';
    floorPrimary = '#EAE8E2';
    floorAccent = '#C8C5BC';
    tiled = true;
  } else if (envId === 'twilight_rooftop') {
    bgHex = '#192233';
    fogHex = '#192233';
    floorPrimary = '#2A3140';
    floorAccent = '#394254';
    tiled = true;
  } else if (envId === 'cafe_patio') {
    bgHex = '#EDE9E2';
    fogHex = '#EAE5DD';
    floorPrimary = '#DED7CD';
    floorAccent = '#C3B9AA';
    tiled = true;
  }

  scene.background = new THREE.Color(bgHex);
  scene.fog = new THREE.FogExp2(fogHex, envId === 'white_studio' ? 0.032 : 0.042);

  // Ground plane (y = 0)
  const floorTex = createStudioFloorTexture(floorPrimary, floorAccent, tiled, maxAnisotropy);
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: envId === 'white_studio' ? 0.82 : 0.68,
    metalness: 0.04,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 64), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  if (envId === 'white_studio') {
    // Seamless curved studio cyclorama wall behind subject
    const cycMat = new THREE.MeshStandardMaterial({
      color: '#F7F8FC',
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const curvePts = [
      new THREE.Vector2(5.5, 0.005),
      new THREE.Vector2(3.8, 0.01),
      new THREE.Vector2(3.1, 0.28),
      new THREE.Vector2(2.8, 1.1),
      new THREE.Vector2(2.75, 4.8),
    ];
    const cycGeo = new THREE.LatheGeometry(curvePts, 48, Math.PI * 0.65, Math.PI * 0.7);
    const cyc = new THREE.Mesh(cycGeo, cycMat);
    cyc.receiveShadow = true;
    group.add(cyc);
  } else if (envId === 'golden_terrace' || envId === 'twilight_rooftop') {
    // Architectural stone balustrade + distant minimal skyline silhouettes
    const railMat = new THREE.MeshStandardMaterial({
      color: envId === 'twilight_rooftop' ? '#363E4F' : '#EAE4DC',
      roughness: 0.65,
      metalness: 0.08,
    });
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(10, 0.78, 0.26), railMat);
    parapet.position.set(0, 0.39, -3.1);
    parapet.castShadow = true;
    parapet.receiveShadow = true;
    group.add(parapet);

    const coping = new THREE.Mesh(
      new THREE.BoxGeometry(10.2, 0.08, 0.34),
      new THREE.MeshStandardMaterial({ color: '#D4CEC6', roughness: 0.45 })
    );
    coping.position.set(0, 0.81, -3.1);
    group.add(coping);

    // Distant horizon buildings (no boxed walls — open sky horizon)
    const skyMat = new THREE.MeshStandardMaterial({
      color: envId === 'twilight_rooftop' ? '#242D42' : '#D9C3B4',
      roughness: 0.85,
    });
    [-4.2, -2.5, -0.9, 1.1, 2.8, 4.4].forEach((bx, idx) => {
      const h = 2.6 + (idx % 3) * 1.4;
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, h, 1.1), skyMat);
      b.position.set(bx, h * 0.5 - 1.4, -7.8 - (idx % 2) * 1.5);
      group.add(b);
    });
  } else if (envId === 'botanical_conservatory') {
    // Glasshouse columns + arch ribs
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#465249',
      roughness: 0.4,
      metalness: 0.5,
    });
    [-2.7, 2.7].forEach((x) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 4.2, 16), frameMat);
      col.position.set(x, 2.1, -2.6);
      col.castShadow = true;
      group.add(col);
    });
    const beam = new THREE.Mesh(new THREE.TorusGeometry(2.7, 0.055, 12, 40, Math.PI), frameMat);
    beam.position.set(0, 2.1, -2.6);
    group.add(beam);

    // Lush natural potted hedges at perimeter
    const leafMat = new THREE.MeshStandardMaterial({ color: '#5A785B', roughness: 0.78 });
    [-2.1, 2.1].forEach((x) => {
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 1), leafMat);
      bush.position.set(x, 0.55, -2.3);
      bush.castShadow = true;
      group.add(bush);
    });
  } else if (envId === 'cafe_patio') {
    // Parisian facade pillars & cornice behind
    const stoneMat = new THREE.MeshStandardMaterial({ color: '#E4DDD2', roughness: 0.76 });
    const trimMat = new THREE.MeshStandardMaterial({ color: '#39434F', roughness: 0.45, metalness: 0.3 });
    [-2.4, 2.4].forEach((x) => {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 3.6, 0.45), stoneMat);
      pillar.position.set(x, 1.8, -2.8);
      pillar.castShadow = true;
      group.add(pillar);
    });
    const awning = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.16, 1.1), trimMat);
    awning.position.set(0, 2.75, -2.45);
    awning.rotation.x = 0.25;
    group.add(awning);
  }

  return group;
}

// =====================================================================
// COMPOSITE 3–12 PART INTERACTIVE PETS & PROPS (grounded flush at y = 0)
// =====================================================================

function buildGoldenDog(contactTex: THREE.CanvasTexture): {
  group: THREE.Group;
  tail: THREE.Object3D;
  head: THREE.Object3D;
} {
  const dog = new THREE.Group();
  dog.name = 'prop-dog-retriever';

  const coatMain = new THREE.MeshStandardMaterial({ color: '#D79D59', roughness: 0.82 });
  const coatLight = new THREE.MeshStandardMaterial({ color: '#EBD0A4', roughness: 0.86 });
  const noseMat = new THREE.MeshStandardMaterial({ color: '#1E1A18', roughness: 0.35 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#161311', roughness: 0.15 });
  const collarMat = new THREE.MeshStandardMaterial({ color: '#007AFF', roughness: 0.45 });

  // Ground shadow
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.68),
    new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: 0.8 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  dog.add(shadow);

  // Seated torso
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.135, 0.24, 10, 18), coatMain);
  torso.position.set(0, 0.28, -0.02);
  torso.rotation.x = 0.45;
  torso.castShadow = true;
  dog.add(torso);

  // Fluffy chest ruff
  const chest = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 14), coatLight);
  chest.scale.set(0.95, 1.05, 0.92);
  chest.position.set(0, 0.36, 0.08);
  chest.castShadow = true;
  dog.add(chest);

  // Collar + tag
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.016, 10, 24), collarMat);
  collar.rotation.x = Math.PI / 2 + 0.25;
  collar.position.set(0, 0.46, 0.08);
  dog.add(collar);

  // Head pivot
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.54, 0.11);
  dog.add(headPivot);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 16), coatMain);
  cranium.scale.set(1, 0.96, 1.08);
  cranium.castShadow = true;
  headPivot.add(cranium);

  const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.075, 8, 14), coatLight);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.02, 0.11);
  headPivot.add(snout);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), noseMat);
  nose.scale.set(1.2, 0.85, 0.9);
  nose.position.set(0, 0.002, 0.175);
  headPivot.add(nose);

  [-0.048, 0.048].forEach((ex) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 10), eyeMat);
    eye.position.set(ex, 0.032, 0.102);
    headPivot.add(eye);

    const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.09, 6, 10), coatMain);
    ear.position.set(ex * 2.35, -0.015, 0.01);
    ear.rotation.z = ex > 0 ? -0.25 : 0.25;
    ear.rotation.x = 0.15;
    ear.castShadow = true;
    headPivot.add(ear);
  });

  // Front legs + paws grounded on y=0
  [-0.072, 0.072].forEach((lx) => {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.25, 8, 12), coatMain);
    leg.position.set(lx, 0.17, 0.12);
    leg.castShadow = true;
    dog.add(leg);

    const paw = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 10), coatLight);
    paw.scale.set(0.95, 0.6, 1.25);
    paw.position.set(lx, 0.024, 0.145);
    dog.add(paw);
  });

  // Back haunches
  [-0.095, 0.095].forEach((hx) => {
    const haunch = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 12), coatMain);
    haunch.scale.set(0.85, 1.15, 1.15);
    haunch.position.set(hx, 0.12, -0.09);
    haunch.castShadow = true;
    dog.add(haunch);
  });

  // Wagging tail
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.14, -0.18);
  dog.add(tailPivot);

  const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.18, 6, 10), coatMain);
  tail.position.set(0, 0.07, -0.09);
  tail.rotation.x = -0.85;
  tailPivot.add(tail);

  dog.position.set(0.58, 0, 0.18);
  dog.rotation.y = -0.45;
  return { group: dog, tail: tailPivot, head: headPivot };
}

function buildFluffyCat(contactTex: THREE.CanvasTexture): {
  group: THREE.Group;
  tail: THREE.Object3D;
} {
  const cat = new THREE.Group();
  cat.name = 'prop-cat-fluffy';

  const fur = new THREE.MeshStandardMaterial({ color: '#F1EFEA', roughness: 0.78 });
  const earInner = new THREE.MeshStandardMaterial({ color: '#DFC5C0', roughness: 0.7 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: '#2B629B', roughness: 0.15 });
  const collarMat = new THREE.MeshStandardMaterial({ color: '#007AFF', roughness: 0.4 });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.45),
    new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: 0.75 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.004;
  cat.add(shadow);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.15, 10, 16), fur);
  body.position.set(0, 0.17, 0);
  body.rotation.x = 0.22;
  body.castShadow = true;
  cat.add(body);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.011, 8, 20), collarMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 0.29, 0.03);
  cat.add(collar);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.088, 16, 14), fur);
  head.position.set(0, 0.36, 0.05);
  head.castShadow = true;
  cat.add(head);

  [-0.048, 0.048].forEach((x) => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 4), fur);
    ear.position.set(x, 0.44, 0.04);
    ear.rotation.z = x > 0 ? -0.25 : 0.25;
    cat.add(ear);

    const inner = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.045, 4), earInner);
    inner.position.set(x, 0.435, 0.048);
    inner.rotation.z = x > 0 ? -0.25 : 0.25;
    cat.add(inner);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.013, 10, 8), eyeMat);
    eye.position.set(x * 0.68, 0.375, 0.125);
    cat.add(eye);
  });

  [-0.042, 0.042].forEach((px) => {
    const paw = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.14, 6, 10), fur);
    paw.position.set(px, 0.09, 0.075);
    cat.add(paw);
  });

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.08, -0.09);
  cat.add(tailPivot);

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0.05, 0.06, -0.09),
    new THREE.Vector3(0.02, 0.19, -0.14),
    new THREE.Vector3(-0.04, 0.26, -0.11),
  ]);
  const tail = new THREE.Mesh(new THREE.TubeGeometry(curve, 14, 0.019, 8, false), fur);
  tailPivot.add(tail);

  cat.position.set(-0.5, 0, 0.25);
  cat.rotation.y = 0.4;
  return { group: cat, tail: tailPivot };
}

function buildVelvetChair(): THREE.Group {
  const chair = new THREE.Group();
  chair.name = 'prop-velvet-chair';

  const cushionMat = new THREE.MeshPhysicalMaterial({
    color: '#E6E4DF',
    roughness: 0.72,
    sheen: 0.65,
    sheenColor: new THREE.Color('#FFFFFF'),
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: '#2B2E36',
    roughness: 0.25,
    metalness: 0.85,
  });

  // Cushion seat positioned at y = 0.44 so seated pose connects flush
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.11, 0.54), cushionMat);
  seat.position.set(0, 0.385, -0.02);
  seat.castShadow = true;
  seat.receiveShadow = true;
  chair.add(seat);

  // Curved backrest
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.46, 0.1), cushionMat);
  back.position.set(0, 0.63, -0.25);
  back.rotation.x = -0.1;
  back.castShadow = true;
  chair.add(back);

  // Side armrests
  [-0.25, 0.25].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.48), cushionMat);
    arm.position.set(ax, 0.51, -0.04);
    arm.castShadow = true;
    chair.add(arm);
  });

  // 4 tapered legs
  [
    [-0.22, -0.22],
    [0.22, -0.22],
    [-0.22, 0.2],
    [0.22, 0.2],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.34, 12), legMat);
    leg.position.set(lx, 0.17, lz);
    leg.castShadow = true;
    chair.add(leg);
  });

  chair.position.set(0, 0, -0.04);
  return chair;
}

function buildFlowerProp(): THREE.Group {
  const flowers = new THREE.Group();
  flowers.name = 'prop-flowers';

  const potMat = new THREE.MeshStandardMaterial({ color: '#EAE6DE', roughness: 0.5 });
  const stemMat = new THREE.MeshStandardMaterial({ color: '#4B6B4D', roughness: 0.72 });
  const bloomColors = ['#F5EFEA', '#D9C2BE', '#E9D6CE', '#FFFFFF'];

  [-0.9, 0.92].forEach((px, pIdx) => {
    const planter = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.42, 20), potMat);
    pot.position.y = 0.21;
    pot.castShadow = true;
    planter.add(pot);

    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const dist = i === 0 ? 0 : 0.1;
      const h = 0.46 + (i % 3) * 0.1;

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, h - 0.32, 6), stemMat);
      stem.position.set(Math.cos(angle) * dist, 0.36 + (h - 0.36) * 0.5, Math.sin(angle) * dist);
      planter.add(stem);

      const bloom = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.068, 1),
        new THREE.MeshStandardMaterial({
          color: bloomColors[(i + pIdx) % bloomColors.length],
          roughness: 0.65,
        })
      );
      bloom.position.set(Math.cos(angle) * dist, h, Math.sin(angle) * dist);
      bloom.castShadow = true;
      planter.add(bloom);
    }

    planter.position.set(px, 0, -0.65);
    flowers.add(planter);
  });

  return flowers;
}

function buildClassicCoupe(contactTex: THREE.CanvasTexture): THREE.Group {
  const car = new THREE.Group();
  car.name = 'prop-classic-coupe';

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: '#1C222D',
    roughness: 0.22,
    metalness: 0.75,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#9CB4CC',
    roughness: 0.08,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#E5E8EE',
    roughness: 0.15,
    metalness: 0.92,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: '#17191D', roughness: 0.85 });

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.1, 4.2),
    new THREE.MeshBasicMaterial({ map: contactTex, transparent: true, depthWrite: false, opacity: 0.65 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.005;
  car.add(shadow);

  // Lower sculpted body
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.58, 0.52, 3.55), paintMat);
  chassis.position.set(0, 0.44, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  car.add(chassis);

  // Cabin greenhouse
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.32, 0.44, 1.75), glassMat);
  cabin.position.set(0, 0.88, -0.15);
  car.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.48), paintMat);
  roof.position.set(0, 1.11, -0.18);
  roof.castShadow = true;
  car.add(roof);

  // Grille & headlights
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.22, 0.06), chromeMat);
  grille.position.set(0, 0.42, 1.78);
  car.add(grille);

  [-0.56, 0.56].forEach((hx) => {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.05, 16),
      new THREE.MeshStandardMaterial({ color: '#FFFFFF', emissive: '#FFF4DC', emissiveIntensity: 0.7 })
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(hx, 0.5, 1.77);
    car.add(lamp);
  });

  // 4 wheels grounded flush on y = 0
  [
    [-0.78, 1.08],
    [0.78, 1.08],
    [-0.78, -1.08],
    [0.78, -1.08],
  ].forEach(([wx, wz]) => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.22, 24), tireMat);
    tire.rotation.z = Math.PI / 2;
    tire.position.set(wx, 0.31, wz);
    tire.castShadow = true;
    car.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.235, 16), chromeMat);
    rim.rotation.z = Math.PI / 2;
    rim.position.set(wx, 0.31, wz);
    car.add(rim);
  });

  car.position.set(-1.75, 0, -1.65);
  car.rotation.y = 0.48;
  return car;
}

function buildBistroTable(): THREE.Group {
  const table = new THREE.Group();
  table.name = 'prop-bistro-table';

  const stoneMat = new THREE.MeshStandardMaterial({ color: '#F3F1EC', roughness: 0.28, metalness: 0.05 });
  const ironMat = new THREE.MeshStandardMaterial({ color: '#27292E', roughness: 0.4, metalness: 0.75 });
  const cupMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.2 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.05, 20), ironMat);
  base.position.y = 0.025;
  table.add(base);

  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.04, 0.68, 16), ironMat);
  leg.position.y = 0.36;
  leg.castShadow = true;
  table.add(leg);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.04, 28), stoneMat);
  top.position.y = 0.71;
  top.castShadow = true;
  top.receiveShadow = true;
  table.add(top);

  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.034, 0.07, 14), cupMat);
  cup.position.set(0.1, 0.765, 0.08);
  table.add(cup);

  table.position.set(0.88, 0, -0.35);
  return table;
}

function buildLoungeSofa(): THREE.Group {
  const sofa = new THREE.Group();
  sofa.name = 'prop-lounge-sofa';

  const linen = new THREE.MeshStandardMaterial({ color: '#E8E3DB', roughness: 0.85 });
  const wood = new THREE.MeshStandardMaterial({ color: '#4B3A2E', roughness: 0.55 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.24, 0.78), linen);
  deck.position.set(0, 0.24, 0);
  deck.castShadow = true;
  deck.receiveShadow = true;
  sofa.add(deck);

  const back = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.48, 0.16), linen);
  back.position.set(0, 0.56, -0.31);
  back.castShadow = true;
  sofa.add(back);

  [-0.78, 0.78].forEach((ax) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.78), linen);
    arm.position.set(ax, 0.42, 0);
    arm.castShadow = true;
    sofa.add(arm);
  });

  [
    [-0.74, -0.3],
    [0.74, -0.3],
    [-0.74, 0.3],
    [0.74, 0.3],
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.12, 10), wood);
    leg.position.set(lx, 0.06, lz);
    sofa.add(leg);
  });

  sofa.position.set(0.15, 0, -1.15);
  sofa.rotation.y = -0.18;
  return sofa;
}

export function buildPropsGroup(props: StudioPropId[]): {
  propsGroup: THREE.Group;
  dogTail?: THREE.Object3D;
  dogHead?: THREE.Object3D;
  catTail?: THREE.Object3D;
  dispose: () => void;
} {
  const propsGroup = new THREE.Group();
  propsGroup.name = 'studio-props';
  const contactTex = createContactShadowTexture();

  let dogTail: THREE.Object3D | undefined;
  let dogHead: THREE.Object3D | undefined;
  let catTail: THREE.Object3D | undefined;

  if (props.includes('velvet_chair')) {
    propsGroup.add(buildVelvetChair());
  }
  if (props.includes('dog_retriever')) {
    const dog = buildGoldenDog(contactTex);
    propsGroup.add(dog.group);
    dogTail = dog.tail;
    dogHead = dog.head;
  }
  if (props.includes('cat_fluffy')) {
    const cat = buildFluffyCat(contactTex);
    propsGroup.add(cat.group);
    catTail = cat.tail;
  }
  if (props.includes('flower_arch')) {
    propsGroup.add(buildFlowerProp());
  }
  if (props.includes('classic_coupe')) {
    propsGroup.add(buildClassicCoupe(contactTex));
  }
  if (props.includes('bistro_table')) {
    propsGroup.add(buildBistroTable());
  }
  if (props.includes('lounge_sofa')) {
    propsGroup.add(buildLoungeSofa());
  }

  return {
    propsGroup,
    dogTail,
    dogHead,
    catTail,
    dispose: () => {
      contactTex.dispose();
      disposeObject3D(propsGroup);
    },
  };
}
