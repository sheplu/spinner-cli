# spinner-cli

A CLI spinner/loading indicator for terminal applications with zero runtime dependencies.

## Installation

```bash
npm install
```

## Usage

```typescript
import { Spinner, spin } from 'spinner-cli';

// Default spinner
const spinner = new Spinner();
spinner.start('Loading...');
// ... do async work
spinner.succeed('Done!');

// Factory function (create + start in one call)
const s = spin('Loading...', { color: 'cyan' });
s.succeed('Done!');
```

## API

### `new Spinner(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `frames` | `string[]` | `BRAILLE_FRAMES` | Animation frames |
| `interval` | `number` | `80` | Frame duration in ms |
| `text` | `string` | `''` | Initial text |
| `color` | `Color` | `undefined` | Spinner color |
| `textColor` | `Color` | `undefined` | Text color |
| `ci` | `boolean` | auto-detect | Disable colors and animation |
| `showTime` | `boolean` | `false` | Show elapsed time |
| `stream` | `WriteStream` | `stderr` | Output stream |
| `prefix` | `string` | `''` | Text before spinner |
| `suffix` | `string` | `''` | Text after main text |
| `symbols` | `SpinnerSymbols` | `{...}` | Custom status symbols |
| `persist` | `boolean` | `false` | Keep line visible after stop |
| `hideCursor` | `boolean` | `true` | Hide cursor during animation |
| `progressBar` | `boolean` | `false` | Show visual progress bar |
| `progressBarWidth` | `number` | `20` | Width of progress bar |
| `truncate` | `boolean` | `false` | Truncate text to terminal width |

### Methods

| Method | Description |
|--------|-------------|
| `start(text?)` | Begin animation |
| `stop(text?)` | Stop and show optional final message |
| `clear()` | Stop without any output |
| `update(text)` | Change displayed text while spinning |
| `succeed(text?)` | Stop with green `✔` prefix |
| `fail(text?)` | Stop with red `✖` prefix |
| `warn(text?)` | Stop with yellow `⚠` prefix |
| `info(text?)` | Stop with blue `ℹ` prefix |
| `progress(value, total)` | Update progress percentage |
| `log(message)` | Print message without breaking spinner |
| `promise(action, options?)` | Wrap async operation (see below) |
| `isSpinning` | Getter: check if spinner is active |

All methods return `this` for chaining (except `promise` which returns `Promise<T>`).

## Colors

Available colors for the `color` option:

`black` `red` `green` `yellow` `blue` `magenta` `cyan` `white` `gray`

Status methods (`succeed`, `fail`, `warn`, `info`) automatically color their symbols.

## Text Color & Suffix

Color the message text and add a suffix:

```typescript
const spinner = new Spinner({
  color: 'cyan',        // Spinner color
  textColor: 'yellow',  // Text color
  suffix: '(please wait)',
});
spinner.start('Loading');
// Shows: ⠋ Loading (please wait)
```

## Factory Function

Create and start a spinner in one call:

```typescript
import { spin } from 'spinner-cli';

const spinner = spin('Loading...', { color: 'cyan' });
// ... async work
spinner.succeed('Done');
```

## Truncation

Auto-truncate text to fit terminal width:

```typescript
const spinner = new Spinner({ truncate: true });
spinner.start('This is a very long message that might exceed terminal width...');
// Truncates with "..." if needed
```

## Progress Mode

Show download/upload progress as percentage or visual bar:

```typescript
// Percentage (default)
const spinner = new Spinner({ color: 'cyan' });
spinner.start('Downloading...');
spinner.progress(50, 100);  // Shows: ⠋ Downloading... 50%

// Visual progress bar
const spinner = new Spinner({ color: 'cyan', progressBar: true });
spinner.start('Downloading...');
spinner.progress(50, 100);  // Shows: ⠋ Downloading... [██████████░░░░░░░░░░] 50%

// Custom bar width
const spinner = new Spinner({ progressBar: true, progressBarWidth: 30 });
```

Progress resets automatically when the spinner stops.

## Log While Spinning

Print messages without breaking the spinner animation:

```typescript
const spinner = new Spinner({ color: 'cyan' });
spinner.start('Installing packages...');

spinner.log('  + lodash@4.17.21');
spinner.log('  + express@4.18.2');
spinner.log('  + typescript@5.3.0');

spinner.succeed('Installed 3 packages');
```

Output:
```
  + lodash@4.17.21
  + express@4.18.2
  + typescript@5.3.0
✔ Installed 3 packages
```

## Elapsed Time

Show duration next to spinner text:

```typescript
const spinner = new Spinner({ showTime: true });
spinner.start('Downloading...');
// Shows: ⠋ Downloading... (1.2s)
spinner.succeed('Downloaded');
// Shows: ✔ Downloaded (3.5s)
```

## Promise Wrapper

Automatically start/stop spinner around async operations:

```typescript
const spinner = new Spinner({ color: 'cyan', showTime: true });

// Full options
const data = await spinner.promise(fetchData(), {
  text: 'Fetching...',
  successText: 'Fetched',
  failText: 'Fetch failed',
});

// Short form (text only)
await spinner.promise(fetchData(), 'Fetching...');
```

On success calls `succeed()`, on error calls `fail()` and re-throws.

## Spinner Groups

Run multiple spinners concurrently:

