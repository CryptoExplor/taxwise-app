
import type { TaxComputationResult, TaxSlab, IncomeDetails } from './types';
import { taxRules } from '../config/tax-rules';

// Note: This is a simplified tax calculator.
// It does not cover all edge cases and complexities of the Indian Income Tax Act.
// Rates for LTCG/STCG are simplified here.
const LTCG_TAX_RATE = 0.10; // Assuming LTCG under 112A > 1L is 10%
const STCG_TAX_RATE = 0.15; // Assuming STCG under 111A is 15%


export function computeTax(
  taxableIncome: number,
  age: number,
  regime: 'New' | 'Old' = 'New',
  ay: string = "2024-25",
  incomeDetails: IncomeDetails,
  deductions: number,
): TaxComputationResult {
  
  // Get the rules for the specific assessment year
  const yearRules = taxRules[ay as keyof typeof taxRules];
  if (!yearRules) {
    console.warn(`Tax rules for AY ${ay} not found. Falling back to 2024-25.`);
    return computeTax(taxableIncome, age, regime, "2024-25", incomeDetails, deductions);
  }
  
  const rule = regime === 'Old' ? yearRules.old : yearRules.new;
  if (!rule) {
    console.warn(`Tax rules for AY ${ay} and regime ${regime} not found. Falling back.`);
    return computeTax(taxableIncome, age, 'New', "2024-25", incomeDetails, deductions);
  }

  // 1. Separate Capital Gains and calculate tax on them
  const stcg = incomeDetails.capitalGains.shortTerm > 0 ? incomeDetails.capitalGains.shortTerm : 0;
  const ltcg = incomeDetails.capitalGains.longTerm > 0 ? incomeDetails.capitalGains.longTerm : 0;

  const taxOnSTCG = stcg * STCG_TAX_RATE;
  // For LTCG, tax is on amount exceeding 1 Lakh
  const taxableLTCG = Math.max(0, ltcg - 100000); 
  const taxOnLTCG = taxableLTCG * LTCG_TAX_RATE;
  
  // 2. Calculate tax on the remaining "normal" income
  const taxableIncomeNormal = Math.max(0, taxableIncome - stcg - ltcg);
  let taxOnNormalIncome = 0;
  const slabBreakdown: TaxSlab[] = [];

  let slabsToUse = rule.slabs;
  if (regime === 'Old') {
    if (age >= 80 && rule.superSeniorSlabs) {
        slabsToUse = rule.superSeniorSlabs;
    } else if (age >= 60 && rule.seniorSlabs) {
        slabsToUse = rule.seniorSlabs;
    }
  }

  let prevLimit = 0;
  let remainingNormalIncome = taxableIncomeNormal;

  for (const slab of slabsToUse) {
    if (remainingNormalIncome > 0) {
      const slabRange = slab.limit - prevLimit;
      const taxableInSlab = Math.min(remainingNormalIncome, slabRange);
      const taxInSlab = taxableInSlab * slab.rate;
      taxOnNormalIncome += taxInSlab;
      
      slabBreakdown.push({
          range: `₹${prevLimit.toLocaleString('en-IN')} - ₹${slab.limit === Infinity ? 'Above' : slab.limit.toLocaleString('en-IN')}`,
          amount: taxableInSlab,
          rate: slab.rate * 100,
          tax: taxInSlab
      });

      remainingNormalIncome -= taxableInSlab;
      prevLimit = slab.limit;
    } else {
        break;
    }
  }
  
  // 3. Combine taxes and apply rebate/cess
  const taxBeforeCess = taxOnNormalIncome + taxOnLTCG + taxOnSTCG;
  
  let rebate = 0;
  if (rule.rebate87A && taxableIncome <= rule.rebate87A.limit) {
    rebate = Math.min(taxBeforeCess, rule.rebate87A.maxRebate);
  }
  
  const taxAfterRebate = Math.max(0, taxBeforeCess - rebate);
  const cess = taxAfterRebate * (rule.cessRate || 0.04);
  const totalTaxLiability = taxAfterRebate + cess;

  return {
    taxableIncome,
    taxableIncomeNormal,
    taxOnNormalIncome,
    taxOnLTCG,
    taxOnSTCG,
    taxBeforeCess,
    rebate,
    taxAfterRebate,
    cess,
    totalTaxLiability,
    slabBreakdown,
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
