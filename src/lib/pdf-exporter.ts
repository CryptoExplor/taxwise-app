import type { ClientData } from './types';
import { formatCurrency } from './utils';

export async function generatePDF(clientData: ClientData) {
  const { jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF();
  const { personalInfo, incomeDetails, deductions, taxesPaid, taxComputation } = clientData;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('TaxWise Summary', 14, 22);

  doc.setFontSize(12);
  doc.text(`Assessment Year: ${personalInfo.assessmentYear}`, 14, 30);

  autoTable(doc, {
    startY: 40,
    head: [['Personal Information', '']],
    body: [
      ['Name', personalInfo.name],
      ['PAN', personalInfo.pan],
      ['Age', personalInfo.age.toString()],
    ],
    theme: 'striped',
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Income Details (₹)', 'Amount']],
    body: [
      ['Salary', formatCurrency(incomeDetails.salary)],
      ['House Property', formatCurrency(incomeDetails.houseProperty)],
      ['Business & Profession', formatCurrency(incomeDetails.businessIncome)],
      ['Capital Gains', formatCurrency(incomeDetails.capitalGains.shortTerm + incomeDetails.capitalGains.longTerm)],
      ['Other Sources', formatCurrency(incomeDetails.otherSources)],
      [{ content: 'Gross Total Income', styles: { fontStyle: 'bold' } }, { content: formatCurrency(incomeDetails.grossTotalIncome), styles: { fontStyle: 'bold' } }],
    ],
    theme: 'grid',
  });
  
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Deductions (₹)', 'Amount']],
    body: [
      ['Section 80C', formatCurrency(deductions.section80C)],
      ['Section 80D', formatCurrency(deductions.section80D)],
      [{ content: 'Total Deductions', styles: { fontStyle: 'bold' } }, { content: formatCurrency(deductions.totalDeductions), styles: { fontStyle: 'bold' } }],
    ],
    theme: 'grid',
  });

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 10,
    head: [['Tax Calculation (₹)', 'Amount']],
    body: [
      ['Net Taxable Income', formatCurrency(taxComputation.taxableIncome)],
      ['Tax Before Cess', formatCurrency(taxComputation.taxBeforeCess)],
      ['Rebate (u/s 87A)', formatCurrency(taxComputation.rebate)],
      ['Tax after Rebate', formatCurrency(taxComputation.taxAfterRebate)],
      ['Health & Edu. Cess (4%)', formatCurrency(taxComputation.cess)],
      [{ content: 'Total Tax Liability', styles: { fontStyle: 'bold' } }, { content: formatCurrency(taxComputation.totalTaxLiability), styles: { fontStyle: 'bold' } }],
      ['TDS', formatCurrency(taxesPaid.tds)],
      ['Advance Tax', formatCurrency(taxesPaid.advanceTax)],
      taxComputation.netTaxPayable > 0
        ? [{ content: 'Net Tax Payable', styles: { fontStyle: 'bold', textColor: [200, 0, 0] } }, { content: formatCurrency(taxComputation.netTaxPayable), styles: { fontStyle: 'bold' } }]
        : [{ content: 'Refund Due', styles: { fontStyle: 'bold', textColor: [0, 150, 0] } }, { content: formatCurrency(taxComputation.refund), styles: { fontStyle: 'bold' } }],
    ],
    theme: 'striped',
  });
  
  doc.save(`${personalInfo.pan}_${personalInfo.assessmentYear}_TaxSummary.pdf`);
}
