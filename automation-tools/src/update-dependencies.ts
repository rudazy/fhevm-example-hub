import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

/**
 * @title Update Dependencies
 * @notice Updates all examples to use the latest FHEVM dependencies
 * @dev This tool helps maintain all examples when FHEVM releases new versions
 */

interface UpdateOptions {
  dryRun: boolean;
  verbose: boolean;
}

async function updateDependencies(options: UpdateOptions = { dryRun: false, verbose: false }): Promise<void> {
  console.log('\nFHEVM Example Hub - Dependency Updater\n');
  console.log('======================================\n');

  if (options.dryRun) {
    console.log('[DRY RUN] No changes will be made\n');
  }

  const examplesPath = path.join(__dirname, '../../examples');
  const baseTemplatePath = path.join(__dirname, '../../base-template');

  // Get all example directories
  const examples = await getExampleDirectories(examplesPath);

  if (examples.length === 0) {
    console.log('No examples found.');
    return;
  }

  console.log(`Found ${examples.length} examples to update.\n`);

  // First, update the base template
  console.log('Step 1: Checking base template...');
  const basePackageJson = path.join(baseTemplatePath, 'package.json');
  
  if (await fs.pathExists(basePackageJson)) {
    const basePkg = await fs.readJson(basePackageJson);
    console.log(`  Base template version: ${basePkg.version || 'N/A'}`);
    console.log(`  FHEVM dependency: ${basePkg.dependencies?.fhevm || basePkg.devDependencies?.fhevm || 'Not found'}`);
  }

  console.log('\nStep 2: Updating examples...\n');

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const example of examples) {
    const examplePath = path.join(examplesPath, example);
    const packageJsonPath = path.join(examplePath, 'package.json');

    if (!await fs.pathExists(packageJsonPath)) {
      console.log(`  [SKIP] ${example} - No package.json found`);
      skipped++;
      continue;
    }

    try {
      console.log(`  Updating: ${example}...`);

      if (!options.dryRun) {
        // Read current package.json
        const pkg = await fs.readJson(packageJsonPath);

        // Update to latest FHEVM versions
        if (pkg.dependencies) {
          if (pkg.dependencies['fhevm']) {
            pkg.dependencies['fhevm'] = 'latest';
          }
          if (pkg.dependencies['@fhevm/solidity']) {
            pkg.dependencies['@fhevm/solidity'] = 'latest';
          }
        }

        if (pkg.devDependencies) {
          if (pkg.devDependencies['fhevm']) {
            pkg.devDependencies['fhevm'] = 'latest';
          }
          if (pkg.devDependencies['@fhevm/solidity']) {
            pkg.devDependencies['@fhevm/solidity'] = 'latest';
          }
        }

        // Write updated package.json
        await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });
      }

      console.log(`    [OK] Updated successfully`);
      updated++;

    } catch (error) {
      console.log(`    [ERROR] Failed to update: ${error}`);
      errors++;
    }
  }

  console.log('\n======================================');
  console.log('Summary:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log('======================================\n');

  if (!options.dryRun && updated > 0) {
    console.log('Next steps:');
    console.log('  1. Run "npm install" in each updated example');
    console.log('  2. Run "npm run compile" to verify contracts compile');
    console.log('  3. Run "npm run test" to verify tests pass');
    console.log('  4. Commit changes to git\n');
  }
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

// Parse command line arguments
const args = process.argv.slice(2);
const options: UpdateOptions = {
  dryRun: args.includes('--dry-run'),
  verbose: args.includes('--verbose')
};

updateDependencies(options).catch(console.error);