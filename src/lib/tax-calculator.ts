
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
        return { taxOnSpecialRates: 0, stcgAtSlabRates: 0 };
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
             // For simplicity, property/unlisted gains are treated as other gains here.
             // Proper indexation would be needed for a full implementation.
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
    
    // totalOtherSTCG is taxed at slab rates, so it should be added to normal income.
    return { taxOnSpecialRates: Math.round(capitalGainsTax), stcgAtSlabRates: totalOtherSTCG };
};

const calculateSlabTax = (income: number, slabs: { limit: number; rate: number }[]): number => {
    let tax = 0;
    let lastLimit = 0;

    for (const slab of slabs) {
        if (income > lastLimit) {
            const taxableInSlab = Math.min(income, slab.limit) - lastLimit;
            tax += taxableInSlab * slab.rate;
        }
        lastLimit = slab.limit;
        if (income <= slab.limit) break;
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

    const { taxOnSpecialRates, stcgAtSlabRates } = calculateCapitalGainsTax(capitalGainsTransactions, assessmentYear);

    // Sum up income heads, excluding the special-rate capital gains which are taxed separately.
    const incomeFromHeads = (incomeData.salary || 0) + 
                            (incomeData.houseProperty || 0) +
                            (incomeData.businessIncome || 0) +
                            (incomeData.otherSources || 0) +
                            stcgAtSlabRates; // Add STCG taxed at slab rates to the main income pool

    let taxableIncomeForSlabs = incomeFromHeads;

    let age = 30; // Default age if DOB is not provided
    if (dob) {
        try {
            const birthDate = new Date(dob);
            // Financial year ends on March 31st of the first year in the AY string (e.g., for AY 2025-26, FY ends March 31, 2025)
            const ayEndYear = parseInt(assessmentYear.split('-')[0], 10);
            const financialYearEndDate = new Date(ayEndYear, 2, 31); // Month is 0-indexed, so 2 is March
            age = financialYearEndDate.getFullYear() - birthDate.getFullYear();
            const monthDiff = financialYearEndDate.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && financialYearEndDate.getDate() < birthDate.getDate())) {
                age--;
            }
        } catch(e) {
            console.error("Invalid date of birth provided:", dob);
        }
    }

    if (incomeData.salary > 0 && regime === 'new') { // Standard deduction for new regime
        taxableIncomeForSlabs = Math.max(0, taxableIncomeForSlabs - 50000);
    }

    if (regime === 'old') {
        let totalDeductions = 0;
        if (incomeData.salary > 0) {
             taxableIncomeForSlabs = Math.max(0, taxableIncomeForSlabs - 50000); // Standard deduction for old regime
        }
        // Summing up all deductions from the deductions object for the old regime
        totalDeductions = Object.values(deductionsData).reduce((sum, val) => sum + (val || 0), 0);
        taxableIncomeForSlabs = Math.max(0, taxableIncomeForSlabs - totalDeductions);
    }
    
    taxableIncomeForSlabs = Math.max(0, taxableIncomeForSlabs);

    let slabsToUse;
    if (regime === 'old') {
        if (age >= 80 && rules.superSeniorSlabs) slabsToUse = rules.superSeniorSlabs;
        else if (age >= 60 && rules.seniorSlabs) slabsToUse = rules.seniorSlabs;
        else slabsToUse = rules.slabs;
    } else {
        slabsToUse = rules.slabs; // New regime has same slabs for all ages
    }

    let taxOnSlabIncome = calculateSlabTax(taxableIncomeForSlabs, slabsToUse);

    // Apply Rebate u/s 87A on the tax on slab income
    const totalTaxableIncomeForRebate = taxableIncomeForSlabs;
    if (totalTaxableIncomeForRebate <= rules.rebate87A.limit) {
        taxOnSlabIncome = Math.max(0, taxOnSlabIncome - rules.rebate87A.maxRebate);
    }
    
    let totalTaxBeforeCess = taxOnSlabIncome + taxOnSpecialRates;

    // Surcharge logic would be added here if needed

    const cess = totalTaxBeforeCess * rules.cessRate;
    
    return Math.round(totalTaxBeforeCess + cess);
};

export const computeTax = (client: ClientData): { taxOldRegime: number, taxNewRegime: number } => {
    const ay = client.assessmentYear || '2025-26';
    const taxOldRegime = computeRegimeTax(client.incomeDetails, client.deductions, 'old', client.capitalGainsTransactions, client.personalInfo.dob, ay);
    const taxNewRegime = computeRegimeTax(client.incomeDetails, client.deductions, 'new', client.capitalGainsTransactions, client.personalInfo.dob, ay);
    return { taxOldRegime, taxNewRegime };
};
