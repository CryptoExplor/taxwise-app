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

export interface TaxComputation {
  taxableIncome: number;
  taxBeforeCess: number;
  rebate: number;
  taxAfterRebate: number;
  cess: number;
  totalTaxLiability: number;
  netTaxPayable: number;
  refund: number;
}

export interface ClientData {
  id: string;
  fileName: string;
  personalInfo: {
    name: string;
    pan: string;
    assessmentYear: string;
    age: number;
  };
  incomeDetails: IncomeDetails;
  deductions: Deductions;
  taxesPaid: TaxesPaid;
  taxComputation: TaxComputation;
}
