/**
 * Frontend client for Sustainability Analyzer API
 */

class SustainabilityClient {
  constructor(baseURL = 'https://sustainability-analyzer.onrender.com/api') {
    this.baseURL = baseURL;
  }

  /**
   * Analyze a single sustainability report
   */
  async analyzeReport(file, includeSummary = false) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('include_summary', includeSummary.toString());

    try {
      const response = await fetch(`${this.baseURL}/analyze-sustainability-report`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Report analysis error:', error);
      throw error;
    }
  }

  /**
   * Batch analyze multiple reports
   */
  async batchAnalyze(files, includeSummary = false) {
    const formData = new FormData();

    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('include_summary', includeSummary.toString());

    try {
      const response = await fetch(`${this.baseURL}/batch-analyze`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Batch analysis failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Batch analysis error:', error);
      throw error;
    }
  }

  /**
   * Calculate total emissions from extracted data
   */
  async calculateEmissions(documents) {
    try {
      const response = await fetch(`${this.baseURL}/calculate-emissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ documents })
      });

      if (!response.ok) {
        throw new Error(`Calculation failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Emissions calculation error:', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await fetch(`${this.baseURL}/health`);
      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }
}

// Export for use in React components
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SustainabilityClient;
} else if (typeof window !== 'undefined') {
  window.SustainabilityClient = SustainabilityClient;
}