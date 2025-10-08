import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { RawExcelData } from '../types';
import { SearchIcon, CloseIcon, DocumentIcon, SumIcon } from './icons';

interface ExcelViewerProps {
  rawData: RawExcelData;
  fileName: string;
  onClose: () => void;
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

  const totals = useMemo(() => {
    if (selectedColumnsForSum.length === 0 || dataRows.length === 0) {
      return null;
    }

    const newTotals = new Map<number, number>();
    selectedColumnsForSum.forEach(colIndex => {
        let columnTotal = 0;
        for (const row of dataRows) {
            const cellValue = row[colIndex];
            columnTotal += parseFloat(String(cellValue).replace(/,/g, '')) || 0;
        }
        newTotals.set(colIndex, columnTotal);
    });
    
    return newTotals;

  }, [dataRows, selectedColumnsForSum]);

  const divisionResult = useMemo(() => {
    if (selectedColumnsForSum.length !== 2 || !totals) {
      return null;
    }
    const [colIndex1, colIndex2] = selectedColumnsForSum;
    const total1 = totals.get(colIndex1);
    const total2 = totals.get(colIndex2);

    if (total1 === undefined || total2 === undefined) {
      return null;
    }

    if (total2 === 0) {
      return { total1, total2, result: 'N/A' };
    }

    const result = total1 / total2;
    return { total1, total2, result };
  }, [selectedColumnsForSum, totals]);
  
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
                            <button onClick={() => toggleColumnSum(index)} title="Sum this column" className="p-1 rounded-md hover:bg-gray-600">
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
              {totals && (
                <tfoot className="sticky bottom-0 bg-gray-900 z-10">
                  <tr className="border-t-2 border-gray-600 font-semibold text-white">
                    {headers.map((_, index) => {
                      let content: React.ReactNode = null;
                      
                      if (index === 0) {
                        content = 'Selected Totals (Filtered)';
                      }

                      if (totals.has(index)) {
                        content = totals.get(index)?.toLocaleString('en-IN') ?? '0';
                      }

                      return (
                        <td key={`total-${index}`} className={`p-3 ${totals.has(index) ? 'text-right text-yellow-300 font-mono' : 'text-gray-400'}`}>
                           {content}
                        </td>
                      );
                    })}
                  </tr>
                  {divisionResult && (
                    <tr className="border-t border-gray-700 bg-gray-800">
                      <td className="p-3 text-gray-400 font-semibold" colSpan={headers.length}>
                        <div className="flex justify-between items-center w-full">
                          <span>
                            Division Total (1st / 2nd selected column)
                          </span>
                          <span className="font-mono text-yellow-300">
                            {`${divisionResult.total1.toLocaleString('en-IN')} / ${divisionResult.total2.toLocaleString('en-IN')} = `}
                            <strong className="text-lg text-yellow-200">
                              {typeof divisionResult.result === 'number'
                                ? divisionResult.result.toLocaleString('en-IN', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 4,
                                  })
                                : divisionResult.result}
                            </strong>
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tfoot>
              )}
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
      </div>
    </div>
  );
};

export default ExcelViewer;