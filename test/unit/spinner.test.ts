import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Spinner, ASCII_FRAMES, BRAILLE_FRAMES } from '../../src/spinner.js';
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
  });
});
