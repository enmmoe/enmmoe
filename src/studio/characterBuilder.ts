import * as THREE from 'three';
import {
  CharacterConfig,
  CharacterExpressionId,
  CharacterPoseId,
  FabricMaterialId,
} from '../types/characterStudio';
import {
  createContactShadowTexture,
  createFabricMaps,
  createHairStrandMaps,
  createIrisTexture,
  createSkinMaps,
} from './textures';

export interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  leftShoulder: THREE.Group;
  leftElbow: THREE.Group;
  rightShoulder: THREE.Group;
  rightElbow: THREE.Group;
  leftHip: THREE.Group;
  leftKnee: THREE.Group;
  rightHip: THREE.Group;
  rightKnee: THREE.Group;
  eyelids: THREE.Object3D[];
  irises: THREE.Object3D[];
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  hairSwayGroups: THREE.Object3D[];
  skirtPivot?: THREE.Object3D;
  phoneProp?: THREE.Object3D;
  dispose: () => void;
}

export interface CharacterLocomotionState {
  isMoving: boolean;
  speedRatio: number; // 0 = idle, 0.5 = walk, 1.0 = run
}

/**
 * Builds a high-resolution continuous parametric head mesh with carved orbital eye sockets,
 * cheekbones, sculpted nasal bridge/tip/nostrils, philtrum, cupid's bow lips, jawline & subtle asymmetry.
 */
function buildSculptedHeadGeometry(config: CharacterConfig, highDetail: boolean): THREE.BufferGeometry {
  const segsW = highDetail ? 64 : 36;
  const segsH = highDetail ? 52 : 30;
  const geo = new THREE.SphereGeometry(0.106, segsW, segsH);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  const isFemale = config.frame === 'female';
  let faceW = (isFemale ? 0.94 : 1.01) * config.cheekFullness;
  let faceH = isFemale ? 1.1 : 1.14;
  let jawW = config.jawWidth * (isFemale ? 0.91 : 1.03);
  let chinTaper = isFemale ? 0.72 : 0.84;

  if (config.faceShape === 'heart') {
    faceW *= 1.02;
    jawW *= 0.88;
    chinTaper *= 0.88;
  } else if (config.faceShape === 'round') {
    faceW *= 1.06;
    faceH *= 0.96;
    jawW *= 1.04;
  } else if (config.faceShape === 'square') {
    jawW *= 1.12;
    chinTaper *= 1.14;
  } else if (config.faceShape === 'sculpted') {
    faceW *= 0.95;
    faceH *= 1.03;
    jawW *= 0.94;
  }

  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);

    // Normalized anatomical reference coords (-1..1 roughly)
    const nx = v.x / 0.106;
    const ny = v.y / 0.106;
    const nz = v.z / 0.106;

    // Base human cranium + vertical jaw proportion
    v.x *= faceW;
    v.y *= faceH;
    v.z *= 1.05;

    // Subtle organic asymmetry (avoids uncanny doll symmetry)
    const asym = 0.0011 * Math.sin(ny * 3.1 + nx * 1.4);
    v.x += asym;

    // Taper lower half into sculpted jawline + chin
    if (ny < 0.05) {
      const lowerT = Math.min(1, (-ny + 0.05) / 1.05);
      const jawFactor = THREE.MathUtils.lerp(1.0, jawW * 0.74, Math.pow(lowerT, 1.35));
      v.x *= jawFactor;

      // Bring chin slightly forward, soften under-chin
      if (nz > 0) {
        v.z += lowerT * 0.014 * (1 - Math.min(1, Math.abs(nx) * 1.6));
      } else {
        v.z *= 0.92;
      }

      // Square vs heart chin tip width
      if (ny < -0.65 && nz > 0.1) {
        const chinBlend = (-ny - 0.65) / 0.35;
        v.x *= THREE.MathUtils.lerp(1.0, chinTaper, chinBlend);
        v.y -= chinBlend * 0.008;
      }
    }

    // Cheekbones (Zygomatic arch contour)
    if (nz > 0.25) {
      const cheekL = Math.exp(-((nx + 0.44) ** 2 / 0.06 + (ny + 0.08) ** 2 / 0.05));
      const cheekR = Math.exp(-((nx - 0.44) ** 2 / 0.06 + (ny + 0.08) ** 2 / 0.05));
      v.z += (cheekL + cheekR) * 0.009 * config.cheekFullness;
      v.x += (cheekR - cheekL) * 0.004;

      // Temple slight inward sculpt above cheekbones
      const templeL = Math.exp(-((nx + 0.68) ** 2 / 0.04 + (ny - 0.28) ** 2 / 0.06));
      const templeR = Math.exp(-((nx - 0.68) ** 2 / 0.04 + (ny - 0.28) ** 2 / 0.06));
      v.x -= (templeR - templeL) * 0.0045;

      // Brow ridge subtle arch
      const brow =
        Math.exp(-((ny - 0.26) ** 2 / 0.018)) *
        Math.exp(-((nx * nx) / 0.32)) *
        Math.max(0, nz - 0.45);
      v.z += brow * 0.012;

      // Carved Orbital Eye Sockets (critical for realistic non-glued eyes!)
      const socketL = Math.exp(-((nx + 0.31) ** 2 / 0.022 + (ny - 0.11) ** 2 / 0.014));
      const socketR = Math.exp(-((nx - 0.31) ** 2 / 0.022 + (ny - 0.11) ** 2 / 0.014));
      v.z -= (socketL + socketR) * 0.017;

      // Continuous Sculpted Nasal Bridge + Tip + Nostrils
      const noseBridge =
        Math.exp(-((nx * nx) / (0.012 * config.noseBridgeWidth))) *
        Math.exp(-((ny + 0.04) ** 2 / 0.055));
      const noseTip =
        Math.exp(-((nx * nx) / (0.018 * config.noseBridgeWidth))) *
        Math.exp(-((ny + 0.19 * config.noseTipLength) ** 2 / 0.012));
      const nostrilL = Math.exp(-((nx + 0.1) ** 2 / 0.005 + (ny + 0.21) ** 2 / 0.006));
      const nostrilR = Math.exp(-((nx - 0.1) ** 2 / 0.005 + (ny + 0.21) ** 2 / 0.006));
      v.z += noseBridge * 0.016 + noseTip * 0.022 + (nostrilL + nostrilR) * 0.007;

      // Philtrum subtle groove
      const philtrum =
        Math.exp(-((nx * nx) / 0.003)) * Math.exp(-((ny + 0.31) ** 2 / 0.005));
      v.z -= philtrum * 0.0035;

      // Sculpted Upper & Lower Lip Volume (continuous on mesh)
      const lipMaskX = Math.exp(-((nx * nx) / 0.045));
      const upperLipProfile =
        lipMaskX * Math.exp(-((ny + 0.39) ** 2 / 0.0045)) * (1 - 0.25 * Math.exp(-(nx * nx) / 0.004));
      const mouthPartCrease = lipMaskX * Math.exp(-((ny + 0.435) ** 2 / 0.0009));
      const lowerLipProfile = lipMaskX * Math.exp(-((ny + 0.475) ** 2 / 0.0055));
      v.z +=
        (upperLipProfile * 0.0085 + lowerLipProfile * 0.0095) * config.lipFullness -
        mouthPartCrease * 0.0055;
    }

    // Back of skull (occipital fullness)
    if (nz < -0.3 && ny > -0.3) {
      v.z -= 0.008 * Math.exp(-((ny - 0.05) ** 2 / 0.35));
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds sculpted anatomical torso/limb lofted geometry with organic front-to-back & width taper.
 */
function buildContouredTorsoGeometry(
  hipW: number,
  waistW: number,
  chestW: number,
  isFemale: boolean
): THREE.BufferGeometry {
  const radialSegs = 32;
  const heightSegs = 20;
  const totalH = 0.51;
  const geo = new THREE.CylinderGeometry(1, 1, totalH, radialSegs, heightSegs, false);
  geo.translate(0, totalH / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = THREE.MathUtils.clamp(y / totalH, 0, 1);

    let rx = waistW;
    let rz = waistW * 0.7;

    if (t < 0.3) {
      const k = t / 0.3;
      rx = THREE.MathUtils.lerp(hipW * 0.94, waistW * 0.92, k);
      rz = THREE.MathUtils.lerp(hipW * 0.72, waistW * 0.68, k);
    } else if (t < 0.78) {
      const k = (t - 0.3) / 0.48;
      rx = THREE.MathUtils.lerp(waistW * 0.92, chestW, k);
      rz = THREE.MathUtils.lerp(waistW * 0.68, chestW * (isFemale ? 0.73 : 0.76), k);
    } else {
      const k = (t - 0.78) / 0.22;
      rx = THREE.MathUtils.lerp(chestW, 0.056, Math.pow(k, 1.35));
      rz = THREE.MathUtils.lerp(chestW * 0.72, 0.054, Math.pow(k, 1.35));
    }

    // Subtle anatomical ribcage/pectoral/back curvature
    const angle = Math.atan2(z, x);
    let forwardPush = 0;
    if (z > 0 && t > 0.48 && t < 0.8) {
      const bustBell = Math.sin(((t - 0.48) / 0.32) * Math.PI);
      forwardPush = bustBell * (isFemale ? 0.022 : 0.011) * Math.pow(Math.max(0, Math.sin(angle)), 1.4);
    }

    pos.setXYZ(i, x * rx, y, z * rz + forwardPush);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildSculptedLimbGeometry(
  topR: number,
  midR: number,
  botR: number,
  length: number,
  segs = 18
): THREE.BufferGeometry {
  const geo = new THREE.CylinderGeometry(1, 1, length, segs, 10, false);
  geo.translate(0, -length / 2, 0);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = THREE.MathUtils.clamp(-y / length, 0, 1);
    const r =
      t < 0.45
        ? THREE.MathUtils.lerp(topR, midR, t / 0.45)
        : THREE.MathUtils.lerp(midR, botR, (t - 0.45) / 0.55);
    pos.setXYZ(i, x * r, y, z * r * 0.94);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Anatomically proportioned 5-fingered human hand (palm + thumb + 4 fingers with curled phalanges).
 */
function buildFiveFingerHand(
  side: -1 | 1,
  skinMat: THREE.Material,
  highDetail: boolean
): THREE.Group {
  const hand = new THREE.Group();

  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.072, 0.02), skinMat);
  palm.position.set(0, -0.036, 0);
  palm.castShadow = highDetail;
  hand.add(palm);

  const knuckleWrap = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), skinMat);
  knuckleWrap.scale.set(1.02, 0.5, 0.42);
  knuckleWrap.position.set(0, -0.068, 0);
  hand.add(knuckleWrap);

  // Thumb
  const thumbBase = new THREE.Group();
  thumbBase.position.set(side * -0.028, -0.024, 0.008);
  thumbBase.rotation.z = side * -0.58;
  thumbBase.rotation.x = -0.25;
  hand.add(thumbBase);

  const thumbSeg1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0068, 0.02, 4, 8), skinMat);
  thumbSeg1.position.y = -0.015;
  thumbBase.add(thumbSeg1);

  const thumbSeg2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.0056, 0.015, 4, 8), skinMat);
  thumbSeg2.position.set(0, -0.035, 0.004);
  thumbSeg2.rotation.x = -0.22;
  thumbBase.add(thumbSeg2);

  // Index, Middle, Ring, Pinky fingers
  const fingerSpecs = [
    { x: -0.018, len1: 0.028, len2: 0.022, r: 0.0054 },
    { x: -0.006, len1: 0.032, len2: 0.024, r: 0.0056 },
    { x: 0.007, len1: 0.029, len2: 0.022, r: 0.0052 },
    { x: 0.019, len1: 0.022, len2: 0.017, r: 0.0046 },
  ];

  fingerSpecs.forEach((f, idx) => {
    const fGroup = new THREE.Group();
    fGroup.position.set(side * f.x, -0.072, 0);
    fGroup.rotation.x = -0.16 - idx * 0.04; // natural relaxed curve
    hand.add(fGroup);

    const prox = new THREE.Mesh(new THREE.CapsuleGeometry(f.r, f.len1, 4, 6), skinMat);
    prox.position.y = -f.len1 / 2;
    fGroup.add(prox);

    if (highDetail) {
      const dist = new THREE.Mesh(new THREE.CapsuleGeometry(f.r * 0.84, f.len2, 4, 6), skinMat);
      dist.position.set(0, -f.len1 - f.len2 * 0.42, -0.004);
      dist.rotation.x = -0.28;
      fGroup.add(dist);
    }
  });

  return hand;
}

