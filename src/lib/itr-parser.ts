import type { ClientData, TaxesPaid, PersonalInfo, Deductions, IncomeDetails } from './types';
import { calculateAge } from './tax-calculator';

// Parses the ITR JSON structure.
export async function parseITR(file: File): Promise<Omit<ClientData, 'id' | 'taxComputation' | 'aiSummary' | 'aiTips'>> {
  const fileContent = await file.text();
  const jsonData = JSON.parse(fileContent);

  try {
    const personalInfo: PersonalInfo = {
      name: `${jsonData?.PartA_GEN1?.PersonalInfo?.AssesseeName?.FirstName || ''} ${jsonData?.PartA_GEN1?.PersonalInfo?.AssesseeName?.MiddleName || ''} ${jsonData?.PartA_GEN1?.PersonalInfo?.AssesseeName?.SurNameOrOrgName || ''}`.trim() || "N/A",
      pan: jsonData?.PartA_GEN1?.PersonalInfo?.PAN || "N/A",
      assessmentYear: jsonData?.ITRForm?.AssessmentYear || "2024-25",
      age: calculateAge(jsonData?.PartA_GEN1?.PersonalInfo?.DOB),
    };

    const regime = jsonData?.PartB_TTI?.NewTaxRegime?.IsOpted === "Y" ? 'New' : 'Old';

    const incomeDetails: IncomeDetails = {
      salary: jsonData?.PartB_TI?.Salaries || 0,
      houseProperty: jsonData?.PartB_TI?.IncomeFromHP || 0,
      businessIncome: jsonData?.PartB_TI?.IncomeFromBP || 0,
      capitalGains: {
        shortTerm: (jsonData?.ScheduleCG?.ShortTermCapGainFor222?.unutilizedCapGain || 0),
        longTerm: (jsonData?.ScheduleCG?.LongTermCapGainFor222?.unutilizedCapGain || 0),
      },
      otherSources: jsonData?.PartB_TI?.IncomeFromOS || 0,
      grossTotalIncome: jsonData?.PartB_TI?.GrossTotalIncome || 0,
    };
    
    const deductions: Deductions = {
      section80C: jsonData?.Deductions?.UsrDeductUndChapVIA?.Section80C || 0,
      section80D: jsonData?.Deductions?.UsrDeductUndChapVIA?.Section80D || 0,
      totalDeductions: jsonData?.PartB_TI?.TotalDeductions || 0,
    };

    const taxesPaid: TaxesPaid = {
      tds: (jsonData?.TaxPayments?.TdsOnSalary?.TotalTDSonSalaries || 0) + (jsonData?.TaxPayments?.TdsOnOthThanSal?.TotalTDSonOthThanSals || 0),
      advanceTax: jsonData?.TaxPayments?.AdvanceTax?.TotalAdvanceTax || 0,
    };

    return {
      fileName: file.name,
      personalInfo: personalInfo,
      incomeDetails: incomeDetails,
      deductions: deductions,
      taxesPaid: taxesPaid,
      taxRegime: regime
    };
  } catch (error) {
    console.error("Error parsing ITR JSON:", error);
    throw new Error('Failed to parse ITR JSON. The file might be invalid or in an unexpected format.');
  }
}
