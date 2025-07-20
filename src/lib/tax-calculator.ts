import type { TaxComputation } from './types';

// Note: This is a simplified tax calculator for AY 2024-25 (FY 2023-24)
// It does not cover all edge cases and complexities of the Indian Income Tax Act.
// It assumes the "New Regime" is the default, which it is from FY 2023-24.

export function computeTax(
  taxableIncome: number,
  age: number, // age is not used in new regime but kept for potential extension
  regime: 'New' | 'Old' = 'New'
): Omit<TaxComputation, 'netTaxPayable' | 'refund'> {
  let taxBeforeCess = 0;
  let rebate = 0;

  if (regime === 'New') {
    if (taxableIncome > 1500000) {
      taxBeforeCess = 150000 + (taxableIncome - 1500000) * 0.30;
    } else if (taxableIncome > 1200000) {
      taxBeforeCess = 90000 + (taxableIncome - 1200000) * 0.20;
    } else if (taxableIncome > 900000) {
      taxBeforeCess = 45000 + (taxableIncome - 900000) * 0.15;
    } else if (taxableIncome > 600000) {
      taxBeforeCess = 15000 + (taxableIncome - 600000) * 0.10;
    } else if (taxableIncome > 300000) {
      taxBeforeCess = (taxableIncome - 300000) * 0.05;
    } else {
      taxBeforeCess = 0;
    }

    // Rebate under section 87A for New Regime
    if (taxableIncome <= 700000) {
      rebate = Math.min(taxBeforeCess, 25000);
    }
  } else { // Old Regime Logic
    let exemptionLimit = 250000;
    if (age >= 80) {
      exemptionLimit = 500000;
    } else if (age >= 60) {
      exemptionLimit = 300000;
    }

    if (taxableIncome > exemptionLimit) {
        if (taxableIncome <= 500000) {
            taxBeforeCess = (taxableIncome - exemptionLimit) * 0.05;
        } else if (taxableIncome <= 1000000) {
            taxBeforeCess = (500000 - exemptionLimit) * 0.05 + (taxableIncome - 500000) * 0.20;
            if (exemptionLimit > 250000) taxBeforeCess = 10000 + (taxableIncome - 500000) * 0.20;
        } else {
            taxBeforeCess = (500000 - exemptionLimit) * 0.05 + (1000000-500000)*0.20 + (taxableIncome - 1000000) * 0.30;
            if (exemptionLimit > 250000) taxBeforeCess = 10000 + 100000 + (taxableIncome - 1000000) * 0.30;
        }
    }

    // Rebate under section 87A for Old Regime
    if (taxableIncome <= 500000) {
      rebate = Math.min(taxBeforeCess, 12500);
    }
  }
  
  const taxAfterRebate = Math.max(0, taxBeforeCess - rebate);
  const cess = taxAfterRebate * 0.04;
  const totalTaxLiability = taxAfterRebate + cess;

  return {
    taxableIncome,
    taxBeforeCess,
    rebate,
    taxAfterRebate,
    cess,
    totalTaxLiability,
  };
}
