export interface Transaction {
  symbol: string;
  acquirerDisposer: string;
  numSecurities: number;
  value: number;
  transactionType: string;
  date: string;
}

export interface SummaryData {
  symbol: string;
  totalValue: number;
}

export interface GeminiInsight {
  text: string;
  topSymbols: string[];
}

export type RawExcelData = { [sheetName: string]: any[][] };
