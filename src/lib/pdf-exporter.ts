
import type { ClientData } from './types';

declare const window: any;

export function generatePdfReport(client: ClientData) {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.autoTable === 'undefined') {
        alert("PDF generation libraries not loaded. Please try again.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Header
    doc.setFontSize(18);
    doc.text("TaxWise Tax Computation Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Assessment Year: ${client.assessmentYear}`, 14, 30);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 200, 32);

    // Client Details
    doc.setFontSize(12);
    doc.text(`Client Name: ${client.personalInfo.name}`, 14, 40);
    doc.text(`PAN: ${client.personalInfo.pan}`, 120, 40);
    doc.text(`Filing Status: ${client.filingStatus}`, 14, 47);


    const startY = 55;

    // Income Details Table
    const incomeData = client.incomeDetails ? Object.entries(client.incomeDetails).map(([key, value]) => [
        key.replace(/([A-Z])/g, ' $1').trim().replace(/\b\w/g, c => c.toUpperCase()),
        `₹ ${Number(value).toLocaleString('en-IN')}`
    ]) : [];
    doc.autoTable({
        startY: startY,
        head: [['Income Head', 'Amount']],
        body: incomeData,
        theme: 'striped',
        headStyles: { fillColor: [22, 163, 74] }, // Green-600
        didDrawPage: (data: any) => {
            doc.setFontSize(14);
            doc.text("1. Income Summary", 14, data.cursor.y - 10);
        }
    });

    // Deductions Table
    const deductionsData = client.deductions ? Object.entries(client.deductions).map(([key, value]) => [
        key.replace(/([A-Z])/g, ' $1').replace('section', 'Section ').trim().replace(/\b\w/g, c => c.toUpperCase()),
        `₹ ${Number(value).toLocaleString('en-IN')}`
    ]) : [];
    doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Deduction Section', 'Amount']],
        body: deductionsData,
        theme: 'striped',
        headStyles: { fillColor: [219, 39, 119] }, // Pink-600
        didDrawPage: (data: any) => {
            doc.setFontSize(14);
            doc.text("2. Deductions under Chapter VI-A", 14, data.cursor.y - 10);
        }
    });
    
    // Tax Computation Summary
    const taxSummaryData = [
        ['Net Taxable Income', `₹ ${client.netTaxableIncome.toLocaleString('en-IN')}`],
        ['Tax on Total Income', `₹ ${client.taxComputation.taxOnIncome.toLocaleString('en-IN')}`],
        ['Health & Education Cess (4%)', `₹ ${client.taxComputation.cess.toLocaleString('en-IN')}`],
        ['Total Tax Liability', `₹ ${client.taxComputation.totalTaxLiability.toLocaleString('en-IN')}`],
    ];
     doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Tax Computation', 'Amount']],
        body: taxSummaryData,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235] }, // Blue-600
         didDrawPage: (data: any) => {
            doc.setFontSize(14);
            doc.text("3. Tax Liability Summary", 14, data.cursor.y - 10);
        }
    });

    // Final Settlement
    const finalSettlementData = [
        ['Total Tax Liability', `₹ ${client.finalSettlement.taxLiability.toLocaleString('en-IN')}`],
        ['Total Tax Paid (TDS, Advance Tax, etc.)', `₹ ${client.finalSettlement.taxPaid.toLocaleString('en-IN')}`],
        ['Tax Payable', `₹ ${client.finalSettlement.taxPayable.toLocaleString('en-IN')}`],
        ['Refund Due', `₹ ${client.finalSettlement.refundDue.toLocaleString('en-IN')}`],
    ];

    doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Final Settlement', 'Amount']],
        body: finalSettlementData,
        theme: 'grid',
        headStyles: { fillColor: [245, 158, 11] }, // Amber-500
        didDrawPage: (data: any) => {
            doc.setFontSize(14);
            doc.text("4. Final Tax Settlement", 14, data.cursor.y - 10);
        }
    });


    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount} | Generated by TaxWise`, 14, doc.internal.pageSize.height - 10);
    }

    doc.save(`${client.personalInfo.name}_Tax_Computation_${client.assessmentYear}.pdf`);
}
