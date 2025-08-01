/**
 * Intelligent Sustainability Assistant - JavaScript Backend
 * Analyzes PDF reports and extracts GHG emissions, goals, and insights
 */

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const pdfParse = require('pdf-parse');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { OpenAI } = require('openai');
require('dotenv').config();
console.log('ALL ENV:', process.env);
console.log('DEBUG: Together API Key loaded:', process.env.TOGETHER_API_KEY);
if (!process.env.TOGETHER_API_KEY) {
  throw new Error('TOGETHER_API_KEY is not set. Please check your .env file and restart the backend.');
}

const app = express();
const port = process.env.PORT || 3001;

let openai;

// Initialize OpenAI API with Together.ai configuration
if (process.env.TOGETHER_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.TOGETHER_API_KEY,
    baseURL: "https://api.together.xyz/v1",
  });
} else {
  console.warn('TOGETHER_API_KEY is not set. Chatbot functionality may be limited.');
}

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'));
    }
  }
});

/**
 * Intelligent Sustainability Data Extractor
 */
class SustainabilityAnalyzer {
  constructor() {
    // India-specific emission factors (kg CO2/unit)
    this.emissionFactors = {
      electricity: 0.82, // kg CO2/kWh (India grid)
      water: 0.0003,     // kg CO2/L
      petrol: 2.31,      // kg CO2/L
      diesel: 2.68,      // kg CO2/L
      waste: 0.5         // kg CO2/kg
    };

    // Advanced patterns for GHG emissions extraction
    this.patterns = {
      scope1: [
        /scope\s*1\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi,
        /direct\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi,
        /scope\s*1[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi
      ],
      scope2: [
        /scope\s*2\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi,
        /indirect\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi,
        /electricity\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi
      ],
      scope3: [
        /scope\s*3\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi,
        /value\s*chain\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi,
        /other\s*indirect\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi
      ],
      total: [
        /total\s*ghg\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi,
        /total\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi,
        /total\s*carbon\s*emissions?[:\s]*(\d+(?:,\d+)*(?:.\d+)?)\s*([a-zA-Z₂\s]+)/gi,
        /Scope\s*1\s*and\s*2\s*carbon\s*footprint(?:\s*for\s*the\s*reporting\s*year)?\s*is\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*([a-zA-Z₂\s]+)/gi
      ],
      company: [
        /Featherlite(?:\sGHG Emissions Inventory Report)?/gi,
        /([A-Za-z\s&]+)\s*(?:Ltd|Limited|Inc|Corporation|Pvt|GmbH|Co\.?)/gi,
        /sustainability\s*report\s*(?:of|for)\s*([A-Za-z\s&]+)/gi
      ],
      year: [
        /(?:FY|financial year|fiscal year)[\s-]*(\d{2,4})\b/gi,
        /report\s*year[:\s]*(\d{4})/gi,
        /(\b20\d{2}\b)/g
      ],
      goals: [
        /\b(?:target|goal|objective|aim)\b(?:(?!chapter|section|figure|table|introduction|methodology|quantification|statement|executive summary|climate action|about this report|ghg inventory objectives|organisational boundaries|operational boundaries|inventory of emissions|uncertainty in ghg emissions inventory|mini|contents|our commitment to sustainability|executive summary|climate action|about this report|ghg inventory objectives|methodology|quantification|consolidated emissions statement|uncertainty in ghg emissions inventory|reporting period|key\s*highlights|performance\s*analysis|reduction\s*initiatives|conclusion|page\s*no\.|our\s*commitment\s*to\s*sustainability|executive\s*summary|climate\s*action|about\s*this\s*report|ghg\s*inventory\s*objectives|boundaries|inventory\s*of\s*emissions|the\s*path\s*to\s*net\s*zero|our\s*strategy|committed\s*to\s*climate\s*action|aligning\s*with\s*the\s*un\s*sdgs|s\s*featherlite\s*ghg\s*emissions\s*inventory\s*report\s*fy\d{2}\s*\d{2}\s*at\s*featherlite\s*our\s*guiding\s*principle|journey\s*with\s*diligence\s*and\s*passion|promise\s*to\s*future\s*generations|climate\s*roadmap\s*aimed\s*at\s*reducing\s*our\s*greenhouse\s*gas|ambitious\s*but\s*achievable|benchmarks\s*for\s*rigorous\s*environmental\s*reporting|s\s*sdgs).)*?\b(?:to|of)?\s*(?:achieve|reduce|cut|decrease|increase)?\s*([^\.\n]+?)(?:\.(?!\w)|\n|$)/gi, // Capture up to a period or newline, not part of a word
        /\bcommit(?:ment)?\b(?:(?!chapter|section|figure|table|introduction|methodology|quantification|statement|executive summary|climate action|about this report|ghg inventory objectives|organisational boundaries|operational boundaries|inventory of emissions|uncertainty in ghg emissions inventory|mini|contents|our commitment to sustainability|executive summary|climate action|about this report|ghg inventory objectives|methodology|quantification|consolidated emissions statement|uncertainty in ghg emissions inventory|reporting period|key\s*highlights|performance\s*analysis|reduction\s*initiatives|conclusion|page\s*no\.|our\s*commitment\s*to\s*sustainability|executive\s*summary|climate\s*action|about\s*this\s*report|ghg\s*inventory\s*objectives|boundaries|inventory\s*of\s*emissions|the\s*path\s*to\s*net\s*zero|our\s*strategy|committed\s*to\s*climate\s*action|aligning\s*with\s*the\s*un\s*sdgs|s\s*featherlite\s*ghg\s*emissions\s*inventory\s*report\s*fy\d{2}\s*\d{2}\s*at\s*featherlite\s*our\s*guiding\s*principle|journey\s*with\s*diligence\s*and\s*passion|promise\s*to\s*future\s*generations|climate\s*roadmap\s*aimed\s*at\s*reducing\s*our\s*greenhouse\s*gas|ambitious\s*but\s*achievable|benchmarks\s*for\s*rigorous\s*environmental\s*reporting|s\s*sdgs).)*?\s*to\s*([^\.\n]+?)(?:\.(?!\w)|\n|$)/gi,
        /\bnet\s*zero\s*emissions\b/gi,
        /(\d+%?)\s*(?:reduction|increase)?\s*in\s*([^\.\n]+?)(?:\.(?!\w)|\n|$)/gi,
        /\bpledge\s*to\s*([^\.\n]+?)(?:\.(?!\w)|\n|$)/gi,
        /\b(?:plan|aims?)\s*to\s*(?:reduce|achieve|implement)\s*([^\.\n]+?)(?:\.(?!\w)|\n|$)/gi,
        /\b(?:set\s*a\s*target|have\s*set\s*targets)\s*to\s*([^\.\n]+?)(?:\.(?!\w)|\n|$)/gi
      ]
    };

    // New patterns for ESG (Environmental, Social, Governance) data
    this.esgPatterns = {
      environmental: [
        /environmental\s*performance[:\s]*([^\n\.]+)/gi,
        /carbon\s*footprint[:\s]*([^\n\.]+)/gi,
        /energy\s*consumption[:\s]*([^\n\.]+)/gi,
        /water\s*usage[:\s]*([^\n\.]+)/gi,
        /waste\s*management[:\s]*([^\n\.]+)/gi,
        /climate\s*action[:\s]*([^\n\.]+)/gi
      ],
      social: [
        /social\s*responsibility[:\s]*([^\n\.]+)/gi,
        /employee\s*welfare[:\s]*([^\n\.]+)/gi,
        /community\s*engagement[:\s]*([^\n\.]+)/gi,
        /diversity\s*and\s*inclusion[:\s]*([^\n\.]+)/gi,
        /human\s*rights[:\s]*([^\n\.]+)/gi
      ],
      governance: [
        /governance\s*structure[:\s]*([^\n\.]+)/gi,
        /ethical\s*conduct[:\s]*([^\n\.]+)/gi,
        /board\s*diversity[:\s]*([^\n\.]+)/gi,
        /transparency\s*and\s*reporting[:\s]*([^\n\.]+)/gi
      ]
    };

    // Unit conversion factors to tCO₂e
    this.unitConversions = {
      'kt': 1000,
      'kilotons': 1000,
      'mt': 1000000,
      'megatons': 1000000,
      'tons': 1,
      'tonnes': 1,
      'tco2e': 1,
      'tco₂e': 1,
      'gco2e': 0.000001, // grams to tons
      'kgco2e': 0.001 // kg to tons
    };
  }

  /**
   * Extract text from PDF using pdf-parse
   */
  async extractTextFromPDF(buffer) {
    try {
      const data = await pdfParse(buffer);
      console.log('--- Extracted PDF Text (first 10000 chars) ---');
      console.log(data.text.substring(0, 10000) + '...');
      console.log('---------------------------------------------');
      return data.text;
    } catch (error) {
      console.error('PDF text extraction failed:', error);
      return '';
    }
  }

  /**
   * Extract text from image using Tesseract.js
   */
  async extractTextFromImage(buffer) {
    try {
      // Preprocess image with Sharp
      const processedImage = await sharp(buffer)
        .greyscale()
        .resize({ width: 1200 })
        .sharpen()
        .toBuffer();

      console.log('--- Running Tesseract OCR ---');
      const { data: { text } } = await Tesseract.recognize(processedImage, 'eng', {
        logger: m => console.log(m)
      });
      console.log('--- Extracted OCR Text (first 10000 chars) ---');
      console.log(text.substring(0, 10000) + '...');
      console.log('---------------------------------------------');
      return text;
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return '';
    }
  }

  /**
   * Normalize units to metric tons (tCO₂e)
   */
  normalizeUnit(value, unit) {
    try {
      const cleanValue = parseFloat(value.replace(/,/g, ''));
      const cleanUnit = unit.toLowerCase().replace(/[^\w]/g, '');
      const factor = this.unitConversions[cleanUnit] || 1;
      return Math.round(cleanValue * factor * 100) / 100;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Extract emissions data using regex patterns
   */
  extractEmissionsData(text) {
    const results = {
      scope_1: 'N/A',
      scope_2: 'N/A',
      scope_3: 'N/A',
      total_ghg_emissions: 'N/A'
    };

    const cleanText = text.toLowerCase().replace(/\s+/g, ' ');

    // Extract each scope
    for (const [scope, patterns] of Object.entries(this.patterns)) {
      if (!['scope1', 'scope2', 'scope3', 'total'].includes(scope)) continue;

      for (const pattern of patterns) {
        const matches = [...cleanText.matchAll(pattern)];
        if (matches.length > 0) {
          const match = matches[0];
          const value = match[1];
          const unit = match[2] || 'tco2e';

          const normalized = this.normalizeUnit(value, unit);
          if (normalized > 0) {
            const key = scope === 'total' ? 'total_ghg_emissions' : scope.replace('scope', 'scope_');
            results[key] = normalized.toString();
            break;
          }
        }
      }
    }

    return results;
  }

  /**
   * Extract company information
   */
  extractCompanyInfo(text) {
    let companyName = 'Unknown Company';
    let reportYear = 'Unknown Year';

    // Extract company name
    for (const pattern of this.patterns.company) {
      const match = text.match(pattern);
      if (match) {
        // Prioritize specific match for 'Featherlite' if found first
        if (match[0].toLowerCase().includes('featherlite')) {
          companyName = 'Featherlite';
          break;
        }
        const matchedName = match[1] || match[0];
        if (matchedName.length > companyName.length) {
          companyName = matchedName.replace(/GHG Emissions Inventory Report|Sustainability Report/gi, '').trim();
        }
      }
    }

    // Extract year
    for (const pattern of this.patterns.year) {
      const match = text.match(pattern);
      if (match) {
        let year = match[1] || match[0];
        if (year.length === 2) year = '20' + year; // Convert '24' to '2024'
        if (year.startsWith('FY')) year = year.substring(2); // Remove FY if present
        reportYear = `FY${year}`;
        break;
      }
    }

    return { companyName, reportYear };
  }

  /**
   * Extract sustainability goals and targets
   */
  extractGoals(text) {
    const goals = new Set();

    // Clean text before applying goal regexes: remove excessive newlines and ensure single spaces
    const cleanText = text.replace(/\s*\n\s*/g, ' ').replace(/\s\s+/g, ' ').trim();

    const excludePhrases = /chapter|section|figure|table|introduction|methodology|quantification|statement|executive summary|climate action|about this report|organisational boundaries|operational boundaries|inventory of emissions|uncertainty in ghg emissions inventory|mini|contents|our commitment to sustainability|executive summary|climate action|about this report|methodology|quantification|consolidated emissions statement|uncertainty in ghg emissions inventory|reporting period|key\s*highlights|performance\s*analysis|reduction\s*initiatives|conclusion|page\s*no\.|our\s*commitment\s*to\s*sustainability|executive\s*summary|climate\s*action|about\s*this\s*report|boundaries|inventory\s*of\s*emissions|the\s*path\s*to\s*net\s*zero|our\s*strategy|committed\s*to\s*climate\s*action|aligning\s*with\s*the\s*un\s*sdgs|s\s*featherlite\s*ghg\s*emissions\s*inventory\s*report\s*fy\d{2}\s*\d{2}\s*at\s*featherlite\s*our\s*guiding\s*principle|journey\s*with\s*diligence\s*and\s*passion|promise\s*to\s*future\s*generations|climate\s*roadmap\s*aimed\s*at\s*reducing\s*our\s*greenhouse\s*gas|ambitious\s*but\s*achievable|benchmarks\s*for\s*rigorous\s*environmental\s*reporting|s\s*sdgs|this\s*commitment\s*is\s*evident\s*in\s*our\s*comprehensive\s*ghg\s*emissions\s*inventory/i;

    for (const pattern of this.patterns.goals) {
      const matches = [...cleanText.matchAll(pattern)];
      matches.forEach(match => {
        let goalText = match[1] || match[0];
        if (goalText) {
          goalText = goalText.replace(/\s*by\s*\d+%?/i, '').trim(); // Clean up trailing 'by X%'
          goalText = goalText.replace(/\s*\n\s*/g, ' ').replace(/\s\s+/g, ' ').trim(); // Ensure newlines within goal are handled
          goalText = goalText.replace(/\s\s+/g, ' ').trim(); // Further clean extra spaces

          // Filter out very short, non-descriptive, or excluded phrases
          if (goalText.length > 10 &&
            !excludePhrases.test(goalText) &&
            !/^\d+(\.\d+)?$/.test(goalText) // Exclude just numbers
          ) {
            goals.add(goalText);
          }
        }
      });
    }

    return Array.from(goals).slice(0, 5); // Return top 5 unique goals
  }

  /**
   * Extract ESG (Environmental, Social, Governance) data
   */
  extractESGData(text) {
    const esgData = {
      environmental: [],
      social: [],
      governance: []
    };
    const cleanText = text.replace(/\s*\n\s*/g, ' ').replace(/\s\s+/g, ' ').trim();

    for (const category in this.esgPatterns) {
      for (const pattern of this.esgPatterns[category]) {
        const matches = [...cleanText.matchAll(pattern)];
        matches.forEach(match => {
          let dataPoint = match[1] || match[0];
          if (dataPoint) {
            dataPoint = dataPoint.trim();
            if (dataPoint.length > 20 && !esgData[category].includes(dataPoint)) {
              esgData[category].push(dataPoint);
            }
          }
        });
      }
    }
    return esgData;
  }

  /**
   * Generate intelligent summary using AI or rule-based approach
   */
  async generateSummary(text, emissionsData) {
    // If OpenAI is available, use it for advanced analysis
    if (openai) {
      try {
        const prompt = `Analyze this sustainability report and provide 5 key insights about the company's environmental performance, focusing on emissions, goals, and achievements. Text: ${text.substring(0, 3000)}`;

        const response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300
        });

        return response.choices[0].message.content.split('\n').filter(line => line.trim());
      } catch (error) {
        console.error('OpenAI analysis failed:', error);
      }
    }

    // Fallback to rule-based summary
    const summary = [];

    if (emissionsData.total_ghg_emissions !== 'N/A') {
      summary.push(`Total GHG emissions reported: ${emissionsData.total_ghg_emissions} tCO₂e`);
    }

    if (emissionsData.scope_1 !== 'N/A') {
      summary.push(`Scope 1 emissions from direct operations: ${emissionsData.scope_1} tCO₂e`);
    }

    if (emissionsData.scope_2 !== 'N/A') {
      summary.push(`Scope 2 emissions from purchased energy: ${emissionsData.scope_2} tCO₂e`);
    }

    if (text.includes('reduction') || text.includes('decrease')) {
      summary.push('Company demonstrates commitment to emission reduction initiatives');
    }

    if (text.includes('renewable') || text.includes('solar') || text.includes('wind')) {
      summary.push('Investment in renewable energy sources identified');
    }

    return summary;
  }

  /**
   * Main analysis function
   */
  async analyzeDocument(buffer, filename, includeAISummary = false) {
    console.log(`Analyzing document: ${filename}`);

    let text = '';

    // Extract text based on file type
    if (filename.toLowerCase().endsWith('.pdf')) {
      text = await this.extractTextFromPDF(buffer);
    } else {
      text = await this.extractTextFromImage(buffer);
    }

    if (!text.trim()) {
      throw new Error('No text could be extracted from the document');
    }

    console.log(`Text extracted, length: ${text.length}`);

    // Extract company information
    const { companyName, reportYear } = this.extractCompanyInfo(text);
    console.log('--- Extracted Company Info ---');
    console.log('Company Name:', companyName);
    console.log('Report Year:', reportYear);
    console.log('------------------------------');

    // Extract emissions data
    const emissionsData = this.extractEmissionsData(text);
    console.log('--- Extracted Emissions Data ---');
    console.log('Scope 1:', emissionsData.scope_1);
    console.log('Scope 2:', emissionsData.scope_2);
    console.log('Scope 3:', emissionsData.scope_3);
    console.log('Total GHG:', emissionsData.total_ghg_emissions);
    console.log('--------------------------------');

    // Extract goals
    const goals = this.extractGoals(text);
    console.log('--- Extracted Goals ---');
    console.log('Goals:', goals);
    console.log('-----------------------');

    // Extract ESG data
    const esgData = this.extractESGData(text);
    console.log('--- Extracted ESG Data ---');
    console.log('Environmental:', esgData.environmental);
    console.log('Social:', esgData.social);
    console.log('Governance:', esgData.governance);
    console.log('-----------------------------');

    // Generate summary
    const summary = includeAISummary ? await this.generateSummary(text, emissionsData) : [];
    console.log('--- AI/Rule-based Summary ---');
    console.log('Summary:', summary);
    console.log('-----------------------------');

    // Build result
    const result = {
      company_name: companyName,
      report_year: reportYear,
      scope_1: emissionsData.scope_1,
      scope_2: emissionsData.scope_2,
      scope_3: emissionsData.scope_3,
      total_ghg_emissions: emissionsData.total_ghg_emissions,
      unit: 'tCO₂e',
      sustainability_goals: goals,
      extraction_timestamp: new Date().toISOString(),
      extraction_method: 'javascript_regex',
      filename: filename,
      file_size: buffer.length,
      esg_data: esgData // Add extracted ESG data here
    };

    if (includeAISummary && summary.length > 0) {
      result.ai_summary = summary;
    }

    return result;
  }
}

// Initialize analyzer
const analyzer = new SustainabilityAnalyzer();

/**
 * API Routes
 */

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Sustainability Analyzer API',
    version: '1.0.0',
    features: ['PDF Analysis', 'OCR Processing', 'GHG Extraction', 'AI Insights']
  });
});

