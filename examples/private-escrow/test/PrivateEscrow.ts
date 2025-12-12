import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("PrivateEscrow", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("PrivateEscrow");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Private Escrow", function () {
    it("should create escrow", async function () {
      const signers = await getSigners();
      
      const tx = await contract.createEscrow(signers.bob.address, signers.carol.address);
      await tx.wait();

      await expect(tx).to.emit(contract, "EscrowCreated");
      
      const [buyer, seller, arbiter, state] = await contract.getEscrow(0);
      expect(buyer).to.equal(signers.alice.address);
      expect(seller).to.equal(signers.bob.address);
      expect(arbiter).to.equal(signers.carol.address);
      expect(state).to.equal(0); // Created
    });

    it("should fund escrow with encrypted amount", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(1000);
      const encrypted = await input.encrypt();
      
      const tx = await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      await tx.wait();

      await expect(tx).to.emit(contract, "EscrowFunded");
      
      const [,,,state] = await contract.getEscrow(0);
      expect(state).to.equal(1); // Funded
    });

    it("should release escrow", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(500);
      const encrypted = await input.encrypt();
      await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      
      const tx = await contract.release(0);
      await tx.wait();

      await expect(tx).to.emit(contract, "EscrowReleased");
      
      const [,,,state] = await contract.getEscrow(0);
      expect(state).to.equal(2); // Released
    });

    it("should raise dispute", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(750);
      const encrypted = await input.encrypt();
      await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      
      const tx = await contract.raiseDispute(0);
      await tx.wait();

      await expect(tx).to.emit(contract, "DisputeRaised");
      
      const [,,,state] = await contract.getEscrow(0);
      expect(state).to.equal(4); // Disputed
    });

    it("should allow arbiter to resolve dispute", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(250);
      const encrypted = await input.encrypt();
      await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      await contract.raiseDispute(0);
      
      // Carol (arbiter) resolves
      const tx = await contract.connect(signers.carol).resolveDispute(0, true);
      await tx.wait();

      await expect(tx).to.emit(contract, "EscrowReleased");
    });

    it("should prevent unauthorized amount viewing", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      await contract.createEscrow(signers.bob.address, signers.carol.address);
      
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();
      await contract.fundEscrow(0, encrypted.handles[0], encrypted.inputProof);
      
      // Dave (not a party) tries to view
      await expect(
        contract.connect(signers.dave).getAmount(0)
      ).to.be.revertedWith("Not authorized");
    });
  });
});