export interface IconData {
  body: string;
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

export interface IconSet {
  icons?: Record<string, IconData>;
  aliases?: Record<string, { parent: string }>;
  width?: number;
  height?: number;
}

export function resolveIconAlias(iconSet: IconSet, name: string): string {
  if (iconSet.aliases?.[name]) {
    return iconSet.aliases[name].parent;
  }
  return name;
}

export function buildSvg(
  iconData: IconData,
  defaults: { width?: number; height?: number },
  options?: { size?: number; color?: string }
): string {
  const width = iconData.width || defaults.width || 24;
  const height = iconData.height || defaults.height || 24;
  const viewBox = `${iconData.left || 0} ${iconData.top || 0} ${width} ${height}`;
  const svgSize = options?.size 
    ? `width="${options.size}" height="${options.size}"` 
    : `width="1em" height="1em"`;
  
  let body = iconData.body;
  if (!body.includes("fill=") && !body.includes("stroke=")) {
    body = body.replace(/<path/g, `<path fill="${options?.color || 'currentColor'}"`);
  }
  
  return `<svg xmlns="http://www.w3.org/2000/svg" ${svgSize} viewBox="${viewBox}">${body}</svg>`;
}

export function sortByPreferredCollections(
  icons: string[], 
  style: "solid" | "outline" | "any",
  learnedPreferences: string[] = []
): string[] {
  const stylePreferred = style === "solid" 
    ? ["mdi", "fa-solid"] 
    : style === "outline" 
      ? ["lucide", "tabler", "ph"] 
      : ["lucide", "mdi", "heroicons"];
  
  // Learned preferences take priority, then style-based defaults
  const preferred = [...new Set([...learnedPreferences, ...stylePreferred])];
  
  return [...icons].sort((a, b) => {
    const prefixA = a.split(":")[0]!;
    const prefixB = b.split(":")[0]!;
    const pA = preferred.indexOf(prefixA);
    const pB = preferred.indexOf(prefixB);
    
    // Both in preferred list - sort by preference order
    if (pA >= 0 && pB >= 0) return pA - pB;
    // Only A in preferred list
    if (pA >= 0 && pB < 0) return -1;
    // Only B in preferred list
    if (pB >= 0 && pA < 0) return 1;
    return 0;
  });
}

export function sortByLearnedPreferences(
  icons: string[],
  learnedPreferences: string[]
): string[] {
  if (learnedPreferences.length === 0) return icons;
  
  return [...icons].sort((a, b) => {
    const prefixA = a.split(":")[0]!;
    const prefixB = b.split(":")[0]!;
    const pA = learnedPreferences.indexOf(prefixA);
    const pB = learnedPreferences.indexOf(prefixB);
    
    // Both in preferred list - sort by preference order
    if (pA >= 0 && pB >= 0) return pA - pB;
    // Only A in preferred list
    if (pA >= 0 && pB < 0) return -1;
    // Only B in preferred list
    if (pB >= 0 && pA < 0) return 1;
    return 0;
  });
}
