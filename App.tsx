import React, { useState, useEffect, useCallback } from 'react';
import { Transaction, SummaryData, GeminiInsight, RawExcelData } from './types';
import { parseExcelFile } from './services/excelParser';
import { getFinancialInsights } from './services/geminiService';
import FileUpload from './components/FileUpload';
import DataTable from './components/DataTable';
import SummaryChart from './components/SummaryChart';
import GeminiInsights from './components/GeminiInsights';
import ExcelViewer from './components/ExcelViewer';
import Loader from './components/Loader';
import { LogoIcon } from './components/icons';

const App: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<SummaryData[]>([]);
  const [geminiInsight, setGeminiInsight] = useState<GeminiInsight | null>(null);
  const [rawExcelData, setRawExcelData] = useState<RawExcelData | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const processData = useCallback(async (data: Transaction[]) => {
    if (data.length === 0) {
      setTransactions([]);
      setSummary([]);
      // Don't set an error here, as the file might just have other sheets with data
      return;
    }
    setTransactions(data);

    const summaryMap = data.reduce((acc, curr) => {
      acc.set(curr.symbol, (acc.get(curr.symbol) || 0) + curr.value);
      return acc;
    }, new Map<string, number>());

    const sortedSummary = Array.from(summaryMap.entries())
      .map(([symbol, totalValue]) => ({ symbol, totalValue }))
      .sort((a, b) => b.totalValue - a.totalValue);

    setSummary(sortedSummary);

    try {
      const insight = await getFinancialInsights(sortedSummary.slice(0, 10)); // Analyze top 10
      setGeminiInsight(insight);
    } catch (e) {
      console.error(e);
      setError("Could not fetch AI insights. The API key might be missing or invalid.");
      setGeminiInsight(null);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setTransactions([]);
    setSummary([]);
    setGeminiInsight(null);
    setRawExcelData(null);
    setFileName(file.name);

    try {
      const { transactions, rawData } = await parseExcelFile(file);
      setRawExcelData(rawData);
      await processData(transactions);
      if(transactions.length === 0 && Object.keys(rawData).length > 0) {
         // No transactions found, but other data exists. This is not an error.
      } else if (transactions.length === 0 && Object.keys(rawData).length === 0) {
         setError("No valid data found in the file.");
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred during file processing.');
    } finally {
      setIsLoading(false);
    }
  }, [processData]);

  const resetState = () => {
    setTransactions([]);
    setSummary([]);
    setGeminiInsight(null);
    setError(null);
    setFileName('');
    setRawExcelData(null);
    setIsViewerOpen(false);
  }

  const hasData = transactions.length > 0 || (rawExcelData && Object.keys(rawExcelData).length > 0);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LogoIcon className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Excel Insider Trading Analyzer</h1>
          </div>
          {fileName && (
            <button
              onClick={resetState}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200 text-sm font-semibold"
            >
              Analyze New File
            </button>
          )}
        </div>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {!fileName ? (
          <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
        ) : (
          <div>
            {isLoading && <Loader message="Analyzing your data..." />}
            {error && (
              <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg relative mb-6" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
              </div>
            )}
            {!isLoading && !error && hasData && (
              <div className="space-y-8">
                {transactions.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                      <SummaryChart data={summary.slice(0, 15)} topSymbols={geminiInsight?.topSymbols || []} />
                    </div>
                    <div>
                      <GeminiInsights insight={geminiInsight?.text ?? ''} />
                    </div>
                  </div>
                )}
                <DataTable 
                  transactions={transactions} 
                  fileName={fileName} 
                  onViewRawFile={() => setIsViewerOpen(true)}
                />
              </div>
            )}
             {!isLoading && !hasData && !error && (
               <div className="text-center py-12">
                  <h2 className="text-2xl font-semibold text-gray-400">No data to display.</h2>
                  <p className="text-gray-500 mt-2">The uploaded file might be empty or formatted incorrectly.</p>
               </div>
            )}
          </div>
        )}
        {isViewerOpen && rawExcelData && (
          <ExcelViewer
            rawData={rawExcelData}
            fileName={fileName}
            onClose={() => setIsViewerOpen(false)}
          />
        )}
      </main>

      <footer className="text-center py-6 text-sm text-gray-500">
        <p>Powered by Gemini and React. Designed for advanced financial data analysis.</p>
      </footer>
    </div>
  );
};

export default App;
