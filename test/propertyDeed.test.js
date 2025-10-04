const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("PropertyDeed", async () => {

async function deployPropertyDeedFixture() {
  const [owner, addr1, addr2] = await ethers.getSigners();

  const PropertyDeed = await ethers.getContractFactory("PropertyDeed");
  const propertyDeed = await PropertyDeed.deploy({ from: owner.address }); 

  return { propertyDeed, owner, addr1, addr2 };
}

  describe("Deployment", () => {
    it("Should set the deployer as owner", async () =>{
      const { propertyDeed, owner } = await loadFixture(deployPropertyDeedFixture);
      expect(await propertyDeed.owner()).to.equal(owner.address);
    });

    it("Property counter should start at 0", async () =>{
      const { propertyDeed } = await loadFixture(deployPropertyDeedFixture);
      expect(await propertyDeed.propertyCounter()).to.equal(0);
    });
  });

  describe("Minting Properties - Success Cases", () =>{
    it("Owner can mint a new property", async () =>{
      const { propertyDeed, addr1 } = await loadFixture(deployPropertyDeedFixture);

      await expect(propertyDeed.mintPropertyDeed(addr1.address, "Villa", "123 Main St", 1000))
        .to.emit(propertyDeed, "PropertyMinted")
        .withArgs(1, addr1.address);

      expect(await propertyDeed.propertyCounter()).to.equal(1);

      const property = await propertyDeed.getProperty(1);
      expect(property.name).to.equal("Villa");
      expect(property.location).to.equal("123 Main St");
      expect(property.valuation).to.equal(1000);
    });

    it("Owner can mint multiple properties", async () =>{
      const { propertyDeed, addr1, addr2 } = await loadFixture(deployPropertyDeedFixture);

      await propertyDeed.mintPropertyDeed(addr1.address, "Villa", "123 Main St", 1000);
      await propertyDeed.mintPropertyDeed(addr2.address, "Apartment", "456 Elm St", 500);

      expect(await propertyDeed.propertyCounter()).to.equal(2);

      const prop1 = await propertyDeed.getProperty(1);
      const prop2 = await propertyDeed.getProperty(2);

      expect(prop1.name).to.equal("Villa");
      expect(prop2.name).to.equal("Apartment");
    });

    it("Should store correct property details", async () =>{
      const { propertyDeed, addr1 } = await loadFixture(deployPropertyDeedFixture);

      await propertyDeed.mintPropertyDeed(addr1.address, "Mansion", "789 Oak St", 2000);

      const property = await propertyDeed.getProperty(1);
      expect(property.name).to.equal("Mansion");
      expect(property.location).to.equal("789 Oak St");
      expect(property.valuation).to.equal(2000);
    });

    it("Property IDs should increment correctly", async () =>{
      const { propertyDeed, addr1 } = await loadFixture(deployPropertyDeedFixture);

      await propertyDeed.mintPropertyDeed(addr1.address, "Villa1", "Address1", 100);
      await propertyDeed.mintPropertyDeed(addr1.address, "Villa2", "Address2", 200);
      await propertyDeed.mintPropertyDeed(addr1.address, "Villa3", "Address3", 300);

      expect(await propertyDeed.propertyCounter()).to.equal(3);

      const prop3 = await propertyDeed.getProperty(3);
      expect(prop3.name).to.equal("Villa3");
    });

    it("Non-owner cannot mint a property", async () =>{
      const { propertyDeed, addr1 } = await loadFixture(deployPropertyDeedFixture);
        await expect(
          propertyDeed.connect(addr1).mintPropertyDeed(addr1.address, "Villa", "123 Main St", 1000)
        ).to.be.reverted;
    });

  });

  describe("Revert Cases", () =>{
    it("Should not revert when trying to get a non-existent property", async () =>{
      const { propertyDeed } = await loadFixture(deployPropertyDeedFixture);
      const property = await propertyDeed.getProperty(1);
      expect(property.name).to.equal(""); 
      expect(property.location).to.equal("");
      expect(property.valuation).to.equal(0);
    });

    it("Should revert if property name is empty", async () =>{
      const { propertyDeed, addr1 } = await loadFixture(deployPropertyDeedFixture);

      await expect(
        propertyDeed.mintPropertyDeed(addr1.address, "", "123 St", 100)
      ).to.be.revertedWith("Property name required");
    });

    it("Should revert if property location is empty", async () =>{
      const { propertyDeed, addr1 } = await loadFixture(deployPropertyDeedFixture);

      await expect(
        propertyDeed.mintPropertyDeed(addr1.address, "Villa", "", 100)
      ).to.be.revertedWith("Property location required");
    });

    it("Should revert if property valuation is 0", async () =>{
      const { propertyDeed, addr1 } = await loadFixture(deployPropertyDeedFixture);

      await expect(
        propertyDeed.mintPropertyDeed(addr1.address, "Villa", "123 St", 0)
      ).to.be.revertedWith("Property valuation must be > 0");
    });

    it("Should revert if minting to zero address", async () =>{
      const { propertyDeed } = await loadFixture(deployPropertyDeedFixture);
      await expect(
        propertyDeed.mintPropertyDeed(ethers.ZeroAddress, "Villa", "Street", 1000)
      ).to.be.revertedWithCustomError(propertyDeed, "ERC721InvalidReceiver");
    });

  });

  describe("ERC721 Compliance", () =>{
    it("Should assign token ownership correctly after mint", async () =>{
      const { propertyDeed, addr1 } = await loadFixture(deployPropertyDeedFixture);
      await propertyDeed.mintPropertyDeed(addr1.address, "Villa", "123 Main St", 1000);

      expect(await propertyDeed.ownerOf(1)).to.equal(addr1.address);
    });

    it("Should emit Transfer event when minting", async () =>{
      const { propertyDeed, addr1 } = await loadFixture(deployPropertyDeedFixture);

      await expect(propertyDeed.mintPropertyDeed(addr1.address, "Villa", "123 Main St", 1000))
        .to.emit(propertyDeed, "Transfer")
        .withArgs(ethers.ZeroAddress, addr1.address, 1);
    });

    it("Should allow transferring a property NFT", async () =>{
      const { propertyDeed, addr1, addr2 } = await loadFixture(deployPropertyDeedFixture);

      await propertyDeed.mintPropertyDeed(addr1.address, "House", "Street 1", 1000);

      await propertyDeed.connect(addr1).transferFrom(addr1.address, addr2.address, 1);

      expect(await propertyDeed.ownerOf(1)).to.equal(addr2.address);
    });

    it("Should retain property details after transfer", async () =>{
      const { propertyDeed, addr1, addr2 } = await loadFixture(deployPropertyDeedFixture);

      await propertyDeed.mintPropertyDeed(addr1.address, "House", "Street 1", 1000);
      await propertyDeed.connect(addr1).transferFrom(addr1.address, addr2.address, 1);

      const property = await propertyDeed.getProperty(1);
      expect(property.name).to.equal("House");
      expect(property.location).to.equal("Street 1");
      expect(property.valuation).to.equal(1000);
    });

    it("Anyone should be able to read property details", async () =>{
      const { propertyDeed, addr1, addr2 } = await loadFixture(deployPropertyDeedFixture);

      await propertyDeed.mintPropertyDeed(addr1.address, "Villa", "Main Street", 1500);

      const property = await propertyDeed.connect(addr2).getProperty(1);
      expect(property.name).to.equal("Villa");
    });

  });
  
});