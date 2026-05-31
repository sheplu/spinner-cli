/**
 * @fileoverview Native Node.js CLI spinner implementation with zero dependencies.
 * Provides animated spinners for terminal applications with support for colors,
 * progress bars, CI mode, and concurrent spinner groups.
 * @module spinner-cli
 */

// ANSI escape codes
const HIDE_CURSOR = '\x1B[?25l';
const SHOW_CURSOR = '\x1B[?25h';
const CLEAR_LINE = '\r\x1B[K';
const RESET = '\x1B[0m';

/**
 * Matches all C0 control characters (0x00–0x1F), DEL (0x7F), and the 8-bit CSI
 * introducer (0x9B). This covers ESC (0x1B) — the lead byte of every ANSI
 * escape / OSC sequence — as well as BEL (0x07), CR (0x0D), and backspace.
 */
const CONTROL_CHARS = /[\x00-\x1F\x7F\x9B]/g;

/**
 * Removes terminal control characters from a string so caller-supplied text
 * cannot inject ANSI escape sequences (cursor movement, screen clears, `\r`
 * line-spoofing, OSC hyperlink/window-title sequences) into the output stream.
 *
 * This strips **all** C0 controls, including newline (`\n`) and tab (`\t`),
 * because the spinner is a single-line in-place renderer — embedded newlines
 * would corrupt the animation. Printable text, emoji, and CJK are preserved.
 *
 * The spinner sanitizes all user-supplied strings with this automatically; it
 * is exported so consumers can reuse the same policy on their own output.
 *
 * @param s - The untrusted string to sanitize.
 * @returns The string with all control characters removed.
 * @example
 * stripControl('done\x1B[2J\x1B]0;evil\x07'); // => 'done0;evil'
 */
export function stripControl(s: string): string {
  return s.replace(CONTROL_CHARS, '');
}

/**
 * Something that holds a live timer / hidden cursor and must be cleaned up if
 * the process is interrupted or exits. Implemented by Spinner and SpinnerGroup.
 * @internal
 */
interface Cleanable {
  /** Restore the cursor and clear the animation timer. Must be idempotent. */
  _onProcessExit(): void;
}

/**
 * Shared registry of running animations. We attach exactly one `SIGINT` and one
 * `exit` handler to `process` for the whole module (regardless of how many
 * spinners exist), rather than one pair per instance — this avoids
 * `MaxListenersExceededWarning` and the associated leak.
 * @internal
 */
const activeAnimations = new Set<Cleanable>();
let handlersInstalled = false;

function onProcessExit(): void {
  for (const a of activeAnimations) a._onProcessExit();
}

function onSigint(): void {
  for (const a of activeAnimations) a._onProcessExit();
  activeAnimations.clear();
  // Attaching a SIGINT listener overrides Node's default terminate-on-Ctrl-C.
  // Re-raise that default ONLY when we're the sole listener; if the consumer
  // registered their own SIGINT handler, clean up and yield to it.
  if (process.listenerCount('SIGINT') <= 1) {
    process.exit(130);
  }
}

function registerAnimation(a: Cleanable): void {
  activeAnimations.add(a);
  if (!handlersInstalled) {
    handlersInstalled = true;
    process.on('exit', onProcessExit);
    process.on('SIGINT', onSigint);
  }
}

function unregisterAnimation(a: Cleanable): void {
  activeAnimations.delete(a);
  // Handlers stay installed; they are cheap no-ops when the set is empty.
}

/** @internal Test-only: number of animations currently registered. */
export function __activeAnimationCount(): number {
  return activeAnimations.size;
}

/**
 * Detects if the current environment is a CI (Continuous Integration) system.
 * Checks for common CI environment variables from GitHub Actions, GitLab CI,
 * CircleCI, Travis CI, Jenkins, Buildkite, and Azure Pipelines.
 * @returns `true` if running in a CI environment, `false` otherwise.
 * @example
 * if (isCI()) {
 *   console.log('Running in CI mode');
 * }
 */
export function isCI(): boolean {
  const env = process.env;
  return !!(
    env.CI ||
    env.GITHUB_ACTIONS ||
    env.GITLAB_CI ||
    env.CIRCLECI ||
    env.TRAVIS ||
    env.JENKINS_URL ||
    env.BUILDKITE ||
    env.TF_BUILD
  );
}

/**
 * Detects if a stream is a TTY (terminal).
 * Non-TTY streams (like pipes or files) don't support cursor movement or colors.
 * @param stream - The write stream to check. Defaults to `process.stderr`.
 * @returns `true` if the stream is a TTY, `false` otherwise.
 * @example
 * if (isTTY(process.stdout)) {
 *   console.log('Terminal supports colors');
 * }
 */
