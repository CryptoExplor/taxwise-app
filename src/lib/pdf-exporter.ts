import type { ClientData } from './types';
import { formatCurrency } from './utils';

export async function generatePDF(clientData: ClientData) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const { personalInfo, incomeDetails, deductions, taxesPaid, taxComputation } = clientData;

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
      ['TDS & Advance Tax Paid', formatCurrency(taxesPaid.tds + taxesPaid.advanceTax)],
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

  doc.save(`${personalInfo.name}_${personalInfo.assessmentYear}_ITR_Summary.pdf`);
}
