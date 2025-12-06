import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("EncryptedLottery", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("EncryptedLottery");
    // 0.01 ETH ticket price, 1 hour duration
    contract = await Factory.connect(signers.alice).deploy(
      ethers.parseEther("0.01"),
      3600
    );
    await contract.waitForDeployment();
  });

  describe("Encrypted Lottery", function () {
    it("should allow ticket purchase with encrypted number", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      const tx = await contract.connect(signers.bob).buyTicket(
        encrypted.handles[0],
        encrypted.inputProof,
        { value: ethers.parseEther("0.01") }
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "TicketPurchased");
      expect(await contract.hasTicket(signers.bob.address)).to.equal(true);
    });

    it("should reject insufficient payment", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      await expect(
        contract.connect(signers.bob).buyTicket(
          encrypted.handles[0],
          encrypted.inputProof,
          { value: ethers.parseEther("0.001") }
        )
      ).to.be.revertedWith("Insufficient payment");
    });

    it("should prevent double ticket purchase", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // First ticket
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input1.add64(42);
      const enc1 = await input1.encrypt();
      await (await contract.connect(signers.bob).buyTicket(
        enc1.handles[0],
        enc1.inputProof,
        { value: ethers.parseEther("0.01") }
      )).wait();

      // Second ticket should fail
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input2.add64(77);
      const enc2 = await input2.encrypt();

      await expect(
        contract.connect(signers.bob).buyTicket(
          enc2.handles[0],
          enc2.inputProof,
          { value: ethers.parseEther("0.01") }
        )
      ).to.be.revertedWith("Already has ticket");
    });

    it("should track prize pool", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      await (await contract.connect(signers.bob).buyTicket(
        encrypted.handles[0],
        encrypted.inputProof,
        { value: ethers.parseEther("0.01") }
      )).wait();

      const prizePool = await contract.getPrizePool();
      expect(prizePool).to.equal(ethers.parseEther("0.01"));
    });

    it("should allow viewing own ticket", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(42);
      const encrypted = await input.encrypt();

      await (await contract.connect(signers.bob).buyTicket(
        encrypted.handles[0],
        encrypted.inputProof,
        { value: ethers.parseEther("0.01") }
      )).wait();

      const ticket = await contract.connect(signers.bob).getMyTicket();
      expect(ticket).to.not.equal(0n);
    });
  });
});