export function isTTY(stream: NodeJS.WriteStream = process.stderr): boolean {
  return stream.isTTY ?? false;
}

/**
 * ANSI color codes for terminal output.
 * Each color code can be used to colorize text in terminal applications.
 * Use `RESET` ('\x1B[0m') to return to default color.
 * @example
 * console.log(`${colors.green}Success${RESET}`);
 */
export const colors = {
  /** Black text color (ANSI code 30) */
  black: '\x1B[30m',
  /** Red text color (ANSI code 31) */
  red: '\x1B[31m',
  /** Green text color (ANSI code 32) */
  green: '\x1B[32m',
  /** Yellow text color (ANSI code 33) */
  yellow: '\x1B[33m',
  /** Blue text color (ANSI code 34) */
  blue: '\x1B[34m',
  /** Magenta text color (ANSI code 35) */
  magenta: '\x1B[35m',
  /** Cyan text color (ANSI code 36) */
  cyan: '\x1B[36m',
  /** White text color (ANSI code 37) */
  white: '\x1B[37m',
  /** Gray text color (ANSI code 90) */
  gray: '\x1B[90m',
} as const;

/**
 * Available color names for spinner and text coloring.
 * Corresponds to keys in the {@link colors} object.
 */
export type Color = keyof typeof colors;

/**
 * Braille dot spinner frames (default). Smooth, modern appearance.
 * @example
 * const spinner = new Spinner({ frames: BRAILLE_FRAMES });
 */
export const BRAILLE_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;

/**
 * ASCII-only spinner frames. Compatible with all terminals.
 * @example
 * const spinner = new Spinner({ frames: ASCII_FRAMES });
 */
export const ASCII_FRAMES = ['|', '/', '-', '\\'] as const;

/**
 * Circle quarter spinner frames. Clean, minimal appearance.
 * @example
 * const spinner = new Spinner({ frames: CIRCLE_FRAMES });
 */
export const CIRCLE_FRAMES = ['◐', '◓', '◑', '◒'] as const;

/**
 * Arrow spinner frames. Directional rotation animation.
 * @example
 * const spinner = new Spinner({ frames: ARROW_FRAMES });
 */
export const ARROW_FRAMES = ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'] as const;

/**
 * Arc spinner frames. Smooth curved animation.
 * @example
 * const spinner = new Spinner({ frames: ARC_FRAMES });
 */
export const ARC_FRAMES = ['◜', '◠', '◝', '◞', '◡', '◟'] as const;

/**
 * Dots spinner frames. Simple loading dots animation.
 * @example
 * const spinner = new Spinner({ frames: DOTS_FRAMES });
 */
export const DOTS_FRAMES = ['.  ', '.. ', '...', '   '] as const;

/**
 * Custom symbols for spinner status methods.
 * Override the default symbols (✔, ✖, ⚠, ℹ) with custom characters or emoji.
 * @example
 * const spinner = new Spinner({
 *   symbols: {
 *     succeed: '👍',
 *     fail: '💥',
 *     warn: '⚡',
 *     info: '📢'
 *   }
 * });
 */
export interface SpinnerSymbols {
  /** Symbol shown when `succeed()` is called. Default: '✔' */
  succeed?: string;
  /** Symbol shown when `fail()` is called. Default: '✖' */
  fail?: string;
  /** Symbol shown when `warn()` is called. Default: '⚠' */
  warn?: string;
  /** Symbol shown when `info()` is called. Default: 'ℹ' */
  info?: string;
}

/**
 * Configuration options for the Spinner class.
 * All options are optional and have sensible defaults.
 * @example
 * const options: SpinnerOptions = {
 *   text: 'Loading...',
 *   color: 'cyan',
 *   frames: BRAILLE_FRAMES,
 *   showTime: true
 * };
 */
export interface SpinnerOptions {
  /** Animation frames to cycle through. Default: {@link BRAILLE_FRAMES} */
  frames?: readonly string[];
  /** Animation interval in milliseconds. Default: 80 */
  interval?: number;
  /** Text to display next to the spinner. Default: '' */
  text?: string;
  /** Color of the spinner character. Default: undefined (no color) */
  color?: Color;
  /** Disable colors and animations. Auto-detected from CI env vars and TTY if not set. */
  ci?: boolean;
  /** Show elapsed time next to spinner text. Default: false */
  showTime?: boolean;
  /** Output stream. Default: process.stderr */
  stream?: NodeJS.WriteStream;
  /** Text prefix shown before spinner (e.g., "  " for indent or "[1/3] "). Default: '' */
  prefix?: string;
  /** Text suffix shown after main text. Default: '' */
  suffix?: string;
  /** Custom symbols for status methods. Default: { succeed: '✔', fail: '✖', warn: '⚠', info: 'ℹ' } */
  symbols?: SpinnerSymbols;
  /** Keep spinner line visible after stop (don't clear). Default: false */
  persist?: boolean;
  /** Hide/show cursor during spinning. Set to false for problematic terminals. Default: true */
  hideCursor?: boolean;
  /** Color for the text (separate from spinner color). Default: undefined */
  textColor?: Color;
  /** Show progress as visual bar instead of percentage. Default: false */
  progressBar?: boolean;
  /** Width of progress bar in characters. Default: 20 */
  progressBarWidth?: number;
  /** Truncate text to fit terminal width. Default: false */
  truncate?: boolean;
}

