export interface CapitalGainsTransaction {
  id: string; // Unique ID for React key prop
  assetType: 'equity_listed' | 'equity_mf' | 'property' | 'unlisted_shares' | 'other';
  purchaseDate: string;
  saleDate: string;
  purchasePrice: number;
  salePrice: number;
  expenses: number;
  fmv2018?: number;
}

export interface Income {
  salary: number;
  interestIncome: number;
  otherIncome: number;
  capitalGains: number; // Aggregate from JSON, for reference
  businessIncome: number;
  speculationIncome: number;
  fnoIncome: number;
}

export interface Deductions {
  section80C: number;
  section80CCD1B: number;
  section80CCD2: number;
  section80D: number;
  section80TTA: number;
  section80TTB: number;
  section80G: number;
  section24B: number;
}

export interface Client {
  id: string; // Firestore document ID
  createdAt: string;
  clientName: string;
  pan: string;
  dob: string;
  address: string;
  itrFormType: string;
  income: Income;
  deductions: Deductions;
  capitalGainsTransactions: CapitalGainsTransaction[];
  taxOldRegime: number;
  taxNewRegime: number;
}
