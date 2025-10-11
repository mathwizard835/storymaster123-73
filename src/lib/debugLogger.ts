// Centralized debugging and logging system for story progression
// Stores last 50 operations in sessionStorage for debugging

export interface LogEntry {
  timestamp: string;
  type: 'choice' | 'scene' | 'inventory' | 'learning' | 'error' | 'info';
  message: string;
  data?: any;
}

const MAX_LOGS = 50;
const STORAGE_KEY = 'smq.debug_logs';
const DEBUG_MODE_KEY = 'smq.debug_mode';

export class DebugLogger {
  private static isEnabled(): boolean {
    try {
      return localStorage.getItem(DEBUG_MODE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  static enable(): void {
    try {
      localStorage.setItem(DEBUG_MODE_KEY, 'true');
      console.log('🔍 Debug mode enabled');
    } catch (e) {
      console.error('Failed to enable debug mode:', e);
    }
  }

  static disable(): void {
    try {
      localStorage.removeItem(DEBUG_MODE_KEY);
      console.log('🔍 Debug mode disabled');
    } catch (e) {
      console.error('Failed to disable debug mode:', e);
    }
  }

  private static getLogs(): LogEntry[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private static saveLogs(logs: LogEntry[]): void {
    try {
      // Keep only last MAX_LOGS entries
      const trimmed = logs.slice(-MAX_LOGS);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to save debug logs:', e);
    }
  }

  static log(type: LogEntry['type'], message: string, data?: any): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type,
      message,
      data
    };

    // Always log to console for debugging
    const emoji = {
      choice: '🎯',
      scene: '📖',
      inventory: '🎒',
      learning: '📚',
      error: '❌',
      info: 'ℹ️'
    }[type];

    console.log(`${emoji} [${type.toUpperCase()}] ${message}`, data || '');

    // Save to sessionStorage
    const logs = this.getLogs();
    logs.push(entry);
    this.saveLogs(logs);
  }

  static logChoice(choiceId: string, choiceText: string): void {
    this.log('choice', `User selected: \"${choiceText}\"`, { choiceId, choiceText });
  }

  static logSceneGeneration(choiceId: string | null, sceneNumber: number): void {
    this.log('scene', `Generating scene ${sceneNumber}`, { choiceId, sceneNumber });
  }

  static logInventoryChange(action: 'add' | 'remove' | 'use', itemName: string): void {
    this.log('inventory', `Inventory ${action}: ${itemName}`, { action, itemName });
  }

  static logLearningUpdate(conceptName: string, oldMastery: number, newMastery: number): void {
    this.log('learning', `${conceptName} mastery: ${oldMastery}% → ${newMastery}%`, {
      conceptName,
      oldMastery,
      newMastery
    });
  }

  static logError(error: string, context?: any): void {
    this.log('error', error, context);
  }

  static getRecentLogs(count: number = 20): LogEntry[] {
    return this.getLogs().slice(-count);
  }

  static clearLogs(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      console.log('🔍 Debug logs cleared');
    } catch (e) {
      console.error('Failed to clear debug logs:', e);
    }
  }

  static exportLogs(): string {
    return JSON.stringify(this.getLogs(), null, 2);
  }
}

// Export convenience functions
export const logChoice = DebugLogger.logChoice.bind(DebugLogger);
export const logSceneGeneration = DebugLogger.logSceneGeneration.bind(DebugLogger);
export const logInventoryChange = DebugLogger.logInventoryChange.bind(DebugLogger);
export const logLearningUpdate = DebugLogger.logLearningUpdate.bind(DebugLogger);
export const logError = DebugLogger.logError.bind(DebugLogger);
