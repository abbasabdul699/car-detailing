// Shared helper to keep service-name normalization consistent across
// scripts, API handlers, and any future UI logic.
function normalizeServiceName(name = '') {
  return name.trim().toLowerCase().replace(/\s+/g, ' ')
}

module.exports = {
  normalizeServiceName,
}

// Provide named export compatibility for consumers using CommonJS default import syntax.
module.exports.normalizeServiceName = normalizeServiceName
