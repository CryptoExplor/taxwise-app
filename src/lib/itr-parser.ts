
import type { ClientDataToSave } from './types';
import { calculateAge, computeTax } from './tax-calculator';

// Helper to safely access nested properties.
const get = (obj: any, path: string, defaultValue: any = 0) => {
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result === undefined || result === null) return defaultValue;
    result = result[key];
  }
  return result === undefined || result === null ? defaultValue : result;
};

// Helper to try multiple paths and return the first valid value.
const getFromPaths = (obj: any, paths: string[], defaultValue: any = 0) => {
    for (const path of paths) {
        const value = get(obj, path, null);
        if (value !== null && value !== undefined) {
            return value;
        }
    }
    return defaultValue;
};

// Helper to detect ITR form type
const detectITRForm = (obj: any): string => {
    if (get(obj, 'ITR.ITR1', null) || get(obj, 'ITR1', null)) return 'ITR-1';
    if (get(obj, 'ITR.ITR2', null) || get(obj, 'ITR2', null)) return 'ITR-2';
    if (get(obj, 'ITR.ITR3', null) || get(obj, 'ITR3', null)) return 'ITR-3';
    if (get(obj, 'ITR.ITR4', null) || get(obj, 'ITR4', null)) return 'ITR-4';
    // Fallback for prefill data structure
    if (get(obj, 'personalInfo', null)) return 'Prefill';
    return 'Unknown';
};


/**
 * Parses various ITR JSON formats and computes a standardized summary.
 * @param {File} file - The uploaded JSON file.
 * @returns {Promise<ClientDataToSave>} A structured client data object ready to be saved.
 */
