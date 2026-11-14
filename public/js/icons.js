// Line icons on a 24×24 grid. Used as inline SVG in the DOM and as Path2D
// textures on the WebGL tiles, so both share one visual language.
export const ICONS = {
  code: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  chip: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
  spark: 'M12 3c.6 4.6 3.4 7.4 9 9-5.6 1.6-8.4 4.4-9 9-.6-4.6-3.4-7.4-9-9 5.6-1.6 8.4-4.4 9-9z',
  chart: 'M4 20h16M7 16v-5M12 16V7M17 16v-8',
  cursor: 'M5 3l14 7-6.2 1.9L10.5 18z',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
  cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6',
  briefcase: 'M3 8h18v12H3zM8 8V5h8v3M3 13h18',
  wifi: 'M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5v.5',
  rocket: 'M5 15c-1.5 1.5-2 5-2 5s3.5-.5 5-2M9 15l-3-3c1-4 5-9 13-9 0 8-5 12-9 13zM15 9h.01',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  users: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 3a4 4 0 0 1 0 8M22 21c0-3-1.5-5-4-6',
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  wave: 'M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4',
  chat: 'M4 5h16v11H9l-5 4zM8 10h.01M12 10h.01M16 10h.01',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM17 14v6M14 17h6',
  arrow: 'M7 17L17 7M9 7h8v8',
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  nodes: 'M12 5a2 2 0 1 0 0 .01M5 19a2 2 0 1 0 0 .01M19 19a2 2 0 1 0 0 .01M11 7l-5 10M13 7l5 10M7 19h10',
  check: 'M4 12l5 5L20 6',
};

export const svgIcon = (name) =>
  `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name] || ICONS.spark}"/></svg>`;
