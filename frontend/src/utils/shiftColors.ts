export const shiftColorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  '7-4': { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-900', badge: 'bg-blue-500' },
  'VL': { bg: 'bg-yellow-100', border: 'border-yellow-300', text: 'text-yellow-900', badge: 'bg-yellow-500' },
  'HD': { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-900', badge: 'bg-orange-500' },
  'SPL': { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-900', badge: 'bg-purple-500' },
  'RD': { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-900', badge: 'bg-green-500' },
  'HDD': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-900', badge: 'bg-red-500' },
  'APE': { bg: 'bg-indigo-100', border: 'border-indigo-300', text: 'text-indigo-900', badge: 'bg-indigo-500' },
  'OB': { bg: 'bg-cyan-100', border: 'border-cyan-300', text: 'text-cyan-900', badge: 'bg-cyan-500' },
  'BDL': { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-900', badge: 'bg-pink-500' },
};

export const getShiftColor = (code: string) => {
  return shiftColorMap[code] || { bg: 'bg-gray-100', border: 'border-gray-300', text: 'text-gray-900', badge: 'bg-gray-500' };
};
