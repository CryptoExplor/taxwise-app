import type { ClientData, TaxesPaid, PersonalInfo, Deductions, IncomeDetails } from './types';
import { calculateAge } from './tax-calculator';

/**
 * Robustly finds a value in a nested object using a list of possible paths.
 * @param {any} data - The JSON data object.
 * @param {string[]} paths - An array of possible dot-notation paths.
 * @param {any} defaultValue - The value to return if no path is found.
 * @returns {any} The found value or the default value.
 */
function getValueByPaths(data: any, paths: string[], defaultValue: any = 0): any {
    for (const path of paths) {
        const keys = path.split('.');
        let value = data;
        let found = true;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                found = false;
                break;
            }
        }
        if (found && value !== null && value !== undefined) {
            // Ensure numeric values are returned as numbers
            const numValue = Number(value);
            return isNaN(numValue) ? value : numValue;
        }
    }
    return defaultValue;
}


/**
 * Reduces an array of objects to a sum of a specific property.
 * Handles cases where the input might not be an array.
 * @param {any} data - The data that might be an array.
 * @param {string} key - The property to sum.
 * @returns {number} The sum of the property values.
 */
function sumArrayProperty(data: any, key: string): number {
    if (Array.isArray(data)) {
        return data.reduce((sum, item) => sum + (Number(item?.[key]) || 0), 0);
    }
    if (data && typeof data === 'object' && key in data) {
         return Number(data[key]) || 0;
    }
    return 0;
}


// Parses the ITR JSON structure.
export async function parseITR(file: File): Promise<Omit<ClientData, 'id' | 'taxComputation' | 'aiSummary' | 'aiTips'>> {
  const fileContent = await file.text();
  const jsonData = JSON.parse(fileContent);

  try {
    const personalInfo: PersonalInfo = {
      name: [
        getValueByPaths(jsonData, ['PartA_GEN1.PersonalInfo.AssesseeName.FirstName', 'PartA_Gen1.Name.firstName'], ''),
        getValueByPaths(jsonData, ['PartA_GEN1.PersonalInfo.AssesseeName.MiddleName', 'PartA_Gen1.Name.middleName'], ''),
        getValueByPaths(jsonData, ['PartA_GEN1.PersonalInfo.AssesseeName.SurNameOrOrgName', 'PartA_Gen1.Name.surNameOrOrgName'], '')
      ].filter(Boolean).join(' ').trim() || 'N/A',
      pan: getValueByPaths(jsonData, ['PartA_GEN1.PersonalInfo.PAN', 'PartA_Gen1.PAN'], 'N/A'),
      assessmentYear: getValueByPaths(jsonData, ['ITRForm.AssessmentYear', 'Form_ITR1.AssessmentYear'], '2024-25'),
      age: calculateAge(getValueByPaths(jsonData, ['PartA_GEN1.PersonalInfo.DOB', 'PartA_Gen1.DOB'], '')),
    };

    const regime = getValueByPaths(jsonData, ['PartB_TTI.NewTaxRegime.IsOpted', 'PartB_TTI.isOptingForNewTaxRegime'], 'N') === 'Y' ? 'New' : 'Old';

    const incomeDetails: IncomeDetails = {
      salary: getValueByPaths(jsonData, ['PartB_TI.Salaries', 'PartBTI.Salaries', 'IncomeDeductions.Salaries']),
      houseProperty: getValueByPaths(jsonData, ['PartB_TI.IncomeFromHP', 'PartBTI.IncomeFromHP', 'IncomeDeductions.IncomeFromHP']),
      businessIncome: getValueByPaths(jsonData, ['PartB_TI.IncomeFromBP', 'PartBTI.IncomeFromBP', 'IncomeDeductions.IncomeFromBP']),
      capitalGains: {
        shortTerm: getValueByPaths(jsonData, ['ScheduleCG.ShortTermCapGain.TotalShortTermCapGain', 'ScheduleCG.TotalSTCG']),
        longTerm: getValueByPaths(jsonData, ['ScheduleCG.LongTermCapGain.TotalLongTermCapGain', 'ScheduleCG.TotalLTCG']),
      },
      otherSources: getValueByPaths(jsonData, ['PartB_TI.IncomeFromOS', 'PartBTI.IncomeFromOS', 'IncomeDeductions.IncomeFromOS']),
      grossTotalIncome: getValueByPaths(jsonData, ['PartB_TI.GrossTotalIncome', 'PartBTI.GrossTotalIncome', 'IncomeDeductions.GrossTotalIncome']),
    };
    
    const deductions: Deductions = {
      section80C: getValueByPaths(jsonData, ['Deductions.UsrDeductUndChapVIA.Section80C', 'ChapterVIA.Deduction.Section80C']),
      section80D: getValueByPaths(jsonData, ['Deductions.UsrDeductUndChapVIA.Section80D', 'ChapterVIA.Deduction.Section80D']),
      totalDeductions: getValueByPaths(jsonData, ['PartB_TI.TotalDeductions', 'PartBTI.TotalDeductions', 'IncomeDeductions.TotalDeductions']),
    };
    
    const tdsSalaryData = getValueByPaths(jsonData, ['TaxPayments.TdsOnSalary', 'TaxPaid.TDSonSalaries'], []);
    const tdsOtherData = getValueByPaths(jsonData, ['TaxPayments.TdsOnOthThanSal', 'TaxPaid.TDSonOthThanSals'], []);
    const advanceTaxData = getValueByPaths(jsonData, ['TaxPayments.AdvanceTax', 'TaxPaid.AdvanceTax'], []);

    const taxesPaid: TaxesPaid = {
      tds: sumArrayProperty(tdsSalaryData, 'TotalTDSonSalaries') + sumArrayProperty(tdsOtherData, 'TotalTDSonOthThanSals'),
      advanceTax: sumArrayProperty(advanceTaxData, 'Amt'),
    };

    return {
      fileName: file.name,
      personalInfo,
      incomeDetails,
      deductions,
      taxesPaid,
      taxRegime: regime
    };
  } catch (error) {
    console.error("Error parsing ITR JSON:", error);
    throw new Error('Failed to parse ITR JSON. The file might be invalid or in an unexpected format.');
  }
}
