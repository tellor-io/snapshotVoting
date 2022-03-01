//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 @author Tellor Inc.
 @title Mytoken
 @dev This is the MyToken contract which is used to mint tokens to users who passed the
 *   proposal voting process.
*/
contract MyToken is ERC20 {
    // Storage
    address private governAddr;

    // Functions
    /**
     * @dev Initializes the contract with the parameters, initializes the token
     * @param _governAddr address of governance contract
     */
    constructor(address _governAddr) ERC20("MyToken", "MYT") {
        require(_governAddr != address(0), "governAddr is zero");
        governAddr = _governAddr;
    }

    /**
     * @dev Mint tokens to one address
     * @param _to address that you want to mint tokens to
     * @param _amount amount of tokens to be sent
     */
    function mint(address _to, uint256 _amount) external {
        require(msg.sender == governAddr, "Only the governor can mint");
        _mint(_to, _amount);
    }
}