/**
 * Options for the promise wrapper method.
 * @example
 * await spinner.promise(fetch('/api/data'), {
 *   text: 'Fetching data...',
 *   successText: 'Data loaded!',
 *   failText: 'Failed to load data'
 * });
 */
export interface PromiseOptions {
  /** Text to show while the promise is pending. */
  text?: string;
  /** Text to show when the promise resolves. Uses spinner text if not provided. */
  successText?: string;
  /** Text to show when the promise rejects. Uses spinner text if not provided. */
  failText?: string;
}

/**
 * An animated CLI spinner for terminal applications.
 * Displays a spinning indicator with optional text, colors, and progress tracking.
 *
 * @example
 * // Basic usage
 * const spinner = new Spinner({ text: 'Loading...' });
 * spinner.start();
 * // ... do work ...
 * spinner.succeed('Done!');
 *
 * @example
 * // With progress
 * const spinner = new Spinner({ text: 'Downloading', progressBar: true });
 * spinner.start();
 * spinner.progress(50, 100); // 50% complete
 * spinner.succeed('Downloaded!');
 *
 * @example
 * // With promise wrapper
 * const data = await spinner.promise(fetchData(), {
 *   text: 'Fetching...',
 *   successText: 'Loaded!',
 *   failText: 'Failed!'
 * });
 */
export class Spinner implements Cleanable {
  private frames: readonly string[];
  private interval: number;
  private text: string;
  private color: Color | undefined;
  private textColor: Color | undefined;
  private ciMode: boolean;
  private showTime: boolean;
  private currentFrame: number;
  private _isSpinning: boolean;
  private timer: ReturnType<typeof setInterval> | null;
  private stream: NodeJS.WriteStream;
  private startTime: number | null;
  private progressValue: number | null;
  private progressTotal: number | null;
  private prefix: string;
  private suffix: string;
  private symbols: Required<SpinnerSymbols>;
  private persist: boolean;
  private shouldHideCursor: boolean;
  private progressBar: boolean;
  private progressBarWidth: number;
  private truncate: boolean;

  /**
   * Creates a new Spinner instance.
   * @param options - Configuration options for the spinner.
   */
  constructor(options: SpinnerOptions = {}) {
    this.stream = options.stream ?? process.stderr;
    this.frames = options.frames ?? BRAILLE_FRAMES;
    if (this.frames.length === 0) {
      throw new Error('Spinner: `frames` must contain at least one frame');
    }
    this.interval = options.interval ?? 80;
    if (!Number.isFinite(this.interval) || this.interval < 1) {
      throw new Error('Spinner: `interval` must be a number >= 1');
    }
    // Sanitize all caller-supplied display strings so they cannot inject
    // terminal escape sequences into the output stream.
    this.text = stripControl(options.text ?? '');
    this.color = options.color;
    this.textColor = options.textColor;
    // CI mode: explicit option, or auto-detect from CI env vars or non-TTY
    this.ciMode = options.ci ?? (isCI() || !isTTY(this.stream));
    this.showTime = options.showTime ?? false;
    this.prefix = stripControl(options.prefix ?? '');
    this.suffix = stripControl(options.suffix ?? '');
    this.symbols = {
      succeed: stripControl(options.symbols?.succeed ?? '✔'),
      fail: stripControl(options.symbols?.fail ?? '✖'),
      warn: stripControl(options.symbols?.warn ?? '⚠'),
      info: stripControl(options.symbols?.info ?? 'ℹ'),
    };
    this.persist = options.persist ?? false;
    this.shouldHideCursor = options.hideCursor ?? true;
    this.progressBar = options.progressBar ?? false;
    this.progressBarWidth = options.progressBarWidth ?? 20;
    if (!Number.isInteger(this.progressBarWidth) || this.progressBarWidth < 1) {
      throw new Error('Spinner: `progressBarWidth` must be a positive integer');
    }
    this.truncate = options.truncate ?? false;
    this.currentFrame = 0;
    this._isSpinning = false;
    this.timer = null;
    this.startTime = null;
    this.progressValue = null;
    this.progressTotal = null;
  }

