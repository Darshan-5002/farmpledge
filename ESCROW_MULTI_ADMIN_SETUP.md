# Multi-Admin Escrow Setup Guide

## Overview

The enhanced escrow contract (`FreshPledgeEscrowV2.sol`) supports:
- **Multiple Farmers**: Each order specifies a farmer address (already supported)
- **Multiple Admin Wallets**: Multiple admins with different roles and fee shares
- **Role-Based Access Control**: Different permission levels for admins
- **Fee Distribution**: Automatic fee distribution to multiple admin wallets
- **Multi-Sig Support**: Multiple admins can vote on dispute resolutions

## Contract Features

### Admin Roles

1. **Owner**: Full control, can add/remove admins, resolve disputes alone
2. **Supervisor**: Can resolve disputes alone, cannot manage admins
3. **Operator**: Can vote on disputes, cannot resolve alone

### Fee Distribution

- Platform fee (e.g., 2%) is calculated per order
- Fee is distributed to admins based on their `feeShareBasisPoints`
- Example: If Admin A has 50% share and Admin B has 50% share, fees are split 50/50
- Total fee shares must not exceed 100% (10,000 basis points)

## Deployment Steps

### 1. Deploy the Contract

```solidity
// In Remix or Hardhat
// Constructor parameters:
// _owner: Your main admin wallet address
// _feeBps: Platform fee in basis points (e.g., 200 = 2%)

FreshPledgeEscrowV2 escrow = new FreshPledgeEscrowV2(
    0xYourMainAdminWallet,  // Owner address
    200                     // 2% platform fee
);
```

### 2. Add Additional Admins

After deployment, add more admins:

```solidity
// Add Admin 1 (Supervisor, 40% fee share)
escrow.addAdmin(
    0xAdmin1Wallet,
    AdminRole.Supervisor,  // Can resolve disputes alone
    4000                   // 40% of fees
);

// Add Admin 2 (Operator, 30% fee share)
escrow.addAdmin(
    0xAdmin2Wallet,
    AdminRole.Operator,    // Can vote on disputes
    3000                   // 30% of fees
);

// Owner keeps remaining 30% (automatically)
```

### 3. Update Frontend Configuration

Update your `.env.local` file:

```env
# Escrow Contract Address (new V2 contract)
VITE_ESCROW_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# Primary Admin Wallet (for backward compatibility)
VITE_ADMIN_WALLET_ADDRESS=0xYourMainAdminWallet

# Optional: List all admin wallets (comma-separated)
VITE_ADMIN_WALLETS=0xAdmin1,0xAdmin2,0xAdmin3
```

## How It Works

### Multiple Farmers

Each order already supports different farmer addresses:

```javascript
// When creating an order, specify the farmer's wallet
await escrowService.createOrder(
    orderId,
    farmerWalletAddress,  // Each farmer has their own wallet
    productId,
    deadline
);
```

The contract automatically:
- Locks funds in escrow
- Releases to the specific farmer when delivery is confirmed
- Distributes fees to all admins based on their shares

### Multiple Admins

**Fee Distribution Example:**
- Order amount: 1 ETH
- Platform fee: 2% = 0.02 ETH
- Admin A (40% share): 0.008 ETH
- Admin B (30% share): 0.006 ETH
- Owner (30% share): 0.006 ETH

**Dispute Resolution:**
- **Owner/Supervisor**: Can resolve disputes alone
- **Operators**: Need multiple votes (default: 2 votes required)
- All admins can vote on disputes

## Frontend Integration

### Update useEscrow.ts

You'll need to update the ABI to include new functions:

```typescript
const ESCROW_ABI = [
  // ... existing functions ...
  "function getAllAdmins() view returns (address[])",
  "function getAdminCount() view returns (uint256)",
  "function addAdmin(address, uint8, uint256)",
  "function removeAdmin(address)",
  // ... etc
];
```

### Admin Management UI

Create an admin panel to:
1. View all admins and their roles
2. Add/remove admins (Owner only)
3. View fee distribution history
4. Manage dispute votes

## Security Considerations

1. **Owner Wallet**: Keep the owner wallet very secure (hardware wallet recommended)
2. **Multi-Sig**: Consider using a multi-sig wallet as the owner
3. **Fee Shares**: Ensure total fee shares don't exceed 100%
4. **Admin Removal**: Only owner can remove admins (except themselves)
5. **Dispute Resolution**: Set appropriate vote requirements for disputes

## Migration from V1

If you have an existing V1 contract:

1. Deploy V2 contract
2. Update frontend to use V2 address
3. Migrate any pending orders (if needed)
4. Add admins to V2 contract
5. Update environment variables

## Testing

Test the contract with multiple scenarios:

```javascript
// Test 1: Multiple farmers
await escrow.createOrder(..., farmer1Address, ...);
await escrow.createOrder(..., farmer2Address, ...);

// Test 2: Fee distribution
// Create order, confirm delivery, check fee distribution

// Test 3: Multi-admin dispute resolution
// Create dispute, have multiple admins vote, resolve
```

## Example: Adding 3 Admins

```solidity
// Owner: 0xOwner... (already added in constructor, 100% share)

// Add Admin 1: 40% share, Supervisor role
escrow.addAdmin(0xAdmin1..., AdminRole.Supervisor, 4000);

// Add Admin 2: 30% share, Operator role  
escrow.addAdmin(0xAdmin2..., AdminRole.Operator, 3000);

// Owner now has 30% share (automatically adjusted)
// Total: 40% + 30% + 30% = 100%
```

## Support

For questions or issues:
1. Check contract comments in `FreshPledgeEscrowV2.sol`
2. Review test cases
3. Consult Solidity documentation for modifiers and access control

