
'use server';
/**
 * @fileOverview An AI agent for analyzing tax data and providing insights.
 *
 * - getTaxAnalysis - A function that returns a summary and tax-saving tips.
 * - TaxAnalysisInput - The input type for the getTaxAnalysis function.
 * - TaxAnalysisOutput - The return type for the getTaxAnalysis function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { ClientData } from '@/lib/types';

// Define the Zod schema for the input, reflecting the ClientData structure
const TaxAnalysisInputSchema = z.object({
  clientName: z.string(),
  pan: z.string(),
  dob: z.string(),
  income: z.object({
    salary: z.number(),
    interestIncome: z.number(),
    otherIncome: z.number(),
    capitalGains: z.number(),
    businessIncome: z.number(),
    speculationIncome: z.number(),
    fnoIncome: z.number(),
  }),
  deductions: z.object({
    section80C: z.number(),
    section80CCD1B: z.number(),
    section80CCD2: z.number(),
    section80D: z.number(),
    section80TTA: z.number(),
    section80TTB: z.number(),
    section80G: z.number(),
    section24B: z.number(),
  }),
  capitalGainsTransactions: z.array(z.object({
      id: z.string(),
      assetType: z.string(),
      purchaseDate: z.string(),
      saleDate: z.string(),
      purchasePrice: z.number(),
      salePrice: z.number(),
      expenses: z.number(),
      fmv2018: z.number().optional(),
  })),
  taxOldRegime: z.number().optional(),
  taxNewRegime: z.number().optional(),
});

export type TaxAnalysisInput = z.infer<typeof TaxAnalysisInputSchema>;

const TaxAnalysisOutputSchema = z.object({
  summary: z.string().describe('A brief, insightful summary of the user\'s tax situation in 2-3 sentences. Mention the more beneficial tax regime.'),
  tips: z.array(z.string()).describe('A list of 2-3 actionable and personalized tax-saving tips based on the provided data. Tips should be relevant to the user\'s income and deduction profile.'),
});
export type TaxAnalysisOutput = z.infer<typeof TaxAnalysisOutputSchema>;


export async function getTaxAnalysis(input: ClientData): Promise<TaxAnalysisOutput> {
  // Directly use the ClientData as it matches the schema.
  return taxAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'taxAnalysisPrompt',
  input: { schema: TaxAnalysisInputSchema },
  output: { schema: TaxAnalysisOutputSchema },
  prompt: `You are an expert Indian tax advisor. Analyze the following tax data for Assessment Year 2025-26.
  
  Client Data:
  - Name: {{clientName}}
  - Date of Birth: {{dob}}
  - Gross Total Income (before deductions): {{income.salary}} + {{income.interestIncome}} + {{income.otherIncome}} + {{income.businessIncome}} + {{income.speculationIncome}} + {{income.fnoIncome}}
  - Total Deductions: {{deductions.section80C}} + {{deductions.section80D}} + ...
  - 80C Deductions: {{deductions.section80C}}
  - 80D Deductions: {{deductions.section80D}}
  - Capital Gains Transactions: {{json capitalGainsTransactions}}
  - Computed Tax (Old Regime): {{taxOldRegime}}
  - Computed Tax (New Regime): {{taxNewRegime}}

  Based on this data, provide:
  1. A concise summary of their tax profile. Highlight the most beneficial tax regime and the potential tax saving.
  2. 2-3 practical and personalized tax-saving tips. Be specific. For example, if 80C is not fully utilized, suggest options like ELSS, PPF. If 80D is low, suggest health insurance. If they have high capital gains, suggest tax-loss harvesting if applicable.
  `,
});

const taxAnalysisFlow = ai.defineFlow(
  {
    name: 'taxAnalysisFlow',
    inputSchema: TaxAnalysisInputSchema,
    outputSchema: TaxAnalysisOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
