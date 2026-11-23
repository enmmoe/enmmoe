import {
  compressDataUrlImage,
  getAssetFromCache,
  saveAssetToCache,
} from './assetCache';
import {
  AssetRecord,
  ArtworkGenerationState,
  CharacterAppearance,
  ExpressionId,
  MainCharacterProfile,
  OutfitItem,
  PlayerCharacter,
} from './types';

export interface GeminiImageStatus {
  available: boolean;
  model: string;
  reason: string;
}

export async function checkGeminiImageStatus(): Promise<GeminiImageStatus> {
  try {
    const res = await fetch('/api/game/image-status');
    if (!res.ok) {
      return {
        available: false,
        model: 'gemini-3.1-flash-lite-image',
        reason: 'Could not reach artwork generation endpoint.',
      };
    }
    const json = await res.json();
    return {
      available: Boolean(json?.available),
      model: String(json?.model || 'gemini-3.1-flash-lite-image'),
      reason: String(json?.reason || 'Status checked.'),
    };
  } catch {
    return {
      available: false,
      model: 'gemini-3.1-flash-lite-image',
      reason: 'Offline or image service unavailable. Using cached webtoon assets.',
    };
  }
}

export function buildCharacterMasterPrompt(
  name: string,
  appearance: CharacterAppearance,
  outfit: OutfitItem
): string {
  return [
    `Master reference portrait for ${name} (${appearance.presentation} presentation).`,
    `Face shape: ${appearance.faceShape}, hair style: ${appearance.hairStyle.replace('_', ' ')} in color ${appearance.hairColor}, skin tone ${appearance.skinTone}, eye color ${appearance.eyeColor}.`,
    `Wearing ${outfit.name} (${outfit.category}: ${outfit.description}).`,
    `Neutral front-three-quarter upper body pose on clean soft cream background so future expressions and outfits preserve the exact same face, eyes, and hair.`,
  ].join(' ');
}

export function buildExpressionPrompt(
  characterName: string,
  expression: ExpressionId,
  outfitName: string
): string {
  return `Same character (${characterName}) as in the attached master reference portrait. Preserve exact face shape, hairstyle, hair color, eye color, and proportions. Draw upper-body portrait wearing ${outfitName} with a clear "${expression}" facial expression in pastel Korean webtoon illustration style.`;
}

export function buildOutfitPrompt(
  characterName: string,
  outfitPrompt: string
): string {
  return `Same character (${characterName}) as in the attached master reference portrait. Preserve exact face, eyes, hair, and body proportions. Illustrate them wearing: ${outfitPrompt}. Clean pastel Korean webtoon fashion illustration on soft neutral backdrop.`;
}

/**
 * Checks IndexedDB cache first; only requests Gemini server generation when not cached
 * (or when forceRegenerate is explicitly requested by the player).
 * Never fakes AI generation when the server endpoint is unavailable or errors.
 */
export async function requestArtworkGeneration(params: {
  assetId: string;
  kind: AssetRecord['kind'];
  characterId?: string;
  prompt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  referenceAssetId?: string;
  forceRegenerate?: boolean;
}): Promise<ArtworkGenerationState> {
  const {
    assetId,
    kind,
    characterId,
    prompt,
    aspectRatio = '3:4',
    referenceAssetId,
    forceRegenerate = false,
  } = params;

  if (!forceRegenerate) {
    const existing = await getAssetFromCache(assetId);
    if (existing?.dataUrl) {
      return {
        status: 'cached',
        dataUrl: existing.dataUrl,
        source: existing.source,
        message: 'Loaded from IndexedDB artwork cache.',
      };
    }
  }

  let referenceImageDataUrl: string | undefined;
  if (referenceAssetId) {
    const refAsset = await getAssetFromCache(referenceAssetId);
    if (refAsset?.dataUrl) {
      referenceImageDataUrl = refAsset.dataUrl;
    }
  }

  try {
    const res = await fetch('/api/game/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId,
        prompt,
        aspectRatio,
        referenceImageDataUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.dataUrl) {
      return {
        status: res.status === 503 || res.status === 403 ? 'unavailable' : 'error',
        message:
          String(data?.error || '') ||
          'Gemini image generation is not connected right now. Illustrated Korean webtoon artwork remains active.',
        lastRequestedAt: Date.now(),
      };
    }

    const compressed = await compressDataUrlImage(data.dataUrl, 768, 0.86);
    const record: AssetRecord = {
      id: assetId,
      kind,
      characterId,
      mimeType: compressed.mimeType,
      dataUrl: compressed.dataUrl,
      width: compressed.width,
      height: compressed.height,
      source: 'gemini',
      promptHash: prompt.slice(0, 120),
      createdAt: Date.now(),
    };
    await saveAssetToCache(record);

    return {
      status: 'cached',
      dataUrl: compressed.dataUrl,
      source: 'gemini',
      message: 'Generated & saved to IndexedDB cache.',
      lastRequestedAt: Date.now(),
    };
  } catch {
    return {
      status: 'error',
      message: 'Network error contacting artwork server. Tap Retry when ready.',
      lastRequestedAt: Date.now(),
    };
  }
}

/**
 * Serializes any live SVG illustration node into a compressed WebP/JPEG master asset
 * and stores it permanently in IndexedDB so every character has a saved reference portrait.
 */
export async function cacheSvgElementAsAsset(params: {
  assetId: string;
  kind: AssetRecord['kind'];
  characterId?: string;
  svgElement: SVGSVGElement;
  width?: number;
  height?: number;
}): Promise<AssetRecord | null> {
  const { assetId, kind, characterId, svgElement, width = 560, height = 720 } = params;
  try {
    const clone = svgElement.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));

    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const pngOrWebp = await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error('Canvas unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        URL.revokeObjectURL(url);
        try {
          const webp = canvas.toDataURL('image/webp', 0.9);
          resolve(webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/png'));
        } catch {
          resolve(canvas.toDataURL('image/png'));
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('SVG rasterize failed'));
      };
      img.src = url;
    });

    const record: AssetRecord = {
      id: assetId,
      kind,
      characterId,
      mimeType: pngOrWebp.startsWith('data:image/webp') ? 'image/webp' : 'image/png',
      dataUrl: pngOrWebp,
      width,
      height,
      source: 'illustrated',
      createdAt: Date.now(),
    };
    await saveAssetToCache(record);
    return record;
  } catch {
    return null;
  }
}

export function getPlayerRefAssetId(player: PlayerCharacter): string {
  return player.masterReferenceAssetId || `ref:player:${player.id}`;
}

export function getNpcRefAssetId(npc: MainCharacterProfile): string {
  return `ref:npc:${npc.id}`;
}
