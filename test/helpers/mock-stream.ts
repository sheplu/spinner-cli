import { WriteStream } from 'tty';

export interface MockStream extends WriteStream {
  output: string;
  chunks: string[];
  clear(): void;
}

export function createMockStream(options: { isTTY?: boolean; columns?: number } = {}): MockStream {
  const chunks: string[] = [];

  const stream = {
    write(chunk: string): boolean {
      chunks.push(chunk);
      return true;
    },
    get output(): string {
      return chunks.join('');
    },
    get chunks(): string[] {
      return chunks;
    },
    clear(): void {
      chunks.length = 0;
    },
    isTTY: options.isTTY ?? true,
    columns: options.columns ?? 80,
    rows: 24,
    // Additional WriteStream properties needed for type compatibility
    writable: true,
    writableEnded: false,
    writableFinished: false,
    writableHighWaterMark: 16384,
    writableLength: 0,
    writableObjectMode: false,
    writableCorked: 0,
    allowHalfOpen: false,
    destroyed: false,
    closed: false,
    errored: null,
    writableNeedDrain: false,
    end: () => stream,
    destroy: () => stream,
    cork: () => {},
    uncork: () => {},
    setDefaultEncoding: () => stream,
    pipe: () => null as any,
    on: () => stream,
    once: () => stream,
    off: () => stream,
    addListener: () => stream,
    removeListener: () => stream,
    removeAllListeners: () => stream,
    emit: () => true,
    prependListener: () => stream,
    prependOnceListener: () => stream,
    listeners: () => [],
    rawListeners: () => [],
    listenerCount: () => 0,
    eventNames: () => [],
    getMaxListeners: () => 10,
    setMaxListeners: () => stream,
    cursorTo: () => true,
    moveCursor: () => true,
    clearLine: () => true,
    clearScreenDown: () => true,
    getColorDepth: () => 8,
    hasColors: () => true,
    getWindowSize: () => [80, 24],
    [Symbol.asyncDispose]: async () => {},
    [Symbol.dispose]: () => {},
  } as unknown as MockStream;

  return stream;
}

// ANSI code patterns for testing
export const ANSI = {
  HIDE_CURSOR: '\x1B[?25l',
  SHOW_CURSOR: '\x1B[?25h',
  CLEAR_LINE: '\r\x1B[K',
  RESET: '\x1B[0m',
  GREEN: '\x1B[32m',
  RED: '\x1B[31m',
  YELLOW: '\x1B[33m',
  BLUE: '\x1B[34m',
  CYAN: '\x1B[36m',
  GRAY: '\x1B[90m',
};

// Helper to strip ANSI codes from output
export function stripAnsi(str: string): string {
  return str.replace(/\x1B\[[0-9;]*m|\x1B\[\?25[lh]|\r\x1B\[K|\x1B\[\d+[AB]/g, '');
}
