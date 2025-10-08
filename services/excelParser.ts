import { Transaction, RawExcelData } from '../types';

// This is to inform TypeScript about the global xlsx variable from the CDN script
declare const XLSX: any;

const EXCEL_HEADER_MAPPING: { [key: string]: keyof Transaction } = {
  'SYMBOL': 'symbol',
  'NAME OF THE ACQUIRER/DISPOSER': 'acquirerDisposer',
  'NO. OF SECURITIES (ACQUIRED/DISCLOSED)': 'numSecurities',
  'VALUE OF SECURITY (ACQUIRED/DISCLOSED)': 'value',
  'ACQUISITION/DISPOSAL TRANSACTION TYPE': 'transactionType',
  'DATE OF ALLOTMENT/ACQUISITION FROM': 'date',
};

const sanitizeKey = (key: string): string => key.trim().toUpperCase();

export const parseExcelFile = (file: File): Promise<{ transactions: Transaction[], rawData: RawExcelData }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event: ProgressEvent<FileReader>) => {
      if (!event.target?.result) {
        return reject(new Error('Failed to read file.'));
      }
      try {
        const data = new Uint8Array(event.target.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 1. Parse raw data for all sheets for the viewer
        const rawData: RawExcelData = {};
        workbook.SheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const sheetJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null });
            rawData[sheetName] = sheetJson;
        });

        // 2. Parse transactions from the first sheet for analysis
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
            return resolve({ transactions: [], rawData: {} });
        }
        
        const firstSheetJsonData: any[] = rawData[firstSheetName];

        if (firstSheetJsonData.length < 2) {
          return resolve({ transactions: [], rawData }); // No data rows
        }

        const headers: string[] = firstSheetJsonData[0].map((h: any) => sanitizeKey(String(h)));
        const mappedHeaders = headers.map(h => EXCEL_HEADER_MAPPING[h]).filter(Boolean);

        if (mappedHeaders.length < 3) { // Basic validation
             throw new Error("File format is incorrect. Could not find required columns like 'SYMBOL', 'VALUE OF SECURITY', etc. in the first sheet.");
        }
        
        const transactions: Transaction[] = firstSheetJsonData.slice(1).map((row: any[]) => {
            const transaction: Partial<Transaction> = {};
            let isValidRow = false;
            headers.forEach((header, index) => {
                const mappedKey = EXCEL_HEADER_MAPPING[header];
                if (mappedKey && row[index] !== null) {
                    const cellValue = row[index];
                    if(mappedKey === 'value' || mappedKey === 'numSecurities') {
                        // Sanitize numeric strings by removing commas before parsing
                        const numericString = String(cellValue).replace(/,/g, '');
                        (transaction as any)[mappedKey] = parseFloat(numericString) || 0;
                    } else {
                        (transaction as any)[mappedKey] = cellValue;
                    }
                    isValidRow = true;
                }
            });
            return isValidRow ? transaction as Transaction : null;
        }).filter((t): t is Transaction => t !== null && !!t.symbol && t.value >= 0); // Allow transactions with 0 value
        
        resolve({ transactions, rawData });

      } catch (error) {
        console.error("Parsing error:", error);
        reject(new Error('Failed to parse the Excel file. Please ensure it is a valid .xlsx or .csv file with the correct format.'));
      }
    };

    reader.onerror = (error) => {
      reject(new Error('Error reading file: ' + error));
    };

    reader.readAsArrayBuffer(file);
  });
};
