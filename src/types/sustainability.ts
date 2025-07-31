export interface ExtractedData {
  energyUsage?: number; // kWh
  waterConsumption?: number; // Liters
  fuelConsumption?: number; // Liters
  wasteGeneration?: number; // kg
  amount?: number; // INR
  billDate?: string;
  vendor?: string;
  billType: 'electricity' | 'water' | 'fuel' | 'waste' | 'other';
}

export interface EmissionFactors {
  electricity: number; // kg CO2/kWh - India grid factor
  water: number; // kg CO2/L
  petrol: number; // kg CO2/L
  diesel: number; // kg CO2/L
  waste: number; // kg CO2/kg
}

export interface SustainabilityMetrics {
  company_name: string;
  report_year: string;
  scope_1: string | number; // tCO2e
  scope_2: string | number; // tCO2e
  scope_3: string | number; // tCO2e
  total_ghg_emissions: string | number; // tCO2e
  unit: string;
  sustainability_goals: string[];
  extraction_timestamp: string;
  extraction_method: string;
  filename: string;
  file_size: number;
  ai_summary?: string[]; // Optional AI generated summary
  carbonFootprint?: number; // tCO2e - These might be dummy/derived
  energyUsage?: number; // kWh
  waterConsumption?: number; // L
  wasteGeneration?: number; // kg
  esgScore?: number; // 0-100
  trends?: {
    carbon: number[];
    energy: number[];
    water: number[];
    waste: number[];
  };
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  type: 'bronze' | 'silver' | 'gold' | 'platinum';
  icon: string;
  earned: boolean;
  earnedDate?: Date;
  progress?: number; // 0-100
}

export interface Pledge {
  id: string;
  title: string;
  description: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  category: 'energy' | 'water' | 'carbon' | 'waste';
  status: 'active' | 'completed' | 'failed';
}