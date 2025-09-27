// US State validation and normalization
export interface StateValidationResult {
  valid: boolean;
  normalized?: string;
  suggestion?: string;
}

// US State abbreviations to full names
export const STATE_ABBREV_TO_NAME: Record<string, string> = {
  'AL': 'Alabama',
  'AK': 'Alaska', 
  'AZ': 'Arizona',
  'AR': 'Arkansas',
  'CA': 'California',
  'CO': 'Colorado',
  'CT': 'Connecticut',
  'DE': 'Delaware',
  'FL': 'Florida',
  'GA': 'Georgia',
  'HI': 'Hawaii',
  'ID': 'Idaho',
  'IL': 'Illinois',
  'IN': 'Indiana',
  'IA': 'Iowa',
  'KS': 'Kansas',
  'KY': 'Kentucky',
  'LA': 'Louisiana',
  'ME': 'Maine',
  'MD': 'Maryland',
  'MA': 'Massachusetts',
  'MI': 'Michigan',
  'MN': 'Minnesota',
  'MS': 'Mississippi',
  'MO': 'Missouri',
  'MT': 'Montana',
  'NE': 'Nebraska',
  'NV': 'Nevada',
  'NH': 'New Hampshire',
  'NJ': 'New Jersey',
  'NM': 'New Mexico',
  'NY': 'New York',
  'NC': 'North Carolina',
  'ND': 'North Dakota',
  'OH': 'Ohio',
  'OK': 'Oklahoma',
  'OR': 'Oregon',
  'PA': 'Pennsylvania',
  'RI': 'Rhode Island',
  'SC': 'South Carolina',
  'SD': 'South Dakota',
  'TN': 'Tennessee',
  'TX': 'Texas',
  'UT': 'Utah',
  'VT': 'Vermont',
  'VA': 'Virginia',
  'WA': 'Washington',
  'WV': 'West Virginia',
  'WI': 'Wisconsin',
  'WY': 'Wyoming',
  'DC': 'District of Columbia'
}

// Full names to abbreviations (reverse mapping)
export const STATE_NAME_TO_ABBREV: Record<string, string> = {
  'Alabama': 'AL',
  'Alaska': 'AK',
  'Arizona': 'AZ',
  'Arkansas': 'AR',
  'California': 'CA',
  'Colorado': 'CO',
  'Connecticut': 'CT',
  'Delaware': 'DE',
  'Florida': 'FL',
  'Georgia': 'GA',
  'Hawaii': 'HI',
  'Idaho': 'ID',
  'Illinois': 'IL',
  'Indiana': 'IN',
  'Iowa': 'IA',
  'Kansas': 'KS',
  'Kentucky': 'KY',
  'Louisiana': 'LA',
  'Maine': 'ME',
  'Maryland': 'MD',
  'Massachusetts': 'MA',
  'Michigan': 'MI',
  'Minnesota': 'MN',
  'Mississippi': 'MS',
  'Missouri': 'MO',
  'Montana': 'MT',
  'Nebraska': 'NE',
  'Nevada': 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  'Ohio': 'OH',
  'Oklahoma': 'OK',
  'Oregon': 'OR',
  'Pennsylvania': 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  'Tennessee': 'TN',
  'Texas': 'TX',
  'Utah': 'UT',
  'Vermont': 'VT',
  'Virginia': 'VA',
  'Washington': 'WA',
  'West Virginia': 'WV',
  'Wisconsin': 'WI',
  'Wyoming': 'WY',
  'District of Columbia': 'DC',
  'Washington D.C.': 'DC',
  'Washington DC': 'DC'
}

// Valid state abbreviations set for quick lookup
export const VALID_STATE_ABBREVS = new Set(Object.keys(STATE_ABBREV_TO_NAME))

// Common typos and corrections
const STATE_CORRECTIONS: Record<string, string> = {
  'CALIF': 'CA',
  'CALI': 'CA',
  'FLA': 'FL',
  'MASS': 'MA',
  'MICH': 'MI',
  'MISS': 'MS',
  'NEB': 'NE',
  'TENN': 'TN',
  'WASH': 'WA',
  'WISC': 'WI',
  'WYO': 'WY',
  'N.Y.': 'NY',
  'N.J.': 'NJ',
  'N.H.': 'NH',
  'N.C.': 'NC',
  'N.D.': 'ND',
  'S.C.': 'SC',
  'S.D.': 'SD',
  'W.V.': 'WV'
}

