// The 16 tiles, in the order world.js builds them. Each tile is an interest
// in the program finder; weights say how strongly it points to each program
// (keys are program ids from the site content).
export const TILES = [
  { icon: 'layers', label: 'Building full products', w: { fullstack: 2, genai: 1 } },
  { icon: 'code', label: 'Writing code', w: { fullstack: 3, genai: 1 } },
  { icon: 'chart', label: 'Charts + dashboards', w: { data: 3 } },
  { icon: 'cursor', label: 'Designing interfaces', w: { fullstack: 2 } },
  { icon: 'spark', label: 'Generative AI', w: { genai: 3 } },
  { icon: 'eye', label: 'Computer vision', w: { genai: 2, embedded: 1 } },
  { icon: 'chat', label: 'Chatbots + LLMs', w: { genai: 3, fullstack: 1 } },
  { icon: 'arrow', label: 'Growing a business', w: { data: 2 } },
  { icon: 'grid', label: 'Spreadsheets + reports', w: { data: 3 } },
  { icon: 'nodes', label: 'Systems + networks', w: { embedded: 2, fullstack: 1 } },
  { icon: 'box', label: 'Hardware projects', w: { embedded: 3 } },
  { icon: 'wave', label: 'Sensors + signals', w: { embedded: 2, data: 1 } },
  { icon: 'chip', label: 'Microcontrollers', w: { embedded: 3 } },
  { icon: 'cap', label: 'Learning by doing', w: { fullstack: 1, embedded: 1, genai: 1, data: 1 } },
  { icon: 'wifi', label: 'Connected devices', w: { embedded: 3 } },
  { icon: 'db', label: 'Databases', w: { fullstack: 2, data: 2 } },
];
export const ICON_ORDER = TILES.map((t) => t.icon);
export const MAX_PICKS = 3;
