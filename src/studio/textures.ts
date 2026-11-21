import * as THREE from 'three';
import { FabricMaterialId } from '../types/characterStudio';

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function hash2D(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * Generates height-field to tangent-space Normal Map DataTexture (linear space).
 */
function heightFieldToNormalTexture(
  height: Float32Array,
  size: number,
  strength: number,
  repeat: number,
  maxAnisotropy: number
): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const yUp = (y - 1 + size) % size;
    const yDn = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xLt = (x - 1 + size) % size;
      const xRt = (x + 1) % size;

      const dX = (height[y * size + xRt] - height[y * size + xLt]) * strength;
      const dY = (height[yDn * size + x] - height[yUp * size + x]) * strength;

      let nx = -dX;
      let ny = -dY;
      let nz = 1.0;
      const invLen = 1 / Math.sqrt(nx * nx + ny * ny + nz * nz);
      nx *= invLen;
      ny *= invLen;
      nz *= invLen;

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.colorSpace = THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface SkinPBRMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.CanvasTexture;
}

/**
 * Multi-layer physically-based human skin maps:
 * - Regional melanin & capillary warmth variation (nose tip, cheeks, eyelids, brow)
 * - Fine organic skin pore normal detail (prevents plastic/wax look)
 * - Roughness variation (T-zone subtle natural oil vs matte cheeks)
 */
