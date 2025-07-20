import type { ClientData, TaxesPaid } from './types';

// This is a mock parser. In a real application, you would parse the actual ITR JSON structure.
export async function parseITR(file: File): Promise<Omit<ClientData, 'id' | 'taxComputation'>> {
  // Reading file is async, so we simulate it with a short delay
  await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 500)); 

  // In a real scenario, you'd use FileReader to read and JSON.parse the file content.
  // const text = await file.text();
  // const itrData = JSON.parse(text);
  // From itrData, you would extract all the necessary fields.

  // For now, we return mock data based on the user's prompt example, with some randomization.
  const salary = 400000 + Math.floor(Math.random() * 1500000);
  const otherSources = 10000 + Math.floor(Math.random() * 40000);
  const grossTotalIncome = salary + otherSources;
  
  const section80C = Math.min(150000, Math.floor(Math.random() * 160000));
  const section80D = Math.min(25000, Math.floor(Math.random() * 30000));
  const totalDeductions = section80C + section80D;

  const taxesPaid: TaxesPaid = {
    tds: Math.floor(salary * (Math.random() * 0.1 + 0.05)),
    advanceTax: Math.floor(Math.random() * 15000),
  };

  return {
    fileName: file.name,
    personalInfo: {
      name: "Ravi Kumar", // Mocked
      pan: "ABCDE1234F", // Mocked
      assessmentYear: "2024-25", // Mocked
      age: 30 + Math.floor(Math.random() * 30), // Random age between 30 and 60
    },
    incomeDetails: {
      salary,
      houseProperty: 0,
      businessIncome: 0,
      capitalGains: { shortTerm: 0, longTerm: 0 },
      otherSources,
      grossTotalIncome,
    },
    deductions: {
      section80C,
      section80D,
      totalDeductions,
    },
    taxesPaid
  };
}
