
import type { ClientData } from './types';

export function exportClientsToCSV(clients: ClientData[]) {
  if (clients.length === 0) {
    console.warn("No clients to export to CSV.");
    return;
  }

  const headers = [
    "Name", "PAN", "Assessment Year", "Tax Regime", "Age",
    "Gross Total Income", "Total Deductions", "Net Taxable Income",
    "Tax on Income", "87A Rebate", "Cess", "Total Tax Liability",
    "Total Tax Paid", "Refund Due", "Tax Payable"
  ];

  const rows = clients.map(client => [
    client.personalInfo.name,
    client.personalInfo.pan,
    client.personalInfo.assessmentYear,
    client.taxRegime,
    client.personalInfo.age,
    client.incomeDetails.grossTotalIncome?.toLocaleString('en-IN'),
    client.deductions.totalDeductions?.toLocaleString('en-IN'),
    client.taxComputation.taxableIncome?.toLocaleString('en-IN'),
    client.taxComputation.taxBeforeCess?.toLocaleString('en-IN'),
    client.taxComputation.rebate?.toLocaleString('en-IN'),
    client.taxComputation.cess?.toLocaleString('en-IN'),
    client.taxComputation.totalTaxLiability?.toLocaleString('en-IN'),
    client.taxesPaid.totalTaxPaid?.toLocaleString('en-IN'),
    client.taxComputation.refund?.toLocaleString('en-IN'),
    client.taxComputation.netTaxPayable?.toLocaleString('en-IN')
  ].map(cell => `"${cell ?? ''}"`)); // Handle null/undefined and quote all cells

  let csvContent = headers.map(header => `"${header}"`).join(",") + "\n";
  csvContent += rows.map(row => row.join(",")).join("\n");

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', 'TaxWise_Clients_Summary.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

    