
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
  totalDeductions: number;
}

export interface TaxesPaid {
  tds: number;
  advanceTax: number;
}

export interface TaxComputationResult {
  taxableIncome: number;
  taxBeforeCess: number;
  rebate: number;
  taxAfterRebate: number;
  cess: number;
  totalTaxLiability: number;
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
}

export interface ClientData {
  id: string;
  fileName: string;
  personalInfo: PersonalInfo;
  incomeDetails: IncomeDetails;
  deductions: Deductions;
  taxesPaid: TaxesPaid;
  taxComputation: TaxComputation;
  taxRegime: 'Old' | 'New';
  aiSummary?: string;
  aiTips?: string[];
}
