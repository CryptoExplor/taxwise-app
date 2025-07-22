/**
 * Defines the tax rules (slabs, cess, and rebate) for different assessment years
 * and tax regimes (Old and New). This configuration is essential for accurate tax computation.
 */
export const taxRules = {
  // Assessment Year 2024-25 (Financial Year 2023-24)
  "2024-25": {
    regime: "Old",
    slabs: [ // For individuals < 60 years
      { limit: 250000, rate: 0 },
      { limit: 500000, rate: 0.05 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 }
    ],
    seniorSlabs: [ // For individuals from 60 to 79 years
      { limit: 300000, rate: 0 },
      { limit: 500000, rate: 0.05 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 }
    ],
    superSeniorSlabs: [ // For individuals >= 80 years
      { limit: 500000, rate: 0 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 }
    ],
    cessRate: 0.04,
    rebate87A: { limit: 500000, maxRebate: 12500 }
  },
  "2024-25-new": {
    regime: "New",
    slabs: [ // Common for all ages
      { limit: 300000, rate: 0 },
      { limit: 600000, rate: 0.05 },
      { limit: 900000, rate: 0.10 },
      { limit: 1200000, rate: 0.15 },
      { limit: 1500000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 }
    ],
    cessRate: 0.04,
    rebate87A: { limit: 700000, maxRebate: 25000 }
  },

  // Assessment Year 2023-24 (Financial Year 2022-23)
  "2023-24": {
    regime: "Old",
    slabs: [
      { limit: 250000, rate: 0 },
      { limit: 500000, rate: 0.05 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 }
    ],
    seniorSlabs: [
      { limit: 300000, rate: 0 },
      { limit: 500000, rate: 0.05 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 }
    ],
    superSeniorSlabs: [
      { limit: 500000, rate: 0 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 }
    ],
    cessRate: 0.04,
    rebate87A: { limit: 500000, maxRebate: 12500 }
  },
  "2023-24-new": {
    regime: "New",
    slabs: [
      { limit: 250000, rate: 0 },
      { limit: 500000, rate: 0.05 },
      { limit: 750000, rate: 0.10 },
      { limit: 1000000, rate: 0.15 },
      { limit: 1250000, rate: 0.20 },
      { limit: 1500000, rate: 0.25 },
      { limit: Infinity, rate: 0.30 }
    ],
    cessRate: 0.04,
    rebate87A: { limit: 500000, maxRebate: 12500 }
  }
  // Note: Rules for AY 2025-26 and beyond are subject to change by government budgets.
  // The current rules for AY 2024-25 are typically used as a placeholder until new announcements.
};
