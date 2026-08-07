export const InsuranceCoverageMatrix = {
  COMPREHENSIVE: {
    covers_accidents: true,
    covers_natural_disasters: true,
    covers_theft: true,
    deductible_percent: 5,
    max_coverage_limit: Infinity
  },
  THIRD_PARTY: {
    covers_accidents: false,
    covers_natural_disasters: false,
    covers_theft: false,
    deductible_percent: 0,
    max_coverage_limit: 0
  },
  ZERO_DEPRECIATION: {
    covers_accidents: true,
    covers_natural_disasters: true,
    covers_theft: true,
    deductible_percent: 0,
    max_coverage_limit: Infinity
  }
};