// Single document analysis
app.post('/api/analyze-sustainability-report', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const includeAISummary = req.body.include_summary === 'true';

    const result = await analyzer.analyzeDocument(
      req.file.buffer,
      req.file.originalname,
      includeAISummary
    );

    res.json(result);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      error: 'Analysis failed',
      message: error.message
    });
  }
});

// New Chatbot Query Endpoint
app.post('/api/chat-query', async (req, res) => {
  try {
    const { userQuestion, pdfText } = req.body;

    if (!userQuestion || !pdfText) {
      return res.status(400).json({ error: 'Missing userQuestion or pdfText in request body' });
    }

    if (!openai) {
      return res.status(500).json({ error: 'Together.ai API not initialized. Please set TOGETHER_API_KEY.' });
    }

    // Strict prompt: Only answer from PDF text, no outside knowledge
    const llmPrompt = `You are an AI Sustainability Assistant. You must answer ONLY using the information provided below, which is the raw text extracted from a sustainability report PDF. Do NOT use any outside knowledge or assumptions. If the answer to the user's question is not explicitly present in the provided text, respond with: 'The answer to your question is not available in the uploaded PDF.'

--- PDF Text ---
${pdfText}
--- End PDF Text ---

User Question: ${userQuestion}
AI Response:`;

    console.log('LLM Prompt:', llmPrompt);

    const response = await openai.chat.completions.create({
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", // Changed to a Together.ai compatible model
      messages: [{ role: "user", content: llmPrompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0].message.content;
    console.log('AI Response:', aiResponse);
    res.json({ answer: aiResponse });

  } catch (error) {
    console.error('Chat query error:', error);
    res.status(500).json({
      error: 'Failed to process chat query',
      message: error.message,
      details: error // Include the full error object for debugging
    });
  }
});

// Batch processing
app.post('/api/batch-analyze', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const includeAISummary = req.body.include_summary === 'true';
    const results = [];

    for (const file of req.files) {
      try {
        const result = await analyzer.analyzeDocument(
          file.buffer,
          file.originalname,
          includeAISummary
        );
        results.push(result);
      } catch (error) {
        results.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      results,
      total_processed: results.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Batch analysis error:', error);
    res.status(500).json({
      error: 'Batch analysis failed',
      message: error.message
    });
  }
});

// Calculate emissions from extracted data
app.post('/api/calculate-emissions', (req, res) => {
  try {
    const { documents } = req.body;

    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'Invalid documents data' });
    }

    let totalEmissions = 0;
    const breakdown = {};

    documents.forEach(doc => {
      if (doc.scope_1 && doc.scope_1 !== 'N/A') {
        const value = parseFloat(doc.scope_1);
        totalEmissions += value;
        breakdown.scope_1 = value;
      }

      if (doc.scope_2 && doc.scope_2 !== 'N/A') {
        const value = parseFloat(doc.scope_2);
        totalEmissions += value;
        breakdown.scope_2 = value;
      }

      if (doc.scope_3 && doc.scope_3 !== 'N/A') {
        const value = parseFloat(doc.scope_3);
        totalEmissions += value;
        breakdown.scope_3 = value;
      }
    });

    res.json({
      total_emissions: Math.round(totalEmissions * 100) / 100,
      breakdown,
      unit: 'tCO₂e',
      calculated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({
      error: 'Calculation failed',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
  }

  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Do not start the server here; server.js will handle app.listen().

module.exports = app;
