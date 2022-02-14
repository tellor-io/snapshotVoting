//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyToken is ERC20 {

    address private governAddr;

    constructor(address _governAddr) ERC20("MyToken", "MYT") {
        governAddr = _governAddr;
    }

    function mint(address _to, uint256 _amount) public {
        require(msg.sender == governAddr, "Only the governor can mint");
        _mint(_to, _amount);
    }
}
