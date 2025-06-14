"use client";

const mockInvoices = [
  {
    id: 1,
    date: "2024-06-01",
    number: "INV-1001",
    amount: 120.0,
    status: "Paid",
  },
  {
    id: 2,
    date: "2024-05-15",
    number: "INV-1000",
    amount: 95.5,
    status: "Unpaid",
  },
  {
    id: 3,
    date: "2024-04-30",
    number: "INV-0999",
    amount: 150.0,
    status: "Paid",
  },
];

export default function InvoicesPage() {
  return (
    <div className="max-w-4xl mx-auto py-10 bg-white dark:bg-gray-900 rounded-xl shadow p-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Invoices</h1>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
        <table className="w-full text-left">
          <thead>
            <tr className="text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
              <th className="py-2">Date</th>
              <th className="py-2">Invoice #</th>
              <th className="py-2">Amount</th>
              <th className="py-2">Status</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {mockInvoices.map((inv) => (
              <tr key={inv.id} className="border-b dark:border-gray-800">
                <td className="py-2 text-gray-700 dark:text-gray-200">{inv.date}</td>
                <td className="py-2 text-gray-900 dark:text-gray-100 font-semibold">{inv.number}</td>
                <td className="py-2 text-gray-700 dark:text-gray-200">${inv.amount.toFixed(2)}</td>
                <td className={`py-2 font-medium ${inv.status === 'Paid' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{inv.status}</td>
                <td className="py-2">
                  <button className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {mockInvoices.length === 0 && (
          <div className="text-gray-400 text-center py-8">No invoices found.</div>
        )}
      </div>
    </div>
  );
} 