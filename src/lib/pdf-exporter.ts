
import type { ClientData } from './types';

declare const window: any;

export function generatePdfReport(client: ClientData) {
    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.autoTable === 'undefined') {
        alert("PDF generation libraries not loaded. Please try again.");
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("TaxWise Tax Computation Report", 14, 22);
    doc.setFontSize(12);
    doc.text(`Client Name: ${client.clientName}`, 14, 30);
    doc.text(`PAN: ${client.pan}`, 14, 37);
    doc.text(`ITR Form Type: ${client.itrFormType}`, 14, 44);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 51);

    const incomeData = Object.entries(client.income).map(([key, value]) => [
        key.replace(/([A-Z])/g, ' $1').trim(),
        `₹${Number(value).toLocaleString('en-IN')}`
    ]);
    doc.autoTable({
        startY: 60,
        head: [['Income Head', 'Amount']],
        body: incomeData,
        theme: 'striped',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [23, 100, 191] },
    });

    const deductionsData = Object.entries(client.deductions).map(([key, value]) => [
        key.replace(/([A-Z])/g, ' $1').replace('section', 'Section '),
        `₹${Number(value).toLocaleString('en-IN')}`
    ]);
    doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Deduction Section', 'Amount']],
        body: deductionsData,
        theme: 'striped',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [23, 100, 191] },
    });

    const taxComparisonData = [
        ['Old Regime Tax', `₹${(client.taxOldRegime || 0).toLocaleString('en-IN')}`],
        ['New Regime Tax', `₹${(client.taxNewRegime || 0).toLocaleString('en-IN')}`]
    ];
    doc.autoTable({
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [['Regime', 'Tax Payable']],
        body: taxComparisonData,
        theme: 'grid',
        styles: { fontSize: 12, fontStyle: 'bold' },
        headStyles: { fillColor: [23, 100, 191] },
    });

    doc.save(`${client.clientName}_Tax_Computation.pdf`);
}

export function exportClientsToCsv(clients: ClientData[]) {
    if (clients.length === 0) {
        alert("No clients to export.");
        return;
    }

    const headers = [
        "ID", "Client Name", "PAN", "DOB", "Address", "ITR Form Type",
        ...Object.keys(clients[0]?.income || {}).map(k => `Income: ${k}`),
        ...Object.keys(clients[0]?.deductions || {}).map(k => `Deduction: ${k}`),
        "Tax (Old Regime)", "Tax (New Regime)", "Created At"
    ];

    const csvRows = clients.map(client => {
        const income = client.income || {};
        const deductions = client.deductions || {};
        const row = [
            client.id,
            `"${client.clientName}"`,
            client.pan,
            client.dob,
            `"${(client.address || "").replace(/"/g, '""')}"`,
            client.itrFormType,
            ...Object.values(income).map(v => v),
            ...Object.values(deductions).map(v => v),
            client.taxOldRegime,
            client.taxNewRegime,
            client.createdAt,
        ];
        return row.join(',');
    });

    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'taxwise_clients.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
