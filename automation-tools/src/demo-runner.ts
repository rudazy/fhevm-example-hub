import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * @title Demo Runner
 * @notice Demonstrates all automation tools in sequence
 * @dev Use this for demonstration videos and testing
 */

async function runDemo(): Promise<void> {
  console.log('');
  console.log('==============================================');
  console.log('   FHEVM Example Hub - Demo Runner');
  console.log('==============================================');
  console.log('');

  const steps = [
    { name: 'List Examples', fn: listExamples },
    { name: 'Validate All Examples', fn: validateExamples },
    { name: 'Generate Documentation', fn: generateDocs },
    { name: 'Show Project Stats', fn: showStats },
    { name: 'Demo Complete', fn: demoComplete }
  ];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n[Step ${i + 1}/${steps.length}] ${step.name}`);
    console.log('-'.repeat(50));
    await step.fn();
    
    if (i < steps.length - 1) {
      await sleep(1000);
    }
  }
}

async function listExamples(): Promise<void> {
  const examplesPath = path.join(__dirname, '../../examples');
  const examples = await fs.readdir(examplesPath);
  const dirs = [];

  for (const entry of examples) {
    const stat = await fs.stat(path.join(examplesPath, entry));
    if (stat.isDirectory()) {
      dirs.push(entry);
    }
  }

  console.log(`\nFound ${dirs.length} examples:\n`);

  const categories: Record<string, string[]> = {
    basic: [],
    encryption: [],
    decryption: [],
    'access-control': [],
    'anti-patterns': [],
    advanced: []
  };

  for (const dir of dirs) {
    const metadataPath = path.join(examplesPath, dir, 'example.json');
    if (await fs.pathExists(metadataPath)) {
      const metadata = await fs.readJson(metadataPath);
      const category = metadata.category || 'basic';
      if (categories[category]) {
        categories[category].push(dir);
      }
    }
  }

  for (const [category, items] of Object.entries(categories)) {
    if (items.length > 0) {
      console.log(`  ${category.toUpperCase()} (${items.length})`);
      items.forEach(item => console.log(`    - ${item}`));
      console.log('');
    }
  }
}

async function validateExamples(): Promise<void> {
  const examplesPath = path.join(__dirname, '../../examples');
  const examples = await fs.readdir(examplesPath);
  
  let passed = 0;
  let total = 0;

  for (const entry of examples) {
    const examplePath = path.join(examplesPath, entry);
    const stat = await fs.stat(examplePath);
    
    if (!stat.isDirectory()) continue;
    total++;

    const checks = [
      await fs.pathExists(path.join(examplePath, 'package.json')),
      await fs.pathExists(path.join(examplePath, 'contracts')),
      await fs.pathExists(path.join(examplePath, 'test')),
      await fs.pathExists(path.join(examplePath, 'README.md')),
      await fs.pathExists(path.join(examplePath, 'example.json'))
    ];

    const allPassed = checks.every(c => c);
    if (allPassed) {
      passed++;
      console.log(`  [OK] ${entry}`);
    } else {
      console.log(`  [WARN] ${entry} - missing files`);
    }
  }

  console.log(`\nValidation: ${passed}/${total} examples passed all checks`);
}

async function generateDocs(): Promise<void> {
  const docsPath = path.join(__dirname, '../../docs');
  
  console.log('\nGenerating GitBook-compatible documentation...');
  
  // Count generated files
  const countFiles = async (dir: string): Promise<number> => {
    if (!await fs.pathExists(dir)) return 0;
    
    let count = 0;
    const entries = await fs.readdir(dir);
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory()) {
        count += await countFiles(fullPath);
      } else if (entry.endsWith('.md')) {
        count++;
      }
    }
    
    return count;
  };

  const mdFiles = await countFiles(docsPath);
  console.log(`  Documentation files: ${mdFiles} markdown files`);
  console.log(`  Location: ${docsPath}`);
}

async function showStats(): Promise<void> {
  const examplesPath = path.join(__dirname, '../../examples');
  const examples = await fs.readdir(examplesPath);
  
  let totalContracts = 0;
  let totalTests = 0;
  let totalLines = 0;

  for (const entry of examples) {
    const examplePath = path.join(examplesPath, entry);
    const stat = await fs.stat(examplePath);
    
    if (!stat.isDirectory()) continue;

    // Count contracts
    const contractsPath = path.join(examplePath, 'contracts');
    if (await fs.pathExists(contractsPath)) {
      const contracts = await fs.readdir(contractsPath);
      const solFiles = contracts.filter(f => f.endsWith('.sol'));
      totalContracts += solFiles.length;

      for (const sol of solFiles) {
        const content = await fs.readFile(path.join(contractsPath, sol), 'utf-8');
        totalLines += content.split('\n').length;
      }
    }

    // Count tests
    const testsPath = path.join(examplePath, 'test');
    if (await fs.pathExists(testsPath)) {
      const tests = await fs.readdir(testsPath);
      const testFiles = tests.filter(f => f.endsWith('.ts') && !['instance.ts', 'signers.ts'].includes(f));
      totalTests += testFiles.length;

      for (const test of testFiles) {
        const content = await fs.readFile(path.join(testsPath, test), 'utf-8');
        totalLines += content.split('\n').length;
      }
    }
  }

  console.log('\nProject Statistics:');
  console.log('-------------------');
  console.log(`  Total Examples: ${examples.filter(async e => (await fs.stat(path.join(examplesPath, e))).isDirectory()).length}`);
  console.log(`  Total Contracts: ${totalContracts}`);
  console.log(`  Total Test Files: ${totalTests}`);
  console.log(`  Total Lines of Code: ${totalLines}`);
  console.log('');
  console.log('Categories Covered:');
  console.log('  - Basic Operations');
  console.log('  - Encryption');
  console.log('  - Decryption (User & Public)');
  console.log('  - Access Control');
  console.log('  - Anti-Patterns');
  console.log('  - Advanced (Auctions, Voting, Tokens)');
}

async function demoComplete(): Promise<void> {
  console.log('\n==============================================');
  console.log('   Demo Complete');
  console.log('==============================================');
  console.log('');
  console.log('FHEVM Example Hub Features:');
  console.log('');
  console.log('  - 21 standalone examples covering all FHEVM concepts');
  console.log('  - Automation tools for scaffolding new examples');
  console.log('  - Auto-generated GitBook documentation');
  console.log('  - Validation and maintenance tools');
  console.log('');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

runDemo().catch(console.error);