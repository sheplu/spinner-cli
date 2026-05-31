# CLAUDE.md

This file provides guidance for Claude Code when working with this repository.

## Project Overview

spinner-cli is a CLI spinner/loading indicator library for Node.js terminal applications. It has zero runtime dependencies and uses only native Node.js APIs.

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js (ESM modules)
- **Build**: TypeScript compiler (`tsc`)
- **Testing**: Vitest

## Project Structure

```
spinner-cli/
├── src/
│   ├── spinner.ts      # Main library source (Spinner, SpinnerGroup, utilities)
│   └── example.ts      # Demo script
├── dist/               # Compiled JavaScript output
├── test/
│   ├── unit/           # Unit tests for individual components
│   └── integration/    # Integration tests (CI mode, promises, lifecycle)
├── package.json
├── tsconfig.json
└── README.md
```

## Common Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run example        # Build and run the demo
npm run test           # Run tests once
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

## Key Exports

The main module (`src/spinner.ts`) exports:

- `Spinner` - Main spinner class
- `SpinnerGroup` - Concurrent spinner manager
- `spin()` - Factory function to create and start a spinner
- `isCI()` - Detect CI environment
- `isTTY()` - Detect terminal environment
- `colors` - ANSI color codes object
- Frame constants: `BRAILLE_FRAMES`, `ASCII_FRAMES`, `CIRCLE_FRAMES`, `ARROW_FRAMES`, `ARC_FRAMES`, `DOTS_FRAMES`
- Types: `Color`, `SpinnerOptions`, `SpinnerSymbols`, `PromiseOptions`, `SpinnerGroupOptions`

## Code Conventions

- Use TypeScript strict mode
- ESM modules (type: "module" in package.json)
- Output to stderr by default (not stdout)
- Auto-detect CI/non-TTY environments and disable animations
- All Spinner methods return `this` for chaining (except `promise()`)
- ANSI escape codes are used directly (no dependencies)

## Testing Notes

- Tests use Vitest
- Unit tests cover constants, utilities, Spinner class, and SpinnerGroup
- Integration tests cover CI mode behavior, promise wrapper, and lifecycle
- Tests may create mock streams to capture output
