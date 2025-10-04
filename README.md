# Property Tokenization Smart Contracts

A real estate tokenization system using Ethereum smart contracts.  
Properties are represented as NFTs (master property deeds) and fractionalized into ERC20 tokens for shared ownership.

## Table of Contents
- [Architecture Overview](#architecture-overview)
- [Contracts](#contracts)
  - [PropertyDeed.sol](#propertydeedsol-master-property-nft)
  - [PropertyFractions.sol](#propertyfractionssol-fractional-ownership-erc20)
  - [TokenizationManager.sol](#tokenizationmanagersol-core-orchestration)
- [Workflow](#Tokenization-Workflow)
- [Local Setup](#local-setup)
- [Testing](#testing)
- [Deployment](#deployment)
- [Deployed Contract Details](#deployed-contract-details)

## Architecture Overview

The system consists of three main contracts:

### PropertyDeed.sol (Master Property NFT)
- ERC721-compliant NFT representing the legal deed of a property.
- Only the contract owner can mint new property deeds.
- Stores property metadata: name, location, valuation.
- Each NFT is unique.
- Event emitted on minting: PropertyMinted.

*Key Features:*
- Controlled minting via onlyOwner.
- Metadata retrieval via getProperty.
- Uniquely identifies properties on-chain.

### PropertyFractions.sol (Fractional Ownership ERC20)
- ERC20-compliant token representing fractional ownership of a property.
- Linked to a single PropertyDeed NFT via its tokenId.
- Total supply is minted once at deployment and assigned to the manager.
- Decimals default to 18; helper function totalSupplyWhole() returns whole tokens.

*Key Features:*
- Each fraction is a fungible share of the property.
- Linked directly to a PropertyDeed NFT for traceability.
- Event emitted on fractionalization: Fractionalized.

### TokenizationManager.sol (Core Orchestration)
- Orchestrates minting PropertyDeed NFTs and deploying PropertyFractions ERC20 tokens.
- Locks NFT in the manager while fractions exist.
- Manages fraction sales and ETH proceeds.

*Main Functions:*
1. tokenizeProperty(name, location, valuation, totalFractionsTokens, fractionName, fractionSymbol)
   - Mints NFT to manager (locked).
   - Deploys ERC20 fractional token contract.
   - Mints full supply of fractions to manager.
   - Records original property owner (for receiving ETH proceeds).

2. startDistribution(propertyId, pricePerFractionInWei)
   - Only the original property owner can start sale.
   - Opens fraction sale at specified price.

3. buyFractions(propertyId, numberOfFractions)
   - Users can buy fractions using ETH.
   - Fractions transferred from manager.
   - ETH forwarded to original owner; excess refunded.

4. withdrawETH(to)
   - Admin can withdraw stuck ETH from contract safely.

## Tokenization Workflow

1. *Tokenize a Property* – The manager mints a new property NFT (locked) and deploys an ERC20 contract representing its fractional shares.
2. *Start Fraction Sale* – The property owner sets a price for the fractions and opens them for public sale.
3. *Buy Fractions* – Users purchase fractions using ETH. Proceeds are sent to the original property owner.
4. *Withdraw Stuck ETH* – The manager can withdraw any leftover ETH from the contract.


## Local Setup

### Install Dependencies
```bash
npm install
```

### Testing
```bash
npx hardhat test
```
If tests fail due to cache:

```bash
rm -rf cache artifacts
npx hardhat test
```

To measure the test coverage

```bash
npx hardhat coverage
```

To get metrics of how much gas is used

```bash
REPORT_GAS=true npx hardhat test
```

# Deployment 

### Compile contracts 

```bash
npx hardhat compile
```
### Deploy to Local contract

```bash
npx hardhat node
npx hardhat run scripts/local_deployment.js --network localhost
```

### Deploy to Amoy testnet

```bash
npx hardhat run scripts/deploy_property_tokenization.js --network amoy
```

### Verify the contract

```bash
npx hardhat verify --network amoy <DEPLOYED_CONTRACT_ADDRESS>
```

# Deployed Contract Details
- PropertyDeed: 0x40174Db3939e9994288967867223796740f29777
- TokenizationManager: 0x91E0b0278506f561a2D2d2F7824590308106be06
- Network: Amoy Testnet

### Thank You

Thank you for taking the time to review my submission. I appreciate the opportunity and look forward to any feedback.