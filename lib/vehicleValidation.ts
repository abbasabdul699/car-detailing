import {
  DEFAULT_VEHICLE_CATALOG,
  getManufacturerForModel,
  normalizeModelName,
  parseVehicleInput as parseCatalogVehicleInput,
  normalizeVehiclePayload,
  type ParsedVehicleInput,
} from '@/lib/vehicleCatalog';

// Enhanced vehicle validation and normalization
export interface VehicleInfo {
  year?: number
  make?: string
  model?: string
  vehicle?: string
}

// Common model variations and corrections
const MODEL_ALIASES: Record<string, string[]> = {
  'model 3': ['m3', 'model3', 'tesla 3'],
  'model s': ['ms', 'models', 'tesla s'],
  'model x': ['mx', 'modelx', 'tesla x'],
  'model y': ['my', 'modely', 'tesla y'],
  '3 series': ['320i', '328i', '335i', 'm3'],
  '5 series': ['525i', '530i', '535i', 'm5'],
  '7 series': ['750i', '760i', 'm7'],
  'c-class': ['c300', 'c43', 'c63'],
  'e-class': ['e300', 'e350', 'e63'],
  's-class': ['s450', 's500', 's63', 's65'],
}

// Validate vehicle combinations
export function validateVehicle(vehicle: VehicleInfo): { valid: boolean; suggestions?: string[] } {
  const { make, model, year } = vehicle
  
  if (!make || !model) {
    return { valid: false }
  }

  // Check for obviously invalid combinations
  const invalidCombos = [
    { make: 'ferrari', model: 'f150' }, // Ferrari doesn't make F150
    { make: 'tesla', model: 'prius' },  // Tesla doesn't make Prius
    { make: 'bmw', model: 'civic' },    // BMW doesn't make Civic
  ]

  const isInvalid = invalidCombos.some(combo => 
    make.toLowerCase().includes(combo.make) && 
    model.toLowerCase().includes(combo.model)
  )

  if (isInvalid) {
    return { 
      valid: false, 
      suggestions: [`Did you mean a ${year} ${model}?`] 
    }
  }

  return { valid: true }
}

// Normalize model names
export function normalizeModel(make: string, model: string): string {
  const makeLower = make.toLowerCase()
  const modelLower = model.toLowerCase()

  // Check for known aliases
  for (const [canonical, aliases] of Object.entries(MODEL_ALIASES)) {
    if (aliases.some(alias => modelLower.includes(alias))) {
      return canonical.toUpperCase()
    }
  }

  // Default: use canonical model casing from catalog.
  return normalizeModelName(model, DEFAULT_VEHICLE_CATALOG)
}

// Generate clarification questions
export function generateVehicleClarification(vehicle: VehicleInfo): string {
  const { make, model, year } = vehicle
  
  if (!make) {
    return "What's the make and model of your vehicle?"
  }
  
  if (!model) {
    return `Which ${make} model do you have? (e.g., ${getCommonModels(make).join(', ')})`
  }

  const validation = validateVehicle(vehicle)
  if (!validation.valid && validation.suggestions) {
    return validation.suggestions[0]
  }

  return ""
}

// Get common models for a make
function getCommonModels(make: string): string[] {
  const makeLower = make.toLowerCase()
  
  if (makeLower.includes('tesla')) return ['Model 3', 'Model S', 'Model X', 'Model Y']
  if (makeLower.includes('bmw')) return ['3 Series', '5 Series', 'X3', 'X5']
  if (makeLower.includes('mercedes')) return ['C-Class', 'E-Class', 'S-Class', 'GLC']
  if (makeLower.includes('audi')) return ['A4', 'A6', 'Q5', 'Q7']
  if (makeLower.includes('ford')) return ['F-150', 'Mustang', 'Explorer', 'Escape']
  
  return []
}

export function resolveMakeFromModel(model: string): string | null {
  return getManufacturerForModel(model, DEFAULT_VEHICLE_CATALOG)
}

export function parseVehicleInput(input: string): ParsedVehicleInput {
  return parseCatalogVehicleInput(input, DEFAULT_VEHICLE_CATALOG)
}

export function normalizeVehicles(inputVehicles: string[]) {
  return normalizeVehiclePayload(inputVehicles, DEFAULT_VEHICLE_CATALOG)
}
