
import type { Timestamp } from 'firebase/firestore';

export interface IncomeDetails {
  salary: number;
  houseProperty: number;
  businessIncome: number;
  capitalGains: {
    shortTerm: number;
    longTerm: number;
  };
  otherSources: number; // Catch-all for miscellaneous items
  interestIncomeFD?: number;
  interestIncomeSaving?: number;
  dividendIncome?: number;
  grossTotalIncome: number;
}


export interface Deductions {
  section80C: number;
  section80D: number;
  interestOnBorrowedCapital?: number; // Home Loan Interest
  section80CCD1B?: number;
  section80CCD2?: number;
  section80G?: number;
  section80TTA?: number;
  section80TTB?: number;
  totalDeductions: number;
}


export interface TaxesPaid {
  tds: number;
  advanceTax: number;
  totalTaxPaid: number;
}

export interface TaxSlab {
    range: string;
    amount: number;
    rate: number;
    tax: number;
}

export interface TaxComputationResult {
  taxableIncome: number;
  taxBeforeCess: number;
  rebate: number;
  taxAfterRebate: number;
  cess: number;
  totalTaxLiability: number;
  slabBreakdown?: TaxSlab[]; // Optional because it might not exist on old data
}

export interface TaxComputation extends TaxComputationResult {
  netTaxPayable: number;
  refund: number;
}

export interface PersonalInfo {
    name: string;
    pan: string;
    assessmentYear: string;
    age: number;
    itrForm?: string; // To store detected ITR form type
}

// Data structure for data to be saved to Firestore
export interface ClientDataToSave {
  fileName: string;
  createdAt: Date;
  personalInfo: PersonalInfo;
  incomeDetails: IncomeDetails;
  deductions: Deductions;
  taxesPaid: TaxesPaid;
  taxComputation: TaxComputation;
  taxRegime: 'Old' | 'New';
  // Add a new field to store the comparison
  taxComparison?: {
    oldRegime: TaxComputationResult;
    newRegime: TaxComputationResult;
  };
  aiSummary?: string;
  aiTips?: string[];
}


// Data structure used in the application, includes the Firestore document ID
export interface ClientData extends ClientDataToSave {
  id: string;
  createdAt: Timestamp; // Firestore returns a Timestamp object
}
