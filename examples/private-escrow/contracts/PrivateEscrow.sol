// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "fhevm/lib/TFHE.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
import "fhevm/gateway/GatewayCaller.sol";

/**
 * @title PrivateEscrow
 * @author FHEVM Example Hub
 * @notice Escrow with encrypted amounts
 * @dev This example shows:
 *      - Encrypted escrow deposits
 *      - Condition-based release
 *      - Private dispute resolution
 * 
 * @custom:category advanced
 * @custom:difficulty advanced
 */
contract PrivateEscrow is SepoliaZamaFHEVMConfig, SepoliaZamaGatewayConfig, GatewayCaller {
    
    enum EscrowState { Created, Funded, Released, Refunded, Disputed }
    
    struct Escrow {
        address buyer;
        address seller;
        address arbiter;
        euint64 amount;
        EscrowState state;
        uint256 createdAt;
    }
    
    mapping(uint256 => Escrow) public escrows;
    uint256 public escrowCount;
    
    // For release tracking
    mapping(uint256 => address) private releaseRequests;
    
    event EscrowCreated(uint256 indexed escrowId, address buyer, address seller);
    event EscrowFunded(uint256 indexed escrowId);
    event EscrowReleased(uint256 indexed escrowId);
    event EscrowRefunded(uint256 indexed escrowId);
    event DisputeRaised(uint256 indexed escrowId);

    /**
     * @notice Create a new escrow
     * @param seller Address of the seller
     * @param arbiter Address of the arbiter for disputes
     */
    function createEscrow(address seller, address arbiter) external returns (uint256) {
        require(seller != address(0), "Invalid seller");
        require(arbiter != address(0), "Invalid arbiter");
        require(seller != msg.sender, "Seller cannot be buyer");
        
        uint256 escrowId = escrowCount++;
        
        escrows[escrowId] = Escrow({
            buyer: msg.sender,
            seller: seller,
            arbiter: arbiter,
            amount: TFHE.asEuint64(0),
            state: EscrowState.Created,
            createdAt: block.timestamp
        });
        
        emit EscrowCreated(escrowId, msg.sender, seller);
        return escrowId;
    }

    /**
     * @notice Fund the escrow with encrypted amount
     */
    function fundEscrow(
        uint256 escrowId,
        einput encAmount,
        bytes calldata proof
    ) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.buyer == msg.sender, "Only buyer");
        require(escrow.state == EscrowState.Created, "Invalid state");
        
        escrow.amount = TFHE.asEuint64(encAmount, proof);
        escrow.state = EscrowState.Funded;
        
        TFHE.allowThis(escrow.amount);
        TFHE.allow(escrow.amount, escrow.buyer);
        TFHE.allow(escrow.amount, escrow.seller);
        TFHE.allow(escrow.amount, escrow.arbiter);
        
        emit EscrowFunded(escrowId);
    }

    /**
     * @notice Buyer releases funds to seller
     */
    function release(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.buyer == msg.sender, "Only buyer");
        require(escrow.state == EscrowState.Funded, "Invalid state");
        
        escrow.state = EscrowState.Released;
        emit EscrowReleased(escrowId);
    }

    /**
     * @notice Seller requests refund (requires buyer or arbiter approval)
     */
    function refund(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        require(
            escrow.buyer == msg.sender || escrow.arbiter == msg.sender,
            "Only buyer or arbiter"
        );
        require(escrow.state == EscrowState.Funded || escrow.state == EscrowState.Disputed, "Invalid state");
        
        escrow.state = EscrowState.Refunded;
        emit EscrowRefunded(escrowId);
    }

    /**
     * @notice Raise a dispute
     */
    function raiseDispute(uint256 escrowId) external {
        Escrow storage escrow = escrows[escrowId];
        require(
            escrow.buyer == msg.sender || escrow.seller == msg.sender,
            "Only buyer or seller"
        );
        require(escrow.state == EscrowState.Funded, "Invalid state");
        
        escrow.state = EscrowState.Disputed;
        emit DisputeRaised(escrowId);
    }

    /**
     * @notice Arbiter resolves dispute
     * @param releaseToSeller True to release to seller, false to refund buyer
     */
    function resolveDispute(uint256 escrowId, bool releaseToSeller) external {
        Escrow storage escrow = escrows[escrowId];
        require(escrow.arbiter == msg.sender, "Only arbiter");
        require(escrow.state == EscrowState.Disputed, "Not disputed");
        
        if (releaseToSeller) {
            escrow.state = EscrowState.Released;
            emit EscrowReleased(escrowId);
        } else {
            escrow.state = EscrowState.Refunded;
            emit EscrowRefunded(escrowId);
        }
    }

    /**
     * @notice Get escrow amount (only parties can view)
     */
    function getAmount(uint256 escrowId) external view returns (euint64) {
        Escrow storage escrow = escrows[escrowId];
        require(
            msg.sender == escrow.buyer ||
            msg.sender == escrow.seller ||
            msg.sender == escrow.arbiter,
            "Not authorized"
        );
        return escrow.amount;
    }

    /**
     * @notice Get escrow details
     */
    function getEscrow(uint256 escrowId) external view returns (
        address buyer,
        address seller,
        address arbiter,
        EscrowState state,
        uint256 createdAt
    ) {
        Escrow storage escrow = escrows[escrowId];
        return (escrow.buyer, escrow.seller, escrow.arbiter, escrow.state, escrow.createdAt);
    }
}