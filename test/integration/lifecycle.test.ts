import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Spinner, SpinnerGroup, __activeAnimationCount } from '../../src/spinner.js';
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

describe('Resource management', () => {
  let sigintBefore: number;
  let exitBefore: number;

  beforeEach(() => {
    vi.useFakeTimers();
    sigintBefore = process.listenerCount('SIGINT');
    exitBefore = process.listenerCount('exit');
  });

  afterEach(() => {
    vi.useRealTimers();
    // The shared registry installs at most one handler of each kind, ever.
    expect(process.listenerCount('SIGINT')).toBeLessThanOrEqual(sigintBefore + 1);
    expect(process.listenerCount('exit')).toBeLessThanOrEqual(exitBefore + 1);
  });

  describe('process listeners (#1)', () => {
    it('adds at most one SIGINT and one exit listener for many spinners', () => {
      const spinners = Array.from({ length: 15 }, () =>
        new Spinner({ stream: createMockStream(), ci: false }).start()
      );

      expect(process.listenerCount('SIGINT')).toBeLessThanOrEqual(sigintBefore + 1);
      expect(process.listenerCount('exit')).toBeLessThanOrEqual(exitBefore + 1);

      spinners.forEach(s => s.stop());
    });

    it('releases registry entries on stop()', () => {
      const base = __activeAnimationCount();
      const spinners = Array.from({ length: 5 }, () =>
        new Spinner({ stream: createMockStream(), ci: false }).start()
      );
      expect(__activeAnimationCount()).toBe(base + 5);

      spinners.forEach(s => s.stop());
      expect(__activeAnimationCount()).toBe(base);
    });

    it('releases registry entries on clear()', () => {
      const base = __activeAnimationCount();
      const spinner = new Spinner({ stream: createMockStream(), ci: false }).start();
      expect(__activeAnimationCount()).toBe(base + 1);

      spinner.clear();
      expect(__activeAnimationCount()).toBe(base);
    });
  });

  describe('timer.unref (#2)', () => {
    it('unrefs the animation interval so it cannot block process exit', () => {
      const unref = vi.fn();
      const realSetInterval = globalThis.setInterval;
      // @ts-expect-error - minimal stub
      vi.spyOn(globalThis, 'setInterval').mockImplementation((fn, ms) => {
        const t = realSetInterval(fn as () => void, ms as number) as any;
        t.unref = unref;
        return t;
      });

      const spinner = new Spinner({ stream: createMockStream(), ci: false }).start();
      expect(unref).toHaveBeenCalled();

      spinner.stop();
      vi.restoreAllMocks();
    });
  });

  describe('Spinner._onProcessExit (#3)', () => {
    it('restores the cursor and clears the timer', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Working');
      stream.clear();

      spinner._onProcessExit();
      expect(stream.output).toContain(ANSI.SHOW_CURSOR);
      expect(spinner.isSpinning).toBe(false);

      // Timer was cleared: advancing produces no further frames.
      stream.clear();
      vi.advanceTimersByTime(1000);
      expect(stream.output).toBe('');
    });

    it('is idempotent', () => {
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });
      spinner.start('Working');

      spinner._onProcessExit();
      stream.clear();
      spinner._onProcessExit();
      // Second call does nothing (already stopped).
      expect(stream.output).toBe('');
    });
  });

  describe('SpinnerGroup._onProcessExit (#4)', () => {
    it('restores the cursor and clears the timer', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: false });
      group.add('task', 'Working');
      stream.clear();

      group._onProcessExit();
      expect(stream.output).toContain(ANSI.SHOW_CURSOR);

      // Timer cleared: no further renders.
      stream.clear();
      vi.advanceTimersByTime(1000);
      expect(stream.output).toBe('');
    });

    it('does not write SHOW_CURSOR twice', () => {
      const stream = createMockStream();
      const group = new SpinnerGroup({ stream, ci: false });
      group.add('task', 'Working');

      group._onProcessExit();
      stream.clear();
      group._onProcessExit();
      expect(stream.output).not.toContain(ANSI.SHOW_CURSOR);
    });
  });
});

describe('SIGINT handling (#3)', () => {
  // These tests emit a real SIGINT to exercise the shared handler, so they
  // manage timers/exit manually rather than via the registry guard above.
  let exitSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((): never => {
      return undefined as never;
    }) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('restores cursor and terminates when sole SIGINT listener', () => {
    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: false });
    spinner.start('Working');
    stream.clear();

    process.emit('SIGINT');

    expect(stream.output).toContain(ANSI.SHOW_CURSOR);
    expect(spinner.isSpinning).toBe(false);
    expect(exitSpy).toHaveBeenCalledWith(130);

    spinner.stop();
  });

  it('cleans up registered animations on process "exit"', () => {
    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: false });
    spinner.start('Working');
    stream.clear();

    // The shared 'exit' handler restores cursors for all live animations.
    process.emit('exit', 0);

    expect(stream.output).toContain(ANSI.SHOW_CURSOR);
    expect(spinner.isSpinning).toBe(false);

    spinner.stop();
  });

  it('cleans up but does NOT force exit when a co-listener exists', () => {
    const coListener = vi.fn();
    process.on('SIGINT', coListener);

    const stream = createMockStream();
    const spinner = new Spinner({ stream, ci: false });
    spinner.start('Working');
    stream.clear();

    process.emit('SIGINT');

    expect(stream.output).toContain(ANSI.SHOW_CURSOR); // still cleaned up
    expect(exitSpy).not.toHaveBeenCalled(); // yielded to the consumer
    expect(coListener).toHaveBeenCalled();

    process.off('SIGINT', coListener);
    spinner.stop();
  });
});
