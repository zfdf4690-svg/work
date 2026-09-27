/**
 * App Core Event Bus
 * 领域事件总线：解耦服务层与通信层，统一发布/订阅机制
 */

import { DomainEvent, EventType } from '../../domain/events/event.types';

export type EventListener<T = unknown> = (event: DomainEvent<T>) => void;

export interface IEventBus {
  publish<T = unknown>(event: DomainEvent<T>): void;
  subscribe<T = unknown>(type: EventType | '*', listener: EventListener<T>): () => void;
  clear(): void;
}

export class DomainEventBus implements IEventBus {
  private static instance: DomainEventBus | null = null;
  private listeners: Map<string, Set<EventListener<any>>> = new Map();

  public static getInstance(): DomainEventBus {
    if (!DomainEventBus.instance) {
      DomainEventBus.instance = new DomainEventBus();
    }
    return DomainEventBus.instance;
  }

  public publish<T = unknown>(event: DomainEvent<T>): void {
    // 派发指定类型的事件监听器
    const typeListeners = this.listeners.get(event.type);
    if (typeListeners) {
      typeListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`[EventBus] Error executing listener for event: ${event.type}`, err);
        }
      });
    }

    // 派发通配符通告监听器
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(`[EventBus] Error executing wildcard listener for event: ${event.type}`, err);
        }
      });
    }
  }

  public subscribe<T = unknown>(type: EventType | '*', listener: EventListener<T>): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }

    const set = this.listeners.get(type)!;
    set.add(listener as EventListener<any>);

    // 返回取消订阅回调
    return () => {
      set.delete(listener as EventListener<any>);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    };
  }

  public clear(): void {
    this.listeners.clear();
  }
}
