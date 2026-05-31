import { describe, it, expect } from 'vitest';
import {
  BRAILLE_FRAMES,
  ASCII_FRAMES,
  CIRCLE_FRAMES,
  ARROW_FRAMES,
  ARC_FRAMES,
  DOTS_FRAMES,
  colors,
} from '../../src/spinner.js';

describe('Frame Arrays', () => {
  describe('BRAILLE_FRAMES', () => {
    it('has 10 frames', () => {
      expect(BRAILLE_FRAMES).toHaveLength(10);
    });

    it('contains only non-empty strings', () => {
      BRAILLE_FRAMES.forEach((frame) => {
        expect(typeof frame).toBe('string');
        expect(frame.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ASCII_FRAMES', () => {
    it('has 4 frames', () => {
      expect(ASCII_FRAMES).toHaveLength(4);
    });

    it('contains only non-empty strings', () => {
      ASCII_FRAMES.forEach((frame) => {
        expect(typeof frame).toBe('string');
        expect(frame.length).toBeGreaterThan(0);
      });
    });

    it('contains expected characters', () => {
      expect(ASCII_FRAMES).toContain('|');
      expect(ASCII_FRAMES).toContain('/');
      expect(ASCII_FRAMES).toContain('-');
      expect(ASCII_FRAMES).toContain('\\');
    });
  });

  describe('CIRCLE_FRAMES', () => {
    it('has 4 frames', () => {
      expect(CIRCLE_FRAMES).toHaveLength(4);
    });

    it('contains only non-empty strings', () => {
      CIRCLE_FRAMES.forEach((frame) => {
        expect(typeof frame).toBe('string');
        expect(frame.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ARROW_FRAMES', () => {
    it('has 8 frames', () => {
      expect(ARROW_FRAMES).toHaveLength(8);
    });

    it('contains only non-empty strings', () => {
      ARROW_FRAMES.forEach((frame) => {
        expect(typeof frame).toBe('string');
        expect(frame.length).toBeGreaterThan(0);
      });
    });
  });

  describe('ARC_FRAMES', () => {
    it('has 6 frames', () => {
      expect(ARC_FRAMES).toHaveLength(6);
    });

    it('contains only non-empty strings', () => {
      ARC_FRAMES.forEach((frame) => {
        expect(typeof frame).toBe('string');
        expect(frame.length).toBeGreaterThan(0);
      });
    });
  });

  describe('DOTS_FRAMES', () => {
    it('has 4 frames', () => {
      expect(DOTS_FRAMES).toHaveLength(4);
    });

    it('contains only strings', () => {
      DOTS_FRAMES.forEach((frame) => {
        expect(typeof frame).toBe('string');
      });
    });
  });
});

describe('colors', () => {
  it('has 9 color entries', () => {
    expect(Object.keys(colors)).toHaveLength(9);
  });

  it('contains all expected colors', () => {
    expect(colors).toHaveProperty('black');
    expect(colors).toHaveProperty('red');
    expect(colors).toHaveProperty('green');
    expect(colors).toHaveProperty('yellow');
    expect(colors).toHaveProperty('blue');
    expect(colors).toHaveProperty('magenta');
    expect(colors).toHaveProperty('cyan');
    expect(colors).toHaveProperty('white');
    expect(colors).toHaveProperty('gray');
  });

  it('all colors are ANSI escape sequences', () => {
    Object.values(colors).forEach((code) => {
      expect(code).toMatch(/^\x1B\[\d+m$/);
    });
  });
});
