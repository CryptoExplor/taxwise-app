
/**
 * Defines the tax rules (slabs, cess, and rebate) for different assessment years
 * and tax regimes (Old and New). This configuration is essential for accurate tax computation.
 * This structure supports form-aware logic like `presumptiveAllowed`.
 */
export const taxRules = {
  "2022-23": {
    old: {
      slabs: [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      seniorSlabs: [
        { limit: 300000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      superSeniorSlabs: [
        { limit: 500000, rate: 0 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      rebate87A: { limit: 500000, maxRebate: 12500 },
      cessRate: 0.04,
      presumptiveAllowed: true,
      ltcgRate: 0.10,
      stcgRate: 0.15,
      ltcgExemption: 100000,
    },
    new: {
      slabs: [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 750000, rate: 0.1 },
        { limit: 1000000, rate: 0.15 },
        { limit: 1250000, rate: 0.2 },
        { limit: 1500000, rate: 0.25 },
        { limit: Infinity, rate: 0.3 },
      ],
      rebate87A: { limit: 500000, maxRebate: 12500 },
      cessRate: 0.04,
      presumptiveAllowed: true,
      ltcgRate: 0.10,
      stcgRate: 0.15,
      ltcgExemption: 100000,
    },
  },
  "2023-24": {
    old: {
      slabs: [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      seniorSlabs: [
        { limit: 300000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      superSeniorSlabs: [
        { limit: 500000, rate: 0 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      rebate87A: { limit: 500000, maxRebate: 12500 },
      cessRate: 0.04,
      presumptiveAllowed: true,
      ltcgRate: 0.10,
      stcgRate: 0.15,
      ltcgExemption: 100000,
    },
    new: {
       slabs: [
        { limit: 300000, rate: 0 },
        { limit: 600000, rate: 0.05 },
        { limit: 900000, rate: 0.1 },
        { limit: 1200000, rate: 0.15 },
        { limit: 1500000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 }
      ],
      rebate87A: { limit: 700000, maxRebate: 25000 },
      cessRate: 0.04,
      presumptiveAllowed: true,
      ltcgRate: 0.10,
      stcgRate: 0.15,
      ltcgExemption: 100000,
    },
  },
  "2024-25": {
    old: {
      slabs: [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      seniorSlabs: [
        { limit: 300000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      superSeniorSlabs: [
        { limit: 500000, rate: 0 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      rebate87A: { limit: 500000, maxRebate: 12500 },
      cessRate: 0.04,
      presumptiveAllowed: true,
      ltcgRate: 0.10,
      stcgRate: 0.15,
      ltcgExemption: 100000,
    },
    new: {
      slabs: [
        { limit: 300000, rate: 0 },
        { limit: 600000, rate: 0.05 },
        { limit: 900000, rate: 0.1 },
        { limit: 1200000, rate: 0.15 },
        { limit: 1500000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      rebate87A: { limit: 700000, maxRebate: 25000 },
      cessRate: 0.04,
      presumptiveAllowed: true,
      ltcgRate: 0.10,
      stcgRate: 0.15,
      ltcgExemption: 100000,
    },
  },
  "2025-26": {
    old: {
      slabs: [
        { limit: 250000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      seniorSlabs: [
        { limit: 300000, rate: 0 },
        { limit: 500000, rate: 0.05 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      superSeniorSlabs: [
        { limit: 500000, rate: 0 },
        { limit: 1000000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      rebate87A: { limit: 500000, maxRebate: 12500 },
      cessRate: 0.04,
      presumptiveAllowed: true,
      ltcgRate: 0.125,
      stcgRate: 0.20,
      ltcgExemption: 125000,
    },
    new: {
      slabs: [
        { limit: 300000, rate: 0 },
        { limit: 600000, rate: 0.05 },
        { limit: 900000, rate: 0.1 },
        { limit: 1200000, rate: 0.15 },
        { limit: 1500000, rate: 0.2 },
        { limit: Infinity, rate: 0.3 },
      ],
      rebate87A: { limit: 700000, maxRebate: 25000 },
      cessRate: 0.04,
      presumptiveAllowed: true,
      ltcgRate: 0.125,
      stcgRate: 0.20,
      ltcgExemption: 125000,
    },
  },
};
