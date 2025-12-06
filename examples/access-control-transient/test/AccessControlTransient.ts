import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("AccessControlTransient", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("AccessControlTransient");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Transient Access", function () {
    it("should deposit encrypted tokens", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(1000);
      const encrypted = await input.encrypt();

      const tx = await contract.deposit(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();

      await expect(tx).to.emit(contract, "Deposit");
      expect(await contract.hasBalance()).to.equal(true);
    });

    it("should transfer with transient access", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Alice deposits
      const depositInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      depositInput.add64(1000);
      const depositEnc = await depositInput.encrypt();
      await (await contract.deposit(depositEnc.handles[0], depositEnc.inputProof)).wait();

      // Alice transfers to Bob
      const transferInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      transferInput.add64(300);
      const transferEnc = await transferInput.encrypt();

      const tx = await contract.transfer(
        signers.bob.address,
        transferEnc.handles[0],
        transferEnc.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "TransferProcessed");
    });

    it("should fail transfer to zero address", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const depositInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      depositInput.add64(500);
      const depositEnc = await depositInput.encrypt();
      await (await contract.deposit(depositEnc.handles[0], depositEnc.inputProof)).wait();

      const transferInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      transferInput.add64(100);
      const transferEnc = await transferInput.encrypt();

      await expect(
        contract.transfer(ethers.ZeroAddress, transferEnc.handles[0], transferEnc.inputProof)
      ).to.be.revertedWith("Invalid recipient");
    });
  });
});