export function createSkinMaps(
  skinHex: string,
  blushIntensity: number,
  frecklesIntensity: number,
  maxAnisotropy: number
): SkinPBRMaps {
  const size = 512;
  const [canvas, ctx] = createCanvas(size);

  ctx.fillStyle = skinHex;
  ctx.fillRect(0, 0, size, size);

  // Subtle biological capillary warmth across mid-face (UV center x=0.5, y=0.45..0.65)
  const warmFace = ctx.createRadialGradient(
    size * 0.5,
    size * 0.54,
    size * 0.04,
    size * 0.5,
    size * 0.52,
    size * 0.44
  );
  warmFace.addColorStop(0, 'rgba(225, 132, 112, 0.14)');
  warmFace.addColorStop(0.55, 'rgba(210, 140, 115, 0.06)');
  warmFace.addColorStop(1, 'rgba(30, 18, 14, 0.05)');
  ctx.fillStyle = warmFace;
  ctx.fillRect(0, 0, size, size);

  // Subtle nose bridge & ear capillary tint
  const noseWarm = ctx.createRadialGradient(
    size * 0.5,
    size * 0.52,
    2,
    size * 0.5,
    size * 0.52,
    size * 0.09
  );
  noseWarm.addColorStop(0, 'rgba(218, 110, 98, 0.16)');
  noseWarm.addColorStop(1, 'rgba(218, 110, 98, 0)');
  ctx.fillStyle = noseWarm;
  ctx.fillRect(0, 0, size, size);

  // Subtle under-eye & orbital socket tonal depth
  [0.39, 0.61].forEach((cx) => {
    const socket = ctx.createRadialGradient(
      size * cx,
      size * 0.44,
      2,
      size * cx,
      size * 0.44,
      size * 0.075
    );
    socket.addColorStop(0, 'rgba(84, 54, 48, 0.11)');
    socket.addColorStop(1, 'rgba(84, 54, 48, 0)');
    ctx.fillStyle = socket;
    ctx.fillRect(0, 0, size, size);
  });

  // Malar cheek blush
  if (blushIntensity > 0.02) {
    const alpha = Math.min(0.36, blushIntensity * 0.34);
    [0.34, 0.66].forEach((cx) => {
      const g = ctx.createRadialGradient(
        size * cx,
        size * 0.54,
        2,
        size * cx,
        size * 0.54,
        size * 0.085
      );
      g.addColorStop(0, `rgba(212, 88, 90, ${alpha})`);
      g.addColorStop(1, 'rgba(212, 88, 90, 0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    });
  }

  // Fine dermal pigment variation & subtle pores across whole UV
  const imgData = ctx.getImageData(0, 0, size, size);
  const px = imgData.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n1 = hash2D(x * 0.7, y * 0.7);
      const n2 = hash2D(Math.floor(x / 3), Math.floor(y / 3));
      const delta = (n1 - 0.5) * 9 + (n2 - 0.5) * 5;
      const idx = (y * size + x) * 4;
      px[idx] = Math.max(0, Math.min(255, px[idx] + delta));
      px[idx + 1] = Math.max(0, Math.min(255, px[idx + 1] + delta * 0.92));
      px[idx + 2] = Math.max(0, Math.min(255, px[idx + 2] + delta * 0.85));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Subtle organic freckles & natural beauty marks
  if (frecklesIntensity > 0.04) {
    ctx.fillStyle = `rgba(110, 62, 42, ${Math.min(0.42, frecklesIntensity * 0.38)})`;
    for (let i = 0; i < 48; i++) {
      const rx = hash2D(i * 3.1, 7.2);
      const ry = hash2D(9.4, i * 5.7);
      const x = size * (0.31 + rx * 0.38);
      const y = size * (0.47 + ry * 0.11);
      const r = 0.75 + (i % 3) * 0.45;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  // Pore micro-normal field (256px for crisp fast generation)
  const nSize = 256;
  const heightField = new Float32Array(nSize * nSize);
  for (let y = 0; y < nSize; y++) {
    for (let x = 0; x < nSize; x++) {
      const finePore = hash2D(x, y);
      const wave = Math.sin(x * 0.55) * Math.cos(y * 0.48) * 0.12;
      // Sparse real pore pits
      const pit = finePore > 0.84 ? -0.55 * (finePore - 0.84) * 6.0 : (finePore - 0.5) * 0.14;
      heightField[y * nSize + x] = pit + wave;
    }
  }
  const normalMap = heightFieldToNormalTexture(heightField, nSize, 1.35, 3, maxAnisotropy);

  // Roughness variation map (T-zone 0.44 vs cheeks 0.62 -> linear grayscale)
  const [rCanvas, rCtx] = createCanvas(256);
  rCtx.fillStyle = '#A0A0A0'; // ~0.62 base matte human skin
  rCtx.fillRect(0, 0, 256, 256);
  const tZone = rCtx.createRadialGradient(128, 128, 6, 128, 128, 90);
  tZone.addColorStop(0, '#727272'); // ~0.45 subtle forehead/nose sheen
  tZone.addColorStop(1, '#A4A4A4');
  rCtx.fillStyle = tZone;
  rCtx.fillRect(0, 0, 256, 256);

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  return { map, normalMap, roughnessMap };
}

export function createIrisTexture(eyeHex: string, maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  const half = size / 2;

  // Natural warm sclera base (never sterile blinding white)
  const scleraGrad = ctx.createRadialGradient(half, half, half * 0.45, half, half, half);
  scleraGrad.addColorStop(0, '#F5F2EE');
  scleraGrad.addColorStop(0.85, '#EAE4DF');
  scleraGrad.addColorStop(1, '#D8C7C1');
  ctx.fillStyle = scleraGrad;
  ctx.fillRect(0, 0, size, size);

  // Outer soft dark limbal ring
  const limbalGrad = ctx.createRadialGradient(half, half, half * 0.72, half, half, half * 0.94);
  limbalGrad.addColorStop(0, eyeHex);
  limbalGrad.addColorStop(0.7, '#161920');
  limbalGrad.addColorStop(1, 'rgba(20, 22, 28, 0.25)');
  ctx.fillStyle = limbalGrad;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.94, 0, Math.PI * 2);
  ctx.fill();

  // Base iris multi-stop gradient
  const irisGrad = ctx.createRadialGradient(half, half, half * 0.22, half, half, half * 0.85);
  irisGrad.addColorStop(0, '#4E3928');
  irisGrad.addColorStop(0.32, eyeHex);
  irisGrad.addColorStop(0.84, eyeHex);
  irisGrad.addColorStop(1, '#10131A');
  ctx.fillStyle = irisGrad;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.86, 0, Math.PI * 2);
  ctx.fill();

  // Detailed radial iris crypt fibers
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2 + (hash2D(i, 4) - 0.5) * 0.04;
    const len = 0.65 + hash2D(i, 9) * 0.18;
    ctx.strokeStyle =
      i % 3 === 0 ? 'rgba(255, 255, 255, 0.18)' : 'rgba(10, 12, 18, 0.24)';
    ctx.lineWidth = i % 2 === 0 ? 1.8 : 1.0;
    ctx.beginPath();
    ctx.moveTo(half + Math.cos(a) * half * 0.29, half + Math.sin(a) * half * 0.29);
    ctx.lineTo(half + Math.cos(a) * half * len, half + Math.sin(a) * half * len);
    ctx.stroke();
  }

  // Collarette inner iris ring
  ctx.strokeStyle = 'rgba(232, 195, 145, 0.26)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(half, half, half * 0.44, 0, Math.PI * 2);
  ctx.stroke();

  // Deep natural pupil
  ctx.fillStyle = '#06070A';
  ctx.beginPath();
  ctx.arc(half, half, half * 0.31, 0, Math.PI * 2);
  ctx.fill();

  // Subtle baked corneal ambient glint (reinforced by real 3D cornea dome)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.beginPath();
  ctx.arc(half - half * 0.22, half - half * 0.24, half * 0.085, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export interface HairPBRMaps {
  map: THREE.CanvasTexture;
  alphaMap: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
}

/**
 * Generates Hair-Card PBR maps with individual combed strands, natural root darkening,
 * feathered alpha-cutout tips, and anisotropic strand normal map.
 */
export function createHairStrandMaps(hairHex: string, maxAnisotropy: number): HairPBRMaps {
  const size = 256;
  const [cCanvas, cCtx] = createCanvas(size);
  const [aCanvas, aCtx] = createCanvas(size);

  cCtx.fillStyle = hairHex;
  cCtx.fillRect(0, 0, size, size);

  // Subtle root-to-tip tonal richness
  const rootShade = cCtx.createLinearGradient(0, 0, 0, size);
  rootShade.addColorStop(0, 'rgba(0, 0, 0, 0.32)');
  rootShade.addColorStop(0.28, 'rgba(0, 0, 0, 0.02)');
  rootShade.addColorStop(0.8, 'rgba(255, 255, 255, 0.05)');
  rootShade.addColorStop(1, 'rgba(0, 0, 0, 0.14)');
  cCtx.fillStyle = rootShade;
  cCtx.fillRect(0, 0, size, size);

  // Alpha mask background = black (transparent cutouts along tip edge)
  aCtx.fillStyle = '#000000';
  aCtx.fillRect(0, 0, size, size);

  const height = new Float32Array(size * size);

  // Draw dense organic hair strands vertically
  for (let x = 0; x < size; x++) {
    const strandTone = hash2D(x, 11.3);
    const tipY = size * (0.76 + hash2D(x, 31.7) * 0.24);
    const sideFade = Math.sin((x / size) * Math.PI);

    // Color variation per strand
    cCtx.fillStyle =
      strandTone > 0.55
        ? `rgba(255, 255, 255, ${(strandTone - 0.5) * 0.18})`
        : `rgba(0, 0, 0, ${(0.55 - strandTone) * 0.26})`;
    cCtx.fillRect(x, 0, 1, size);

    // Alpha strand length with wispy tip tapering
    const alphaVal = Math.round(Math.min(255, sideFade * 275));
    const aGrad = aCtx.createLinearGradient(0, 0, 0, tipY);
    aGrad.addColorStop(0, `rgb(${alphaVal},${alphaVal},${alphaVal})`);
    aGrad.addColorStop(0.75, `rgb(${alphaVal},${alphaVal},${alphaVal})`);
    aGrad.addColorStop(1, 'rgb(0,0,0)');
    aCtx.fillStyle = aGrad;
    aCtx.fillRect(x, 0, 1, tipY);

    // Normal relief along X between hair fibers
    for (let y = 0; y < size; y++) {
      height[y * size + x] = Math.sin(x * 0.85 + strandTone * 6.28) * 0.5 + strandTone * 0.35;
    }
  }

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const alphaMap = new THREE.CanvasTexture(aCanvas);
  alphaMap.colorSpace = THREE.NoColorSpace;
  alphaMap.anisotropy = maxAnisotropy;
  alphaMap.needsUpdate = true;

  const normalMap = heightFieldToNormalTexture(height, size, 1.8, 1, maxAnisotropy);

  return { map, alphaMap, normalMap };
}

export interface FabricPBRMaps {
  map: THREE.CanvasTexture;
  normalMap: THREE.DataTexture;
  roughnessMap: THREE.CanvasTexture;
  baseRoughness: number;
  sheen: number;
}

/**
 * Generates weave-accurate PBR textile maps for Cotton, Denim, Leather, Wool, Silk, Knit, Polyester.
 */
export function createFabricMaps(
  baseHex: string,
  fabric: FabricMaterialId,
  maxAnisotropy: number
): FabricPBRMaps {
  const size = 256;
  const [canvas, ctx] = createCanvas(size);
  const [rCanvas, rCtx] = createCanvas(size);
  const height = new Float32Array(size * size);

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  let baseRoughness = 0.78;
  let sheen = 0.35;
  let normalStrength = 1.4;
  let repeat = 4;

  if (fabric === 'denim') {
    baseRoughness = 0.82;
    sheen = 0.18;
    normalStrength = 2.1;
    repeat = 5;
    rCtx.fillStyle = '#D4D4D4';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const twill = ((x + y) % 6 < 3 ? 1 : -1) * 0.5;
        const grain = (hash2D(x, y) - 0.5) * 0.45;
        height[y * size + x] = twill + grain;
        if ((x + y) % 6 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  } else if (fabric === 'leather') {
    baseRoughness = 0.38;
    sheen = 0.15;
    normalStrength = 1.65;
    repeat = 4;
    rCtx.fillStyle = '#626262';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const cellX = Math.floor(x / 6);
        const cellY = Math.floor(y / 6);
        const pebble = Math.sin((x % 6) * 0.52) * Math.sin((y % 6) * 0.52) * 0.65;
        const rnd = hash2D(cellX, cellY) * 0.45;
        height[y * size + x] = pebble + rnd;
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let i = 0; i < 400; i++) {
      ctx.fillRect(hash2D(i, 1) * size, hash2D(2, i) * size, 2, 2);
    }
  } else if (fabric === 'knit') {
    baseRoughness = 0.86;
    sheen = 0.55;
    normalStrength = 2.6;
    repeat = 5;
    rCtx.fillStyle = '#DEDEDE';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const rib = Math.sin(x * 0.45) * 0.6 + Math.cos(y * 0.35 + Math.abs((x % 14) - 7) * 0.3) * 0.55;
        height[y * size + x] = rib;
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    for (let x = 0; x < size; x += 14) {
      ctx.fillRect(x, 0, 2, size);
    }
  } else if (fabric === 'silk') {
    baseRoughness = 0.28;
    sheen = 0.9;
    normalStrength = 0.55;
    repeat = 3;
    rCtx.fillStyle = '#4B4B4B';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        height[y * size + x] = Math.sin(y * 0.9) * 0.25 + (hash2D(x, y) - 0.5) * 0.12;
      }
    }
  } else if (fabric === 'wool') {
    baseRoughness = 0.9;
    sheen = 0.65;
    normalStrength = 2.0;
    repeat = 5;
    rCtx.fillStyle = '#E4E4E4';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const felt = (hash2D(Math.floor(x / 2), Math.floor(y / 2)) - 0.5) * 1.1;
        height[y * size + x] = felt;
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    for (let i = 0; i < 900; i++) {
      ctx.fillRect(hash2D(i, 8) * size, hash2D(9, i) * size, 2, 1);
    }
  } else if (fabric === 'polyester') {
    baseRoughness = 0.46;
    sheen = 0.42;
    normalStrength = 0.9;
    repeat = 4;
    rCtx.fillStyle = '#757575';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        height[y * size + x] = ((x % 4 === 0) || (y % 4 === 0)) ? 0.3 : -0.1;
      }
    }
  } else {
    // Cotton default
    baseRoughness = 0.84;
    sheen = 0.45;
    normalStrength = 1.25;
    repeat = 5;
    rCtx.fillStyle = '#D2D2D2';
    rCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        height[y * size + x] =
          (Math.sin(x * 1.4) + Math.sin(y * 1.4)) * 0.25 + (hash2D(x, y) - 0.5) * 0.22;
      }
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeat, repeat);
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(repeat, repeat);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  const normalMap = heightFieldToNormalTexture(height, size, normalStrength, repeat, maxAnisotropy);

  return { map, normalMap, roughnessMap, baseRoughness, sheen };
}

