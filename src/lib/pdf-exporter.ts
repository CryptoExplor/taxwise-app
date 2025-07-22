
import type { ClientData } from './types';
import { formatCurrency } from './utils';

// Type for the data coming from the Tax Calculator page
interface CalculatorData {
  grossTotalIncome: number;
  totalDeductions: number;
  age: number;
  taxRegime: 'Old' | 'New';
  assessmentYear: string; 
  comparisonResult: {
    oldRegimeTax: number;
    newRegimeTax: number;
  };
}

export async function generateCalculatorPDF(calculatorData: CalculatorData) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const { grossTotalIncome, totalDeductions, age, taxRegime, comparisonResult } = calculatorData;

  doc.setFontSize(18);
  doc.text('Quick Tax Calculation Report', 14, 22);

  doc.setFontSize(12);
  doc.text(`Assessment Year: ${'2024-25'}`, 14, 32);

  // --- Input Details ---
  doc.setFontSize(14);
  doc.text("Inputs Provided", 14, 45);
  autoTable(doc, {
    startY: 48,
    head: [['Description', 'Value']],
    body: [
      ['Gross Total Income', formatCurrency(grossTotalIncome)],
      ['Total Deductions (for Old Regime)', formatCurrency(totalDeductions)],
      ['Age', age.toString()],
      ['Chosen Tax Regime', taxRegime],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 15;

  // --- Comparison Summary ---
  doc.setFontSize(14);
  doc.text("Regime Comparison Summary", 14, finalY);
  autoTable(doc, {
    startY: finalY + 3,
    head: [['Tax Regime', 'Total Tax Payable']],
    body: [
      ['Old Regime', formatCurrency(comparisonResult.oldRegimeTax)],
      ['New Regime', formatCurrency(comparisonResult.newRegimeTax)],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
  });

   finalY = (doc as any).lastAutoTable.finalY + 10;
   
   const savingsNewVsOld = comparisonResult.oldRegimeTax - comparisonResult.newRegimeTax;
   let conclusionText = '';
   if (savingsNewVsOld > 0) {
       conclusionText = `The New Regime appears more beneficial, saving you ${formatCurrency(savingsNewVsOld)}.`;
   } else if (savingsNewVsOld < 0) {
       conclusionText = `The Old Regime appears more beneficial, saving you ${formatCurrency(-savingsNewVsOld)}.`;
   } else {
       conclusionText = 'Both regimes result in the same tax liability.'
   }

   doc.setFontSize(12);
   doc.text('Conclusion:', 14, finalY);
   doc.setFont('helvetica', 'bold');
   doc.text(conclusionText, 14, finalY + 7);


  // --- Footer ---
  finalY = doc.internal.pageSize.height - 20;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'Disclaimer: This is an estimate based on the data provided and standard rules for AY 2024-25. It does not include surcharge or other complexities. Consult a tax professional for exact figures.',
    14,
    finalY,
    { maxWidth: 180 }
  );


  doc.save(`TaxWise_Calculation_${'2024-25'}.pdf`);
}


export async function generatePDF(clientData: ClientData, footerText?: string) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const { personalInfo, incomeDetails, deductions, taxesPaid, taxComputation } = clientData;

  const addFooter = () => {
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          const text = footerText || "ITR Summary";
          const textWidth = doc.getStringUnitWidth(text) * doc.getFontSize() / doc.internal.scaleFactor;
          const textX = (doc.internal.pageSize.width - textWidth) / 2;
          doc.text(text, textX, doc.internal.pageSize.height - 10);
      }
  };

  doc.setFontSize(18);
  doc.text('ITR Summary Report', 14, 22);

  doc.setFontSize(12);
  doc.text(`Client Name: ${personalInfo.name}`, 14, 32);
  doc.text(`PAN: ${personalInfo.pan}`, 14, 39);
  doc.text(`Assessment Year: ${personalInfo.assessmentYear}`, 14, 46);
  doc.text(`Tax Regime: ${clientData.taxRegime}`, 14, 53);
  doc.text(`Age: ${personalInfo.age}`, 14, 60);

  doc.setFontSize(14);
  doc.text("Income Details", 14, 77);
  autoTable(doc, {
    startY: 80,
    head: [['Income Head', 'Amount (₹)']],
    body: [
      ['Salary', formatCurrency(incomeDetails.salary)],
      ['House Property', formatCurrency(incomeDetails.houseProperty)],
      ['Business Income', formatCurrency(incomeDetails.businessIncome)],
      ['Capital Gains', formatCurrency(incomeDetails.capitalGains.shortTerm + incomeDetails.capitalGains.longTerm)],
      ['Other Sources', formatCurrency(incomeDetails.otherSources)],
      [{ content: 'Gross Total Income', styles: { fontStyle: 'bold' } }, { content: formatCurrency(incomeDetails.grossTotalIncome), styles: { fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text("Deductions", 14, finalY);
  autoTable(doc, {
    startY: finalY + 3,
    head: [['Section', 'Amount (₹)']],
    body: [
      ['80C', formatCurrency(deductions.section80C)],
      ['80D', formatCurrency(deductions.section80D)],
      [{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: formatCurrency(deductions.totalDeductions), styles: { fontStyle: 'bold' } }],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text("Tax Computation & Payment", 14, finalY);
  autoTable(doc, {
    startY: finalY + 3,
    head: [['Description', 'Amount (₹)']],
    body: [
      ['Net Taxable Income', formatCurrency(taxComputation.taxableIncome)],
      ['Tax on Income', formatCurrency(taxComputation.taxBeforeCess)],
      ['87A Rebate', formatCurrency(taxComputation.rebate)],
      ['Cess', formatCurrency(taxComputation.cess)],
      [{ content: 'Total Tax Liability', styles: { fontStyle: 'bold' } }, { content: formatCurrency(taxComputation.totalTaxLiability), styles: { fontStyle: 'bold' } }],
      ['TDS & Advance Tax Paid', formatCurrency(taxesPaid.totalTaxPaid)],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.text("Final Settlement", 14, finalY);
  autoTable(doc, {
    startY: finalY + 3,
    head: [['Description', 'Amount (₹)']],
    body: [
        taxComputation.netTaxPayable > 0
        ? [{ content: 'Net Tax Payable', styles: { fontStyle: 'bold', textColor: [200, 0, 0] } }, { content: formatCurrency(taxComputation.netTaxPayable), styles: { fontStyle: 'bold', textColor: [200, 0, 0] } }]
        : [{ content: 'Refund Due', styles: { fontStyle: 'bold', textColor: [0, 150, 0] } }, { content: formatCurrency(taxComputation.refund), styles: { fontStyle: 'bold', textColor: [0, 150, 0] } }],
    ],
    theme: 'grid',
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0] },
  });

  addFooter();
  doc.save(`${personalInfo.name}_${personalInfo.assessmentYear}_ITR_Summary.pdf`);
}

    