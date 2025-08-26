# Blockchain Integration - Smart Contracts

Blockchain-based verification, payments, and compliance tracking for the Indigenous Procurement Platform.

## Overview

This system uses Ethereum smart contracts to provide:
- **Immutable Identity Verification**: Elder-approved Indigenous business verification
- **Milestone-based Escrow**: Secure payment management for government contracts
- **Compliance Tracking**: Transparent 5% procurement target monitoring
- **Impact Analytics**: On-chain economic impact tracking for communities

## Smart Contracts

### 1. Identity Verification Contract

Manages verification of Indigenous business status with elder approval workflows.

```solidity
// Key features:
- Multi-signature elder approval (minimum 2 elders)
- IPFS document storage
- Automatic expiry and renewal
- Role-based access control
- Revocation capabilities
```

**Functions:**
- `submitVerification()` - Submit new verification request
- `processVerification()` - Elder approval/rejection
- `renewVerification()` - Renew expired verification
- `revokeVerification()` - Admin revocation
- `isVerified()` - Check verification status

### 2. Payment Escrow Contract

Handles milestone-based payments for RFQ contracts.

```solidity
// Key features:
- Multi-milestone support
- Conditional fund release
- Dispute resolution period
- Platform fee collection
- Emergency withdrawal (disputed funds)
```

**Functions:**
- `createEscrow()` - Initialize new escrow
- `fundEscrow()` - Government deposits funds
- `submitMilestone()` - Contractor submits deliverables
- `approveMilestone()` - Government approves work
- `releaseMilestonePayment()` - Release funds
- `raiseDispute()` - Initiate dispute process

### 3. Compliance Registry Contract

Tracks government compliance with 5% Indigenous procurement target.

```solidity
// Key features:
- Annual compliance reporting
- Automatic percentage calculation
- Historical data tracking
- Public transparency
```

### 4. Impact Tracker Contract

Records economic impact on Indigenous communities.

```solidity
// Key features:
- Community-specific metrics
- Job creation tracking
- Local spending analysis
- Category breakdowns
```

## Architecture

```
┌─────────────────────┐     ┌──────────────────┐
│   Frontend (Next.js)│────▶│  Contract Manager │
└─────────────────────┘     └──────────────────┘
                                      │
                            ┌─────────┴─────────┐
                            │                   │
                      ┌─────▼──────┐    ┌──────▼──────┐
                      │   Ethereum │    │    IPFS     │
                      │  Blockchain│    │   Storage   │
                      └────────────┘    └─────────────┘
```

## Usage

### Setup

1. **Environment Variables**
```bash
NEXT_PUBLIC_BLOCKCHAIN_NETWORK=testnet
NEXT_PUBLIC_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_IDENTITY_CONTRACT=0x...
NEXT_PUBLIC_ESCROW_CONTRACT=0x...
NEXT_PUBLIC_COMPLIANCE_CONTRACT=0x...
NEXT_PUBLIC_IMPACT_CONTRACT=0x...
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.infura.io:5001/api/v0
```

2. **Deploy Contracts**
```bash
cd contracts
npm install
npx hardhat compile
npx hardhat deploy --network sepolia
```

### Frontend Integration

#### Connect Wallet
```tsx
import { useWallet } from '@/features/blockchain/hooks/useSmartContracts'

function WalletConnect() {
  const { address, isConnected, connectWallet } = useWallet()
  
  return (
    <button onClick={connectWallet}>
      {isConnected ? `Connected: ${address}` : 'Connect Wallet'}
    </button>
  )
}
```

#### Submit Verification
```tsx
import { useVerification } from '@/features/blockchain/hooks/useSmartContracts'

function VerifyBusiness() {
  const { submitVerification, isVerified } = useVerification()
  
  const handleSubmit = async () => {
    const result = await submitVerification({
      nation: 'Cree Nation',
      territory: 'Treaty 6',
      ownershipPercentage: 100,
      documents: [file1, file2]
    })
  }
  
  if (isVerified) {
    return <div>✓ Verified Indigenous Business</div>
  }
  
  return <button onClick={handleSubmit}>Verify Business</button>
}
```

#### Create Escrow
```tsx
import { useEscrow } from '@/features/blockchain/hooks/useSmartContracts'

function CreateEscrow({ rfq }) {
  const { createEscrow, fundEscrow } = useEscrow()
  
  const handleCreate = async () => {
    const result = await createEscrow({
      rfqId: rfq.id,
      seller: rfq.winningBid.businessAddress,
      amount: ethers.parseEther(rfq.value),
      milestones: rfq.milestones.map(m => ({
        description: m.description,
        amount: ethers.parseEther(m.value),
        dueDate: Math.floor(m.dueDate.getTime() / 1000)
      })),
      releaseConditions: ['Deliverables accepted', 'Quality approved']
    })
    
    // Fund the escrow
    await fundEscrow(result.escrowId, ethers.parseEther(rfq.value))
  }
  
  return <button onClick={handleCreate}>Create Escrow</button>
}
```