export function createFabricTexture(baseHex: string, maxAnisotropy: number): THREE.CanvasTexture {
  return createFabricMaps(baseHex, 'cotton', maxAnisotropy).map;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const [canvas, ctx] = createCanvas(size);
  const half = size / 2;

  const grad = ctx.createRadialGradient(half, half, 4, half, half, half);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.42)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.14)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export function createStudioFloorTexture(
  primaryHex: string,
  accentHex: string,
  tiled: boolean,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const [canvas, ctx] = createCanvas(size);
  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, size, size);

  if (tiled) {
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    const step = 64;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  } else {
    const radial = ctx.createRadialGradient(
      size / 2,
      size / 2,
      10,
      size / 2,
      size / 2,
      size / 2
    );
    radial.addColorStop(0, accentHex);
    radial.addColorStop(1, primaryHex);
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(tiled ? 8 : 1, tiled ? 8 : 1);
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createKoreanSignTexture(
  hangul: string,
  subtitle: string,
  bgHex: string,
  fgHex: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const w = 512;
  const h = 192;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);

  ctx.fillStyle = fgHex;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 56px -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
  ctx.fillText(hangul, w / 2, h * 0.42);

  ctx.fillStyle = accentHex;
  ctx.font = '600 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText(subtitle.toUpperCase(), w / 2, h * 0.75);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function createRoadSurfaceMaps(
  isWet: boolean,
  maxAnisotropy: number
): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = 512;
  const [cCanvas, cCtx] = createCanvas(size);
  const [rCanvas, rCtx] = createCanvas(size);

  cCtx.fillStyle = isWet ? '#23262C' : '#32363E';
  cCtx.fillRect(0, 0, size, size);

  // Subtle asphalt aggregate
  for (let i = 0; i < 4500; i++) {
    const x = hash2D(i, 1.3) * size;
    const y = hash2D(2.7, i) * size;
    cCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.12)';
    cCtx.fillRect(x, y, 2, 2);
  }

  // Korean center double yellow line & lane dashes
  cCtx.fillStyle = '#D4A53C';
  cCtx.fillRect(size * 0.485, 0, 5, size);
  cCtx.fillRect(size * 0.505, 0, 5, size);

  cCtx.fillStyle = 'rgba(244, 244, 246, 0.85)';
  for (let y = 20; y < size; y += 96) {
    cCtx.fillRect(size * 0.24, y, 7, 46);
    cCtx.fillRect(size * 0.75, y, 7, 46);
  }

  // Puddle specular roughness map when raining
  rCtx.fillStyle = isWet ? '#626262' : '#D8D8D8';
  rCtx.fillRect(0, 0, size, size);
  if (isWet) {
    for (let i = 0; i < 16; i++) {
      const px = hash2D(i * 4, 2.1) * size;
      const py = hash2D(3.8, i * 7) * size;
      const rad = 32 + hash2D(i, i) * 58;
      const g = rCtx.createRadialGradient(px, py, 4, px, py, rad);
      g.addColorStop(0, '#141414'); // mirror-wet puddle center
      g.addColorStop(0.65, '#2A2A2A');
      g.addColorStop(1, 'rgba(98,98,98,0)');
      rCtx.fillStyle = g;
      rCtx.fillRect(0, 0, size, size);
    }
  }

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(1, 8);
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(1, 8);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  return { map, roughnessMap };
}

