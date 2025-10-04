const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("TokenizationManager", function () {
  async function deployManagerWithDeedOwned() {
    const [owner, addr1, addr2] = await ethers.getSigners();

    const PropertyDeed = await ethers.getContractFactory("PropertyDeed", owner);
    const propertyDeed = await PropertyDeed.deploy();
    await propertyDeed.waitForDeployment();

    const TokenizationManager = await ethers.getContractFactory("TokenizationManager", owner);
    const manager = await TokenizationManager.deploy();
    await manager.waitForDeployment();

    await propertyDeed.transferOwnership(await manager.getAddress());
    await manager.setPropertyDeedAddress(await propertyDeed.getAddress());

    return { manager, propertyDeed, owner, addr1, addr2 };
  }

  async function deployManagerWithDeedNotOwned() {
    const [owner, addr1] = await ethers.getSigners();
    const PropertyDeed = await ethers.getContractFactory("PropertyDeed", owner);
    const propertyDeed = await PropertyDeed.deploy();
    await propertyDeed.waitForDeployment();
    const TokenizationManager = await ethers.getContractFactory("TokenizationManager", owner);
    const manager = await TokenizationManager.deploy();
    await manager.waitForDeployment();
    await manager.setPropertyDeedAddress(await propertyDeed.getAddress());
    return { manager, propertyDeed, owner, addr1 };
  }

  async function deployManagerNoDeed() {
    const [addr1] = await ethers.getSigners();
    const TokenizationManager = await ethers.getContractFactory("TokenizationManager");
    const manager = await TokenizationManager.deploy();
    await manager.waitForDeployment();
    return { manager, addr1 };
  }

  describe("Deployment & Setup", function () {
    it("Should set propertyDeedAddress correctly", async function () {
      const { manager, propertyDeed } = await loadFixture(deployManagerWithDeedOwned);
      expect(await manager.propertyDeedAddress()).to.equal(await propertyDeed.getAddress());
    });

    it("Should revert if propertyDeedAddress not set", async function () {
      const { manager, addr1 } = await loadFixture(deployManagerNoDeed);
      await expect(
        manager.connect(addr1).tokenizeProperty(
          "Villa", "123 Main St", 1000, 1000, "Villa Fractions", "VFRAC"
        )
      ).to.be.revertedWith("PropertyDeed not set");
    });
  });

  describe("Tokenize Property", function () {
    it("Owner can tokenize a property and deploy fractions", async function () {
      const { manager, addr1, propertyDeed } = await loadFixture(deployManagerWithDeedOwned);

      const tx = await manager.connect(addr1).tokenizeProperty(
        "Villa", "123 Main St", 1000, 1000, "Villa Fractions", "VFRAC"
      );

      await expect(tx).to.emit(manager, "PropertyTokenized");

      expect(await manager.propertyCounter()).to.equal(1n);

      const fractionsAddress = await manager.fractionContracts(1);
      expect(fractionsAddress).to.not.equal(ethers.ZeroAddress);

      expect(await propertyDeed.ownerOf(1)).to.equal(await manager.getAddress());
    });

    it("Should revert if total fractions is zero", async function () {
      const { manager, addr1 } = await loadFixture(deployManagerWithDeedOwned);
      await expect(
        manager.connect(addr1).tokenizeProperty(
          "Villa", "123 Main St", 1000, 0, "Villa Fractions", "VFRAC"
        )
      ).to.be.revertedWith("Total fractions zero");
    });

    it("Should revert if manager not owner of PropertyDeed contract", async function () {
      const { manager, addr1 } = await loadFixture(deployManagerWithDeedNotOwned);

      await expect(
        manager.connect(addr1).tokenizeProperty(
          "Villa", "123 Main St", 1000, 1000, "Villa Fractions", "VFRAC"
        )
      ).to.be.revertedWith("Manager not owner of Deed contract");
    });

  });

  describe("startDistribution", function () {
    it("Should allow property owner to start sale", async function () {
      const { manager, addr1 } = await loadFixture(deployManagerWithDeedOwned);

      await manager.connect(addr1).tokenizeProperty("Villa", "123 Main St", 1000, 1000, "Villa Fractions", "VFRAC");

      await expect(manager.connect(addr1).startDistribution(1, ethers.parseEther("0.01")))
        .to.emit(manager, "SaleStarted").withArgs(1, ethers.parseEther("0.01"));
    });

    it("Should revert if property not fractionalized", async function () {
      const { manager, addr1 } = await loadFixture(deployManagerWithDeedOwned);
      await expect(manager.connect(addr1).startDistribution(999, 1))
        .to.be.revertedWith("Property not fractionalized");
    });

    it("Should revert if non-owner tries to start sale", async function () {
      const { manager, addr1, addr2 } = await loadFixture(deployManagerWithDeedOwned);

      await manager.connect(addr1).tokenizeProperty("Villa", "123 Main St", 1000, 1000, "Villa Fractions", "VFRAC");

      await expect(manager.connect(addr2).startDistribution(1, 1))
        .to.be.revertedWith("Only property owner can start sale");
    });

  });

  describe("buyFractions", function () {
    it("Should allow user to buy fractions and forward ETH", async function () {
      const { manager, addr1, addr2 } = await loadFixture(deployManagerWithDeedOwned);

      await manager.connect(addr1).tokenizeProperty("Villa", "123 Main St", 1000, 1000, "Villa Fractions", "VFRAC");
      await manager.connect(addr1).startDistribution(1, ethers.parseEther("0.01"));

      const fractionsAddress = await manager.fractionContracts(1);
      const fractions = await ethers.getContractAt("PropertyFractions", fractionsAddress);

      await expect(manager.connect(addr2).buyFractions(1, 10, { value: ethers.parseEther("0.1") }))
        .to.emit(manager, "FractionsPurchased").withArgs(1, addr2.address, 10, ethers.parseEther("0.1"));

      expect(await fractions.balanceOf(addr2.address)).to.equal(ethers.parseUnits("10", 18));
    });

    it("Should revert if sale not active", async function () {
      const { manager, addr1, addr2 } = await loadFixture(deployManagerWithDeedOwned);
      await manager.connect(addr1).tokenizeProperty("Villa", "123 Main St", 1000, 1000, "Villa Fractions", "VFRAC");
      await expect(manager.connect(addr2).buyFractions(1, 1, { value: 100 }))
        .to.be.revertedWith("Sale not active");
    });

    it("Should revert if buying 0 fractions", async function () {
      const { manager, addr1, addr2 } = await loadFixture(deployManagerWithDeedOwned);
      await manager.connect(addr1).tokenizeProperty("Villa", "123 Main St", 1000, 1000, "Villa Fractions", "VFRAC");
      await manager.connect(addr1).startDistribution(1, 1);
      await expect(manager.connect(addr2).buyFractions(1, 0, { value: 100 }))
        .to.be.revertedWith("Must buy > 0");
    });

    it("Should revert if not enough fractions available", async function () {
      const { manager, addr1, addr2 } = await loadFixture(deployManagerWithDeedOwned);
      await manager.connect(addr1).tokenizeProperty("Villa", "123 Main St", 1000, 1, "Villa Fractions", "VFRAC");
      await manager.connect(addr1).startDistribution(1, 1);
      await expect(manager.connect(addr2).buyFractions(1, 2, { value: 2 }))
        .to.be.revertedWith("Not enough fractions available");
    });

    it("Should revert if insufficient ETH sent", async function () {
      const { manager, addr1, addr2 } = await loadFixture(deployManagerWithDeedOwned);
      await manager.connect(addr1).tokenizeProperty("Villa", "123 Main St", 1000, 1000, "Villa Fractions", "VFRAC");
      await manager.connect(addr1).startDistribution(1, ethers.parseEther("1"));
      await expect(manager.connect(addr2).buyFractions(1, 1, { value: ethers.parseEther("0.5") }))
        .to.be.revertedWith("Insufficient ETH sent");
    });

    it("Should refund excess ETH", async function () {
      const { manager, addr1, addr2 } = await loadFixture(deployManagerWithDeedOwned);

      await manager.connect(addr1).tokenizeProperty(
        "Villa",
        "123 Main St",
        1000,
        1000,
        "Villa Fractions",
        "VFRAC"
      );

      await manager.connect(addr1).startDistribution(1, ethers.parseEther("1"));

      const balanceBefore = await ethers.provider.getBalance(addr2.address);

      const tx = await manager.connect(addr2).buyFractions(1, 1, {
        value: ethers.parseEther("2"),
      });

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);

      const gasUsed = BigInt(receipt.gasUsed);
      const gasPrice = BigInt(receipt.effectiveGasPrice ?? receipt.gasPrice);
      const gasCost = gasUsed * gasPrice;

      const balanceAfter = await ethers.provider.getBalance(addr2.address);

      const spent = balanceBefore - balanceAfter - gasCost;

      expect(spent).to.equal(ethers.parseEther("1"));
    });

  });

  describe("withdrawETH", function () {
    it("Owner should be able to withdraw", async function () {
      const { manager, owner, addr1 } = await loadFixture(deployManagerWithDeedOwned);

      await addr1.sendTransaction({
        to: await manager.getAddress(),
        value: ethers.parseEther("1"),
      });

      const balanceBefore = await ethers.provider.getBalance(owner.address);

      const tx = await manager.withdrawETH(await owner.getAddress());

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);

      const gasUsed = BigInt(receipt.gasUsed);
      const gasPrice = BigInt(receipt.effectiveGasPrice ?? receipt.gasPrice);
      const gasCost = gasUsed * gasPrice;

      const balanceAfter = await ethers.provider.getBalance(owner.address);

      const diff = balanceAfter - balanceBefore + gasCost;

      expect(diff).to.equal(ethers.parseEther("1"));
    });

    it("Should revert if non-owner tries to withdraw", async function () {
      const { manager, addr1 } = await loadFixture(deployManagerWithDeedOwned);
        await expect(manager.connect(addr1).withdrawETH(addr1.address))
        .to.be.revertedWithCustomError(manager, "OwnableUnauthorizedAccount")
        .withArgs(addr1.address);
    });

  });
});
