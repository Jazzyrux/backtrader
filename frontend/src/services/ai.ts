import { OHLCV } from '../types/trading';
import { BASE_URL } from './api';

export interface AIStrategy {
  id: string;
  name: string;
  type: 'prediction' | 'classification';
  params: Record<string, any>;
}

export interface PredictionResult {
  predictedPrice: number;
  confidence: number;
  timestamp: string;
}

export const aiService = {
  async trainModel(data: OHLCV[], strategy: AIStrategy) {
    const response = await fetch(`${BASE_URL}/ai/train`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data,
        strategy
      })
    });
    return response.json();
  },

  async getPrediction(symbol: string, strategy: AIStrategy): Promise<PredictionResult> {
    const response = await fetch(`${BASE_URL}/ai/predict/${symbol}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ strategy })
    });
    return response.json();
  }
}; 