//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "usingtellor/contracts/UsingTellor.sol";

contract VoteResultVerify is UsingTellor {
    constructor(address payable _tellorAddress) UsingTellor(_tellorAddress) {}

    function readVoteResult(bytes32 _queryId)
        public
        view
        returns (bytes memory)
    {
        (bool ifRetrieve, bytes memory _value, ) = getCurrentValue(_queryId);
        if (!ifRetrieve) return "0x";
        return _value;
    }

    function readVoteResultBefore(bytes32 _queryId, uint256 _timestamp)
        external
        view
        returns (bytes memory, uint256)
    {
        // TIP: 
        //For best practices, use getDataBefore with a time buffer to allow
        // time for a value to be disputed
        (
            bool _ifRetrieve,
            bytes memory _value,
            uint256 _timestampRetrieved
        ) = getDataBefore(_queryId, _timestamp);
        if (!_ifRetrieve) return ("0x", 0);
        return (_value, _timestampRetrieved);
    }
}
