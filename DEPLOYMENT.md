# Smart Contract Deployment Guide

## Overview
This guide explains how to deploy the FreshPledge Escrow smart contract and integrate it with the frontend.

## ⚠️ Important: Use Testnets (FREE!)
**You don't need real money!** Use testnets which are completely free:
- **Sepolia** (Ethereum testnet) - Recommended
- **Mumbai** (Polygon testnet) - Alternative

Test tokens are free from faucets - see Step 1 below.

## Prerequisites
1. **MetaMask** browser extension (required)
2. **Remix IDE** (recommended for beginners) OR **Hardhat** (for advanced users)
3. **No money needed** - we'll use free testnet tokens!

## Step 0: Get Free Test Tokens (5 minutes)

### For Sepolia (Ethereum Testnet):
1. Switch MetaMask to **Sepolia Test Network**
   - Click MetaMask icon → Networks → Sepolia
   - If you don't see it: Settings → Advanced → Show test networks → ON
2. Copy your wallet address (click account name in MetaMask)
3. Get free Sepolia ETH from one of these faucets:
   - **Alchemy Faucet**: https://sepoliafaucet.com/ (requires Alchemy account - free)
   - **Infura Faucet**: https://www.infura.io/faucet/sepolia (requires Infura account - free)
   - **QuickNode Faucet**: https://faucet.quicknode.com/ethereum/sepolia (requires Twitter/X)
   - **PoW Faucet**: https://sepolia-faucet.pk910.de/ (solves a puzzle - no account needed)

### For Mumbai (Polygon Testnet):
1. Switch MetaMask to **Mumbai Test Network**
2. Get free MATIC from: https://faucet.polygon.technology/

**Note**: You only need 0.1-0.2 test ETH/MATIC for deployment and testing!

## Step 1: Choose Your Tool

### 🎯 **Recommendation: Use Remix (Easier for Beginners)**
- ✅ No installation needed
- ✅ Works in browser
- ✅ Visual interface
- ✅ Perfect for testing

### Option B: Hardhat (For Advanced Users)
- ✅ Better for automation
- ✅ Scripts and testing
- ❌ Requires Node.js setup
- ❌ More configuration

**For your first deployment, use Remix!** (See Step 2A below)

---

## Step 2: Deploy Contract

### 🎯 Option A: Using Remix (RECOMMENDED - Easiest!)

**Time: 10 minutes | Difficulty: Easy | Cost: FREE (testnet)**

1. **Open Remix IDE**
   - Go to https://remix.ethereum.org
   - No account needed!

2. **Create Contract File**
   - Click "File Explorer" (left sidebar)
   - Click "New File" icon
   - Name it: `FreshPledgeEscrow.sol`
   - Copy the entire contract code from `contracts/FreshPledgeEscrow.sol` and paste it

3. **Compile Contract**
   - Click "Solidity Compiler" tab (left sidebar)
   - Select compiler version: **0.8.20** (or latest 0.8.x)
   - Click "Compile FreshPledgeEscrow.sol"
   - ✅ Green checkmark = Success!

4. **Connect MetaMask**
   - Make sure MetaMask is connected to **Sepolia Test Network**
   - Click "Deploy & Run Transactions" tab (left sidebar)
   - Select Environment: **"Injected Provider - MetaMask"**
   - MetaMask will pop up - click "Connect"

5. **Deploy Contract**
   - In "Deploy" section, you'll see the contract name
   - Constructor parameters will appear:
     - `_admin address`: Enter your wallet address (copy from MetaMask - starts with 0x)
     - `_feeBps uint256`: Enter `200` (for 2% fee = 200 basis points)
   - Click **"Deploy"** button
   - MetaMask will pop up - click "Confirm"
   - ⏳ Wait 10-30 seconds for deployment
   - ✅ You'll see "transaction successful" message

6. **Copy Contract Address**
   - After deployment, you'll see the contract in "Deployed Contracts"
   - Click the copy icon next to the contract address
   - **Save this address!** You'll need it for `.env.local`

