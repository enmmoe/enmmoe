import React from 'react';
import {
  CharacterAppearance,
  ExpressionId,
  FaceShape,
  LocationId,
  OutfitItem,
  StudioPoseId,
  TimeOfDay,
} from './types';

function darkenHex(hex: string, amount = 0.16): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#3A2D38';
  const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * (1 - amount)));
  const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * (1 - amount)));
  const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * (1 - amount)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

function lightenHex(hex: string, amount = 0.22): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return '#FFF6FA';
  const r = Math.min(255, Math.round(parseInt(clean.slice(0, 2), 16) + (255 - parseInt(clean.slice(0, 2), 16)) * amount));
  const g = Math.min(255, Math.round(parseInt(clean.slice(2, 4), 16) + (255 - parseInt(clean.slice(2, 4), 16)) * amount));
  const b = Math.min(255, Math.round(parseInt(clean.slice(4, 6), 16) + (255 - parseInt(clean.slice(4, 6), 16)) * amount));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
    .toString(16)
    .padStart(2, '0')}`;
}

const INK = '#3A2C36';

function getFacePath(shape: FaceShape): string {
  switch (shape) {
    case 'heart':
      return 'M 94 94 C 94 70, 146 70, 146 94 C 148 118, 134 140, 120 144 C 106 140, 92 118, 94 94 Z';
    case 'round':
      return 'M 92 96 C 92 71, 148 71, 148 96 C 149 124, 138 142, 120 143 C 102 142, 91 124, 92 96 Z';
    case 'sculpted':
      return 'M 95 93 C 95 69, 145 69, 145 93 L 142 121 L 128 142 C 123 145, 117 145, 112 142 L 98 121 Z';
    case 'defined':
      return 'M 93 93 C 93 69, 147 69, 147 93 L 145 122 L 130 142 L 110 142 L 95 122 Z';
    case 'oval':
    default:
      return 'M 93 95 C 93 69, 147 69, 147 95 C 147 121, 135 142, 120 144 C 105 142, 93 121, 93 95 Z';
  }
}

export interface WebtoonPortraitProps {
  appearance: CharacterAppearance;
  outfit: OutfitItem;
  expression?: ExpressionId;
  pose?: StudioPoseId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBackdrop?: boolean;
  svgRef?: React.RefObject<SVGSVGElement | null>;
}

export const WebtoonPortrait: React.FC<WebtoonPortraitProps> = ({
  appearance,
  outfit,
  expression = 'smiling',
  pose = 'wave',
  className = '',
  showBackdrop = false,
  svgRef,
}) => {
  const skinBase = appearance.skinTone || '#FCE3D4';
  const skinShadow = darkenHex(skinBase, 0.1);
  const hairBase = appearance.hairColor || '#2F2630';
  const hairHighlight = lightenHex(hairBase, 0.28);
  const hairDeep = darkenHex(hairBase, 0.25);
  const eyeBase = appearance.eyeColor || '#4B3946';
  const eyeHighlight = lightenHex(eyeBase, 0.4);
  const { primary, secondary, accent } = outfit.palette;
  const primaryDark = darkenHex(primary, 0.14);

  const isWideShoulders = appearance.presentation === 'masculine';
  const shoulderLeft = isWideShoulders ? 58 : 66;
  const shoulderRight = isWideShoulders ? 182 : 174;
  const uid = React.useId().replace(/:/g, '');

  const isHairLong =
    appearance.hairStyle === 'silky_waves' ||
    appearance.hairStyle === 'wispy_long' ||
    appearance.hairStyle === 'hime_cut' ||
    appearance.hairStyle === 'side_ponytail' ||
    appearance.hairStyle === 'soft_curls';

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 240 290"
      className={`select-none ${className}`}
      role="img"
      aria-label="Korean webtoon character portrait"
    >
      <defs>
        <linearGradient id={`bg_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF7FA" />
          <stop offset="55%" stopColor="#F8F2FF" />
          <stop offset="100%" stopColor="#EFF6FF" />
        </linearGradient>
        <linearGradient id={`iris_${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hairDeep} />
          <stop offset="45%" stopColor={eyeBase} />
          <stop offset="100%" stopColor={eyeHighlight} />
        </linearGradient>
        <linearGradient id={`hair_${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={hairHighlight} />
          <stop offset="48%" stopColor={hairBase} />
          <stop offset="100%" stopColor={hairDeep} />
        </linearGradient>
      </defs>

      {showBackdrop && (
        <g>
          <rect x="0" y="0" width="240" height="290" rx="20" fill={`url(#bg_${uid})`} />
          <circle cx="195" cy="52" r="32" fill="#FFE6EE" opacity="0.55" />
          <circle cx="44" cy="220" r="38" fill="#E3EEFF" opacity="0.6" />
        </g>
      )}

      {/* BACK HAIR LAYER */}
      {isHairLong && (
        <g>
          {appearance.hairStyle === 'side_ponytail' ? (
            <>
              <path
                d="M 80 88 C 68 122, 65 170, 74 222 C 88 228, 102 222, 104 190 L 146 185 C 154 205, 165 215, 175 210 C 176 168, 174 120, 160 88 Z"
                fill={`url(#hair_${uid})`}
                stroke={INK}
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
              {/* Side Ponytail Tie & Cascade */}
              <path
                d="M 155 112 C 182 128, 194 176, 178 238 C 166 244, 152 224, 150 185 Z"
                fill={`url(#hair_${uid})`}
                stroke={INK}
                strokeWidth="1.9"
                strokeLinejoin="round"
              />
              <ellipse cx="155" cy="112" rx="6" ry="5" fill={accent} stroke={INK} strokeWidth="1.4" />
            </>
          ) : appearance.hairStyle === 'silky_waves' || appearance.hairStyle === 'soft_curls' ? (
            <path
              d="M 82 76 C 64 102, 58 148, 65 192 C 56 218, 66 248, 86 254 L 154 254 C 174 248, 184 218, 175 192 C 182 148, 176 102, 158 76 Z"
              fill={`url(#hair_${uid})`}
              stroke={INK}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          ) : (
            <path
              d="M 83 78 C 68 112, 68 182, 74 248 L 166 248 C 172 182, 172 112, 157 78 Z"
              fill={`url(#hair_${uid})`}
              stroke={INK}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          )}
        </g>
      )}

      {appearance.hairStyle === 'airy_bob' && (
        <path
          d="M 84 82 C 70 105, 68 146, 80 166 C 90 170, 96 164, 98 152 L 142 152 C 144 164, 150 170, 160 166 C 172 146, 170 105, 156 82 Z"
          fill={`url(#hair_${uid})`}
          stroke={INK}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      )}

      {appearance.hairStyle === 'wolf_layers' && (
        <path
          d="M 82 82 C 67 110, 62 156, 72 186 L 86 174 L 94 192 L 146 192 L 154 174 L 168 186 C 178 156, 173 110, 158 82 Z"
          fill={`url(#hair_${uid})`}
          stroke={INK}
          strokeWidth="1.9"
          strokeLinejoin="round"
        />
      )}

      {/* TORSO & OUTFIT ILLUSTRATION */}
      <g>
        {/* Neck & Collarbones */}
        <path
          d="M 107 137 L 107 172 C 107 180, 133 180, 133 172 L 133 137 Z"
          fill={skinBase}
          stroke={INK}
          strokeWidth="1.8"
        />
        <path d="M 108 140 Q 120 151, 132 140 L 132 146 Q 120 156, 108 146 Z" fill={skinShadow} />

        {/* Base Shoulders / Garment Silhouette */}
        <path
          d={`M ${shoulderLeft} 194 C ${shoulderLeft + 6} 173, 94 167, 108 167 L 132 167 C 146 167, ${
            shoulderRight - 6
          } 173, ${shoulderRight} 194 L ${shoulderRight + 10} 290 L ${shoulderLeft - 10} 290 Z`}
          fill={primary}
          stroke={INK}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />

        {/* Silhouette-specific Korean Webtoon Fashion Details */}
        {outfit.silhouette === 'hanbok' && (
          <g>
            {/* White Dongjeong Collar */}
            <path
              d="M 103 166 L 122 198 L 138 166 L 132 166 L 122 186 L 110 166 Z"
              fill="#FFFFFF"
              stroke={INK}
              strokeWidth="1.6"
            />
            {/* Chima Skirt Below Chest Ribbon */}
            <path
              d={`M ${shoulderLeft + 6} 224 L ${shoulderRight - 6} 224 L ${shoulderRight + 10} 290 L ${
                shoulderLeft - 10
              } 290 Z`}
              fill={secondary}
              stroke={INK}
              strokeWidth="1.9"
            />
            {/* Silk Goreum Sash & Bow */}
            <path d="M 118 220 Q 134 224, 146 254" stroke={accent} strokeWidth="6" strokeLinecap="round" fill="none" />
            <path d="M 118 220 Q 108 238, 114 264" stroke={accent} strokeWidth="6" strokeLinecap="round" fill="none" />
            <circle cx="120" cy="218" r="7" fill={accent} stroke={INK} strokeWidth="1.6" />
          </g>
        )}

        {(outfit.silhouette === 'blazer' || outfit.silhouette === 'suit') && (
          <g>
            {/* Inner Crisp Shirt */}
            <polygon
              points="106,166 134,166 128,236 112,236"
              fill={secondary}
              stroke={INK}
              strokeWidth="1.6"
            />
            {/* Tailored Lapels */}
            <polygon
              points="96,170 112,174 114,234 94,210"
              fill={primaryDark}
              stroke={INK}
              strokeWidth="1.6"
            />
            <polygon
              points="144,170 128,174 126,234 146,210"
              fill={primaryDark}
              stroke={INK}
              strokeWidth="1.6"
            />
            {/* School Ribbon or Silk Tie */}
            {outfit.category === 'school' ? (
              <g>
                <polygon points="120,185 107,178 107,192" fill={accent} stroke={INK} strokeWidth="1.4" />
                <polygon points="120,185 133,178 133,192" fill={accent} stroke={INK} strokeWidth="1.4" />
                <circle cx="120" cy="185" r="3.8" fill={accent} stroke={INK} strokeWidth="1.3" />
              </g>
            ) : (
              <path
                d="M 120 178 L 125 224 L 120 232 L 115 224 Z"
                fill={accent}
                stroke={INK}
                strokeWidth="1.4"
              />
            )}
          </g>
        )}

        {outfit.silhouette === 'dress' && (
          <g>
            <path
              d="M 96 170 Q 120 198, 144 170 L 136 167 Q 120 183, 104 167 Z"
              fill={secondary}
              stroke={INK}
              strokeWidth="1.7"
            />
            <path
              d={`M ${shoulderLeft + 10} 234 Q 120 242, ${shoulderRight - 10} 234`}
              fill="none"
              stroke={accent}
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="120" cy="196" r="3" fill={accent} />
            <circle cx="120" cy="212" r="3" fill={accent} />
          </g>
        )}

        {outfit.silhouette === 'coat' && (
          <g>
            <polygon
              points="105,166 135,166 125,216 115,216"
              fill={secondary}
              stroke={INK}
              strokeWidth="1.6"
            />
            {/* Cozy Scarf Accent */}
            <path
              d="M 94 174 Q 120 198, 146 174 Q 152 192, 134 200 Q 120 205, 104 200 Q 88 192, 94 174 Z"
              fill={accent}
              stroke={INK}
              strokeWidth="1.7"
            />
            <path
              d="M 126 196 L 138 242 L 122 246 L 114 202 Z"
              fill={accent}
              stroke={INK}
              strokeWidth="1.6"
            />
          </g>
        )}

        {(outfit.silhouette === 'hoodie' || outfit.silhouette === 'knit' || outfit.silhouette === 'stage') && (
          <g>
            <path
              d="M 103 167 Q 120 196, 137 167"
              fill={secondary}
              stroke={INK}
              strokeWidth="1.7"
            />
            {outfit.silhouette === 'hoodie' && (
              <>
                <line x1="112" y1="186" x2="110" y2="218" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
                <line x1="128" y1="186" x2="130" y2="218" stroke={accent} strokeWidth="2.4" strokeLinecap="round" />
              </>
            )}
            {outfit.silhouette === 'knit' && (
              <>
                <line x1="120" y1="186" x2="120" y2="288" stroke={INK} strokeWidth="1.4" opacity="0.45" />
                <circle cx="120" cy="206" r="2.8" fill={accent} />
                <circle cx="120" cy="228" r="2.8" fill={accent} />
                <circle cx="120" cy="250" r="2.8" fill={accent} />
              </>
            )}
            {outfit.silhouette === 'stage' && (
              <path
                d="M 98 175 L 120 198 L 142 175"
                fill="none"
                stroke={accent}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            )}
          </g>
        )}

        {/* Pose Hand Accent (for Studio / Dialogue variation) */}
        {pose === 'heart' && (
          <g transform="translate(154, 198)">
            <path
              d="M 0 12 C 0 4, 10 2, 12 9 C 14 2, 24 4, 24 12 C 24 22, 12 28, 12 28 C 12 28, 0 22, 0 12 Z"
              fill={skinBase}
              stroke={INK}
              strokeWidth="1.6"
            />
            <path d="M 8 -6 L 12 -11 L 16 -6" fill="none" stroke="#F47296" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        )}
        {pose === 'peace' && (
          <g transform="translate(162, 196)">
            <rect x="4" y="0" width="5.5" height="17" rx="2.7" transform="rotate(-12 6 12)" fill={skinBase} stroke={INK} strokeWidth="1.5" />
            <rect x="11" y="-1" width="5.5" height="18" rx="2.7" transform="rotate(14 13 12)" fill={skinBase} stroke={INK} strokeWidth="1.5" />
            <ellipse cx="10" cy="19" rx="8" ry="7" fill={skinBase} stroke={INK} strokeWidth="1.5" />
          </g>
        )}
      </g>

      {/* EARS */}
      <ellipse cx="91" cy="112" rx="5.5" ry="9" fill={skinBase} stroke={INK} strokeWidth="1.7" />
      <ellipse cx="149" cy="112" rx="5.5" ry="9" fill={skinBase} stroke={INK} strokeWidth="1.7" />
      {appearance.accessory === 'earrings' && (
        <g>
          <circle cx="90" cy="122" r="2.8" fill="#FFE7AE" stroke={INK} strokeWidth="1.1" />
          <circle cx="150" cy="122" r="2.8" fill="#FFE7AE" stroke={INK} strokeWidth="1.1" />
        </g>
      )}

      {/* HEAD / FACE BASE */}
      <path
        d={getFacePath(appearance.faceShape)}
        fill={skinBase}
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* SOFT PASTEL CHEEK BLUSH */}
      <ellipse
        cx="102"
        cy="121"
        rx="8.5"
        ry="4.2"
        fill={expression === 'shy' ? '#FF87A4' : '#FFB1C2'}
        opacity={expression === 'shy' ? 0.65 : 0.34}
      />
      <ellipse
        cx="138"
        cy="121"
        rx="8.5"
        ry="4.2"
        fill={expression === 'shy' ? '#FF87A4' : '#FFB1C2'}
        opacity={expression === 'shy' ? 0.65 : 0.34}
      />
      {expression === 'shy' && (
        <g stroke="#F0688E" strokeWidth="1.2" opacity="0.72" strokeLinecap="round">
          <line x1="97" y1="123" x2="100" y2="118" />
          <line x1="101" y1="123" x2="104" y2="118" />
          <line x1="136" y1="123" x2="139" y2="118" />
          <line x1="140" y1="123" x2="143" y2="118" />
        </g>
      )}

      {/* EYES & EXPRESSIONS (6 DISTINCT CONSISTENT STATES) */}
      <g>
        {expression === 'happy' ? (
          <>
            <path d="M 98 111 Q 105 103, 112 111" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 128 111 Q 135 103, 142 111" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
            {/* Joy sparkle */}
            <path d="M 157 86 L 159 91 L 164 93 L 159 95 L 157 100 L 155 95 L 150 93 L 155 91 Z" fill="#FFD166" />
          </>
        ) : (
          <>
            {/* Left Eye */}
            <ellipse cx="105" cy="110" rx="7.2" ry={expression === 'surprised' ? 8.8 : 7.4} fill="#FFFFFF" />
            <ellipse
              cx={expression === 'shy' ? 106.5 : 105}
              cy="110.5"
              rx="5.2"
              ry={expression === 'surprised' ? 6.2 : 6.1}
              fill={`url(#iris_${uid})`}
            />
            <circle cx={expression === 'shy' ? 106.5 : 105} cy="111.5" r="2.2" fill={INK} />
            <circle cx="102.8" cy="107.8" r="2" fill="#FFFFFF" />
            <circle cx="107.6" cy="113.5" r="1.1" fill="#FFFFFF" />
            <path
              d="M 96.5 106.5 Q 105 100.5, 113 107"
              fill="none"
              stroke={INK}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {expression === 'sad' && (
              <ellipse cx="102.5" cy="116" rx="2.3" ry="1.3" fill="#BFE7FF" opacity="0.9" />
            )}

            {/* Right Eye */}
            <ellipse cx="135" cy="110" rx="7.2" ry={expression === 'surprised' ? 8.8 : 7.4} fill="#FFFFFF" />
            <ellipse
              cx={expression === 'shy' ? 136.5 : 135}
              cy="110.5"
              rx="5.2"
              ry={expression === 'surprised' ? 6.2 : 6.1}
              fill={`url(#iris_${uid})`}
            />
            <circle cx={expression === 'shy' ? 136.5 : 135} cy="111.5" r="2.2" fill={INK} />
            <circle cx="132.8" cy="107.8" r="2" fill="#FFFFFF" />
            <circle cx="137.6" cy="113.5" r="1.1" fill="#FFFFFF" />
            <path
              d="M 127 107 Q 135 100.5, 143.5 106.5"
              fill="none"
              stroke={INK}
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {expression === 'sad' && (
              <ellipse cx="137.5" cy="116" rx="2.3" ry="1.3" fill="#BFE7FF" opacity="0.9" />
            )}
          </>
        )}

        {/* EYEBROWS */}
        {expression === 'angry' ? (
          <>
            <path d="M 97 97 L 113 102" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M 143 97 L 127 102" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
            {/* Cute webtoon irritation puff */}
            <path d="M 150 86 Q 154 91, 159 87 M 151 94 Q 155 90, 159 95" stroke="#FF758F" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </>
        ) : expression === 'sad' ? (
          <>
            <path d="M 97 101 Q 105 99, 113 96" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 143 101 Q 135 99, 127 96" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        ) : expression === 'surprised' ? (
          <>
            <path d="M 97 95 Q 105 90, 113 95" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M 127 95 Q 135 90, 143 95" stroke={INK} strokeWidth="2" strokeLinecap="round" fill="none" />
          </>
        ) : (
          <>
            <path d="M 98 98 Q 105 95, 112 98" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />
            <path d="M 128 98 Q 135 95, 142 98" stroke={INK} strokeWidth="1.9" strokeLinecap="round" fill="none" />
          </>
        )}

        {/* NOSE & MOUTH */}
        <path d="M 120 116 L 119 121" stroke={INK} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" />

        {expression === 'happy' && (
          <path d="M 112 128 Q 120 137, 128 128 Z" fill="#F28A9E" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        )}
        {expression === 'smiling' && (
          <path d="M 114 129 Q 120 134, 126 129" fill="none" stroke={INK} strokeWidth="1.8" strokeLinecap="round" />
        )}
        {expression === 'shy' && (
          <path d="M 116 130 Q 120 132.5, 124 129.5" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
        )}
        {expression === 'sad' && (
          <path d="M 115 132 Q 120 128, 125 132" fill="none" stroke={INK} strokeWidth="1.7" strokeLinecap="round" />
        )}
        {expression === 'angry' && (
          <path d="M 115 131 Q 120 127.5, 125 131" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
        )}
        {expression === 'surprised' && (
          <ellipse cx="120" cy="131" rx="3.4" ry="4.4" fill="#E87D90" stroke={INK} strokeWidth="1.5" />
        )}
      </g>

      {/* OPTIONAL GLASSES */}
      {appearance.accessory === 'glasses' && (
        <g stroke="#3A3A48" strokeWidth="1.8" fill="rgba(255,255,255,0.12)">
          <circle cx="105" cy="110" r="10.5" />
          <circle cx="135" cy="110" r="10.5" />
          <path d="M 115.5 110 L 124.5 110" fill="none" />
        </g>
      )}

      {/* FRONT HAIR CROWN & BANGS */}
      <g>
        {/* Top Hair Crown */}
        <path
          d="M 86 106 C 84 72, 102 58, 120 58 C 138 58, 156 72, 154 106 C 149 90, 141 79, 120 79 C 99 79, 91 90, 86 106 Z"
          fill={`url(#hair_${uid})`}
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Hair Style Front Framing */}
        {appearance.hairStyle === 'comma_hair' ? (
          <path
            d="M 90 95 C 94 75, 114 73, 122 88 C 118 98, 108 103, 104 97 C 110 92, 114 86, 112 81 M 122 86 C 132 76, 146 80, 150 98"
            fill={`url(#hair_${uid})`}
            stroke={INK}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : appearance.hairStyle === 'hime_cut' ? (
          <g>
            <path d="M 94 82 L 96 100 L 144 100 L 146 82 Z" fill={`url(#hair_${uid})`} stroke={INK} strokeWidth="1.8" />
            <rect x="86" y="90" width="9" height="44" rx="3" fill={hairBase} stroke={INK} strokeWidth="1.7" />
            <rect x="145" y="90" width="9" height="44" rx="3" fill={hairBase} stroke={INK} strokeWidth="1.7" />
          </g>
        ) : appearance.hairStyle === 'two_block' || appearance.hairStyle === 'sleek_part' ? (
          <path
            d="M 88 100 C 92 78, 110 74, 124 89 C 132 77, 146 82, 152 100 C 142 91, 132 91, 124 96 C 113 88, 98 92, 88 100 Z"
            fill={`url(#hair_${uid})`}
            stroke={INK}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        ) : (
          /* Airy Korean Wispy Bangs */
          <path
            d="M 88 102 C 92 80, 104 75, 111 94 C 114 78, 123 76, 127 95 C 133 77, 146 80, 152 102 C 145 92, 138 92, 132 98 C 127 89, 121 90, 116 99 C 108 90, 96 92, 88 102 Z"
            fill={`url(#hair_${uid})`}
            stroke={INK}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        )}

        {/* Gloss Highlight Ribbon */}
        <path
          d="M 100 72 Q 120 67, 140 73"
          fill="none"
          stroke={hairHighlight}
          strokeWidth="2.6"
          strokeLinecap="round"
          opacity="0.72"
        />

        {/* Optional Head Accessories */}
        {appearance.accessory === 'beret' && (
          <g>
            <path
              d="M 82 76 C 84 52, 142 46, 154 70 C 146 80, 94 82, 82 76 Z"
              fill={accent}
              stroke={INK}
              strokeWidth="1.8"
            />
            <line x1="118" y1="49" x2="122" y2="54" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
        {appearance.accessory === 'headphones' && (
          <g>
            <path
              d="M 84 106 C 84 54, 156 54, 156 106"
              fill="none"
              stroke="#E7DEF8"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <path d="M 84 106 C 84 54, 156 54, 156 106" fill="none" stroke={INK} strokeWidth="1.6" />
            <rect x="78" y="98" width="11" height="22" rx="5" fill="#B59DF0" stroke={INK} strokeWidth="1.6" />
            <rect x="151" y="98" width="11" height="22" rx="5" fill="#B59DF0" stroke={INK} strokeWidth="1.6" />
          </g>
        )}
      </g>
    </svg>
  );
};

/* ============================================================================
 * 2D WALKING SPRITE (WITH CSS WALK CYCLE + HAIR MOTION)
 * ============================================================================ */

export const WebtoonWalkingSprite: React.FC<{
  appearance: CharacterAppearance;
  outfit: OutfitItem;
  isWalking: boolean;
  facing: 'left' | 'right';
  size?: number;
  label?: string;
}> = ({ appearance, outfit, isWalking, facing, size = 104, label }) => {
  const skin = appearance.skinTone || '#FCE3D4';
  const hair = appearance.hairColor || '#2F2630';
  const { primary, secondary, accent } = outfit.palette;

  return (
    <div
      className="relative flex flex-col items-center select-none pointer-events-none"
      style={{ width: size }}
    >
      {label && (
        <span className="mb-1 px-2 py-0.5 rounded-full bg-white/90 dark:bg-[#1C1C1E]/90 text-[11px] font-semibold text-black dark:text-white shadow-sm whitespace-nowrap">
          {label}
        </span>
      )}
      <div
        className={`relative transition-transform duration-150 ${
          isWalking ? 'webtoon-walk-bob' : 'webtoon-idle-breathe'
        }`}
        style={{
          width: size,
          height: size * 1.45,
          transform: facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
        }}
      >
        <svg viewBox="0 0 120 174" className="w-full h-full overflow-visible">
          {/* Soft ground shadow */}
          <ellipse cx="60" cy="166" rx="22" ry="5" fill="rgba(58,44,54,0.18)" />

          {/* Back Hair Sway */}
          {(appearance.hairStyle === 'silky_waves' ||
            appearance.hairStyle === 'wispy_long' ||
            appearance.hairStyle === 'side_ponytail' ||
            appearance.hairStyle === 'hime_cut') && (
            <path
              className={isWalking ? 'webtoon-hair-sway' : ''}
              d="M 42 36 C 32 56, 32 82, 36 102 L 84 102 C 88 82, 88 56, 78 36 Z"
              fill={hair}
              stroke={INK}
              strokeWidth="1.8"
            />
          )}

          {/* Left & Right Legs (4-beat walk cycle animation) */}
          <g className={isWalking ? 'webtoon-leg-left' : ''} style={{ transformOrigin: '52px 116px' }}>
            <rect x="46" y="114" width="11" height="44" rx="5" fill={secondary} stroke={INK} strokeWidth="1.7" />
            <ellipse cx="53" cy="159" rx="7.5" ry="4.5" fill={accent} stroke={INK} strokeWidth="1.6" />
          </g>
          <g className={isWalking ? 'webtoon-leg-right' : ''} style={{ transformOrigin: '68px 116px' }}>
            <rect x="63" y="114" width="11" height="44" rx="5" fill={secondary} stroke={INK} strokeWidth="1.7" />
            <ellipse cx="70" cy="159" rx="7.5" ry="4.5" fill={accent} stroke={INK} strokeWidth="1.6" />
          </g>

          {/* Back Arm */}
          <g className={isWalking ? 'webtoon-arm-right' : ''} style={{ transformOrigin: '42px 76px' }}>
            <rect x="37" y="75" width="9.5" height="36" rx="4.5" fill={primary} stroke={INK} strokeWidth="1.6" />
            <circle cx="41.5" cy="112" r="4" fill={skin} stroke={INK} strokeWidth="1.4" />
          </g>

          {/* Outfit Torso */}
          <path
            d="M 41 74 C 41 67, 79 67, 79 74 L 82 122 L 38 122 Z"
            fill={primary}
            stroke={INK}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          {outfit.silhouette === 'hanbok' && (
            <path d="M 46 86 L 74 86 L 82 128 L 38 128 Z" fill={secondary} stroke={INK} strokeWidth="1.7" />
          )}
          {outfit.silhouette === 'dress' && (
            <path d="M 42 102 L 78 102 L 86 132 L 34 132 Z" fill={primary} stroke={INK} strokeWidth="1.7" />
          )}
          <path d="M 52 70 L 60 80 L 68 70" fill={secondary} stroke={INK} strokeWidth="1.5" />

          {/* Front Arm */}
          <g className={isWalking ? 'webtoon-arm-left' : ''} style={{ transformOrigin: '76px 76px' }}>
            <rect x="73" y="75" width="9.5" height="36" rx="4.5" fill={primary} stroke={INK} strokeWidth="1.6" />
            <circle cx="77.5" cy="112" r="4" fill={skin} stroke={INK} strokeWidth="1.4" />
          </g>

          {/* Head */}
          <circle cx="60" cy="46" r="21" fill={skin} stroke={INK} strokeWidth="1.8" />
          {/* Webtoon Eyes */}
          <ellipse cx="56" cy="46" rx="2.8" ry="3.8" fill={appearance.eyeColor || INK} />
          <ellipse cx="69" cy="46" rx="2.8" ry="3.8" fill={appearance.eyeColor || INK} />
          <circle cx="55" cy="44.5" r="1" fill="#FFFFFF" />
          <circle cx="68" cy="44.5" r="1" fill="#FFFFFF" />
          <ellipse cx="52" cy="52" rx="3.5" ry="1.8" fill="#FFA6B8" opacity="0.55" />
          <ellipse cx="73" cy="52" rx="3.5" ry="1.8" fill="#FFA6B8" opacity="0.55" />
          <path d="M 60 55 Q 63 58, 66 55" fill="none" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />

          {/* Crown & Bangs */}
          <path
            d="M 38 45 C 37 25, 52 21, 61 21 C 74 21, 84 29, 82 47 C 75 37, 66 35, 57 38 C 48 35, 42 38, 38 45 Z"
            fill={hair}
            stroke={INK}
            strokeWidth="1.8"
          />
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3-LAYER PARALLAX 2D KOREAN CITY STREET BACKDROP
 * ============================================================================ */

export interface StreetEntrance {
  id: LocationId;
  xPercent: number;
  label: string;
  koreanLabel: string;
  accent: string;
}

export const STREET_ENTRANCES: StreetEntrance[] = [
  { id: 'home', xPercent: 11, label: 'Home', koreanLabel: '우리집', accent: '#A8C9F0' },
  { id: 'cafe', xPercent: 25, label: 'Café', koreanLabel: '봄날 카페', accent: '#F4A6B8' },
  { id: 'boutique', xPercent: 40, label: 'Boutique', koreanLabel: '부티크', accent: '#C5B8ED' },
  { id: 'photo_studio', xPercent: 55, label: 'Photo Studio', koreanLabel: '사진관', accent: '#9ED8C8' },
  { id: 'park', xPercent: 70, label: 'Park', koreanLabel: '공원', accent: '#A5D6A7' },
  { id: 'metro', xPercent: 84, label: 'Metro', koreanLabel: '지하철역', accent: '#79A8FF' },
  { id: 'taxi', xPercent: 93, label: 'Taxi', koreanLabel: '택시', accent: '#FFAE52' },
];

export const ParallaxCityBackdrop: React.FC<{
  cameraX: number; // 0..100 player position driving parallax offsets
  timeOfDay: TimeOfDay;
  activeEntranceId?: LocationId | null;
  onSelectEntrance: (id: LocationId) => void;
}> = ({ cameraX, timeOfDay, activeEntranceId, onSelectEntrance }) => {
  const skyColors =
    timeOfDay === 'morning'
      ? { top: '#DCEEFF', mid: '#FFF2EE', bottom: '#FFF9F0' }
      : timeOfDay === 'afternoon'
      ? { top: '#CBE4FF', mid: '#FBE6EB', bottom: '#FFF6E8' }
      : { top: '#2E2F5B', mid: '#6E5A94', bottom: '#F1A69E' };

  const worldWidth = 1800; // wide panoramic 2D Seoul avenue
  // Shift camera smoothly relative to viewport center
  const layer1Offset = -(cameraX - 50) * 1.4;
  const layer2Offset = -(cameraX - 50) * 4.2;
  const layer3Offset = -(cameraX - 50) * 6.2;

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${skyColors.top} 0%, ${skyColors.mid} 55%, ${skyColors.bottom} 100%)`,
      }}
    >
      {/* LAYER 1: DISTANT SKY, CLOUDS, BUKHANSAN & NAMSAN TOWER (0.2x speed) */}
      <div
        className="absolute inset-0 pointer-events-none will-change-transform"
        style={{ transform: `translate3d(${layer1Offset}px, 0, 0)` }}
      >
        <svg viewBox="0 0 1200 320" preserveAspectRatio="none" className="w-[140%] -ml-[20%] h-full">
          {/* Sun or Evening Moon */}
          <circle
            cx={timeOfDay === 'evening' ? 920 : 280}
            cy={timeOfDay === 'evening' ? 76 : 82}
            r={timeOfDay === 'evening' ? 24 : 36}
            fill={timeOfDay === 'evening' ? '#FFF6CE' : '#FFF4C8'}
            opacity="0.88"
          />

          {/* Soft Pastel Clouds */}
          <g fill="#FFFFFF" opacity={timeOfDay === 'evening' ? 0.25 : 0.78}>
            <ellipse cx="180" cy="64" rx="54" ry="18" />
            <ellipse cx="212" cy="58" rx="34" ry="16" />
            <ellipse cx="520" cy="50" rx="64" ry="18" />
            <ellipse cx="560" cy="46" rx="38" ry="15" />
            <ellipse cx="860" cy="70" rx="56" ry="17" />
          </g>

          {/* Distant Bukhansan Mountain Silhouette */}
          <path
            d="M 0 250 Q 150 155, 310 212 Q 490 130, 680 205 Q 880 148, 1080 208 L 1200 185 L 1200 320 L 0 320 Z"
            fill={timeOfDay === 'evening' ? '#4C4A79' : '#D9E5F7'}
            opacity="0.72"
          />

          {/* Distant N Seoul Tower */}
          <g transform="translate(650, 92)" opacity="0.8">
            <rect x="-3" y="0" width="6" height="90" fill={timeOfDay === 'evening' ? '#8C88BD' : '#A9BCE0'} />
            <ellipse cx="0" cy="30" rx="14" ry="7" fill={timeOfDay === 'evening' ? '#FF9EB5' : '#8AA3D1'} />
            <line x1="0" y1="-22" x2="0" y2="2" stroke={timeOfDay === 'evening' ? '#FFE5B4' : '#8AA3D1'} strokeWidth="2.5" />
          </g>

          {/* Distant Seoul Apartments Silhouette */}
          <g fill={timeOfDay === 'evening' ? '#575280' : '#D7DFEF'} opacity="0.85">
            <rect x="60" y="185" width="76" height="100" rx="4" />
            <rect x="150" y="168" width="66" height="117" rx="4" />
            <rect x="290" y="176" width="84" height="109" rx="4" />
            <rect x="440" y="162" width="72" height="123" rx="4" />
            <rect x="740" y="172" width="86" height="113" rx="4" />
            <rect x="940" y="165" width="78" height="120" rx="4" />
          </g>
        </svg>
      </div>

      {/* LAYER 2: MIDGROUND SEONGSU BUILDINGS, SHOPS, TREES & INTERACTIVE ENTRANCES */}
      <div
        className="absolute inset-y-0 left-1/2 flex items-end will-change-transform"
        style={{
          width: worldWidth,
          marginLeft: -worldWidth / 2,
          transform: `translate3d(${layer2Offset}px, 0, 0)`,
        }}
      >
        <div className="relative w-full h-full">
          {/* Midground Illustrated Buildings Row */}
          {STREET_ENTRANCES.map((ent) => {
            const isNear = activeEntranceId === ent.id;
            return (
              <button
                key={ent.id}
                type="button"
                onClick={() => onSelectEntrance(ent.id)}
                style={{ left: `${ent.xPercent}%`, transform: 'translateX(-50%)' }}
                className="group absolute bottom-[74px] flex flex-col items-center cursor-pointer focus-visible:outline-none"
              >
                {/* Floating Webtoon Entrance Prompt when player walks near */}
                <div
                  className={`mb-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all shadow-sm ${
                    isNear
                      ? 'bg-[#007AFF] text-white scale-105 opacity-100'
                      : 'bg-white/90 dark:bg-[#1C1C1E]/90 text-[#3A2C36] dark:text-white opacity-95'
                  }`}
                >
                  {ent.label} · {ent.koreanLabel}
                </div>

                {/* Korean Shop / Building Illustration */}
                <svg viewBox="0 0 130 148" className="w-[116px] sm:w-[132px] h-auto drop-shadow-sm">
                  {/* Building Body */}
                  <rect
                    x="10"
                    y="16"
                    width="110"
                    height="128"
                    rx="10"
                    fill={timeOfDay === 'evening' ? '#413D58' : '#FFFDF9'}
                    stroke={INK}
                    strokeWidth="2"
                  />
                  {/* Roof Trim / Awning */}
                  <rect
                    x="6"
                    y="12"
                    width="118"
                    height="18"
                    rx="6"
                    fill={ent.accent}
                    stroke={INK}
                    strokeWidth="2"
                  />
                  {/* Hangul Signboard */}
                  <rect
                    x="22"
                    y="38"
                    width="86"
                    height="22"
                    rx="6"
                    fill={lightenHex(ent.accent, 0.45)}
                    stroke={INK}
                    strokeWidth="1.6"
                  />
                  <text
                    x="65"
                    y="53"
                    textAnchor="middle"
                    fill={INK}
                    fontSize="10.5"
                    fontWeight="700"
                  >
                    {ent.koreanLabel}
                  </text>
                  {/* Warm Lit Windows */}
                  <rect
                    x="20"
                    y="72"
                    width="34"
                    height="40"
                    rx="5"
                    fill={timeOfDay === 'evening' ? '#FFE69D' : '#DDF0FF'}
                    stroke={INK}
                    strokeWidth="1.7"
                  />
                  {/* Entrance Glass Door */}
                  <rect
                    x="66"
                    y="72"
                    width="42"
                    height="72"
                    rx="6"
                    fill={timeOfDay === 'evening' ? '#FFD788' : '#E9F4FF'}
                    stroke={INK}
                    strokeWidth="1.8"
                  />
                  <circle cx="74" cy="110" r="2.2" fill={INK} />
                  {ent.id === 'cafe' && (
                    <path d="M 18 72 L 112 72 L 106 84 L 24 84 Z" fill="#F28AA8" stroke={INK} strokeWidth="1.5" />
                  )}
                  {ent.id === 'park' && (
                    <g>
                      <circle cx="38" cy="96" r="24" fill="#B5E0B8" stroke={INK} strokeWidth="1.8" />
                      <circle cx="92" cy="94" r="22" fill="#F8C6D6" stroke={INK} strokeWidth="1.8" />
                    </g>
                  )}
                </svg>
              </button>
            );
          })}

          {/* Cherry Blossom Trees & Streetlamps between shops */}
          {[18, 33, 47, 63, 77].map((px) => (
            <div
              key={px}
              style={{ left: `${px}%`, transform: 'translateX(-50%)' }}
              className="absolute bottom-[74px] pointer-events-none"
            >
              <svg viewBox="0 0 70 118" className="w-[56px] h-auto">
                <rect x="31" y="58" width="8" height="58" rx="3" fill="#8B6E63" stroke={INK} strokeWidth="1.6" />
                <circle cx="35" cy="44" r="24" fill="#FAD2E0" stroke={INK} strokeWidth="1.7" />
                <circle cx="22" cy="52" r="14" fill="#FFE3EE" stroke={INK} strokeWidth="1.5" />
                <circle cx="48" cy="50" r="15" fill="#F6BDD1" stroke={INK} strokeWidth="1.5" />
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* LAYER 3: FOREGROUND SIDEWALK PAVING & FLOWER PLANTERS (1.0x speed) */}
      <div
        className="absolute bottom-0 left-1/2 h-[76px] pointer-events-none will-change-transform"
        style={{
          width: worldWidth,
          marginLeft: -worldWidth / 2,
          transform: `translate3d(${layer3Offset}px, 0, 0)`,
        }}
      >
        <div
          className="w-full h-full border-t-[2.5px] border-[#3A2C36]"
          style={{
            background:
              timeOfDay === 'evening'
                ? 'linear-gradient(180deg, #58526D 0%, #3E3A50 100%)'
                : 'linear-gradient(180deg, #F6EFE7 0%, #E7DDD3 100%)',
          }}
        >
          <div className="w-full h-2.5 bg-white/40 border-b border-black/10" />
          {/* Foreground Pastel Planter Boxes */}
          <div className="flex justify-around pt-3 opacity-85">
            {Array.from({ length: 9 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F6BACB] border border-[#3A2C36]/40" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#9ED8C8] border border-[#3A2C36]/40" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * ILLUSTRATED KOREAN INTERIOR / LOCATION SCENE BACKDROPS
 * ============================================================================ */

export const LocationIllustrationBackdrop: React.FC<{
  location: LocationId;
  timeOfDay: TimeOfDay;
  className?: string;
}> = ({ location, timeOfDay, className = '' }) => {
  const isEvening = timeOfDay === 'evening';
  const palette = {
    cafe: isEvening ? ['#3E3347', '#6E5066', '#FFE5B4'] : ['#FFF5F7', '#FDE3EC', '#F9CEDB'],
    boutique: isEvening ? ['#373852', '#5B597A', '#E7DDF8'] : ['#F8F5FF', '#EDE6FF', '#D9CEF9'],
    photo_studio: isEvening ? ['#2D3648', '#4E5B75', '#DCEAFF'] : ['#F4FAFF', '#E5F2FF', '#CBE4FB'],
    park: isEvening ? ['#2B3359', '#5A5085', '#F3B4BA'] : ['#E3F4EC', '#FBE8F0', '#FFF9EB'],
    metro: isEvening ? ['#2A3142', '#3F4B63', '#A7C8FF'] : ['#EDF3FB', '#DCE7F6', '#B9CEF0'],
    taxi: isEvening ? ['#2E2C47', '#5E4D6B', '#FFD599'] : ['#FFF4E4', '#FFE5C4', '#FFCE8C'],
    home: isEvening ? ['#332F44', '#564E6E', '#FFE6BA'] : ['#FFF8F0', '#FDEEE0', '#F6DFCA'],
    street: isEvening ? ['#2E2F5B', '#6E5A94', '#F1A69E'] : ['#E5F1FF', '#FCEBF1', '#FFF6EA'],
  }[location];

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background: `linear-gradient(180deg, ${palette[0]} 0%, ${palette[1]} 60%, ${palette[2]} 100%)`,
      }}
    >
      <svg
        viewBox="0 0 600 280"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full opacity-95"
      >
        {/* Warm Webtoon Window Light & Architecture Details */}
        {location === 'cafe' && (
          <g>
            <rect x="44" y="28" width="170" height="145" rx="14" fill={isEvening ? '#FFE5A6' : '#FFFFFF'} opacity="0.55" stroke={INK} strokeWidth="2" />
            <rect x="240" y="34" width="120" height="58" rx="10" fill="#FFFDF9" stroke={INK} strokeWidth="2" />
            <text x="300" y="68" textAnchor="middle" fontSize="15" fontWeight="700" fill={INK}>봄날 CAFE</text>
            <rect x="0" y="205" width="600" height="75" fill={isEvening ? '#523B43' : '#EED4C4'} stroke={INK} strokeWidth="2" />
            <circle cx="115" cy="200" r="14" fill="#F8B4C6" stroke={INK} strokeWidth="1.7" />
            <rect x="420" y="138" width="130" height="67" rx="8" fill="#FFF7F0" stroke={INK} strokeWidth="1.8" />
          </g>
        )}
        {location === 'boutique' && (
          <g>
            <rect x="70" y="36" width="190" height="175" rx="18" fill="#FFFFFF" opacity="0.6" stroke={INK} strokeWidth="2" />
            <line x1="90" y1="90" x2="240" y2="90" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <rect x="106" y="90" width="24" height="58" rx="6" fill="#F6BACB" stroke={INK} strokeWidth="1.6" />
            <rect x="142" y="90" width="26" height="64" rx="6" fill="#9ED8C8" stroke={INK} strokeWidth="1.6" />
            <rect x="180" y="90" width="24" height="56" rx="6" fill="#C5B8ED" stroke={INK} strokeWidth="1.6" />
            <ellipse cx="450" cy="126" rx="58" ry="88" fill="#FFFDFC" opacity="0.72" stroke={INK} strokeWidth="2.2" />
          </g>
        )}
        {location === 'photo_studio' && (
          <g>
            <path d="M 110 20 L 490 20 L 520 250 L 80 250 Z" fill="#FFFFFF" opacity="0.52" stroke={INK} strokeWidth="2" />
            <circle cx="115" cy="70" r="24" fill="#FFF2BA" opacity="0.8" />
            <circle cx="485" cy="70" r="24" fill="#FFDCE9" opacity="0.8" />
          </g>
        )}
        {location === 'park' && (
          <g>
            <circle cx="105" cy="96" r="64" fill="#FAD2E0" stroke={INK} strokeWidth="2" opacity="0.85" />
            <circle cx="495" cy="88" r="70" fill="#BDE4C5" stroke={INK} strokeWidth="2" opacity="0.85" />
            <rect x="0" y="210" width="600" height="70" fill={isEvening ? '#475066' : '#DCEFE0'} stroke={INK} strokeWidth="2" />
            <rect x="220" y="176" width="160" height="24" rx="6" fill="#D5AE88" stroke={INK} strokeWidth="1.8" />
          </g>
        )}
        {(location === 'metro' || location === 'taxi' || location === 'home') && (
          <g>
            <rect x="85" y="42" width="430" height="150" rx="18" fill="#FFFFFF" opacity="0.45" stroke={INK} strokeWidth="2" />
            <rect x="0" y="212" width="600" height="68" fill={isEvening ? '#3F3D56' : '#EFE7DE'} stroke={INK} strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
};