#### Track Compliance
```tsx
import { useCompliance } from '@/features/blockchain/hooks/useSmartContracts'

function ComplianceTracker({ organizationId }) {
  const { complianceStatus, percentage } = useCompliance()
  
  useEffect(() => {
    getComplianceStatus(organizationId, new Date().getFullYear())
  }, [organizationId])
  
  return (
    <div>
      <h3>Procurement Compliance</h3>
      <div>{percentage.toFixed(1)}% Indigenous</div>
      <div>{complianceStatus?.compliant ? '✓ Compliant' : '✗ Non-compliant'}</div>
    </div>
  )
}
```

## Verification Flow

1. **Business Submits**: Upload documents, declare ownership percentage
2. **Blockchain Records**: Immutable record created with IPFS document links
3. **Elder Review**: Minimum 2 elders must approve
4. **Status Update**: Verification status updated on-chain
5. **Validity Period**: 365 days before renewal required

## Payment Flow

1. **Contract Award**: Government creates escrow with milestones
2. **Fund Escrow**: Government deposits full contract value
3. **Work Completion**: Contractor submits milestone deliverables
4. **Government Review**: Approves completed work
5. **Automatic Payment**: Funds released to contractor
6. **Platform Fee**: 1% fee for platform sustainability

## Security Considerations

### Smart Contract Security
- OpenZeppelin security libraries
- Reentrancy guards on all payment functions
- Role-based access control (RBAC)
- Pausable contracts for emergencies
- Time-locked admin functions

### Data Privacy
- Only verification status stored on-chain
- Sensitive documents on IPFS (encrypted)
- No PII on blockchain
- Anonymized impact metrics

### Wallet Security
- Hardware wallet support (Ledger, Trezor)
- Multi-signature requirements for high-value transactions
- Transaction simulation before execution
- Clear signing messages

## Gas Optimization

### Strategies Used
- Batch operations where possible
- Efficient storage patterns
- Minimal on-chain data
- IPFS for document storage
- Event-based data retrieval

### Estimated Costs (Ethereum Mainnet)
- Verification submission: ~0.02 ETH
- Elder approval: ~0.01 ETH
- Escrow creation: ~0.03 ETH
- Milestone release: ~0.015 ETH

## Testing

### Unit Tests
```bash
cd contracts
npx hardhat test
```

### Integration Tests
```bash
npm run test:integration
```

### Test Coverage
```bash
npx hardhat coverage
```

## Monitoring

### On-chain Analytics
- Contract event monitoring
- Transaction success rates
- Gas usage tracking
- Error analysis

### Dashboards
- Verification status overview
- Payment flow visualization
- Compliance metrics
- Community impact reports

## Deployment

### Testnets
1. Sepolia (Ethereum testnet)
2. Mumbai (Polygon testnet)
3. Fuji (Avalanche testnet)

### Mainnet Checklist
- [ ] Security audit completed
- [ ] Gas optimization verified
- [ ] Upgrade mechanism tested
- [ ] Emergency pause tested
- [ ] Multi-sig wallets configured
- [ ] Monitoring alerts set up

## Contract Upgrades

Using OpenZeppelin's upgradeable contracts pattern:

```solidity
// Proxy pattern for upgrades
contract IdentityVerificationV2 is IdentityVerificationV1 {
    // New features while preserving state
}
```

## Emergency Procedures

### Contract Pause
```typescript
// Only owner can pause
await contracts.identity.pause()
await contracts.escrow.pause()
```

### Fund Recovery
```typescript
// Disputed funds recovery
await contracts.escrow.emergencyWithdraw(escrowId, recipient, amount)
```

## Future Enhancements

1. **Cross-chain Support**
   - Polygon for lower fees
   - Avalanche for speed
   - Bridge for interoperability

2. **Advanced Features**
   - Reputation system
   - Automated milestone verification
   - AI-powered dispute resolution
   - Predictive compliance analytics

3. **DeFi Integration**
   - Yield on escrowed funds
   - Invoice factoring
   - Community investment pools

## Resources

- [Contract Documentation](./contracts/docs)
- [Deployment Scripts](./contracts/deploy)
- [Security Audits](./contracts/audits)
- [Gas Optimization Guide](./contracts/gas-optimization.md)

## Support

For blockchain-related issues:
- Technical: blockchain@indigenousprocurement.ca
- Security: security@indigenousprocurement.ca
- Elder Support: elders@indigenousprocurement.ca