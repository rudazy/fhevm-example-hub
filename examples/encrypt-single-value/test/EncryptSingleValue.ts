import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EncryptSingleValue", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("EncryptSingleValue");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Storing Secrets", function () {
    it("should store an encrypted secret", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Create encrypted input
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(12345);
      const encrypted = await input.encrypt();

      // Store the secret
      const tx = await contract.storeSecret(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "SecretStored");
    });

    it("should report hasSecret correctly", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Initially no secret
      expect(await contract.hasSecret()).to.equal(false);

      // Store a secret
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(99999);
      const encrypted = await input.encrypt();

      await (await contract.storeSecret(
        encrypted.handles[0],
        encrypted.inputProof
      )).wait();

      // Now has secret
      expect(await contract.hasSecret()).to.equal(true);
    });

    it("should allow different users to store different secrets", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Alice stores a secret
      const inputAlice = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputAlice.add64(111);
      const encryptedAlice = await inputAlice.encrypt();
      await (await contract.storeSecret(
        encryptedAlice.handles[0],
        encryptedAlice.inputProof
      )).wait();

      // Bob stores a different secret
      const inputBob = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      inputBob.add64(222);
      const encryptedBob = await inputBob.encrypt();
      await (await contract.connect(signers.bob).storeSecret(
        encryptedBob.handles[0],
        encryptedBob.inputProof
      )).wait();

      // Both should have secrets
      expect(await contract.hasSecret()).to.equal(true);
      expect(await contract.connect(signers.bob).hasSecret()).to.equal(true);
    });
  });
});