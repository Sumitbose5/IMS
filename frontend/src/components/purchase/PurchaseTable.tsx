import { useEffect, useState } from 'react';
import { Clipboard } from 'lucide-react';

type Props = {
  onSelect?: (id: string) => void;
  onEdit?: (id: string) => void;
  refreshKey?: number;
  month?: number;
  year?: number;
  fullYear?: boolean;
};

const PurchaseTable: React.FC<Props> = ({ onSelect, onEdit, refreshKey, month, year, fullYear }) => {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [copied, setCopied] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchPurchases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, month, year, fullYear]);

  // re-fetch when parent signals refresh
  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPurchases = async () => {
    try {
  const qs = new URLSearchParams();
  if (year) qs.set('year', String(year));
  if (month) qs.set('month', String(month));
  if (fullYear) qs.set('fullYear', '1');
  const url = `${import.meta.env.VITE_BASE_URL}/utils/purchases?${qs.toString()}`;
  const res = await fetch(url);
      if (!res.ok) return;
  const data = await res.json();
  // backend responds { purchases, stats }
  setPurchases(data.purchases || []);
    } catch (e) {
      console.error(e);
    }
  };

  const truncateId = (id?: string) => {
    if (!id) return '-';
    return id.slice(0, 4);
  };

  const handleCopy = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(prev => ({ ...prev, [id]: true }));
      setTimeout(() => setCopied(prev => ({ ...prev, [id]: false })), 1500);
    } catch (e) {
      console.error('Copy failed', e);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th className="px-6 py-3 text-left">PURCHASE ID</th>
            <th className="px-6 py-3 text-left">SUPPLIER</th>
            <th className="px-6 py-3 text-right">TOTAL AMOUNT</th>
            <th className="px-6 py-3 text-center">ITEMS</th>
            <th className="px-6 py-3">DATE</th>
            <th className="px-6 py-3">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p: any) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-bold text-[#3125c4]">
                <div className="flex items-center gap-2">
                  <span className="font-mono">{truncateId(p.id)}</span>
                  <button onClick={() => handleCopy(p.id)} className="text-gray-500 hover:text-gray-700 cursor-pointer">
                    <Clipboard size={14} />
                  </button>
                  {copied[p.id] && <span className="text-xs text-green-600">Copied</span>}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="font-medium">{p.supplier?.name ?? p.supplierId}</div>
              </td>
              <td className="px-6 py-4 text-right font-semibold">₹{p.totalAmount}</td>
              <td className="px-6 py-4 text-center"><a className="text-sm text-[#3125c4] underline font-semibold">{p.itemCount ?? '-'}</a></td>
              <td className="px-6 py-4">{formatDate(p.purchaseDate)}</td>
              <td className="px-6 py-4 flex items-center gap-3">
                <button onClick={() => onSelect?.(p.id)} className="text-[#3125c4] font-semibold cursor-pointer">View</button>
                <button onClick={() => onEdit?.(p.id)} className="text-sm px-3 py-1 rounded-lg bg-indigo-50 text-[#3125c4] border border-indigo-100/50">Edit</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function formatDate(d: string | number | Date) {
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return '-';
    return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).replace(/ /g, ' ');
  } catch {
    return '-';
  }
}

export default PurchaseTable;