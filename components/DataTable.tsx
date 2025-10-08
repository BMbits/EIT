import React, { useState, useMemo } from 'react';
import { Transaction } from '../types';
import { SortAscIcon, SortDescIcon, SearchIcon, DocumentIcon, ExportIcon, TableCellsIcon } from './icons';

interface DataTableProps {
  transactions: Transaction[];
  fileName: string;
  onViewRawFile: () => void;
}

type SortKey = keyof Transaction | null;
type SortOrder = 'asc' | 'desc';

// This is to inform TypeScript about the global xlsx variable from the CDN script
declare const XLSX: any;

const DataTable: React.FC<DataTableProps> = ({ transactions, fileName, onViewRawFile }) => {
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 15;

  const filteredData = useMemo(() => {
    return transactions.filter(transaction =>
      Object.values(transaction).some(value =>
        String(value).toLowerCase().includes(filter.toLowerCase())
      )
    );
  }, [transactions, filter]);

  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortKey, sortOrder]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);
  
  const totals = useMemo(() => {
    return filteredData.reduce(
      (acc, transaction) => {
        acc.numSecurities += transaction.numSecurities;
        acc.value += transaction.value;
        return acc;
      },
      { numSecurities: 0, value: 0 }
    );
  }, [filteredData]);

  const totalPages = Math.ceil(sortedData.length / rowsPerPage);

  const handleSort = (key: keyof Transaction) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleExport = () => {
    if (sortedData.length === 0) return;

    const dataToExport = sortedData.map(t => ({
      'Symbol': t.symbol,
      'Acquirer/Disposer': t.acquirerDisposer,
      'No. of Securities': t.numSecurities,
      'Value (INR)': t.value,
      'Transaction Type': t.transactionType,
      'Date': t.date,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Set column widths for better readability
    worksheet['!cols'] = [
      { wch: 15 }, // Symbol
      { wch: 40 }, // Acquirer/Disposer
      { wch: 20 }, // No. of Securities
      { wch: 20 }, // Value (INR)
      { wch: 15 }, // Transaction Type
      { wch: 20 }, // Date
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
    
    const exportFileName = `Export_${fileName.replace(/\.[^/.]+$/, "")}.xlsx`;
    XLSX.writeFile(workbook, exportFileName);
  };

  const headers: { key: keyof Transaction; label: string }[] = [
    { key: 'symbol', label: 'Symbol' },
    { key: 'acquirerDisposer', label: 'Acquirer/Disposer' },
    { key: 'numSecurities', label: 'No. of Securities' },
    { key: 'value', label: 'Value (INR)' },
    { key: 'transactionType', label: 'Type' },
    { key: 'date', label: 'Date' },
  ];
  
  const title = transactions.length > 0 ? "Full Transaction Data" : "Raw Data Viewer";
  const description = transactions.length > 0 ? "Extracted from the first sheet." : "No transaction data was extracted. You can view the original file contents.";

  return (
    <div className="bg-gray-800/50 rounded-xl shadow-lg p-6 backdrop-blur-sm border border-gray-700">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <DocumentIcon className="w-4 h-4" /> 
            {fileName} { transactions.length > 0 && <span className="text-xs text-gray-500">({description})</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {transactions.length > 0 && (
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Search transactions..."
                value={filter}
                onChange={e => setFilter(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
              />
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            </div>
          )}
          <button
            onClick={onViewRawFile}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-colors duration-200"
            aria-label="View original Excel file"
          >
            <TableCellsIcon className="w-5 h-5" />
            <span>View Original</span>
          </button>
          <button
            onClick={handleExport}
            disabled={sortedData.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export data to Excel"
          >
            <ExportIcon className="w-5 h-5" />
            <span>Export</span>
          </button>
        </div>
      </div>
      {transactions.length > 0 ? (
        <>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
            <thead>
                <tr className="border-b border-gray-700">
                {headers.map(header => (
                    <th key={header.key} className="p-5 text-sm font-semibold text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort(header.key)}>
                    <div className="flex items-center gap-2">
                        {header.label}
                        {sortKey === header.key && (sortOrder === 'asc' ? <SortAscIcon className="w-4 h-4" /> : <SortDescIcon className="w-4 h-4" />)}
                    </div>
                    </th>
                ))}
                </tr>
            </thead>
            <tbody>
                {paginatedData.map((transaction, index) => (
                <tr key={index} className={`border-b border-gray-800 transition-colors hover:bg-gray-700/50 ${index % 2 !== 0 ? 'bg-gray-900/40' : ''}`}>
                    <td className="p-5 font-mono text-sm">{transaction.symbol}</td>
                    <td className="p-5 text-sm">{transaction.acquirerDisposer}</td>
                    <td className="p-5 text-sm text-right">{transaction.numSecurities.toLocaleString('en-IN')}</td>
                    <td className="p-5 text-sm text-right font-semibold">₹{transaction.value.toLocaleString('en-IN')}</td>
                    <td className="p-5 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${transaction.transactionType.toLowerCase() === 'buy' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                        {transaction.transactionType}
                    </span>
                    </td>
                    <td className="p-5 text-sm whitespace-nowrap">{transaction.date}</td>
                </tr>
                ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-600 bg-gray-900/50 font-semibold text-white">
                <td className="p-5 text-sm" colSpan={2}>
                  Totals (for filtered data)
                </td>
                <td className="p-5 text-sm text-right">
                  {totals.numSecurities.toLocaleString('en-IN')}
                </td>
                <td className="p-5 text-sm text-right">
                  ₹{totals.value.toLocaleString('en-IN')}
                </td>
                <td className="p-5" colSpan={2}></td>
              </tr>
            </tfoot>
            </table>
        </div>
        {paginatedData.length === 0 && <p className="text-center py-8 text-gray-500">No matching transactions found.</p>}
        
        {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6">
            <span className="text-sm text-gray-400">
                Showing {Math.min((currentPage - 1) * rowsPerPage + 1, sortedData.length)} to {Math.min(currentPage * rowsPerPage, sortedData.length)} of {sortedData.length} entries
            </span>
            <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-600">Previous</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 bg-gray-700 rounded-md disabled:opacity-50 hover:bg-gray-600">Next</button>
            </div>
            </div>
        )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-500">
            <p>No transaction data found in the first sheet.</p>
            <p className="mt-2">Click "View Original" to inspect all sheets from the file.</p>
        </div>
      )}
    </div>
  );
};

export default DataTable;