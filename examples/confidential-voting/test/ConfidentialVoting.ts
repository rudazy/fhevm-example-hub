import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialVoting", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialVoting");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Confidential Voting", function () {
    it("should create a proposal", async function () {
      const tx = await contract.createProposal("Should we adopt FHE?");
      await tx.wait();

      await expect(tx).to.emit(contract, "ProposalCreated");
      expect(await contract.proposalCount()).to.equal(1);
    });

    it("should accept encrypted votes", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Create proposal
      await (await contract.createProposal("Test Proposal")).wait();

      // Bob votes yes (1)
      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(1);
      const encrypted = await input.encrypt();

      const tx = await contract.connect(signers.bob).vote(
        0,
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "VoteCast");
      expect(await contract.hasVoted(0, signers.bob.address)).to.equal(true);
    });

    it("should prevent double voting", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      await (await contract.createProposal("Test Proposal")).wait();

      // First vote
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input1.add64(1);
      const enc1 = await input1.encrypt();
      await (await contract.connect(signers.bob).vote(0, enc1.handles[0], enc1.inputProof)).wait();

      // Second vote should fail
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input2.add64(0);
      const enc2 = await input2.encrypt();

      await expect(
        contract.connect(signers.bob).vote(0, enc2.handles[0], enc2.inputProof)
      ).to.be.revertedWith("Already voted");
    });

    it("should allow multiple voters", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      await (await contract.createProposal("Test Proposal")).wait();

      // Bob votes yes
      const inputBob = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      inputBob.add64(1);
      const encBob = await inputBob.encrypt();
      await (await contract.connect(signers.bob).vote(0, encBob.handles[0], encBob.inputProof)).wait();

      // Carol votes no
      const inputCarol = fhevm.createEncryptedInput(contractAddress, signers.carol.address);
      inputCarol.add64(0);
      const encCarol = await inputCarol.encrypt();
      await (await contract.connect(signers.carol).vote(0, encCarol.handles[0], encCarol.inputProof)).wait();

      expect(await contract.hasVoted(0, signers.bob.address)).to.equal(true);
      expect(await contract.hasVoted(0, signers.carol.address)).to.equal(true);
    });

    it("should close voting", async function () {
      const tx = await contract.closeVoting();
      await tx.wait();

      await expect(tx).to.emit(contract, "VotingClosed");
      expect(await contract.votingOpen()).to.equal(false);
    });

    it("should prevent voting after close", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      await (await contract.createProposal("Test")).wait();
      await (await contract.closeVoting()).wait();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(1);
      const encrypted = await input.encrypt();

      await expect(
        contract.connect(signers.bob).vote(0, encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Voting is closed");
    });
  });
});