export function createSidewalkMaps(
  isWet: boolean,
  maxAnisotropy: number
): { map: THREE.CanvasTexture; roughnessMap: THREE.CanvasTexture } {
  const size = 256;
  const [cCanvas, cCtx] = createCanvas(size);
  const [rCanvas, rCtx] = createCanvas(size);

  cCtx.fillStyle = isWet ? '#6E7279' : '#B8B9BC';
  cCtx.fillRect(0, 0, size, size);
  cCtx.strokeStyle = isWet ? '#4C5056' : '#9A9B9F';
  cCtx.lineWidth = 2;
  for (let i = 0; i <= size; i += 32) {
    cCtx.beginPath();
    cCtx.moveTo(i, 0);
    cCtx.lineTo(i, size);
    cCtx.stroke();
    cCtx.beginPath();
    cCtx.moveTo(0, i);
    cCtx.lineTo(size, i);
    cCtx.stroke();
  }

  rCtx.fillStyle = isWet ? '#484848' : '#C8C8C8';
  rCtx.fillRect(0, 0, size, size);

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(4, 16);
  map.anisotropy = maxAnisotropy;
  map.needsUpdate = true;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.colorSpace = THREE.NoColorSpace;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.set(4, 16);
  roughnessMap.anisotropy = maxAnisotropy;
  roughnessMap.needsUpdate = true;

  return { map, roughnessMap };
}