**🎉 Done! Your contract is deployed on Sepolia testnet!**

---

### Option B: Using Hardhat (Advanced)

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

3. **Install Hardhat** (if not already installed):
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   npx hardhat init
   ```

4. **Deploy**:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

**Note**: If you used Remix (Option A), you can skip this Hardhat section entirely!

## Step 3: Update Environment Variables

1. Open `.env.local` file (create it if it doesn't exist)
2. Add your deployed contract address:

```env
# Use the contract address you copied from Remix
VITE_ESCROW_CONTRACT_ADDRESS=0xYourDeployedContractAddress
VITE_ADMIN_WALLET_ADDRESS=0xYourWalletAddress
```

**Example:**
```env
VITE_ESCROW_CONTRACT_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
VITE_ADMIN_WALLET_ADDRESS=0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

3. **Restart your dev server** (important!):
   ```bash
   # Stop server (Ctrl+C) then:
   npm run dev
   ```

## Step 4: Test the Integration

1. **Make sure MetaMask is on Sepolia Test Network**
   - Click MetaMask icon
   - Select "Sepolia" network

2. **Start your app**:
   ```bash
   npm run dev
   ```

3. **Test the flow**:
   - Go to Products → Buy a product
   - Select "Blockchain (ETH)" payment
   - Connect MetaMask (should auto-connect)
   - Approve transaction
   - ✅ Funds will be locked in escrow!

**Note**: You're using testnet ETH, so everything is free!

## Step 5: Verify Contract (Optional but Recommended)

If you want to verify your contract on Etherscan (makes it more transparent):

1. Go to https://sepolia.etherscan.io/
2. Search for your contract address
3. Click "Contract" tab → "Verify and Publish"
4. Follow the verification wizard

Or use Hardhat:
```bash
npx hardhat verify --network sepolia CONTRACT_ADDRESS ADMIN_ADDRESS 200
```

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

## Quick Reference: Remix Deployment Checklist

- [ ] MetaMask installed and connected
- [ ] MetaMask switched to Sepolia testnet
- [ ] Got free test ETH from faucet
- [ ] Opened Remix IDE (remix.ethereum.org)
- [ ] Created FreshPledgeEscrow.sol file
- [ ] Pasted contract code
- [ ] Compiled successfully (green checkmark)
- [ ] Connected MetaMask in Remix
- [ ] Deployed with constructor params:
  - [ ] `_admin`: Your wallet address
  - [ ] `_feeBps`: 200
- [ ] Copied contract address
- [ ] Added to `.env.local`
- [ ] Restarted dev server

## Security Notes

1. **Testnet vs Mainnet**: 
   - ✅ Use testnets (Sepolia/Mumbai) for development - FREE!
   - ⚠️ Only deploy to mainnet when ready for production
2. **Admin Address**: Use a multisig wallet or timelock for production
3. **Fee**: Adjust `feeBasisPoints` (max 1000 = 10%)
4. **Deadline**: Set reasonable delivery deadlines
5. **Testing**: Always test on testnet first!

## Troubleshooting

### "Insufficient funds" error
- Make sure you're on Sepolia testnet (not mainnet!)
- Get more test ETH from faucets (see Step 0)

### "Contract address not configured" error
- Check `.env.local` exists and has `VITE_ESCROW_CONTRACT_ADDRESS`
- Restart dev server after changing `.env.local`

### MetaMask not connecting
- Make sure MetaMask extension is installed
- Refresh the page
- Check MetaMask is unlocked

### Contract deployment failed
- Check you have test ETH (0.1+ should be enough)
- Make sure you're on Sepolia testnet
- Try again - sometimes network is busy

## Support

For issues:
- Check contract on Sepolia Etherscan: https://sepolia.etherscan.io/
- Verify contract address in `.env.local`
- Ensure MetaMask is connected to Sepolia testnet (not mainnet!)
- Check browser console for errors

## Next Steps

After successful deployment:
1. Test creating an order
2. Test delivery confirmation
3. Test payment release
4. When ready for production, deploy to mainnet (requires real ETH)


