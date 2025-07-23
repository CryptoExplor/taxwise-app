
import type { ClientData, CapitalGainsTransaction } from './types';
import { taxRules } from '@/config/tax-rules';

export const calculateCapitalGainsTax = (transactions: CapitalGainsTransaction[] = [], assessmentYear: string = '2025-26') => {
    let totalSTCG111A = 0;
    let totalLTCG112A = 0;
    let totalOtherSTCG = 0; // These are taxed at slab rates
    let totalOtherLTCG = 0;

    const rules = taxRules[assessmentYear as keyof typeof taxRules]?.old; // CG rates are same for both regimes in our config
    if (!rules) {
        console.warn(`No tax rules found for AY ${assessmentYear}. Defaulting to 2025-26.`);
        return 0;
    }

    transactions.forEach(tx => {
        if (!tx.purchaseDate || !tx.saleDate) return;
        
        const purchaseDate = new Date(tx.purchaseDate);
        const saleDate = new Date(tx.saleDate);

        if (isNaN(purchaseDate.getTime()) || isNaN(saleDate.getTime())) return;
        
        const holdingPeriodMs = saleDate.getTime() - purchaseDate.getTime();
        const holdingPeriodDays = holdingPeriodMs / (1000 * 60 * 60 * 24);

        let costOfAcquisition = tx.purchasePrice;
        if (purchaseDate < new Date('2018-01-31') && tx.fmv2018) {
            costOfAcquisition = Math.max(tx.purchasePrice, tx.fmv2018);
        }

        const gain = tx.salePrice - costOfAcquisition - (tx.expenses || 0);

        if (gain <= 0) return;

        if (tx.assetType === 'equity_listed') {
            if (holdingPeriodDays <= 365) {
                totalSTCG111A += gain;
            } else {
                totalLTCG112A += gain;
            }
        } else if (tx.assetType === 'property' || tx.assetType === 'unlisted_shares') {
            if (holdingPeriodDays <= 730) {
                totalOtherSTCG += gain;
            } else {
                totalOtherLTCG += gain;
            }
        } else {
            if (holdingPeriodDays <= 365) {
                totalOtherSTCG += gain;
            } else {
                totalOtherLTCG += gain;
            }
        }
    });

    let capitalGainsTax = 0;
    // STCG under Section 111A (STT paid)
    capitalGainsTax += totalSTCG111A * rules.stcgRate;

    // LTCG under Section 112A (STT paid)
    const taxableLTCG112A = Math.max(0, totalLTCG112A - rules.ltcgExemption);
    capitalGainsTax += taxableLTCG112A * rules.ltcgRate;

    // Other LTCG (e.g., from property, unlisted shares) taxed at a flat rate (simplified)
    capitalGainsTax += totalOtherLTCG * rules.ltcgRate;
    
    // Note: totalOtherSTCG is taxed at slab rates, so it should be added to normal income.
    // This function only returns tax on special rate gains. We'll add totalOtherSTCG to income in the main compute function.

    return Math.round(capitalGainsTax);
};

const calculateSlabTax = (income: number, slabs: { limit: number; rate: number }[]): number => {
    let tax = 0;
    let remainingIncome = income;

    for (let i = 0; i < slabs.length; i++) {
        const slab = slabs[i];
        const prevSlabLimit = i === 0 ? 0 : slabs[i - 1].limit;

        if (remainingIncome > 0) {
            const taxableInSlab = Math.min(remainingIncome, slab.limit - prevSlabLimit);
            tax += taxableInSlab * slab.rate;
            remainingIncome -= taxableInSlab;
        }

        if (remainingIncome <= 0) break;
    }

    return tax;
};


