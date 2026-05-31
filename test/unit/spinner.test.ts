import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Spinner, ASCII_FRAMES, BRAILLE_FRAMES, stripControl } from '../../src/spinner.js';
import { createMockStream, ANSI, stripAnsi } from '../helpers/mock-stream.js';

describe('Spinner', () => {
  describe('constructor defaults', () => {
    it('uses BRAILLE_FRAMES by default', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start();

      // First frame should be the first braille character
      expect(stream.output).toContain(BRAILLE_FRAMES[0]);

      spinner.stop();
    });

    it('uses 80ms interval by default', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start();
      stream.clear();

      vi.advanceTimersByTime(80);
      expect(stream.output.length).toBeGreaterThan(0);

      spinner.stop();
      vi.useRealTimers();
    });

    it('uses stderr by default', () => {
      const spinner = new Spinner({ ci: true });
      // Can't easily test stderr, but ensure no error
      expect(spinner).toBeInstanceOf(Spinner);
    });

    it('has empty text by default', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();

      // Should only have the prefix and dash in CI mode
      expect(stripAnsi(stream.output).trim()).toBe('-');

      spinner.stop();
    });
  });

  describe('start()', () => {
    it('sets isSpinning to true', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });

      expect(spinner.isSpinning).toBe(false);
      spinner.start();
      expect(spinner.isSpinning).toBe(true);

      spinner.stop();
    });

    it('writes to stream', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, text: 'Loading', ci: false });
      spinner.start();

      expect(stream.output).toContain('Loading');

      spinner.stop();
    });

    it('hides cursor when hideCursor=true (default)', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start();

      expect(stream.output).toContain(ANSI.HIDE_CURSOR);

      spinner.stop();
    });

    it('does not hide cursor when hideCursor=false', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false, hideCursor: false });
      spinner.start();

      expect(stream.output).not.toContain(ANSI.HIDE_CURSOR);

      spinner.stop();
    });

    it('accepts text parameter', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start('Starting...');

      expect(stream.output).toContain('Starting...');

      spinner.stop();
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      const result = spinner.start();

      expect(result).toBe(spinner);

      spinner.stop();
    });

    it('does nothing if already spinning', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start('First');
      stream.clear();
      spinner.start('Second');

      expect(stream.output).toBe('');

      spinner.stop();
    });
  });

  describe('stop()', () => {
    it('sets isSpinning to false', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();

      expect(spinner.isSpinning).toBe(true);
      spinner.stop();
      expect(spinner.isSpinning).toBe(false);
    });

    it('shows cursor after stop', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start();
      spinner.stop();

      expect(stream.output).toContain(ANSI.SHOW_CURSOR);
    });

    it('writes final text if provided', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start('Loading');
      spinner.stop('Complete!');

      expect(stream.output).toContain('Complete!');
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();
      const result = spinner.stop();

      expect(result).toBe(spinner);
    });

    it('does nothing if not spinning', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      const result = spinner.stop();

      expect(result).toBe(spinner);
    });
  });

  describe('update()', () => {
    it('changes the text', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Initial');
      stream.clear();

      spinner.update('Updated');
      vi.advanceTimersByTime(80);

      expect(stream.output).toContain('Updated');

      spinner.stop();
      vi.useRealTimers();
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      const result = spinner.update('Text');

      expect(result).toBe(spinner);
    });
  });

  describe('succeed()', () => {
    it('shows green checkmark', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Loading');
      spinner.succeed();

      expect(stream.output).toContain(ANSI.GREEN);
      expect(stream.output).toContain('✔');
    });

    it('uses provided text', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();
      spinner.succeed('Success!');

      expect(stream.output).toContain('Success!');
    });

    it('uses spinner text if no text provided', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start('Loading');
      spinner.succeed();

      expect(stream.output).toContain('Loading');
    });

    it('stops the spinner', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();
      spinner.succeed();

      expect(spinner.isSpinning).toBe(false);
    });
  });

  describe('fail()', () => {
    it('shows red X', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Loading');
      spinner.fail();

      expect(stream.output).toContain(ANSI.RED);
      expect(stream.output).toContain('✖');
    });

    it('uses provided text', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();
      spinner.fail('Error occurred');

      expect(stream.output).toContain('Error occurred');
    });

    it('stops the spinner', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();
      spinner.fail();

      expect(spinner.isSpinning).toBe(false);
    });
  });

  describe('warn()', () => {
    it('shows yellow warning symbol', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Checking');
      spinner.warn();

      expect(stream.output).toContain(ANSI.YELLOW);
      expect(stream.output).toContain('⚠');
    });

    it('uses provided text', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();
      spinner.warn('Caution');

      expect(stream.output).toContain('Caution');
    });
  });

  describe('info()', () => {
    it('shows blue info symbol', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Processing');
      spinner.info();

      expect(stream.output).toContain(ANSI.BLUE);
      expect(stream.output).toContain('ℹ');
    });

    it('uses provided text', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();
      spinner.info('Note');

      expect(stream.output).toContain('Note');
    });
  });

  describe('clear()', () => {
    it('stops without output', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Loading');
      const outputBeforeClear = stream.chunks.length;
      spinner.clear();

      expect(spinner.isSpinning).toBe(false);
      // Should have CLEAR_LINE and SHOW_CURSOR but no text
      const clearOutput = stream.chunks.slice(outputBeforeClear).join('');
      expect(stripAnsi(clearOutput)).toBe('');
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start();
      const result = spinner.clear();

      expect(result).toBe(spinner);
    });
  });

  describe('progress()', () => {
    it('shows percentage', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Downloading');
      spinner.progress(50, 100);
      vi.advanceTimersByTime(80);

      expect(stream.output).toContain('50%');

      spinner.stop();
      vi.useRealTimers();
    });

    it('shows progress bar when progressBar=true', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false, progressBar: true });
      spinner.start('Downloading');
      spinner.progress(50, 100);
      vi.advanceTimersByTime(80);

      expect(stream.output).toContain('█');
      expect(stream.output).toContain('░');

      spinner.stop();
      vi.useRealTimers();
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      const result = spinner.progress(25, 100);

      expect(result).toBe(spinner);
    });

    it('does not throw and clamps when total is 0', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false, progressBar: true });
      spinner.start('Downloading');
      stream.clear();

      spinner.progress(5, 0);
      expect(() => vi.advanceTimersByTime(80)).not.toThrow();
      // 0 total clamps to 0% with an empty bar
      expect(stream.output).toContain('0%');
      expect(stream.output).toContain('░');

      spinner.stop();
      vi.useRealTimers();
    });

    it('does not throw and clamps when value exceeds total', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false, progressBar: true });
      spinner.start('Downloading');
      stream.clear();

      spinner.progress(150, 100);
      expect(() => vi.advanceTimersByTime(80)).not.toThrow();
      // Overshoot clamps to 100% with a full bar
      expect(stream.output).toContain('100%');
      expect(stream.output).toContain('█');

      spinner.stop();
      vi.useRealTimers();
    });

    it('does not throw and clamps negative values', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false, progressBar: true });
      spinner.start('Downloading');
      stream.clear();

      spinner.progress(-5, 100);
      expect(() => vi.advanceTimersByTime(80)).not.toThrow();
      expect(stream.output).toContain('0%');

      spinner.stop();
      vi.useRealTimers();
    });

    it('does not throw for 0/0 progress', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false, progressBar: true });
      spinner.start('Downloading');
      stream.clear();

      spinner.progress(0, 0);
      expect(() => vi.advanceTimersByTime(80)).not.toThrow();
      expect(stream.output).toContain('0%');
      expect(stream.output).not.toContain('NaN');

      spinner.stop();
      vi.useRealTimers();
    });
  });

  describe('log()', () => {
    it('prints message during spin', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Working');
      spinner.log('Info message');

      expect(stream.output).toContain('Info message');

      spinner.stop();
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      const result = spinner.log('Message');

      expect(result).toBe(spinner);
    });
  });

  describe('custom symbols', () => {
    it('uses custom succeed symbol', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        symbols: { succeed: '👍' },
      });
      spinner.start();
      spinner.succeed();

      expect(stream.output).toContain('👍');
    });

    it('uses custom fail symbol', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        symbols: { fail: '💥' },
      });
      spinner.start();
      spinner.fail();

      expect(stream.output).toContain('💥');
    });

    it('uses custom warn symbol', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        symbols: { warn: '⚡' },
      });
      spinner.start();
      spinner.warn();

      expect(stream.output).toContain('⚡');
    });

    it('uses custom info symbol', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        symbols: { info: '📢' },
      });
      spinner.start();
      spinner.info();

      expect(stream.output).toContain('📢');
    });
  });

  describe('custom frames', () => {
    it('uses custom frames', () => {
      const stream = createMockStream();
      const customFrames = ['A', 'B', 'C'];
      const spinner = new Spinner({
        stream,
        ci: false,
        frames: customFrames,
      });
      spinner.start();

      expect(stream.output).toContain('A');

      spinner.stop();
    });

    it('cycles through custom frames', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const customFrames = ['X', 'Y'];
      const spinner = new Spinner({
        stream,
        ci: false,
        frames: customFrames,
        interval: 100,
      });
      spinner.start();
      stream.clear();

      vi.advanceTimersByTime(100);
      expect(stream.output).toContain('Y');

      spinner.stop();
      vi.useRealTimers();
    });
  });

  describe('prefix option', () => {
    it('prepends prefix to output', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: false,
        prefix: '[1/3] ',
        text: 'Task',
      });
      spinner.start();

      expect(stream.output).toContain('[1/3]');

      spinner.stop();
    });
  });

  describe('suffix option', () => {
    it('appends suffix to output', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: false,
        suffix: '(please wait)',
        text: 'Loading',
      });
      spinner.start();

      expect(stream.output).toContain('(please wait)');

      spinner.stop();
      vi.useRealTimers();
    });
  });

  describe('textColor option', () => {
    it('applies color to text', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: false,
        textColor: 'cyan',
        text: 'Colored',
      });
      spinner.start();

      expect(stream.output).toContain(ANSI.CYAN);

      spinner.stop();
    });
  });

  describe('truncate option', () => {
    it('truncates long text to fit terminal width', () => {
      vi.useFakeTimers();
      const stream = createMockStream({ columns: 30 });
      const longText = 'This is a very long text that should be truncated';
      const spinner = new Spinner({
        stream,
        ci: false,
        truncate: true,
        text: longText,
      });
      spinner.start();

      // After first render
      const visibleOutput = stripAnsi(stream.output);
      expect(visibleOutput.length).toBeLessThanOrEqual(30);
      expect(visibleOutput).toContain('...');

      spinner.stop();
      vi.useRealTimers();
    });

    it('does not truncate short text', () => {
      const stream = createMockStream({ columns: 80 });
      const spinner = new Spinner({
        stream,
        ci: false,
        truncate: true,
        text: 'Short',
      });
      spinner.start();

      expect(stream.output).toContain('Short');
      expect(stream.output).not.toContain('...');

      spinner.stop();
    });
  });

  describe('CI mode behavior', () => {
    it('disables colors', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        color: 'cyan',
        text: 'Test',
      });
      spinner.start();

      expect(stream.output).not.toContain(ANSI.CYAN);

      spinner.stop();
    });

    it('disables animation', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        text: 'Test',
      });
      spinner.start();
      const initialOutput = stream.output;
      stream.clear();

      vi.advanceTimersByTime(1000);

      // In CI mode, no additional output after initial print
      expect(stream.output).toBe('');

      spinner.stop();
      vi.useRealTimers();
    });

    it('prints static text with newline', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        text: 'Building',
      });
      spinner.start();

      expect(stream.output).toContain('- Building\n');

      spinner.stop();
    });
  });

  describe('showTime option', () => {
    it('shows elapsed time', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: false,
        showTime: true,
        text: 'Working',
      });
      spinner.start();
      stream.clear();

      vi.advanceTimersByTime(1500);

      expect(stream.output).toMatch(/\(.*s\)/);

      spinner.stop();
      vi.useRealTimers();
    });

    it('never renders "60s" at the minute boundary', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: false,
        showTime: true,
        text: 'Working',
      });
      spinner.start();
      stream.clear();

      // 119.52s (a multiple of the 80ms tick) previously rendered "1m 60s" on
      // the final tick; it should now render "2m 0s".
      vi.advanceTimersByTime(119520);

      expect(stream.output).not.toMatch(/60s/);
      expect(stream.output).toMatch(/2m 0s/);

      spinner.stop();
      vi.useRealTimers();
    });
  });

  describe('frames validation', () => {
    it('throws when frames is empty', () => {
      const stream = createMockStream();
      expect(() => new Spinner({ stream, frames: [] })).toThrow();
    });
  });

  describe('truncate with multi-byte text', () => {
    it('does not split surrogate pairs and ends with ellipsis', () => {
      vi.useFakeTimers();
      // columns:11 forces an ODD UTF-16 cut point (5), which a code-unit slice
      // would split mid-pair into a lone surrogate; code-point slicing must not.
      const stream = createMockStream({ columns: 11 });
      const spinner = new Spinner({
        stream,
        ci: false,
        truncate: true,
        text: '🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀🚀',
      });
      spinner.start();

      const visible = stripAnsi(stream.output);
      // A UTF-16 slice would leave a LONE surrogate at the cut point. Spreading
      // into code points makes a lone surrogate its own 1-unit element, while a
      // valid pair (🚀) is a single 2-unit element — so any 1-unit char in the
      // surrogate range D800–DFFF means a pair was split.
      const hasLoneSurrogate = [...visible].some(
        ch => ch.length === 1 && ch.charCodeAt(0) >= 0xd800 && ch.charCodeAt(0) <= 0xdfff
      );
      expect(hasLoneSurrogate).toBe(false);
      expect(visible).toContain('...');
      // Some rockets survive, and each is intact.
      const rockets = [...visible].filter(ch => ch === '🚀');
      expect(rockets.length).toBeGreaterThan(0);

      spinner.stop();
      vi.useRealTimers();
    });

    it('clips the ellipsis itself when room is tiny (maxLength <= 3)', () => {
      vi.useFakeTimers();
      // columns:5 → maxWidth 4, overhead 2 (frame+space) → maxTextLength 2.
      const stream = createMockStream({ columns: 5 });
      const spinner = new Spinner({
        stream,
        ci: false,
        truncate: true,
        text: 'abcdefghij',
      });
      spinner.start();

      const visible = stripAnsi(stream.output);
      expect(visible.length).toBeLessThanOrEqual(5);
      // Only a clipped ellipsis fits, never any of the original text.
      expect(visible).not.toMatch(/[a-j]/);

      spinner.stop();
      vi.useRealTimers();
    });

    it('renders frame only when no room for any text', () => {
      vi.useFakeTimers();
      // columns:3 → maxTextLength 0 → truncated text is empty → frame only.
      const stream = createMockStream({ columns: 3 });
      const spinner = new Spinner({
        stream,
        ci: false,
        truncate: true,
        text: 'abcdefghij',
      });
      spinner.start();

      const visible = stripAnsi(stream.output);
      expect(visible).not.toMatch(/[a-j]/);
      expect(visible).not.toContain('...');

      spinner.stop();
      vi.useRealTimers();
    });
  });
});

