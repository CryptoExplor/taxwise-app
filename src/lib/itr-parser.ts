
import type { ClientData } from './types';

export const parseITRJson = (fileContent: string): Omit<ClientData, 'id' | 'createdAt' | 'taxOldRegime' | 'taxNewRegime'> => {
    try {
        const data = JSON.parse(fileContent);
        let parsedData: Omit<ClientData, 'id' | 'createdAt' | 'taxOldRegime' | 'taxNewRegime'> = {
            clientName: "Unknown",
            pan: "N/A",
            dob: "N/A",
            address: "N/A",
            income: {
                salary: 0,
                interestIncome: 0,
                otherIncome: 0,
                capitalGains: 0,
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
            capitalGainsTransactions: [],
            itrFormType: "Unknown",
        };

        if (data.ITR && data.ITR.ITR1) {
            parsedData.itrFormType = "ITR-1";
            const itr1 = data.ITR.ITR1;
            const personalInfo = itr1.PersonalInfo || {};
            const assesseeName = personalInfo.AssesseeName || {};
            const address = personalInfo.Address || {};
            const totalIncome = itr1.TotalIncome || {};
            const incFromOS = totalIncome.IncFromOS || {};
            const deductChapVIA = itr1.DeductUndChapVIA || {};

            parsedData.clientName = `${assesseeName.FirstName || ''} ${assesseeName.SurNameOrOrgName || ''}`.trim();
            parsedData.pan = personalInfo.PAN || "N/A";
            parsedData.dob = personalInfo.DOB || "N/A";
            parsedData.address = `${address.ResidenceNo || ''}, ${address.RoadOrStreet || ''}, ${address.LocalityOrArea || ''}, ${address.CityOrTownOrDistrict || ''}, ${address.PinCode || ''}`.trim();

            parsedData.income.salary = totalIncome.Salaries || 0;
            parsedData.income.interestIncome = incFromOS.OtherSrcThanOwnRaceHorse || 0;
            parsedData.income.otherIncome = incFromOS.TotIncFromOS || 0;
            
            parsedData.deductions.section80C = deductChapVIA.Section80C || 0;
            parsedData.deductions.section80CCD1B = deductChapVIA.Section80CCD1B || 0;
            parsedData.deductions.section80CCD2 = deductChapVIA.Section80CCDEmployer || 0;
            parsedData.deductions.section80D = deductChapVIA.Section80D || 0;
            parsedData.deductions.section80TTA = deductChapVIA.Section80TTA || 0;
            parsedData.deductions.section80TTB = deductChapVIA.Section80TTB || 0;
            parsedData.deductions.section80G = deductChapVIA.Section80G || 0;

        } else if (data.ITR && data.ITR.ITR2) {
            parsedData.itrFormType = "ITR-2";
            const itr2 = data.ITR.ITR2;
            const partAGEN1 = itr2.PartA_GEN1 || {};
            const personalInfo = partAGEN1.PersonalInfo || {};
            const assesseeName = personalInfo.AssesseeName || {};
            const address = personalInfo.Address || {};
            const partBTI = itr2['PartB-TI'] || {};
            const incFromOS = partBTI.IncFromOS || {};
            const capGain = partBTI.CapGain || {};
            const chapVIAContainer = itr2.ScheduleVIA || {};
            const chapVIA = chapVIAContainer.DeductUndChapVIA || {};
            

            parsedData.clientName = `${assesseeName.FirstName || ''} ${assesseeName.MiddleName || ''} ${assesseeName.SurNameOrOrgName || ''}`.trim();
            parsedData.pan = personalInfo.PAN || "N/A";
            parsedData.dob = personalInfo.DOB || "N/A";
            parsedData.address = `${address.ResidenceNo || ''}, ${address.RoadOrStreet || ''}, ${address.LocalityOrArea || ''}, ${address.CityOrTownOrDistrict || ''}, ${address.PinCode || ''}`.trim();

            parsedData.income.salary = partBTI.Salaries || 0;
            parsedData.income.interestIncome = incFromOS.OtherSrcThanOwnRaceHorse || 0;
            parsedData.income.otherIncome = incFromOS.TotIncFromOS || 0;
            parsedData.income.capitalGains = capGain.TotalCapGains || 0;

            if (chapVIA) {
                parsedData.deductions.section80C = chapVIA.Section80C || 0;
                parsedData.deductions.section80CCD1B = chapVIA.Section80CCD1B || 0;
                parsedData.deductions.section80CCD2 = chapVIA.Section80CCDEmployer || 0;
                parsedData.deductions.section80D = chapVIA.Section80D || 0;
                parsedData.deductions.section80TTA = chapVIA.Section80TTA || 0;
                parsedData.deductions.section80TTB = chapVIA.Section80TTB || 0;
                parsedData.deductions.section80G = chapVIA.Section80G || 0;
            }
             parsedData.deductions.section24B = partBTI.IncomeFromHP || 0;


        } else if (data.ITR && data.ITR.ITR3) {
             parsedData.itrFormType = "ITR-3";
            const itr3 = data.ITR.ITR3;
            const partAGEN1 = itr3.PartA_GEN1 || {};
            const personalInfo = partAGEN1.PersonalInfo || {};
            const assesseeName = personalInfo.AssesseeName || {};
            const address = personalInfo.Address || {};
            const partBTI = itr3['PartB-TI'] || {};
            const incFromOS = partBTI.IncFromOS || {};
            const capGain = partBTI.CapGain || {};
            const chapVIAContainer = itr3.ScheduleVIA || {};
            const chapVIA = chapVIAContainer.DeductUndChapVIA || {};

            parsedData.clientName = `${assesseeName.FirstName || ''} ${assesseeName.MiddleName || ''} ${assesseeName.SurNameOrOrgName || ''}`.trim();
            parsedData.pan = personalInfo.PAN || "N/A";
            parsedData.dob = personalInfo.DOB || "N/A";
            parsedData.address = `${address.ResidenceNo || ''}, ${address.RoadOrStreet || ''}, ${address.LocalityOrArea || ''}, ${address.CityOrTownOrDistrict || ''}, ${address.PinCode || ''}`.trim();

            parsedData.income.salary = partBTI.Salaries || 0;
            parsedData.income.interestIncome = incFromOS.OtherSrcThanOwnRaceHorse || 0;
            parsedData.income.otherIncome = incFromOS.TotIncFromOS || 0;
            parsedData.income.capitalGains = capGain.TotalCapGains || 0;
            parsedData.income.businessIncome = partBTI.IncomeFromBusinessProf || 0;

            if (chapVIA) {
                parsedData.deductions.section80C = chapVIA.Section80C || 0;
                parsedData.deductions.section80CCD1B = chapVIA.Section80CCD1B || 0;
                parsedData.deductions.section80CCD2 = chapVIA.Section80CCDEmployer || 0;
                parsedData.deductions.section80D = chapVIA.Section80D || 0;
                parsedData.deductions.section80TTA = chapVIA.Section80TTA || 0;
                parsedData.deductions.section80TTB = chapVIA.Section80TTB || 0;
                parsedData.deductions.section80G = chapVIA.Section80G || 0;
            }
            parsedData.deductions.section24B = partBTI.IncomeFromHP || 0;

        } else if (data.ITR && data.ITR.ITR4) {
            parsedData.itrFormType = "ITR-4";
            const itr4 = data.ITR.ITR4;
            const personalInfo = itr4.PersonalInfo || {};
            const assesseeName = personalInfo.AssesseeName || {};
            const address = personalInfo.Address || {};
            const totalIncome = itr4.TotalIncome || {};
            const incFromOS = totalIncome.IncFromOS || {};
            const deductChapVIA = itr4.DeductUndChapVIA || {};

            parsedData.clientName = `${assesseeName.FirstName || ''} ${assesseeName.SurNameOrOrgName || ''}`.trim();
            parsedData.pan = personalInfo.PAN || "N/A";
            parsedData.dob = personalInfo.DOB || "N/A";
            parsedData.address = `${address.ResidenceNo || ''}, ${address.RoadOrStreet || ''}, ${address.LocalityOrArea || ''}, ${address.CityOrTownOrDistrict || ''}, ${address.PinCode || ''}`.trim();

            parsedData.income.salary = totalIncome.Salaries || 0;
            parsedData.income.interestIncome = incFromOS.TotIncFromOS || 0;
            parsedData.income.otherIncome = incFromOS.TotIncFromOS || 0;
            parsedData.income.businessIncome = totalIncome.IncomeFromBusinessProf || 0;
            
            parsedData.deductions.section80C = deductChapVIA.Section80C || 0;
            parsedData.deductions.section80CCD1B = deductChapVIA.Section80CCD1B || 0;
            parsedData.deductions.section80CCD2 = deductChapVIA.Section80CCDEmployer || 0;
            parsedData.deductions.section80D = deductChapVIA.Section80D || 0;
            parsedData.deductions.section80TTA = deductChapVIA.Section80TTA || 0;
            parsedData.deductions.section80TTB = deductChapVIA.Section80TTB || 0;
            parsedData.deductions.section80G = deductChapVIA.Section80G || 0;

        } else if (data.personalInfo && data.personalInfo.pan) {
            parsedData.itrFormType = "Prefill";
            const pInfo = data.personalInfo;
            const assesseeName = pInfo.assesseeName || {};
            const address = pInfo.address || {};
            const insights = data.insights || {};
            const userDeduct = insights.UsrDeductUndChapVIAType || {};

            parsedData.clientName = `${assesseeName.firstName || ''} ${assesseeName.middleName || ''} ${assesseeName.surNameOrOrgName || ''}`.trim();
            parsedData.pan = pInfo.pan || "N/A";
            parsedData.dob = pInfo.dob || "N/A";
            parsedData.address = `${address.residenceNo || ''}, ${address.roadOrStreet || ''}, ${address.localityOrArea || ''}, ${address.cityOrTownOrDistrict || ''}, ${address.zipCode || ''}`.trim();
            parsedData.income.interestIncome = (insights.intrstFrmSavingBank || 0) + (insights.intrstFrmTermDeposit || 0);
            parsedData.income.otherIncome = (insights.scheduleOS?.incOthThanOwnRaceHorse?.intrstFrmOthers || 0);
            parsedData.deductions.section80TTB = userDeduct.Section80TTB || 0;
        }


        return parsedData;
    } catch (error) {
        console.error("Error parsing JSON:", error);
        throw new Error("Invalid JSON file or unsupported format.");
    }
};
