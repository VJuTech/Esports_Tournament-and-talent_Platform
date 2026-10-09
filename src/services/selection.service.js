function isEligibleForSelection({ performanceVerified, conductClear, eligibilityConfirmed }) {
  return performanceVerified && conductClear && eligibilityConfirmed;
}

module.exports = { isEligibleForSelection };
