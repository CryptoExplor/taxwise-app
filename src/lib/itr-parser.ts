
import type { ClientData, IncomeDetails, Deductions, TaxComputation, TaxPaid, FinalSettlement } from './types';

function safeNum(value: any): number {
    return Number(value) || 0;
}

export const parseITRJson = (fileContent: string, currentUserEmail: string): Omit<ClientData, 'id'> => {
    try {
        const data = JSON.parse(fileContent);

        // Find the main ITR object, which might be nested
        const itrData = data.ITR?.ITR1 || data.ITR?.ITR2 || data.ITR?.ITR3 || data.ITR?.ITR4 || data;
        const formName = data.ITR ? Object.keys(data.ITR)[0] : "Prefill";

        // --- 1. Basic Client Metadata ---
        const personalInfo = itrData.PersonalInfo || itrData.PartA_GEN1?.PersonalInfo || {};
        const assesseeName = personalInfo.AssesseeName || {};
        const filingStatus = itrData.FilingStatus || itrData.PartA_GEN1?.FilingStatus || {};
        const partB_TTI = itrData['PartB-TTI'] || {};

        const name = `${assesseeName.FirstName || ''} ${assesseeName.MiddleName || ''} ${assesseeName.SurNameOrOrgName || ''}`.trim();
        const pan = personalInfo.PAN || 'N/A';
        const assessmentYear = itrData.AssessmentYear || '2024-25';
        const status = filingStatus.ReturnFileSec || 'N/A';

        // --- 2. Income Computation ---
        const incomeSources = itrData.PartB_TI || {};
        const scheduleCG = itrData.ScheduleCG || {};
        
        const incomeDetails: IncomeDetails = {
            salary: safeNum(incomeSources.Salaries),
            houseProperty: safeNum(incomeSources.IncomeFromHP),
            businessIncome: safeNum(incomeSources.IncomeFromBusinessProf),
            capitalGains: {
                shortTerm: safeNum(scheduleCG.ShortTermCapGain?.TotalShortTermCapGain),
                longTerm: safeNum(scheduleCG.LongTermCapGain?.TotalLongTermCapGain),
            },
            otherSources: safeNum(incomeSources.IncFromOS),
            grossTotalIncome: safeNum(incomeSources.GrossTotalIncome),
        };

        // --- 3. Deductions ---
        const scheduleVIA = itrData.ScheduleVIA?.DeductUndChapVIA || {};
        const deductions: Deductions = {
            section80C: safeNum(scheduleVIA.Section80C),
            section80D: safeNum(scheduleVIA.Section80D),
            section80G: safeNum(scheduleVIA.Section80G),
            totalDeductions: safeNum(itrData.PartB_TI?.TotalDeductUndChapVIA),
        };

        // --- 4. Net Computation ---
        const netTaxableIncome = safeNum(itrData.PartB_TI?.TotalIncome);
        const taxComputation: TaxComputation = {
            taxOnIncome: safeNum(partB_TTI.TaxPayableOnTI),
            cess: safeNum(partB_TTI.HealthEduCess),
            totalTaxLiability: safeNum(partB_TTI.NetTaxLiability),
        };

        // --- 5. Tax Paid ---
        const taxesPaidDetails = partB_TTI.TaxPaid || {};
        const taxPaid: TaxPaid = {
            tdsSalary: safeNum(taxesPaidDetails.TDS?.TotalTDS), // Simplified
            tdsOthers: 0, // Needs more specific parsing from TDS schedules
            advanceTax: safeNum(taxesPaidDetails.AdvanceTax),
            selfAssessmentTax: safeNum(taxesPaidDetails.SelfAssessmentTax),
            totalTaxPaid: safeNum(taxesPaidDetails.TotalTaxesPaid),
        };

        // --- 6. Refund / Payable ---
        const finalSettlement: FinalSettlement = {
            taxLiability: taxComputation.totalTaxLiability,
            taxPaid: taxPaid.totalTaxPaid,
            refundDue: safeNum(partB_TTI.Refund),
            taxPayable: safeNum(partB_TTI.NetTaxPayable),
        };

        // --- 7. Assemble Final Client Object ---
        const clientData: Omit<ClientData, 'id'> = {
            clientName: name,
            pan: pan,
            assessmentYear: assessmentYear,
            filingStatus: status,
            incomeDetails: incomeDetails,
            deductions: deductions,
            netTaxableIncome: netTaxableIncome,
            taxRegime: 'Old Regime', // Default, needs logic to detect from JSON
            taxComputation: taxComputation,
            taxPaid: taxPaid,
            finalSettlement: finalSettlement,
            notes: "",
            uploadedBy: currentUserEmail,
            createdAt: new Date().toISOString(),
        };

        return clientData;

    } catch (error) {
        console.error("Error parsing ITR JSON:", error);
        throw new Error("Invalid or unsupported ITR JSON file format.");
    }
};
