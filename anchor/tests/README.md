# VocaBee Smart Contract Tests

## 📋 Overview

Comprehensive test suite for the VocaBee Wordle game smart contract on Solana.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Run Tests

```bash
# Run all tests
anchor test

# Run with local validator
anchor test --skip-deploy

# Run specific test file
npm run test:unit
```

## 📁 Test Structure

```
tests/
├── vocabee.test.ts          # Main test suite
├── helpers/
│   └── vrf-helper.ts         # VRF testing utilities
└── README.md                 # This file
```

## ✅ Current Test Coverage

### Implemented Tests:
- ✅ **Admin Setup**
  - Global config initialization
  - Prize vault creation
  - Configuration validation

- ✅ **User Management**
  - User profile creation
  - Profile data verification

- ✅ **Financial Validation**
  - Vault rent exemption
  - Split validation (100% check)
  - Winner split validation

### Pending Tests (Require VRF Oracle):
- ⏳ **Game Flow**
  - Buy ticket and start game
  - VRF randomness callback
  - Submit guesses
  - Complete game
  - Score calculation

- ⏳ **Prize Distribution**
  - Period finalization
  - Winner entitlement creation
  - Prize claiming

- ⏳ **Leaderboard**
  - Leaderboard initialization
  - Score updates
  - Ranking verification

## 🔧 VRF Integration Setup

To test the full game flow, you need to setup MagicBlock VRF:

### Step 1: Get VRF Oracle Queue

1. Visit [MagicBlock VRF Documentation](https://docs.magicblock.gg/pages/tools/randomness)
2. Setup your VRF oracle queue
3. Get the oracle queue public key

### Step 2: Update Test Configuration

In `tests/helpers/vrf-helper.ts`:

```typescript
static getOracleQueue(): PublicKey {
  return new PublicKey("YOUR_ORACLE_QUEUE_PUBKEY_HERE");
}
```

### Step 3: Uncomment VRF Tests

In `tests/vocabee.test.ts`, uncomment the VRF test section:

```typescript
// Uncomment when you have VRF oracle setup:
const oracleQueue = VRFHelper.getOracleQueue();

const tx = await program.methods
  .buyTicketAndStartGame(periodId)
  .accounts({
    // ... accounts
    oracleQueue: oracleQueue,
  })
  .signers([testUser])
  .rpc();
```

## 📊 Test Output Example

```
🚀 Setting up test environment...
💰 Airdropping SOL to test user...
✅ Test user funded

1. Admin Setup
  📝 Initializing global config...
  ✅ Global config initialized
     TX: 2abc...xyz
     Ticket Price: 0.01 SOL
  
  🏦 Initializing prize vaults...
  ✅ Vaults initialized
     Daily Vault: 3Qp...xyz
     Weekly Vault: 7Ks...abc
     Monthly Vault: 9Lm...def
     Platform Vault: 4Rt...ghi

2. User Profile
  👤 Creating user profile...
  ✅ User profile created
     Username: TestPlayer
     Profile PDA: 5Nm...jkl

... (more tests)

📊 TEST SUMMARY
============================================================
✅ Completed Tests:
   • Global config initialization
   • Prize vault creation
   • User profile creation
   • Vault rent exemption
   • Split validation (100%)
   • Winner split validation (100%)

⚠️  Pending Tests (Require VRF Oracle):
   • Buy ticket and start game
   • VRF randomness callback
   • Submit guesses
   • Complete game
   • Prize claiming
```

## 🎯 Test Scenarios

### Scenario 1: Happy Path
1. Initialize config and vaults
2. Create user profile
3. Buy ticket (with VRF)
4. Submit guesses
5. Complete game
6. Claim prize

### Scenario 2: Edge Cases
- Multiple games in same period (should fail)
- Invalid guesses
- Timeout scenarios
- Insufficient balance

### Scenario 3: Security Tests
- Unauthorized access attempts
- Invalid VRF callbacks
- Double claiming
- Split manipulation

## 🐛 Troubleshooting

### Issue: "Transaction simulation failed"
**Solution:** Ensure you have enough SOL in your wallet
```bash
solana airdrop 2
```

### Issue: "VRF callback timeout"
**Solution:** Check your VRF oracle is running and configured correctly

### Issue: "Account not found"
**Solution:** Make sure the program is deployed
```bash
anchor deploy
```

## 📚 Resources

- [Anchor Testing Guide](https://www.anchor-lang.com/docs/testing)
- [MagicBlock VRF Docs](https://docs.magicblock.gg/pages/tools/randomness)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)

## 🤝 Contributing

When adding new tests:
1. Follow the existing test structure
2. Add descriptive console logs
3. Include verification checks
4. Update this README

## 📝 Notes

- Tests run on localnet by default
- VRF tests require oracle setup
- Some tests may take 30-60 seconds due to VRF callbacks
- Make sure to fund test accounts before running

---

**Last Updated:** 2025-09-30
**Version:** 1.0.0
