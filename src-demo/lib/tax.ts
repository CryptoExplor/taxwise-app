import type { Income, Deductions, CapitalGainsTransaction } from '@/types';

/**
 * Calculates capital gains tax for a list of capital gain transactions.
 * @param {Array<Object>} transactions - Array of capital gain transaction objects.
 * @returns {number} Total capital gains tax.
 */
export const calculateCapitalGainsTax = (transactions: CapitalGainsTransaction[] = []): number => {
    let totalSTCG111A = 0; // STCG on listed equity/equity MFs (STT paid)
    let totalLTCG112A = 0; // LTCG on listed equity/equity MFs (STT paid)
    let totalOtherSTCG = 0; // Other STCG (taxed at slab rates)
    let totalOtherLTCG = 0; // Other LTCG (taxed at 12.5% without indexation, or 20% with indexation for specific assets)

    let capitalGainsTax = 0;

    transactions.forEach(tx => {
        if (!tx.purchaseDate || !tx.saleDate) return;
        const purchaseDate = new Date(tx.purchaseDate);
        const saleDate = new Date(tx.saleDate);
        const holdingPeriodMs = saleDate.getTime() - purchaseDate.getTime();
        const holdingPeriodDays = holdingPeriodMs / (1000 * 60 * 60 * 24);

        let costOfAcquisition = tx.purchasePrice;
        // Grandfathering rule for assets acquired before Jan 31, 2018
        if (purchaseDate < new Date('2018-01-31') && tx.fmv2018 !== undefined && tx.fmv2018 !== null) {
            costOfAcquisition = Math.max(tx.purchasePrice, tx.fmv2018);
        }

        const gain = tx.salePrice - costOfAcquisition - (tx.expenses || 0);

        if (gain <= 0) {
            // Handle capital losses (simplified: not yet fully implemented set-off/carry-forward)
            return;
        }

        // Determine STCG/LTCG based on asset type and holding period
        if (tx.assetType === 'equity_listed' || tx.assetType === 'equity_mf') {
            if (holdingPeriodDays <= 365) { // 12 months for listed equity/MF
                totalSTCG111A += gain;
            } else {
                totalLTCG112A += gain;
            }
        } else if (tx.assetType === 'property' || tx.assetType === 'unlisted_shares') {
            if (holdingPeriodDays <= 730) { // 24 months for property/unlisted shares
                totalOtherSTCG += gain;
            } else {
                totalOtherLTCG += gain; // Taxed at 12.5% without indexation (simplified for now)
            }
        } else {
            // Default to other STCG/LTCG if asset type is not specific
            if (holdingPeriodDays <= 365) { // Default 12 months for other assets
                totalOtherSTCG += gain;
            } else {
                totalOtherLTCG += gain;
            }
        }
    });

    // Apply specific tax rates for capital gains
    // STCG under Section 111A: 20% (new rate for AY 2025-26)
    capitalGainsTax += totalSTCG111A * 0.20;

    // LTCG under Section 112A: 12.5% on gains exceeding ₹1.25 lakh
    const taxableLTCG112A = Math.max(0, totalLTCG112A - 125000);
    capitalGainsTax += taxableLTCG112A * 0.125;

    // Other LTCG (e.g., property, unlisted shares): 12.5% without indexation (simplified)
    // For property acquired before July 23, 2024, user might choose 20% with indexation.
    // This simplified version assumes 12.5% without indexation for all other LTCG.
    capitalGainsTax += totalOtherLTCG * 0.125;

    return Math.round(capitalGainsTax);
};

