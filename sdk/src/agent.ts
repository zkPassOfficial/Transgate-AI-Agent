import { EventEmitter } from './emitter';
import type { BatchResult, ChatResponse } from './types';

const TARGET = 'transgate-ai-agent';

export class TransGateAgent extends EventEmitter {
  private conversationId = '';
  private messageHandler: (event: MessageEvent) => void;
  private resultResolver: ((value: BatchResult) => void) | null = null;
  private resultRejecter: ((reason: any) => void) | null = null;
  private chatResolver: ((value: ChatResponse) => void) | null = null;
  private chatRejecter: ((reason: any) => void) | null = null;
  private conversationResolve: (() => void) | null = null;
  private readyPromise: Promise<void>;

  constructor() {
    super();
    this.messageHandler = this.handleMessage.bind(this);
    window.addEventListener('message', this.messageHandler);
    this.readyPromise = document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise(r => window.addEventListener('load', () => r(), { once: true }));
  }

  destroy(): void {
    window.removeEventListener('message', this.messageHandler);
    if (this.chatRejecter) { this.chatRejecter(new Error('Agent destroyed')); this.chatResolver = null; this.chatRejecter = null; }
    if (this.resultRejecter) { this.resultRejecter(new Error('Agent destroyed')); this.resultResolver = null; this.resultRejecter = null; }
  }

  // --- Private ---

  private send(type: string, payload?: Record<string, unknown>): void {
    window.postMessage({ target: TARGET, type, ...payload }, '*');
  }

  private initConversation(): Promise<void> {
    return new Promise(resolve => {
      this.conversationResolve = resolve;
      this.send('TRANSGATE_NEW_CONVERSATION');
    });
  }

  private resetConversation(): void {
    this.conversationId = '';
  }

  private handleMessage(event: MessageEvent): void {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== TARGET) return;

    const type: string = data.type || '';

    if (type.includes('CHAT_PROGRESS')) {
      this.emit('chatProgress', { step: data.step, message: data.message });

    } else if (type.includes('CHAT_RESULT')) {
      const response: ChatResponse = {
        action: data.action,
        reply: data.reply,
        schemaIds: data.schemaIds,
        campaign: data.campaign,
        thinking: data.thinking,
      };
      this.emit('chatResult', response);
      if (this.chatResolver) {
        this.chatResolver(response);
        this.chatResolver = null;
        this.chatRejecter = null;
      }

    } else if (type.includes('STATUS_UPDATE')) {
      this.emit('status', data.status);

    } else if (type.includes('BATCH_RESULT')) {
      const result: BatchResult = {
        results: data.results || [],
        campaign: data.campaign,
      };
      this.emit('result', result);
      if (this.resultResolver) {
        this.resultResolver(result);
        this.resultResolver = null;
        this.resultRejecter = null;
      }
      this.resetConversation();

    } else if (type === 'TRANSGATE_RESPONSE') {
      if (data.conversationId) {
        this.conversationId = data.conversationId;
        if (this.conversationResolve) {
          this.conversationResolve();
          this.conversationResolve = null;
        }
      }

    } else if (type === 'TRANSGATE_ERROR') {
      this.emit('error', data.error);
      if (this.chatRejecter) { this.chatRejecter(new Error(data.error)); this.chatResolver = null; this.chatRejecter = null; }
      if (this.resultRejecter) { this.resultRejecter(new Error(data.error)); this.resultResolver = null; this.resultRejecter = null; }
    }
  }

  // --- Public: 3 modes ---

  async verify(zkpassSchemaIds: string[]): Promise<BatchResult> {
    await this.readyPromise;
    return new Promise((resolve, reject) => {
      this.resultResolver = resolve;
      this.resultRejecter = reject;
      this.send('TRANSGATE_VERIFY_SCHEMA', { zkpassSchemaIds });
    });
  }

  async verifyCampaign(campaignId: number): Promise<BatchResult> {
    await this.readyPromise;
    return new Promise((resolve, reject) => {
      this.resultResolver = resolve;
      this.resultRejecter = reject;
      this.send('TRANSGATE_VERIFY_CAMPAIGN', { campaignId });
    });
  }

  async chat(message: string): Promise<ChatResponse> {
    await this.readyPromise;
    if (!this.conversationId) await this.initConversation();
    return new Promise((resolve, reject) => {
      this.chatResolver = resolve;
      this.chatRejecter = reject;
      this.send('TRANSGATE_CHAT', { message, conversationId: this.conversationId });
    });
  }

  // --- Public: control ---

  async waitForResult(): Promise<BatchResult> {
    return new Promise((resolve, reject) => {
      this.resultResolver = resolve;
      this.resultRejecter = reject;
    });
  }

  stop(): void {
    this.send('TRANSGATE_STOP_VERIFICATION');
  }
}
