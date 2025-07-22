import type { Income, Deductions, CapitalGainsTransaction } from '@/types';

interface ParsedData {
  clientName: string;
  pan: string;
  dob: string;
  address: string;
  income: Income;
  deductions: Deductions;
  capitalGainsTransactions: CapitalGainsTransaction[];
  itrFormType: string;
}


export const parseITRJson = (fileContent: string): ParsedData => {
    try {
        const data = JSON.parse(fileContent);
        let parsedData: ParsedData = {
            clientName: "Unknown",
            pan: "N/A",
            dob: "N/A",
            address: "N/A",
            income: {
                salary: 0,
                interestIncome: 0,
                otherIncome: 0,
                capitalGains: 0, // This will be total capital gains from JSON, not transaction-level
                businessIncome: 0,
                speculationIncome: 0,
                fnoIncome: 0,
            },
            deductions: {
                section80C: 0,
                section80CCD1B: 0,
                section80CCD2: 0,
                section80D: 0,
                section80TTA: 0,
                section80TTB: 0,
                section80G: 0,
                section24B: 0,
            },
            capitalGainsTransactions: [], // Initialize empty for parsed, user can add manually
            itrFormType: "Unknown",
        };

        // Determine ITR Form Type and extract basic data
        if (data.ITR && data.ITR.ITR1) {
            parsedData.itrFormType = "ITR-1";
            const itr1 = data.ITR.ITR1;
            parsedData.clientName = `${itr1.PersonalInfo?.AssesseeName?.FirstName || ''} ${itr1.PersonalInfo?.AssesseeName?.SurNameOrOrgName || ''}`.trim();
            parsedData.pan = itr1.PersonalInfo?.PAN || "N/A";
            parsedData.dob = itr1.PersonalInfo?.DOB || "N/A";
            parsedData.address = `${itr1.PersonalInfo?.Address?.ResidenceNo || ''}, ${itr1.PersonalInfo?.Address?.RoadOrStreet || ''}, ${itr1.PersonalInfo?.Address?.LocalityOrArea || ''}, ${itr1.PersonalInfo?.Address?.CityOrTownOrDistrict || ''}, ${itr1.PersonalInfo?.Address?.PinCode || ''}`.trim();

            parsedData.income.salary = itr1.TotalIncome?.Salaries || 0;
            parsedData.income.interestIncome = (itr1.TotalIncome?.IncFromOS?.OtherSrcThanOwnRaceHorse || 0);
            parsedData.income.otherIncome = itr1.TotalIncome?.IncFromOS?.TotIncFromOS || 0;
            // For ITR-1, LTCG112A is directly available. More complex parsing would extract individual transactions.
            parsedData.income.capitalGains = itr1.LTCG112A?.LongCap112A || 0;

            parsedData.deductions.section80C = itr1.DeductUndChapVIA?.Section80C || 0;
            parsedData.deductions.section80CCD1B = itr1.DeductUndChapVIA?.Section80CCD1B || 0;
            parsedData.deductions.section80CCD2 = itr1.DeductUndChapVIA?.Section80CCDEmployer || 0;
            parsedData.deductions.section80D = itr1.DeductUndChapVIA?.Section80D || 0;
            parsedData.deductions.section80TTA = itr1.DeductUndChapVIA?.Section80TTA || 0;
            parsedData.deductions.section80TTB = itr1.DeductUndChapVIA?.Section80TTB || 0;
            parsedData.deductions.section80G = itr1.DeductUndChapVIA?.Section80G || 0;

        } else if (data.ITR && data.ITR.ITR2) {
            parsedData.itrFormType = "ITR-2";
            const itr2 = data.ITR.ITR2;
            parsedData.clientName = `${itr2.PartA_GEN1?.PersonalInfo?.AssesseeName?.FirstName || ''} ${itr2.PartA_GEN1?.PersonalInfo?.AssesseeName?.MiddleName || ''} ${itr2.PartA_GEN1?.PersonalInfo?.AssesseeName?.SurNameOrOrgName || ''}`.trim();
            parsedData.pan = itr2.PartA_GEN1?.PersonalInfo?.PAN || "N/A";
            parsedData.dob = itr2.PartA_GEN1?.PersonalInfo?.DOB || "N/A";
            parsedData.address = `${itr2.PartA_GEN1?.PersonalInfo?.Address?.ResidenceNo || ''}, ${itr2.PartA_GEN1?.PersonalInfo?.Address?.RoadOrStreet || ''}, ${itr2.PartA_GEN1?.PersonalInfo?.Address?.LocalityOrArea || ''}, ${itr2.PartA_GEN1?.PersonalInfo?.Address?.CityOrTownOrDistrict || ''}, ${itr2.PartA_GEN1?.PersonalInfo?.Address?.PinCode || ''}`.trim();

            parsedData.income.salary = itr2['PartB-TI']?.Salaries || 0;
            parsedData.income.interestIncome = itr2['PartB-TI']?.IncFromOS?.OtherSrcThanOwnRaceHorse || 0;
            parsedData.income.otherIncome = itr2['PartB-TI']?.IncFromOS?.TotIncFromOS || 0;
            parsedData.income.capitalGains = itr2['PartB-TI']?.CapGain?.TotalCapGains || 0; // Total CG from ITR2

            const chapVIA = itr2.DeductUndChapVIA?.DeductUndChapVIA;
            if (chapVIA) {
                parsedData.deductions.section80C = chapVIA.Section80C || 0;
                parsedData.deductions.section80CCD1B = chapVIA.Section80CCD1B || 0;
                parsedData.deductions.section80CCD2 = chapVIA.Section80CCDEmployer || 0;
                parsedData.deductions.section80D = chapVIA.Section80D || 0;
                parsedData.deductions.section80TTA = chapVIA.Section80TTA || 0;
                parsedData.deductions.section80TTB = chapVIA.Section80TTB || 0;
                parsedData.deductions.section80G = chapVIA.Section80G || 0;
                parsedData.deductions.section24B = itr2['PartB-TI']?.IncomeFromHP || 0;
            }

        } else if (data.ITR && data.ITR.ITR3) {
            parsedData.itrFormType = "ITR-3";
            const itr3 = data.ITR.ITR3;
            parsedData.clientName = `${itr3.PartA_GEN1?.PersonalInfo?.AssesseeName?.FirstName || ''} ${itr3.PartA_GEN1?.PersonalInfo?.AssesseeName?.MiddleName || ''} ${itr3.PartA_GEN1?.PersonalInfo?.AssesseeName?.SurNameOrOrgName || ''}`.trim();
            parsedData.pan = itr3.PartA_GEN1?.PersonalInfo?.PAN || "N/A";
            parsedData.dob = itr3.PartA_GEN1?.PersonalInfo?.DOB || "N/A";
            parsedData.address = `${itr3.PartA_GEN1?.PersonalInfo?.Address?.ResidenceNo || ''}, ${itr3.PartA_GEN1?.PersonalInfo?.Address?.RoadOrStreet || ''}, ${itr3.PartA_GEN1?.PersonalInfo?.Address?.LocalityOrArea || ''}, ${itr3.PartA_GEN1?.PersonalInfo?.Address?.CityOrTownOrDistrict || ''}, ${itr3.PartA_GEN1?.PersonalInfo?.Address?.PinCode || ''}`.trim();

            parsedData.income.salary = itr3['PartB-TI']?.Salaries || 0;
            parsedData.income.interestIncome = itr3['PartB-TI']?.IncFromOS?.OtherSrcThanOwnRaceHorse || 0;
            parsedData.income.otherIncome = itr3['PartB-TI']?.IncFromOS?.TotIncFromOS || 0;
            parsedData.income.capitalGains = itr3['PartB-TI']?.CapGain?.TotalCapGains || 0;
            parsedData.income.businessIncome = itr3['PartB-TI']?.IncomeFromBusinessProf || 0;

            parsedData.income.speculationIncome = 0; // Placeholder
            parsedData.income.fnoIncome = 0; // Placeholder


            const chapVIA = itr3.DeductUndChapVIA?.DeductUndChapVIA;
            if (chapVIA) {
                parsedData.deductions.section80C = chapVIA.Section80C || 0;
                parsedData.deductions.section80CCD1B = chapVIA.Section80CCD1B || 0;
                parsedData.deductions.section80CCD2 = chapVIA.Section80CCDEmployer || 0;
                parsedData.deductions.section80D = chapVIA.Section80D || 0;
                parsedData.deductions.section80TTA = chapVIA.Section80TTA || 0;
                parsedData.deductions.section80TTB = chapVIA.Section80TTB || 0;
                parsedData.deductions.section80G = chapVIA.Section80G || 0;
                parsedData.deductions.section24B = itr3['PartB-TI']?.IncomeFromHP || 0;
            }

        } else if (data.ITR && data.ITR.ITR4) {
            parsedData.itrFormType = "ITR-4";
            const itr4 = data.ITR.ITR4;
            parsedData.clientName = `${itr4.PersonalInfo?.AssesseeName?.FirstName || ''} ${itr4.PersonalInfo?.AssesseeName?.SurNameOrOrgName || ''}`.trim();
            parsedData.pan = itr4.PersonalInfo?.PAN || "N/A";
            parsedData.dob = itr4.PersonalInfo?.DOB || "N/A";
            parsedData.address = `${itr4.PersonalInfo?.Address?.ResidenceNo || ''}, ${itr4.PersonalInfo?.Address?.RoadOrStreet || ''}, ${itr4.PersonalInfo?.Address?.LocalityOrArea || ''}, ${itr4.PersonalInfo?.Address?.CityOrTownOrDistrict || ''}, ${itr4.PersonalInfo?.Address?.PinCode || ''}`.trim();

            parsedData.income.salary = itr4.TotalIncome?.Salaries || 0;
            parsedData.income.interestIncome = itr4.TotalIncome?.IncFromOS?.TotIncFromOS || 0;
            parsedData.income.otherIncome = itr4.TotalIncome?.IncFromOS?.TotIncFromOS || 0;
            parsedData.income.businessIncome = itr4.TotalIncome?.IncomeFromBusinessProf || 0;
            // ITR4 is for presumptive, so no explicit speculation/F&O schedules
            parsedData.income.speculationIncome = 0;
            parsedData.income.fnoIncome = 0;

            parsedData.deductions.section80C = itr4.DeductUndChapVIA?.Section80C || 0;
            parsedData.deductions.section80CCD1B = itr4.DeductUndChapVIA?.Section80CCD1B || 0;
            parsedData.deductions.section80CCD2 = itr4.DeductUndChapVIA?.Section80CCDEmployer || 0;
            parsedData.deductions.section80D = itr4.DeductUndChapVIA?.Section80D || 0;
            parsedData.deductions.section80TTA = itr4.DeductUndChapVIA?.Section80TTA || 0;
            parsedData.deductions.section80TTB = itr4.DeductUndChapVIA?.Section80TTB || 0;
            parsedData.deductions.section80G = itr4.DeductUndChapVIA?.Section80G || 0;
        } else if (data.personalInfo && data.personalInfo.pan) { // Prefill JSON structure
            parsedData.itrFormType = "Prefill";
            parsedData.clientName = `${data.personalInfo?.assesseeName?.firstName || ''} ${data.personalInfo?.assesseeName?.middleName || ''} ${data.personalInfo?.assesseeName?.surNameOrOrgName || ''}`.trim();
            parsedData.pan = data.personalInfo?.pan || "N/A";
            parsedData.dob = data.personalInfo?.dob || "N/A";
            parsedData.address = `${data.personalInfo?.address?.residenceNo || ''}, ${data.personalInfo?.address?.roadOrStreet || ''}, ${data.personalInfo?.address?.localityOrArea || ''}, ${data.personalInfo?.address?.cityOrTownOrDistrict || ''}, ${data.personalInfo?.address?.zipCode || ''}`.trim();

            const insights = data.insights || {};
            parsedData.income.interestIncome = (insights.intrstFrmSavingBank || 0) + (insights.intrstFrmTermDeposit || 0);
            parsedData.income.otherIncome = (insights.scheduleOS?.incOthThanOwnRaceHorse?.intrstFrmOthers || 0);

            const userDeduct = insights.UsrDeductUndChapVIAType || {};
            parsedData.deductions.section80TTB = userDeduct.Section80TTB || 0;
        } else {
             throw new Error("Invalid JSON file or unsupported ITR format.");
        }
        
        return parsedData;

    } catch (error) {
        console.error("Error parsing JSON:", error);
        throw new Error("Invalid JSON file or unsupported format.");
    }
};
