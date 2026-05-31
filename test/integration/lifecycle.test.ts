import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Spinner, SpinnerGroup } from '../../src/spinner.js';
import { createMockStream, stripAnsi, ANSI } from '../helpers/mock-stream.js';

describe('Spinner Lifecycle', () => {
  describe('full start -> update -> succeed flow', () => {
    it('completes successfully', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true, text: 'Loading' });

      spinner.start();
      expect(spinner.isSpinning).toBe(true);

      spinner.update('Processing');
      spinner.succeed('Completed!');

      expect(spinner.isSpinning).toBe(false);
      expect(stream.output).toContain('Completed!');
      expect(stream.output).toContain('✔');
    });

    it('works with TTY mode', () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false, text: 'Working' });

      spinner.start();
      expect(spinner.isSpinning).toBe(true);
      expect(stream.output).toContain(ANSI.HIDE_CURSOR);

      vi.advanceTimersByTime(200);
      spinner.update('Still working');

      vi.advanceTimersByTime(200);
      spinner.succeed('All done!');

      expect(spinner.isSpinning).toBe(false);
      expect(stream.output).toContain(ANSI.SHOW_CURSOR);
      expect(stream.output).toContain('All done!');

      vi.useRealTimers();
    });
  });

  describe('full start -> update -> fail flow', () => {
    it('handles failure correctly', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true, text: 'Trying' });

      spinner.start();
      spinner.update('Attempting');
      spinner.fail('Failed to complete');

      expect(spinner.isSpinning).toBe(false);
      expect(stream.output).toContain('Failed to complete');
      expect(stream.output).toContain('✖');
    });
  });

  describe('multiple start/stop cycles', () => {
    it('can restart spinner after stop', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });

      // First cycle
      spinner.start('First run');
      expect(spinner.isSpinning).toBe(true);
      spinner.stop('Done 1');
      expect(spinner.isSpinning).toBe(false);

      // Second cycle
      spinner.start('Second run');
      expect(spinner.isSpinning).toBe(true);
      spinner.stop('Done 2');
      expect(spinner.isSpinning).toBe(false);

      expect(stream.output).toContain('First run');
      expect(stream.output).toContain('Done 1');
      expect(stream.output).toContain('Second run');
      expect(stream.output).toContain('Done 2');
    });

    it('can restart after succeed', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });

      spinner.start('Task 1').succeed('Done 1');
      spinner.start('Task 2').fail('Failed 2');
      spinner.start('Task 3').warn('Warning 3');

      expect(stream.output).toContain('✔');
      expect(stream.output).toContain('✖');
      expect(stream.output).toContain('⚠');
    });
  });

  describe('state consistency', () => {
    it('maintains correct state through lifecycle', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });

      expect(spinner.isSpinning).toBe(false);

      spinner.start('Working');
      expect(spinner.isSpinning).toBe(true);

      spinner.update('Still working');
      expect(spinner.isSpinning).toBe(true);

      spinner.succeed('Done');
      expect(spinner.isSpinning).toBe(false);
    });

    it('stop is idempotent', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: true });

      spinner.start('Working');
      spinner.stop('Done');

      const outputAfterFirstStop = stream.output;
      spinner.stop('Again');

      // Output should not change on second stop
      expect(stream.output).toBe(outputAfterFirstStop);
    });
  });
});

describe('SpinnerGroup Lifecycle', () => {
  it('handles multiple concurrent tasks', () => {
    const stream = createMockStream();
    const group = new SpinnerGroup({ stream, ci: true });

    group.add('download', 'Downloading files');
    group.add('process', 'Processing data');
    group.add('upload', 'Uploading results');

    group.succeed('download', 'Downloaded 10 files');
    group.warn('process', 'Processed with warnings');
    group.fail('upload', 'Upload failed');

    expect(stream.output).toContain('Downloaded 10 files');
    expect(stream.output).toContain('Processed with warnings');
    expect(stream.output).toContain('Upload failed');
    expect(stream.output).toContain('✔');
    expect(stream.output).toContain('⚠');
    expect(stream.output).toContain('✖');
  });

  it('handles updates during execution in CI mode', () => {
    const stream = createMockStream();
    const group = new SpinnerGroup({ stream, ci: true });

    group.add('task', 'Starting');
    group.update('task', 'In progress');
    group.succeed('task', 'Completed');

    expect(stream.output).toContain('Starting');
    expect(stream.output).toContain('Completed');
    expect(stream.output).toContain('✔');
  });

  it('handles updates during execution in TTY mode', () => {
    vi.useFakeTimers();
    const stream = createMockStream();
    const group = new SpinnerGroup({ stream, ci: false });

    group.add('task', 'Starting');
    vi.advanceTimersByTime(100);

    group.update('task', 'In progress');
    vi.advanceTimersByTime(100);

    group.update('task', 'Almost done');
    vi.advanceTimersByTime(100);

    // Before succeed - verify updates are reflected in render
    expect(stream.output).toContain('In progress');
    expect(stream.output).toContain('Almost done');

    group.succeed('task', 'Completed');

    // Timer stops when all done, cursor is restored
    expect(stream.output).toContain(ANSI.SHOW_CURSOR);

    vi.useRealTimers();
  });
});

describe('Progress Feature Lifecycle', () => {
  it('updates progress through completion', () => {
    vi.useFakeTimers();
    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: false, progressBar: true });

    spinner.start('Downloading');

    for (let i = 0; i <= 100; i += 25) {
      spinner.progress(i, 100);
      vi.advanceTimersByTime(100);
    }

    expect(stream.output).toContain('100%');

    spinner.succeed('Download complete');

    vi.useRealTimers();
  });

  it('resets progress after stop', () => {
    vi.useFakeTimers();
    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: false });

    spinner.start('Task 1');
    spinner.progress(50, 100);
    vi.advanceTimersByTime(100);
    expect(stream.output).toContain('50%');

    spinner.stop('Done');
    stream.clear();

    spinner.start('Task 2');
    vi.advanceTimersByTime(100);

    // New task should not show progress from previous task
    expect(stream.output).not.toContain('%');

    spinner.stop();
    vi.useRealTimers();
  });
});
