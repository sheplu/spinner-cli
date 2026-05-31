import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isCI, isTTY, spin, Spinner } from '../../src/spinner.js';
import { createMockStream } from '../helpers/mock-stream.js';

describe('isCI()', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    // Clear all CI-related env vars
    delete process.env.CI;
    delete process.env.GITHUB_ACTIONS;
    delete process.env.GITLAB_CI;
    delete process.env.CIRCLECI;
    delete process.env.TRAVIS;
    delete process.env.JENKINS_URL;
    delete process.env.BUILDKITE;
    delete process.env.TF_BUILD;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns true when CI=true', () => {
    process.env.CI = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true when CI is any truthy string', () => {
    process.env.CI = '1';
    expect(isCI()).toBe(true);
  });

  it('returns true when GITHUB_ACTIONS=true', () => {
    process.env.GITHUB_ACTIONS = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true when GITLAB_CI=true', () => {
    process.env.GITLAB_CI = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true when CIRCLECI=true', () => {
    process.env.CIRCLECI = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true when TRAVIS=true', () => {
    process.env.TRAVIS = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true when JENKINS_URL is set', () => {
    process.env.JENKINS_URL = 'http://jenkins.example.com';
    expect(isCI()).toBe(true);
  });

  it('returns true when BUILDKITE=true', () => {
    process.env.BUILDKITE = 'true';
    expect(isCI()).toBe(true);
  });

  it('returns true when TF_BUILD=True', () => {
    process.env.TF_BUILD = 'True';
    expect(isCI()).toBe(true);
  });

  it('returns false when no CI vars are set', () => {
    expect(isCI()).toBe(false);
  });
});

describe('isTTY()', () => {
  it('returns true when stream.isTTY is true', () => {
    const stream = createMockStream({ isTTY: true });
    expect(isTTY(stream)).toBe(true);
  });

  it('returns false when stream.isTTY is false', () => {
    const stream = createMockStream({ isTTY: false });
    expect(isTTY(stream)).toBe(false);
  });

  it('returns false when stream.isTTY is undefined', () => {
    const stream = createMockStream();
    // @ts-expect-error - Testing undefined case
    stream.isTTY = undefined;
    expect(isTTY(stream)).toBe(false);
  });
});

describe('spin()', () => {
  it('creates and starts a spinner', () => {
    const stream = createMockStream();
    const spinner = spin('Loading...', { stream, ci: false });

    expect(spinner).toBeInstanceOf(Spinner);
    expect(spinner.isSpinning).toBe(true);

    spinner.stop();
  });

  it('passes text to spinner', () => {
    const stream = createMockStream();
    const spinner = spin('Custom text', { stream, ci: false });

    expect(stream.output).toContain('Custom text');

    spinner.stop();
  });

  it('accepts options', () => {
    const stream = createMockStream();
    const spinner = spin('Test', {
      stream,
      ci: false,
      color: 'cyan',
      prefix: '[1/3] ',
    });

    expect(stream.output).toContain('[1/3]');

    spinner.stop();
  });

  it('returns spinner that can be controlled', () => {
    const stream = createMockStream();
    const spinner = spin('Test', { stream, ci: true });

    expect(spinner.isSpinning).toBe(true);

    spinner.update('Updated');
    spinner.succeed('Done');

    expect(spinner.isSpinning).toBe(false);
    expect(stream.output).toContain('Done');
  });
});
