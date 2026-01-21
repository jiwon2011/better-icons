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
  style: "solid" | "outline" | "any"
): string[] {
  const preferred = style === "solid" 
    ? ["mdi", "fa-solid"] 
    : style === "outline" 
      ? ["lucide", "tabler", "ph"] 
      : ["lucide", "mdi", "heroicons"];
  
  return [...icons].sort((a, b) => {
    const pA = preferred.indexOf(a.split(":")[0]!);
    const pB = preferred.indexOf(b.split(":")[0]!);
    if (pA >= 0 && pB < 0) return -1;
    if (pB >= 0 && pA < 0) return 1;
    return 0;
  });
}
