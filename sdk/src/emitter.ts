import type { EventMap, EventType } from './types';

export class EventEmitter {
  private listeners = new Map<string, Set<Function>>();

  on<E extends EventType>(event: E, fn: (data: EventMap[E]) => void): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(fn);
    return () => this.off(event, fn);
  }

  off<E extends EventType>(event: E, fn: Function): void {
    this.listeners.get(event)?.delete(fn);
  }

  protected emit<E extends EventType>(event: E, data: EventMap[E]): void {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }
}
