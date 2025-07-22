
import type { IncomeData, DeductionData, CapitalGainsTransaction } from './types';

export const calculateCapitalGainsTax = (transactions: CapitalGainsTransaction[] = []) => {
    let totalSTCG111A = 0; 
    let totalLTCG112A = 0; 
    let totalOtherSTCG = 0;
    let totalOtherLTCG = 0; 

    let capitalGainsTax = 0;

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

    // STCG under Section 111A: 20% (for AY 2025-26)
    capitalGainsTax += totalSTCG111A * 0.20;

    // LTCG under Section 112A: 12.5% on gains over ₹1.25 lakh
    const taxableLTCG112A = Math.max(0, totalLTCG112A - 125000);
    capitalGainsTax += taxableLTCG112A * 0.125;

    // Other LTCG: 12.5% without indexation (simplified)
    capitalGainsTax += totalOtherLTCG * 0.125;
    
    // Note: totalOtherSTCG is taxed at slab rates, so it's not added to capitalGainsTax here.
    // It should be added to the normal income for slab calculation. This function only returns the tax on special rate gains.

    return Math.round(capitalGainsTax);
};

export const computeTax = (incomeData: IncomeData, deductions: DeductionData, regime: 'old' | 'new', capitalGainsTransactions: CapitalGainsTransaction[] = [], dob: string | null = null): number => {
    let incomeFromSalary = incomeData.salary || 0;
    let incomeFromInterest = incomeData.interestIncome || 0;
    let incomeFromOtherSources = incomeData.otherIncome || 0;
    let incomeFromBusiness = (incomeData.businessIncome || 0) + (incomeData.speculationIncome || 0) + (incomeData.fnoIncome || 0);

    const taxOnCapitalGains = calculateCapitalGainsTax(capitalGainsTransactions);

    let grossTotalIncome = incomeFromSalary + incomeFromInterest + incomeFromOtherSources + incomeFromBusiness;
    let taxableIncome = grossTotalIncome;
    let taxPayable = 0;

    let age = 30; // Default age
    if (dob) {
        try {
            const birthDate = new Date(dob);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
            }
            age = calculatedAge;
        } catch (e) {
            console.error("Invalid DOB format", e);
        }
    }

    const standardDeduction = 50000;
    if (incomeFromSalary > 0) {
        taxableIncome -= standardDeduction;
    }

    if (regime === 'old') {
        let totalDeductions = 0;
        totalDeductions += Math.min(deductions.section80C || 0, 150000);
        totalDeductions += deductions.section80D || 0;
        totalDeductions += Math.min(deductions.section80TTA || 0, 10000);
        totalDeductions += Math.min(deductions.section80TTB || 0, 50000);
        totalDeductions += deductions.section24B || 0;
        totalDeductions += deductions.section80CCD1B || 0;
        totalDeductions += deductions.section80CCD2 || 0;
        totalDeductions += deductions.section80G || 0;

        taxableIncome -= totalDeductions;
        taxableIncome = Math.max(0, taxableIncome);
        
        // Old Regime Slabs based on age
        if (age >= 80) { // Super Senior Citizen
            if (taxableIncome > 1000000) taxPayable = 100000 + (taxableIncome - 1000000) * 0.30;
            else if (taxableIncome > 500000) taxPayable = (taxableIncome - 500000) * 0.20;
            else taxPayable = 0;
        } else if (age >= 60) { // Senior Citizen
            if (taxableIncome > 1000000) taxPayable = 110000 + (taxableIncome - 1000000) * 0.30;
            else if (taxableIncome > 500000) taxPayable = 10000 + (taxableIncome - 300000) * 0.20;
            else taxPayable = 0;
        } else { // Below 60
            if (taxableIncome > 1000000) taxPayable = 112500 + (taxableIncome - 1000000) * 0.30;
            else if (taxableIncome > 500000) taxPayable = 12500 + (taxableIncome - 500000) * 0.20;
            else if (taxableIncome > 250000) taxPayable = (taxableIncome - 250000) * 0.05;
            else taxPayable = 0;
        }

        if (taxableIncome <= 500000) {
            taxPayable = 0; // Rebate u/s 87A makes it zero
        }

    } else { // New Regime
        taxableIncome -= (deductions.section80CCD2 || 0);
        taxableIncome = Math.max(0, taxableIncome);
        
        if (taxableIncome <= 300000) taxPayable = 0;
        else if (taxableIncome <= 600000) taxPayable = (taxableIncome - 300000) * 0.05;
        else if (taxableIncome <= 900000) taxPayable = 15000 + (taxableIncome - 600000) * 0.10;
        else if (taxableIncome <= 1200000) taxPayable = 45000 + (taxableIncome - 900000) * 0.15;
        else if (taxableIncome <= 1500000) taxPayable = 90000 + (taxableIncome - 1200000) * 0.20;
        else taxPayable = 150000 + (taxableIncome - 1500000) * 0.30;

        if (taxableIncome <= 700000) {
             taxPayable = 0; // Rebate u/s 87A
        }
    }
    
    taxPayable += taxOnCapitalGains;

    let totalTaxBeforeCess = taxPayable;
    
    // Surcharge
    let surcharge = 0;
    if (grossTotalIncome > 5000000) {
        if (grossTotalIncome <= 10000000) surcharge = totalTaxBeforeCess * 0.10;
        else if (grossTotalIncome <= 20000000) surcharge = totalTaxBeforeCess * 0.15;
        else if (grossTotalIncome <= 50000000) surcharge = totalTaxBeforeCess * 0.25;
        else surcharge = totalTaxBeforeCess * 0.37;
        
        // Simplified Marginal Relief
        const taxOnThreshold = computeTax(
            {...incomeData, salary: 5000000 - (grossTotalIncome - incomeData.salary)}, 
            deductions, regime, capitalGainsTransactions, dob
        );
        const incomeExceeding = grossTotalIncome - 5000000;
        if ((totalTaxBeforeCess + surcharge) > (taxOnThreshold + incomeExceeding)) {
            surcharge = (taxOnThreshold + incomeExceeding) - totalTaxBeforeCess;
        }
    }
    
    totalTaxBeforeCess += surcharge;
    
    const cess = totalTaxBeforeCess * 0.04;
    
    return Math.round(totalTaxBeforeCess + cess);
};
