"use server";

import { suggestTaxRegime } from '@/ai/flows/tax-regime-suggestion';
import type { TaxRegimeSuggestionInput } from '@/ai/schemas';
import type { Client } from '@/types';

export async function getTaxRegimeSuggestion(client: Client) {
  try {
    const input: TaxRegimeSuggestionInput = {
      clientName: client.clientName,
      pan: client.pan,
      dob: client.dob,
      income: {
        salary: client.income.salary,
        interestIncome: client.income.interestIncome,
        otherIncome: client.income.otherIncome,
        businessIncome: client.income.businessIncome,
        speculationIncome: client.income.speculationIncome,
        fnoIncome: client.income.fnoIncome,
      },
      deductions: {
        section80C: client.deductions.section80C,
        section80CCD1B: client.deductions.section80CCD1B,
        section80CCD2: client.deductions.section80CCD2,
        section80D: client.deductions.section80D,
        section80TTA: client.deductions.section80TTA,
        section80TTB: client.deductions.section80TTB,
        section80G: client.deductions.section80G,
        section24B: client.deductions.section24B,
      },
      capitalGainsTransactions: client.capitalGainsTransactions,
      taxOldRegime: client.taxOldRegime,
      taxNewRegime: client.taxNewRegime,
    };

    const result = await suggestTaxRegime(input);
    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting tax regime suggestion:", error);
    return { success: false, error: "Failed to get AI suggestion." };
  }
}
