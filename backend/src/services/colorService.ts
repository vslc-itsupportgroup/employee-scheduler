// 12 distinct, vibrant colors for employees
const userColorPalette = [
  'blue',
  'indigo',
  'purple',
  'pink',
  'red',
  'orange',
  'amber',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
];

/**
 * Assign a consistent color to a user based on their email hash
 * Always returns the same color for the same email
 */
export const assignUserColor = (email: string): string => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  const colorIndex = Math.abs(hash) % userColorPalette.length;
  return userColorPalette[colorIndex];
};

/**
 * Get the Tailwind color classes for a given color code
 */
export const getColorClasses = (colorCode: string | null | undefined) => {
  if (!colorCode) {
    return {
      bg: 'bg-gray-100',
      border: 'border-gray-400',
      text: 'text-gray-900',
      badge: 'bg-gray-500',
      light: 'bg-gray-50',
      ring: 'ring-gray-300'
    };
  }

  const colorMap: Record<string, any> = {
    'blue': { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900', badge: 'bg-blue-500', light: 'bg-blue-50', ring: 'ring-blue-300' },
    'indigo': { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-900', badge: 'bg-indigo-500', light: 'bg-indigo-50', ring: 'ring-indigo-300' },
    'purple': { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900', badge: 'bg-purple-500', light: 'bg-purple-50', ring: 'ring-purple-300' },
    'pink': { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-900', badge: 'bg-pink-500', light: 'bg-pink-50', ring: 'ring-pink-300' },
    'red': { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-900', badge: 'bg-red-500', light: 'bg-red-50', ring: 'ring-red-300' },
    'orange': { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-900', badge: 'bg-orange-500', light: 'bg-orange-50', ring: 'ring-orange-300' },
    'amber': { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-900', badge: 'bg-amber-500', light: 'bg-amber-50', ring: 'ring-amber-300' },
    'green': { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-900', badge: 'bg-green-500', light: 'bg-green-50', ring: 'ring-green-300' },
    'emerald': { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900', badge: 'bg-emerald-500', light: 'bg-emerald-50', ring: 'ring-emerald-300' },
    'teal': { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-900', badge: 'bg-teal-500', light: 'bg-teal-50', ring: 'ring-teal-300' },
    'cyan': { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-900', badge: 'bg-cyan-500', light: 'bg-cyan-50', ring: 'ring-cyan-300' },
    'sky': { bg: 'bg-sky-100', border: 'border-sky-400', text: 'text-sky-900', badge: 'bg-sky-500', light: 'bg-sky-50', ring: 'ring-sky-300' },
  };

  return colorMap[colorCode] || colorMap['gray'];
};

export const userColorPaletteList = userColorPalette;
