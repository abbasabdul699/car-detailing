// Vehicle brand-to-model mapping for the brand picker dropdown
export const VEHICLE_BY_BRAND: Record<string, string[]> = {
  'Acura': ['ILX', 'Integra', 'MDX', 'RDX', 'TLX'],
  'Audi': ['A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'e-tron', 'Q3', 'Q5', 'Q7', 'Q8', 'RS5', 'RS7', 'S4', 'S5', 'TT'],
  'BMW': ['2 Series', '3 Series', '4 Series', '5 Series', '7 Series', '8 Series', 'i4', 'iX', 'M3', 'M4', 'M5', 'X1', 'X3', 'X5', 'X7', 'Z4'],
  'Cadillac': ['CT4', 'CT5', 'Escalade', 'LYRIQ', 'XT4', 'XT5', 'XT6'],
  'Chevrolet': ['Blazer', 'Bolt', 'Camaro', 'Colorado', 'Corvette', 'Equinox', 'Malibu', 'Silverado', 'Suburban', 'Tahoe', 'Trailblazer', 'Traverse'],
  'Dodge': ['Challenger', 'Charger', 'Durango', 'Hornet'],
  'Ford': ['Bronco', 'Edge', 'Escape', 'Explorer', 'Expedition', 'F-150', 'Maverick', 'Mustang', 'Ranger'],
  'GMC': ['Acadia', 'Canyon', 'Hummer EV', 'Sierra', 'Terrain', 'Yukon'],
  'Honda': ['Accord', 'Civic', 'CR-V', 'HR-V', 'Odyssey', 'Passport', 'Pilot', 'Ridgeline'],
  'Hyundai': ['Elantra', 'IONIQ 5', 'IONIQ 6', 'Kona', 'Palisade', 'Santa Fe', 'Sonata', 'Tucson'],
  'Infiniti': ['Q50', 'Q60', 'QX50', 'QX55', 'QX60', 'QX80'],
  'Jeep': ['Cherokee', 'Compass', 'Gladiator', 'Grand Cherokee', 'Renegade', 'Wagoneer', 'Wrangler'],
  'Kia': ['EV6', 'EV9', 'Forte', 'K5', 'Seltos', 'Sorento', 'Soul', 'Sportage', 'Telluride'],
  'Land Rover': ['Defender', 'Discovery', 'Range Rover', 'Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar'],
  'Lexus': ['ES', 'GX', 'IS', 'LC', 'LS', 'LX', 'NX', 'RC', 'RX', 'RZ', 'TX', 'UX'],
  'Mazda': ['CX-30', 'CX-5', 'CX-50', 'CX-70', 'CX-90', 'Mazda3', 'MX-5 Miata'],
  'Mercedes-Benz': ['A-Class', 'C-Class', 'CLA', 'CLE', 'E-Class', 'EQS', 'G-Class', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'S-Class', 'SL'],
  'Nissan': ['Altima', 'Ariya', 'Frontier', 'Kicks', 'Leaf', 'Maxima', 'Murano', 'Pathfinder', 'Rogue', 'Sentra', 'Titan', 'Versa', 'Z'],
  'Porsche': ['718 Boxster', '718 Cayman', '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan'],
  'Ram': ['1500', '2500', '3500', 'ProMaster'],
  'Rivian': ['R1S', 'R1T', 'R2', 'R3'],
  'Subaru': ['Ascent', 'BRZ', 'Crosstrek', 'Forester', 'Impreza', 'Legacy', 'Outback', 'Solterra', 'WRX'],
  'Tesla': ['Model 3', 'Model S', 'Model X', 'Model Y', 'Cybertruck'],
  'Toyota': ['4Runner', 'bZ4X', 'Camry', 'Corolla', 'Crown', 'GR86', 'GR Supra', 'Grand Highlander', 'Highlander', 'Land Cruiser', 'Prius', 'RAV4', 'Sequoia', 'Tacoma', 'Tundra', 'Venza'],
  'Volkswagen': ['Atlas', 'Golf', 'ID.4', 'ID.Buzz', 'Jetta', 'Taos', 'Tiguan'],
  'Volvo': ['C40', 'EX30', 'EX90', 'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90'],
};

// Reverse lookup: given a model name, find the brand
export function getBrandForModel(model: string): string | null {
  const lowerModel = model.toLowerCase();
  for (const [brand, models] of Object.entries(VEHICLE_BY_BRAND)) {
    if (models.some(m => m.toLowerCase() === lowerModel)) {
      return brand;
    }
  }
  return null;
}
