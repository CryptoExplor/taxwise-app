export const taxRules = {
  "2024-25": { // Old Regime for AY 2024-25 (FY 2023-24)
    slabs: [
      { limit: 250000, rate: 0 },
      { limit: 500000, rate: 0.05 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 },
    ],
    seniorSlabs: [ // For age >= 60
      { limit: 300000, rate: 0 },
      { limit: 500000, rate: 0.05 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 },
    ],
    superSeniorSlabs: [ // For age >= 80
      { limit: 500000, rate: 0 },
      { limit: 1000000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 },
    ],
    rebate87A: {
      limit: 500000,
      maxRebate: 12500,
    },
    cessRate: 0.04,
  },
  "2024-25-new": { // New Regime for AY 2024-25 (FY 2023-24) - Default from this FY
    slabs: [
      { limit: 300000, rate: 0 },
      { limit: 600000, rate: 0.05 },
      { limit: 900000, rate: 0.10 },
      { limit: 1200000, rate: 0.15 },
      { limit: 1500000, rate: 0.20 },
      { limit: Infinity, rate: 0.30 },
    ],
    rebate87A: {
      limit: 700000,
      maxRebate: 25000,
    },
    cessRate: 0.04,
  },
};