describe('stripControl()', () => {
  it('removes ESC, BEL, CR, and other C0 controls but keeps printable text', () => {
    expect(stripControl('done\x1B[2J\x1B]0;evil\x07')).toBe('done[2J]0;evil');
    expect(stripControl('a\rFAKE')).toBe('aFAKE');
    expect(stripControl('tab\there\nnewline')).toBe('tabherenewline');
    expect(stripControl('\x9Bcsi')).toBe('csi');
  });

  it('leaves emoji and CJK intact', () => {
    expect(stripControl('🚀 进度 done')).toBe('🚀 进度 done');
  });
});

describe('escape injection hardening (F1)', () => {
  // Includes a BEL (0x07) and an OSC introducer (ESC ]) — neither is ever
  // emitted by the library itself, so their absence proves sanitization ran
  // without colliding with the library's own SGR / cursor codes.
  const EVIL = '\x1B[2Jboom\x1B]0;pwned\x07\r\x1B[1A';

  function assertClean(output: string): void {
    expect(output).not.toContain('\x07'); // BEL — library never emits this
    expect(output).not.toContain('\x1B]'); // OSC — library never emits this
    expect(output).not.toContain('\x1B[2J'); // screen clear — never emitted
  }

  it('sanitizes constructor text/prefix/suffix', () => {
    const stream = createMockStream();
    const spinner = new Spinner({
      stream,
      ci: true,
      text: EVIL,
      prefix: '\x1B[31m',
      suffix: 'end\x07',
    });
    spinner.start();
    assertClean(stream.output);
    expect(stream.output).toContain('boom'); // printable remainder survives
    spinner.stop();
  });

  it('sanitizes start() and update() text', () => {
    vi.useFakeTimers();
    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: false });
    spinner.start(EVIL);
    spinner.update(EVIL);
    vi.advanceTimersByTime(80);
    assertClean(stream.output);
    spinner.stop();
    vi.useRealTimers();
  });

  it('sanitizes log() messages', () => {
    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: true });
    spinner.start();
    spinner.log(EVIL);
    assertClean(stream.output);
    expect(stream.output).toContain('boom');
    spinner.stop();
  });

  it('sanitizes stop() final text', () => {
    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: true });
    spinner.start();
    spinner.stop(EVIL);
    assertClean(stream.output);
  });

  it('sanitizes status method text (succeed/fail)', () => {
    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: true });
    spinner.start();
    spinner.succeed(EVIL);
    assertClean(stream.output);
    expect(stream.output).toContain('boom');
  });

  it('sanitizes custom symbols', () => {
    const stream = createMockStream();
    const spinner = new Spinner({
      stream,
      ci: true,
      symbols: { succeed: '\x1B[2J✓' },
    });
    spinner.start();
    spinner.succeed('ok');
    assertClean(stream.output);
  });

  it('does NOT strip the library\'s own colors (regression)', () => {
    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: false, color: 'cyan' });
    spinner.start('Loading');
    // succeed composes a green-colored symbol via the library itself
    spinner.succeed('Done');
    expect(stream.output).toContain(ANSI.GREEN);
    expect(stream.output).toContain('✔');
    expect(stream.output).toContain('Done');
  });
});

