import * as fs from 'fs-extra';
import * as path from 'path';

async function fixImports(): Promise<void> {
  console.log('\nReverting FHEVM imports to use fhevm package...\n');

  const examplesPath = path.join(__dirname, '../../examples');
  const examples = await fs.readdir(examplesPath);

  let fixed = 0;

  for (const example of examples) {
    const contractsPath = path.join(examplesPath, example, 'contracts');
    
    if (!await fs.pathExists(contractsPath)) continue;

    const files = await fs.readdir(contractsPath);
    
    for (const file of files) {
      if (!file.endsWith('.sol')) continue;
      
      const filePath = path.join(contractsPath, file);
      let content = await fs.readFile(filePath, 'utf-8');
      
      const oldContent = content;
      
      // Revert @fhevm/solidity back to fhevm
      content = content.replace(/import "@fhevm\/solidity\//g, 'import "fhevm/');
      content = content.replace(/import '@fhevm\/solidity\//g, "import 'fhevm/");
      
      if (content !== oldContent) {
        await fs.writeFile(filePath, content);
        console.log(`  [OK] ${example}/contracts/${file}`);
        fixed++;
      }
    }
  }

  // Also fix base-template
  const baseContractsPath = path.join(__dirname, '../../base-template/contracts');
  if (await fs.pathExists(baseContractsPath)) {
    const files = await fs.readdir(baseContractsPath);
    for (const file of files) {
      if (!file.endsWith('.sol')) continue;
      
      const filePath = path.join(baseContractsPath, file);
      let content = await fs.readFile(filePath, 'utf-8');
      
      const oldContent = content;
      content = content.replace(/import "@fhevm\/solidity\//g, 'import "fhevm/');
      content = content.replace(/import '@fhevm\/solidity\//g, "import 'fhevm/");
      
      if (content !== oldContent) {
        await fs.writeFile(filePath, content);
        console.log(`  [OK] base-template/contracts/${file}`);
        fixed++;
      }
    }
  }

  console.log(`\n[DONE] Reverted ${fixed} contract files\n`);
}

fixImports().catch(console.error);