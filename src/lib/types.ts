
export interface CapitalGainsTransaction {
    id: string;
    assetType: 'equity_listed' | 'property' | 'unlisted_shares' | 'other';
    purchaseDate: string;
    saleDate: string;
    purchasePrice: number;
    salePrice: number;
    expenses: number;
    fmv2018: number;
}

export interface IncomeData {
    salary: number;
    interestIncome: number;
    otherIncome: number;
    capitalGains: number; // Placeholder for aggregate from JSON
    businessIncome: number;
    speculationIncome: number;
    fnoIncome: number;
}

export interface DeductionData {
    section80C: number;
    section80CCD1B: number;
    section80CCD2: number;
    section80D: number;
    section80TTA: number;
    section80TTB: number;
    section80G: number;
    section24B: number;
}

export interface ClientData {
    id: string | null;
    createdAt: string;
    clientName: string;
    pan: string;
    dob: string;
    address: string;
    itrFormType: string;
    income: IncomeData;
    deductions: DeductionData;
    capitalGainsTransactions: CapitalGainsTransaction[];
    taxOldRegime?: number;
    taxNewRegime?: number;
}
