
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
  const formKey = itrForm.startsWith('ITR-') ? `ITR${itrForm.split('-')[1]}` : null;
  const jsonData = formKey ? (rawJson.ITR?.[formKey] || rawJson[formKey] || rawJson.ITR || rawJson) : rawJson;

  try {
    const commonPaths = {
        firstName: ['PersonalInfo.AssesseeName.FirstName', 'PartA_GEN1.PersonalInfo.AssesseeName.FirstName', 'personalInfo.assesseeName.firstName'],
        middleName: ['PersonalInfo.AssesseeName.MiddleName', 'PartA_GEN1.PersonalInfo.AssesseeName.MiddleName', 'personalInfo.assesseeName.middleName'],
        lastName: ['PersonalInfo.AssesseeName.SurNameOrOrgName', 'PartA_GEN1.PersonalInfo.AssesseeName.SurNameOrOrgName', 'personalInfo.assesseeName.surNameOrOrgName', 'assesseeName.surNameOrOrgName'],
        pan: ['PersonalInfo.PAN', 'PartA_GEN1.PersonalInfo.PAN', 'personalInfo.pan', 'pan'],
        dob: ['PersonalInfo.DOB', 'PartA_GEN1.PersonalInfo.DOB', 'personalInfo.dob', 'dob'],
        ay: ['Form_ITR1.AssessmentYear', 'Form_ITR2.AssessmentYear', 'Form_ITR3.AssessmentYear', 'Form_ITR4.AssessmentYear'],
    };

    const firstName = getFromPaths(jsonData, commonPaths.firstName, '');
    const middleName = getFromPaths(jsonData, commonPaths.middleName, '');
    const lastName = getFromPaths(jsonData, commonPaths.lastName, '');
    
    let ay = getFromPaths(jsonData, commonPaths.ay, null);
    
    if (ay && ay.length === 4) { // e.g., "2025" -> "2025-26"
      const startYear = parseInt(ay, 10);
      const endYear = startYear + 1;
      ay = `${startYear}-${endYear.toString().slice(-2)}`;
    } else {
        const ayEndYear = get(jsonData, 'incDeductionsOthIncCPC.0.itrAy', null); // Prefill format
        if (ayEndYear) {
            const startYear = parseInt(ayEndYear, 10) - 1;
            ay = `${startYear}-${ayEndYear.toString().slice(-2)}`;
        } else {
            ay = '2024-25'; // Default fallback
        }
    }


    const personalInfo = {
        name: `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim() || 'N/A',
        pan: getFromPaths(jsonData, commonPaths.pan, 'N/A'),
        assessmentYear: ay,
        age: calculateAge(getFromPaths(jsonData, commonPaths.dob, "")),
        itrForm,
    };
    
    const incomeDetails = {
      salary: getFromPaths(jsonData, ['PartBTI.Salaries', 'PartB_TI.Salaries', 'ScheduleS.TotIncUnderHeadSalaries'], 0),
      houseProperty: getFromPaths(jsonData, ['PartBTI.IncomeFromHP', 'PartB_TI.IncomeFromHP', 'ScheduleHP.TotalIncomeOfHP', 'PartB-TI.IncomeFromHP'], 0),
      businessIncome: getFromPaths(jsonData, ['PartBTI.IncomeFromBP', 'PartB_TI.IncomeFromBP', 'PartA_PL.Total_BP'], 0),
      capitalGains: {
        shortTerm: getFromPaths(jsonData, ['ScheduleCG.ShortTermCapGain.TotalShortTermCapGain', 'PartB-TI.CapGain.ShortTerm.TotalShortTerm'], 0),
        longTerm: getFromPaths(jsonData, ['ScheduleCG.LongTermCapGain.TotalLongTermCapGain', 'PartB-TI.CapGain.LongTerm.TotalLongTerm'], 0),
        stcg: { purchase: 0, sale: 0, expenses: 0 },
        ltcg: { purchase: 0, sale: 0, expenses: 0 },
      },
      interestIncomeFD: getFromPaths(jsonData, ['ScheduleOS.InterestFromDeposits', 'insights.intrstFrmTermDeposit', 'incomeDeductionsOthersInc.0.othSrcOthAmount', 'ScheduleOS.IncOthThanOwnRaceHorse.IntrstFrmTermDeposit'], 0),
      interestIncomeSaving: getFromPaths(jsonData, ['ScheduleOS.InterestFromSavings', 'insights.intrstFrmSavingBank', 'incomeDeductionsOthersInc.1.othSrcOthAmount', 'ScheduleOS.IncOthThanOwnRaceHorse.IntrstFrmSavingBank'], 0),
      dividendIncome: getFromPaths(jsonData, ['ScheduleOS.DividendInc', 'PartB_TI.IncomeFromOS.DividendGross', 'ScheduleOS.IncOthThanOwnRaceHorse.DividendGross'], 0),
      otherSources: getFromPaths(jsonData, ['ScheduleOS.OthersInc', 'PartB_TI.IncomeFromOS.OthersGross', 'incomeDeductionsOthersInc.2.othSrcOthAmount', 'ScheduleOS.IncOthThanOwnRaceHorse.AnyOtherIncome'], 0),
      grossTotalIncome: getFromPaths(jsonData, ['PartBTI.GrossTotalIncome', 'PartB_TI.GrossTotalIncome', 'PartB-TI.GrossTotalIncome'], 0),
    };

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
      section80D: getFromPaths(jsonData, ['DeductUndChapVIA.Section80D', 'ScheduleVIA.Deductions.Sec80D', 'ScheduleVIA.DeductUndChapVIA.Section80D'], 0),
      interestOnBorrowedCapital: getFromPaths(jsonData, ['ScheduleHP.InterestPayable'], 0),
      section80CCD1B: getFromPaths(jsonData, ['DeductUndChapVIA.Section80CCD_1B', 'ScheduleVIA.Deductions.Sec80CCD1B'], 0),
      section80CCD2: getFromPaths(jsonData, ['DeductUndChapVIA.Section80CCD_2', 'ScheduleVIA.Deductions.Sec80CCD2', 'ScheduleVIA.DeductUndChapVIA.Section80CCDEmployer'], 0),
      section80G: getFromPaths(jsonData, ['DeductUndChapVIA.Section80G', 'Schedule80G.TotalDonationAmt', 'ScheduleVIA.DeductUndChapVIA.Section80G'], 0),
      section80TTA: getFromPaths(jsonData, ['DeductUndChapVIA.Section80TTA', 'ScheduleVIA.Deductions.Sec80TTA', 'insights.UsrDeductUndChapVIAType.Section80TTA'], 0),
      section80TTB: getFromPaths(jsonData, ['DeductUndChapVIA.Section80TTB', 'ScheduleVIA.Deductions.Sec80TTB', 'insights.UsrDeductUndChapVIAType.Section80TTB', 'ScheduleVIA.DeductUndChapVIA.Section80TTB'], 0),
      totalDeductions: getFromPaths(jsonData, ['PartBTI.TotalDeductions', 'PartB_TI.TotalDeductions', 'ScheduleVIA.TotalDeductions', 'ScheduleVIA.DeductUndChapVIA.TotalChapVIADeductions'], 0),
    };

    if (deductions.totalDeductions === 0) {
        deductions.totalDeductions = get(jsonData, 'DeductUndChapVIA.TotalChapVIADeductions',
        Object.values(deductions).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0)
      );
    }
    
    const taxRegimeValue = getFromPaths(jsonData, ['FilingStatus.NewTaxRegime', 'PartA_GEN1.PersonalInfo.TaxRegime', 'FilingStatus.OptOutNewTaxRegime'], 'N');
    const taxRegime = taxRegimeValue === 'N' ? 'Old' : 'New';
    
    const standardDeduction = incomeDetails.salary > 0 ? getFromPaths(jsonData, ['ScheduleS.DeductionUnderSection16ia'], Math.min(incomeDetails.salary, 50000)) : 0;
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

    const tdsFromSal = getFromPaths(jsonData, ['ScheduleTDS1.TotalTDSonSalaries'], 0);
    const tdsFromOther = getFromPaths(jsonData, ['ScheduleTDS2.TotalTDSonOthThanSals'], 0);
    const tcs = getFromPaths(jsonData, ['ScheduleTCS.TotalSchTCS'], 0);
    const selfAssessmentTaxPayments = get(jsonData, 'ScheduleIT.TaxPayment', []);
    const selfAssessmentTax = Array.isArray(selfAssessmentTaxPayments) 
        ? selfAssessmentTaxPayments.reduce((acc: number, item: any) => acc + (get(item, 'Amt', 0) || 0), 0) 
        : get(jsonData, 'PartB_TTI.TaxPaid.TaxesPaid.SelfAssessmentTax', 0);

    const tdsTotal = getFromPaths(jsonData, ['TaxPayments.TDS', 'TDS.TotalTDS', 'PartB_TTI.TaxPaid.TaxesPaid.TDS'], tdsFromSal + tdsFromOther);
    
    const taxesPaid = {
      tds: tdsTotal,
      tcs: tcs,
      advanceTax: getFromPaths(jsonData, ['TaxPayments.AdvanceTax', 'TaxPaid.TaxesPaid.AdvanceTax'], 0),
      selfAssessmentTax: selfAssessmentTax,
    };
    
    const totalTaxPaid = getFromPaths(jsonData, ['TaxPaid.TotalTaxesPaid', 'TaxPayments.TotalTaxesPaid', 'PartB_TTI.TaxPaid.TaxesPaid.TotalTaxesPaid'], taxesPaid.tds + taxesPaid.advanceTax + taxesPaid.selfAssessmentTax + taxesPaid.tcs);

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

    