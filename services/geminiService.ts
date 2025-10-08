
import { GoogleGenAI, Type } from "@google/genai";
import { SummaryData, GeminiInsight } from '../types';

const getGeminiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getFinancialInsights = async (summaryData: SummaryData[]): Promise<GeminiInsight> => {
  if (!summaryData || summaryData.length === 0) {
    return { text: "No data available to analyze.", topSymbols: [] };
  }
  
  const ai = getGeminiClient();

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      topSymbols: {
        type: Type.ARRAY,
        description: "The top 3 symbols with the highest transaction value.",
        items: {
          type: Type.OBJECT,
          properties: {
            symbol: { type: Type.STRING },
            totalValue: { type: Type.NUMBER }
          },
          required: ["symbol", "totalValue"]
        }
      },
      analysisText: {
        type: Type.STRING,
        description: "A markdown-formatted analysis of the trading data."
      }
    },
    required: ["topSymbols", "analysisText"]
  };

  const prompt = `
    Analyze the following summary of insider trading data. The data shows stock symbols and the total transaction value in INR.

    Data:
    ${summaryData.map(d => `- ${d.symbol}: ${d.totalValue}`).join('\n')}

    Based on this data, provide a structured JSON response. The JSON object must contain:
    1. "topSymbols": An array of the top 3 stock symbols with their corresponding total transaction value.
    2. "analysisText": A brief, neutral analysis formatted in Markdown.

    For the "analysisText", follow these instructions:
    1.  Identify the top 3 stock symbols with the highest total transaction value.
    2.  For each of the top 3, mention the symbol and its total transaction value, formatting the value in INR.
    3.  Provide a concise, one-sentence observation for each of the top 3.
    4.  Conclude with a brief overall summary of the activity.
    5.  Format the text in Markdown. Use headings, bold text, and bullet points for clarity.
    6.  IMPORTANT: Do not provide any financial advice, predictions, or recommendations. Maintain a strictly neutral and factual tone based only on the data provided.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });
    
    const result = JSON.parse(response.text);

    return {
      text: result.analysisText,
      topSymbols: result.topSymbols.map((s: any) => s.symbol)
    };
  } catch (error) {
    console.error("Gemini API call failed:", error);
    throw new Error("Failed to generate insights from Gemini API.");
  }
};
