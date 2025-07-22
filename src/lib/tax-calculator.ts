
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

        if (tx.assetType === 'equity_listed' || tx.assetType === 'equity_mf') {
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


export const computeTax = (incomeData: IncomeData, deductions: DeductionData, regime: 'old' | 'new', capitalGainsTransactions: CapitalGainsTransaction[] = []) => {
    let incomeFromSalary = incomeData.salary || 0;
    let incomeFromInterest = incomeData.interestIncome || 0;
    let incomeFromOtherSources = incomeData.otherIncome || 0;
    let incomeFromBusiness = (incomeData.businessIncome || 0) + (incomeData.speculationIncome || 0) + (incomeData.fnoIncome || 0);

    const taxOnCapitalGains = calculateCapitalGainsTax(capitalGainsTransactions);

    let grossTotalIncome = incomeFromSalary + incomeFromInterest + incomeFromOtherSources + incomeFromBusiness;
    let taxableIncome = grossTotalIncome;
    let taxPayable = 0;

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

        if (taxableIncome <= 250000) taxPayable = 0;
        else if (taxableIncome <= 500000) taxPayable = (taxableIncome - 250000) * 0.05;
        else if (taxableIncome <= 1000000) taxPayable = 12500 + (taxableIncome - 500000) * 0.20;
        else taxPayable = 112500 + (taxableIncome - 1000000) * 0.30;
        
        if (grossTotalIncome <= 500000) {
            taxPayable = Math.max(0, taxPayable - 12500);
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

        if (grossTotalIncome <= 700000) {
            taxPayable = Math.max(0, taxPayable - 25000);
        }
    }
    
    taxPayable += taxOnCapitalGains;
    taxPayable += taxPayable * 0.04; // Cess

    return Math.round(taxPayable);
};
