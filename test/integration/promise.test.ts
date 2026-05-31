import { describe, it, expect, vi } from 'vitest';
import { Spinner, SpinnerGroup } from '../../src/spinner.js';
import { createMockStream, stripAnsi } from '../helpers/mock-stream.js';

describe('Promise Wrapper', () => {
  describe('Spinner.promise()', () => {
    describe('successful promise', () => {
      it('shows succeed on resolve', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        const result = await spinner.promise(Promise.resolve('value'), 'Loading');

        expect(result).toBe('value');
        expect(stream.output).toContain('✔');
        expect(spinner.isSpinning).toBe(false);
      });

      it('returns resolved value', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        const result = await spinner.promise(Promise.resolve({ data: 42 }), 'Loading');

        expect(result).toEqual({ data: 42 });
      });

      it('works with function returning promise', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        const result = await spinner.promise(async () => {
          return 'async result';
        }, 'Processing');

        expect(result).toBe('async result');
        expect(stream.output).toContain('✔');
      });
    });

    describe('rejected promise', () => {
      it('shows fail on reject', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        await expect(
          spinner.promise(Promise.reject(new Error('oops')), 'Loading')
        ).rejects.toThrow('oops');

        expect(stream.output).toContain('✖');
        expect(spinner.isSpinning).toBe(false);
      });

      it('re-throws the original error', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });
        const customError = new Error('Custom error message');

        await expect(
          spinner.promise(Promise.reject(customError), 'Working')
        ).rejects.toBe(customError);
      });

      it('works with function that throws', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        await expect(
          spinner.promise(async () => {
            throw new Error('async error');
          }, 'Processing')
        ).rejects.toThrow('async error');

        expect(stream.output).toContain('✖');
      });
    });

    describe('with options object', () => {
      it('uses text option', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        await spinner.promise(Promise.resolve(), { text: 'Custom loading text' });

        expect(stream.output).toContain('Custom loading text');
      });

      it('uses successText on resolve', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        await spinner.promise(Promise.resolve(), {
          text: 'Loading',
          successText: 'All done successfully!',
        });

        expect(stream.output).toContain('All done successfully!');
      });

      it('uses failText on reject', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        await expect(
          spinner.promise(Promise.reject(new Error('fail')), {
            text: 'Loading',
            failText: 'Something went wrong',
          })
        ).rejects.toThrow();

        expect(stream.output).toContain('Something went wrong');
      });

      it('falls back to spinner text when successText not provided', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        await spinner.promise(Promise.resolve(), { text: 'Loading data' });

        // succeed() without text uses spinner text
        expect(stream.output).toContain('Loading data');
      });
    });

    describe('string options shorthand', () => {
      it('accepts string as text option', async () => {
        const stream = createMockStream();
        const spinner = new Spinner({ stream, ci: true });

        await spinner.promise(Promise.resolve(), 'Simple text');

        expect(stream.output).toContain('Simple text');
      });
    });
  });

  describe('SpinnerGroup.promise()', () => {
    describe('successful promise', () => {
      it('shows succeed for keyed spinner', async () => {
        const stream = createMockStream();
        const group = new SpinnerGroup({ stream, ci: true });

        const result = await group.promise('download', Promise.resolve('data'), {
          text: 'Downloading',
          successText: 'Downloaded!',
        });

        expect(result).toBe('data');
        expect(stream.output).toContain('Downloading');
        expect(stream.output).toContain('Downloaded!');
        expect(stream.output).toContain('✔');
      });

      it('uses key as default text', async () => {
        const stream = createMockStream();
        const group = new SpinnerGroup({ stream, ci: true });

        await group.promise('myTask', Promise.resolve());

        expect(stream.output).toContain('myTask');
      });
    });

    describe('rejected promise', () => {
      it('shows fail for keyed spinner', async () => {
        const stream = createMockStream();
        const group = new SpinnerGroup({ stream, ci: true });

        await expect(
          group.promise('upload', Promise.reject(new Error('network error')), {
            text: 'Uploading',
            failText: 'Upload failed',
          })
        ).rejects.toThrow('network error');

        expect(stream.output).toContain('Upload failed');
        expect(stream.output).toContain('✖');
      });
    });

    describe('multiple concurrent promises', () => {
      it('handles multiple promises in parallel', async () => {
        const stream = createMockStream();
        const group = new SpinnerGroup({ stream, ci: true });

        const [result1, result2] = await Promise.all([
          group.promise('task1', Promise.resolve('one'), 'First'),
          group.promise('task2', Promise.resolve('two'), 'Second'),
        ]);

        expect(result1).toBe('one');
        expect(result2).toBe('two');
        expect(stream.output).toContain('First');
        expect(stream.output).toContain('Second');
      });

      it('handles mixed success and failure', async () => {
        const stream = createMockStream();
        const group = new SpinnerGroup({ stream, ci: true });

        const results = await Promise.allSettled([
          group.promise('success', Promise.resolve('ok'), 'Succeeds'),
          group.promise('fail', Promise.reject(new Error('bad')), 'Fails'),
        ]);

        expect(results[0]).toEqual({ status: 'fulfilled', value: 'ok' });
        expect(results[1].status).toBe('rejected');

        expect(stream.output).toContain('✔');
        expect(stream.output).toContain('✖');
      });
    });
  });

  describe('async timing', () => {
    it('spinner runs while promise is pending', async () => {
      vi.useFakeTimers();
      const stream = createMockStream();
      const spinner = new Spinner({ stream, ci: false });

      let resolvePromise: () => void;
      const pendingPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      const promiseResult = spinner.promise(pendingPromise, 'Loading');

      // Spinner should be running
      expect(spinner.isSpinning).toBe(true);

      // Advance time - spinner should still be running
      vi.advanceTimersByTime(500);
      expect(spinner.isSpinning).toBe(true);

      // Resolve the promise
      resolvePromise!();
      await vi.runAllTimersAsync();
      await promiseResult;

      expect(spinner.isSpinning).toBe(false);

      vi.useRealTimers();
    });
  });
});
