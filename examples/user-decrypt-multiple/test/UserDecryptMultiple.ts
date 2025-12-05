import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("UserDecryptMultiple", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("UserDecryptMultiple");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Multiple Value Decryption", function () {
    it("should store multiple encrypted stats", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const inputHealth = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputHealth.add64(100);
      const encHealth = await inputHealth.encrypt();

      const inputAttack = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputAttack.add64(50);
      const encAttack = await inputAttack.encrypt();

      const inputDefense = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputDefense.add64(30);
      const encDefense = await inputDefense.encrypt();

      const tx = await contract.storeStats(
        encHealth.handles[0], encHealth.inputProof,
        encAttack.handles[0], encAttack.inputProof,
        encDefense.handles[0], encDefense.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "StatsStored");
    });

    it("should request decryption of all stats", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Store stats first
      const inputHealth = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputHealth.add64(100);
      const encHealth = await inputHealth.encrypt();

      const inputAttack = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputAttack.add64(50);
      const encAttack = await inputAttack.encrypt();

      const inputDefense = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputDefense.add64(30);
      const encDefense = await inputDefense.encrypt();

      await (await contract.storeStats(
        encHealth.handles[0], encHealth.inputProof,
        encAttack.handles[0], encAttack.inputProof,
        encDefense.handles[0], encDefense.inputProof
      )).wait();

      // Request decryption
      const tx = await contract.requestStatsDecryption();
      await tx.wait();

      await expect(tx).to.emit(contract, "DecryptionRequested");
    });
  });
});