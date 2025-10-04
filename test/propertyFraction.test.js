const { ethers } = require("hardhat");
const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("PropertyFractions", function () {

  async function deployPropertyFractionsFixture() {
    const [owner, manager, addr1, addr2] = await ethers.getSigners();
    const PropertyFractions = await ethers.getContractFactory("PropertyFractions");

    const totalSupplyTokens = 1000;

    const fractions = await PropertyFractions.deploy(
      "Villa Fractions",
      "VFRAC",
      owner.address,
      1,
      owner.address,
      totalSupplyTokens
    );

    return { PropertyFractions, fractions, owner, manager, addr1, addr2, totalSupplyTokens };
  }

  describe("Deployment & Initialization", function () {
    it("Should set correct state variables", async function () {
      const { fractions, owner, totalSupplyTokens } = await loadFixture(deployPropertyFractionsFixture);

      expect(await fractions.propertyDeed()).to.equal(owner.address);
      expect(await fractions.manager()).to.equal(owner.address);
      expect(await fractions.tokenId()).to.equal(1);
      expect(await fractions.totalSupplyWhole()).to.equal(totalSupplyTokens);

      const balance = await fractions.balanceOf(owner.address);
      expect(balance).to.equal(
        ethers.parseUnits(totalSupplyTokens.toString(), 18)
      );
    });

    it("Total Supply Whole should return correct whole tokens", async function () {
      const { fractions, totalSupplyTokens } = await loadFixture(deployPropertyFractionsFixture);
      expect(await fractions.totalSupplyWhole()).to.equal(totalSupplyTokens);
    });

    it("Should emit Fractionalized event on deployment", async function () {
      const { PropertyFractions, owner } = await loadFixture(deployPropertyFractionsFixture);

      const fractions = await PropertyFractions.deploy(
        "Villa Fractions",
        "VFRAC",
        owner.address,
        1,
        owner.address,
        1000
      );

      const filter = fractions.filters.Fractionalized();
      const events = await fractions.queryFilter(filter);
      expect(events.length).to.equal(1);
      expect(events[0].args.initialHolder).to.equal(owner.address);
      expect(events[0].args.tokenId).to.equal(1);
      expect(events[0].args.amount).to.equal(ethers.parseUnits("1000", 18));
    });

    it("Minted supply should equal totalSupply()", async function () {
      const { fractions } = await loadFixture(deployPropertyFractionsFixture);
      expect(await fractions.mintedSupply()).to.equal(await fractions.totalSupply());
    });

    it("Should set manager as deployer", async function () {
      const { PropertyFractions, manager, owner } = await loadFixture(deployPropertyFractionsFixture);

      const fractions = await PropertyFractions.connect(manager).deploy(
        "Villa Fractions",
        "VFRAC",
        owner.address,
        1,
        owner.address,
        500
      );

      expect(await fractions.manager()).to.equal(manager.address);
    });

  });

  describe("ERC20 Behavior", function () {
    it("Should allow transfer between accounts", async function () {
      const { fractions, owner, addr1 } = await loadFixture(deployPropertyFractionsFixture);

      const amount = ethers.parseUnits("100", 18);
      await fractions.transfer(addr1.address, amount);

      expect(await fractions.balanceOf(owner.address)).to.equal(
        ethers.parseUnits("900", 18)
      );
      expect(await fractions.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should allow approve and transferFrom", async function () {
      const { fractions, owner, addr1, addr2 } = await loadFixture(deployPropertyFractionsFixture);

      const amount = ethers.parseUnits("50", 18);
      await fractions.approve(addr1.address, amount);

      expect(await fractions.allowance(owner.address, addr1.address)).to.equal(amount);

      await fractions.connect(addr1).transferFrom(owner.address, addr2.address, amount);

      expect(await fractions.balanceOf(addr2.address)).to.equal(amount);
      expect(await fractions.balanceOf(owner.address)).to.equal(
        ethers.parseUnits("950", 18)
      );
    });

    it("Should update allowance correctly", async function () {
      const { fractions, owner, addr1 } = await loadFixture(deployPropertyFractionsFixture);

      const amount = ethers.parseUnits("30", 18);
      await fractions.approve(addr1.address, amount);

      expect(await fractions.allowance(owner.address, addr1.address)).to.equal(amount);

      await fractions.connect(addr1).transferFrom(owner.address, addr1.address, amount);

      expect(await fractions.allowance(owner.address, addr1.address)).to.equal(0);
    });
  });

  describe("Revert Cases", function () {
    it("Should revert if initialHolder is zero address", async function () {
      const { PropertyFractions, owner } = await loadFixture(deployPropertyFractionsFixture);

      await expect(PropertyFractions.deploy(
        "Villa Fractions",
        "VFRAC",
        owner.address,
        1,
        ethers.ZeroAddress,
        1000
      )).to.be.revertedWith("Initial holder zero");
    });

    it("Should revert if propertyDeed is zero address", async function () {
      const { PropertyFractions, owner } = await loadFixture(deployPropertyFractionsFixture);

      await expect(PropertyFractions.deploy(
        "Villa Fractions",
        "VFRAC",
        ethers.ZeroAddress,
        1,
        owner.address,
        1000
      )).to.be.revertedWith("PropertyDeed zero");
    });

    it("Should revert if totalSupplyTokens is 0", async function () {
      const { PropertyFractions, owner } = await loadFixture(deployPropertyFractionsFixture);

      await expect(PropertyFractions.deploy(
        "Villa Fractions",
        "VFRAC",
        owner.address,
        1,
        owner.address,
        0
      )).to.be.revertedWith("Total supply zero");
    });

  });
  
});