// Employee color palette - 12 distinct colors for maximum distinction
const employeeColorPalette = [
  { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-900', badge: 'bg-blue-500' },
  { bg: 'bg-indigo-100', border: 'border-indigo-400', text: 'text-indigo-900', badge: 'bg-indigo-500' },
  { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-900', badge: 'bg-purple-500' },
  { bg: 'bg-pink-100', border: 'border-pink-400', text: 'text-pink-900', badge: 'bg-pink-500' },
  { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-900', badge: 'bg-red-500' },
  { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-900', badge: 'bg-orange-500' },
  { bg: 'bg-amber-100', border: 'border-amber-400', text: 'text-amber-900', badge: 'bg-amber-500' },
  { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-900', badge: 'bg-green-500' },
  { bg: 'bg-emerald-100', border: 'border-emerald-400', text: 'text-emerald-900', badge: 'bg-emerald-500' },
  { bg: 'bg-teal-100', border: 'border-teal-400', text: 'text-teal-900', badge: 'bg-teal-500' },
  { bg: 'bg-cyan-100', border: 'border-cyan-400', text: 'text-cyan-900', badge: 'bg-cyan-500' },
  { bg: 'bg-sky-100', border: 'border-sky-400', text: 'text-sky-900', badge: 'bg-sky-500' },
];

const colorMap: Record<string, any> = {
  'blue': employeeColorPalette[0],
  'indigo': employeeColorPalette[1],
  'purple': employeeColorPalette[2],
  'pink': employeeColorPalette[3],
  'red': employeeColorPalette[4],
  'orange': employeeColorPalette[5],
  'amber': employeeColorPalette[6],
  'green': employeeColorPalette[7],
  'emerald': employeeColorPalette[8],
  'teal': employeeColorPalette[9],
  'cyan': employeeColorPalette[10],
  'sky': employeeColorPalette[11],
};

// Cache to store computed colors for employees
const employeeColorCache: Record<string, any> = {};

/**
 * Get color classes from a stored color code (e.g., 'blue', 'red')
 * This is used when color is stored in the database
 */
export const getColorFromCode = (colorCode: string | null | undefined): any => {
  if (!colorCode || !colorMap[colorCode]) {
    return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-900', badge: 'bg-gray-500' };
  }
  return colorMap[colorCode];
};

/**
 * Get a consistent color for an employee based on their ID
 * Returns the same color every time for the same employee ID
 * Falls back to generated color if no stored color is available
 */
export const getEmployeeColor = (employeeId: string | undefined, storedColorCode?: string | null): any => {
  // If stored color code is provided, use it
  if (storedColorCode) {
    return getColorFromCode(storedColorCode);
  }

  if (!employeeId) {
    return { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-900', badge: 'bg-gray-500' };
  }

  // Return cached color if available
  if (employeeColorCache[employeeId]) {
    return employeeColorCache[employeeId];
  }

  // Generate a consistent index based on the ID hash
  let hash = 0;
  for (let i = 0; i < employeeId.length; i++) {
    const char = employeeId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  // Get color from palette using modulo
  const colorIndex = Math.abs(hash) % employeeColorPalette.length;
  const color = employeeColorPalette[colorIndex];

  // Cache the result
  employeeColorCache[employeeId] = color;

  return color;
};

/**
 * Get all colors in the palette with employee names (for legend)
 */
export const getEmployeeLegendColors = (employees: any[]): any[] => {
  return employees.map((emp) => ({
    name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || emp.employee_id,
    color: getEmployeeColor(emp.employee_id || emp.id, emp.color_code),
  }));
};

/**
 * Clear the color cache (useful for resetting when needed)
 */
export const clearEmployeeColorCache = () => {
  Object.keys(employeeColorCache).forEach((key) => delete employeeColorCache[key]);
};