export const computeTax = (incomeData: Income, deductions: Deductions, regime: 'old' | 'new', capitalGainsTransactions: CapitalGainsTransaction[] = [], dob: string | null = null): number => {
    let incomeFromSalary = incomeData.salary || 0;
    let incomeFromInterest = incomeData.interestIncome || 0;
    let incomeFromOtherSources = incomeData.otherIncome || 0;
    let incomeFromBusiness = (incomeData.businessIncome || 0) + (incomeData.speculationIncome || 0) + (incomeData.fnoIncome || 0);

    // Calculate tax on capital gains separately
    const taxOnCapitalGains = calculateCapitalGainsTax(capitalGainsTransactions);

    let grossTotalIncome = incomeFromSalary + incomeFromInterest + incomeFromOtherSources + incomeFromBusiness;
    let taxableIncome = grossTotalIncome;
    let taxPayable = 0;

    // Determine age for age-based slabs
    let age = 0;
    if (dob) {
        const birthDate = new Date(dob);
        const assessmentYearEnd = new Date('2025-03-31'); // End of FY 2024-25 for AY 2025-26
        age = assessmentYearEnd.getFullYear() - birthDate.getFullYear();
        const m = assessmentYearEnd.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && assessmentYearEnd.getDate() < birthDate.getDate())) {
            age--;
        }
    }

    // Apply standard deduction for salaried/pensioners
    const standardDeduction = 50000;
    if (incomeFromSalary > 0) {
        taxableIncome -= standardDeduction;
    }

    // Apply other deductions based on regime
    if (regime === 'old') {
        let totalDeductions = 0;
        totalDeductions += Math.min(deductions.section80C || 0, 150000);
        totalDeductions += deductions.section80D || 0;
        totalDeductions += Math.min(deductions.section80TTA || 0, 10000);
        totalDeductions += Math.min(deductions.section80TTB || 0, 50000); // Max 50k for senior citizens
        totalDeductions += deductions.section24B || 0;
        totalDeductions += deductions.section80CCD1B || 0;
        totalDeductions += deductions.section80CCD2 || 0;
        totalDeductions += deductions.section80G || 0;

        taxableIncome -= totalDeductions;
        taxableIncome = Math.max(0, taxableIncome);

        // Old Regime Slabs (AY 2025-26)
        if (age < 60) { // Individuals < 60
            if (taxableIncome <= 250000) {
                taxPayable = 0;
            } else if (taxableIncome <= 500000) {
                taxPayable = (taxableIncome - 250000) * 0.05;
            } else if (taxableIncome <= 1000000) {
                taxPayable = 12500 + (taxableIncome - 500000) * 0.20;
            } else {
                taxPayable = 112500 + (taxableIncome - 1000000) * 0.30;
            }
        } else if (age >= 60 && age < 80) { // Senior Citizens (60 to < 80)
            if (taxableIncome <= 300000) {
                taxPayable = 0;
            } else if (taxableIncome <= 500000) {
                taxPayable = (taxableIncome - 300000) * 0.05;
            } else if (taxableIncome <= 1000000) {
                taxPayable = 10000 + (taxableIncome - 500000) * 0.20;
            } else {
                taxPayable = 110000 + (taxableIncome - 1000000) * 0.30;
            }
        } else { // Super Senior Citizens (>= 80)
            if (taxableIncome <= 500000) {
                taxPayable = 0;
            } else if (taxableIncome <= 1000000) {
                taxPayable = (taxableIncome - 500000) * 0.20;
            } else {
                taxPayable = 100000 + (taxableIncome - 1000000) * 0.30;
            }
        }

        // Rebate under Section 87A (Old Regime)
        if (grossTotalIncome <= 500000) {
            taxPayable = Math.max(0, taxPayable - 12500);
        }

    } else { // New Regime
        // Only standard deduction (already applied) and 80CCD(2) allowed
        taxableIncome -= (deductions.section80CCD2 || 0);
        taxableIncome = Math.max(0, taxableIncome);

        // New Regime Slabs (for AY 2025-26)
        if (taxableIncome <= 300000) {
            taxPayable = 0;
        } else if (taxableIncome <= 700000) {
            taxPayable = (taxableIncome - 300000) * 0.05;
        } else if (taxableIncome <= 1000000) {
            taxPayable = 20000 + (taxableIncome - 700000) * 0.10;
        } else if (taxableIncome <= 1200000) {
            taxPayable = 50000 + (taxableIncome - 1000000) * 0.15;
        } else if (taxableIncome <= 1500000) {
            taxPayable = 80000 + (taxableIncome - 1200000) * 0.20;
        } else {
            taxPayable = 140000 + (taxableIncome - 1500000) * 0.30;
        }

        // Rebate under Section 87A (New Regime)
        if (grossTotalIncome <= 700000) {
            taxPayable = Math.max(0, taxPayable - 25000);
        }
    }

    // Add tax on capital gains (calculated separately)
    taxPayable += taxOnCapitalGains;

    // Surcharge and Marginal Relief
    let surcharge = 0;
    const incomeTaxBeforeSurcharge = taxPayable;

    if (grossTotalIncome > 5000000) {
        if (grossTotalIncome <= 10000000) { // 50L to 1Cr
            surcharge = incomeTaxBeforeSurcharge * 0.10;
            const taxAtThreshold = computeTax({ ...incomeData, salary: 5000000 - (grossTotalIncome - incomeData.salary) }, deductions, regime, capitalGainsTransactions, dob);
            const marginalRelief = (incomeTaxBeforeSurcharge + surcharge) - (taxAtThreshold + (grossTotalIncome - 5000000));
            if (marginalRelief > 0) {
                surcharge -= marginalRelief;
            }
        } else if (grossTotalIncome <= 20000000) { // 1Cr to 2Cr
            surcharge = incomeTaxBeforeSurcharge * 0.15;
            const taxAtThreshold = computeTax({ ...incomeData, salary: 10000000 - (grossTotalIncome - incomeData.salary) }, deductions, regime, capitalGainsTransactions, dob);
            const marginalRelief = (incomeTaxBeforeSurcharge + surcharge) - (taxAtThreshold + (grossTotalIncome - 10000000));
            if (marginalRelief > 0) {
                surcharge -= marginalRelief;
            }
        } else if (grossTotalIncome <= 50000000) { // 2Cr to 5Cr
            surcharge = incomeTaxBeforeSurcharge * 0.25;
            const taxAtThreshold = computeTax({ ...incomeData, salary: 20000000 - (grossTotalIncome - incomeData.salary) }, deductions, regime, capitalGainsTransactions, dob);
            const marginalRelief = (incomeTaxBeforeSurcharge + surcharge) - (taxAtThreshold + (grossTotalIncome - 20000000));
            if (marginalRelief > 0) {
                surcharge -= marginalRelief;
            }
        } else { // Above 5Cr
            surcharge = incomeTaxBeforeSurcharge * 0.37;
            const taxAtThreshold = computeTax({ ...incomeData, salary: 50000000 - (grossTotalIncome - incomeData.salary) }, deductions, regime, capitalGainsTransactions, dob);
            const marginalRelief = (incomeTaxBeforeSurcharge + surcharge) - (taxAtThreshold + (grossTotalIncome - 50000000));
            if (marginalRelief > 0) {
                surcharge -= marginalRelief;
            }
        }
    }
    taxPayable += surcharge;

    // Health and Education Cess (4%)
    taxPayable += taxPayable * 0.04;

    return Math.round(taxPayable);
};
