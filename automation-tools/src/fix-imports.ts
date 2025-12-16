import * as fs from 'fs-extra';
import * as path from 'path';

async function fixImports(): Promise<void> {
  console.log('\nFixing FHEVM imports in all contracts...\n');

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
      
      // Replace old imports with new ones
      const oldContent = content;
      
      // Fix fhevm imports to @fhevm/solidity
      content = content.replace(/import "fhevm\//g, 'import "@fhevm/solidity/');
      content = content.replace(/import 'fhevm\//g, "import '@fhevm/solidity/");
      
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
      content = content.replace(/import "fhevm\//g, 'import "@fhevm/solidity/');
      content = content.replace(/import 'fhevm\//g, "import '@fhevm/solidity/");
      
      if (content !== oldContent) {
        await fs.writeFile(filePath, content);
        console.log(`  [OK] base-template/contracts/${file}`);
        fixed++;
      }
    }
  }

  console.log(`\n[DONE] Fixed ${fixed} contract files\n`);
}

fixImports().catch(console.error);