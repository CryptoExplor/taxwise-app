
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

/**
 * Parses various ITR JSON formats and computes a standardized summary.
 * @param {File} file - The uploaded JSON file.
 * @returns {Promise<ClientDataToSave>} A structured client data object ready to be saved.
 */
export async function parseITR(file: File): Promise<ClientDataToSave> {
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

    const personalInfo = {
        name: `${firstName} ${middleName} ${lastName}`.replace(/\s+/g, ' ').trim() || 'N/A',
        pan: getFromPaths(jsonData, ['PersonalInfo.PAN', 'PartA_GEN1.PersonalInfo.PAN'], 'N/A'),
        assessmentYear: ay,
        age: calculateAge(getFromPaths(jsonData, ['PersonalInfo.DOB', 'PartA_GEN1.PersonalInfo.DOB'], "")),
    };
    
    const incomeDetails = {
      salary: get(jsonData, 'PartB_TI.Salaries', 0),
      houseProperty: get(jsonData, 'PartB_TI.IncomeFromHP', 0),
      businessIncome: get(jsonData, 'PartB_TI.IncomeFromBP', 0),
      capitalGains: {
        shortTerm: get(jsonData, 'ScheduleCG.ShortTermCapGain.TotalShortTermCapGain', 0),
        longTerm: get(jsonData, 'ScheduleCG.LongTermCapGain.TotalLongTermCapGain', 0),
      },
      otherSources: get(jsonData, 'PartB_TI.IncomeFromOS', 0),
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
            incomeDetails.otherSources
        );
    }
    
    const deductions = {
      section80C: get(jsonData, 'DeductUndChapVIA.Section80C', 0),
      section80D: get(jsonData, 'DeductUndChapVIA.Section80D', 0),
      totalDeductions: get(jsonData, 'PartB_TI.TotalDeductions', 0),
    };

    if (deductions.totalDeductions === 0) {
        deductions.totalDeductions = get(jsonData, 'DeductUndChapVIA.TotalChapVIADeductions', 0)
    }
    
    const taxRegime = getFromPaths(jsonData, ['FilingStatus.NewTaxRegime'], 'N') === 'Y' ? 'New' : 'Old';
    
    // --- START of new calculation logic ---

    // Calculate for both regimes
    const oldRegimeTaxableIncome = Math.max(0, incomeDetails.grossTotalIncome - deductions.totalDeductions);
    const newRegimeTaxableIncome = incomeDetails.grossTotalIncome; // Deductions not considered for New Regime

    const oldRegimeResult = computeTax(oldRegimeTaxableIncome, personalInfo.age, 'Old', personalInfo.assessmentYear);
    const newRegimeResult = computeTax(newRegimeTaxableIncome, personalInfo.age, 'New', personalInfo.assessmentYear);
    
    const taxComparison = {
      oldRegime: oldRegimeResult,
      newRegime: newRegimeResult,
    };

    // Determine the primary computation result based on the file's tax regime
    const taxComputationResult = taxRegime === 'Old' ? oldRegimeResult : newRegimeResult;
    const taxableIncome = taxRegime === 'Old' ? oldRegimeTaxableIncome : newRegimeTaxableIncome;

    // --- END of new calculation logic ---

    const taxesPaid = {
      tds: get(jsonData, 'TaxPayments.TDS', 0),
      advanceTax: get(jsonData, 'TaxPayments.AdvanceTax', 0),
    };
    taxesPaid.tds = getFromPaths(jsonData, ['TaxPayments.TDS'], (get(jsonData, 'TDSonSalaries.TotalTDSonSalaries', 0) + get(jsonData, 'TDSonOthThanSals.TotalTDSonOthThanSals', 0)));
    taxesPaid.advanceTax = getFromPaths(jsonData, ['TaxPayments.AdvanceTax'], get(jsonData, 'TaxPaid.TaxesPaid.AdvanceTax', 0));
    
    const totalTaxPaid = getFromPaths(jsonData, ['TaxPayments.TotalTaxesPaid'], taxesPaid.tds + taxesPaid.advanceTax + get(jsonData, 'TaxPaid.TaxesPaid.SelfAssessmentTax', 0));


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
