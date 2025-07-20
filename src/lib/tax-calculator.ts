import type { TaxComputationResult } from './types';
import { taxRules } from '../config/tax-rules';

// Note: This is a simplified tax calculator.
// It does not cover all edge cases and complexities of the Indian Income Tax Act.

export function computeTax(
  taxableIncome: number,
  age: number,
  regime: 'New' | 'Old' = 'New',
  ay: string = "2024-25"
): TaxComputationResult {
  let taxBeforeCess = 0;
  let rebate = 0;
  
  let ruleKey;
  if (regime === "New") {
    ruleKey = `${ay}-new`;
  } else {
    ruleKey = ay;
  }
  
  let rule = taxRules[ruleKey as keyof typeof taxRules];

  // Fallback if specific year/regime combo not found
  if (!rule) {
    console.warn(`Tax rules for AY ${ay} and regime ${regime} not found. Falling back to 2024-25 New Regime.`);
    rule = taxRules["2024-25-new"];
  }
  
  let slabsToUse = rule.slabs;
  if (regime === 'Old') {
    if (age >= 80 && rule.superSeniorSlabs) {
        slabsToUse = rule.superSeniorSlabs;
    } else if (age >= 60 && rule.seniorSlabs) {
        slabsToUse = rule.seniorSlabs;
    } else {
        slabsToUse = rule.slabs;
    }
  }

  let prevLimit = 0;
  for (const slab of slabsToUse) {
    if (taxableIncome > prevLimit) {
      const taxableInSlab = Math.min(taxableIncome, slab.limit) - prevLimit;
      if (taxableInSlab > 0) {
        taxBeforeCess += taxableInSlab * slab.rate;
      }
      prevLimit = slab.limit;
      if (taxableIncome <= slab.limit) break;
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


/**
 * Calculates age from a date of birth string.
 * @param {string} dobStr - Date of birth in a string format (e.g., "YYYY-MM-DD" or "DD-MM-YYYY").
 * @returns {number} The calculated age, or 30 as a default if DOB is invalid.
 */
export function calculateAge(dobStr: string) {
  if (!dobStr) return 30;
  // Try parsing YYYY-MM-DD first, then DD-MM-YYYY
  let dob = new Date(dobStr);
  if (isNaN(dob.getTime())) {
    const parts = dobStr.split('-');
    if (parts.length === 3) {
        // Assuming DD-MM-YYYY
        dob = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  }

  if (isNaN(dob.getTime())) return 30; // Return default if still invalid

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}
