import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialVesting", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialVesting");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Confidential Vesting", function () {
    it("should create vesting schedule", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(10000);
      const encrypted = await input.encrypt();

      // 1 year vesting
      const tx = await contract.createVesting(
        signers.bob.address,
        encrypted.handles[0],
        encrypted.inputProof,
        365 * 24 * 60 * 60
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "VestingCreated");

      const [startTime, duration, exists] = await contract.connect(signers.bob).getMyVesting();
      expect(exists).to.equal(true);
      expect(duration).to.equal(365 * 24 * 60 * 60);
    });

    it("should prevent duplicate vesting", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input1 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input1.add64(10000);
      const enc1 = await input1.encrypt();

      await (await contract.createVesting(
        signers.bob.address,
        enc1.handles[0],
        enc1.inputProof,
        3600
      )).wait();

      const input2 = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input2.add64(5000);
      const enc2 = await input2.encrypt();

      await expect(
        contract.createVesting(signers.bob.address, enc2.handles[0], enc2.inputProof, 3600)
      ).to.be.revertedWith("Vesting already exists");
    });

    it("should allow beneficiary to view their vesting", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(50000);
      const encrypted = await input.encrypt();

      await (await contract.createVesting(
        signers.bob.address,
        encrypted.handles[0],
        encrypted.inputProof,
        7200
      )).wait();

      const totalAmount = await contract.connect(signers.bob).getMyTotalAmount();
      expect(totalAmount).to.not.equal(0n);
    });

    it("should release vested tokens", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(10000);
      const encrypted = await input.encrypt();

      // Short vesting for testing
      await (await contract.createVesting(
        signers.bob.address,
        encrypted.handles[0],
        encrypted.inputProof,
        60
      )).wait();

      // Release tokens
      const tx = await contract.connect(signers.bob).release();
      await tx.wait();

      await expect(tx).to.emit(contract, "TokensReleased");
    });

    it("should fail release without vesting", async function () {
      const signers = await getSigners();

      await expect(
        contract.connect(signers.bob).release()
      ).to.be.revertedWith("No vesting schedule");
    });
  });
});