/**
 * Creates PBR Skin Material with subtle wrap-diffuse subsurface scattering shader injection.
 */
function createHumanSkinMaterial(
  config: CharacterConfig,
  maxAnisotropy: number,
  track: <T extends { dispose: () => void }>(res: T) => T
): THREE.MeshPhysicalMaterial {
  const skinMaps = createSkinMaps(
    config.skinTone,
    config.blushIntensity,
    config.frecklesIntensity,
    maxAnisotropy
  );
  track(skinMaps.map);
  track(skinMaps.normalMap);
  track(skinMaps.roughnessMap);

  const skinMat = track(
    new THREE.MeshPhysicalMaterial({
      map: skinMaps.map,
      normalMap: skinMaps.normalMap,
      normalScale: new THREE.Vector2(0.45, 0.45),
      roughnessMap: skinMaps.roughnessMap,
      roughness: 0.92,
      metalness: 0.0,
      sheen: 0.24,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color('#FFDAD0'),
      clearcoat: 0.06,
      clearcoatRoughness: 0.62,
    })
  );

  skinMat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <lights_fragment_end>',
      `
      #include <lights_fragment_end>
      float skinRim = pow(1.0 - clamp(dot(geometryNormal, geometryViewDir), 0.0, 1.0), 1.9);
      reflectedLight.directDiffuse += vec3(0.14, 0.036, 0.022) * skinRim * diffuseColor.rgb;
      `
    );
  };
  skinMat.customProgramCacheKey = () => 'enmmoe-sss-skin-v1';

  return skinMat;
}

/**
 * Generates an alpha-cutout curved hair card strip geometry.
 */