/**
 * Validates and normalizes a state input
 * @param stateInput - The state input (abbreviation or full name)
 * @returns StateValidationResult with validation info and suggestions
 */
export function validateAndNormalizeState(stateInput: string): StateValidationResult {
  if (!stateInput || typeof stateInput !== 'string') {
    return { valid: false }
  }

  const clean = stateInput.trim().toUpperCase()
  
  // Direct abbreviation match
  if (VALID_STATE_ABBREVS.has(clean)) {
    return { 
      valid: true, 
      normalized: clean 
    }
  }

  // Check common corrections
  const corrected = STATE_CORRECTIONS[clean]
  if (corrected) {
    return { 
      valid: true, 
      normalized: corrected,
      suggestion: `${stateInput} → ${corrected}`
    }
  }

  // Try full name match (case insensitive)
  const titleCase = stateInput.trim().split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  if (STATE_NAME_TO_ABBREV[titleCase]) {
    const abbrev = STATE_NAME_TO_ABBREV[titleCase]
    return { 
      valid: true, 
      normalized: abbrev,
      suggestion: `${stateInput} → ${abbrev}`
    }
  }

  // Try fuzzy matching for common typos
  const suggestion = findClosestState(clean)
  if (suggestion) {
    return {
      valid: false,
      suggestion: `Did you mean ${suggestion}?`
    }
  }

  return { valid: false }
}

/**
 * Finds the closest valid state for common typos
 * @param input - The potentially misspelled state input
 * @returns The closest valid state abbreviation or null
 */
function findClosestState(input: string): string | null {
  // Common single-character typos
  const typos: Record<string, string> = {
    'CA': 'CA', 'CB': 'CA', 'CS': 'CA',
    'NY': 'NY', 'NX': 'NY', 'NZ': 'NY',
    'TX': 'TX', 'TY': 'TX', 'TZ': 'TX',
    'FL': 'FL', 'FK': 'FL', 'FM': 'FL',
    'IL': 'IL', 'IK': 'IL', 'IM': 'IL',
    'PA': 'PA', 'PB': 'PA', 'PC': 'PA',
    'OH': 'OH', 'OI': 'OH', 'OJ': 'OH',
    'GA': 'GA', 'GB': 'GA', 'GC': 'GA',
    'NC': 'NC', 'ND': 'NC', 'NE': 'NC',
    'MI': 'MI', 'MJ': 'MI', 'MK': 'MI',
    'VA': 'VA', 'VB': 'VA', 'VC': 'VA',
    'WA': 'WA', 'WB': 'WA', 'WC': 'WA',
    'MA': 'MA', 'MB': 'MA', 'MC': 'MA',
    'TN': 'TN', 'TO': 'TN', 'TP': 'TN',
    'AZ': 'AZ', 'AY': 'AZ', 'BZ': 'AZ',
    'NV': 'NV', 'NW': 'NV', 'NX': 'NV',
    'UT': 'UT', 'UU': 'UT', 'UV': 'UT',
    'CO': 'CO', 'CP': 'CO', 'CQ': 'CO',
    'OR': 'OR', 'OS': 'OR', 'OT': 'OR',
    'NM': 'NM', 'NN': 'NM', 'NO': 'NM'
  }

  return typos[input] || null
}

/**
 * Gets the full state name from abbreviation
 * @param abbrev - State abbreviation
 * @returns Full state name or the input if not found
 */
export function getFullStateName(abbrev: string): string {
  return STATE_ABBREV_TO_NAME[abbrev.toUpperCase()] || abbrev
}

/**
 * Gets the state abbreviation from full name
 * @param fullName - Full state name
 * @returns State abbreviation or the input if not found
 */
export function getStateAbbreviation(fullName: string): string {
  return STATE_NAME_TO_ABBREV[fullName] || fullName
}