const computeRegimeTax = (
    incomeData: ClientData['incomeDetails'],
    deductionsData: ClientData['deductions'],
    regime: 'old' | 'new',
    capitalGainsTransactions: CapitalGainsTransaction[] = [],
    dob: string | null = null,
    assessmentYear: string = '2025-26'
): number => {
    const rulesKey = assessmentYear as keyof typeof taxRules;
    const rules = taxRules[rulesKey]?.[regime];

    if (!rules) {
        console.warn(`No tax rules found for AY ${assessmentYear} and regime ${regime}.`);
        return 0; // Or handle as an error
    }

    // Sum up income heads
    const totalIncomeFromHeads = Object.values(incomeData).reduce((sum, val) => {
        if (typeof val === 'number') return sum + val;
        return sum; // ignore nested objects like capitalGains
    }, 0);

    // From capital gains, find the portion taxed at slab rates
    let stcgAtSlabRates = 0;
    (capitalGainsTransactions || []).forEach(tx => {
        if (!tx.purchaseDate || !tx.saleDate) return;
        const purchaseDate = new Date(tx.purchaseDate);
        const saleDate = new Date(tx.saleDate);
        const holdingPeriodDays = (saleDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24);
        if (tx.assetType !== 'equity_listed' && holdingPeriodDays <= 365) {
             const gain = tx.salePrice - tx.purchasePrice - (tx.expenses || 0);
             if(gain > 0) stcgAtSlabRates += gain;
        }
    });

    const taxOnSpecialRateCG = calculateCapitalGainsTax(capitalGainsTransactions, assessmentYear);
    
    let grossTotalIncome = totalIncomeFromHeads;
    let taxableIncomeForSlabs = grossTotalIncome;

    let age = 30; // Default age
    if (dob) {
        const birthDate = new Date(dob);
        const ayEndDate = new Date(`${parseInt(assessmentYear.split('-')[0])}-03-31`);
        age = ayEndDate.getFullYear() - birthDate.getFullYear();
        if (ayEndDate.getMonth() < birthDate.getMonth() || (ayEndDate.getMonth() === birthDate.getMonth() && ayEndDate.getDate() < birthDate.getDate())) {
            age--;
        }
    }

    if (incomeData.salary > 0) {
        taxableIncomeForSlabs -= 50000; // Standard Deduction
    }

    if (regime === 'old') {
        const totalDeductions = Object.values(deductionsData).reduce((a, b) => a + b, 0);
        taxableIncomeForSlabs -= totalDeductions;
    } else {
        // New regime only allows 80CCD(2) from our list (and standard deduction, already applied)
        taxableIncomeForSlabs -= (deductionsData.section80CCD2 || 0);
    }
    
    taxableIncomeForSlabs = Math.max(0, taxableIncomeForSlabs);

    let slabsToUse;
    if (regime === 'old') {
        if (age >= 80 && rules.superSeniorSlabs) slabsToUse = rules.superSeniorSlabs;
        else if (age >= 60 && rules.seniorSlabs) slabsToUse = rules.seniorSlabs;
        else slabsToUse = rules.slabs;
    } else {
        slabsToUse = rules.slabs;
    }

    let taxOnSlabIncome = calculateSlabTax(taxableIncomeForSlabs, slabsToUse);

    // Apply Rebate u/s 87A
    const totalTaxableIncome = taxableIncomeForSlabs; // Simplified check
    if (totalTaxableIncome <= rules.rebate87A.limit) {
        taxOnSlabIncome = Math.max(0, taxOnSlabIncome - rules.rebate87A.maxRebate);
    }
    
    let totalTaxBeforeCess = taxOnSlabIncome + taxOnSpecialRateCG;

    // Surcharge logic can be added here if needed, based on grossTotalIncome

    const cess = totalTaxBeforeCess * rules.cessRate;
    
    return Math.round(totalTaxBeforeCess + cess);
};

export const computeTax = (client: ClientData): { taxOldRegime: number, taxNewRegime: number } => {
    const ay = client.assessmentYear || '2025-26';
    const taxOldRegime = computeRegimeTax(client.incomeDetails, client.deductions, 'old', client.capitalGainsTransactions, client.personalInfo.dob, ay);
    const taxNewRegime = computeRegimeTax(client.incomeDetails, client.deductions, 'new', client.capitalGainsTransactions, client.personalInfo.dob, ay);
    return { taxOldRegime, taxNewRegime };
};
