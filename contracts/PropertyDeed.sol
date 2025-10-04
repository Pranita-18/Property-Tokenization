// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Storage.sol";

/**
 * @title PropertyDeed
 * @dev ERC721 contract for minting property NFTs.
 * Each property is represented by a unique token ID.
 * Only owner can mint new property deeds.
*/
contract PropertyDeed is Storage, ERC721, Ownable {

    /**
     * @notice Emitted when a new property deed NFT is minted.
     * @param propertyId propertyId Unique ID of the property or NFT.
     * @param owner Address that receives the minted NFT.
     */
    event PropertyMinted(
        uint256 indexed propertyId, 
        address indexed owner
    );

    constructor() ERC721("PropertyDeed", "PDEED") Ownable(msg.sender) {}

    /**
     * @notice Mint a new property token (NFT).
     * @dev Only callable by contract owner.
     * @param to Address of the property owner (recipient of token).
     * @param name Name of the property.
     * @param location Physical location/address of the property.
     * @param valuation Estimated value of the property.
     */
    function mintPropertyDeed(
        address to,
        string memory name,
        string memory location,
        uint256 valuation
    ) external onlyOwner returns (uint256) {
        propertyCounter++;
        uint256 newPropertyId = propertyCounter;

        require(bytes(name).length > 0, "Property name required");
        require(bytes(location).length > 0, "Property location required");
        require(valuation > 0, "Property valuation must be > 0");

        properties[newPropertyId] = Property(name, location, valuation);

        _mint(to, newPropertyId);

        emit PropertyMinted(newPropertyId, to);
        return newPropertyId;
    }

    /**
     * @notice Fetch property data for a given property ID.
     * @param propertyId ID of the property deed NFT.
     * @return Property struct containing name, location, and valuation.
     */
    function getProperty(uint256 propertyId) external view returns (Property memory) {
        return properties[propertyId];
    }
}