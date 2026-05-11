import { useEffect, useState } from 'react';

type DebtRow = {
  id: string;
  invoiceReceipt?: string | null;
  purchaseDate: string;
  totalAmount: number | string;
  paid_amount: number | string;
  due_amount: number | string;
};

export default function DebtorDetailsModal({ supplierId, isOpen, onClose }: { supplierId: string | null; isOpen: boolean; onClose: () => void; }) {
  const [loading, setLoading] = useState(false);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !supplierId) return;
    setLoading(true);
    setError(null);
    fetch(`${import.meta.env.VITE_BASE_URL}/utils/debtors/${supplierId}`)
      .then((r) => r.json())
      .then((data) => {
        setDebts(data.debts || []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [isOpen, supplierId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-6">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-bold">Debtor details</h3>
          <button onClick={onClose} className="text-sm text-gray-600">Close</button>
        </div>
        <div className="p-4">
          {loading ? <div>Loading...</div> : error ? <div className="text-red-600">{error}</div> : (
            <div className="space-y-3">
              {debts.length === 0 ? <div className="text-sm text-gray-500">No outstanding debts</div> : (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th className="py-2">Invoice</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Total</th>
                      <th className="py-2">Paid</th>
                      <th className="py-2">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {debts.map(d => (
                      <tr key={d.id} className="border-t">
                        <td className="py-2">{d.invoiceReceipt || `#${String(d.id).slice(0,8)}`}</td>
                        <td className="py-2">{new Date(d.purchaseDate).toLocaleDateString()}</td>
                        <td className="py-2">₹{Number(d.totalAmount).toLocaleString('en-IN')}</td>
                        <td className="py-2">₹{Number(d.paid_amount).toLocaleString('en-IN')}</td>
                        <td className="py-2 text-red-600">₹{Number(d.due_amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
