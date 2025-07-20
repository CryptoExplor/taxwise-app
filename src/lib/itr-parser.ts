import type { ClientData, TaxesPaid, PersonalInfo, Deductions, IncomeDetails } from './types';
import { calculateAge } from './tax-calculator';

// Parses the ITR JSON structure.
export async function parseITR(file: File): Promise<Omit<ClientData, 'id' | 'taxComputation' | 'aiSummary' | 'aiTips'>> {
  const fileContent = await file.text();
  const jsonData = JSON.parse(fileContent);

  try {
    // This function now uses a more robust set of paths to find data,
    // which should be compatible with more ITR JSON versions.
    
    const personalInfo: PersonalInfo = {
      name: `${jsonData?.PartA_GEN1?.PersonalInfo?.AssesseeName?.FirstName || jsonData?.PartA_Gen1?.Name || ''} ${jsonData?.PartA_GEN1?.PersonalInfo?.AssesseeName?.MiddleName || ''} ${jsonData?.PartA_GEN1?.PersonalInfo?.AssesseeName?.SurNameOrOrgName || ''}`.trim() || "N/A",
      pan: jsonData?.PartA_GEN1?.PersonalInfo?.PAN || jsonData?.PartA_Gen1?.PAN || "N/A",
      assessmentYear: jsonData?.ITRForm?.AssessmentYear || "2024-25",
      age: calculateAge(jsonData?.PartA_GEN1?.PersonalInfo?.DOB || jsonData?.PartA_Gen1?.DOB),
    };

    const regime = (jsonData?.PartB_TTI?.NewTaxRegime?.IsOpted === "Y" || jsonData?.PartB_TTI?.isOptingForNewTaxRegime === "Y") ? 'New' : 'Old';

    const incomeDetails: IncomeDetails = {
      salary: jsonData?.PartB_TI?.Salaries || jsonData?.PartA_TotalIncome?.Salaries || 0,
      houseProperty: jsonData?.PartB_TI?.IncomeFromHP || jsonData?.PartA_TotalIncome?.IncomeFromHP || 0,
      businessIncome: jsonData?.PartB_TI?.IncomeFromBP || jsonData?.PartA_TotalIncome?.IncomeFromBP || 0,
      capitalGains: {
        shortTerm: (jsonData?.ScheduleCG?.ShortTermCapGainFor222?.unutilizedCapGain || jsonData?.ScheduleCG?.TotalSTCG || 0),
        longTerm: (jsonData?.ScheduleCG?.LongTermCapGainFor222?.unutilizedCapGain || jsonData?.ScheduleCG?.TotalLTCG || 0),
      },
      otherSources: jsonData?.PartB_TI?.IncomeFromOS || jsonData?.PartA_TotalIncome?.IncomeFromOS || 0,
      grossTotalIncome: jsonData?.PartB_TI?.GrossTotalIncome || jsonData?.PartA_TotalIncome?.GrossTotalIncome || 0,
    };
    
    const deductions: Deductions = {
      section80C: jsonData?.Deductions?.UsrDeductUndChapVIA?.Section80C || jsonData?.PartA_TotalIncome?.Deductions?.Section80C || 0,
      section80D: jsonData?.Deductions?.UsrDeductUndChapVIA?.Section80D || jsonData?.PartA_TotalIncome?.Deductions?.Section80D || 0,
      totalDeductions: jsonData?.PartB_TI?.TotalDeductions || jsonData?.PartA_TotalIncome?.TotalDeductions || 0,
    };

    const tdsData = jsonData?.TaxPayments?.TdsOnSalary || jsonData?.TaxPaid?.TDSonSalaries;
    const tdsOtherData = jsonData?.TaxPayments?.TdsOnOthThanSal || jsonData?.TaxPaid?.TDSonOthThanSals;
    const advanceTaxData = jsonData?.TaxPayments?.AdvanceTax || jsonData?.TaxPaid?.AdvanceTax;

    const taxesPaid: TaxesPaid = {
      tds: (Array.isArray(tdsData) ? tdsData.reduce((sum, item) => sum + (item.TotalTDSonSalaries || item.TotalTDSSalary || 0), 0) : (tdsData?.TotalTDSonSalaries || 0)) +
           (Array.isArray(tdsOtherData) ? tdsOtherData.reduce((sum, item) => sum + (item.TotalTDSonOthThanSals || 0), 0) : (tdsOtherData?.TotalTDSonOthThanSals || 0)),
      advanceTax: Array.isArray(advanceTaxData) ? advanceTaxData.reduce((sum, item) => sum + (item.TotalAdvanceTax || item.Amt || 0), 0) : (advanceTaxData?.TotalAdvanceTax || 0),
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
