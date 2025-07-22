
import type { TaxComputationResult, TaxSlab } from './types';
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
  const slabBreakdown: TaxSlab[] = [];
  
  // Get the rules for the specific assessment year
  const yearRules = taxRules[ay as keyof typeof taxRules];

  // Fallback if specific year not found
  if (!yearRules) {
    console.warn(`Tax rules for AY ${ay} not found. Falling back to 2024-25.`);
    return computeTax(taxableIncome, age, regime, "2024-25");
  }
  
  // Select the rule based on the regime ('old' or 'new')
  const rule = regime === 'Old' ? yearRules.old : yearRules.new;

  if (!rule) {
    console.warn(`Tax rules for AY ${ay} and regime ${regime} not found. Falling back.`);
    // Fallback to a default, e.g., 2024-25 New Regime's logic from a valid AY
    return computeTax(taxableIncome, age, 'New', "2024-25");
  }

  let slabsToUse = rule.slabs;
  if (regime === 'Old') {
    // Check for senior-specific slabs only in the Old regime
    if (age >= 80 && rule.superSeniorSlabs) {
        slabsToUse = rule.superSeniorSlabs;
    } else if (age >= 60 && rule.seniorSlabs) {
        slabsToUse = rule.seniorSlabs;
    }
  }

  let prevLimit = 0;
  for (const slab of slabsToUse) {
    if (taxableIncome > prevLimit) {
      const taxableInSlab = Math.min(taxableIncome, slab.limit) - prevLimit;
      if (taxableInSlab > 0) {
        const taxInSlab = taxableInSlab * slab.rate;
        taxBeforeCess += taxInSlab;
        slabBreakdown.push({
            range: `₹${prevLimit.toLocaleString('en-IN')} - ₹${slab.limit === Infinity ? 'Above' : slab.limit.toLocaleString('en-IN')}`,
            amount: taxableInSlab,
            rate: slab.rate * 100,
            tax: taxInSlab
        });
      }
      prevLimit = slab.limit;
      if (taxableIncome <= slab.limit) break;
    }
  }

  // Rebate calculation should happen before cess is applied
  const taxAfterRebateBeforeCess = taxBeforeCess;

  if (rule.rebate87A && taxableIncome <= rule.rebate87A.limit) {
    rebate = Math.min(taxAfterRebateBeforeCess, rule.rebate87A.maxRebate);
  }
  
  const taxAfterRebate = Math.max(0, taxAfterRebateBeforeCess - rebate);
  const cess = taxAfterRebate * (rule.cessRate || 0.04);
  const totalTaxLiability = taxAfterRebate + cess;

  return {
    taxableIncome,
    taxBeforeCess,
    rebate,
    taxAfterRebate,
    cess,
    totalTaxLiability,
    slabBreakdown, // Return the detailed breakdown
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
