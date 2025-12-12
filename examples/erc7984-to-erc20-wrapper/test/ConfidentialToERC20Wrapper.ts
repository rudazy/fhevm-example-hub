import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialToERC20Wrapper", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialToERC20Wrapper");
    contract = await Factory.connect(signers.alice).deploy();
    await contract.waitForDeployment();
  });

  describe("Wrap and Unwrap", function () {
    it("should mint public tokens", async function () {
      const signers = await getSigners();
      
      await contract.mintPublic(signers.alice.address, 1000);
      
      expect(await contract.balanceOf(signers.alice.address)).to.equal(1000);
    });

    it("should wrap public tokens to encrypted", async function () {
      const signers = await getSigners();
      
      // Mint public tokens first
      await contract.mintPublic(signers.alice.address, 1000);
      
      // Wrap them
      const tx = await contract.wrap(500);
      await tx.wait();
      
      await expect(tx).to.emit(contract, "Wrap");
      expect(await contract.balanceOf(signers.alice.address)).to.equal(500);
    });

    it("should fail wrap with insufficient balance", async function () {
      await expect(contract.wrap(100)).to.be.revertedWith("Insufficient public balance");
    });

    it("should request unwrap", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();
      
      // Mint and wrap first
      await contract.mintPublic(signers.alice.address, 1000);
      await contract.wrap(500);
      
      // Request unwrap
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(200);
      const encrypted = await input.encrypt();
      
      const tx = await contract.requestUnwrap(encrypted.handles[0], encrypted.inputProof);
      await tx.wait();
      
      await expect(tx).to.emit(contract, "UnwrapRequested");
    });

    it("should transfer public tokens", async function () {
      const signers = await getSigners();
      
      await contract.mintPublic(signers.alice.address, 1000);
      
      const tx = await contract.transfer(signers.bob.address, 300);
      await tx.wait();
      
      expect(await contract.balanceOf(signers.alice.address)).to.equal(700);
      expect(await contract.balanceOf(signers.bob.address)).to.equal(300);
    });
  });
});