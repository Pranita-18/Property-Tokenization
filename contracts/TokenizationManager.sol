// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "./Storage.sol";
import "./ReentrancyGuard.sol";
import "./PropertyDeed.sol";
import "./PropertyFractions.sol";

/**
 * @title TokenizationManager
 * @dev Orchestrates minting of PropertyDeed NFTs, deploying PropertyFractions ERC20s,
 *      locking the NFT, starting sales and selling fractions.
 */
contract TokenizationManager is Storage, ReentrancyGuard, ERC721Holder, Ownable {
    /**
     * @notice Emitted when a property is tokenized into fractions.
     * @param propertyId Unique ID of the property.
     * @param deedAddress Address of the Property deed contract.
     * @param fractionsAddress Address of the Property Fractions contract.
     * @param propertyOwner Address of the property owner.
    */
    event PropertyTokenized(
        uint256 indexed propertyId, 
        address deedAddress, 
        address fractionsAddress, 
        address propertyOwner
    );

    /**
     * @notice Emitted when a sale for property fractions is started.
     * @param propertyId Unique ID of the property.
     * @param pricePerFraction Price of each fraction.
    */
    event SaleStarted(
        uint256 indexed propertyId, 
        uint256 pricePerFraction
    );

    /**
     * @notice Emitted when fractions are purchased by a buyer.
     * @param propertyId Unique ID of the property.
     * @param buyer Address of the buyer.
     * @param amount Number of fractions purchased.
     * @param totalPaid Total ETH paid for the purchase.
    */
    event FractionsPurchased(
        uint256 indexed propertyId, 
        address indexed buyer, 
        uint256 amount, 
        uint256 totalPaid
    );

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Set the address of the PropertyDeed contract.
     * @param _propertyDeed Address of the Property deed contract..
     */
    function setPropertyDeedAddress(address _propertyDeed) external onlyOwner {
        require(_propertyDeed != address(0), "Zero address");
        propertyDeedAddress = _propertyDeed;
    }

    /**
     * @notice Tokenize a property:
     * @param name property name
     * @param location property location
     * @param valuation property valuation
     * @param totalFractionsTokens total fractions in whole units
     * @param fractionName ERC20 name
     * @param fractionSymbol ERC20 symbol
     */
    function tokenizeProperty(
        string memory name,
        string memory location,
        uint256 valuation,
        uint256 totalFractionsTokens,
        string memory fractionName,
        string memory fractionSymbol
    ) external {
        require(propertyDeedAddress != address(0), "PropertyDeed not set");
        require(totalFractionsTokens > 0, "Total fractions zero");
        require(PropertyDeed(propertyDeedAddress).owner() == address(this), "Manager not owner of Deed contract");

        uint256 newPropertyId = PropertyDeed(propertyDeedAddress).mintPropertyDeed(address(this), name, location, valuation);

        properties[newPropertyId] = Property(name, location, valuation);
        propertyCounter = newPropertyId;

        PropertyFractions fractions = new PropertyFractions(
            fractionName,
            fractionSymbol,
            propertyDeedAddress,
            newPropertyId,
            address(this),
            totalFractionsTokens
        );

        fractionContracts[newPropertyId] = address(fractions);
        uint8 d = ERC20(address(fractions)).decimals();
        totalFractions[newPropertyId] = totalFractionsTokens * (10 ** uint256(d));
        propertyOwner[newPropertyId] = msg.sender;

        emit PropertyTokenized(newPropertyId, propertyDeedAddress, address(fractions), msg.sender);
    }

    /**
     * @notice Starts the distribution for a property.
     * @param propertyId Unique ID of the property.
     * @param pricePerFractionInWei Price for each fraction in wei.
    */
    function startDistribution(uint256 propertyId, uint256 pricePerFractionInWei) external {
        require(fractionContracts[propertyId] != address(0), "Property not fractionalized");
        require(propertyOwner[propertyId] == msg.sender, "Only property owner can start sale");

        fractionSales[propertyId] = FractionSale({
            pricePerFraction: pricePerFractionInWei,
            active: true
        });

        emit SaleStarted(propertyId, pricePerFractionInWei);
    }

    /**
     * @dev Buy fractions.
     * @param propertyId Unique ID of the property.
     * @param numberOfFractions number of whole fractions to buy.
    */
    function buyFractions(uint256 propertyId, uint256 numberOfFractions) external payable nonReentrant {
        FractionSale memory sale = fractionSales[propertyId];
        require(sale.active, "Sale not active");
        require(numberOfFractions > 0, "Must buy > 0");
        require(fractionContracts[propertyId] != address(0), "Fractions not found");

        PropertyFractions fractions = PropertyFractions(fractionContracts[propertyId]);

        uint8 d = ERC20(address(fractions)).decimals();
        uint256 tokensToTransfer = numberOfFractions * (10 ** uint256(d));
        uint256 managerBalance = ERC20(address(fractions)).balanceOf(address(this));
        require(managerBalance >= tokensToTransfer, "Not enough fractions available");

        uint256 totalCost = numberOfFractions * sale.pricePerFraction;
        require(msg.value >= totalCost, "Insufficient ETH sent");

        bool ok = ERC20(address(fractions)).transfer(msg.sender, tokensToTransfer);
        require(ok, "ERC20 transfer failed");

        address payable recipient = payable(propertyOwner[propertyId]);
        (bool sent, ) = recipient.call{value: totalCost}("");
        require(sent, "Failed to forward funds to owner");

        if (msg.value > totalCost) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(refunded, "Refund failed");
        }

        emit FractionsPurchased(propertyId, msg.sender, numberOfFractions, totalCost);
    }

    /**
     * @notice Withdraws all ETH held by the contract to a specified address.
     * @param to Address to receive the ETH.
    */
    function withdrawETH(address payable to) external onlyOwner {
        (bool sent, ) = to.call{value: address(this).balance}("");
        require(sent, "ETH transfer failed");
    }
    receive() external payable {}
}