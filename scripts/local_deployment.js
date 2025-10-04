const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying contracts with account:", deployer.address);

  const transferOwnershipToManager = process.env.TRANSFER_OWNER === "true";

  // Deploy PropertyDeed
  const PropertyDeed = await hre.ethers.getContractFactory("PropertyDeed");
  const propertyDeed = await PropertyDeed.deploy();
  await propertyDeed.waitForDeployment();
  console.log("✅ PropertyDeed deployed at:", propertyDeed.target);

  // Deploy TokenizationManager
  const TokenizationManager = await hre.ethers.getContractFactory("TokenizationManager");
  const manager = await TokenizationManager.deploy();
  await manager.waitForDeployment();
  console.log("✅ TokenizationManager deployed at:", manager.target);

  if (transferOwnershipToManager) {
    const tx = await propertyDeed.transferOwnership(manager.target);
    await tx.wait();
    console.log("PropertyDeed ownership transferred to TokenizationManager.");
  } else {
    console.log("Skipping ownership transfer. tokenizeProperty will fail unless ownership is transferred.");
  }

  const txSet = await manager.setPropertyDeedAddress(propertyDeed.target);
  await txSet.wait();
  console.log("PropertyDeed address set in TokenizationManager.");

  console.log("🎉 Deployment completed!");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
