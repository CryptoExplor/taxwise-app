'use server';
/**
 * @fileOverview An AI agent that provides tax-saving insights and a financial profile summary.
 *
 * - suggestTaxRegime - A function that handles the tax analysis process.
 */

import {ai} from '@/ai/genkit';
import {
  TaxRegimeSuggestionInputSchema,
  TaxRegimeSuggestionOutputSchema,
  type TaxRegimeSuggestionInput,
  type TaxRegimeSuggestionOutput,
} from '@/ai/schemas';

export async function suggestTaxRegime(input: TaxRegimeSuggestionInput): Promise<TaxRegimeSuggestionOutput> {
  return suggestTaxRegimeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'taxRegimeSuggestionPrompt',
  input: {schema: TaxRegimeSuggestionInputSchema},
  output: {schema: TaxRegimeSuggestionOutputSchema},
  prompt: `Based on the following Indian income tax data for Assessment Year 2025-26, provide actionable tax-saving tips and a brief summary of the financial profile.
Client Name: {{{clientName}}}
PAN: {{{pan}}}
DOB: {{{dob}}}

Income Details:
- Salary: ₹{{{income.salary}}}
- Interest Income: ₹{{{income.interestIncome}}}
- Other Income: ₹{{{income.otherIncome}}}
- Business Income: ₹{{{income.businessIncome}}}
- Speculation Income: ₹{{{income.speculationIncome}}}
- F&O Income/Loss: ₹{{{income.fnoIncome}}}

Deductions Claimed:
- 80C: ₹{{{deductions.section80C}}}
- 80D: ₹{{{deductions.section80D}}}
- 80TTA: ₹{{{deductions.section80TTA}}}
- 80TTB: ₹{{{deductions.section80TTB}}}
- 80CCD(1B): ₹{{{deductions.section80CCD1B}}}
- 80CCD(2): ₹{{{deductions.section80CCD2}}}
- 80G: ₹{{{deductions.section80G}}}
- 24B (Home Loan Interest): ₹{{{deductions.section24B}}}

Capital Gains Transactions:
{{#each capitalGainsTransactions}}
- Asset: {{assetType}}, Purchased: {{purchaseDate}}, Sold: {{saleDate}}, Purchase Price: ₹{{purchasePrice}}, Sale Price: ₹{{salePrice}}
{{/each}}

Tax (Old Regime): ₹{{{taxOldRegime}}}
Tax (New Regime): ₹{{{taxNewRegime}}}

Provide the output as a single string for the 'insights' field. The insights should be focused on:
1. Potential areas for tax savings (e.g., missed deductions, optimizing investments).
2. Summary of the client's financial profile from a tax perspective.
3. Any red flags or areas requiring attention.
Ensure the response is concise, well-formatted with markdown, and directly actionable.
`,
});

const suggestTaxRegimeFlow = ai.defineFlow(
  {
    name: 'suggestTaxRegimeFlow',
    inputSchema: TaxRegimeSuggestionInputSchema,
    outputSchema: TaxRegimeSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
