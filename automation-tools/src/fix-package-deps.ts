import * as fs from 'fs-extra';
import * as path from 'path';

async function fixPackageDeps(): Promise<void> {
  console.log('\nFixing package.json dependencies to use fhevm...\n');

  const examplesPath = path.join(__dirname, '../../examples');
  const examples = await fs.readdir(examplesPath);

  let fixed = 0;

  for (const example of examples) {
    const packageJsonPath = path.join(examplesPath, example, 'package.json');
    
    if (!await fs.pathExists(packageJsonPath)) continue;

    const pkg = await fs.readJson(packageJsonPath);
    let changed = false;

    // Fix dependencies
    if (pkg.dependencies) {
      if (pkg.dependencies['@fhevm/solidity']) {
        delete pkg.dependencies['@fhevm/solidity'];
        pkg.dependencies['fhevm'] = '^0.5.4';
        changed = true;
      }
    }

    if (changed) {
      await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });
      console.log(`  [OK] ${example}`);
      fixed++;
    }
  }

  console.log(`\n[DONE] Fixed ${fixed} package.json files\n`);
}

fixPackageDeps().catch(console.error);