```typescript
import { SpinnerGroup, spinGroup } from 'spinner-cli';

const group = new SpinnerGroup();        // or: spinGroup()

group.add('api', 'Fetching from API...');
group.add('db', 'Querying database...');
group.add('cache', 'Warming cache...');

// Complete individually
group.succeed('cache', 'Cache warmed');
group.succeed('api', 'API data received');
group.fail('db', 'Database timeout');
```

### Per-entry options

Each `add()` accepts the same display options as a standalone `Spinner`:

```typescript
group.add('build', 'Building', {
  prefix: '[1/3] ',     // step indicator
  color: 'green',       // per-entry frame color (default: group color, 'cyan')
  showTime: true,       // elapsed time, frozen when the entry finishes
  progressBar: true,    // visual bar instead of a percentage
});

group.progress('build', 50, 100);  // update progress for an entry
```

Available per-entry options: `prefix`, `suffix`, `color`, `textColor`, `truncate`,
`progressBar`, `progressBarWidth`, `showTime`. Group-wide defaults (`color`, `truncate`,
`showTime`, `progressBarWidth`) can be set on the constructor and are inherited by entries.

> **Truncation defaults ON for groups.** Each entry must occupy exactly one terminal row for
> the multi-line render to stay aligned, so group lines are truncated to the terminal width.
> You can disable it per entry (`{ truncate: false }`) if you manage widths yourself.
>
> **CI / non-TTY mode** prints one static line per entry; live progress and elapsed-time
> updates are not re-rendered (the final line includes total elapsed time when `showTime` is on).

### SpinnerGroup Methods

| Method | Description |
|--------|-------------|
| `add(key, text, options?)` | Add a new spinner (optional per-entry options) |
| `update(key, text)` | Update spinner text |
| `progress(key, value, total)` | Set an entry's progress |
| `succeed(key, text?)` | Mark as successful |
| `fail(key, text?)` | Mark as failed |
| `warn(key, text?)` | Mark with warning |
| `info(key, text?)` | Mark with info |
| `log(message)` | Print message above spinners |
| `promise(key, action, options?)` | Wrap async operation |

State getters: `isSpinning` (any entry still running), `keys()` (ordered keys),
`status(key)` (per-entry status or `undefined`).

## Prefix / Indent

Add prefixes for indentation or step indicators:

```typescript
// Indented sub-task
const spinner = new Spinner({ prefix: '  ' });
spinner.start('Sub-task...');
// Shows:   ⠋ Sub-task...

// Step indicator
const spinner = new Spinner({ prefix: '[2/5] ' });
spinner.start('Processing...');
// Shows: [2/5] ⠋ Processing...
```

## Custom Symbols

Override default status symbols:

```typescript
const spinner = new Spinner({
  symbols: {
    succeed: '✓',  // default: ✔
    fail: '✗',     // default: ✖
    warn: '⚡',    // default: ⚠
    info: '→',     // default: ℹ
  }
});
```

## Stream Selection

Spinner output defaults to **stderr**, not stdout. This keeps stdout clean for your
program's actual output, so a user can pipe real data (`mycli > out.json`) while the spinner
still animates on the terminal. Note the flip side: redirecting stderr (`mycli 2>/dev/null`)
hides the spinner.

Switch to stdout (or any writable-like target) if you prefer:

```typescript
const spinner = new Spinner({ stream: process.stdout });
```

The `stream` option accepts any object matching `WritableStreamLike`
(`{ write(s): boolean; isTTY?: boolean; columns?: number }`), not just Node's `WriteStream` —
handy for tests and custom sinks.

## TTY Detection

Spinners auto-detect non-TTY environments (piped output) and disable animation:

```bash
node app.js          # Interactive spinner
node app.js | cat    # Static output (auto-detected)
```

Utility functions are exported:

```typescript
import { isCI, isTTY } from 'spinner-cli';

if (isTTY()) {
  // Interactive terminal
}
```

## CI Mode

In CI environments, spinners automatically disable:
- ANSI color codes
- Cursor hide/show
- Animation (prints static text instead)

Auto-detected via:
- Environment variables: `CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `CIRCLECI`, `TRAVIS`, `JENKINS_URL`, `BUILDKITE`, `TF_BUILD`
- Non-TTY streams (piped output)

```typescript
// Force CI mode
const spinner = new Spinner({ ci: true });

// Force interactive mode (even in CI)
const spinner = new Spinner({ ci: false });
```

## Additional Options

```typescript
// Keep spinner line visible after stop (don't clear)
const spinner = new Spinner({ persist: true });

// Disable cursor hiding (for problematic terminals)
const spinner = new Spinner({ hideCursor: false });
```

## Animation Frames

| Export | Preview | Description |
|--------|---------|-------------|
| `BRAILLE_FRAMES` | `⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏` | Default - Braille dots |
| `ASCII_FRAMES` | `\|/-\` | Maximum compatibility |
| `CIRCLE_FRAMES` | `◐◓◑◒` | Half-filled circle |
| `ARROW_FRAMES` | `←↖↑↗→↘↓↙` | 8-direction arrow |
| `ARC_FRAMES` | `◜◠◝◞◡◟` | Smooth arc |
| `DOTS_FRAMES` | `.  .. ...` | Classic dots |

## Development

```bash
npm run build          # Compile TypeScript
npm run example        # Build and run demo
npm run test           # Run tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
```

## How It Works

1. Hides cursor with ANSI escape code `\x1B[?25l`
2. Writes spinner frame + text to stderr
3. Uses `\r\x1B[K` to clear line and return cursor
4. Cycles frames via `setInterval`
5. Restores cursor on stop or SIGINT
