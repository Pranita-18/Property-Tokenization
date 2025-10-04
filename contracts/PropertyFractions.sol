// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Storage.sol";

/**
 * @title PropertyFractions
 * @dev ERC20 representing fractional ownership for one property.
 *      Minting happens in constructor; decimals default to 18.
 */
contract PropertyFractions is Storage, ERC20 {

    /**
     * @notice Emitted when fractional tokens are created for a property.
     * @param initialHolder Address that receives the minted fractions.
     * @param tokenId ID of the property NFT being fractionalized.
     * @param amount Total number of fractional tokens minted.
    */
    event Fractionalized(
        address indexed initialHolder, 
        uint256 indexed tokenId, 
        uint256 amount
    );

    /**
     * @param _name ERC20 name
     * @param _symbol ERC20 symbol
     * @param _propertyDeed Address of the Property deed contract
     * @param _tokenId TokenId of the property NFT
     * @param _initialHolder Address to receive the minted supply
     * @param _totalSupplyTokens Total tokens in whole units
     */
    constructor(
        string memory _name,
        string memory _symbol,
        address _propertyDeed,
        uint256 _tokenId,
        address _initialHolder,
        uint256 _totalSupplyTokens
    ) ERC20(_name, _symbol) {
        require(_initialHolder != address(0), "Initial holder zero");
        require(_propertyDeed != address(0), "PropertyDeed zero");
        require(_totalSupplyTokens > 0, "Total supply zero");

        propertyDeed = _propertyDeed;
        tokenId = _tokenId;
        manager = msg.sender;

        uint8 d = decimals();
        mintedSupply = _totalSupplyTokens * (10 ** uint256(d));
        _mint(_initialHolder, mintedSupply);

        emit Fractionalized(_initialHolder, _tokenId, mintedSupply);
    }

    /**
     * @notice Return the totalSupply in whole tokens.
     */
    function totalSupplyWhole() external view returns (uint256) {
        return totalSupply() / (10 ** uint256(decimals()));
    }
}