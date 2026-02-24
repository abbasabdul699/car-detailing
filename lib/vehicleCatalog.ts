export interface VehicleManufacturer {
  name: string;
  slug: string;
  logoUrl: string;
  models: string[];
}

export interface VehicleCatalog {
  manufacturers: VehicleManufacturer[];
  modelAliases: Record<string, string>;
}

const DEFAULT_MANUFACTURERS: VehicleManufacturer[] = [
  { name: 'Acura', slug: 'acura', logoUrl: 'https://cdn.simpleicons.org/acura', models: ['ILX', 'Integra', 'MDX', 'RDX', 'TLX'] },
  { name: 'Audi', slug: 'audi', logoUrl: 'https://cdn.simpleicons.org/audi', models: ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'R8', 'RS6', 'SQ5', 'e-tron', 'Q3', 'Q5', 'Q6','Q7', 'Q8', 'RS5', 'RS7', 'S4', 'S5', 'TT'] },
  { name: 'BMW', slug: 'bmw', logoUrl: 'https://cdn.simpleicons.org/bmw', models: ['2 Series', '3 Series', '4 Series', '5 Series', '7 Series', '8 Series', 'i4', 'iX', 'M3', 'M4', 'M5', 'M240i', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7', 'Z4'] },
  { name: 'Cadillac', slug: 'cadillac', logoUrl: 'https://cdn.simpleicons.org/cadillac', models: ['CT4', 'CT5', 'CT6', 'Escalade', 'LYRIQ', 'XT4', 'XT5', 'XT6'] },
  { name: 'Chevrolet', slug: 'chevrolet', logoUrl: 'https://cdn.simpleicons.org/chevrolet', models: ['Blazer', 'Bolt', 'Camaro', 'Colorado', 'Corvette', 'Equinox', 'Malibu', 'Silverado', 'Suburban', 'Tahoe', 'Trailblazer', 'Traverse', 'Trax', 'Volt', 'Sonic'] },
  { name: 'Chrysler', slug: 'chrysler', logoUrl: 'https://cdn.simpleicons.org/chrysler', models: ['Pacifica', '300'] },
  { name: 'Dodge', slug: 'dodge', logoUrl: 'https://vl.imgix.net/img/dodge-logo.png', models: ['Challenger', 'Charger', 'Durango', 'Hornet'] },
  { name: 'Buick', slug: 'buick', logoUrl: 'https://vl.imgix.net/img/buick-logo.png', models: ['Encore', 'Enclave', 'Envision'] },
  { name: 'Ford', slug: 'ford', logoUrl: 'https://cdn.simpleicons.org/ford', models: ['Bronco', 'Edge', 'Escape', 'Explorer', 'Expedition', 'F-150', 'F-150 Lightning', 'F-150 Raptor', 'F-250', 'F-350', 'Fusion', 'Mach-E', 'Maverick', 'Mustang', 'Ranger', 'Transit'] },
  { name: 'Genesis', slug: 'genesis', logoUrl: 'https://vl.imgix.net/img/genesis-logo.png', models: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'] },
  { name: 'GMC', slug: 'gmc', logoUrl: 'https://vl.imgix.net/img/gmc-logo.png', models: ['Acadia', 'Canyon', 'Hummer EV', 'Sierra', 'Sierra 1500', 'Terrain', 'Yukon', 'Yukon XL'] },
  { name: 'Honda', slug: 'honda', logoUrl: 'https://cdn.simpleicons.org/honda', models: ['Accord', 'Civic', 'Civic Hatchback', 'CR-V', 'Fit', 'HR-V', 'Insight', 'Odyssey', 'Passport', 'Pilot', 'Ridgeline', 'S2000'] },
  { name: 'Hyundai', slug: 'hyundai', logoUrl: 'https://cdn.simpleicons.org/hyundai', models: ['Accent', 'Elantra', 'IONIQ 5', 'IONIQ 6', 'Kona', 'Palisade', 'Santa Fe', 'Sonata', 'Tucson'] },
  { name: 'Infiniti', slug: 'infiniti', logoUrl: 'https://cdn.simpleicons.org/infiniti', models: ['G37', 'Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'] },
  { name: 'Jaguar', slug: 'jaguar', logoUrl: 'https://vl.imgix.net/img/jaguar-logo.png', models: ['E-PACE', 'F-PACE', 'F-TYPE', 'I-PACE', 'XF'] },
  { name: 'Jeep', slug: 'jeep', logoUrl: 'https://cdn.simpleicons.org/jeep', models: ['Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Grand Cherokee L', 'Patriot', 'Renegade', 'Wagoneer', 'Wrangler'] },
  { name: 'Kia', slug: 'kia', logoUrl: 'https://cdn.simpleicons.org/kia', models: ['Carnival', 'EV6', 'EV9', 'Forte', 'K5', 'Optima', 'Seltos', 'Sorento', 'Soul', 'Sportage', 'Telluride'] },
  { name: 'Land Rover', slug: 'land-rover', logoUrl: 'https://vl.imgix.net/img/land-rover-logo.png', models: ['Defender', 'Discovery', 'LR4', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'] },
  { name: 'Lexus', slug: 'lexus', logoUrl: 'https://vl.imgix.net/img/lexus-logo.png', models: ['ES', 'ES 350', 'GX', 'GX460', 'IS', 'LC', 'LS', 'LX', 'NX', 'RC', 'RX', 'RX350', 'RX450h', 'RZ', 'TX', 'UX'] },
  { name: 'Lincoln', slug: 'lincoln', logoUrl: 'https://vl.imgix.net/img/lincoln-logo.png', models: ['Aviator', 'Corsair', 'Nautilus', 'Navigator', 'MKC', 'MKZ', 'MKX'] },
  { name: 'Mazda', slug: 'mazda', logoUrl: 'https://cdn.simpleicons.org/mazda', models: ['CX-30', 'CX-5', 'CX-50', 'CX-70', 'CX-90', 'CX-9', 'Mazda3', 'MX-5 Miata'] },
  { name: 'Mercedes-Benz', slug: 'mercedes-benz', logoUrl: 'https://vl.imgix.net/img/mercedes-benz-logo.png', models: ['A-Class', 'C-Class', 'CLA', 'CLE', 'E-Class', 'EQS', 'G-Class', 'GLA', 'GLB', 'GLC', 'GLC300', 'GLE', 'GLE350', 'GLS', 'ML350', 'S-Class', 'SL'] },
  { name: 'Mini', slug: 'mini', logoUrl: 'https://cdn.simpleicons.org/mini', models: ['Clubman', 'Convertible', 'Cooper', 'Countryman', 'Hardtop'] },
  { name: 'Nissan', slug: 'nissan', logoUrl: 'https://cdn.simpleicons.org/nissan', models: ['Altima', 'Ariya', 'Frontier', 'Kicks', 'Leaf', 'Maxima', 'Murano', 'Pathfinder', 'Rogue', 'Sentra', 'Titan', 'Versa', 'Z'] },
  { name: 'Porsche', slug: 'porsche', logoUrl: 'https://cdn.simpleicons.org/porsche', models: ['718 Boxster', '718 Cayman', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'] },
  { name: 'Ram', slug: 'ram', logoUrl: 'https://cdn.simpleicons.org/ram', models: ['1500', '2500', '3500', 'ProMaster'] },
  { name: 'Rivian', slug: 'rivian', logoUrl: 'https://vl.imgix.net/img/rivian-logo.png', models: ['R1S', 'R1T', 'R2', 'R3'] },
  { name: 'Subaru', slug: 'subaru', logoUrl: 'https://vl.imgix.net/img/subaru-logo.png', models: ['Ascent', 'BRZ', 'Baja', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'Tribeca', 'WRX'] },
  { name: 'Tesla', slug: 'tesla', logoUrl: 'https://cdn.simpleicons.org/tesla', models: ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'] },
  { name: 'Toyota', slug: 'toyota', logoUrl: 'https://cdn.simpleicons.org/toyota', models: ['4Runner', 'Avalon', 'bZ4X', 'Camry', 'Corolla', 'Crown', 'GR86', 'GR Supra', 'Grand Highlander', 'Highlander', 'Land Cruiser', 'Prius', 'RAV4', 'RAV4 Prime', 'Sequoia', 'Sienna', 'Tacoma', 'Tundra', 'Venza', 'Yaris'] },
  { name: 'Volkswagen', slug: 'volkswagen', logoUrl: 'https://cdn.simpleicons.org/volkswagen', models: ['Atlas', 'Beetle', 'Golf', 'Golf R', 'GTI', 'ID.4', 'ID.Buzz', 'Jetta', 'Passat', 'Taos', 'Tiguan'] },
  { name: 'Volvo', slug: 'volvo', logoUrl: 'https://cdn.simpleicons.org/volvo', models: ['C40', 'EX30', 'EX90', 'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90'] },
  { name: 'Mitsubishi', slug: 'mitsubishi', logoUrl: 'https://vl.imgix.net/img/mitsubishi-logo.png', models: ['Eclipse Cross', 'Lancer', 'Mirage', 'Outlander', 'Outlander PHEV', 'Outlander Sport'] },
  { name: 'Isuzu', slug: 'isuzu', logoUrl: 'https://vl.imgix.net/img/isuzu-logo.png', models: ['D-Max', 'FTR', 'MU-X', 'NPR', 'NQR'] },
  { name: 'Suzuki', slug: 'suzuki', logoUrl: 'https://vl.imgix.net/img/suzuki-logo.png', models: ['Grand Vitara', 'Jimny', 'Swift', 'SX4', 'Vitara', 'XL7'] },
  { name: 'Scion', slug: 'scion', logoUrl: 'https://vl.imgix.net/img/scion-logo.png', models: ['FR-S', 'iA', 'iM', 'tC', 'xB', 'xD'] },
  { name: 'Saturn', slug: 'saturn', logoUrl: 'https://vl.imgix.net/img/saturn-logo.png', models: ['Aura', 'Ion', 'Outlook', 'Relay', 'Sky', 'Vue'] },
  { name: 'Pontiac', slug: 'pontiac', logoUrl: 'https://vl.imgix.net/img/pontiac-logo.png', models: ['Firebird', 'G6', 'G8', 'Grand Am', 'Grand Prix', 'Solstice', 'Vibe'] },
  { name: 'Hummer', slug: 'hummer', logoUrl: 'https://vl.imgix.net/img/hummer-logo.png', models: ['EV', 'H1', 'H2', 'H3'] },
  { name: 'Saab', slug: 'saab', logoUrl: 'https://vl.imgix.net/img/saab-logo.png', models: ['9-2X', '9-3', '9-4X', '9-5', '900', '9000'] },
  { name: 'Mercury', slug: 'mercury', logoUrl: 'https://vl.imgix.net/img/mercury-logo.png', models: ['Grand Marquis', 'Marauder', 'Milan', 'Montego', 'Mountaineer', 'Sable'] },
  { name: 'Oldsmobile', slug: 'oldsmobile', logoUrl: 'https://vl.imgix.net/img/oldsmobile-logo.png', models: ['Alero', 'Aurora', 'Bravada', 'Cutlass', 'Intrigue', 'Silhouette'] },
  { name: 'Alfa Romeo', slug: 'alfa-romeo', logoUrl: 'https://vl.imgix.net/img/alfa-romeo-logo.png', models: ['4C', 'Giulia', 'Giulia Quadrifoglio', 'Stelvio', 'Tonale'] },
  { name: 'Maserati', slug: 'maserati', logoUrl: 'https://vl.imgix.net/img/maserati-logo.png', models: ['Ghibli', 'GranTurismo', 'Grecale', 'Levante', 'MC20', 'Quattroporte'] },
  { name: 'Bentley', slug: 'bentley', logoUrl: 'https://vl.imgix.net/img/bentley-logo.png', models: ['Bentayga', 'Continental GT', 'Flying Spur', 'Mulsanne'] },
  { name: 'Rolls-Royce', slug: 'rolls-royce', logoUrl: 'https://vl.imgix.net/img/rolls-royce-logo.png', models: ['Cullinan', 'Dawn', 'Ghost', 'Phantom', 'Spectre', 'Wraith'] },
  { name: 'Aston Martin', slug: 'aston-martin', logoUrl: 'https://vl.imgix.net/img/aston-martin-logo.png', models: ['DB11', 'DB12', 'DBX', 'Valhalla', 'Valkyrie', 'Vantage'] },
  { name: 'Ferrari', slug: 'ferrari', logoUrl: 'https://vl.imgix.net/img/ferrari-logo.png', models: ['296 GTB', '488', '812 Superfast', 'F8 Tributo', 'Purosangue', 'Roma', 'SF90 Stradale'] },
  { name: 'Lamborghini', slug: 'lamborghini', logoUrl: 'https://vl.imgix.net/img/lamborghini-logo.png', models: ['Aventador', 'Gallardo', 'Huracan', 'Revuelto', 'Urus'] },
  { name: 'McLaren', slug: 'mclaren', logoUrl: 'https://vl.imgix.net/img/mclaren-logo.png', models: ['570S', '600LT', '720S', '750S', 'Artura', 'GT', 'P1'] },
  { name: 'Lotus', slug: 'lotus', logoUrl: 'https://vl.imgix.net/img/lotus-logo.png', models: ['Eletre', 'Elise', 'Emeya', 'Emira', 'Evija', 'Exige'] },
  { name: 'Lucid', slug: 'lucid', logoUrl: 'https://vl.imgix.net/img/lucid-logo.png', models: ['Air', 'Gravity'] },
  { name: 'Polestar', slug: 'polestar', logoUrl: 'https://vl.imgix.net/img/polestar-logo.png', models: ['Polestar 1', 'Polestar 2', 'Polestar 3', 'Polestar 4'] },
  { name: 'Fisker', slug: 'fisker', logoUrl: 'https://vl.imgix.net/img/fisker-logo.png', models: ['Alaska', 'Karma', 'Ocean', 'Pear', 'Ronin'] },
];

const DEFAULT_MODEL_ALIASES: Record<string, string> = {
  'f150': 'F-150',
  'f 150': 'F-150',
  'f-150': 'F-150',
  'crv': 'CR-V',
  'sorrento': 'Sorento',
  'sorento': 'Sorento',
  'blzer': 'Blazer',
  'g wagon': 'G-Class',
  'g-wagon': 'G-Class',
  'gwagon': 'G-Class',
  'forrester': 'Forester',
  'es360': 'ES',
  'rx350': 'RX350',
  'rx 350': 'RX350',
  'rx450h': 'RX450h',
  'gx460': 'GX460',
  'cx5': 'CX-5',
  'cx 5': 'CX-5',
  'cx9': 'CX-9',
  'cx 9': 'CX-9',
  'cx30': 'CX-30',
  'cx 30': 'CX-30',
  'hrv': 'HR-V',
  '4 runner': '4Runner',
  'f250': 'F-250',
  'f 250': 'F-250',
  'f350': 'F-350',
  'f 350': 'F-350',
  'f150 raptor': 'F-150 Raptor',
  'f150 lightning': 'F-150 Lightning',
  'f150 lightening': 'F-150 Lightning',
  'ram1500': '1500',
  'ram 1500': '1500',
  'gmc2500': 'Sierra',
  'gmc 2500': 'Sierra',
  'tuscon': 'Tucson',
  'passatt': 'Passat',
  'id4': 'ID.4',
  'sq5': 'SQ5',
  'rs6': 'RS6',
  'x2': 'X2',
  'x6': 'X6',
  'e450 coupe': 'E-Class',
  'gle350': 'GLE350',
  'glc300': 'GLC300',
  'mach e': 'Mach-E',
  'mustang mach e': 'Mach-E',
  'gti': 'GTI',
  'golfr': 'Golf R',
  'golf r': 'Golf R',
  'rav4 prime': 'RAV4 Prime',
  'miata': 'MX-5 Miata',
  'panemara': 'Panamera',
  'vw golf': 'Golf',
  'vw jetta': 'Jetta',
  'vw atlas': 'Atlas',
  'vw tiguan': 'Tiguan',
  'e350': 'E-Class',
  'e 350': 'E-Class',
  'c300': 'C-Class',
  's550': 'S-Class',
  'rav 4': 'RAV4',
  'rav4': 'RAV4',
  'model3': 'Model 3',
  'model y': 'Model Y',
  'model x': 'Model X',
  'model s': 'Model S',
  'es350': 'ES 350',
  'rx450': 'RX450h',
  'm240': 'M240i',
  'm240i': 'M240i',
  'grand cherokee l': 'Grand Cherokee L',
  'civic hatch': 'Civic Hatchback',
  'cooper s': 'Cooper',
  'velar': 'Range Rover Velar',
  'yukonxl': 'Yukon XL',
  'sierra1500': 'Sierra 1500',
  'merc suv': 'GLE',
  'frs': 'FR-S',
  'fr s': 'FR-S',
  'tc': 'tC',
  'xb': 'xB',
  'xd': 'xD',
  '9 3': '9-3',
  '9 5': '9-5',
  '9 2x': '9-2X',
  '9 4x': '9-4X',
  'ghibli sq4': 'Ghibli',
  'granturismo': 'GranTurismo',
  'quattro porte': 'Quattroporte',
  'continental': 'Continental GT',
  'flying spur': 'Flying Spur',
  'db 11': 'DB11',
  'db 12': 'DB12',
  'sf90': 'SF90 Stradale',
  'purosangue suv': 'Purosangue',
  'huracán': 'Huracan',
  'huracan evo': 'Huracan',
  'mc20 cielo': 'MC20',
  '570 s': '570S',
  '720 s': '720S',
  '750 s': '750S',
  'r1t': 'R1T',
  'r1s': 'R1S',
  'polestar2': 'Polestar 2',
  'polestar 2': 'Polestar 2',
  'polestar3': 'Polestar 3',
  'polestar 3': 'Polestar 3',
  'polestar4': 'Polestar 4',
  'polestar 4': 'Polestar 4',
};

const DEFAULT_MAKE_ALIASES: Record<string, string> = {
  vw: 'Volkswagen',
  'volks wagon': 'Volkswagen',
  volkswagen: 'Volkswagen',
  mercedes: 'Mercedes-Benz',
  merc: 'Mercedes-Benz',
  benz: 'Mercedes-Benz',
  ram: 'Ram',
  mini: 'Mini',
  chevy: 'Chevrolet',
  landrover: 'Land Rover',
  mitsu: 'Mitsubishi',
  alfa: 'Alfa Romeo',
  'alfa romeo': 'Alfa Romeo',
  rolls: 'Rolls-Royce',
  'rolls royce': 'Rolls-Royce',
  'rolls-royce': 'Rolls-Royce',
  aston: 'Aston Martin',
  mclaren: 'McLaren',
  suburu: 'Subaru',
};

export const DEFAULT_VEHICLE_CATALOG: VehicleCatalog = {
  manufacturers: DEFAULT_MANUFACTURERS,
  modelAliases: DEFAULT_MODEL_ALIASES,
};

const normalizeKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export const toTitleCase = (value: string): string =>
  value
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export function getVehicleBrandMap(catalog: VehicleCatalog = DEFAULT_VEHICLE_CATALOG): Record<string, string[]> {
  const sortedManufacturers = [...catalog.manufacturers].sort((a, b) => a.name.localeCompare(b.name));
  return sortedManufacturers.reduce<Record<string, string[]>>((acc, manufacturer) => {
    acc[manufacturer.name] = [...manufacturer.models].sort((a, b) => a.localeCompare(b));
    return acc;
  }, {});
}

export function getManufacturerByName(name: string, catalog: VehicleCatalog = DEFAULT_VEHICLE_CATALOG): VehicleManufacturer | null {
  const normalized = normalizeKey(name);
  return catalog.manufacturers.find((manufacturer) => normalizeKey(manufacturer.name) === normalized) || null;
}

export function getManufacturerForModel(model: string, catalog: VehicleCatalog = DEFAULT_VEHICLE_CATALOG): string | null {
  const normalizedInput = normalizeKey(model);
  const aliasModel = catalog.modelAliases[normalizedInput] || model;
  const normalizedAlias = normalizeKey(aliasModel);

  for (const manufacturer of catalog.manufacturers) {
    if (manufacturer.models.some((candidate) => normalizeKey(candidate) === normalizedAlias)) {
      return manufacturer.name;
    }
  }

  const parts = normalizedAlias.split(' ').filter(Boolean);
  for (const prefixLength of [2, 1]) {
    if (parts.length <= prefixLength) continue;
    const prefix = parts.slice(0, prefixLength).join(' ');
    const canonicalMake = DEFAULT_MAKE_ALIASES[prefix];
    if (!canonicalMake) continue;
    const manufacturer = getManufacturerByName(canonicalMake, catalog);
    if (!manufacturer) continue;
    const modelOnly = parts.slice(prefixLength).join(' ');
    const modelMatch = manufacturer.models.find((candidate) => normalizeKey(candidate) === modelOnly);
    if (modelMatch) {
      return manufacturer.name;
    }
  }

  return null;
}

export function getManufacturerLogo(manufacturerName: string, catalog: VehicleCatalog = DEFAULT_VEHICLE_CATALOG): string {
  const manufacturer = getManufacturerByName(manufacturerName, catalog);
  return manufacturer?.logoUrl || 'https://cdn.simpleicons.org/car';
}

export function normalizeModelName(model: string, catalog: VehicleCatalog = DEFAULT_VEHICLE_CATALOG): string {
  const normalizedInput = normalizeKey(model);
  if (!normalizedInput) return '';
  const aliased = catalog.modelAliases[normalizedInput] || model.trim();
  const normalizedAliased = normalizeKey(aliased);

  for (const manufacturer of catalog.manufacturers) {
    const match = manufacturer.models.find((candidate) => normalizeKey(candidate) === normalizedAliased);
    if (match) return match;
  }

  return toTitleCase(aliased);
}

export interface ParsedVehicleInput {
  raw: string;
  vehicle: string;
  year?: number;
  make?: string;
  model?: string;
  confidence: 'high' | 'medium' | 'low';
}

export function parseVehicleInput(rawInput: string, catalog: VehicleCatalog = DEFAULT_VEHICLE_CATALOG): ParsedVehicleInput {
  const raw = rawInput.trim();
  if (!raw) {
    return { raw: rawInput, vehicle: '', confidence: 'low' };
  }

  const yearMatch = raw.match(/\b((?:19|20)\d{2})\b/);
  const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : undefined;
  const withoutYear = year ? raw.replace(yearMatch![0], '').replace(/\s+/g, ' ').trim() : raw;
  const normalizedWithoutYear = normalizeKey(withoutYear);

  for (const manufacturer of catalog.manufacturers) {
    const manufacturerKey = normalizeKey(manufacturer.name);
    if (normalizedWithoutYear === manufacturerKey) {
      return {
        raw,
        vehicle: manufacturer.name,
        year,
        make: manufacturer.name,
        confidence: 'medium',
      };
    }
    if (normalizedWithoutYear.startsWith(manufacturerKey + ' ')) {
      const modelRaw = withoutYear.slice(manufacturer.name.length).trim();
      const model = normalizeModelName(modelRaw, catalog);
      return {
        raw,
        vehicle: [year, manufacturer.name, model].filter(Boolean).join(' ').trim(),
        year,
        make: manufacturer.name,
        model,
        confidence: 'high',
      };
    }
  }

  const rawParts = withoutYear.split(/\s+/).filter(Boolean);
  for (const prefixLength of [2, 1]) {
    if (rawParts.length <= prefixLength) continue;
    const prefix = normalizeKey(rawParts.slice(0, prefixLength).join(' '));
    const canonicalMake = DEFAULT_MAKE_ALIASES[prefix];
    if (!canonicalMake) continue;
    const manufacturer = getManufacturerByName(canonicalMake, catalog);
    if (!manufacturer) continue;
    const modelRaw = rawParts.slice(prefixLength).join(' ');
    const model = normalizeModelName(modelRaw, catalog);
    return {
      raw,
      vehicle: [year, manufacturer.name, model].filter(Boolean).join(' ').trim(),
      year,
      make: manufacturer.name,
      model,
      confidence: 'high',
    };
  }

  const inferredMake = getManufacturerForModel(withoutYear, catalog);
  const inferredModel = normalizeModelName(withoutYear, catalog);
  if (inferredMake && inferredModel) {
    return {
      raw,
      vehicle: [year, inferredMake, inferredModel].filter(Boolean).join(' ').trim(),
      year,
      make: inferredMake,
      model: inferredModel,
      confidence: 'high',
    };
  }

  return {
    raw,
    vehicle: raw,
    year,
    confidence: year ? 'medium' : 'low',
  };
}

export interface NormalizedVehiclePayload {
  vehicle?: string;
  vehicleYear?: number;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicles: string[];
  unresolvedVehicles: string[];
}

export function normalizeVehiclePayload(inputVehicles: string[], catalog: VehicleCatalog = DEFAULT_VEHICLE_CATALOG): NormalizedVehiclePayload {
  const normalizedVehicles: string[] = [];
  const unresolvedVehicles: string[] = [];
  let firstHighConfidence: ParsedVehicleInput | null = null;
  let firstResolvedMake: string | undefined;

  for (const rawVehicle of inputVehicles) {
    const splitCandidates = rawVehicle
      .split(/\s*(?:,|;|\/|&|\band\b)\s*/i)
      .map((candidate) => candidate.trim())
      .filter(Boolean);

    for (const candidate of splitCandidates) {
      const parsed = parseVehicleInput(candidate, catalog);
      if (!parsed.vehicle) continue;
      if (parsed.make && parsed.model) {
        normalizedVehicles.push(parsed.model);
        if (!firstHighConfidence) firstHighConfidence = parsed;
        if (!firstResolvedMake) firstResolvedMake = parsed.make;
      } else if (parsed.make) {
        normalizedVehicles.push(parsed.vehicle || parsed.make);
        if (!firstResolvedMake) firstResolvedMake = parsed.make;
      } else {
        unresolvedVehicles.push(parsed.vehicle);
        normalizedVehicles.push(parsed.vehicle);
      }
    }
  }

  const uniqueVehicles = Array.from(new Set(normalizedVehicles.map((v) => v.trim()).filter(Boolean)));

  return {
    vehicle: firstHighConfidence?.vehicle || uniqueVehicles[0],
    vehicleYear: firstHighConfidence?.year,
    vehicleMake: firstHighConfidence?.make || firstResolvedMake,
    vehicleModel: firstHighConfidence?.model || uniqueVehicles[0],
    vehicles: uniqueVehicles,
    unresolvedVehicles,
  };
}

