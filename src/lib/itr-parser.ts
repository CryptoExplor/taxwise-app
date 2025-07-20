
import type { ClientData, TaxesPaid, PersonalInfo, Deductions, IncomeDetails } from './types';
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

/**
 * Parses various ITR JSON formats and computes a standardized summary.
 * @param {File} file - The uploaded JSON file.
 * @returns {Promise<Omit<ClientData, 'id' | 'aiSummary' | 'aiTips'>>} A structured client data object.
 */
export async function parseITR(file: File): Promise<Omit<ClientData, 'id' | 'aiSummary' | 'aiTips'>> {
  const fileContent = await file.text();
  const rawJson = JSON.parse(fileContent);

  // The actual ITR data is often nested inside one or two top-level keys.
  const jsonData = rawJson.ITR?.ITR4 || rawJson.ITR?.ITR1 || rawJson;

  try {
    const firstName = getFromPaths(jsonData, ['PersonalInfo.AssesseeName.FirstName', 'PartA_GEN1.PersonalInfo.AssesseeName.FirstName'], '');
    const middleName = getFromPaths(jsonData, ['PersonalInfo.AssesseeName.MiddleName', 'PartA_GEN1.PersonalInfo.AssesseeName.MiddleName'], '');
    const lastName = getFromPaths(jsonData, ['PersonalInfo.AssesseeName.SurNameOrOrgName', 'PartA_GEN1.PersonalInfo.AssesseeName.SurNameOrOrgName'], '');
    
    let ay = getFromPaths(jsonData, ['Form_ITR4.AssessmentYear', 'ITRForm.AssessmentYear'], '2024');
    if (ay.length === 4) {
      const nextYear = (parseInt(ay, 10) + 1).toString().slice(-2);
      ay = `${ay}-${nextYear}`;
    }

    const personalInfo: PersonalInfo = {
        name: `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim() || 'N/A',
        pan: getFromPaths(jsonData, ['PersonalInfo.PAN', 'PartA_GEN1.PersonalInfo.PAN'], 'N/A'),
        assessmentYear: ay,
        age: calculateAge(getFromPaths(jsonData, ['PersonalInfo.DOB', 'PartA_GEN1.PersonalInfo.DOB'], "")),
    };
    
    // For ITR-4, income is under ScheduleBP. For ITR-1, it's under PartB_TI.
    const incomeDetails: IncomeDetails = {
      salary: getFromPaths(jsonData, ['IncomeFromSal', 'PartB_TI.Salaries'], 0),
      houseProperty: getFromPaths(jsonData, ['TotalIncomeOfHP', 'PartB_TI.IncomeFromHP'], 0),
      businessIncome: getFromPaths(jsonData, ['ScheduleBP.IncChargeableUnderBus', 'IncomeFromBusinessProf', 'PartB_TI.IncomeFromBP'], 0),
      capitalGains: {
        shortTerm: getFromPaths(jsonData, ['ScheduleCG.ShortTermCapGain.TotalShortTermCapGain'], 0),
        longTerm: getFromPaths(jsonData, ['ScheduleCG.LongTermCapGain.TotalLongTermCapGain'], 0),
      },
      otherSources: getFromPaths(jsonData, ['IncomeOthSrc', 'PartB_TI.IncomeFromOS'], 0),
      grossTotalIncome: getFromPaths(jsonData, ['GrossTotIncome', 'PartB_TI.GrossTotalIncome'], 0),
    };
    
    const deductions: Deductions = {
      section80C: getFromPaths(jsonData, ['DeductUndChapVIA.Section80C', 'UsrDeductUndChapVIA.Section80C'], 0),
      section80D: getFromPaths(jsonData, ['DeductUndChapVIA.Section80D', 'UsrDeductUndChapVIA.Section80D'], 0),
      totalDeductions: getFromPaths(jsonData, ['DeductUndChapVIA.TotalChapVIADeductions', 'UsrDeductUndChapVIA.TotalChapVIADeductions', 'PartB_TI.TotalDeductions'], 0),
    };
    
    const taxRegime = getFromPaths(jsonData, ['FilingStatus.NewTaxRegime'], 'N') === 'Y' ? 'New' : 'Old';
    
    const taxableIncome = getFromPaths(jsonData, ['IncomeDeductions.TotalIncome', 'PartB_TTI.TotalTaxableIncome'], 
      Math.max(0, incomeDetails.grossTotalIncome - deductions.totalDeductions)
    );

    const taxComputationResult = computeTax(
        taxableIncome,
        personalInfo.age,
        taxRegime,
        personalInfo.assessmentYear
    );

    const taxesPaid: TaxesPaid = {
      tds: (getFromPaths(jsonData, ['TDSonSalaries.TotalTDSonSalaries'], 0) + getFromPaths(jsonData, ['TDSonOthThanSals.TotalTDSonOthThanSals'], 0)),
      advanceTax: getFromPaths(jsonData, ['TaxPaid.TaxesPaid.AdvanceTax'], 0),
    };

    const totalTaxPaid = taxesPaid.tds + taxesPaid.advanceTax + getFromPaths(jsonData, ['TaxPaid.TaxesPaid.SelfAssessmentTax'], 0);
    const finalAmount = taxComputationResult.totalTaxLiability - totalTaxPaid;

    return {
      fileName: file.name,
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
        netTaxPayable: Math.max(0, finalAmount),
        refund: Math.max(0, -finalAmount),
      }
    };
  } catch (error) {
    console.error("Error parsing ITR JSON:", error);
    throw new Error('Failed to parse ITR JSON. The file might be invalid or in an unsupported format.');
  }
}

    