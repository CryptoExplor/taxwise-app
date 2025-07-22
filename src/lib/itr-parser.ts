
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
    if (get(obj, 'ITR.ITR1', null)) return 'ITR-1';
    if (get(obj, 'ITR.ITR2', null)) return 'ITR-2';
    if (get(obj, 'ITR.ITR3', null)) return 'ITR-3';
    if (get(obj, 'ITR.ITR4', null)) return 'ITR-4';
    // Fallback for different structures
    if (get(obj, 'ITR1', null)) return 'ITR-1';
    if (get(obj, 'ITR2', null)) return 'ITR-2';
    if (get(obj, 'ITR3', null)) return 'ITR-3';
    if (get(obj, 'ITR4', null)) return 'ITR-4';
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

  // The actual ITR data is often nested inside one or two top-level keys.
  const jsonData = rawJson.ITR?.ITR4 || rawJson.ITR?.ITR1 || rawJson.ITR?.ITR2 || rawJson.ITR?.ITR3 || rawJson;

  try {
    const firstName = getFromPaths(jsonData, ['PersonalInfo.AssesseeName.FirstName', 'PartA_GEN1.PersonalInfo.AssesseeName.FirstName', 'personalInfo.assesseeName.firstName'], '');
    const middleName = getFromPaths(jsonData, ['PersonalInfo.AssesseeName.MiddleName', 'PartA_GEN1.PersonalInfo.AssesseeName.MiddleName', 'personalInfo.assesseeName.middleName'], '');
    const lastName = getFromPaths(jsonData, ['PersonalInfo.AssesseeName.SurNameOrOrgName', 'PartA_GEN1.PersonalInfo.AssesseeName.SurNameOrOrgName', 'personalInfo.assesseeName.surNameOrOrgName'], '');
    
    let ay = getFromPaths(jsonData, ['Form_ITR4.AssessmentYear', 'ITRForm.AssessmentYear'], null);
    
    if (!ay) {
        const ayEndYear = get(jsonData, 'incDeductionsOthIncCPC.0.itrAy', null) || get(jsonData, 'ITRForm.AssessmentYear', null);
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
        pan: getFromPaths(jsonData, ['PersonalInfo.PAN', 'PartA_GEN1.PersonalInfo.PAN', 'personalInfo.pan'], 'N/A'),
        assessmentYear: ay,
        age: calculateAge(getFromPaths(jsonData, ['PersonalInfo.DOB', 'PartA_GEN1.PersonalInfo.DOB', 'personalInfo.dob'], "")),
        itrForm: detectITRForm(rawJson),
    };
    
    const otherSourcesArray = get(jsonData, 'incomeDeductionsOthersInc', []);
    const interestIncomeFD = otherSourcesArray.find((item: any) => item.othSrcNatureDesc === 'IFD')?.othSrcOthAmount || getFromPaths(jsonData, ['scheduleOS.intrstFrmTermDeposit', 'ScheduleOS.IncomeOthSrc.Sec194AIntBanking'], 0);
    const interestIncomeSaving = otherSourcesArray.find((item: any) => item.othSrcNatureDesc === 'SAV')?.othSrcOthAmount || getFromPaths(jsonData, ['insights.intrstFrmSavingBank', 'ScheduleOS.IncomeOthSrc.InterestFromSavings'], 0);
    const dividendIncome = otherSourcesArray.find((item: any) => item.othSrcNatureDesc === 'DIVIDEND')?.othSrcOthAmount || getFromPaths(jsonData, ['ScheduleOS.IncomeOthSrc.DividendInc', 'PartB_TI.IncomeFromOS.DividendGross'], 0);
    const otherMiscIncome = otherSourcesArray.find((item: any) => item.othSrcNatureDesc === 'OTH')?.othSrcOthAmount || getFromPaths(jsonData, ['ScheduleOS.IncomeOthSrc.OthersInc', 'PartB_TI.IncomeFromOS.OthersGross'], 0);
    
    const incomeDetails = {
      salary: get(jsonData, 'PartB_TI.Salaries', 0),
      houseProperty: get(jsonData, 'PartB_TI.IncomeFromHP', 0),
      businessIncome: get(jsonData, 'PartB_TI.IncomeFromBP', 0),
      capitalGains: {
        shortTerm: get(jsonData, 'ScheduleCG.ShortTermCapGain.TotalShortTermCapGain', 0),
        longTerm: get(jsonData, 'ScheduleCG.LongTermCapGain.TotalLongTermCapGain', 0),
        stcg: { purchase: 0, sale: 0, expenses: 0 },
        ltcg: { purchase: 0, sale: 0, expenses: 0 },
      },
      interestIncomeFD: interestIncomeFD,
      interestIncomeSaving: interestIncomeSaving,
      dividendIncome: dividendIncome,
      otherSources: otherMiscIncome,
      grossTotalIncome: get(jsonData, 'PartB_TI.GrossTotalIncome', 0),
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
      section80C: getFromPaths(jsonData, ['DeductUndChapVIA.Section80C']),
      section80D: getFromPaths(jsonData, ['DeductUndChapVIA.Section80D']),
      interestOnBorrowedCapital: getFromPaths(jsonData, ['ScheduleHP.InterestPayable']),
      section80CCD1B: getFromPaths(jsonData, ['DeductUndChapVIA.Section80CCD_1B']),
      section80CCD2: getFromPaths(jsonData, ['DeductUndChapVIA.Section80CCD_2']),
      section80G: getFromPaths(jsonData, ['DeductUndChapVIA.Section80G']),
      section80TTA: getFromPaths(jsonData, ['DeductUndChapVIA.Section80TTA', 'insights.UsrDeductUndChapVIAType.Section80TTA']),
      section80TTB: getFromPaths(jsonData, ['DeductUndChapVIA.Section80TTB', 'insights.UsrDeductUndChapVIAType.Section80TTB']),
      totalDeductions: get(jsonData, 'PartB_TI.TotalDeductions', 0),
    };

    if (deductions.totalDeductions === 0) {
        deductions.totalDeductions = get(jsonData, 'DeductUndChapVIA.TotalChapVIADeductions',
        Object.values(deductions).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0)
      );
    }
    
    const taxRegime = getFromPaths(jsonData, ['FilingStatus.NewTaxRegime'], 'N') === 'Y' ? 'New' : 'Old';
    
    const standardDeduction = incomeDetails.salary > 0 ? 50000 : 0;
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
      tds: getFromPaths(jsonData, ['TaxPayments.TDS'], totalTdsFrom26AS || (get(jsonData, 'TDSonSalaries.TotalTDSonSalaries', 0) + get(jsonData, 'TDSonOthThanSals.TotalTDSonOthThanSals', 0))),
      advanceTax: getFromPaths(jsonData, ['TaxPayments.AdvanceTax'], get(jsonData, 'TaxPaid.TaxesPaid.AdvanceTax', 0)),
      selfAssessmentTax: getFromPaths(jsonData, ['TaxPayments.SelfAssessmentTax'], get(jsonData, 'TaxPaid.TaxesPaid.SelfAssessmentTax', 0)),
    };
    
    const totalTaxPaid = getFromPaths(jsonData, ['TaxPayments.TotalTaxesPaid'], taxesPaid.tds + taxesPaid.advanceTax + taxesPaid.selfAssessmentTax);

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
