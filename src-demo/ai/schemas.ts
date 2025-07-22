import {z} from 'genkit';

const CapitalGainsTransactionSchema = z.object({
  id: z.string(),
  assetType: z.enum(['equity_listed', 'equity_mf', 'property', 'unlisted_shares', 'other']),
  purchaseDate: z.string(),
  saleDate: z.string(),
  purchasePrice: z.number(),
  salePrice: z.number(),
  expenses: z.number(),
  fmv2018: z.number().optional(),
});

export const TaxRegimeSuggestionInputSchema = z.object({
  clientName: z.string().describe('The name of the client.'),
  pan: z.string().describe('The PAN of the client.'),
  dob: z.string().describe('The date of birth of the client.'),
  income: z
    .object({
      salary: z.number().describe('Salary income.'),
      interestIncome: z.number().describe('Income from interest.'),
      otherIncome: z.number().describe('Other sources of income.'),
      businessIncome: z.number().describe('Income from business.'),
      speculationIncome: z.number().describe('Income from speculation.'),
      fnoIncome: z.number().describe('Income from F&O.'),
    })
    .describe('Income details of the user.'),
  deductions: z
    .object({
      section80C: z.number().describe('Deduction under section 80C.'),
      section80CCD1B: z.number().describe('Deduction under section 80CCD1B.'),
      section80CCD2: z.number().describe('Deduction under section 80CCD2.'),
      section80D: z.number().describe('Deduction under section 80D.'),
      section80TTA: z.number().describe('Deduction under section 80TTA.'),
      section80TTB: z.number().describe('Deduction under section 80TTB.'),
      section80G: z.number().describe('Deduction under section 80G.'),
      section24B: z.number().describe('Deduction under section 24B.'),
    })
    .describe('Deduction details of the user.'),
  capitalGainsTransactions: z.array(CapitalGainsTransactionSchema).describe('List of capital gains transactions.'),
  taxOldRegime: z.number().describe('Tax liability under the old regime.'),
  taxNewRegime: z.number().describe('Tax liability under the new regime.'),
}).describe('Client financial details for tax analysis.');

export type TaxRegimeSuggestionInput = z.infer<typeof TaxRegimeSuggestionInputSchema>;

export const TaxRegimeSuggestionOutputSchema = z.object({
  insights: z.string().describe('Actionable tax-saving tips, a summary of the financial profile, and any potential red flags.'),
});

export type TaxRegimeSuggestionOutput = z.infer<typeof TaxRegimeSuggestionOutputSchema>;
