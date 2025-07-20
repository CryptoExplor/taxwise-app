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

const TaxAnalysisInputSchema = z.object({
  personalInfo: z.object({
    name: z.string(),
    pan: z.string(),
    assessmentYear: z.string(),
    age: z.number(),
  }),
  incomeDetails: z.object({
    salary: z.number(),
    houseProperty: z.number(),
    businessIncome: z.number(),
    capitalGains: z.object({
      shortTerm: z.number(),
      longTerm: z.number(),
    }),
    otherSources: z.number(),
    grossTotalIncome: z.number(),
  }),
  deductions: z.object({
    section80C: z.number(),
    section80D: z.number(),
    totalDeductions: z.number(),
  }),
  taxRegime: z.enum(['Old', 'New']),
});

export type TaxAnalysisInput = z.infer<typeof TaxAnalysisInputSchema>;

const TaxAnalysisOutputSchema = z.object({
  summary: z.string().describe('A brief, insightful summary of the user\'s tax situation in 2-3 sentences. Mention the tax regime used.'),
  tips: z.array(z.string()).describe('A list of 2-3 actionable and personalized tax-saving tips based on the provided data. Tips should be relevant to the user\'s income and deduction profile.'),
});
export type TaxAnalysisOutput = z.infer<typeof TaxAnalysisOutputSchema>;


export async function getTaxAnalysis(input: Omit<ClientData, 'id' | 'taxComputation' | 'aiSummary' | 'aiTips'>): Promise<TaxAnalysisOutput> {
  // Map the ClientData subset to the TaxAnalysisInput schema
  const flowInput: TaxAnalysisInput = {
    personalInfo: input.personalInfo,
    incomeDetails: input.incomeDetails,
    deductions: input.deductions,
    taxRegime: input.taxRegime,
  };
  return taxAnalysisFlow(flowInput);
}

const prompt = ai.definePrompt({
  name: 'taxAnalysisPrompt',
  input: { schema: TaxAnalysisInputSchema },
  output: { schema: TaxAnalysisOutputSchema },
  prompt: `You are an expert Indian tax advisor. Analyze the following tax data for a client.
  
  Client Data:
  - Name: {{personalInfo.name}}
  - Age: {{personalInfo.age}}
  - Assessment Year: {{personalInfo.assessmentYear}}
  - Tax Regime: {{taxRegime}}
  - Gross Total Income: {{incomeDetails.grossTotalIncome}}
  - Total Deductions: {{deductions.totalDeductions}}
  - 80C Deductions: {{deductions.section80C}}
  - 80D Deductions: {{deductions.section80D}}

  Based on this data, provide:
  1. A concise summary of their tax profile.
  2. 2-3 practical and personalized tax-saving tips. For example, if 80C is not fully utilized, suggest options like ELSS, PPF, etc. If 80D is low, suggest health insurance. If they are in the Old regime with low deductions, suggest evaluating the New regime for the next year. Be specific and actionable.
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
