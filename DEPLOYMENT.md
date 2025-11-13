# Smart Contract Deployment Guide

## Overview
This guide explains how to deploy the FreshPledge Escrow smart contract and integrate it with the frontend.

## Prerequisites
1. **Node.js** and **npm** installed
2. **MetaMask** browser extension
3. **Hardhat** or **Remix** for deployment
4. Test ETH for gas fees (get from faucets like Sepolia, Mumbai)

## Step 1: Install Hardhat (Recommended)

```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init
```

## Step 2: Deploy Contract

### Option A: Using Hardhat

1. Create `hardhat.config.js`:
```javascript
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/YOUR_INFURA_KEY`,
      accounts: [process.env.PRIVATE_KEY]
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/YOUR_INFURA_KEY`,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

2. Create deployment script `scripts/deploy.js`:
```javascript
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const FreshPledgeEscrow = await hre.ethers.getContractFactory("FreshPledgeEscrow");
  const escrow = await FreshPledgeEscrow.deploy(
    deployer.address, // admin address
    200 // 2% platform fee (200 basis points)
  );

  await escrow.waitForDeployment();
  console.log("Escrow deployed to:", await escrow.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

3. Deploy:
```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Option B: Using Remix (Easier for beginners)

1. Go to https://remix.ethereum.org
2. Create new file `FreshPledgeEscrow.sol` and paste the contract code
3. Compile (Solidity Compiler tab)
4. Deploy (Deploy & Run tab):
   - Select environment: "Injected Provider - MetaMask"
   - Connect your wallet
   - Set constructor parameters:
     - `_admin`: Your wallet address
     - `_feeBps`: 200 (for 2% fee)
   - Click "Deploy"
5. Copy the contract address

## Step 3: Verify Contract (Optional but Recommended)

```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS ADMIN_ADDRESS 200
```

## Step 4: Update Environment Variables

Add to `.env.local`:
```
VITE_ESCROW_CONTRACT_ADDRESS=0xYourDeployedContractAddress
```

## Step 5: Test the Integration

1. Start your app: `npm run dev`
2. Go to Products → Buy a product
3. Select "Blockchain (ETH)" payment
4. Connect MetaMask
5. Approve transaction
6. Funds will be locked in escrow!

## Step 6: Delivery Confirmation Flow

### For Customers:
- After receiving product, go to Orders page
- Click "Confirm Delivery"
- This triggers `confirmDelivery()` in contract

### For Farmers:
- After customer confirms, farmer can call `releaseOrder()`
- Funds automatically released to farmer (minus platform fee)

## Contract Functions

### Customer Functions:
- `createOrder()` - Lock funds in escrow
- `confirmDelivery()` - Confirm product received
- `cancelOrder()` - Cancel and get refund

### Farmer Functions:
- `releaseOrder()` - Release funds after delivery confirmed

### Admin Functions:
- `resolveDispute()` - Resolve disputes manually

## Security Notes

1. **Admin Address**: Use a multisig wallet or timelock for production
2. **Fee**: Adjust `feeBasisPoints` (max 1000 = 10%)
3. **Deadline**: Set reasonable delivery deadlines
4. **Testing**: Always test on testnet first!

## Support

For issues:
- Check contract on Etherscan/Polygonscan
- Verify contract address in `.env.local`
- Ensure MetaMask is connected to correct network


