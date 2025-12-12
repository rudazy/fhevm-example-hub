import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialNFT", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialNFT");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Confidential NFT", function () {
    it("should mint NFT with encrypted attributes", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const inputRarity = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputRarity.add64(85);
      const encRarity = await inputRarity.encrypt();

      const inputPower = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputPower.add64(150);
      const encPower = await inputPower.encrypt();

      const inputSecret = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputSecret.add64(123456);
      const encSecret = await inputSecret.encrypt();

      const tx = await contract.mint(
        signers.bob.address,
        encRarity.handles[0], encRarity.inputProof,
        encPower.handles[0], encPower.inputProof,
        encSecret.handles[0], encSecret.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "Mint");
      expect(await contract.ownerOf(0)).to.equal(signers.bob.address);
      expect(await contract.balanceOf(signers.bob.address)).to.equal(1);
    });

    it("should transfer NFT", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint first
      const inputRarity = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputRarity.add64(50);
      const encRarity = await inputRarity.encrypt();

      const inputPower = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputPower.add64(100);
      const encPower = await inputPower.encrypt();

      const inputSecret = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputSecret.add64(999);
      const encSecret = await inputSecret.encrypt();

      await contract.mint(
        signers.alice.address,
        encRarity.handles[0], encRarity.inputProof,
        encPower.handles[0], encPower.inputProof,
        encSecret.handles[0], encSecret.inputProof
      );

      // Transfer
      const tx = await contract.transfer(signers.bob.address, 0);
      await tx.wait();

      await expect(tx).to.emit(contract, "Transfer");
      expect(await contract.ownerOf(0)).to.equal(signers.bob.address);
    });

    it("should prevent non-owner from viewing attributes", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint to Bob
      const inputRarity = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputRarity.add64(75);
      const encRarity = await inputRarity.encrypt();

      const inputPower = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputPower.add64(200);
      const encPower = await inputPower.encrypt();

      const inputSecret = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputSecret.add64(555);
      const encSecret = await inputSecret.encrypt();

      await contract.mint(
        signers.bob.address,
        encRarity.handles[0], encRarity.inputProof,
        encPower.handles[0], encPower.inputProof,
        encSecret.handles[0], encSecret.inputProof
      );

      // Alice (not owner) tries to view
      await expect(contract.getRarity(0)).to.be.revertedWith("Not owner");
    });

    it("should allow owner to view encrypted attributes", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint to Alice
      const inputRarity = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputRarity.add64(90);
      const encRarity = await inputRarity.encrypt();

      const inputPower = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputPower.add64(300);
      const encPower = await inputPower.encrypt();

      const inputSecret = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      inputSecret.add64(777);
      const encSecret = await inputSecret.encrypt();

      await contract.mint(
        signers.alice.address,
        encRarity.handles[0], encRarity.inputProof,
        encPower.handles[0], encPower.inputProof,
        encSecret.handles[0], encSecret.inputProof
      );

      // Alice can view
      const rarity = await contract.getRarity(0);
      expect(rarity).to.not.equal(0n);
    });
  });
});