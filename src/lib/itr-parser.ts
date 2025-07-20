
import type { ClientData, TaxesPaid, PersonalInfo, Deductions, IncomeDetails } from './types';
import { calculateAge, computeTax } from './tax-calculator';

/**
 * Parses ITR JSON and computes a standardized summary.
 * Supports various common ITR JSON structures.
 * @param {File} file - The uploaded JSON file.
 * @returns {Promise<Omit<ClientData, 'id' | 'aiSummary' | 'aiTips'>>} A structured client data object.
 */
export async function parseITR(file: File): Promise<Omit<ClientData, 'id' | 'aiSummary' | 'aiTips'>> {
  const fileContent = await file.text();
  const jsonData = JSON.parse(fileContent);

  try {
    const personalInfo: PersonalInfo = {
        name: `${jsonData?.PartA_GEN1?.PersonalInfo?.AssesseeName?.FirstName || ''} ${jsonData?.PartA_GEN1?.PersonalInfo?.AssesseeName?.MiddleName || ''} ${jsonData?.PartA_GEN1?.PersonalInfo?.AssesseeName?.SurNameOrOrgName || ''}`.trim() || 'N/A',
        pan: jsonData?.PartA_GEN1?.PersonalInfo?.PAN || 'N/A',
        assessmentYear: jsonData?.ITRForm?.AssessmentYear || '2024-25',
        age: calculateAge(jsonData?.PartA_GEN1?.PersonalInfo?.DOB || ""),
    };

    const taxRegime = jsonData?.PartB_TTI?.NewTaxRegime?.IsOpted === "Y" ? 'New' : 'Old';

    const incomeDetails: IncomeDetails = {
      salary: jsonData?.PartB_TI?.Salaries || 0,
      houseProperty: jsonData?.PartB_TI?.IncomeFromHP || 0,
      businessIncome: jsonData?.PartB_TI?.IncomeFromBP || 0,
      capitalGains: {
        shortTerm: jsonData?.ScheduleCG?.ShortTermCapGain?.TotalShortTermCapGain || 0,
        longTerm: jsonData?.ScheduleCG?.LongTermCapGain?.TotalLongTermCapGain || 0,
      },
      otherSources: jsonData?.PartB_TI?.IncomeFromOS || 0,
      grossTotalIncome: jsonData?.PartB_TI?.GrossTotalIncome || 0,
    };
    
    const totalDeductions = jsonData?.PartB_TI?.TotalDeductions || 0;

    const deductions: Deductions = {
      section80C: jsonData?.Deductions?.UsrDeductUndChapVIA?.Section80C || 0,
      section80D: jsonData?.Deductions?.UsrDeductUndChapVIA?.Section80D || 0,
      totalDeductions: totalDeductions,
    };

    const taxableIncome = Math.max(0, incomeDetails.grossTotalIncome - totalDeductions);
    
    const taxComputationResult = computeTax(
        taxableIncome,
        personalInfo.age,
        taxRegime,
        personalInfo.assessmentYear
    );

    const tdsData = jsonData?.TaxPayments?.TdsOnSalary;
    const tdsOthersData = jsonData?.TaxPayments?.TdsOnOthThanSal;
    const advanceTaxData = jsonData?.TaxPayments?.AdvanceTax;
    
    const taxesPaid: TaxesPaid = {
      tds: (Array.isArray(tdsData) ? tdsData.reduce((sum, item) => sum + (item.TotalTDSonSalaries || 0), 0) : 0) + 
           (Array.isArray(tdsOthersData) ? tdsOthersData.reduce((sum, item) => sum + (item.TotalTDSonOthThanSals || 0), 0) : 0),
      advanceTax: Array.isArray(advanceTaxData) ? advanceTaxData.reduce((sum, item) => sum + (item.Amt || 0), 0) : 0,
    };

    const totalTaxPaid = taxesPaid.tds + taxesPaid.advanceTax;
    const finalAmount = taxComputationResult.totalTaxLiability - totalTaxPaid;

    return {
      fileName: file.name,
      personalInfo,
      incomeDetails,
      deductions,
      taxesPaid,
      taxRegime: taxRegime,
      taxComputation: {
        ...taxComputationResult,
        netTaxPayable: Math.max(0, finalAmount),
        refund: Math.max(0, -finalAmount),
      }
    };
  } catch (error) {
    console.error("Error parsing ITR JSON:", error);
    throw new Error('Failed to parse ITR JSON. The file might be invalid or in an unexpected format.');
  }
}
