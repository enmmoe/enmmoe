import { saveAssetToCache, compressDataUrlImage } from './assetCache';
import {
  LocationId,
  StudioFrameId,
  StudioPhotoMode,
  TimeOfDay,
} from './types';

function svgNodeToImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', '480');
    clone.setAttribute('height', '580');

    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Portrait rasterization failed'));
    };
    img.src = url;
  });
}

function getBackgroundColors(location: LocationId, timeOfDay: TimeOfDay): [string, string, string] {
  const isEvening = timeOfDay === 'evening';
  switch (location) {
    case 'cafe':
      return isEvening ? ['#3E3347', '#6E5066', '#FFDFA8'] : ['#FFF5F7', '#FDE3EC', '#F9CEDB'];
    case 'boutique':
      return isEvening ? ['#373852', '#5B597A', '#E7DDF8'] : ['#F8F5FF', '#EDE6FF', '#D9CEF9'];
    case 'park':
      return isEvening ? ['#2B3359', '#5A5085', '#F3B4BA'] : ['#E3F4EC', '#FBE8F0', '#FFF9EB'];
    case 'metro':
      return isEvening ? ['#2A3142', '#3F4B63', '#A7C8FF'] : ['#EDF3FB', '#DCE7F6', '#B9CEF0'];
    case 'taxi':
      return isEvening ? ['#2E2C47', '#5E4D6B', '#FFD599'] : ['#FFF4E4', '#FFE5C4', '#FFCE8C'];
    case 'home':
      return isEvening ? ['#332F44', '#564E6E', '#FFE6BA'] : ['#FFF8F0', '#FDEEE0', '#F6DFCA'];
    case 'photo_studio':
    default:
      return isEvening ? ['#2D3648', '#4E5B75', '#DCEAFF'] : ['#F4FAFF', '#E5F2FF', '#CBE4FB'];
  }
}

export async function renderStudioCompositionToPng(params: {
  assetId: string;
  mode: StudioPhotoMode;
  backgroundId: LocationId;
  timeOfDay: TimeOfDay;
  frame: StudioFrameId;
  stickers: string[];
  caption: string;
  primarySvg: SVGSVGElement | null;
  partnerSvg?: SVGSVGElement | null;
}): Promise<{ pngDataUrl: string; compressedDataUrl: string }> {
  const {
    assetId,
    mode,
    backgroundId,
    timeOfDay,
    frame,
    stickers,
    caption,
    primarySvg,
    partnerSvg,
  } = params;

  const width = 720;
  const height = 900;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D unavailable');
  }

  // Outer Frame Canvas Base
  ctx.fillStyle =
    frame === 'pastel_ribbon'
      ? '#FFF2F6'
      : frame === 'polaroid_seoul'
      ? '#FFFFFF'
      : frame === 'floral_diary'
      ? '#F7F3FF'
      : '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  const margin = frame === 'minimal_white' ? 24 : 38;
  const bottomMargin = frame === 'polaroid_seoul' ? 128 : margin + (caption.trim() ? 64 : 0);
  const innerW = width - margin * 2;
  const innerH = height - margin - bottomMargin;

  // Inner Scene Gradient
  const [c1, c2, c3] = getBackgroundColors(backgroundId, timeOfDay);
  const grad = ctx.createLinearGradient(0, margin, 0, margin + innerH);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.55, c2);
  grad.addColorStop(1, c3);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(margin, margin, innerW, innerH, frame === 'webtoon_panel' ? 8 : 26);
  ctx.clip();
  ctx.fillStyle = grad;
  ctx.fillRect(margin, margin, innerW, innerH);

  // Subtle decorative bokeh circles
  ctx.fillStyle = 'rgba(255,255,255,0.38)';
  ctx.beginPath();
  ctx.arc(margin + innerW * 0.82, margin + innerH * 0.16, 70, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(margin + innerW * 0.16, margin + innerH * 0.25, 48, 0, Math.PI * 2);
  ctx.fill();

  // Render Characters
  if (mode === 'couple' && primarySvg && partnerSvg) {
    const [imgA, imgB] = await Promise.all([
      svgNodeToImage(primarySvg),
      svgNodeToImage(partnerSvg),
    ]);
    const charW = innerW * 0.58;
    const charH = (charW * 290) / 240;
    const charY = margin + innerH - charH + 14;
    ctx.drawImage(imgA, margin + innerW * 0.02, charY, charW, charH);
    ctx.drawImage(imgB, margin + innerW * 0.4, charY, charW, charH);
  } else if (primarySvg) {
    const img = await svgNodeToImage(primarySvg);
    const charW = mode === 'outfit' ? innerW * 0.72 : innerW * 0.78;
    const charH = (charW * 290) / 240;
    const charX = margin + (innerW - charW) / 2;
    const charY = margin + innerH - charH + 16;
    ctx.drawImage(img, charX, charY, charW, charH);
  }

  // Stickers inside frame
  if (stickers.length > 0) {
    ctx.font = '600 22px "Plus Jakarta Sans", -apple-system, sans-serif';
    stickers.slice(0, 3).forEach((sticker, idx) => {
      const sx = margin + 22 + idx * 142;
      const sy = margin + 24;
      const label = sticker.slice(0, 18);
      const metrics = ctx.measureText(label);
      const boxW = Math.min(180, metrics.width + 26);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.roundRect(sx, sy, boxW, 38, 19);
      ctx.fill();

      ctx.strokeStyle = 'rgba(58, 44, 54, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#3A2C36';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, sx + 13, sy + 20);
    });
  }

  ctx.restore();

  // Frame Border Decoration
  if (frame === 'webtoon_panel') {
    ctx.strokeStyle = '#3A2C36';
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, margin, innerW, innerH);
  } else if (frame === 'pastel_ribbon' || frame === 'floral_diary') {
    ctx.strokeStyle = frame === 'pastel_ribbon' ? '#F39CB2' : '#B59DF0';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(margin, margin, innerW, innerH, 26);
    ctx.stroke();
  }

  // Optional Caption Text at Bottom
  if (caption.trim()) {
    ctx.fillStyle = '#3A2C36';
    ctx.font = '600 24px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textY = margin + innerH + (height - (margin + innerH)) / 2;
    ctx.fillText(caption.trim().slice(0, 44), width / 2, textY);
  } else if (frame === 'polaroid_seoul') {
    ctx.fillStyle = '#8E8E93';
    ctx.font = '500 18px "Plus Jakarta Sans", -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('enmmoe Seoul Diary', width / 2, height - 56);
  }

  const pngDataUrl = canvas.toDataURL('image/png');
  const compressed = await compressDataUrlImage(pngDataUrl, 720, 0.9);

  await saveAssetToCache({
    id: assetId,
    kind: 'studio_photo',
    mimeType: compressed.mimeType,
    dataUrl: compressed.dataUrl,
    width: compressed.width,
    height: compressed.height,
    source: 'illustrated',
    createdAt: Date.now(),
  });

  return { pngDataUrl, compressedDataUrl: compressed.dataUrl };
}
