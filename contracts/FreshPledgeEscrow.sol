// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title FreshPledgeEscrow
 * @notice Escrow contract for FreshPledge marketplace
 * - Customers lock funds when ordering
 * - Funds released to farmer after delivery confirmation
 * - Admin can resolve disputes
 */
contract FreshPledgeEscrow {
    enum OrderStatus { None, Created, Delivered, Cancelled, Disputed, Released }

    struct Order {
        address customer;
        address farmer;
        uint256 amount;
        OrderStatus status;
        uint64 createdAt;
        uint64 deadline; // Delivery deadline (optional)
        string productId;
        string orderId;
    }

    address public immutable admin;
    uint256 public immutable feeBasisPoints; // e.g., 200 = 2%
    
    mapping(bytes32 => Order) public orders;
    mapping(bytes32 => bool) public orderExists;

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

    error InvalidOrder();
    error InvalidState(OrderStatus expected, OrderStatus actual);
    error Unauthorized();
    error TransferFailed();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert Unauthorized();
        _;
    }

    constructor(address _admin, uint256 _feeBps) {
        require(_admin != address(0), "admin = zero");
        require(_feeBps <= 1_000, "fee too high (>10%)");
        admin = _admin;
        feeBasisPoints = _feeBps;
    }

    /**
     * @notice Create an order and lock funds in escrow
     * @param orderId Unique order identifier
     * @param farmer Address that will receive funds after delivery
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
     * @notice Customer confirms delivery and automatically releases funds to farmer (one transaction)
     * @param orderHash Hash of the order
     */
    function confirmDeliveryAndRelease(bytes32 orderHash) external {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Created) revert InvalidState(OrderStatus.Created, order.status);
        if (msg.sender != order.customer) revert Unauthorized();

        // Mark as delivered
        order.status = OrderStatus.Delivered;
        emit OrderDelivered(orderHash, order.orderId);

        // Immediately release funds to farmer
        order.status = OrderStatus.Released;
        
        uint256 fee = (order.amount * feeBasisPoints) / 10_000;
        uint256 payout = order.amount - fee;

        // Transfer to farmer
        (bool successFarmer, ) = order.farmer.call{value: payout}("");
        if (!successFarmer) revert TransferFailed();

        // Transfer fee to admin
        if (fee > 0) {
            (bool successFee, ) = admin.call{value: fee}("");
            if (!successFee) revert TransferFailed();
        }

        emit OrderReleased(orderHash, order.orderId, order.farmer, payout, fee);
    }

    /**
     * @notice Release funds to farmer after delivery confirmation
     * Can be called by customer (who confirmed delivery) or farmer
     * @param orderHash Hash of the order
     */
    function releaseOrder(bytes32 orderHash) external {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Delivered) revert InvalidState(OrderStatus.Delivered, order.status);
        
        // Only customer (who confirmed) or farmer can release
        if (msg.sender != order.customer && msg.sender != order.farmer) {
            revert Unauthorized();
        }

        order.status = OrderStatus.Released;
        
        uint256 fee = (order.amount * feeBasisPoints) / 10_000;
        uint256 payout = order.amount - fee;

        // Transfer to farmer
        (bool successFarmer, ) = order.farmer.call{value: payout}("");
        if (!successFarmer) revert TransferFailed();

        // Transfer fee to admin
        if (fee > 0) {
            (bool successFee, ) = admin.call{value: fee}("");
            if (!successFee) revert TransferFailed();
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
     * @notice Admin resolves dispute
     * @param orderHash Hash of the order
     * @param recipient Address to receive funds
     */
    function resolveDispute(bytes32 orderHash, address recipient) external onlyAdmin {
        Order storage order = orders[orderHash];
        if (order.status != OrderStatus.Disputed) revert InvalidState(OrderStatus.Disputed, order.status);

        order.status = OrderStatus.Released;
        
        (bool success, ) = recipient.call{value: order.amount}("");
        if (!success) revert TransferFailed();

        emit OrderResolved(orderHash, order.orderId, recipient, order.amount);
    }

    /**
     * @notice Get order details
     * @param orderHash Hash of the order
     */
    function getOrder(bytes32 orderHash) external view returns (Order memory) {
        return orders[orderHash];
    }

    /**
     * @notice Calculate order hash (for frontend)
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
     * @notice Get total balance held in escrow (for all orders)
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


