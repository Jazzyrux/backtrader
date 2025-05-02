import type { Strategy } from '@/types/trading';
import { PinescriptConverter } from './pinescriptConverter';

interface StrategyFile {
  id: string;
  name: string;
  content: string;
  type: 'pinescript' | 'typescript';
  createdAt: string;
  updatedAt: string;
}

class StrategyService {
  private baseUrl = '/api/strategies';

  async getStrategies(): Promise<Strategy[]> {
    try {
      const response = await fetch(this.baseUrl);
      if (!response.ok) throw new Error('Erreur lors de la récupération des stratégies');
      return response.json();
    } catch (error) {
      console.error('Erreur dans getStrategies:', error);
      throw error;
    }
  }

  async getStrategyFiles(): Promise<StrategyFile[]> {
    try {
      const response = await fetch(`${this.baseUrl}/files`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des fichiers');
      return response.json();
    } catch (error) {
      console.error('Erreur dans getStrategyFiles:', error);
      throw error;
    }
  }

  async createStrategy(file: { name: string; content: string; type: 'pinescript' | 'typescript' }): Promise<Strategy> {
    try {
      // Si c'est du Pinescript, convertir d'abord en stratégie TypeScript
      let strategy: Strategy;
      if (file.type === 'pinescript') {
        strategy = PinescriptConverter.convertToStrategy(file.content);
        file.content = JSON.stringify(strategy);
        file.type = 'typescript';
      }

      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(file)
      });
      
      if (!response.ok) throw new Error('Erreur lors de la création de la stratégie');
      return response.json();
    } catch (error) {
      console.error('Erreur dans createStrategy:', error);
      throw error;
    }
  }

  async updateStrategy(id: string, updates: Partial<StrategyFile>): Promise<Strategy> {
    try {
      // Si c'est du Pinescript, convertir d'abord en stratégie TypeScript
      if (updates.type === 'pinescript' && updates.content) {
        const strategy = PinescriptConverter.convertToStrategy(updates.content);
        updates.content = JSON.stringify(strategy);
        updates.type = 'typescript';
      }

      const response = await fetch(`${this.baseUrl}/files/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) throw new Error('Erreur lors de la mise à jour de la stratégie');
      return response.json();
    } catch (error) {
      console.error('Erreur dans updateStrategy:', error);
      throw error;
    }
  }

  async deleteStrategy(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/files/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression de la stratégie');
    } catch (error) {
      console.error('Erreur dans deleteStrategy:', error);
      throw error;
    }
  }

  async importFromTradingView(url: string): Promise<Strategy> {
    try {
      // Extraire l'ID de la stratégie depuis l'URL
      const strategyId = url.split('/').pop();
      if (!strategyId) throw new Error('URL TradingView invalide');

      // Récupérer le code Pinescript depuis TradingView
      const response = await fetch(`${this.baseUrl}/import/tradingview/${strategyId}`, {
        method: 'GET',
      });

      if (!response.ok) throw new Error('Erreur lors de l\'importation depuis TradingView');
      
      const { pinescriptCode } = await response.json();
      
      // Convertir le code Pinescript en stratégie
      const strategy = PinescriptConverter.convertToStrategy(pinescriptCode);
      
      // Sauvegarder la stratégie
      return await this.createStrategy({
        name: strategy.name,
        content: JSON.stringify(strategy),
        type: 'typescript'
      });
    } catch (error) {
      console.error('Erreur dans importFromTradingView:', error);
      throw error;
    }
  }

  async importPinescript(code: string): Promise<Strategy> {
    try {
      // Convertir directement le code Pinescript en stratégie
      const strategy = PinescriptConverter.convertToStrategy(code);
      
      // Sauvegarder la stratégie
      return await this.createStrategy({
        name: strategy.name,
        content: JSON.stringify(strategy),
        type: 'typescript'
      });
    } catch (error) {
      console.error('Erreur dans importPinescript:', error);
      throw error;
    }
  }

  async searchStrategies(query: string): Promise<StrategyFile[]> {
    try {
      const response = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Erreur lors de la recherche de stratégies');
      return response.json();
    } catch (error) {
      console.error('Erreur dans searchStrategies:', error);
      throw error;
    }
  }
}

export const strategyService = new StrategyService(); 