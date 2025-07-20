import type { TaxComputation } from './types';
import { taxRules } from '../config/tax-rules';

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
  const ay = "2024-25";
  
  let slabsToUse;
  let rule: any;

  const ruleKey = regime === 'New' ? `${ay}-new` : ay;
  
  rule = taxRules[ruleKey as keyof typeof taxRules];

  if (!rule) {
    console.warn(`Tax rules for AY ${ay} and regime ${regime} not found. Using defaults.`);
    return {
        taxableIncome,
        taxBeforeCess: 0,
        rebate: 0,
        taxAfterRebate: 0,
        cess: 0,
        totalTaxLiability: 0,
    };
  }
  
  if (regime === 'Old') {
    if (age >= 80 && rule.superSeniorSlabs) {
        slabsToUse = rule.superSeniorSlabs;
    } else if (age >= 60 && rule.seniorSlabs) {
        slabsToUse = rule.seniorSlabs;
    } else {
        slabsToUse = rule.slabs;
    }
  } else {
      slabsToUse = rule.slabs;
  }
  
  if (!slabsToUse) {
    console.error("No valid tax slabs found for computation. Returning zero tax.");
    return {
        taxableIncome,
        taxBeforeCess: 0,
        rebate: 0,
        taxAfterRebate: 0,
        cess: 0,
        totalTaxLiability: 0,
    };
  }

  let prevLimit = 0;
  for (const slab of slabsToUse) {
    if (taxableIncome > prevLimit) {
      const taxableInSlab = Math.min(taxableIncome - prevLimit, slab.limit - prevLimit);
      taxBeforeCess += taxableInSlab * slab.rate;
      prevLimit = slab.limit;
    } else {
      break;
    }
  }

  if (rule.rebate87A && taxableIncome <= rule.rebate87A.limit) {
    rebate = Math.min(taxBeforeCess, rule.rebate87A.maxRebate);
  }
  
  const taxAfterRebate = Math.max(0, taxBeforeCess - rebate);
  const cess = taxAfterRebate * (rule.cessRate || 0.04);
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
