// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Storage {
    /**
     * @dev Stores details of a property.
     * @param name is the Property name.
     * @param location is the Property location.
     * @param valuation is the Estimated valuation.
    */
    struct Property {
        string name;
        string location;
        uint256 valuation;
    }

    /**
     * @dev Stores details for a property’s fraction sale.
     * @param pricePerFraction Price per fraction in wei.
     * @param active Whether sale is active.
    */
    struct FractionSale {
        uint256 pricePerFraction;
        bool active;
    }

    // Mapping from propertyId to property details
    mapping(uint256 => Property) public properties;

    // Variable to store Property Counter.
    uint256 public propertyCounter;

    // Track fractional ownership supply for each property
    mapping(uint256 => uint256) public totalFractions;

    // Mapping propertyId to the fractional contract address
    mapping(uint256 => address) public fractionContracts;

    // Variable to store Property Deed Address
    address public propertyDeedAddress;

    // Fraction sale details per propertyId
    mapping(uint256 => FractionSale) public fractionSales;

    // Mapping Original owner who requested tokenization
    mapping(uint256 => address) public propertyOwner;

    // Variable to Token ID
    uint256 public tokenId;

    // Variable to store Property Deed
    address public propertyDeed;

    // Variable to Manager address
    address public manager; 

    // Variable to store Minted supply
    uint256 public mintedSupply;
}