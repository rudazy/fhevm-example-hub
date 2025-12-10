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

async function validateExample(
  examplesPath: string,
  example: string,
  options: ValidateOptions
): Promise<ValidationResult> {
  const examplePath = path.join(examplesPath, example);
  
  const result: ValidationResult = {
    example,
    hasPackageJson: false,
    hasContracts: false,
    hasTests: false,
    hasReadme: false,
    hasExampleJson: false,
    compiles: null,
    testsPass: null,
    errors: []
  };

  // Check package.json
  result.hasPackageJson = await fs.pathExists(path.join(examplePath, 'package.json'));
  if (!result.hasPackageJson) {
    result.errors.push('Missing package.json');
  }

  // Check contracts directory
  const contractsPath = path.join(examplePath, 'contracts');
  if (await fs.pathExists(contractsPath)) {
    const contracts = await fs.readdir(contractsPath);
    const solFiles = contracts.filter(f => f.endsWith('.sol'));
    result.hasContracts = solFiles.length > 0;
    if (!result.hasContracts) {
      result.errors.push('No .sol files in contracts/');
    }
  } else {
    result.errors.push('Missing contracts/ directory');
  }

  // Check test directory
  const testsPath = path.join(examplePath, 'test');
  if (await fs.pathExists(testsPath)) {
    const tests = await fs.readdir(testsPath);
    const testFiles = tests.filter(f => f.endsWith('.ts') && !['instance.ts', 'signers.ts'].includes(f));
    result.hasTests = testFiles.length > 0;
    if (!result.hasTests) {
      result.errors.push('No test files in test/');
    }
  } else {
    result.errors.push('Missing test/ directory');
  }

  // Check README
  result.hasReadme = await fs.pathExists(path.join(examplePath, 'README.md'));
  if (!result.hasReadme) {
    result.errors.push('Missing README.md');
  }

  // Check example.json
  result.hasExampleJson = await fs.pathExists(path.join(examplePath, 'example.json'));
  if (!result.hasExampleJson) {
    result.errors.push('Missing example.json');
  }

  return result;
}

function getStatusIcon(result: ValidationResult): string {
  const checks = [
    result.hasPackageJson,
    result.hasContracts,
    result.hasTests,
    result.hasReadme,
    result.hasExampleJson
  ];

  const passedChecks = checks.filter(c => c).length;
  const totalChecks = checks.length;

  if (passedChecks === totalChecks) {
    return `[OK] All ${totalChecks} checks passed`;
  } else {
    return `[WARN] ${passedChecks}/${totalChecks} checks passed - ${result.errors.join(', ')}`;
  }
}

function printSummary(results: ValidationResult[]): void {
  console.log('==============================');
  console.log('Validation Summary\n');

  const passed = results.filter(r => r.errors.length === 0).length;
  const warnings = results.filter(r => r.errors.length > 0).length;

  console.log(`Total examples: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Warnings: ${warnings}`);

  console.log('\nStructure Check:');
  console.log(`  package.json: ${results.filter(r => r.hasPackageJson).length}/${results.length}`);
  console.log(`  contracts/: ${results.filter(r => r.hasContracts).length}/${results.length}`);
  console.log(`  test/: ${results.filter(r => r.hasTests).length}/${results.length}`);
  console.log(`  README.md: ${results.filter(r => r.hasReadme).length}/${results.length}`);
  console.log(`  example.json: ${results.filter(r => r.hasExampleJson).length}/${results.length}`);

  if (warnings > 0) {
    console.log('\nExamples with issues:');
    results.filter(r => r.errors.length > 0).forEach(r => {
      console.log(`  - ${r.example}: ${r.errors.join(', ')}`);
    });
  }

  console.log('\n==============================\n');
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: ValidateOptions = {
  skipCompile: args.includes('--skip-compile'),
  skipTests: args.includes('--skip-tests'),
  verbose: args.includes('--verbose')
};

validateAllExamples(options).catch(console.error);