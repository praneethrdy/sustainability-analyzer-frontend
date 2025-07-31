import Tesseract from 'tesseract.js';
import { ExtractedData } from '../types/sustainability';

export class OCRProcessor {
  static async processDocument(file: File): Promise<ExtractedData> {
    console.log(`Processing document: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    const { data: { text } } = await Tesseract.recognize(
      file,
      'eng',
      {
        logger: (m: Tesseract.LoggerMessage) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      }
    );

    // Simple regex to extract data (can be enhanced)
    const energyMatch = text.match(/Energy Consumption[:\s]+([\d\.,]+)\s*(kWh|KWH)/i);
    const waterMatch = text.match(/Water Consumption[:\s]+([\d\.,]+)\s*(L|Litres|Gallons)/i);
    const fuelMatch = text.match(/Fuel Consumption[:\s]+([\d\.,]+)\s*(L|Litres|Gallons)/i);
    const wasteMatch = text.match(/Waste Generation[:\s]+([\d\.,]+)\s*(kg|tonnes)/i);

    // Generic amount, vendor, and date extraction (can be enhanced)
    const amountMatch = text.match(/(?:Total|Amount Due|Net Amount)[:\s]+(?:Rs\.?|₹|\$)?\s*([\d\.,]+)/i);
    const vendorMatch = text.match(/(?:From|Vendor)[:\s]+([A-Za-z0-9\s\.,-]+)/i);
    const billDateMatch = text.match(/(?:Date|Bill Date)[:\s]+(\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}-\d{2}-\d{2})/);

    const extractedData: ExtractedData = {
      billType: 'other',
      energyUsage: energyMatch ? parseFloat(energyMatch[1].replace(/,/g, '')) : undefined,
      waterConsumption: waterMatch ? parseFloat(waterMatch[1].replace(/,/g, '')) : undefined,
      fuelConsumption: fuelMatch ? parseFloat(fuelMatch[1].replace(/,/g, '')) : undefined,
      wasteGeneration: wasteMatch ? parseFloat(wasteMatch[1].replace(/,/g, '')) : undefined,
      amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : undefined,
      billDate: billDateMatch ? billDateMatch[1] : undefined,
      vendor: vendorMatch ? vendorMatch[1].trim() : undefined,
    };

    // Determine bill type based on extracted data
    if (extractedData.energyUsage !== undefined) extractedData.billType = 'electricity';
    else if (extractedData.waterConsumption !== undefined) extractedData.billType = 'water';
    else if (extractedData.fuelConsumption !== undefined) extractedData.billType = 'fuel';
    else if (extractedData.wasteGeneration !== undefined) extractedData.billType = 'waste';

    return extractedData;
  }

  // Extract text patterns using regex (simplified NLP)
  static extractKeyFields(text: string): Partial<ExtractedData> {
    const patterns = {
      energy: /(\d+(?:\.\d+)?)\s*(?:kwh|kw|units?)/i,
      water: /(\d+(?:\.\d+)?)\s*(?:litres?|liters?|l\b)/i,
      amount: /(?:₹|rs\.?|inr)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i,
      date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/
    };

    const extracted: Partial<ExtractedData> = {};

    const energyMatch = text.match(patterns.energy);
    if (energyMatch) extracted.energyUsage = parseFloat(energyMatch[1]);

    const waterMatch = text.match(patterns.water);
    if (waterMatch) extracted.waterConsumption = parseFloat(waterMatch[1]);

    const amountMatch = text.match(patterns.amount);
    if (amountMatch) extracted.amount = parseFloat(amountMatch[1].replace(/,/g, ''));

    const dateMatch = text.match(patterns.date);
    if (dateMatch) extracted.billDate = dateMatch[1];

    return extracted;
  }
}