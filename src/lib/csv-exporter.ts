
import type { ClientData } from './types';

export function exportClientsToCsv(clients: ClientData[]) {
  if (clients.length === 0) {
    alert("No clients to export.");
    return;
  }

  const headers = [
    "Client Name", "PAN", "Assessment Year", "Tax Regime", "Filing Status",
    "Salary Income", "House Property Income", "Business Income", "Capital Gains (Total)", "Other Sources Income", "Gross Total Income",
    "80C", "80D", "80G", "Total Deductions",
    "Net Taxable Income",
    "Tax on Income", "Cess", "Total Tax Liability",
    "TDS Salary", "TDS Others", "Advance Tax", "Self Assessment Tax", "Total Tax Paid",
    "Refund Due", "Tax Payable"
  ];

  const csvRows = clients.map(client => {
    const row = [
      `"${client.clientName}"`,
      client.pan,
      client.assessmentYear,
      client.taxRegime,
      client.filingStatus,

      client.incomeDetails.salary,
      client.incomeDetails.houseProperty,
      client.incomeDetails.businessIncome,
      client.incomeDetails.capitalGains.shortTerm + client.incomeDetails.capitalGains.longTerm,
      client.incomeDetails.otherSources,
      client.incomeDetails.grossTotalIncome,

      client.deductions.section80C,
      client.deductions.section80D,
      client.deductions.section80G,
      client.deductions.totalDeductions,

      client.netTaxableIncome,

      client.taxComputation.taxOnIncome,
      client.taxComputation.cess,
      client.taxComputation.totalTaxLiability,

      client.taxPaid.tdsSalary,
      client.taxPaid.tdsOthers,
      client.taxPaid.advanceTax,
      client.taxPaid.selfAssessmentTax,
      client.taxPaid.totalTaxPaid,

      client.finalSettlement.refundDue,
      client.finalSettlement.taxPayable,
    ];
    return row.join(',');
  });

  const csvString = [headers.join(','), ...csvRows].join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', 'taxwise_clients_summary.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
