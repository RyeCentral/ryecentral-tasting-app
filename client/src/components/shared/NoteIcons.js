import React from 'react';

/**
 * Custom warm illustrative SVG icons for whiskey tasting note pills.
 * Colors: amber, brown, gold, copper tones matching the whiskey theme.
 * Each icon is 16x16 by default, inline with pill text.
 */

const S = 16; // default icon size

// Warm whiskey palette
const C = {
  amber:    '#D4870B',
  gold:     '#C9952B',
  copper:   '#B87333',
  brown:    '#7B4B2A',
  darkBrown:'#5C3317',
  honey:    '#E8A317',
  cream:    '#F5DEB3',
  warmRed:  '#A0522D',
  char:     '#3B2F2F',
  green:    '#6B8E23',
  darkGreen:'#556B2F',
  leaf:     '#8B7355',
  smoke:    '#8B8682',
  berry:    '#8B2252',
  citrus:   '#CC7722',
  white:    '#FFF8DC',
};

// --- Icon drawing functions ---
// Each returns an SVG element. Kept simple for clarity at 16px.

const icons = {
  // === SWEET / CARAMEL FAMILY ===
  caramel: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pudding/custard cup */}
      <rect x="3" y="7" width="10" height="6" rx="2" fill={C.amber} />
      <ellipse cx="8" cy="7" rx="5" ry="2" fill={C.gold} />
      {/* Drip */}
      <path d="M6 5 Q6.5 3 7 5 Q7.5 7 6 7Z" fill={C.honey} opacity="0.8" />
      <path d="M9 4 Q9.5 2.5 10 4.5 Q10.2 6 9 6Z" fill={C.honey} opacity="0.7" />
    </svg>
  ),

  vanilla: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Vanilla bean pod */}
      <path d="M4 13 Q3 8 5 3 Q6 1 7 3 L8 13 Q7 14 5 14Z" fill={C.brown} />
      <path d="M5.5 4 L6.5 12" stroke={C.cream} strokeWidth="0.5" opacity="0.6" />
      {/* Small seeds/dots */}
      <circle cx="6" cy="6" r="0.5" fill={C.cream} opacity="0.5" />
      <circle cx="6.2" cy="9" r="0.5" fill={C.cream} opacity="0.5" />
      {/* Second pod */}
      <path d="M8 12 Q8 7 9 3 Q10 1.5 10.5 3 L10.5 12 Q9.5 13 8.5 13Z" fill={C.darkBrown} />
    </svg>
  ),

  honey: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Honey jar */}
      <rect x="4" y="6" width="8" height="7" rx="2" fill={C.honey} />
      <rect x="5" y="4" width="6" height="2" rx="1" fill={C.gold} />
      {/* Drip */}
      <path d="M7 13 Q7 15 8 15 Q9 15 9 13" fill={C.amber} />
      {/* Honeycomb pattern */}
      <path d="M6.5 8 L7.5 8 L8 9 L7.5 10 L6.5 10 L6 9Z" fill={C.gold} opacity="0.5" />
      <path d="M8.5 8 L9.5 8 L10 9 L9.5 10 L8.5 10 L8 9Z" fill={C.gold} opacity="0.5" />
    </svg>
  ),

  'maple syrup': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Maple leaf shape */}
      <path d="M8 2 L9.5 5 L12 4 L10.5 7 L13 8 L10.5 9 L12 12 L8 10 L4 12 L5.5 9 L3 8 L5.5 7 L4 4 L6.5 5Z" fill={C.amber} />
      <line x1="8" y1="10" x2="8" y2="14" stroke={C.brown} strokeWidth="1" />
    </svg>
  ),

  'brown sugar': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sugar cube with brown tint */}
      <path d="M3 6 L8 4 L13 6 L13 12 L8 14 L3 12Z" fill={C.warmRed} />
      <path d="M3 6 L8 4 L13 6 L8 8Z" fill={C.copper} />
      <path d="M8 8 L13 6 L13 12 L8 14Z" fill={C.brown} opacity="0.7" />
      {/* Sparkle */}
      <circle cx="6" cy="7" r="0.6" fill={C.cream} opacity="0.4" />
    </svg>
  ),

  toffee: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wrapped candy */}
      <rect x="5" y="5" width="6" height="6" rx="2" fill={C.amber} />
      <path d="M5 7 L2 4 L3 5 L1 3" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 7 L14 4 L13 5 L15 3" stroke={C.gold} strokeWidth="1.5" strokeLinecap="round" />
      {/* Shine */}
      <path d="M7 6 Q8 5.5 9 6" stroke={C.cream} strokeWidth="0.5" opacity="0.6" />
    </svg>
  ),

  butterscotch: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Round candy/disc */}
      <ellipse cx="8" cy="9" rx="5" ry="4" fill={C.gold} />
      <ellipse cx="8" cy="8.5" rx="5" ry="3.5" fill={C.honey} />
      {/* Swirl */}
      <path d="M6 8 Q8 6 10 8 Q8 10 6 8" stroke={C.amber} strokeWidth="0.8" fill="none" />
    </svg>
  ),

  molasses: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dark bottle/jug */}
      <rect x="5" y="6" width="6" height="7" rx="1.5" fill={C.darkBrown} />
      <rect x="6.5" y="3" width="3" height="3" rx="0.5" fill={C.brown} />
      {/* Drip */}
      <path d="M7 13 Q7.5 15 8 13" stroke={C.darkBrown} strokeWidth="1" />
      {/* Shine */}
      <line x1="7" y1="8" x2="7" y2="11" stroke={C.copper} strokeWidth="0.5" opacity="0.4" />
    </svg>
  ),

  // === SPICE FAMILY ===
  cinnamon: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cinnamon stick - spiral roll */}
      <path d="M4 4 Q4 2 8 2 Q12 2 12 5 Q12 8 8 8 Q6 8 6 6" stroke={C.warmRed} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Second stick */}
      <line x1="3" y1="10" x2="13" y2="10" stroke={C.brown} strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="13" x2="13" y2="13" stroke={C.copper} strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),

  pepper: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Peppercorn */}
      <circle cx="8" cy="9" r="4.5" fill={C.darkBrown} />
      <circle cx="8" cy="8.5" r="4" fill={C.brown} />
      {/* Texture lines */}
      <path d="M6 7 Q8 6 10 7" stroke={C.darkBrown} strokeWidth="0.5" />
      <path d="M5.5 9 Q8 8 10.5 9" stroke={C.darkBrown} strokeWidth="0.5" />
      {/* Stem dot */}
      <circle cx="8" cy="5" r="0.8" fill={C.darkBrown} />
    </svg>
  ),

  'black pepper': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Peppercorns cluster */}
      <circle cx="6.5" cy="9" r="3" fill={C.char} />
      <circle cx="10" cy="8" r="2.8" fill={C.darkBrown} />
      <circle cx="8" cy="11.5" r="2.5" fill="#4A3728" />
      {/* Subtle highlights */}
      <circle cx="5.8" cy="8" r="0.6" fill={C.brown} opacity="0.4" />
      <circle cx="9.5" cy="7" r="0.5" fill={C.brown} opacity="0.3" />
    </svg>
  ),

  'white pepper': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Light peppercorns */}
      <circle cx="6.5" cy="9" r="3" fill={C.cream} stroke={C.gold} strokeWidth="0.5" />
      <circle cx="10" cy="8" r="2.8" fill="#EDE0C8" stroke={C.gold} strokeWidth="0.5" />
      <circle cx="8" cy="11.5" r="2.5" fill="#E8D8B8" stroke={C.gold} strokeWidth="0.5" />
    </svg>
  ),

  'rye spice': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rye grain stalk with spice heat */}
      <line x1="8" y1="14" x2="8" y2="4" stroke={C.gold} strokeWidth="1.2" />
      {/* Grain kernels */}
      <ellipse cx="7" cy="5" rx="1.8" ry="1" transform="rotate(-30 7 5)" fill={C.amber} />
      <ellipse cx="9" cy="3.5" rx="1.8" ry="1" transform="rotate(30 9 3.5)" fill={C.amber} />
      <ellipse cx="7" cy="7" rx="1.8" ry="1" transform="rotate(-30 7 7)" fill={C.gold} />
      <ellipse cx="9" cy="6" rx="1.8" ry="1" transform="rotate(30 9 6)" fill={C.gold} />
      {/* Heat lines */}
      <path d="M11 8 Q12 7 11 6" stroke={C.warmRed} strokeWidth="0.6" fill="none" opacity="0.6" />
      <path d="M12 9 Q13 8 12 7" stroke={C.warmRed} strokeWidth="0.6" fill="none" opacity="0.4" />
    </svg>
  ),

  'baking spice': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Spice jar */}
      <rect x="4" y="6" width="8" height="7" rx="1" fill={C.copper} />
      <rect x="5" y="3" width="6" height="3" rx="0.5" fill={C.amber} />
      {/* Label */}
      <rect x="5.5" y="8" width="5" height="3" rx="0.5" fill={C.cream} opacity="0.6" />
      {/* Star on label */}
      <path d="M8 8.8 L8.5 9.8 L9.5 9.8 L8.7 10.4 L9 11.3 L8 10.7 L7 11.3 L7.3 10.4 L6.5 9.8 L7.5 9.8Z" fill={C.amber} />
    </svg>
  ),

  nutmeg: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Oval nutmeg seed */}
      <ellipse cx="8" cy="8" rx="4" ry="5" fill={C.brown} />      {/* Inner ridge/line */}
      <line x1="8" y1="3.5" x2="8" y2="12.5" stroke={C.darkBrown} strokeWidth="0.8" />
      {/* Texture */}
      <path d="M5 6 Q6 5.5 7 6" stroke={C.copper} strokeWidth="0.4" opacity="0.5" />
      <path d="M9 7 Q10 6.5 11 7" stroke={C.copper} strokeWidth="0.4" opacity="0.5" />
      {/* Grate marks */}
      <circle cx="6" cy="9" r="0.4" fill={C.amber} opacity="0.5" />
      <circle cx="7" cy="10.5" r="0.4" fill={C.amber} opacity="0.5" />
    </svg>
  ),

  clove: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clove bud */}
      <ellipse cx="8" cy="5" rx="2.5" ry="3" fill={C.darkBrown} />
      {/* Stem */}
      <line x1="8" y1="8" x2="8" y2="14" stroke={C.brown} strokeWidth="1.5" strokeLinecap="round" />
      {/* Crown/top petals */}
      <circle cx="7" cy="3.5" r="0.8" fill={C.brown} />
      <circle cx="9" cy="3.5" r="0.8" fill={C.brown} />
      <circle cx="8" cy="2.8" r="0.8" fill={C.brown} />
    </svg>
  ),

  allspice: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Allspice berry */}
      <circle cx="8" cy="8" r="5" fill={C.brown} />
      <circle cx="8" cy="7.5" r="4.5" fill={C.warmRed} />
      {/* Top crown */}
      <path d="M6.5 4 L8 3 L9.5 4" stroke={C.darkBrown} strokeWidth="0.8" fill="none" />
      {/* Texture dots */}
      <circle cx="6.5" cy="7" r="0.5" fill={C.brown} opacity="0.4" />
      <circle cx="9.5" cy="8" r="0.5" fill={C.brown} opacity="0.4" />
      <circle cx="7.5" cy="10" r="0.5" fill={C.brown} opacity="0.4" />
    </svg>
  ),

  ginger: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ginger root - knobby shape */}
      <path d="M4 9 Q3 7 5 6 Q7 5 8 7 Q9 5 11 5 Q13 6 12 8 Q13 10 11 11 Q9 11 8 9 Q7 11 5 11 Q3 11 4 9Z" fill={C.gold} />
      <path d="M5 7 Q6 6.5 7 7" stroke={C.amber} strokeWidth="0.5" opacity="0.5" />
      {/* Cut surface */}
      <ellipse cx="12.5" cy="8" rx="1" ry="2" fill={C.honey} opacity="0.6" />
    </svg>
  ),

  // === WOOD / BARREL FAMILY ===
  oak: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Barrel stave */}
      <path d="M3 3 Q2 8 3 13 L6 13 Q5 8 6 3Z" fill={C.brown} />
      <path d="M7 3 Q6 8 7 13 L10 13 Q9 8 10 3Z" fill={C.warmRed} />
      <path d="M11 3 Q10 8 11 13 L13 13 Q12 8 13 3Z" fill={C.brown} />
      {/* Barrel bands */}
      <rect x="2" y="5" width="12" height="1" rx="0.5" fill={C.copper} opacity="0.7" />
      <rect x="2" y="10" width="12" height="1" rx="0.5" fill={C.copper} opacity="0.7" />
    </svg>
  ),

  char: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Charred wood piece */}
      <rect x="3" y="6" width="10" height="6" rx="1" fill={C.char} />
      <rect x="3" y="6" width="10" height="3" rx="1" fill={C.darkBrown} />
      {/* Embers/glow */}
      <circle cx="5" cy="10" r="1" fill={C.amber} opacity="0.6" />
      <circle cx="8" cy="11" r="0.8" fill={C.honey} opacity="0.5" />
      <circle cx="11" cy="10" r="1" fill={C.amber} opacity="0.4" />
      {/* Ash specks */}
      <circle cx="6" cy="7" r="0.3" fill={C.smoke} opacity="0.5" />
      <circle cx="10" cy="7.5" r="0.3" fill={C.smoke} opacity="0.5" />
    </svg>
  ),

  smoke: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Smoke wisps */}
      <path d="M8 14 Q6 12 8 10 Q10 8 8 6" stroke={C.smoke} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M6 12 Q4 10 6 8 Q8 6 6 4" stroke={C.smoke} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.6" />
      <path d="M10 11 Q12 9 10 7 Q8 5 10 3" stroke={C.smoke} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" />
      {/* Base ember */}
      <circle cx="8" cy="14" r="1" fill={C.amber} opacity="0.5" />
    </svg>
  ),

  cedar: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cedar plank with grain */}
      <rect x="2" y="4" width="12" height="8" rx="1" fill={C.warmRed} />
      <line x1="3" y1="6" x2="13" y2="6" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
      <line x1="3" y1="8" x2="13" y2="8" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
      <line x1="3" y1="10" x2="13" y2="10" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
      {/* Knot */}
      <ellipse cx="10" cy="8" rx="1.5" ry="1" fill={C.brown} opacity="0.6" />
    </svg>
  ),

  sandalwood: (sz) => (    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Smooth carved wood piece */}
      <path d="M4 12 Q3 8 5 4 Q7 2 9 3 Q12 4 13 8 Q13 12 10 13 Q7 14 4 12Z" fill={C.copper} />
      <path d="M5 10 Q5 7 7 5 Q8 4 9 5" stroke={C.cream} strokeWidth="0.5" fill="none" opacity="0.3" />
      {/* Aroma lines */}
      <path d="M10 3 Q11 2 10 1" stroke={C.gold} strokeWidth="0.5" opacity="0.5" />
      <path d="M12 4 Q13 3 12 2" stroke={C.gold} strokeWidth="0.5" opacity="0.4" />
    </svg>
  ),

  pine: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pine tree silhouette */}
      <path d="M8 1 L4 6 L5.5 6 L3 10 L5 10 L2 14 L14 14 L11 10 L13 10 L10.5 6 L12 6Z" fill={C.darkGreen} />
      {/* Trunk */}
      <rect x="7" y="14" width="2" height="2" fill={C.brown} />
    </svg>
  ),

  // === FRUIT FAMILY ===
  cherry: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Two cherries */}
      <circle cx="5.5" cy="10" r="3.5" fill={C.berry} />
      <circle cx="10.5" cy="10.5" r="3" fill="#7A1F3D" />
      {/* Stems */}
      <path d="M5.5 7 Q6 3 8 2" stroke={C.darkGreen} strokeWidth="1" fill="none" />
      <path d="M10.5 7.5 Q10 4 8 2" stroke={C.darkGreen} strokeWidth="1" fill="none" />
      {/* Highlight */}
      <circle cx="4.5" cy="9" r="0.8" fill={C.cream} opacity="0.3" />
    </svg>
  ),

  apple: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Apple body */}
      <path d="M8 4 Q4 4 3 8 Q2 13 8 14 Q14 13 13 8 Q12 4 8 4Z" fill={C.warmRed} />
      {/* Indent at top */}
      <path d="M6.5 4.5 Q8 5.5 9.5 4.5" stroke={C.brown} strokeWidth="0.5" fill="none" />
      {/* Stem */}
      <line x1="8" y1="4" x2="8.5" y2="1.5" stroke={C.brown} strokeWidth="1" strokeLinecap="round" />
      {/* Leaf */}
      <path d="M8.5 2 Q10 1 11 2 Q10 2.5 8.5 2Z" fill={C.green} />
      {/* Highlight */}
      <circle cx="5.5" cy="7.5" r="1" fill={C.cream} opacity="0.2" />
    </svg>
  ),

  pear: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pear body */}
      <path d="M8 3 Q6 3 5 6 Q3 10 5 13 Q7 15 8 15 Q9 15 11 13 Q13 10 11 6 Q10 3 8 3Z" fill={C.gold} />
      {/* Stem */}
      <line x1="8" y1="3" x2="8.5" y2="1" stroke={C.brown} strokeWidth="1" strokeLinecap="round" />
      {/* Blush */}
      <ellipse cx="10" cy="10" rx="2" ry="3" fill={C.warmRed} opacity="0.2" />
    </svg>
  ),

  'citrus zest': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Citrus wedge */}
      <path d="M3 12 L8 3 L13 12Z" fill={C.citrus} />
      <path d="M4.5 11 L8 4.5 L11.5 11Z" fill={C.honey} />
      {/* Segments */}
      <line x1="8" y1="5" x2="6" y2="11" stroke={C.citrus} strokeWidth="0.5" />
      <line x1="8" y1="5" x2="8" y2="11" stroke={C.citrus} strokeWidth="0.5" />
      <line x1="8" y1="5" x2="10" y2="11" stroke={C.citrus} strokeWidth="0.5" />
      {/* Zest curls */}
      <path d="M13 6 Q14 5 13.5 4" stroke={C.citrus} strokeWidth="0.8" fill="none" />
    </svg>
  ),

  citrus: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Orange slice */}
      <circle cx="8" cy="8" r="6" fill={C.citrus} />
      <circle cx="8" cy="8" r="5" fill={C.honey} />
      {/* Segments */}
      <line x1="8" y1="3" x2="8" y2="13" stroke={C.citrus} strokeWidth="0.5" />
      <line x1="3" y1="8" x2="13" y2="8" stroke={C.citrus} strokeWidth="0.5" />
      <line x1="4.5" y1="4.5" x2="11.5" y2="11.5" stroke={C.citrus} strokeWidth="0.5" />
      <line x1="11.5" y1="4.5" x2="4.5" y2="11.5" stroke={C.citrus} strokeWidth="0.5" />
      {/* Center */}
      <circle cx="8" cy="8" r="1" fill={C.citrus} />
    </svg>
  ),

  'orange peel': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Curled orange peel */}
      <path d="M4 12 Q3 8 5 5 Q7 3 10 4 Q13 5 13 8 Q13 10 11 11" stroke={C.citrus} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {/* Inner pith */}
      <path d="M5 11 Q4 8 6 6 Q7.5 4.5 10 5.5" stroke={C.cream} strokeWidth="1" fill="none" opacity="0.5" />
      {/* Oil drops */}
      <circle cx="7" cy="4" r="0.5" fill={C.honey} opacity="0.6" />
      <circle cx="12" cy="6" r="0.5" fill={C.honey} opacity="0.6" />
    </svg>
  ),
  lemon: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Lemon shape */}
      <ellipse cx="8" cy="8" rx="5" ry="4" fill={C.honey} />
      {/* Nipples */}
      <path d="M3 8 Q2 8 2.5 7.5" stroke={C.honey} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M13 8 Q14 8 13.5 7.5" stroke={C.honey} strokeWidth="1.5" strokeLinecap="round" />
      {/* Highlight */}
      <ellipse cx="7" cy="7" rx="2" ry="1.5" fill={C.cream} opacity="0.3" />
    </svg>
  ),

  'dark chocolate': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chocolate bar squares */}
      <rect x="2" y="4" width="12" height="8" rx="1" fill={C.darkBrown} />
      <line x1="6" y1="4" x2="6" y2="12" stroke={C.char} strokeWidth="0.5" />
      <line x1="10" y1="4" x2="10" y2="12" stroke={C.char} strokeWidth="0.5" />
      <line x1="2" y1="8" x2="14" y2="8" stroke={C.char} strokeWidth="0.5" />
      {/* Shine */}
      <rect x="3" y="5" width="2.5" height="2.5" rx="0.3" fill={C.brown} opacity="0.3" />
    </svg>
  ),

  chocolate: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Chocolate bar squares */}
      <rect x="2" y="4" width="12" height="8" rx="1" fill={C.darkBrown} />
      <line x1="6" y1="4" x2="6" y2="12" stroke={C.char} strokeWidth="0.5" />
      <line x1="10" y1="4" x2="10" y2="12" stroke={C.char} strokeWidth="0.5" />
      <line x1="2" y1="8" x2="14" y2="8" stroke={C.char} strokeWidth="0.5" />
      <rect x="3" y="5" width="2.5" height="2.5" rx="0.3" fill={C.brown} opacity="0.3" />
    </svg>
  ),

  cocoa: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Cocoa pod */}
      <ellipse cx="8" cy="8" rx="4" ry="5.5" fill={C.warmRed} />
      {/* Ridges */}
      <path d="M5 4 Q5 8 5 12" stroke={C.brown} strokeWidth="0.5" fill="none" />
      <path d="M8 3 Q8 8 8 13" stroke={C.brown} strokeWidth="0.5" fill="none" />
      <path d="M11 4 Q11 8 11 12" stroke={C.brown} strokeWidth="0.5" fill="none" />
      {/* Stem */}
      <line x1="8" y1="2.5" x2="8" y2="1" stroke={C.darkGreen} strokeWidth="1" />
    </svg>
  ),

  coffee: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Coffee bean */}
      <ellipse cx="8" cy="8" rx="4.5" ry="5.5" fill={C.darkBrown} />
      {/* Center crease */}
      <path d="M8 3 Q6.5 6 8 8 Q9.5 10 8 13" stroke={C.char} strokeWidth="1" fill="none" />
      {/* Highlight */}
      <ellipse cx="6.5" cy="6" rx="1.5" ry="2" fill={C.brown} opacity="0.3" />
    </svg>
  ),

  // === EARTH / AGED FAMILY ===
  leather: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Leather swatch with stitching */}
      <rect x="2" y="3" width="12" height="10" rx="1.5" fill={C.brown} />
      {/* Stitch lines */}
      <path d="M3.5 4.5 L3.5 11.5" stroke={C.cream} strokeWidth="0.5" strokeDasharray="1.5 1" />
      <path d="M12.5 4.5 L12.5 11.5" stroke={C.cream} strokeWidth="0.5" strokeDasharray="1.5 1" />
      {/* Texture grain */}
      <path d="M5 6 Q7 5.5 9 6" stroke={C.darkBrown} strokeWidth="0.3" opacity="0.5" />
      <path d="M5 8.5 Q8 8 11 8.5" stroke={C.darkBrown} strokeWidth="0.3" opacity="0.5" />
    </svg>
  ),

  tobacco: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dried tobacco leaf */}
      <path d="M8 2 Q4 4 3 8 Q3 12 8 14 Q13 12 13 8 Q12 4 8 2Z" fill={C.leaf} />
      {/* Leaf veins */}
      <line x1="8" y1="3" x2="8" y2="13" stroke={C.brown} strokeWidth="0.6" />
      <path d="M8 5 L5 7" stroke={C.brown} strokeWidth="0.4" />
      <path d="M8 5 L11 7" stroke={C.brown} strokeWidth="0.4" />
      <path d="M8 8 L5.5 10" stroke={C.brown} strokeWidth="0.4" />
      <path d="M8 8 L10.5 10" stroke={C.brown} strokeWidth="0.4" />
      {/* Curl at tip */}
      <path d="M8 14 Q9 14.5 9.5 14" stroke={C.leaf} strokeWidth="0.5" fill="none" />
    </svg>
  ),

  // === HERB / GREEN FAMILY ===
  mint: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Mint leaf */}
      <path d="M8 2 Q3 5 3 9 Q3 13 8 14 Q13 13 13 9 Q13 5 8 2Z" fill={C.green} />
      {/* Vein */}
      <line x1="8" y1="3" x2="8" y2="13" stroke={C.darkGreen} strokeWidth="0.6" />
      <path d="M8 5.5 L5 7.5" stroke={C.darkGreen} strokeWidth="0.4" />
      <path d="M8 5.5 L11 7.5" stroke={C.darkGreen} strokeWidth="0.4" />
      <path d="M8 8 L5.5 10" stroke={C.darkGreen} strokeWidth="0.4" />
      <path d="M8 8 L10.5 10" stroke={C.darkGreen} strokeWidth="0.4" />
      {/* Cool shimmer */}      <circle cx="6" cy="7" r="0.8" fill={C.cream} opacity="0.2" />
    </svg>
  ),

  herbal: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Herb sprig */}
      <line x1="8" y1="14" x2="8" y2="2" stroke={C.darkGreen} strokeWidth="1" />
      {/* Small leaf pairs */}
      <ellipse cx="6" cy="4" rx="2" ry="1" fill={C.green} />
      <ellipse cx="10" cy="4" rx="2" ry="1" fill={C.green} />
      <ellipse cx="5.5" cy="7" rx="2.2" ry="1.2" fill={C.green} />
      <ellipse cx="10.5" cy="7" rx="2.2" ry="1.2" fill={C.green} />
      <ellipse cx="5" cy="10" rx="2.5" ry="1.3" fill={C.green} />
      <ellipse cx="11" cy="10" rx="2.5" ry="1.3" fill={C.green} />
    </svg>
  ),

  dill: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dill - feathery fronds */}
      <line x1="8" y1="14" x2="8" y2="4" stroke={C.darkGreen} strokeWidth="0.8" />
      {/* Fronds */}
      <path d="M8 5 Q5 4 4 2" stroke={C.green} strokeWidth="0.6" fill="none" />
      <path d="M8 5 Q11 4 12 2" stroke={C.green} strokeWidth="0.6" fill="none" />
      <path d="M8 7 Q5 6 3 5" stroke={C.green} strokeWidth="0.6" fill="none" />
      <path d="M8 7 Q11 6 13 5" stroke={C.green} strokeWidth="0.6" fill="none" />
      <path d="M8 9 Q5 8.5 3 8" stroke={C.green} strokeWidth="0.6" fill="none" />
      <path d="M8 9 Q11 8.5 13 8" stroke={C.green} strokeWidth="0.6" fill="none" />
      <path d="M8 11 Q5.5 10.5 4 10" stroke={C.green} strokeWidth="0.6" fill="none" />
      <path d="M8 11 Q10.5 10.5 12 10" stroke={C.green} strokeWidth="0.6" fill="none" />
    </svg>
  ),

  sage: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Sage leaf - elongated, fuzzy */}
      <ellipse cx="8" cy="8" rx="3.5" ry="5.5" fill={C.darkGreen} />
      {/* Fuzzy texture */}
      <ellipse cx="8" cy="8" rx="2.5" ry="4.5" fill={C.green} opacity="0.7" />
      {/* Vein */}
      <line x1="8" y1="3" x2="8" y2="13" stroke={C.darkGreen} strokeWidth="0.5" />
      {/* Stem */}
      <line x1="8" y1="13" x2="9" y2="15" stroke={C.darkGreen} strokeWidth="0.8" />
    </svg>
  ),

  eucalyptus: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Eucalyptus branch with round leaves */}
      <line x1="4" y1="14" x2="12" y2="2" stroke={C.darkGreen} strokeWidth="0.8" />
      <ellipse cx="6" cy="11" rx="2" ry="1.5" transform="rotate(-20 6 11)" fill={C.green} opacity="0.8" />
      <ellipse cx="7.5" cy="8.5" rx="2" ry="1.5" transform="rotate(-20 7.5 8.5)" fill={C.green} opacity="0.9" />
      <ellipse cx="9" cy="6" rx="2" ry="1.5" transform="rotate(-20 9 6)" fill={C.green} />
      <ellipse cx="10.5" cy="3.5" rx="1.8" ry="1.3" transform="rotate(-20 10.5 3.5)" fill={C.green} opacity="0.8" />
    </svg>
  ),

  // === FLORAL FAMILY ===
  floral: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Simple flower */}
      <circle cx="8" cy="8" r="2" fill={C.amber} />
      {/* Petals */}
      <ellipse cx="8" cy="4" rx="1.8" ry="2.5" fill={C.gold} opacity="0.8" />
      <ellipse cx="12" cy="8" rx="2.5" ry="1.8" fill={C.honey} opacity="0.8" />
      <ellipse cx="8" cy="12" rx="1.8" ry="2.5" fill={C.gold} opacity="0.8" />
      <ellipse cx="4" cy="8" rx="2.5" ry="1.8" fill={C.honey} opacity="0.8" />
      {/* Center */}
      <circle cx="8" cy="8" r="2" fill={C.amber} />
      <circle cx="7.5" cy="7.5" r="0.5" fill={C.gold} opacity="0.5" />
    </svg>
  ),

  rose: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Rose bloom - layered petals */}
      <circle cx="8" cy="7" r="5.5" fill={C.warmRed} opacity="0.6" />
      <circle cx="8" cy="7" r="4" fill={C.warmRed} opacity="0.7" />
      <circle cx="8" cy="7" r="2.5" fill={C.warmRed} opacity="0.8" />
      <circle cx="8" cy="7" r="1.2" fill={C.warmRed} />
      {/* Stem */}
      <line x1="8" y1="12.5" x2="8" y2="15" stroke={C.darkGreen} strokeWidth="1" />
      {/* Leaf */}
      <path d="M8 13 Q6 12 5 13 Q6 14 8 13Z" fill={C.green} />
    </svg>
  ),

  // === GRAIN / CEREAL FAMILY ===
  grain: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Grain stalk */}
      <line x1="8" y1="14" x2="8" y2="5" stroke={C.gold} strokeWidth="1" />
      {/* Grain heads */}
      <ellipse cx="6.5" cy="4" rx="1.5" ry="1" transform="rotate(-30 6.5 4)" fill={C.gold} />
      <ellipse cx="9.5" cy="3.5" rx="1.5" ry="1" transform="rotate(30 9.5 3.5)" fill={C.gold} />
      <ellipse cx="6.5" cy="6" rx="1.5" ry="1" transform="rotate(-30 6.5 6)" fill={C.honey} />
      <ellipse cx="9.5" cy="5.5" rx="1.5" ry="1" transform="rotate(30 9.5 5.5)" fill={C.honey} />
      <ellipse cx="8" cy="3" rx="1.3" ry="0.8" fill={C.amber} />
    </svg>  ),

  corn: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Corn cob */}
      <ellipse cx="8" cy="8" rx="3" ry="6" fill={C.honey} />
      {/* Kernel rows */}
      <circle cx="6.5" cy="5" r="0.8" fill={C.gold} />
      <circle cx="8" cy="4.5" r="0.8" fill={C.gold} />
      <circle cx="9.5" cy="5" r="0.8" fill={C.gold} />
      <circle cx="6.5" cy="7" r="0.8" fill={C.amber} />
      <circle cx="8" cy="6.5" r="0.8" fill={C.amber} />
      <circle cx="9.5" cy="7" r="0.8" fill={C.amber} />
      <circle cx="6.5" cy="9" r="0.8" fill={C.gold} />
      <circle cx="8" cy="8.5" r="0.8" fill={C.gold} />
      <circle cx="9.5" cy="9" r="0.8" fill={C.gold} />
      <circle cx="7" cy="11" r="0.8" fill={C.amber} />
      <circle cx="9" cy="11" r="0.8" fill={C.amber} />
      {/* Husk */}
      <path d="M5 12 Q4 10 5 8" stroke={C.green} strokeWidth="1" fill="none" />
      <path d="M11 12 Q12 10 11 8" stroke={C.green} strokeWidth="1" fill="none" />
    </svg>
  ),

  bread: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bread loaf */}
      <path d="M2 10 Q2 5 8 4 Q14 5 14 10 L14 12 Q14 13 13 13 L3 13 Q2 13 2 12Z" fill={C.gold} />
      {/* Crust top */}
      <path d="M2 10 Q2 5 8 4 Q14 5 14 10" fill={C.amber} />
      {/* Score marks */}
      <path d="M5 6.5 Q6 6 7 6.5" stroke={C.copper} strokeWidth="0.5" fill="none" />
      <path d="M9 6 Q10 5.5 11 6" stroke={C.copper} strokeWidth="0.5" fill="none" />
    </svg>
  ),

  grass: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Grass blades */}
      <path d="M3 14 Q3 8 5 4" stroke={C.green} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M6 14 Q6 7 7 2" stroke={C.darkGreen} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M9 14 Q8.5 9 9.5 3" stroke={C.green} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M12 14 Q12 8 10 5" stroke={C.darkGreen} strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M14 14 Q13 10 12 7" stroke={C.green} strokeWidth="1" fill="none" strokeLinecap="round" />
    </svg>
  ),

  // === NUT FAMILY ===
  walnut: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Walnut shell */}
      <circle cx="8" cy="8" r="5.5" fill={C.brown} />
      {/* Brain-like texture */}
      <path d="M5 6 Q6 5 8 6 Q10 7 11 6" stroke={C.darkBrown} strokeWidth="0.6" fill="none" />
      <path d="M5 8.5 Q7 7.5 8 8.5 Q9 9.5 11 8.5" stroke={C.darkBrown} strokeWidth="0.6" fill="none" />
      <path d="M6 10.5 Q7.5 10 9 10.5" stroke={C.darkBrown} strokeWidth="0.5" fill="none" />
      {/* Center line */}
      <line x1="8" y1="3" x2="8" y2="13" stroke={C.darkBrown} strokeWidth="0.4" />
    </svg>
  ),

  'black walnut': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Darker walnut */}
      <circle cx="8" cy="8" r="5.5" fill={C.darkBrown} />
      <path d="M5 6 Q6 5 8 6 Q10 7 11 6" stroke={C.char} strokeWidth="0.6" fill="none" />
      <path d="M5 8.5 Q7 7.5 8 8.5 Q9 9.5 11 8.5" stroke={C.char} strokeWidth="0.6" fill="none" />
      <path d="M6 10.5 Q7.5 10 9 10.5" stroke={C.char} strokeWidth="0.5" fill="none" />
      <line x1="8" y1="3" x2="8" y2="13" stroke={C.char} strokeWidth="0.4" />
    </svg>
  ),

  almond: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Almond shape */}
      <path d="M8 2 Q3 6 3 9 Q3 13 8 14 Q13 13 13 9 Q13 6 8 2Z" fill={C.copper} />
      {/* Inner line */}
      <path d="M8 3.5 Q5 7 5.5 10 Q6 12 8 13" stroke={C.cream} strokeWidth="0.5" fill="none" opacity="0.4" />
    </svg>
  ),

  pecan: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Pecan - elongated oval */}
      <ellipse cx="8" cy="8" rx="3" ry="6" fill={C.brown} />
      {/* Ridges */}
      <path d="M6 4 Q6 8 6 12" stroke={C.darkBrown} strokeWidth="0.4" />
      <path d="M8 2.5 Q8 8 8 13.5" stroke={C.darkBrown} strokeWidth="0.5" />
      <path d="M10 4 Q10 8 10 12" stroke={C.darkBrown} strokeWidth="0.4" />
      {/* Highlight */}
      <ellipse cx="7" cy="7" rx="1" ry="3" fill={C.copper} opacity="0.3" />
    </svg>
  ),

  peanut: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Peanut - figure 8 shape */}
      <ellipse cx="8" cy="5" rx="3" ry="3.5" fill={C.gold} />
      <ellipse cx="8" cy="11" rx="3.5" ry="3.5" fill={C.gold} />
      <ellipse cx="8" cy="8" rx="2" ry="1.5" fill={C.gold} />      {/* Shell texture */}
      <path d="M6 4 Q7 3 8 4" stroke={C.amber} strokeWidth="0.4" />
      <path d="M6 10 Q8 9 10 10" stroke={C.amber} strokeWidth="0.4" />
    </svg>
  ),

  coconut: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Coconut half */}
      <path d="M3 8 Q3 14 8 14 Q13 14 13 8Z" fill={C.brown} />
      {/* White flesh */}
      <path d="M4.5 8 Q4.5 12.5 8 12.5 Q11.5 12.5 11.5 8Z" fill={C.cream} />
      {/* Shell top */}
      <ellipse cx="8" cy="8" rx="5" ry="1.5" fill={C.darkBrown} />
      {/* Fibers */}
      <path d="M4 7 Q5 6 6 7" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
    </svg>
  ),

  // === TROPICAL / STONE FRUIT ===
  banana: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Banana curve */}
      <path d="M4 12 Q2 8 5 4 Q7 2 9 3 Q12 4 13 8 Q13 10 11 11 Q8 13 4 12Z" fill={C.honey} />
      {/* Tip */}
      <circle cx="4" cy="12" r="0.8" fill={C.brown} />
      {/* Stem */}
      <path d="M9 3 Q10 1.5 11 2" stroke={C.green} strokeWidth="1" fill="none" />
      {/* Brown spot */}
      <circle cx="7" cy="7" r="0.5" fill={C.amber} opacity="0.4" />
    </svg>
  ),

  'tropical fruit': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Mango-like shape */}
      <path d="M8 3 Q4 4 3 8 Q3 13 8 14 Q13 13 13 8 Q12 4 8 3Z" fill={C.amber} />
      {/* Blush */}
      <path d="M5 5 Q3 7 4 10" stroke={C.warmRed} strokeWidth="2" fill="none" opacity="0.3" />
      {/* Highlight */}
      <ellipse cx="9" cy="7" rx="1.5" ry="2" fill={C.honey} opacity="0.3" />
      {/* Stem */}
      <circle cx="8" cy="3" r="0.8" fill={C.darkGreen} />
    </svg>
  ),

  'stone fruit': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Peach/stone fruit */}
      <circle cx="8" cy="8.5" r="5.5" fill={C.amber} />
      {/* Cleft */}
      <path d="M8 3 Q7 5 7.5 8 Q7 11 8 14" stroke={C.warmRed} strokeWidth="0.8" fill="none" opacity="0.5" />
      {/* Blush */}
      <circle cx="10" cy="7" r="3" fill={C.warmRed} opacity="0.2" />
      {/* Leaf */}
      <path d="M8 3 Q9 1 11 2 Q10 3 8 3Z" fill={C.green} />
    </svg>
  ),

  peach: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8.5" r="5.5" fill={C.amber} />
      <path d="M8 3 Q7 5 7.5 8 Q7 11 8 14" stroke={C.warmRed} strokeWidth="0.8" fill="none" opacity="0.5" />
      <circle cx="10" cy="7" r="3" fill={C.warmRed} opacity="0.25" />
      <path d="M8 3 Q9 1 11 2 Q10 3 8 3Z" fill={C.green} />
    </svg>
  ),

  apricot: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8.5" r="5" fill={C.gold} />
      <path d="M8 3.5 Q7 6 7.5 8.5 Q7 11 8 13.5" stroke={C.amber} strokeWidth="0.7" fill="none" opacity="0.5" />
      <circle cx="6" cy="7" r="2" fill={C.honey} opacity="0.3" />
      <path d="M8 3.5 Q9 2 10.5 3 Q9.5 3.5 8 3.5Z" fill={C.green} />
    </svg>
  ),

  plum: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8.5" r="5.5" fill={C.berry} />
      <path d="M8 3 Q7 5 7.5 8.5 Q7 12 8 14" stroke="#5C1132" strokeWidth="0.8" fill="none" opacity="0.5" />
      {/* Bloom/dust */}
      <circle cx="6" cy="7" r="2.5" fill={C.cream} opacity="0.1" />
      <path d="M8 3 Q9 1.5 10.5 2.5 Q9.5 3 8 3Z" fill={C.darkGreen} />
    </svg>
  ),

  fig: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Fig - teardrop */}
      <path d="M8 2 Q4 5 4 9 Q4 14 8 14 Q12 14 12 9 Q12 5 8 2Z" fill={C.berry} />
      {/* Stem */}
      <line x1="8" y1="2" x2="8" y2="0.5" stroke={C.darkGreen} strokeWidth="1" strokeLinecap="round" />
      {/* Stripes */}
      <path d="M6 5 Q6 9 6.5 13" stroke="#6B1F3B" strokeWidth="0.4" opacity="0.5" />
      <path d="M10 5 Q10 9 9.5 13" stroke="#6B1F3B" strokeWidth="0.4" opacity="0.5" />
    </svg>
  ),

  date: (sz) => (    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Date - wrinkled oblong */}
      <ellipse cx="8" cy="8" rx="3.5" ry="5.5" fill={C.darkBrown} />
      {/* Wrinkle texture */}
      <path d="M5.5 5 Q8 4.5 10.5 5" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
      <path d="M5.5 7 Q8 6.5 10.5 7" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
      <path d="M5.5 9 Q8 8.5 10.5 9" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
      <path d="M5.5 11 Q8 10.5 10.5 11" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
      {/* Shine */}
      <ellipse cx="7" cy="7" rx="1" ry="2" fill={C.copper} opacity="0.2" />
    </svg>
  ),

  raisin: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Raisin - small wrinkled oval */}
      <ellipse cx="8" cy="8" rx="4" ry="3.5" fill={C.darkBrown} />
      {/* Wrinkles */}
      <path d="M5 7 Q6.5 6 8 7 Q9.5 8 11 7" stroke={C.char} strokeWidth="0.4" />
      <path d="M5 9 Q6.5 8 8 9 Q9.5 10 11 9" stroke={C.char} strokeWidth="0.4" />
      {/* Shine */}
      <ellipse cx="6.5" cy="7" rx="1" ry="0.8" fill={C.brown} opacity="0.3" />
    </svg>
  ),

  'dried fruit': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Small dried fruit cluster */}
      <ellipse cx="6" cy="7" rx="3" ry="2.5" fill={C.darkBrown} />
      <ellipse cx="10" cy="8" rx="3" ry="2.5" fill={C.brown} />
      <ellipse cx="8" cy="11" rx="2.5" ry="2" fill={C.darkBrown} opacity="0.8" />
      {/* Shine */}
      <circle cx="5.5" cy="6.5" r="0.6" fill={C.copper} opacity="0.3" />
    </svg>
  ),

  'dark fruit': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Dark berry cluster */}
      <circle cx="6" cy="7" r="2.8" fill={C.berry} />
      <circle cx="10" cy="7.5" r="2.5" fill="#5C1132" />
      <circle cx="7.5" cy="10.5" r="2.5" fill={C.berry} opacity="0.9" />
      {/* Highlights */}
      <circle cx="5.5" cy="6" r="0.6" fill={C.cream} opacity="0.2" />
      <circle cx="9.5" cy="6.5" r="0.5" fill={C.cream} opacity="0.2" />
    </svg>
  ),

  // === MISC ===
  anise: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Star anise */}
      <path d="M8 1 L9.2 5.5 L14 5.5 L10.2 8.5 L11.5 13 L8 10.2 L4.5 13 L5.8 8.5 L2 5.5 L6.8 5.5Z" fill={C.brown} />
      {/* Center seed */}
      <circle cx="8" cy="7.5" r="1.5" fill={C.darkBrown} />
      {/* Point seeds */}
      <circle cx="8" cy="3" r="0.5" fill={C.amber} opacity="0.6" />
      <circle cx="11.5" cy="5.5" r="0.5" fill={C.amber} opacity="0.6" />
      <circle cx="10.5" cy="10.5" r="0.5" fill={C.amber} opacity="0.6" />
      <circle cx="5.5" cy="10.5" r="0.5" fill={C.amber} opacity="0.6" />
      <circle cx="4.5" cy="5.5" r="0.5" fill={C.amber} opacity="0.6" />
    </svg>
  ),

  licorice: (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Licorice root */}
      <path d="M3 10 Q5 8 8 9 Q11 10 13 8" stroke={C.darkBrown} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M3 10 Q2 12 4 12" stroke={C.darkBrown} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Bark texture */}
      <path d="M5 8 Q5.5 7.5 6 8" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
      <path d="M9 9 Q9.5 8.5 10 9" stroke={C.brown} strokeWidth="0.4" opacity="0.5" />
    </svg>
  ),

  'caramel corn': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Popcorn kernels with caramel glaze */}
      <circle cx="6" cy="6" r="2.5" fill={C.amber} />
      <circle cx="10" cy="5.5" r="2.3" fill={C.gold} />
      <circle cx="8" cy="9" r="2.5" fill={C.amber} />
      <circle cx="5" cy="10" r="2" fill={C.honey} />
      <circle cx="11" cy="9" r="2" fill={C.gold} />
      {/* Caramel drizzle */}
      <path d="M5 5 Q6.5 4 8 5 Q9 5.5 10 5" stroke={C.darkBrown} strokeWidth="0.5" fill="none" opacity="0.5" />
    </svg>
  ),

  'maple': (sz) => (
    <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Maple leaf */}
      <path d="M8 2 L9.5 5 L12 4 L10.5 7 L13 8 L10.5 9 L12 12 L8 10 L4 12 L5.5 9 L3 8 L5.5 7 L4 4 L6.5 5Z" fill={C.amber} />
      <line x1="8" y1="10" x2="8" y2="14" stroke={C.brown} strokeWidth="1" />
    </svg>
  ),
};

// Fallback icon for notes without a specific icon
const fallbackIcon = (sz) => (
  <svg width={sz} height={sz} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">    {/* Generic drop/taste shape */}
    <path d="M8 2 Q4 7 4 10 Q4 14 8 14 Q12 14 12 10 Q12 7 8 2Z" fill={C.amber} />
    <circle cx="7" cy="9" r="1" fill={C.cream} opacity="0.3" />
  </svg>
);

/**
 * Get the SVG icon element for a given flavor note name.
 * @param {string} noteName - The note text (e.g., 'caramel', 'oak', 'rye spice')
 * @param {number} [size=16] - Icon size in pixels
 * @returns {React.ReactElement} Inline SVG element
 */
export function getNoteIcon(noteName, size = S) {
  const key = noteName?.toLowerCase?.() || '';
  const iconFn = icons[key];
  return iconFn ? iconFn(size) : fallbackIcon(size);
}

/**
 * React component for rendering a note icon inline.
 * Usage: <NoteIcon name="caramel" size={16} />
 */
export default function NoteIcon({ name, size = S }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', lineHeight: 0 }}>
      {getNoteIcon(name, size)}
    </span>
  );
}
