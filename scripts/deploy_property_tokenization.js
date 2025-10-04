require("dotenv").config(); // Load .env
const hre = require("hardhat");

async function main() {
  // Fetch deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("🚀 Deploying contracts with account:", deployer.address);

  // Load environment variables
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

  // Optionally transfer ownership to TokenizationManager
  if (transferOwnershipToManager) {
    console.log("🔑 Transferring ownership of PropertyDeed to TokenizationManager...");
    const tx = await propertyDeed.transferOwnership(manager.target);
    await tx.wait(3); // Wait for 3 confirmations
    console.log("✅ PropertyDeed ownership transferred.");
  } else {
    console.log("⚠️ Skipping ownership transfer. tokenizeProperty will fail unless ownership is transferred.");
  }

  // Set PropertyDeed address in manager
  console.log("🔗 Setting PropertyDeed address in TokenizationManager...");
  const txSet = await manager.setPropertyDeedAddress(propertyDeed.target);
  await txSet.wait(3); // Wait for 3 confirmations
  console.log("✅ PropertyDeed address set in TokenizationManager.");

  console.log("🎉 Deployment to Mumbai testnet completed!");
  console.log("📌 PropertyDeed:", propertyDeed.target);
  console.log("📌 TokenizationManager:", manager.target);

  console.log("🎉 Deployment completed!");
}

// Run the script
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