export async function parseITR(file: File): Promise<ClientDataToSave> {
  const fileContent = await file.text();
  const rawJson = JSON.parse(fileContent);

  const itrForm = detectITRForm(rawJson);

  // The actual ITR data is often nested inside one or two top-level keys.
  const jsonData = rawJson.ITR?.[`ITR${itrForm.split('-')[1]}`] || rawJson.ITR || rawJson;

  try {
    const commonPaths = {
        firstName: ['PersonalInfo.AssesseeName.FirstName', 'PartA_GEN1.PersonalInfo.AssesseeName.FirstName', 'personalInfo.assesseeName.firstName'],
        middleName: ['PersonalInfo.AssesseeName.MiddleName', 'PartA_GEN1.PersonalInfo.AssesseeName.MiddleName', 'personalInfo.assesseeName.middleName'],
        lastName: ['PersonalInfo.AssesseeName.SurNameOrOrgName', 'PartA_GEN1.PersonalInfo.AssesseeName.SurNameOrOrgName', 'personalInfo.assesseeName.surNameOrOrgName', 'assesseeName.surNameOrOrgName'],
        pan: ['PersonalInfo.PAN', 'PartA_GEN1.PersonalInfo.PAN', 'personalInfo.pan', 'pan'],
        dob: ['PersonalInfo.DOB', 'PartA_GEN1.PersonalInfo.DOB', 'personalInfo.dob', 'dob'],
        ay: ['Form_ITR4.AssessmentYear', 'ITRForm.AssessmentYear', 'Form_ITR1.AssessmentYear', 'Form_ITR2.AssessmentYear', 'Form_ITR3.AssessmentYear'],
    };

    const firstName = getFromPaths(jsonData, commonPaths.firstName, '');
    const middleName = getFromPaths(jsonData, commonPaths.middleName, '');
    const lastName = getFromPaths(jsonData, commonPaths.lastName, '');
    
    let ay = getFromPaths(jsonData, commonPaths.ay, null);
    
    if (!ay) {
        const ayEndYear = get(jsonData, 'incDeductionsOthIncCPC.0.itrAy', null);
        if(ayEndYear) {
            const startYear = parseInt(ayEndYear, 10) - 1;
            const endYear = parseInt(ayEndYear, 10).toString().slice(-2);
            ay = `${startYear}-${endYear}`;
        } else {
            ay = '2024-25'; // Default fallback
        }
    } else if (ay.length === 4) {
      const nextYear = (parseInt(ay, 10) + 1).toString().slice(-2);
      ay = `${ay}-${nextYear}`;
    }

    const personalInfo = {
        name: `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim() || 'N/A',
        pan: getFromPaths(jsonData, commonPaths.pan, 'N/A'),
        assessmentYear: ay,
        age: calculateAge(getFromPaths(jsonData, commonPaths.dob, "")),
        itrForm,
    };
    
    // Form specific paths
    const incomeDetails = {
      salary: getFromPaths(jsonData, ['PartBTI.Salaries', 'PartB_TI.Salaries'], 0),
      houseProperty: getFromPaths(jsonData, ['PartBTI.IncomeFromHP', 'PartB_TI.IncomeFromHP', 'ScheduleHP.TotalIncomeOfHP'], 0),
      businessIncome: getFromPaths(jsonData, ['PartBTI.IncomeFromBP', 'PartB_TI.IncomeFromBP', 'PartA_PL.Total_BP'], 0),
      capitalGains: {
        shortTerm: getFromPaths(jsonData, ['ScheduleCG.ShortTermCapGain.TotalShortTermCapGain'], 0),
        longTerm: getFromPaths(jsonData, ['ScheduleCG.LongTermCapGain.TotalLongTermCapGain'], 0),
        stcg: { purchase: 0, sale: 0, expenses: 0 },
        ltcg: { purchase: 0, sale: 0, expenses: 0 },
      },
      interestIncomeFD: getFromPaths(jsonData, ['ScheduleOS.InterestFromDeposits', 'insights.intrstFrmTermDeposit', 'incomeDeductionsOthersInc.0.othSrcOthAmount']),
      interestIncomeSaving: getFromPaths(jsonData, ['ScheduleOS.InterestFromSavings', 'insights.intrstFrmSavingBank', 'incomeDeductionsOthersInc.1.othSrcOthAmount']),
      dividendIncome: getFromPaths(jsonData, ['ScheduleOS.DividendInc', 'PartB_TI.IncomeFromOS.DividendGross']),
      otherSources: getFromPaths(jsonData, ['ScheduleOS.OthersInc', 'PartB_TI.IncomeFromOS.OthersGross', 'incomeDeductionsOthersInc.2.othSrcOthAmount']),
      grossTotalIncome: getFromPaths(jsonData, ['PartBTI.GrossTotalIncome', 'PartB_TI.GrossTotalIncome'], 0),
    };

    // Gross Total Income is sometimes at a different path or needs calculation
    if (incomeDetails.grossTotalIncome === 0) {
        incomeDetails.grossTotalIncome = get(jsonData, 'GrossTotIncome',
            incomeDetails.salary +
            incomeDetails.houseProperty +
            incomeDetails.businessIncome +
            incomeDetails.capitalGains.shortTerm +
            incomeDetails.capitalGains.longTerm +
            (incomeDetails.interestIncomeFD || 0) +
            (incomeDetails.interestIncomeSaving || 0) +
            (incomeDetails.dividendIncome || 0) +
            incomeDetails.otherSources
        );
    }
    
    const deductions = {
      section80C: getFromPaths(jsonData, ['DeductUndChapVIA.Section80C', 'ScheduleVIA.Deductions.Sec80C'], 0),
      section80D: getFromPaths(jsonData, ['DeductUndChapVIA.Section80D', 'ScheduleVIA.Deductions.Sec80D'], 0),
      interestOnBorrowedCapital: getFromPaths(jsonData, ['ScheduleHP.InterestPayable'], 0),
      section80CCD1B: getFromPaths(jsonData, ['DeductUndChapVIA.Section80CCD_1B', 'ScheduleVIA.Deductions.Sec80CCD1B'], 0),
      section80CCD2: getFromPaths(jsonData, ['DeductUndChapVIA.Section80CCD_2', 'ScheduleVIA.Deductions.Sec80CCD2'], 0),
      section80G: getFromPaths(jsonData, ['DeductUndChapVIA.Section80G', 'Schedule80G.TotalDonationAmt'], 0),
      section80TTA: getFromPaths(jsonData, ['DeductUndChapVIA.Section80TTA', 'ScheduleVIA.Deductions.Sec80TTA', 'insights.UsrDeductUndChapVIAType.Section80TTA'], 0),
      section80TTB: getFromPaths(jsonData, ['DeductUndChapVIA.Section80TTB', 'ScheduleVIA.Deductions.Sec80TTB', 'insights.UsrDeductUndChapVIAType.Section80TTB'], 0),
      totalDeductions: getFromPaths(jsonData, ['PartBTI.TotalDeductions', 'PartB_TI.TotalDeductions', 'ScheduleVIA.TotalDeductions'], 0),
    };

    if (deductions.totalDeductions === 0) {
        deductions.totalDeductions = get(jsonData, 'DeductUndChapVIA.TotalChapVIADeductions',
        Object.values(deductions).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0)
      );
    }
    
    const taxRegime = getFromPaths(jsonData, ['FilingStatus.NewTaxRegime', 'PARTA_GEN1.PersonalInfo.TaxRegime'], 'N') === 'Y' ? 'New' : 'Old';
    
    const standardDeduction = incomeDetails.salary > 0 ? Math.min(incomeDetails.salary, 50000) : 0;
    const oldRegimeTaxableIncome = Math.max(0, incomeDetails.grossTotalIncome - deductions.totalDeductions - standardDeduction);
    const newRegimeTaxableIncome = Math.max(0, incomeDetails.grossTotalIncome - standardDeduction);

    const oldRegimeResult = computeTax(oldRegimeTaxableIncome, personalInfo.age, 'Old', personalInfo.assessmentYear, incomeDetails, deductions.totalDeductions);
    const newRegimeResult = computeTax(newRegimeTaxableIncome, personalInfo.age, 'New', personalInfo.assessmentYear, incomeDetails, 0);
    
    const taxComparison = {
      oldRegime: oldRegimeResult,
      newRegime: newRegimeResult,
    };

    const taxComputationResult = taxRegime === 'Old' ? oldRegimeResult : newRegimeResult;
    const taxableIncome = taxRegime === 'Old' ? oldRegimeTaxableIncome : newRegimeTaxableIncome;

    const tdsArray = get(jsonData, 'form26as.tdsOnOthThanSals.tdSonOthThanSal', []);
    const totalTdsFrom26AS = tdsArray.reduce((acc: number, item: any) => acc + (get(item, 'taxDeductCreditDtls.taxClaimedOwnHands', 0) || 0), 0);
    
    const taxesPaid = {
      tds: getFromPaths(jsonData, ['TaxPayments.TDS', 'TDS.TotalTDS'], totalTdsFrom26AS || (get(jsonData, 'TDSonSalaries.TotalTDSonSalaries', 0) + get(jsonData, 'TDSonOthThanSals.TotalTDSonOthThanSals', 0))),
      advanceTax: getFromPaths(jsonData, ['TaxPayments.AdvanceTax', 'TaxPaid.TaxesPaid.AdvanceTax'], 0),
      selfAssessmentTax: getFromPaths(jsonData, ['TaxPayments.SelfAssessmentTax', 'TaxPaid.TaxesPaid.SelfAssessmentTax'], 0),
    };
    
    const totalTaxPaid = getFromPaths(jsonData, ['TaxPaid.TotalTaxesPaid', 'TaxPayments.TotalTaxesPaid'], taxesPaid.tds + taxesPaid.advanceTax + taxesPaid.selfAssessmentTax);

    const finalAmount = taxComputationResult.totalTaxLiability - totalTaxPaid;

    return {
      fileName: file.name,
      createdAt: new Date(),
      personalInfo,
      incomeDetails,
      deductions,
      taxesPaid: {
        ...taxesPaid,
        totalTaxPaid: totalTaxPaid
      },
      taxRegime: taxRegime,
      taxComputation: {
        ...taxComputationResult,
        taxableIncome: taxableIncome,
        netTaxPayable: Math.max(0, finalAmount),
        refund: Math.max(0, -finalAmount),
      },
      taxComparison, // Add the comparison object
      aiSummary: '', // Initialize empty
      aiTips: [], // Initialize empty
    };
  } catch (error) {
    console.error("Error parsing ITR JSON:", error);
    throw new Error('Failed to parse ITR JSON. The file might be invalid or in an unsupported format.');
  }
}
