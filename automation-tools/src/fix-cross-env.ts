import * as fs from 'fs-extra';
import * as path from 'path';

async function fixCrossEnv(): Promise<void> {
  console.log('\nFixing cross-env dependency in all examples...\n');

  const examplesPath = path.join(__dirname, '../../examples');
  const examples = await fs.readdir(examplesPath);

  let fixed = 0;

  for (const example of examples) {
    const examplePath = path.join(examplesPath, example);
    const stat = await fs.stat(examplePath);
    
    if (!stat.isDirectory()) continue;

    const packageJsonPath = path.join(examplePath, 'package.json');
    
    if (!await fs.pathExists(packageJsonPath)) continue;

    const pkg = await fs.readJson(packageJsonPath);

    // Remove cross-env from devDependencies
    if (pkg.devDependencies && pkg.devDependencies['cross-env']) {
      delete pkg.devDependencies['cross-env'];
    }

    // Fix scripts
    if (pkg.scripts) {
      if (pkg.scripts.compile) {
        pkg.scripts.compile = 'hardhat compile';
      }
      if (pkg.scripts.coverage) {
        pkg.scripts.coverage = 'hardhat coverage --solcoverjs ./.solcover.js --temp artifacts --testfiles "test/**/*.ts" && npm run typechain';
      }
      if (pkg.scripts.typechain) {
        pkg.scripts.typechain = 'hardhat typechain';
      }
    }

    await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });
    console.log(`  [OK] ${example}`);
    fixed++;
  }

  console.log(`\n[DONE] Fixed ${fixed} examples\n`);
}

fixCrossEnv().catch(console.error);