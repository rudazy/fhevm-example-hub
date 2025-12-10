import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * @title Validate All Examples
 * @notice Validates all examples by checking structure, compiling contracts, and running tests
 * @dev This tool ensures all examples are working correctly
 */

interface ValidationResult {
  example: string;
  hasPackageJson: boolean;
  hasContracts: boolean;
  hasTests: boolean;
  hasReadme: boolean;
  hasExampleJson: boolean;
  compiles: boolean | null;
  testsPass: boolean | null;
  errors: string[];
}

interface ValidateOptions {
  skipCompile: boolean;
  skipTests: boolean;
  verbose: boolean;
}

async function validateAllExamples(options: ValidateOptions): Promise<void> {
  console.log('\nFHEVM Example Hub - Validator\n');
  console.log('==============================\n');

  const examplesPath = path.join(__dirname, '../../examples');
  const examples = await getExampleDirectories(examplesPath);

  if (examples.length === 0) {
    console.log('No examples found.');
    return;
  }

  console.log(`Found ${examples.length} examples to validate.\n`);

  const results: ValidationResult[] = [];

  for (const example of examples) {
    console.log(`Validating: ${example}...`);
    const result = await validateExample(examplesPath, example, options);
    results.push(result);
    
    const status = getStatusIcon(result);
    console.log(`  ${status}\n`);
  }

  printSummary(results);
}

async function getExampleDirectories(examplesPath: string): Promise<string[]> {
  if (!await fs.pathExists(examplesPath)) {
    return [];
  }

  const entries = await fs.readdir(examplesPath);
  const dirs: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(examplesPath, entry);
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
      dirs.push(entry);
    }
  }

  return dirs.sort();
}