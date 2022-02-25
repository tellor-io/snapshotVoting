//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "usingtellor/contracts/UsingTellor.sol";
import "./MyToken.sol";

contract SnapshotVoting is UsingTellor {
    // Events
    event SnapshotVotingCreated(
        address indexed _snapshotVotingAddress,
        uint256 proposalID
    );
    event SnapshotVotingExecuted(
        address indexed _snapshotVotingAddress,
        uint256 proposalID
    );

    // Storage
    mapping(uint256 => Proposal) public proposals;

    uint256 private proposalID = 0;
    uint256 public quorumVotes;

    MyToken private token;

    // Enums
    enum Status {
        OPEN,
        CLOSED
    }

    // Structs
    struct Proposal {
        uint256 proposalID;
        address target;
        string description;
        Status status;
    }

    /*Functions*/
    /**
     * @dev Initializes the contract with the parameters, initializes the token
     * @param _tellorAddress address of Tellor contract
     * @param _quorumVotes total votes required to execute the proposal
     */
    constructor(address payable _tellorAddress, uint256 _quorumVotes)
        UsingTellor(_tellorAddress)
    {
        quorumVotes = _quorumVotes;
        token = new MyToken(address(this));
    }

    /**
     * @dev Create a proposal
     * @param _target address of the proposal
     */
    function proposeVote(address _target) external {
        proposalID += 1;
        proposals[proposalID].target = _target;
        proposals[proposalID].proposalID = proposalID;
        proposals[proposalID].status = Status.OPEN;
        proposals[proposalID]
            .description = "Mint 1000 tokens to target address";

        emit SnapshotVotingCreated(_target, proposalID);
    }

    /**
     * @dev Execute a chosen proposal
     * @param _proposalID identifier of the proposal
     */
    function executeProposal(uint256 _proposalID) external {
        Proposal memory proposal = proposals[_proposalID];
        require(proposal.proposalID != 0, "Proposal not found");
        require(proposal.status == Status.OPEN, "Proposal is closed");
        bytes32 _queryID = keccak256(
            abi.encode("Snapshot", abi.encode(address(this), _proposalID))
        );
        (uint256 _yesAmount, uint256 _noAmount) = readVoteResultBefore(
            _queryID,
            block.timestamp - 1 hours
        );
        uint256 totalVotes = _yesAmount + _noAmount;
        require(totalVotes >= quorumVotes, "Not enough votes");
        require(_yesAmount > _noAmount, "Not enough yes votes");
        proposals[_proposalID].status = Status.CLOSED;
        token.mint(proposals[_proposalID].target, 1000);

        emit SnapshotVotingExecuted(proposal.target, _proposalID);
    }

    /**
     * @dev Get the proposal result
     * @param _queryId id of desired data feed
     * @param _timestamp to retrieve data from
     * @return result of the proposal
     */
    function readVoteResultBefore(bytes32 _queryId, uint256 _timestamp)
        public
        view
        returns (uint256, uint256)
    {
        // TIP:
        //For best practices, use getDataBefore with a time buffer to allow
        // time for a value to be disputed
        (bool _ifRetrieve, bytes memory _value, ) = getDataBefore(
            _queryId,
            _timestamp
        );
        require(_ifRetrieve, "must get data to execute vote");
        (uint256 _yes, uint256 _no) = abi.decode(_value, (uint256, uint256));
        return (_yes, _no);
    }

    /**
     * @dev return current proposal count
     * @return uint256 proposal count
     */
    function getCurrentProposalID() external view returns (uint256) {
        return proposalID;
    }

    /**
     * @dev Returns proposal target
     * @param _proposalID Proposal ID
     * @return address of proposal target
     */
    function getProposalTarget(uint256 _proposalID)
        external
        view
        returns (address)
    {
        return proposals[_proposalID].target;
    }

    /**
     * @dev Returns the token contract address
     * @return address of token contract
     */
    function getTokenAddress() external view returns (address) {
        return address(token);
    }
}