  /**
   * Whether the spinner is currently running.
   * @returns `true` if the spinner is animating, `false` otherwise.
   */
  get isSpinning(): boolean {
    return this._isSpinning;
  }

  private _colorize(text: string, color?: Color): string {
    if (!color || this.ciMode) return text;
    return `${colors[color]}${text}${RESET}`;
  }

  private _formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    // Round to whole seconds first, then split, so we never render "1m 60s".
    const totalSeconds = Math.round(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  private _getElapsedText(): string {
    if (!this.showTime || !this.startTime) return '';
    const elapsed = Date.now() - this.startTime;
    return ` ${this._colorize(`(${this._formatTime(elapsed)})`, 'gray')}`;
  }

  private _getProgressText(): string {
    if (this.progressValue === null || this.progressTotal === null) return '';
    // Clamp the ratio to [0, 1] so out-of-range or zero totals can never produce
    // NaN/Infinity/negative counts and crash repeat() inside the render loop.
    const ratio = this.progressTotal > 0 ? this.progressValue / this.progressTotal : 0;
    const clamped = Math.min(1, Math.max(0, ratio));
    const percent = Math.round(clamped * 100);

    if (this.progressBar) {
      const filled = Math.min(
        this.progressBarWidth,
        Math.max(0, Math.round(clamped * this.progressBarWidth))
      );
      const empty = this.progressBarWidth - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);
      return ` ${this._colorize(`[${bar}]`, 'cyan')} ${percent}%`;
    }

    return ` ${this._colorize(`${percent}%`, 'cyan')}`;
  }

  private _getTerminalWidth(): number {
    return this.stream.columns ?? 80;
  }

  /**
   * Counts display width in code points rather than UTF-16 code units, so
   * astral characters (e.g. emoji) count as one and are never split mid-pair.
   * Note: this does not yet account for full-width (CJK/emoji) cells occupying
   * two columns — that refinement is tracked as a follow-up.
   */
  private _displayWidth(text: string): number {
    let width = 0;
    for (const _ of text) width++;
    return width;
  }

  private _truncateText(text: string, maxLength: number): string {
    const chars = [...text];
    if (!this.truncate || chars.length <= maxLength) return text;
    if (maxLength <= 3) return '...'.slice(0, maxLength);
    return chars.slice(0, maxLength - 3).join('') + '...';
  }

