import { Spinner, SpinnerGroup, spin } from './spinner.js';

// Helper to delay execution
const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

// Simulated async operations
const fetchData = () => sleep(1500).then(() => ({ data: 'example' }));

async function demo(): Promise<void> {
  console.log('CLI Spinner Demo\n');

  // --- Factory Function ---
  const s = spin('Using spin() factory...', { color: 'cyan' });
  await sleep(1500);
  s.succeed('Factory works');

  await sleep(300);

  // --- Text Color & Suffix ---
  console.log('\n--- Text Color & Suffix ---\n');

  const spinner1 = new Spinner({
    color: 'cyan',
    textColor: 'yellow',
    suffix: '(please wait)',
  });
  spinner1.start('Colored text');
  await sleep(1500);
  spinner1.succeed('Done');

  await sleep(300);

  // --- Progress Bar ---
  console.log('\n--- Progress Bar ---\n');

  const spinner2 = new Spinner({ color: 'cyan', progressBar: true });
  spinner2.start('Downloading...');
  for (let i = 0; i <= 100; i += 5) {
    spinner2.progress(i, 100);
    await sleep(80);
  }
  spinner2.succeed('Downloaded');

  await sleep(300);

  // --- Progress Percentage ---
  console.log('\n--- Progress Percentage ---\n');

  const spinner2b = new Spinner({ color: 'cyan' });
  spinner2b.start('Uploading...');
  for (let i = 0; i <= 100; i += 10) {
    spinner2b.progress(i, 100);
    await sleep(150);
  }
  spinner2b.succeed('Uploaded');

  await sleep(300);

  // --- Elapsed Time ---
  console.log('\n--- Elapsed Time ---\n');

  const spinnerTime = new Spinner({ color: 'cyan', showTime: true });
  spinnerTime.start('Processing...');
  await sleep(2000);
  spinnerTime.succeed('Processed');

  await sleep(300);

  // --- Promise Wrapper ---
  console.log('\n--- Promise Wrapper ---\n');

  const spinner3 = new Spinner({ color: 'cyan', showTime: true });
  const result = await spinner3.promise(fetchData(), {
    text: 'Fetching data...',
    successText: 'Data fetched',
  });
  console.log(`  (got: ${JSON.stringify(result)})`);

  await sleep(300);

  // --- Log While Spinning ---
  console.log('\n--- Log While Spinning ---\n');

  const spinnerLog = new Spinner({ color: 'cyan' });
  spinnerLog.start('Installing packages...');
  await sleep(600);
  spinnerLog.log('  + lodash@4.17.21');
  await sleep(400);
  spinnerLog.log('  + express@4.18.2');
  await sleep(400);
  spinnerLog.log('  + typescript@5.3.0');
  await sleep(600);
  spinnerLog.succeed('Installed 3 packages');

  await sleep(300);

  // --- Spinner Groups ---
  console.log('\n--- Spinner Groups (concurrent) ---\n');

  const group = new SpinnerGroup();

  // Start multiple spinners
  group.add('api', 'Fetching from API...');
  group.add('db', 'Querying database...');
  group.add('cache', 'Warming cache...');

  // Complete them at different times
  await sleep(1000);
  group.succeed('cache', 'Cache warmed');

  await sleep(800);
  group.succeed('api', 'API data received');

  await sleep(600);
  group.succeed('db', 'Database query complete');

  await sleep(500);

  // Group with mixed results
  console.log('\n--- Spinner Group (mixed results) ---\n');

  const group2 = new SpinnerGroup();
  group2.add('build', 'Building project...');
  group2.add('lint', 'Running linter...');
  group2.add('test', 'Running tests...');

  await sleep(800);
  group2.succeed('build', 'Build complete');

  await sleep(600);
  group2.warn('lint', '3 warnings found');

  await sleep(800);
  group2.fail('test', '2 tests failed');

  await sleep(300);

  console.log('\nDemo complete!');
}

demo().catch(console.error);
