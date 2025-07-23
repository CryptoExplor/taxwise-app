
export interface IncomeDetails {
  salary: number;
  houseProperty: number;
  businessIncome: number;
  capitalGains: {
    shortTerm: number;
    longTerm: number;
  };
  otherSources: number;
  grossTotalIncome: number;
}

export interface Deductions {
  section80C: number;
  section80D: number;
  section80G: number;
  totalDeductions: number;
}

export interface TaxComputation {
  taxOnIncome: number;
  cess: number;
  totalTaxLiability: number;
}

export interface TaxPaid {
  tdsSalary: number;
  tdsOthers: number;
  advanceTax: number;
  selfAssessmentTax: number;
  totalTaxPaid: number;
}

export interface FinalSettlement {
  taxLiability: number;
  taxPaid: number;
  refundDue: number;
  taxPayable: number;
}


export interface ClientData {
  id?: string;
  createdAt: string;
  // Basic Metadata
  clientName: string;
  pan: string;
  assessmentYear: string;
  filingStatus: string;
  
  // Computed Data
  incomeDetails: IncomeDetails;
  deductions: Deductions;
  netTaxableIncome: number;
  taxRegime: 'Old Regime' | 'New Regime';
  taxComputation: TaxComputation;
  taxPaid: TaxPaid;
  finalSettlement: FinalSettlement;
  
  // App-specific data
  notes: string;
  uploadedBy: string;
  jsonRef?: string; // Link to the original file in Firebase Storage
}
