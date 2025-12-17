import * as fs from 'fs-extra';
import * as path from 'path';

async function fixContracts(): Promise<void> {
  console.log('\nFixing contracts for fhevm v0.5.x API...\n');

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
      
      // Remove config imports
      content = content.replace(/import "fhevm\/config\/ZamaFHEVMConfig\.sol";\n?/g, '');
      content = content.replace(/import "fhevm\/config\/ZamaGatewayConfig\.sol";\n?/g, '');
      
      // Add Gateway import if GatewayCaller is used
      if (content.includes('GatewayCaller') && !content.includes('gateway/lib/Gateway.sol')) {
        content = content.replace(
          'import "fhevm/gateway/GatewayCaller.sol";',
          'import "fhevm/gateway/GatewayCaller.sol";\nimport "fhevm/gateway/lib/Gateway.sol";'
        );
      }
      
      // Fix contract inheritance - remove config classes
      content = content.replace(/is\s+SepoliaZamaFHEVMConfig,\s*SepoliaZamaGatewayConfig,\s*GatewayCaller/g, 'is GatewayCaller');
      content = content.replace(/is\s+SepoliaZamaFHEVMConfig,\s*GatewayCaller/g, 'is GatewayCaller');
      content = content.replace(/is\s+SepoliaZamaFHEVMConfig,\s*SepoliaZamaGatewayConfig/g, '');
      content = content.replace(/is\s+SepoliaZamaFHEVMConfig\s*\{/g, '{');
      content = content.replace(/,\s*SepoliaZamaFHEVMConfig/g, '');
      content = content.replace(/SepoliaZamaFHEVMConfig,\s*/g, '');
      content = content.replace(/,\s*SepoliaZamaGatewayConfig/g, '');
      content = content.replace(/SepoliaZamaGatewayConfig,\s*/g, '');
      
      if (content !== oldContent) {
        await fs.writeFile(filePath, content);
        console.log(`  [OK] ${example}/contracts/${file}`);
        fixed++;
      }
    }
  }

  console.log(`\n[DONE] Fixed ${fixed} contract files\n`);
}

fixContracts().catch(console.error);