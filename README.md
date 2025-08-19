# 🌙 Moonforge - AI-Powered Token Launcher on Solana

<div align="center">
  <img src="https://s3.us-east-1.amazonaws.com/moonforge.io/moonforgelogo.png" alt="Moonforge Logo" width="200"/>
  
  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Solana](https://img.shields.io/badge/Solana-Devnet-green)](https://solana.com)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18.3-blue)](https://reactjs.org/)
</div>

## 🚀 Overview

Moonforge is a next-generation DeFi platform that revolutionizes token creation and trading on Solana. Unlike traditional pump.fun clones, Moonforge introduces an innovative **achievement-based graduation system** inspired by World of Warcraft's Mythic+ mechanics, creating an addictive gamified experience for traders and creators.

### 🎯 Key Features

- **🤖 AI-Powered Token Generation** - Create viral memecoins with AI-generated names, symbols, and descriptions
- **🏆 Achievement-Based Graduation** - Weekly rotating achievement pools determine token graduation, not just market cap
- **💰 Revolutionary Fee Structure** - 1% platform fee on ALL transactions (even post-graduation), with smart distribution
- **🎮 Gamified Trading Experience** - Unlock achievements, climb leaderboards, and participate in tournaments
- **⚡ Real-Time Everything** - WebSocket-powered live updates for prices, trades, and social interactions
- **🛡️ MEV Protection** - Built-in Jito bundle integration for sandwich attack prevention

## 📊 Revenue Model

### Fee Distribution (Per Transaction)
- **1.0%** - Platform (MoonForge)
- **0.5%** - Token Creator
- **0.2%** - Liquidity Reserves
- **0.1%** - Prize Pool

### Additional Revenue Streams
- Token Creation: 0.02 SOL per launch
- Trending Promotions: Dynamic pricing based on demand
- Achievement Boosts: Premium features for serious traders
- API Access: $500/month for bot operators

## 🏗️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing fast builds
- **TailwindCSS** + **shadcn/ui** for stunning UI
- **Framer Motion** for smooth animations
- **TanStack Query** for intelligent data caching

### Backend
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Edge Functions** - Serverless compute for complex operations
- **WebSocket Server** - Real-time price feeds and notifications

### Blockchain
- **Solana Web3.js** - Blockchain interactions
- **Anchor Framework** - Smart contract development
- **Metaplex** - Token metadata standard
- **Helius RPC** - Enterprise-grade Solana infrastructure

### Infrastructure
- **Cloudflare R2** - CDN for images and metadata
- **Upstash Redis** - High-performance caching
- **Jito Labs** - MEV protection and priority fees

## 🎮 Achievement System

### Weekly Rotating Achievements
Each week, tokens must complete 3-5 randomly selected achievements to graduate:

```typescript
const ACHIEVEMENTS = {
  SPEED_RUN: "Graduate in under 1 hour",
  STEADY_GROWTH: "No dumps over 30% for 24h", 
  COMMUNITY: "50 unique holders",
  VOLUME_KING: "Generate 100 SOL volume",
  VIRAL: "1000 comments on token page",
  SURVIVOR: "Recover from 3 major dumps",
  PERFECT_LAUNCH: "No single wallet over 5%"
}
```

### Graduation Benefits
- Automatic Raydium liquidity pool creation
- Reduced platform fees for achievers
- Special badges and recognition
- Access to exclusive tournaments

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm/yarn
- Solana CLI tools
- Supabase account
- Helius API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/moonforge.git
cd moonforge
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# Solana
VITE_SOLANA_NETWORK=devnet
VITE_SOLANA_RPC_URL=your-helius-rpc-url

# Platform Wallets
VITE_PLATFORM_WALLET_ADDRESS=your-platform-wallet
VITE_LIQUIDITY_WALLET_ADDRESS=your-liquidity-wallet
VITE_PRIZE_POOL_WALLET_ADDRESS=your-prize-pool-wallet

# API Keys
VITE_HELIUS_API_KEY=your-helius-key
VITE_OPENAI_API_KEY=your-openai-key
```

4. **Run the development server**
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 📁 Project Structure

```
moonforge/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # Core libraries
│   │   ├── solana/     # Blockchain integration
│   │   ├── ai/         # AI services
│   │   └── achievements/ # Achievement system
│   ├── pages/          # Route pages
│   ├── services/       # External services
│   └── utils/          # Utility functions
├── supabase/
│   ├── migrations/     # Database migrations
│   └── functions/      # Edge functions
├── public/             # Static assets
└── solana-program/     # Smart contracts (Anchor)
```

## 🗄️ Database Schema

### Core Tables
- `tokens` - Token metadata and state
- `trades` - Transaction history
- `achievements` - Achievement definitions and progress
- `user_profiles` - User data and statistics
- `tournament_entries` - Competition tracking
- `price_history` - Historical price data

## 🔧 Development

### Running Tests
```bash
npm run test
```

### Building for Production
```bash
npm run build
```

### Deploying Smart Contracts
```bash
cd solana-program
anchor build
anchor deploy --provider.cluster devnet
```

## 🚢 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
# Deploy the 'dist' folder to your hosting service
```

### Supabase Functions
```bash
supabase functions deploy
```

### Smart Contracts (Mainnet)
```bash
anchor deploy --provider.cluster mainnet-beta
```

## 🛠️ Troubleshooting

### Common Issues

1. **Token metadata not showing**
   - Ensure Metaplex metadata account is created
   - Verify metadata URI is accessible
   - Check Helius API key is valid

2. **Transactions failing**
   - Increase priority fees during network congestion
   - Verify wallet has sufficient SOL for fees
   - Check program IDs match deployment

3. **WebSocket connection issues**
   - Ensure Supabase realtime is enabled
   - Check firewall/proxy settings
   - Verify API keys are correct

## 📈 Roadmap

### Phase 1 - Core Platform (Current)
- ✅ Token creation with bonding curves
- ✅ Basic trading functionality
- ✅ Achievement system framework
- 🔄 AI integration for token generation

### Phase 2 - Gamification
- 📅 Weekly achievement rotations
- 📅 Tournament system (CryptoKombat)
- 📅 Guild/team features
- 📅 NFT achievement badges

### Phase 3 - Expansion
- 📅 Cross-chain support
- 📅 Mobile app (React Native)
- 📅 Advanced DeFi features
- 📅 DAO governance

### Phase 4 - Ecosystem
- 📅 Developer SDK
- 📅 White-label solutions
- 📅 Institutional features
- 📅 Global tournaments with major prizes

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Solana Foundation for blockchain infrastructure
- Metaplex for token metadata standards
- Helius Labs for RPC services
- The DeFi community for inspiration

## 📞 Contact & Support

- **Website**: [moonforge.io](https://moonforge.io)
- **Twitter**: [@moonforge_ai](https://twitter.com/moonforge_ai)
- **Discord**: [Join our community](https://discord.gg/moonforge)
- **Email**: support@moonforge.io

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Trading cryptocurrencies carries significant risk. Always do your own research and never invest more than you can afford to lose.

---

<div align="center">
  <strong>Built with 🚀 by the Moonforge Team</strong>
  <br>
  <em>Taking DeFi to the Moon and Beyond</em>
</div>