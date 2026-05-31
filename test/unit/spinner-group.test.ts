import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SpinnerGroup } from '../../src/spinner.js';
import { createMockStream, ANSI, stripAnsi } from '../helpers/mock-stream.js';

describe('SpinnerGroup', () => {
  describe('add()', () => {
    it('creates new spinner', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'First task');

      expect(stream.output).toContain('First task');
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      const result = group.add('task1', 'Task');

      expect(result).toBe(group);
    });

    it('ignores duplicate keys', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'First');
      stream.clear();
      group.add('task1', 'Duplicate');

      expect(stream.output).toBe('');
    });

    it('can add multiple spinners', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'First task');
      group.add('task2', 'Second task');
      group.add('task3', 'Third task');

      expect(stream.output).toContain('First task');
      expect(stream.output).toContain('Second task');
      expect(stream.output).toContain('Third task');
    });
  });

  describe('update()', () => {
    it('changes spinner text', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: false });

      group.add('task1', 'Initial');
      stream.clear();
      group.update('task1', 'Updated');
      vi.advanceTimersByTime(100);

      expect(stream.output).toContain('Updated');

      group.succeed('task1');
      vi.useRealTimers();
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      const result = group.update('task1', 'Updated');

      expect(result).toBe(group);
    });

    it('does nothing for non-existent key', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      const result = group.update('nonexistent', 'Text');

      expect(result).toBe(group);
    });
  });

  describe('succeed()', () => {
    it('marks spinner as done with success', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.succeed('task1');

      expect(stream.output).toContain('✔');
    });

    it('uses custom text if provided', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.succeed('task1', 'Completed!');

      expect(stream.output).toContain('Completed!');
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      const result = group.succeed('task1');

      expect(result).toBe(group);
    });
  });

  describe('fail()', () => {
    it('marks spinner as failed', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.fail('task1');

      expect(stream.output).toContain('✖');
    });

    it('uses custom text if provided', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.fail('task1', 'Error occurred');

      expect(stream.output).toContain('Error occurred');
    });
  });

  describe('warn()', () => {
    it('marks spinner as warned', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.warn('task1');

      expect(stream.output).toContain('⚠');
    });

    it('uses custom text if provided', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.warn('task1', 'Warning!');

      expect(stream.output).toContain('Warning!');
    });
  });

  describe('info()', () => {
    it('marks spinner as info', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.info('task1');

      expect(stream.output).toContain('ℹ');
    });

    it('uses custom text if provided', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.info('task1', 'Note');

      expect(stream.output).toContain('Note');
    });
  });

  describe('stop()', () => {
    it('stops spinner without symbol', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.stop('task1', 'Stopped');

      expect(stream.output).toContain('Stopped');
      // Should not contain status symbols
      expect(stream.output).not.toContain('✔');
      expect(stream.output).not.toContain('✖');
    });
  });

  describe('log()', () => {
    it('prints above spinners in CI mode', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.log('Log message');

      expect(stream.output).toContain('Log message');
    });

    it('returns this for chaining', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      const result = group.log('Message');

      expect(result).toBe(group);
    });
  });

  describe('multiple spinners', () => {
    it('renders all spinners in TTY mode', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: false });

      group.add('task1', 'First');
      group.add('task2', 'Second');
      group.add('task3', 'Third');

      expect(stream.output).toContain('First');
      expect(stream.output).toContain('Second');
      expect(stream.output).toContain('Third');

      group.succeed('task1');
      group.succeed('task2');
      group.succeed('task3');

      vi.useRealTimers();
    });

    it('can succeed individual spinners', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'First');
      group.add('task2', 'Second');

      group.succeed('task1', 'Done 1');
      group.fail('task2', 'Failed 2');

      expect(stream.output).toContain('Done 1');
      expect(stream.output).toContain('Failed 2');
    });
  });

  describe('custom symbols', () => {
    it('uses custom succeed symbol', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({
        stream,
        ci: true,
        symbols: { succeed: '🎉' },
      });

      group.add('task1', 'Task');
      group.succeed('task1');

      expect(stream.output).toContain('🎉');
    });

    it('uses custom fail symbol', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({
        stream,
        ci: true,
        symbols: { fail: '💔' },
      });

      group.add('task1', 'Task');
      group.fail('task1');

      expect(stream.output).toContain('💔');
    });
  });

  describe('promise()', () => {
    it('adds spinner and succeeds on resolve', async () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      const result = await group.promise('task1', Promise.resolve('value'), {
        text: 'Processing',
        successText: 'Done!',
      });

      expect(result).toBe('value');
      expect(stream.output).toContain('Processing');
      expect(stream.output).toContain('Done!');
    });

    it('adds spinner and fails on reject', async () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      await expect(
        group.promise('task1', Promise.reject(new Error('oops')), {
          text: 'Processing',
          failText: 'Failed!',
        })
      ).rejects.toThrow('oops');

      expect(stream.output).toContain('Failed!');
    });

    it('accepts function returning promise', async () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      const result = await group.promise('task1', async () => 'async value', 'Loading');

      expect(result).toBe('async value');
    });
  });

  describe('CI mode', () => {
    it('prints static lines', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Building');

      expect(stream.output).toContain('- Building\n');
    });

    it('does not include ANSI cursor codes', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });

      group.add('task1', 'Task');
      group.succeed('task1');

      expect(stream.output).not.toContain(ANSI.HIDE_CURSOR);
      expect(stream.output).not.toContain(ANSI.SHOW_CURSOR);
    });
  });

  describe('hideCursor option', () => {
    it('hides cursor when hideCursor=true (default)', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: false });

      group.add('task1', 'Task');

      expect(stream.output).toContain(ANSI.HIDE_CURSOR);

      group.succeed('task1');
      vi.useRealTimers();
    });

    it('does not hide cursor when hideCursor=false', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: false, hideCursor: false });

      group.add('task1', 'Task');

      expect(stream.output).not.toContain(ANSI.HIDE_CURSOR);

      group.succeed('task1');
      vi.useRealTimers();
    });
  });

  describe('escape injection hardening (F1)', () => {
    const EVIL = '\x1B[2Jboom\x1B]0;pwned\x07\r';

    // Assert on bytes the library never emits itself (BEL, OSC, screen-clear),
    // so we don't collide with its own SGR / cursor codes in TTY mode.
    function assertClean(output: string): void {
      expect(output).not.toContain('\x07'); // BEL
      expect(output).not.toContain('\x1B]'); // OSC
      expect(output).not.toContain('\x1B[2J'); // screen clear
    }

    it('sanitizes add() and update() text', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: false });
      group.add('t', EVIL);
      group.update('t', EVIL);
      vi.advanceTimersByTime(80);
      assertClean(stream.output);
      expect(stripAnsi(stream.output)).toContain('boom');
      group.succeed('t');
      vi.useRealTimers();
    });

    it('sanitizes log() messages', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });
      group.add('t', 'task');
      group.log(EVIL);
      assertClean(stream.output);
    });

    it('sanitizes _finish() text (succeed)', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: true });
      group.add('t', 'task');
      group.succeed('t', EVIL);
      assertClean(stream.output);
      expect(stream.output).toContain('boom');
    });

    it('sanitizes custom symbols', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({
        stream,
        ci: true,
        symbols: { succeed: '\x1B[2J✓' },
      });
      group.add('t', 'task');
      group.succeed('t');
      assertClean(stream.output);
    });

    it('does NOT strip the library\'s own colors (regression)', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: false });
      group.add('t', 'Working');
      group.add('keep', 'Still going'); // keeps the render timer alive
      // The colored cyan frame is emitted by the library on add().
      expect(stream.output).toContain(ANSI.CYAN);
      group.succeed('t', 'Done');
      // Finished line is flushed on the next render tick.
      vi.advanceTimersByTime(80);
      expect(stripAnsi(stream.output)).toContain('Done');
      group.succeed('keep');
      vi.useRealTimers();
    });
  });
});