  private _render(): void {
    const frame = this._colorize(this.frames[this.currentFrame], this.color);
    const progressText = this._getProgressText();
    const timeText = this._getElapsedText();
    const suffixText = this.suffix ? ` ${this.suffix}` : '';
    const coloredText = this.text ? this._colorize(this.text, this.textColor) : '';

    let output = coloredText
      ? `${this.prefix}${frame} ${coloredText}${suffixText}${progressText}${timeText}`
      : `${this.prefix}${frame}`;

    if (this.truncate) {
      // Calculate visible length (without ANSI codes), measured in code points
      // so multi-byte characters are counted and split correctly.
      const visibleLength = this._displayWidth(output.replace(/\x1B\[[0-9;]*m/g, ''));
      const maxWidth = this._getTerminalWidth() - 1;
      if (visibleLength > maxWidth) {
        // Truncate the text part only
        const overhead = visibleLength - this._displayWidth(this.text ?? '');
        const maxTextLength = Math.max(0, maxWidth - overhead);
        const truncatedText = this._truncateText(this.text, maxTextLength);
        const coloredTruncated = truncatedText ? this._colorize(truncatedText, this.textColor) : '';
        output = coloredTruncated
          ? `${this.prefix}${frame} ${coloredTruncated}${suffixText}${progressText}${timeText}`
          : `${this.prefix}${frame}`;
      }
    }

    this.stream.write(CLEAR_LINE + output);
    this.currentFrame = (this.currentFrame + 1) % this.frames.length;
  }

  /**
   * Cleanup invoked by the shared process `SIGINT`/`exit` handler. Clears the
   * animation timer and restores the cursor. Idempotent.
   * @internal
   */
  _onProcessExit(): void {
    if (this._isSpinning) {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      if (!this.ciMode && this.shouldHideCursor) {
        this.stream.write(SHOW_CURSOR);
      }
      this._isSpinning = false;
    }
  }

  /**
   * Starts the spinner animation.
   * @param text - Optional text to display. Overrides the text set in constructor.
   * @returns The spinner instance for chaining.
   * @example
   * spinner.start('Loading...');
   */
  start(text?: string): this {
    if (this._isSpinning) return this;

    if (text) this.text = stripControl(text);
    this._isSpinning = true;
    this.currentFrame = 0;
    this.startTime = Date.now();

    if (this.ciMode) {
      // In CI mode, just print the text once (no animation)
      const output = this.text ? `${this.prefix}- ${this.text}` : `${this.prefix}-`;
      this.stream.write(output + '\n');
      return this;
    }

    // Hide cursor and join the shared cleanup registry
    if (this.shouldHideCursor) {
      this.stream.write(HIDE_CURSOR);
    }
    registerAnimation(this);

    // Start animation loop. unref() so a forgotten spinner never keeps the
    // event loop alive and blocks process exit.
    this._render();
    this.timer = setInterval(() => this._render(), this.interval);
    this.timer.unref?.();

    return this;
  }

  /**
   * Stops the spinner animation.
   * @param finalText - Optional text to display after stopping.
   * @returns The spinner instance for chaining.
   * @example
   * spinner.stop('Completed');
   */
  stop(finalText?: string): this {
    return this._finalize(finalText === undefined ? undefined : stripControl(finalText));
  }

  /**
   * Internal stop that writes `finalText` verbatim. Callers must pass a string
   * that is already safe — either sanitized user input or text composed by the
   * library itself (which contains the library's own ANSI color codes and must
   * NOT be re-stripped).
   */
  private _finalize(finalText?: string): this {
    if (!this._isSpinning) return this;

    const timeText = this._getElapsedText();

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this._isSpinning = false;
    this.startTime = null;
    this.progressValue = null;
    this.progressTotal = null;

    if (this.ciMode) {
      // In CI mode, just print final text
      if (finalText) {
        this.stream.write(`${this.prefix}${finalText}${timeText}\n`);
      }
      return this;
    }

    // Leave the shared cleanup registry
    unregisterAnimation(this);

    // Clear line (unless persist mode) and show final text if provided
    if (!this.persist) {
      this.stream.write(CLEAR_LINE);
    }
    if (finalText) {
      this.stream.write(`${this.prefix}${finalText}${timeText}\n`);
    }

    // Restore cursor
    if (this.shouldHideCursor) {
      this.stream.write(SHOW_CURSOR);
    }

    return this;
  }

  /**
   * Stops the spinner and clears the line without any output.
   * Useful when you want to silently cancel the spinner.
   * @returns The spinner instance for chaining.
   * @example
   * spinner.start('Working...');
   * if (canceled) {
   *   spinner.clear();
   * }
   */
  clear(): this {
    if (!this._isSpinning) return this;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this._isSpinning = false;
    this.startTime = null;
    this.progressValue = null;
    this.progressTotal = null;

    if (!this.ciMode) {
      unregisterAnimation(this);
      this.stream.write(CLEAR_LINE);
      if (this.shouldHideCursor) {
        this.stream.write(SHOW_CURSOR);
      }
    }

    return this;
  }

  /**
   * Updates the spinner text while running.
   * @param text - New text to display.
   * @returns The spinner instance for chaining.
   * @example
   * spinner.update('Still loading...');
   */
  update(text: string): this {
    this.text = stripControl(text);
    return this;
  }

  /**
   * Sets the progress value to display.
   * Shows as percentage or progress bar depending on options.
   * @param value - Current progress value.
   * @param total - Total value (100% when value equals total).
   * @returns The spinner instance for chaining.
   * @example
   * spinner.progress(50, 100); // Shows 50%
   */
  progress(value: number, total: number): this {
    this.progressValue = value;
    this.progressTotal = total;
    return this;
  }

  /**
   * Prints a log message while the spinner is running.
   * The message appears above the spinner line.
   *
   * The message is sanitized with {@link stripControl}: all control characters
   * (including `\n` and `\t`) are removed, so a multi-line message is collapsed
   * to a single line. This prevents untrusted input from injecting terminal
   * escape sequences.
   * @param message - Message to print.
   * @returns The spinner instance for chaining.
   * @example
   * spinner.log('Processing file 1 of 10');
   */
  log(message: string): this {
    const safe = stripControl(message);
    if (this.ciMode) {
      this.stream.write(safe + '\n');
      return this;
    }

    if (this._isSpinning) {
      // Clear spinner line, print message, re-render spinner
      this.stream.write(CLEAR_LINE + safe + '\n');
      this._render();
    } else {
      this.stream.write(safe + '\n');
    }
    return this;
  }

  /**
   * Stops the spinner with a success indicator (green checkmark).
   * @param text - Optional success message. Defaults to spinner text or 'Done'.
   * @returns The spinner instance for chaining.
   * @example
   * spinner.succeed('Files uploaded successfully!');
   */
  succeed(text?: string): this {
    const symbol = this._colorize(this.symbols.succeed, 'green');
    return this._finalize(`${symbol} ${stripControl(text ?? (this.text || 'Done'))}`);
  }

  /**
   * Stops the spinner with a failure indicator (red X).
   * @param text - Optional failure message. Defaults to spinner text or 'Failed'.
   * @returns The spinner instance for chaining.
   * @example
   * spinner.fail('Upload failed: network error');
   */
  fail(text?: string): this {
    const symbol = this._colorize(this.symbols.fail, 'red');
    return this._finalize(`${symbol} ${stripControl(text ?? (this.text || 'Failed'))}`);
  }

  /**
   * Stops the spinner with a warning indicator (yellow warning sign).
   * @param text - Optional warning message. Defaults to spinner text or 'Warning'.
   * @returns The spinner instance for chaining.
   * @example
   * spinner.warn('Completed with warnings');
   */
  warn(text?: string): this {
    const symbol = this._colorize(this.symbols.warn, 'yellow');
    return this._finalize(`${symbol} ${stripControl(text ?? (this.text || 'Warning'))}`);
  }

  /**
   * Stops the spinner with an info indicator (blue info symbol).
   * @param text - Optional info message. Defaults to spinner text or 'Info'.
   * @returns The spinner instance for chaining.
   * @example
   * spinner.info('3 files were skipped');
   */
  info(text?: string): this {
    const symbol = this._colorize(this.symbols.info, 'blue');
    return this._finalize(`${symbol} ${stripControl(text ?? (this.text || 'Info'))}`);
  }

  /**
   * Wraps a promise with spinner start/succeed/fail behavior.
   * Starts the spinner, waits for the promise, then shows success or failure.
   * @template T - The type of the resolved promise value.
   * @param action - A promise or function returning a promise.
   * @param options - Display text options, or a string for the loading text.
   * @returns The resolved promise value.
   * @throws Re-throws any error from the promise after showing failure.
   * @example
   * // With options object
   * const data = await spinner.promise(fetchData(), {
   *   text: 'Loading...',
   *   successText: 'Loaded!',
   *   failText: 'Failed to load'
   * });
   *
   * @example
   * // With string shorthand
   * const data = await spinner.promise(fetchData(), 'Loading...');
   */
  async promise<T>(
    action: Promise<T> | (() => Promise<T>),
    options?: string | PromiseOptions
  ): Promise<T> {
    const opts: PromiseOptions =
      typeof options === 'string' ? { text: options } : options ?? {};

    this.start(opts.text);

    try {
      const result = await (typeof action === 'function' ? action() : action);
      this.succeed(opts.successText);
      return result;
    } catch (error) {
      this.fail(opts.failText);
      throw error;
    }
  }
}

export default Spinner;

// ANSI codes for cursor movement
const MOVE_UP = (n: number) => `\x1B[${n}A`;
const MOVE_DOWN = (n: number) => `\x1B[${n}B`;

/**
 * Internal state for a spinner within a SpinnerGroup.
 * @internal
 */
interface GroupSpinnerState {
  text: string;
  status: 'spinning' | 'succeeded' | 'failed' | 'warned' | 'info' | 'stopped';
  finalText?: string;
}

/**
 * Configuration options for the SpinnerGroup class.
 * @example
 * const group = new SpinnerGroup({
 *   symbols: { succeed: '✓', fail: '✗' }
 * });
 */
export interface SpinnerGroupOptions {
  /** Disable colors and animations. Auto-detected from CI env vars and TTY if not set. */
  ci?: boolean;
  /** Output stream. Default: process.stderr */
  stream?: NodeJS.WriteStream;
  /** Custom symbols for status methods. */
  symbols?: SpinnerSymbols;
  /** Hide/show cursor during spinning. Set to false for problematic terminals. Default: true */
  hideCursor?: boolean;
}

/**
 * Manages multiple concurrent spinners displayed together.
 * Each spinner is identified by a unique key and can be updated independently.
 *
 * @example
 * const group = new SpinnerGroup();
 *
 * group.add('download', 'Downloading files');
 * group.add('process', 'Processing data');
 *
 * // Update individual spinners
 * group.succeed('download', 'Downloaded 10 files');
 * group.fail('process', 'Processing failed');
 *
 * @example
 * // With promise wrapper
 * await Promise.all([
 *   group.promise('task1', fetchData(), 'Fetching data'),
 *   group.promise('task2', processData(), 'Processing')
 * ]);
 */
export class SpinnerGroup implements Cleanable {
  private spinners: Map<string, GroupSpinnerState> = new Map();
  private order: string[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private stream: NodeJS.WriteStream;
  private ciMode: boolean;
  private frames: readonly string[] = BRAILLE_FRAMES;
  private currentFrame: number = 0;
  private interval: number = 80;
  private symbols: Required<SpinnerSymbols>;
  private shouldHideCursor: boolean;
  private cursorHidden: boolean = false;

  /**
   * Creates a new SpinnerGroup instance.
   * @param options - Configuration options for the group.
   */
  constructor(options: SpinnerGroupOptions = {}) {
    this.stream = options.stream ?? process.stderr;
    this.ciMode = options.ci ?? (isCI() || !isTTY(this.stream));
    this.symbols = {
      succeed: stripControl(options.symbols?.succeed ?? '✔'),
      fail: stripControl(options.symbols?.fail ?? '✖'),
      warn: stripControl(options.symbols?.warn ?? '⚠'),
      info: stripControl(options.symbols?.info ?? 'ℹ'),
    };
    this.shouldHideCursor = options.hideCursor ?? true;
  }

  private _colorize(text: string, color?: Color): string {
    if (!color || this.ciMode) return text;
    return `${colors[color]}${text}${RESET}`;
  }

  private _renderAll(): void {
    // Move cursor up to first spinner line
    if (this.order.length > 1) {
      this.stream.write(MOVE_UP(this.order.length - 1));
    }

    for (const key of this.order) {
      const state = this.spinners.get(key)!;
      this.stream.write(CLEAR_LINE);

      if (state.status === 'spinning') {
        const frame = this._colorize(this.frames[this.currentFrame], 'cyan');
        this.stream.write(`${frame} ${state.text}\n`);
      } else {
        this.stream.write(`${state.finalText}\n`);
      }
    }

    this.currentFrame = (this.currentFrame + 1) % this.frames.length;
  }

  private _startTimer(): void {
    if (this.timer || this.ciMode) return;

    if (this.shouldHideCursor) {
      this.stream.write(HIDE_CURSOR);
      this.cursorHidden = true;
    }
    registerAnimation(this);
    this.timer = setInterval(() => this._renderAll(), this.interval);
    // unref() so an unfinished group never keeps the event loop alive.
    this.timer.unref?.();
  }

  /** Restore the cursor exactly once if we hid it. */
  private _restoreCursor(): void {
    if (this.cursorHidden) {
      this.stream.write(SHOW_CURSOR);
      this.cursorHidden = false;
    }
  }

  private _stopTimerIfDone(): void {
    const allDone = [...this.spinners.values()].every(s => s.status !== 'spinning');
    if (allDone && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      unregisterAnimation(this);
      this._restoreCursor();
    }
  }

  /**
   * Cleanup invoked by the shared process `SIGINT`/`exit` handler. Clears the
   * render timer and restores the cursor. Idempotent.
   * @internal
   */
  _onProcessExit(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this._restoreCursor();
  }

  /**
   * Adds a new spinner to the group.
   * @param key - Unique identifier for the spinner.
   * @param text - Text to display next to the spinner.
   * @returns The group instance for chaining.
   * @example
   * group.add('download', 'Downloading files');
   */
  add(key: string, text: string): this {
    if (this.spinners.has(key)) return this;

    text = stripControl(text);
    this.spinners.set(key, { text, status: 'spinning' });
    this.order.push(key);

    if (this.ciMode) {
      this.stream.write(`- ${text}\n`);
    } else {
      // Write initial line
      const frame = this._colorize(this.frames[this.currentFrame], 'cyan');
      this.stream.write(`${frame} ${text}\n`);
      this._startTimer();
    }

    return this;
  }

  /**
   * Updates the text of a running spinner.
   * @param key - Key of the spinner to update.
   * @param text - New text to display.
   * @returns The group instance for chaining.
   * @example
   * group.update('download', 'Downloading file 5 of 10');
   */
  update(key: string, text: string): this {
    const state = this.spinners.get(key);
    if (state && state.status === 'spinning') {
      state.text = stripControl(text);
    }
    return this;
  }

  /**
   * Prints a log message above the spinner group.
   *
   * The message is sanitized with {@link stripControl} (control characters,
   * including `\n` and `\t`, are removed), so a multi-line message collapses to
   * a single line.
   * @param message - Message to print.
   * @returns The group instance for chaining.
   * @example
   * group.log('Starting batch process');
   */
  log(message: string): this {
    const safe = stripControl(message);
    if (this.ciMode) {
      this.stream.write(safe + '\n');
      return this;
    }

    const spinning = [...this.spinners.values()].some(s => s.status === 'spinning');
    if (spinning && this.order.length > 0) {
      // Move up to first line, insert message, move back down
      this.stream.write(MOVE_UP(this.order.length));
      this.stream.write(CLEAR_LINE + safe + '\n');
      // Re-render all spinners below
      this._renderAll();
    } else {
      this.stream.write(safe + '\n');
    }
    return this;
  }

  /**
   * Marks a spinner as succeeded with a green checkmark.
   * @param key - Key of the spinner to mark as succeeded.
   * @param text - Optional success message. Defaults to spinner text.
   * @returns The group instance for chaining.
   * @example
   * group.succeed('download', 'Downloaded 10 files');
   */
  succeed(key: string, text?: string): this {
    return this._finish(key, 'succeeded', text, this.symbols.succeed, 'green');
  }

  /**
   * Marks a spinner as failed with a red X.
   * @param key - Key of the spinner to mark as failed.
   * @param text - Optional failure message. Defaults to spinner text.
   * @returns The group instance for chaining.
   * @example
   * group.fail('upload', 'Upload failed: timeout');
   */
  fail(key: string, text?: string): this {
    return this._finish(key, 'failed', text, this.symbols.fail, 'red');
  }

  /**
   * Marks a spinner with a warning indicator.
   * @param key - Key of the spinner to mark with warning.
   * @param text - Optional warning message. Defaults to spinner text.
   * @returns The group instance for chaining.
   * @example
   * group.warn('process', 'Completed with 3 warnings');
   */
  warn(key: string, text?: string): this {
    return this._finish(key, 'warned', text, this.symbols.warn, 'yellow');
  }

  /**
   * Marks a spinner with an info indicator.
   * @param key - Key of the spinner to mark with info.
   * @param text - Optional info message. Defaults to spinner text.
   * @returns The group instance for chaining.
   * @example
   * group.info('scan', 'Scanned 100 files');
   */
  info(key: string, text?: string): this {
    return this._finish(key, 'info', text, this.symbols.info, 'blue');
  }

  /**
   * Stops a spinner without any status symbol.
   * @param key - Key of the spinner to stop.
   * @param text - Optional final message. Defaults to spinner text.
   * @returns The group instance for chaining.
   * @example
   * group.stop('task', 'Task completed');
   */
  stop(key: string, text?: string): this {
    return this._finish(key, 'stopped', text);
  }

  private _finish(
    key: string,
    status: GroupSpinnerState['status'],
    text?: string,
    symbol?: string,
    color?: Color
  ): this {
    const state = this.spinners.get(key);
    if (!state || state.status !== 'spinning') return this;

    state.status = status;
    // `text` is caller-supplied; `state.text` was sanitized on add/update.
    const displayText = text !== undefined ? stripControl(text) : state.text;
    if (symbol) {
      const coloredSymbol = this._colorize(symbol, color);
      state.finalText = `${coloredSymbol} ${displayText}`;
    } else {
      state.finalText = displayText;
    }

    if (this.ciMode) {
      this.stream.write(`${state.finalText}\n`);
    }

    this._stopTimerIfDone();
    return this;
  }

  /**
   * Wraps a promise with spinner behavior for a specific key.
   * Adds the spinner, waits for the promise, then shows success or failure.
   * @template T - The type of the resolved promise value.
   * @param key - Unique key for this spinner.
   * @param action - A promise or function returning a promise.
   * @param options - Display text options, or a string for the loading text.
   * @returns The resolved promise value.
   * @throws Re-throws any error from the promise after showing failure.
   * @example
   * const data = await group.promise('fetch', fetchData(), {
   *   text: 'Fetching...',
   *   successText: 'Fetched!',
   *   failText: 'Failed to fetch'
   * });
   */
  async promise<T>(
    key: string,
    action: Promise<T> | (() => Promise<T>),
    options?: string | PromiseOptions
  ): Promise<T> {
    const opts: PromiseOptions =
      typeof options === 'string' ? { text: options } : options ?? {};

    this.add(key, opts.text ?? key);

    try {
      const result = await (typeof action === 'function' ? action() : action);
      this.succeed(key, opts.successText);
      return result;
    } catch (error) {
      this.fail(key, opts.failText);
      throw error;
    }
  }
}

/**
 * Factory function to create and start a spinner in one call.
 * @example
 * const spinner = spin('Loading...');
 * spinner.succeed('Done');
 *
 * // With options
 * const spinner = spin('Loading...', { color: 'cyan' });
 */
export function spin(text: string, options?: SpinnerOptions): Spinner {
  const spinner = new Spinner({ ...options, text });
  return spinner.start();
}
