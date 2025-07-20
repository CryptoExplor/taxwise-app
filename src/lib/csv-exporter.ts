import type { ClientData } from './types';

export function exportClientsToCSV(clients: ClientData[]) {
  if (clients.length === 0) return;

  const headers = [
    'File Name', 'Name', 'PAN', 'Assessment Year',
    'Gross Total Income', 'Total Deductions', 'Net Taxable Income',
    'Total Tax Liability', 'TDS', 'Advance Tax', 'Net Tax Payable', 'Refund Due'
  ];

  const rows = clients.map(client => [
    client.fileName,
    client.personalInfo.name,
    client.personalInfo.pan,
    client.personalInfo.assessmentYear,
    client.incomeDetails.grossTotalIncome,
    client.deductions.totalDeductions,
    client.taxComputation.taxableIncome,
    client.taxComputation.totalTaxLiability,
    client.taxesPaid.tds,
    client.taxesPaid.advanceTax,
    client.taxComputation.netTaxPayable,
    client.taxComputation.refund
  ]);

  let csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n" 
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "TaxWise_Clients_Summary.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