function buildHairCardGeometry(
  curve: THREE.CatmullRomCurve3,
  widthTop: number,
  widthBottom: number,
  segments = 14
): THREE.BufferGeometry {
  const pts = curve.getPoints(segments);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const tangent = new THREE.Vector3();
  const sideVec = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, 1);

  for (let i = 0; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    const w = THREE.MathUtils.lerp(widthTop, widthBottom, t) * 0.5;
    if (i < pts.length - 1) {
      tangent.subVectors(pts[i + 1], pts[i]).normalize();
    }
    sideVec.crossVectors(tangent, forward);
    if (sideVec.lengthSq() < 0.001) sideVec.set(1, 0, 0);
    sideVec.normalize();

    const p = pts[i];
    positions.push(
      p.x - sideVec.x * w,
      p.y - sideVec.y * w,
      p.z - sideVec.z * w,
      p.x + sideVec.x * w,
      p.y + sideVec.y * w,
      p.z + sideVec.z * w
    );
    uvs.push(0, t, 1, t);

    if (i < pts.length - 1) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

interface PoseTargets {
  hipsY: number;
  hipsZ: number;
  hipsRotY: number;
  spineRotX: number;
  spineRotY: number;
  spineRotZ: number;
  headRotX: number;
  headRotY: number;
  headRotZ: number;
  lArmX: number;
  lArmZ: number;
  lElbowX: number;
  rArmX: number;
  rArmZ: number;
  rElbowX: number;
  lLegX: number;
  lLegZ: number;
  lKneeX: number;
  rLegX: number;
  rLegZ: number;
  rKneeX: number;
}

function getPoseTargets(pose: CharacterPoseId, standingHipY: number): PoseTargets {
  switch (pose) {
    case 'studio_sit':
      return {
        hipsY: 0.45,
        hipsZ: -0.02,
        hipsRotY: 0.08,
        spineRotX: 0.04,
        spineRotY: -0.05,
        spineRotZ: 0.02,
        headRotX: 0.03,
        headRotY: 0.04,
        headRotZ: -0.04,
        lArmX: -0.38,
        lArmZ: 0.14,
        lElbowX: -0.68,
        rArmX: -0.35,
        rArmZ: -0.14,
        rElbowX: -0.74,
        lLegX: -1.42,
        lLegZ: 0.04,
        lKneeX: 1.44,
        rLegX: -1.44,
        rLegZ: -0.06,
        rKneeX: 1.48,
      };
    case 'phone_check':
      return {
        hipsY: standingHipY,
        hipsZ: 0,
        hipsRotY: 0.06,
        spineRotX: 0.05,
        spineRotY: -0.04,
        spineRotZ: 0,
        headRotX: 0.24,
        headRotY: -0.08,
        headRotZ: 0,
        lArmX: 0.05,
        lArmZ: 0.14,
        lElbowX: -0.16,
        rArmX: -0.62,
        rArmZ: -0.16,
        rElbowX: -1.32,
        lLegX: 0,
        lLegZ: 0.03,
        lKneeX: 0.02,
        rLegX: -0.04,
        rLegZ: -0.04,
        rKneeX: 0.06,
      };
    case 'fashion_hip':
      return {
        hipsY: standingHipY,
        hipsZ: 0,
        hipsRotY: -0.16,
        spineRotX: -0.02,
        spineRotY: 0.14,
        spineRotZ: -0.04,
        headRotX: 0.02,
        headRotY: 0.06,
        headRotZ: 0.04,
        lArmX: 0.05,
        lArmZ: 0.2,
        lElbowX: -0.28,
        rArmX: -0.14,
        rArmZ: -0.42,
        rElbowX: -1.2,
        lLegX: -0.05,
        lLegZ: 0.05,
        lKneeX: 0.06,
        rLegX: 0.08,
        rLegZ: -0.09,
        rKneeX: 0.12,
      };
    case 'runway_walk':
      return {
        hipsY: standingHipY,
        hipsZ: 0,
        hipsRotY: 0.08,
        spineRotX: 0.04,
        spineRotY: -0.1,
        spineRotZ: 0.02,
        headRotX: 0.0,
        headRotY: 0.03,
        headRotZ: 0.0,
        lArmX: 0.24,
        lArmZ: 0.1,
        lElbowX: -0.22,
        rArmX: -0.28,
        rArmZ: -0.1,
        rElbowX: -0.26,
        lLegX: -0.28,
        lLegZ: 0.02,
        lKneeX: 0.2,
        rLegX: 0.25,
        rLegZ: -0.02,
        rKneeX: 0.16,
      };
    case 'cute_wave':
      return {
        hipsY: standingHipY,
        hipsZ: 0,
        hipsRotY: 0.08,
        spineRotX: 0,
        spineRotY: -0.04,
        spineRotZ: -0.04,
        headRotX: -0.04,
        headRotY: 0.04,
        headRotZ: 0.07,
        lArmX: 0.05,
        lArmZ: 0.14,
        lElbowX: -0.18,
        rArmX: -0.25,
        rArmZ: -2.22,
        rElbowX: -0.92,
        lLegX: 0.03,
        lLegZ: 0.04,
        lKneeX: 0.04,
        rLegX: -0.06,
        rLegZ: -0.04,
        rKneeX: 0.12,
      };
    case 'confident_crossed':
      return {
        hipsY: standingHipY,
        hipsZ: 0,
        hipsRotY: 0.12,
        spineRotX: -0.03,
        spineRotY: -0.08,
        spineRotZ: 0,
        headRotX: -0.02,
        headRotY: -0.05,
        headRotZ: 0,
        lArmX: -0.5,
        lArmZ: -0.32,
        lElbowX: -1.16,
        rArmX: -0.5,
        rArmZ: 0.32,
        rElbowX: -1.14,
        lLegX: 0,
        lLegZ: 0.04,
        lKneeX: 0,
        rLegX: 0.04,
        rLegZ: -0.04,
        rKneeX: 0.05,
      };
    case 'playful_peace':
      return {
        hipsY: standingHipY,
        hipsZ: 0,
        hipsRotY: -0.1,
        spineRotX: 0.02,
        spineRotY: 0.12,
        spineRotZ: 0.04,
        headRotX: 0.04,
        headRotY: -0.06,
        headRotZ: -0.08,
        lArmX: -0.76,
        lArmZ: 0.24,
        lElbowX: -1.32,
        rArmX: 0.06,
        rArmZ: -0.18,
        rElbowX: -0.24,
        lLegX: -0.07,
        lLegZ: 0.05,
        lKneeX: 0.14,
        rLegX: 0.04,
        rLegZ: -0.05,
        rKneeX: 0.02,
      };
    case 'natural_stand':
    default:
      return {
        hipsY: standingHipY,
        hipsZ: 0,
        hipsRotY: 0.03,
        spineRotX: 0,
        spineRotY: -0.02,
        spineRotZ: 0,
        headRotX: 0,
        headRotY: 0.02,
        headRotZ: 0,
        lArmX: 0.03,
        lArmZ: 0.12,
        lElbowX: -0.15,
        rArmX: 0.03,
        rArmZ: -0.12,
        rElbowX: -0.15,
        lLegX: 0,
        lLegZ: 0.025,
        lKneeX: 0,
        rLegX: 0,
        rLegZ: -0.025,
        rKneeX: 0,
      };
  }
}

export function buildCharacterRig(
  config: CharacterConfig,
  maxAnisotropy: number,
  options: { highDetail?: boolean } = {}
): CharacterRig {
  const highDetail = options.highDetail !== false;
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(res: T): T => {
    disposables.push(res);
    return res;
  };

  const isFemale = config.frame === 'female';
  const root = new THREE.Group();
  root.name = 'enmmoe-human-character';

  // Ground contact shadow plane
  const shadowTex = track(createContactShadowTexture());
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.85,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.004;
  root.add(shadowPlane);

  // Materials
  const skinMat = createHumanSkinMaterial(config, maxAnisotropy, track);

  const hairMaps = createHairStrandMaps(config.hairColor, maxAnisotropy);
  track(hairMaps.map);
  track(hairMaps.alphaMap);
  track(hairMaps.normalMap);

  const hairScalpMat = track(
    new THREE.MeshPhysicalMaterial({
      color: config.hairColor,
      normalMap: hairMaps.normalMap,
      normalScale: new THREE.Vector2(0.55, 0.55),
      roughness: Math.max(0.28, 0.72 - config.hairGloss * 0.4),
      sheen: 0.5,
      sheenColor: new THREE.Color('#FFFFFF'),
    })
  );

  const hairCardMat = track(
    new THREE.MeshPhysicalMaterial({
      map: hairMaps.map,
      alphaMap: hairMaps.alphaMap,
      normalMap: hairMaps.normalMap,
      normalScale: new THREE.Vector2(0.75, 0.75),
      alphaTest: 0.32,
      side: THREE.DoubleSide,
      roughness: Math.max(0.24, 0.68 - config.hairGloss * 0.38),
      clearcoat: config.hairGloss * 0.4,
      clearcoatRoughness: 0.38,
      sheen: 0.6,
      sheenColor: new THREE.Color('#FFFFFF'),
    })
  );

  const makeClothMat = (hex: string, fabric: FabricMaterialId) => {
    const fm = createFabricMaps(hex, fabric, maxAnisotropy);
    track(fm.map);
    track(fm.normalMap);
    track(fm.roughnessMap);
    return track(
      new THREE.MeshPhysicalMaterial({
        map: fm.map,
        normalMap: fm.normalMap,
        normalScale: new THREE.Vector2(0.65, 0.65),
        roughnessMap: fm.roughnessMap,
        roughness: fm.baseRoughness,
        metalness: fabric === 'leather' ? 0.08 : 0.02,
        sheen: fm.sheen,
        sheenRoughness: 0.65,
        sheenColor: new THREE.Color('#FFFFFF'),
        clearcoat: fabric === 'leather' ? 0.25 : 0.0,
        side: THREE.DoubleSide,
      })
    );
  };

  const primaryClothMat = makeClothMat(config.primaryOutfitColor, config.primaryFabric);
  const secondaryClothMat = makeClothMat(config.secondaryOutfitColor, config.secondaryFabric);
  const leatherTrimMat = makeClothMat(config.footwearColor, 'leather');
  const buttonMat = track(
    new THREE.MeshStandardMaterial({ color: '#C9B38B', roughness: 0.28, metalness: 0.78 })
  );
  const goldMetalMat = track(
    new THREE.MeshStandardMaterial({ color: '#DEC078', roughness: 0.22, metalness: 0.88 })
  );
  const browMat = track(
    new THREE.MeshStandardMaterial({ color: config.hairColor, roughness: 0.78 })
  );
  const lipMat = track(
    new THREE.MeshPhysicalMaterial({
      color: config.lipColor,
      normalMap: skinMat.normalMap,
      normalScale: new THREE.Vector2(0.2, 0.2),
      roughness: 0.4,
      clearcoat: 0.22,
      clearcoatRoughness: 0.35,
    })
  );

  const irisTex = track(createIrisTexture(config.eyeColor, maxAnisotropy));
  const eyeMat = track(
    new THREE.MeshStandardMaterial({
      map: irisTex,
      roughness: 0.16,
      metalness: 0.02,
    })
  );
  const corneaMat = track(
    new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      roughness: 0.02,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      envMapIntensity: 1.6,
    })
  );

  // =====================================================================
  // BODY PROPORTIONS & ANATOMICAL RIG
  // =====================================================================
  const standingHipHeight = 0.94;
  const hips = new THREE.Group();
  hips.position.set(0, standingHipHeight, 0);
  hips.scale.setScalar(config.heightScale);
  root.add(hips);

  const hipWidth = (isFemale ? 0.136 : 0.128) * config.hipScale;
  const waistWidth = (isFemale ? 0.102 : 0.12) * config.waistScale;
  const chestWidth = (isFemale ? 0.134 : 0.156) * config.shoulderScale;

  const isOnePieceDress =
    config.outfitPreset === 'silk_slip_dress' ||
    config.outfitPreset === 'pleated_mini_dress' ||
    config.outfitPreset === 'evening_gown' ||
    config.outfitPreset === 'knit_dress';

  const torsoGarmentMat = isOnePieceDress ? primaryClothMat : primaryClothMat;

  const pelvis = new THREE.Mesh(
    track(new THREE.SphereGeometry(hipWidth * 0.96, 22, 18)),
    isOnePieceDress ? primaryClothMat : secondaryClothMat
  );
  pelvis.scale.set(1.04, 0.72, 0.78);
  pelvis.castShadow = highDetail;
  hips.add(pelvis);

  const spine = new THREE.Group();
  spine.position.set(0, 0.04, 0);
  hips.add(spine);

  const torsoGeo = track(buildContouredTorsoGeometry(hipWidth, waistWidth, chestWidth, isFemale));
  const torsoMesh = new THREE.Mesh(torsoGeo, torsoGarmentMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  spine.add(torsoMesh);

  // Sculpted Shirt Collar + Waist Belt Detail
  if (!isOnePieceDress) {
    const collar = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.064, 0.011, 8, 22, Math.PI * 1.6)),
      primaryClothMat
    );
    collar.rotation.x = Math.PI / 2 + 0.15;
    collar.rotation.z = Math.PI * 0.7;
    collar.position.set(0, 0.485, 0.008);
    spine.add(collar);

    const belt = new THREE.Mesh(
      track(new THREE.CylinderGeometry(waistWidth * 0.97, waistWidth * 0.98, 0.028, 24)),
      leatherTrimMat
    );
    belt.scale.set(1.01, 1, 0.7);
    belt.position.set(0, 0.04, 0.002);
    spine.add(belt);

    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.024, 0.012), buttonMat);
    buckle.position.set(0, 0.04, waistWidth * 0.7);
    spine.add(buckle);
  }

  // Tailored Outerwear with Lapels, Buttons, Pockets & Seam Piping
  if (config.outerwearStyle !== 'none') {
    const outerMat =
      config.outfitPreset === 'blazer_skirt_set' || config.outfitPreset === 'trench_suit'
        ? primaryClothMat
        : config.outerwearStyle === 'leather_jacket'
        ? makeClothMat('#1C1D22', 'leather')
        : secondaryClothMat;

    const isTrench = config.outerwearStyle === 'trench_coat';
    const coatLen = isTrench ? 0.62 : 0.4;
    const coatY = isTrench ? 0.14 : 0.27;

    [-1, 1].forEach((side) => {
      const panelGeo = track(
        new THREE.BoxGeometry(chestWidth * 0.78, coatLen, chestWidth * 1.18)
      );
      const panel = new THREE.Mesh(panelGeo, outerMat);
      panel.position.set(side * chestWidth * 0.42, coatY, 0.006);
      panel.rotation.z = side * -0.04;
      panel.castShadow = highDetail;
      spine.add(panel);

      // Tailored Pocket Flap
      const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.018, 0.012), outerMat);
      pocket.position.set(side * chestWidth * 0.56, 0.16, chestWidth * 0.62);
      spine.add(pocket);

      // Notched Lapel
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.14, 0.014), outerMat);
      lapel.position.set(side * 0.052, 0.4, chestWidth * 0.63);
      lapel.rotation.z = side * -0.28;
      lapel.rotation.y = side * 0.25;
      spine.add(lapel);
    });

    // Collar + Buttons
    const coatCollar = new THREE.Mesh(
      track(new THREE.TorusGeometry(chestWidth * 0.44, 0.018, 8, 22, Math.PI * 1.25)),
      outerMat
    );
    coatCollar.rotation.x = Math.PI / 2 - 0.22;
    coatCollar.rotation.z = Math.PI * 0.88;
    coatCollar.position.set(0, 0.465, 0.015);
    spine.add(coatCollar);

    if (highDetail) {
      [0.2, 0.28, 0.36].forEach((by) => {
        const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, 12), buttonMat);
        btn.rotation.x = Math.PI / 2;
        btn.position.set(0.032, by, chestWidth * 0.62);
        spine.add(btn);
      });
    }
  }

  // Sculpted Pleated Skirt / Dress Hem
  let skirtPivot: THREE.Object3D | undefined;
  const usesSkirt =
    isOnePieceDress ||
    config.outfitPreset === 'blazer_skirt_set' ||
    config.outfitPreset === 'tennis_set' ||
    (config.outfitPreset === 'custom' &&
      (config.bottomStyle === 'pleated_skirt' || config.bottomStyle === 'midi_skirt'));

  if (usesSkirt) {
    const skirtMat = isOnePieceDress ? primaryClothMat : secondaryClothMat;
    let skirtLen = 0.36;
    let skirtFlare = 1.62;
    if (config.outfitPreset === 'evening_gown') {
      skirtLen = 0.86;
      skirtFlare = 2.02;
    } else if (
      config.outfitPreset === 'silk_slip_dress' ||
      config.bottomStyle === 'midi_skirt'
    ) {
      skirtLen = 0.54;
      skirtFlare = 1.44;
    }

    const segsR = 40;
    const segsH = 12;
    const skirtGeo = track(new THREE.CylinderGeometry(hipWidth * 0.96, hipWidth * skirtFlare, skirtLen, segsR, segsH, true));
    skirtGeo.translate(0, -skirtLen / 2 + 0.04, 0);
    // Real pleated radial folds
    const sPos = skirtGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < sPos.count; i++) {
      const sx = sPos.getX(i);
      const sy = sPos.getY(i);
      const sz = sPos.getZ(i);
      const t = THREE.MathUtils.clamp((0.04 - sy) / skirtLen, 0, 1);
      const ang = Math.atan2(sz, sx);
      const pleat = Math.sin(ang * 16) * 0.011 * t;
      const r = Math.hypot(sx, sz) + pleat;
      sPos.setXYZ(i, Math.cos(ang) * r, sy, Math.sin(ang) * r * 0.84);
    }
    skirtGeo.computeVertexNormals();

    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.castShadow = highDetail;
    skirtMesh.receiveShadow = true;
    hips.add(skirtMesh);
    skirtPivot = skirtMesh;
  }

  // Necklace
  if (config.jewelryStyle === 'layered_necklace') {
    const chain = new THREE.Mesh(track(new THREE.TorusGeometry(0.066, 0.0045, 8, 24)), goldMetalMat);
    chain.rotation.x = Math.PI / 2 + 0.32;
    chain.position.set(0, 0.475, 0.025);
    spine.add(chain);

    const pendant = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.012, 0)), goldMetalMat);
    pendant.position.set(0, 0.44, 0.086);
    spine.add(pendant);
  }

  // =====================================================================
  // NECK, CONTINUOUS SCULPTED HEAD, CORNEA EYES & HAIR-CARD SYSTEM
  // =====================================================================
  const neck = new THREE.Group();
  neck.position.set(0, 0.48, 0);
  spine.add(neck);

  const neckGeo = track(buildSculptedLimbGeometry(0.044, 0.046, 0.056, 0.125, 18));
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  neckMesh.position.y = 0.118;
  neckMesh.castShadow = highDetail;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.set(0, 0.175, 0.006);
  neck.add(head);

  // Continuous sculpted head mesh
  const headGeo = track(buildSculptedHeadGeometry(config, highDetail));
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  head.add(headMesh);

  // Tinted vermilion lip surface overlay conformed neatly to mouth curvature
  const lipBand = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.017, 16, 10)),
    lipMat
  );
  lipBand.scale.set(1.45, 0.46 * config.lipFullness, 0.65);
  lipBand.position.set(0, -0.047, 0.104);
  head.add(lipBand);

  if (config.expression === 'big_laugh') {
    const teethMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.0065, 0.006),
      track(new THREE.MeshStandardMaterial({ color: '#F6F4EE', roughness: 0.25 }))
    );
    teethMesh.position.set(0, -0.047, 0.107);
    head.add(teethMesh);
  }

  // Anatomical Ears + Jewelry
  [-1, 1].forEach((side) => {
    const ear = new THREE.Mesh(track(new THREE.SphereGeometry(0.019, 12, 10)), skinMat);
    ear.scale.set(0.38, 0.92, 0.62);
    ear.rotation.z = side * -0.14;
    ear.position.set(side * 0.098 * config.cheekFullness, -0.008, -0.006);
    head.add(ear);

    if (config.jewelryStyle === 'pearl_earrings') {
      const pearl = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.009, 10, 8)),
        track(new THREE.MeshPhysicalMaterial({ color: '#FAF8F4', roughness: 0.14, clearcoat: 0.9 }))
      );
      pearl.position.set(side * 0.101 * config.cheekFullness, -0.029, -0.004);
      head.add(pearl);
    } else if (config.jewelryStyle === 'gold_hoops') {
      const hoop = new THREE.Mesh(track(new THREE.TorusGeometry(0.015, 0.0024, 8, 18)), goldMetalMat);
      hoop.rotation.y = Math.PI / 2;
      hoop.position.set(side * 0.101 * config.cheekFullness, -0.036, -0.004);
      head.add(hoop);
    }
  });

  // Multi-Layer Eyes seated inside carved orbital sockets (Sclera + Iris + Cornea Dome + Eyelid Crease + Brows)
  const eyelids: THREE.Object3D[] = [];
  const irises: THREE.Object3D[] = [];
  const eyeScale = config.eyeSize;
  const isWinking = config.expression === 'playful_wink';

  [-1, 1].forEach((side, idx) => {
    const eyeSocket = new THREE.Group();
    eyeSocket.position.set(side * 0.033 * config.cheekFullness, 0.013, 0.088);
    head.add(eyeSocket);

    const eyeball = new THREE.Mesh(track(new THREE.SphereGeometry(0.0135 * eyeScale, 20, 16)), eyeMat);
    // Sphere UV center faces +X/+Z depending on rotation; align iris texture straight forward (+Z)
    eyeball.rotation.y = -Math.PI / 2;
    eyeSocket.add(eyeball);
    irises.push(eyeball);

    // Outer Glossy Cornea Dome (catches specular HDR reflections)
    if (highDetail) {
      const cornea = new THREE.Mesh(
        track(new THREE.SphereGeometry(0.0144 * eyeScale, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.45)),
        corneaMat
      );
      cornea.rotation.x = Math.PI / 2;
      eyeSocket.add(cornea);
    }

    // Upper lash & eyelid crease fold
    const lash = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.0145 * eyeScale, 0.0016, 6, 16, Math.PI * 0.92)),
      browMat
    );
    lash.position.set(0, 0.0025, 0.006);
    lash.rotation.z = 0.12;
    eyeSocket.add(lash);

    // Animated upper eyelid
    const eyelid = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.0146 * eyeScale, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.56)),
      skinMat
    );
    eyelid.rotation.x = isWinking && idx === 1 ? 0.35 : -0.95;
    eyeSocket.add(eyelid);
    eyelids.push(eyelid);

    // Tapered natural Eyebrow arch
    const brow = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.031, 0.0042 * config.eyebrowThickness, 0.005)),
      browMat
    );
    brow.rotation.z = side * (-0.06 - config.eyebrowArch * 0.22);
    brow.rotation.y = side * -0.22;
    const exprLift =
      config.expression === 'warm_smile' || config.expression === 'big_laugh' ? 0.0025 : 0;
    brow.position.set(
      side * 0.034 * config.cheekFullness,
      0.035 + config.eyebrowArch * 0.007 + exprLift,
      0.095
    );
    head.add(brow);
  });

  // Eyewear
  if (config.glassesStyle !== 'none') {
    const isSunglasses = config.glassesStyle === 'sunglasses';
    const lensMat = track(
      new THREE.MeshPhysicalMaterial({
        color: isSunglasses ? '#15181E' : '#DCE9F5',
        roughness: 0.06,
        metalness: isSunglasses ? 0.3 : 0.05,
        transparent: true,
        opacity: isSunglasses ? 0.85 : 0.26,
      })
    );
    const rimMat = isSunglasses ? leatherTrimMat : goldMetalMat;

    [-1, 1].forEach((side) => {
      const rx = side * 0.034 * config.cheekFullness;
      const lensGeo =
        config.glassesStyle === 'round_wire'
          ? new THREE.CylinderGeometry(0.02, 0.02, 0.003, 20)
          : new THREE.BoxGeometry(0.038, 0.026, 0.003);
      const lens = new THREE.Mesh(track(lensGeo), lensMat);
      if (config.glassesStyle === 'round_wire') lens.rotation.x = Math.PI / 2;
      if (config.glassesStyle === 'cat_eye') lens.rotation.z = side * 0.14;
      lens.position.set(rx, 0.014, 0.118);
      head.add(lens);

      const rim = new THREE.Mesh(track(new THREE.TorusGeometry(0.02, 0.002, 8, 22)), rimMat);
      rim.position.set(rx, 0.014, 0.119);
      head.add(rim);
    });

    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.0028, 0.0028), rimMat);
    bridge.position.set(0, 0.017, 0.119);
    head.add(bridge);
  }

  // =====================================================================
  // LAYERED ALPHA-CUTOUT STRAND HAIR-CARD GROOM SYSTEM
  // =====================================================================
  const hairGroup = new THREE.Group();
  head.add(hairGroup);
  const hairSwayGroups: THREE.Object3D[] = [];

  // Under-scalp fitted base (never sticks out like a bulky helmet)
  const scalpBase = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.11, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62)),
    hairScalpMat
  );
  scalpBase.scale.set(config.cheekFullness * 0.96, 1.11, 1.06);
  scalpBase.position.set(0, 0.008, -0.008);
  scalpBase.rotation.x = -0.26;
  hairGroup.add(scalpBase);

  const addHairCard = (pts: THREE.Vector3[], wTop: number, wBot: number, swayable = true) => {
    const curve = new THREE.CatmullRomCurve3(pts);
    const cardGeo = track(buildHairCardGeometry(curve, wTop, wBot, highDetail ? 14 : 8));
    const card = new THREE.Mesh(cardGeo, hairCardMat);
    card.castShadow = highDetail;
    if (swayable) {
      const wrap = new THREE.Group();
      wrap.add(card);
      hairGroup.add(wrap);
      hairSwayGroups.push(wrap);
    } else {
      hairGroup.add(card);
    }
  };

  // Bangs & Korean forehead framing cards
  if (config.bangsStyle === 'wispy') {
    for (let i = -3; i <= 3; i++) {
      addHairCard(
        [
          new THREE.Vector3(i * 0.016, 0.1, 0.04),
          new THREE.Vector3(i * 0.019, 0.068, 0.098 - Math.abs(i) * 0.008),
          new THREE.Vector3(i * 0.021, 0.026, 0.106 - Math.abs(i) * 0.009),
        ],
        0.024,
        0.018
      );
    }
  } else if (config.bangsStyle === 'side_part') {
    [-1, 1].forEach((side) => {
      addHairCard(
        [
          new THREE.Vector3(side * 0.01, 0.108, 0.03),
          new THREE.Vector3(side * 0.048, 0.072, 0.092),
          new THREE.Vector3(side * 0.078, 0.012, 0.085),
          new THREE.Vector3(side * 0.088, -0.045, 0.065),
        ],
        0.048,
        0.032
      );
    });
  }

  const hLen = config.hairLength;
  const hs = config.hairStyle;

  if (hs === 'long_waves' || hs === 'silky_straight' || hs === 'wolf_cut') {
    const isWavy = hs === 'long_waves' || hs === 'wolf_cut';
    const fallLen = (hs === 'wolf_cut' ? 0.22 : 0.3) * hLen;
    const cardCount = highDetail ? 11 : 7;

    for (let i = 0; i < cardCount; i++) {
      const ang = THREE.MathUtils.lerp(-Math.PI * 0.78, Math.PI * 0.78, i / (cardCount - 1));
      const rx = Math.sin(ang) * 0.102;
      const rz = -Math.cos(ang) * 0.102 - 0.012;
      const waveShift = isWavy ? Math.sin(i * 1.7) * 0.018 : 0;

      addHairCard(
        [
          new THREE.Vector3(rx * 0.65, 0.09, rz * 0.55),
          new THREE.Vector3(rx * 1.06, 0.01, rz * 1.08),
          new THREE.Vector3(rx * 1.12 + waveShift, -fallLen * 0.52, rz * 1.12),
          new THREE.Vector3(rx * 1.16 - waveShift * 0.6, -fallLen, rz * 1.05),
        ],
        0.056,
        0.048
      );
    }

    // Face-framing side curtain cards
    [-1, 1].forEach((side) => {
      addHairCard(
        [
          new THREE.Vector3(side * 0.075, 0.06, 0.04),
          new THREE.Vector3(side * 0.104, -0.02, 0.05),
          new THREE.Vector3(side * 0.102, -0.17 * hLen, 0.048),
        ],
        0.038,
        0.026
      );
    });
  } else if (hs === 'bob_cut' || hs === 'layered_curtains') {
    const bobLen = (hs === 'bob_cut' ? 0.13 : 0.19) * hLen;
    const count = highDetail ? 10 : 6;
    for (let i = 0; i < count; i++) {
      const ang = THREE.MathUtils.lerp(-Math.PI * 0.76, Math.PI * 0.76, i / (count - 1));
      const rx = Math.sin(ang) * 0.104;
      const rz = -Math.cos(ang) * 0.104 - 0.008;
      addHairCard(
        [
          new THREE.Vector3(rx * 0.7, 0.088, rz * 0.65),
          new THREE.Vector3(rx * 1.08, 0.01, rz * 1.08),
          new THREE.Vector3(rx * 0.98, -bobLen, rz * 0.95),
        ],
        0.052,
        0.044
      );
    }
  } else if (hs === 'high_ponytail') {
    const band = new THREE.Mesh(track(new THREE.TorusGeometry(0.025, 0.007, 8, 16)), primaryClothMat);
    band.position.set(0, 0.075, -0.108);
    band.rotation.x = 0.68;
    hairGroup.add(band);

    for (let i = -2; i <= 2; i++) {
      addHairCard(
        [
          new THREE.Vector3(i * 0.01, 0.078, -0.11),
          new THREE.Vector3(i * 0.024, 0.03, -0.165),
          new THREE.Vector3(i * 0.03, -0.12 * hLen, -0.175),
          new THREE.Vector3(i * 0.026, -0.27 * hLen, -0.145),
        ],
        0.046,
        0.038
      );
    }
  } else if (hs === 'chic_buns') {
    [-0.076, 0.076].forEach((bx) => {
      const chignon = new THREE.Mesh(track(new THREE.SphereGeometry(0.048, 14, 12)), hairScalpMat);
      chignon.position.set(bx, 0.105, -0.042);
      hairGroup.add(chignon);
    });
  } else {
    // Korean Two-Block / Comma Hair / Textured Curls / Short Crop
    const topStrands = hs === 'comma_hair' || hs === 'korean_two_block' ? 9 : 7;
    for (let i = 0; i < topStrands; i++) {
      const t = i / (topStrands - 1) - 0.5;
      const curveShift = hs === 'comma_hair' ? Math.sin(t * Math.PI) * 0.025 : 0;
      addHairCard(
        [
          new THREE.Vector3(t * 0.12, 0.115, -0.03),
          new THREE.Vector3(t * 0.13 + curveShift, 0.095, 0.05),
          new THREE.Vector3(t * 0.12 - curveShift * 0.5, 0.045, 0.096 - Math.abs(t) * 0.04),
        ],
        0.044,
        0.03
      );
    }
    if (hs === 'textured_curls') {
      for (let i = 0; i < 12; i++) {
        const ang = (i / 12) * Math.PI * 1.4 - Math.PI * 0.7;
        addHairCard(
          [
            new THREE.Vector3(Math.sin(ang) * 0.095, 0.075, -Math.cos(ang) * 0.095),
            new THREE.Vector3(Math.sin(ang) * 0.118, 0.0, -Math.cos(ang) * 0.115),
          ],
          0.046,
          0.04
        );
      }
    }
  }

  // =====================================================================
  // ANATOMICAL ARMS & 5-FINGERED HANDS
  // =====================================================================
  const hasLongSleeves =
    config.outerwearStyle !== 'none' ||
    config.topStyle === 'turtleneck' ||
    config.topStyle === 'knit_sweater' ||
    config.topStyle === 'hoodie' ||
    config.topStyle === 'blazer_top' ||
    config.outfitPreset === 'blazer_skirt_set' ||
    config.outfitPreset === 'trench_suit';

  const armMat = hasLongSleeves ? primaryClothMat : skinMat;
  const sleeveLowerMat =
    config.outerwearStyle !== 'none' ? secondaryClothMat : hasLongSleeves ? primaryClothMat : skinMat;

  const armR = isFemale ? 0.036 : 0.044;
  const forearmR = isFemale ? 0.03 : 0.036;
  const wristR = isFemale ? 0.023 : 0.027;

  const buildArm = (side: -1 | 1) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * (chestWidth + 0.02), 0.435, 0);
    spine.add(shoulder);

    const upperArm = new THREE.Mesh(
      track(buildSculptedLimbGeometry(armR, armR * 0.92, forearmR * 1.02, 0.27, 14)),
      armMat
    );
    upperArm.castShadow = highDetail;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.set(0, -0.27, 0);
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(
      track(buildSculptedLimbGeometry(forearmR, forearmR * 0.9, wristR, 0.25, 14)),
      sleeveLowerMat
    );
    forearm.castShadow = highDetail;
    elbow.add(forearm);

    const hand = buildFiveFingerHand(side, skinMat, highDetail);
    hand.position.set(0, -0.25, 0);
    elbow.add(hand);

    return { shoulder, elbow, hand };
  };

  const leftArmRig = buildArm(-1);
  const rightArmRig = buildArm(1);

  // Smartphone prop attached to right hand for phone_check pose
  let phoneProp: THREE.Object3D | undefined;
  if (highDetail) {
    const phoneGroup = new THREE.Group();
    const phoneBody = new THREE.Mesh(
      new THREE.BoxGeometry(0.046, 0.092, 0.006),
      track(new THREE.MeshStandardMaterial({ color: '#181A1E', roughness: 0.25, metalness: 0.7 }))
    );
    const phoneScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.041, 0.084),
      track(
        new THREE.MeshStandardMaterial({
          color: '#EAF3FF',
          emissive: '#3C82F6',
          emissiveIntensity: 0.55,
          roughness: 0.1,
        })
      )
    );
    phoneScreen.position.z = 0.0036;
    phoneGroup.add(phoneBody, phoneScreen);
    phoneGroup.position.set(0.012, -0.055, 0.032);
    phoneGroup.rotation.x = -Math.PI * 0.36;
    phoneGroup.visible = config.pose === 'phone_check';
    rightArmRig.hand.add(phoneGroup);
    phoneProp = phoneGroup;
  }

  // Bags
  if (config.bagStyle === 'crossbody') {
    const strap = new THREE.Mesh(
      track(new THREE.TorusGeometry(chestWidth * 1.12, 0.0085, 8, 28)),
      leatherTrimMat
    );
    strap.rotation.y = Math.PI / 2 - 0.35;
    strap.rotation.z = 0.55;
    strap.position.set(0, 0.26, 0.01);
    spine.add(strap);

    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.095, 0.038), leatherTrimMat);
    pouch.position.set(-hipWidth * 1.08, -0.02, 0.04);
    pouch.rotation.y = -0.3;
    hips.add(pouch);
  } else if (config.bagStyle === 'mini_tote') {
    const tote = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.145, 0.135), leatherTrimMat);
    body.position.y = -0.09;
    const handle = new THREE.Mesh(
      track(new THREE.TorusGeometry(0.038, 0.0055, 6, 16, Math.PI)),
      leatherTrimMat
    );
    handle.rotation.y = Math.PI / 2;
    handle.position.y = -0.015;
    tote.add(body, handle);
    tote.position.set(-0.024, -0.05, 0);
    leftArmRig.hand.add(tote);
  }

  // =====================================================================
  // ANATOMICAL LEGS & MULTI-PART FOOTWEAR
  // =====================================================================
  const hasPants = !usesSkirt;
  const isShorts = config.outfitPreset === 'custom' && config.bottomStyle === 'tailored_shorts';
  const thighMat = hasPants ? secondaryClothMat : skinMat;
  const calfMat = hasPants && !isShorts ? secondaryClothMat : skinMat;

  const thighTopR = isFemale ? 0.068 : 0.072;
  const kneeR = isFemale ? 0.044 : 0.048;
  const ankleR = isFemale ? 0.028 : 0.033;

  const buildLeg = (side: -1 | 1) => {
    const hipJoint = new THREE.Group();
    hipJoint.position.set(side * (hipWidth * 0.54), -0.03, 0);
    hips.add(hipJoint);

    const thigh = new THREE.Mesh(
      track(buildSculptedLimbGeometry(thighTopR, thighTopR * 0.84, kneeR, 0.42, 16)),
      thighMat
    );
    thigh.castShadow = highDetail;
    hipJoint.add(thigh);

    const kneeJoint = new THREE.Group();
    kneeJoint.position.set(0, -0.42, 0);
    hipJoint.add(kneeJoint);

    const calf = new THREE.Mesh(
      track(buildSculptedLimbGeometry(kneeR, kneeR * 0.96, ankleR, 0.42, 16)),
      calfMat
    );
    calf.castShadow = highDetail;
    kneeJoint.add(calf);

    // Footwear (Ankle Boots / Sneakers / Heels / Loafers)
    const shoeGroup = new THREE.Group();
    shoeGroup.position.set(0, -0.42, 0.022);
    kneeJoint.add(shoeGroup);

    const soleMat = track(
      new THREE.MeshStandardMaterial({
        color: config.footwearStyle === 'minimal_sneakers' ? '#F3F2EE' : '#181A1E',
        roughness: 0.72,
      })
    );

    if (config.footwearStyle === 'classic_heels') {
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.032, 0.145), leatherTrimMat);
      upper.position.set(0, -0.02, 0.015);
      const heel = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.005, 0.06, 10), leatherTrimMat);
      heel.position.set(0, -0.048, -0.042);
      shoeGroup.add(upper, heel);
    } else if (config.footwearStyle === 'ankle_boots') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.034, 0.12, 14), leatherTrimMat);
      shaft.position.set(0, 0.01, -0.02);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.044, 0.165), leatherTrimMat);
      foot.position.set(0, -0.046, 0.012);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.016, 0.172), soleMat);
      sole.position.set(0, -0.072, 0.012);
      shoeGroup.add(shaft, foot, sole);
    } else {
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.044, 0.165), leatherTrimMat);
      upper.position.set(0, -0.042, 0.012);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.076, 0.018, 0.172), soleMat);
      sole.position.set(0, -0.068, 0.012);
      shoeGroup.add(upper, sole);
    }

    return { hipJoint, kneeJoint };
  };

  const leftLegRig = buildLeg(-1);
  const rightLegRig = buildLeg(1);

  return {
    root,
    hips,
    spine,
    neck,
    head,
    leftShoulder: leftArmRig.shoulder,
    leftElbow: leftArmRig.elbow,
    rightShoulder: rightArmRig.shoulder,
    rightElbow: rightArmRig.elbow,
    leftHip: leftLegRig.hipJoint,
    leftKnee: leftLegRig.kneeJoint,
    rightHip: rightLegRig.hipJoint,
    rightKnee: rightLegRig.kneeJoint,
    eyelids,
    irises,
    leftHand: leftArmRig.hand,
    rightHand: rightArmRig.hand,
    hairSwayGroups,
    skirtPivot,
    phoneProp,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

/**
 * Smooth frame-rate independent animation covering:
 * - Natural world walking / running stride with knee flexion & hip counter-twist
 * - Living idle breathing, subtle look-around & natural eye micro-saccades + blinking
 * - Expressive studio poses, phone-checking, and subtle hair/garment breeze
 */
export function updateCharacterAnimation(
  rig: CharacterRig,
  pose: CharacterPoseId,
  expression: CharacterExpressionId,
  elapsed: number,
  delta: number,
  isSoftwareGl: boolean,
  locomotion?: CharacterLocomotionState
): void {
  const lambda = isSoftwareGl ? 24 : 11;
  const standingHipY = 0.94;
  const t = getPoseTargets(pose, standingHipY);

  if (rig.phoneProp) {
    rig.phoneProp.visible = pose === 'phone_check' && !(locomotion?.isMoving);
  }

  let targetHipsY = t.hipsY;
  let targetHipsRotY = t.hipsRotY;
  let targetSpineX = t.spineRotX;
  let targetSpineY = t.spineRotY;
  let targetSpineZ = t.spineRotZ;
  let targetHeadX = t.headRotX;
  let targetHeadY = t.headRotY;
  let targetHeadZ = t.headRotZ;
  let lArmX = t.lArmX;
  let lArmZ = t.lArmZ;
  let lElbowX = t.lElbowX;
  let rArmX = t.rArmX;
  let rArmZ = t.rArmZ;
  let rElbowX = t.rElbowX;
  let lLegX = t.lLegX;
  let lLegZ = t.lLegZ;
  let lKneeX = t.lKneeX;
  let rLegX = t.rLegX;
  let rLegZ = t.rLegZ;
  let rKneeX = t.rKneeX;

  if (locomotion?.isMoving) {
    const isRunning = locomotion.speedRatio > 0.7;
    const freq = isRunning ? 9.8 : 6.2;
    const stride = isRunning ? 0.62 : 0.38;
    const phase = elapsed * freq;
    const s = Math.sin(phase);
    const c = Math.cos(phase);

    // Natural vertical gait bounce & forward lean
    targetHipsY = standingHipY - 0.015 + Math.abs(c) * (isRunning ? 0.042 : 0.02);
    targetHipsRotY = s * 0.08;
    targetSpineX = isRunning ? 0.14 : 0.04;
    targetSpineY = -s * 0.09;
    targetHeadX = isRunning ? -0.06 : -0.01;
    targetHeadY = s * 0.03;

    // Legs (heel-toe flexion + knee lift)
    lLegX = s * stride;
    rLegX = -s * stride;
    lLegZ = 0.025;
    rLegZ = -0.025;
    lKneeX = Math.max(0.05, -c * (isRunning ? 0.95 : 0.55) + 0.2);
    rKneeX = Math.max(0.05, c * (isRunning ? 0.95 : 0.55) + 0.2);

    // Opposite arms swing naturally
    lArmX = -s * stride * 0.72;
    rArmX = s * stride * 0.72;
    lArmZ = 0.11;
    rArmZ = -0.11;
    lElbowX = isRunning ? -1.1 : -0.35 - Math.max(0, -s) * 0.25;
    rElbowX = isRunning ? -1.1 : -0.35 - Math.max(0, s) * 0.25;
  } else {
    // Living idle breathing + gentle organic look-around
    const breath = Math.sin(elapsed * 1.55);
    targetSpineX += breath * 0.012;
    targetHeadY +=
      expression === 'shy_glance'
        ? 0.24
        : Math.sin(elapsed * 0.45) * 0.06;
    targetHeadZ += Math.sin(elapsed * 0.35) * 0.025;
    targetHipsY += breath * 0.0025;
  }

  // Smooth exponential joint damping
  rig.hips.position.y = THREE.MathUtils.damp(rig.hips.position.y, targetHipsY, lambda, delta);
  rig.hips.position.z = THREE.MathUtils.damp(rig.hips.position.z, t.hipsZ, lambda, delta);
  rig.hips.rotation.y = THREE.MathUtils.damp(rig.hips.rotation.y, targetHipsRotY, lambda, delta);

  rig.spine.rotation.x = THREE.MathUtils.damp(rig.spine.rotation.x, targetSpineX, lambda, delta);
  rig.spine.rotation.y = THREE.MathUtils.damp(rig.spine.rotation.y, targetSpineY, lambda, delta);
  rig.spine.rotation.z = THREE.MathUtils.damp(rig.spine.rotation.z, targetSpineZ, lambda, delta);

  rig.head.rotation.x = THREE.MathUtils.damp(rig.head.rotation.x, targetHeadX, lambda, delta);
  rig.head.rotation.y = THREE.MathUtils.damp(rig.head.rotation.y, targetHeadY, lambda, delta);
  rig.head.rotation.z = THREE.MathUtils.damp(rig.head.rotation.z, targetHeadZ, lambda, delta);

  rig.leftShoulder.rotation.x = THREE.MathUtils.damp(rig.leftShoulder.rotation.x, lArmX, lambda, delta);
  rig.leftShoulder.rotation.z = THREE.MathUtils.damp(rig.leftShoulder.rotation.z, lArmZ, lambda, delta);
  rig.leftElbow.rotation.x = THREE.MathUtils.damp(rig.leftElbow.rotation.x, lElbowX, lambda, delta);

  rig.rightShoulder.rotation.x = THREE.MathUtils.damp(rig.rightShoulder.rotation.x, rArmX, lambda, delta);
  rig.rightShoulder.rotation.z = THREE.MathUtils.damp(rig.rightShoulder.rotation.z, rArmZ, lambda, delta);
  rig.rightElbow.rotation.x = THREE.MathUtils.damp(rig.rightElbow.rotation.x, rElbowX, lambda, delta);

  rig.leftHip.rotation.x = THREE.MathUtils.damp(rig.leftHip.rotation.x, lLegX, lambda, delta);
  rig.leftHip.rotation.z = THREE.MathUtils.damp(rig.leftHip.rotation.z, lLegZ, lambda, delta);
  rig.leftKnee.rotation.x = THREE.MathUtils.damp(rig.leftKnee.rotation.x, lKneeX, lambda, delta);

  rig.rightHip.rotation.x = THREE.MathUtils.damp(rig.rightHip.rotation.x, rLegX, lambda, delta);
  rig.rightHip.rotation.z = THREE.MathUtils.damp(rig.rightHip.rotation.z, rLegZ, lambda, delta);
  rig.rightKnee.rotation.x = THREE.MathUtils.damp(rig.rightKnee.rotation.x, rKneeX, lambda, delta);

  // Dynamic skirt & hair strand motion response
  if (rig.skirtPivot) {
    const strideSway = locomotion?.isMoving ? Math.sin(elapsed * 6.2) * 0.08 : 0;
    const goalSkirtX = pose === 'studio_sit' ? -0.58 : strideSway;
    rig.skirtPivot.rotation.x = THREE.MathUtils.damp(
      rig.skirtPivot.rotation.x,
      goalSkirtX,
      lambda,
      delta
    );
  }

  for (let i = 0; i < rig.hairSwayGroups.length; i++) {
    const wind = Math.sin(elapsed * 2.1 + i * 0.7) * 0.018;
    const walkBounce = locomotion?.isMoving ? Math.abs(Math.sin(elapsed * 6.2)) * 0.045 : 0;
    rig.hairSwayGroups[i].rotation.x = wind + walkBounce;
  }

  // Living blinking & subtle iris micro-saccades (prevents frozen doll eyes)
  const blinkCycle = elapsed % 4.3;
  const blinkAmount = blinkCycle > 4.14 ? Math.sin(((blinkCycle - 4.14) / 0.16) * Math.PI) : 0;
  const isWinking = expression === 'playful_wink';

  rig.eyelids.forEach((lid, idx) => {
    const closedAngle = 0.25;
    const openAngle = -0.98;
    const targetLidX =
      isWinking && idx === 1
        ? closedAngle
        : THREE.MathUtils.lerp(openAngle, closedAngle, blinkAmount);
    lid.rotation.x = THREE.MathUtils.damp(lid.rotation.x, targetLidX, 26, delta);
  });

  const saccadeX = Math.sin(elapsed * 0.85) * 0.055 + (expression === 'shy_glance' ? 0.14 : 0);
  const saccadeY = Math.cos(elapsed * 0.62) * 0.025;
  rig.irises.forEach((iris) => {
    iris.rotation.y = -Math.PI / 2 + saccadeX;
    iris.rotation.z = saccadeY;
  });
}
