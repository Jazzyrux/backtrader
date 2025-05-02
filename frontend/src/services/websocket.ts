import type { OHLCV } from '@/types/trading';

type DataHandler = (data: OHLCV) => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<DataHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  public connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:5000/ws';
    this.ws = new WebSocket(WS_URL);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const handlers = this.subscribers.get(data.symbol);
        handlers?.forEach(handler => handler(data));
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(), 1000 * Math.pow(2, this.reconnectAttempts));
      }
    };

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.subscribers.forEach((_, symbol) => {
        this.sendSubscription(symbol);
      });
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.subscribers.clear();
    }
  }

  subscribe(symbol: string, handler: DataHandler) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
      this.sendSubscription(symbol);
    }
    this.subscribers.get(symbol)?.add(handler);
    this.connect();
  }

  unsubscribe(symbol: string, handler: DataHandler) {
    const handlers = this.subscribers.get(symbol);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.subscribers.delete(symbol);
        this.sendUnsubscription(symbol);
      }
    }
  }

  private sendSubscription(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  }

  private sendUnsubscription(symbol: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'unsubscribe', symbol }));
    }
  }
}

export const wsService = new WebSocketService(); 