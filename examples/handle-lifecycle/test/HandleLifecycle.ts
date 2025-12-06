import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("HandleLifecycle", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("HandleLifecycle");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Handle Lifecycle Stages", function () {
    it("Stage 1: should create handle from encrypted input", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      const tx = await contract.stage1_createFromInput(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "HandleCreated");
      
      const [h1Init, , ] = await contract.getHandleStatus();
      expect(h1Init).to.equal(true);
    });

    it("Stage 2: should create handle from plaintext", async function () {
      const tx = await contract.stage2_createFromPlaintext(50);
      await tx.wait();

      await expect(tx).to.emit(contract, "HandleCreated");
      
      const [, h2Init, ] = await contract.getHandleStatus();
      expect(h2Init).to.equal(true);
    });

    it("Stage 3: should create new handle from operation", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Setup: run stages 1 and 2
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();
      await (await contract.stage1_createFromInput(encrypted.handles[0], encrypted.inputProof)).wait();
      await (await contract.stage2_createFromPlaintext(50)).wait();

      // Get handle IDs before operation
      const [id1Before, id2Before, ] = await contract.getHandleIds();

      // Stage 3: operation creates new handle
      const tx = await contract.stage3_operationCreatesNewHandle();
      await tx.wait();

      await expect(tx).to.emit(contract, "OperationPerformed");

      // Verify all three handles exist and are different
      const [id1After, id2After, id3] = await contract.getHandleIds();
      expect(id1After).to.equal(id1Before); // Original unchanged
      expect(id2After).to.equal(id2Before); // Original unchanged
      expect(id3).to.not.equal(id1After);   // New handle
      expect(id3).to.not.equal(id2After);   // New handle
    });

    it("Stage 4: should overwrite handle", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Create initial handle
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input1.add64(100);
      const enc1 = await input1.encrypt();
      await (await contract.stage1_createFromInput(enc1.handles[0], enc1.inputProof)).wait();

      const [oldId, , ] = await contract.getHandleIds();

      // Overwrite
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input2.add64(999);
      const enc2 = await input2.encrypt();
      await (await contract.stage4_overwriteHandle(enc2.handles[0], enc2.inputProof)).wait();

      const [newId, , ] = await contract.getHandleIds();
      expect(newId).to.not.equal(oldId);
    });

    it("Stage 5: should handle chained operations", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(10);
      const encrypted = await input.encrypt();

      const tx = await contract.stage5_chainedOperations(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "OperationPerformed");
      // Result: ((10 + 10) * 2) - 5 = 35
    });
  });
});