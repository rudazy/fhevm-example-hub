import { expect } from "chai";
import { ethers } from "hardhat";
import { createInstance } from "../instance";
import { getSigners, initSigners } from "../signers";

describe("BlindAuction", function () {
  let contract: any;
  let fhevm: any;

  before(async function () {
    await initSigners();
    fhevm = await createInstance();
  });

  beforeEach(async function () {
    const signers = await getSigners();
    const Factory = await ethers.getContractFactory("BlindAuction");
    // 1 hour auction
    contract = await Factory.connect(signers.alice).deploy(3600);
    await contract.waitForDeployment();
  });

  describe("Blind Auction", function () {
    it("should accept encrypted bids", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(100);
      const encrypted = await input.encrypt();

      const tx = await contract.connect(signers.bob).bid(
        encrypted.handles[0],
        encrypted.inputProof
      );
      await tx.wait();

      await expect(tx).to.emit(contract, "BidPlaced");
      expect(await contract.hasBid(signers.bob.address)).to.equal(true);
    });

    it("should prevent double bidding", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // First bid
      const input1 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input1.add64(100);
      const enc1 = await input1.encrypt();
      await (await contract.connect(signers.bob).bid(enc1.handles[0], enc1.inputProof)).wait();

      // Second bid should fail
      const input2 = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input2.add64(200);
      const enc2 = await input2.encrypt();

      await expect(
        contract.connect(signers.bob).bid(enc2.handles[0], enc2.inputProof)
      ).to.be.revertedWith("Already placed a bid");
    });

    it("should allow multiple bidders", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      // Bob bids 100
      const inputBob = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      inputBob.add64(100);
      const encBob = await inputBob.encrypt();
      await (await contract.connect(signers.bob).bid(encBob.handles[0], encBob.inputProof)).wait();

      // Carol bids 150
      const inputCarol = fhevm.createEncryptedInput(contractAddress, signers.carol.address);
      inputCarol.add64(150);
      const encCarol = await inputCarol.encrypt();
      await (await contract.connect(signers.carol).bid(encCarol.handles[0], encCarol.inputProof)).wait();

      expect(await contract.hasBid(signers.bob.address)).to.equal(true);
      expect(await contract.hasBid(signers.carol.address)).to.equal(true);
    });

    it("should allow bidder to view their own bid", async function () {
      const signers = await getSigners();
      const contractAddress = await contract.getAddress();

      const input = fhevm.createEncryptedInput(contractAddress, signers.bob.address);
      input.add64(250);
      const encrypted = await input.encrypt();
      await (await contract.connect(signers.bob).bid(encrypted.handles[0], encrypted.inputProof)).wait();

      // Bob can see his bid handle
      const myBid = await contract.connect(signers.bob).getMyBid();
      expect(myBid).to.not.equal(0n);
    });

    it("should prevent viewing bid if none placed", async function () {
      const signers = await getSigners();

      await expect(
        contract.connect(signers.bob).getMyBid()
      ).to.be.revertedWith("No bid placed");
    });
  });
});