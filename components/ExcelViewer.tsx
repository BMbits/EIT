
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { RawExcelData } from '../types';
import { SearchIcon, CloseIcon, DocumentIcon, SumIcon } from './icons';

interface ExcelViewerProps {
  rawData: RawExcelData;
  fileName: string;
  onClose: () => void;
}

interface ColumnCalcs {
  sum: number;
  count: number;
  average: number;
}

const isNumeric = (val: any): boolean => {
  if (val === null || val === '') return false;
  // It's numeric if it's a number type or a string that looks like a number (potentially with commas)
  return !isNaN(Number(String(val).replace(/,/g, '')));
};

const ExcelViewer: React.FC<ExcelViewerProps> = ({ rawData, fileName, onClose }) => {
  const sheetNames = useMemo(() => Object.keys(rawData), [rawData]);
  const [activeSheet, setActiveSheet] = useState(sheetNames[0] || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedColumnsForSum, setSelectedColumnsForSum] = useState<number[]>([]);

  // Reset selections when sheet changes
  useEffect(() => {
    setSelectedColumnsForSum([]);
  }, [activeSheet]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const filteredData = useMemo(() => {
    if (!searchTerm) {
      return rawData;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    const result: RawExcelData = {};
    for (const sheetName of sheetNames) {
      const sheetData = rawData[sheetName];
      if (!sheetData || sheetData.length === 0) {
        result[sheetName] = [];
        continue;
      }
      const headers = sheetData[0] || [];
      const dataRows = sheetData.slice(1);
      const filteredRows = dataRows.filter(row =>
        row.some(cell => cell !== null && String(cell).toLowerCase().includes(lowercasedFilter))
      );
      result[sheetName] = [headers, ...filteredRows];
    }
    return result;
  }, [rawData, searchTerm, sheetNames]);
  
  const activeSheetData = filteredData[activeSheet] || [];
  const headers = activeSheetData[0] || [];
  const dataRows = activeSheetData.slice(1);

  const summableColumns = useMemo(() => {
    if (dataRows.length === 0) return new Set();
    const checks: boolean[] = Array(headers.length).fill(true);
    // Check first 20 rows to determine if a column is numeric
    for (let i = 0; i < Math.min(dataRows.length, 20); i++) {
        for (let j = 0; j < headers.length; j++) {
            if (checks[j] && dataRows[i][j] !== null && dataRows[i][j] !== '' && !isNumeric(dataRows[i][j])) {
                checks[j] = false;
            }
        }
    }
    const summable = new Set<number>();
    checks.forEach((isSummable, index) => {
        if(isSummable) summable.add(index);
    });
    return summable;
  }, [dataRows, headers.length]);
  
  const toggleColumnSum = (colIndex: number) => {
      if (!summableColumns.has(colIndex)) return;
      setSelectedColumnsForSum(prev => {
          const newSet = new Set(prev);
          if (newSet.has(colIndex)) {
              newSet.delete(colIndex);
          } else {
              newSet.add(colIndex);
          }
          return Array.from(newSet);
      })
  }

  const columnCalculations = useMemo(() => {
    if (selectedColumnsForSum.length === 0 || dataRows.length === 0) {
      return null;
    }

    const newCalcs = new Map<number, ColumnCalcs>();
    selectedColumnsForSum.forEach(colIndex => {
      let sum = 0;
      let count = 0;
      for (const row of dataRows) {
        const cellValue = row[colIndex];
        if (isNumeric(cellValue)) {
          sum += parseFloat(String(cellValue).replace(/,/g, ''));
          count++;
        }
      }
      newCalcs.set(colIndex, {
        sum,
        count,
        average: count > 0 ? sum / count : 0,
      });
    });
    return newCalcs;
  }, [dataRows, selectedColumnsForSum]);
  
  const highlightMatches = (text: string) => {
    if (!searchTerm.trim()) {
      return text;
    }
    const parts = String(text).split(new RegExp(`(${searchTerm})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === searchTerm.toLowerCase() ? (
            <mark key={i} className="bg-yellow-400 text-black px-0 py-0 rounded">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full h-full max-w-7xl flex flex-col border border-gray-700" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <DocumentIcon className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">{fileName}</h2>
          </div>
          <div className="relative flex-grow mx-8">
            <input
              type="text"
              placeholder="Search all sheets..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
            />
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Close viewer">
            <CloseIcon className="w-6 h-6 text-gray-400" />
          </button>
        </header>

        <div className="flex-shrink-0 border-b border-gray-700">
          <nav className="flex space-x-2 p-2 overflow-x-auto" aria-label="Tabs">
            {sheetNames.map(name => {
              const resultCount = (filteredData[name]?.length || 1) - 1;
              const hasResults = searchTerm && resultCount > 0;
              return (
                <button
                  key={name}
                  onClick={() => setActiveSheet(name)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                    activeSheet === name
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {name}
                  {searchTerm && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${ hasResults ? 'bg-yellow-400 text-black' : 'bg-gray-600 text-gray-300'}`}>
                      {resultCount}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="flex-grow overflow-auto p-4">
          {dataRows.length > 0 ? (
            <table className="w-full text-left text-sm table-auto border-collapse">
              <thead className="sticky top-0 bg-gray-800 z-20">
                <tr>
                  {headers.map((header, index) => (
                    <th key={index} className="border-b-2 border-gray-600 p-3 font-semibold text-gray-300 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <span>{header}</span>
                        {summableColumns.has(index) && (
                            <button onClick={() => toggleColumnSum(index)} title="Calculate for this column" className="p-1 rounded-md hover:bg-gray-600">
                                <SumIcon className={`w-4 h-4 transition-colors ${selectedColumnsForSum.includes(index) ? 'text-yellow-400' : 'text-gray-500'}`} />
                            </button>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-gray-700 hover:bg-gray-700/50">
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className={`p-3 text-gray-300 whitespace-nowrap ${summableColumns.has(cellIndex) ? 'text-right' : ''}`}>
                        {highlightMatches(cell === null ? '' : String(cell))}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
             <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <h3 className="text-xl font-semibold text-gray-400">
                        {searchTerm ? 'No Results Found' : 'No Data in this Sheet'}
                    </h3>
                    <p className="text-gray-500 mt-2">
                        {searchTerm ? `Your search for "${searchTerm}" did not return any results in this sheet.` : 'This sheet appears to be empty.'}
                    </p>
                </div>
            </div>
          )}
        </div>
        
        {columnCalculations && (
          <footer className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-900/60 backdrop-blur-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {selectedColumnsForSum.map(colIndex => {
                const calcs = columnCalculations.get(colIndex);
                const header = headers[colIndex] || `Column ${colIndex + 1}`;
                if (!calcs) return null;

                return (
                  <div key={colIndex} className="bg-gray-700/50 p-3 rounded-lg border border-gray-600/50">
                    <h4 className="text-sm font-bold text-blue-300 truncate" title={header}>{header}</h4>
                    <div className="mt-2 space-y-1.5 text-sm">
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-400">Sum:</span>
                        <span className="font-mono text-yellow-300">{calcs.sum.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-400">Average:</span>
                        <span className="font-mono text-yellow-300">{calcs.average.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-400">Count:</span>
                        <span className="font-mono text-yellow-300">{calcs.count.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

export default ExcelViewer;