describe('isEnabled getter', () => {
  it('is true in TTY mode', () => {
    const stream = createMockStream({ isTTY: true });
    expect(new Spinner({ stream, ci: false }).isEnabled).toBe(true);
  });

  it('is false in CI mode', () => {
    const stream = createMockStream();
    expect(new Spinner({ stream, ci: true }).isEnabled).toBe(false);
  });
});

describe('numeric option validation (F3)', () => {
  it('throws for invalid progressBarWidth', () => {
    expect(() => new Spinner({ progressBarWidth: -5 })).toThrow();
    expect(() => new Spinner({ progressBarWidth: 0 })).toThrow();
    expect(() => new Spinner({ progressBarWidth: 1.5 })).toThrow();
    expect(() => new Spinner({ progressBarWidth: NaN })).toThrow();
  });

  it('throws for invalid interval', () => {
    expect(() => new Spinner({ interval: 0 })).toThrow();
    expect(() => new Spinner({ interval: -1 })).toThrow();
    expect(() => new Spinner({ interval: NaN })).toThrow();
  });

  it('accepts valid numeric options', () => {
    expect(() => new Spinner({ progressBarWidth: 20, interval: 80 })).not.toThrow();
    expect(() => new Spinner({ progressBarWidth: 1, interval: 1 })).not.toThrow();
  });
});
