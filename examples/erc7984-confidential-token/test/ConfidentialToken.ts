import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("ConfidentialToken", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("ConfidentialToken");
    contract = await Factory.connect(signers.alice).deploy("Confidential Token", "CTKN");
    await contract.waitForDeployment();
  });

  describe("ERC7984 Confidential Token", function () {
    it("should have correct name and symbol", async function () {
      expect(await contract.name()).to.equal("Confidential Token");
      expect(await contract.symbol()).to.equal("CTKN");
    });

    it("should mint tokens", async function () {
      const signers = await getSigners();
      
      const tx = await contract.mint(signers.alice.address, 1000);
      await tx.wait();

      await expect(tx).to.emit(contract, "Mint");
      expect(await contract.totalSupply()).to.equal(1000);
      expect(await contract.hasBalance(signers.alice.address)).to.equal(true);
    });

    it("should transfer tokens confidentially", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint to Alice
      await (await contract.mint(signers.alice.address, 1000)).wait();

      // Alice transfers to Bob
      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(300);
      const encrypted = await input.encrypt();

      const tx = await contract.transfer(
        signers.bob.address,
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "Transfer");
      expect(await contract.hasBalance(signers.bob.address)).to.equal(true);
    });

    it("should approve and transferFrom", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Mint to Alice
      await (await contract.mint(signers.alice.address, 1000)).wait();

      // Alice approves Bob
      const approveInput = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      approveInput.add64(500);
      const approveEnc = await approveInput.encrypt();

      await (await contract.approve(
        signers.bob.address,
        approveEnc.handles[0],
        approveEnc.inputProof
      )).wait();

      // Bob transfers from Alice to Carol
      const transferInput = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      transferInput.add64(200);
      const transferEnc = await transferInput.encrypt();

      const tx = await contract.connect(signers.bob).transferFrom(
        signers.alice.address,
        signers.carol.address,
        transferEnc.handles[0],
        transferEnc.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "Transfer");
    });

    it("should prevent transfer to zero address", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      await (await contract.mint(signers.alice.address, 1000)).wait();

      const input = fhevm.createEncryptedInput(contractAddress, signers.alice.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      await expect(
        contract.transfer(ethers.ZeroAddress, encrypted.handles[0], encrypted.inputProof)
      ).to.be.revertedWith("Transfer to zero address");
    });
  });
});