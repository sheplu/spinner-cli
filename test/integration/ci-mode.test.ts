import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Spinner, SpinnerGroup, isCI } from '../../src/spinner.js';
import { createMockStream, ANSI, stripAnsi } from '../helpers/mock-stream.js';

describe('CI Mode Behavior', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('auto-detection', () => {
    it('enables CI mode when CI env var is set', () => {
      process.env.CI = 'true';
      const stream = createMockStream();
      const spinner = new Spinner({ stream, text: 'Test' });
      spinner.start();

      // CI mode outputs static text with newline
      expect(stream.output).toContain('- Test\n');
      // No animation frames
      expect(stream.output).not.toContain('⠋');

      spinner.stop();
    });

    it('enables CI mode when stream is not TTY', () => {
      const stream = createMockStream({ isTTY: false });
      const spinner = new Spinner({ stream, text: 'Test' });
      spinner.start();

      // Should be in CI mode
      expect(stream.output).toContain('- Test\n');
      expect(stream.output).not.toContain(ANSI.HIDE_CURSOR);

      spinner.stop();
    });

    it('respects explicit ci option over auto-detection', () => {
      process.env.CI = 'true';
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false, text: 'Test' });
      spinner.start();

      // Explicit ci: false should enable TTY mode
      expect(stream.output).toContain(ANSI.HIDE_CURSOR);
      expect(stream.output).toContain('⠋');

      spinner.stop();
    });
  });

  describe('output contains no ANSI codes', () => {
    it('strips colors from spinner output', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        color: 'cyan',
        text: 'Colored text',
      });
      spinner.start();
      spinner.succeed('Done');

      // Check raw output has no color codes
      const rawOutput = stream.output;
      expect(rawOutput).not.toContain(ANSI.CYAN);
      expect(rawOutput).not.toContain(ANSI.RESET);
    });

    it('strips colors from status symbols', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start('Test');
      spinner.succeed();

      expect(stream.output).not.toContain(ANSI.GREEN);
    });

    it('strips cursor control codes', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });
      spinner.start('Test');
      spinner.stop('Done');

      expect(stream.output).not.toContain(ANSI.HIDE_CURSOR);
      expect(stream.output).not.toContain(ANSI.SHOW_CURSOR);
      expect(stream.output).not.toContain(ANSI.CLEAR_LINE);
    });

    it('strips text color from output', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        textColor: 'yellow',
        text: 'Yellow text',
      });
      spinner.start();

      expect(stream.output).not.toContain(ANSI.YELLOW);

      spinner.stop();
    });
  });

  describe('static text output', () => {
    it('outputs each status on new line', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });

      spinner.start('Starting');
      spinner.succeed('Done');

      const lines = stream.output.split('\n').filter(Boolean);
      expect(lines.length).toBeGreaterThanOrEqual(2);
    });

    it('log outputs separate lines', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });

      spinner.start('Working');
      spinner.log('Info message');
      spinner.stop('Done');

      expect(stream.output).toContain('Info message\n');
    });

    it('preserves prefix in output', () => {
      const stream = createMockStream();
      const spinner = new Spinner({
        stream,
        ci: true,
        prefix: '[1/3] ',
        text: 'Task one',
      });

      spinner.start();
      expect(stream.output).toContain('[1/3] - Task one');

      spinner.stop();
    });
  });

  describe('SpinnerGroup CI mode', () => {
    it('outputs static lines for each spinner', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'First');
      group.add('task2', 'Second');

      expect(stream.output).toContain('- First\n');
      expect(stream.output).toContain('- Second\n');
    });

    it('strips colors from group output', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.succeed('task1', 'Done');

      // Status symbols should still appear but without color codes
      expect(stream.output).toContain('✔');
      expect(stream.output).not.toContain(ANSI.GREEN);
    });

    it('handles log in CI mode', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Working');
      group.log('Important message');
      group.succeed('task1');

      expect(stream.output).toContain('Important message\n');
    });
  });

  describe('timing behavior', () => {
    it('does not animate in CI mode', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true, text: 'Loading' });

      spinner.start();
      const initialOutput = stream.output;

      vi.advanceTimersByTime(5000);

      // In CI mode, no additional output from animation
      expect(stream.output).toBe(initialOutput);

      spinner.stop();
      vi.useRealTimers();
    });
  });
});
