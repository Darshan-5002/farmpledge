// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FreshPledgeEscrowV2
 * @notice Enhanced Escrow contract for FreshPledge marketplace
 * - Supports multiple admin wallets
 * - Each order can have different farmer addresses (already supported)
 * - Admin roles with different permissions
 * - Fee distribution to multiple admin wallets
 * - Multi-sig support for critical operations
 */
contract FreshPledgeEscrowV2 {
    enum OrderStatus { None, Created, Delivered, Cancelled, Disputed, Released }
    enum AdminRole { None, Operator, Supervisor, Owner }

    struct Order {
        address customer;
        address farmer;
        uint256 amount;
        OrderStatus status;
        uint64 createdAt;
        uint64 deadline;
        string productId;
        string orderId;
    }

    struct Admin {
        address wallet;
        AdminRole role;
        bool active;
        uint256 feeShareBasisPoints; // Share of fees (e.g., 5000 = 50%)
    }

    // Admin management
    mapping(address => Admin) public admins;
    address[] public adminList;
    address public owner; // Contract owner (can add/remove admins)
    uint256 public totalFeeShareBasisPoints; // Total of all admin fee shares (should be <= 10000)
    
    // Fee configuration
    uint256 public immutable feeBasisPoints; // Platform fee (e.g., 200 = 2%)
    
    // Order management
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bool) public orderExists;

    // Multi-sig for critical operations (optional)
    mapping(bytes32 => mapping(address => bool)) public disputeVotes;
    mapping(bytes32 => uint256) public disputeVoteCount;
    uint256 public requiredVotesForDispute = 2; // Minimum votes to resolve dispute

    event OrderCreated(
        bytes32 indexed orderHash,
        string indexed orderId,
        address customer,
        address farmer,
        uint256 amount,
        string productId
    );
    
    event OrderDelivered(bytes32 indexed orderHash, string indexed orderId);
    event OrderReleased(
        bytes32 indexed orderHash,
        string indexed orderId,
        address farmer,
        uint256 amountAfterFee,
        uint256 platformFee
    );
    event OrderCancelled(bytes32 indexed orderHash, string indexed orderId);
    event OrderDisputed(bytes32 indexed orderHash, string indexed orderId);
    event OrderResolved(
        bytes32 indexed orderHash,
        string indexed orderId,
        address recipient,
        uint256 amount
    );
    
    event AdminAdded(address indexed admin, AdminRole role, uint256 feeShare);
    event AdminRemoved(address indexed admin);
    event AdminUpdated(address indexed admin, AdminRole role, uint256 feeShare);
    event FeeDistributed(address indexed admin, uint256 amount);

    error InvalidOrder();
    error InvalidState(OrderStatus expected, OrderStatus actual);
    error Unauthorized();
    error TransferFailed();
    error InvalidAdmin();
    error FeeShareExceedsLimit();
    error NotEnoughVotes();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyAdmin() {
        if (!admins[msg.sender].active) revert Unauthorized();
        _;
    }

    modifier onlySupervisorOrOwner() {
        Admin memory admin = admins[msg.sender];
        if (!admin.active || (admin.role != AdminRole.Supervisor && admin.role != AdminRole.Owner && msg.sender != owner)) {
            revert Unauthorized();
        }
        _;
    }

    constructor(address _owner, uint256 _feeBps) {
        require(_owner != address(0), "owner = zero");
        require(_feeBps <= 1_000, "fee too high (>10%)");
        owner = _owner;
        feeBasisPoints = _feeBps;
        
        // Add owner as admin with Owner role
        admins[_owner] = Admin({
            wallet: _owner,
            role: AdminRole.Owner,
            active: true,
            feeShareBasisPoints: 10_000 // 100% initially
        });
        adminList.push(_owner);
        totalFeeShareBasisPoints = 10_000;
    }

    /**
     * @notice Add a new admin
     * @param _admin Admin wallet address
     * @param _role Admin role (Operator, Supervisor, Owner)
     * @param _feeShare Fee share in basis points (e.g., 3000 = 30%)
     */
    function addAdmin(
        address _admin,
        AdminRole _role,
        uint256 _feeShare
    ) external onlyOwner {
        require(_admin != address(0), "admin = zero");
        require(!admins[_admin].active, "admin exists");
        require(_feeShare <= 10_000, "fee share > 100%");
        require(totalFeeShareBasisPoints + _feeShare <= 10_000, "total fee share > 100%");

        admins[_admin] = Admin({
            wallet: _admin,
            role: _role,
            active: true,
            feeShareBasisPoints: _feeShare
        });
        adminList.push(_admin);
        totalFeeShareBasisPoints += _feeShare;

        emit AdminAdded(_admin, _role, _feeShare);
    }

    /**
     * @notice Remove an admin
     * @param _admin Admin wallet address to remove
     */
    function removeAdmin(address _admin) external onlyOwner {
        require(admins[_admin].active, "admin not found");
        require(_admin != owner, "cannot remove owner");

        totalFeeShareBasisPoints -= admins[_admin].feeShareBasisPoints;
        admins[_admin].active = false;
        admins[_admin].feeShareBasisPoints = 0;

        // Remove from list
        for (uint256 i = 0; i < adminList.length; i++) {
            if (adminList[i] == _admin) {
                adminList[i] = adminList[adminList.length - 1];
                adminList.pop();
                break;
            }
        }

        emit AdminRemoved(_admin);
    }

    /**
     * @notice Update admin role and fee share
     * @param _admin Admin wallet address
     * @param _role New admin role
     * @param _feeShare New fee share in basis points
     */
    function updateAdmin(
        address _admin,
        AdminRole _role,
        uint256 _feeShare
    ) external onlyOwner {
        require(admins[_admin].active, "admin not found");
        require(_feeShare <= 10_000, "fee share > 100%");
        
        uint256 oldFeeShare = admins[_admin].feeShareBasisPoints;
        uint256 newTotal = totalFeeShareBasisPoints - oldFeeShare + _feeShare;
        require(newTotal <= 10_000, "total fee share > 100%");

        totalFeeShareBasisPoints = newTotal;
        admins[_admin].role = _role;
        admins[_admin].feeShareBasisPoints = _feeShare;

        emit AdminUpdated(_admin, _role, _feeShare);
    }

    /**
     * @notice Create an order and lock funds in escrow
     * @param orderId Unique order identifier
     * @param farmer Address that will receive funds after delivery (supports multiple farmers)
     * @param productId Product identifier
     * @param deadline Unix timestamp for delivery deadline (0 = no deadline)
     */
    function createOrder(
        string memory orderId,
        address farmer,
        string memory productId,
        uint64 deadline
    ) external payable {
        require(msg.value > 0, "amount = 0");
        require(farmer != address(0) && farmer != msg.sender, "bad farmer");
        require(bytes(orderId).length > 0, "orderId empty");

        bytes32 orderHash = keccak256(abi.encodePacked(orderId, msg.sender, block.timestamp));
        
        if (orderExists[orderHash]) revert InvalidOrder();

        orders[orderHash] = Order({
            customer: msg.sender,
            farmer: farmer,
            amount: msg.value,
            status: OrderStatus.Created,
            createdAt: uint64(block.timestamp),
            deadline: deadline,
            productId: productId,
            orderId: orderId
        });
        
        orderExists[orderHash] = true;

        emit OrderCreated(orderHash, orderId, msg.sender, farmer, msg.value, productId);
    }

    /**
     * @notice Customer confirms delivery
     * @param orderHash Hash of the order
     */
    function confirmDelivery(bytes32 orderHash) external {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Created) revert InvalidState(OrderStatus.Created, order.status);
        if (msg.sender != order.customer) revert Unauthorized();

        order.status = OrderStatus.Delivered;
        emit OrderDelivered(orderHash, order.orderId);
    }

    /**
     * @notice Customer confirms delivery and automatically releases funds to farmer
     * @param orderHash Hash of the order
     */
    function confirmDeliveryAndRelease(bytes32 orderHash) external {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Created) revert InvalidState(OrderStatus.Created, order.status);
        if (msg.sender != order.customer) revert Unauthorized();

        order.status = OrderStatus.Delivered;
        emit OrderDelivered(orderHash, order.orderId);

        _releaseOrder(orderHash, order);
    }

    /**
     * @notice Release funds to farmer after delivery confirmation
     * @param orderHash Hash of the order
     */
    function releaseOrder(bytes32 orderHash) external {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Delivered) revert InvalidState(OrderStatus.Delivered, order.status);
        
        if (msg.sender != order.customer && msg.sender != order.farmer) {
            revert Unauthorized();
        }

        _releaseOrder(orderHash, order);
    }

    /**
     * @notice Internal function to release order and distribute fees
     */
    function _releaseOrder(bytes32 orderHash, Order storage order) internal {
        order.status = OrderStatus.Released;
        
        uint256 fee = (order.amount * feeBasisPoints) / 10_000;
        uint256 payout = order.amount - fee;

        // Transfer to farmer (supports multiple farmers - each order has its own farmer)
        (bool successFarmer, ) = order.farmer.call{value: payout}("");
        if (!successFarmer) revert TransferFailed();

        // Distribute fee to admins based on their fee shares
        if (fee > 0 && totalFeeShareBasisPoints > 0) {
            for (uint256 i = 0; i < adminList.length; i++) {
                address adminAddr = adminList[i];
                Admin memory admin = admins[adminAddr];
                
                if (admin.active && admin.feeShareBasisPoints > 0) {
                    uint256 adminFee = (fee * admin.feeShareBasisPoints) / totalFeeShareBasisPoints;
                    if (adminFee > 0) {
                        (bool successFee, ) = adminAddr.call{value: adminFee}("");
                        if (successFee) {
                            emit FeeDistributed(adminAddr, adminFee);
                        }
                    }
                }
            }
        }

        emit OrderReleased(orderHash, order.orderId, order.farmer, payout, fee);
    }

    /**
     * @notice Customer cancels order before delivery
     * @param orderHash Hash of the order
     */
    function cancelOrder(bytes32 orderHash) external {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Created) revert InvalidState(OrderStatus.Created, order.status);
        if (msg.sender != order.customer) revert Unauthorized();

        order.status = OrderStatus.Cancelled;
        
        (bool success, ) = order.customer.call{value: order.amount}("");
        if (!success) revert TransferFailed();

        emit OrderCancelled(orderHash, order.orderId);
    }

    /**
     * @notice Open dispute if deadline passed
     * @param orderHash Hash of the order
     */
    function disputeOrder(bytes32 orderHash) external {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Created) revert InvalidState(OrderStatus.Created, order.status);
        if (msg.sender != order.customer && msg.sender != order.farmer) revert Unauthorized();
        if (order.deadline == 0 || block.timestamp <= order.deadline) revert Unauthorized();

        order.status = OrderStatus.Disputed;
        emit OrderDisputed(orderHash, order.orderId);
    }

    /**
     * @notice Admin votes on dispute resolution (multi-sig support)
     * @param orderHash Hash of the order
     * @param recipient Address to receive funds
     */
    function voteOnDispute(bytes32 orderHash, address recipient) external onlySupervisorOrOwner {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Disputed) revert InvalidState(OrderStatus.Disputed, order.status);
        if (!disputeVotes[orderHash][msg.sender]) {
            disputeVotes[orderHash][msg.sender] = true;
            disputeVoteCount[orderHash]++;
        }
    }

    /**
     * @notice Resolve dispute (requires enough votes or single Owner/Supervisor)
     * @param orderHash Hash of the order
     * @param recipient Address to receive funds
     */
    function resolveDispute(bytes32 orderHash, address recipient) external onlySupervisorOrOwner {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Disputed) revert InvalidState(OrderStatus.Disputed, order.status);

        Admin memory admin = admins[msg.sender];
        bool canResolve = false;

        // Owner or Supervisor can resolve alone
        if (admin.role == AdminRole.Owner || admin.role == AdminRole.Supervisor) {
            canResolve = true;
        }
        // Or if enough votes collected
        else if (disputeVoteCount[orderHash] >= requiredVotesForDispute) {
            canResolve = true;
        }

        if (!canResolve) revert NotEnoughVotes();

        order.status = OrderStatus.Released;
        
        (bool success, ) = recipient.call{value: order.amount}("");
        if (!success) revert TransferFailed();

        emit OrderResolved(orderHash, order.orderId, recipient, order.amount);
    }

    /**
     * @notice Set required votes for dispute resolution
     * @param _requiredVotes Minimum number of votes required
     */
    function setRequiredVotesForDispute(uint256 _requiredVotes) external onlyOwner {
        require(_requiredVotes > 0, "votes = 0");
        requiredVotesForDispute = _requiredVotes;
    }

    /**
     * @notice Get order details
     * @param orderHash Hash of the order
     */
    function getOrder(bytes32 orderHash) external view returns (Order memory) {
        return orders[orderHash];
    }

    /**
     * @notice Get all admin addresses
     * @return Array of admin addresses
     */
    function getAllAdmins() external view returns (address[] memory) {
        return adminList;
    }

    /**
     * @notice Get admin count
     * @return Number of active admins
     */
    function getAdminCount() external view returns (uint256) {
        return adminList.length;
    }

    /**
     * @notice Calculate order hash
     * @param orderId Order identifier
     * @param customer Customer address
     * @param timestamp Block timestamp
     */
    function calculateOrderHash(
        string memory orderId,
        address customer,
        uint256 timestamp
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(orderId, customer, timestamp));
    }

    /**
     * @notice Get total balance held in escrow
     * @return Total amount of ETH held in escrow
     */
    function getEscrowBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @notice Receive function to accept ETH payments
     */
    receive() external payable {
        // Contract can receive ETH for orders
    }
}

