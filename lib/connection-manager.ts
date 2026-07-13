import { EventEmitter } from 'events';

export interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastError?: string;
  retryCount: number;
  nextRetryIn?: number;
}

class ConnectionManager extends EventEmitter {
  private state: ConnectionState = {
    isConnected: false,
    isConnecting: false,
    retryCount: 0,
  };

  getState() {
    return { ...this.state };
  }

  async connect(device: any): Promise<boolean> {
    this.state.isConnecting = true;
    this.emit('state-change', this.state);

    await new Promise(resolve => setTimeout(resolve, 1500));

    this.state.isConnected = true;
    this.state.isConnecting = false;
    this.emit('state-change', this.state);
    return true;
  }

  async disconnect() {
    this.state.isConnected = false;
    this.emit('state-change', this.state);
  }

  destroy() {
    this.removeAllListeners();
  }
}

export const connectionManager = new ConnectionManager();