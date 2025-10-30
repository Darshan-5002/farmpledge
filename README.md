# FreshPledge - Blockchain Dairy Marketplace

A revolutionary e-commerce platform connecting dairy farmers directly with consumers through blockchain technology.

## 🚀 Features

- **Direct Farm-to-Consumer**: Eliminate middlemen for fair pricing
- **Blockchain Authentication**: Every product verified on blockchain
- **Dual User Roles**: Separate interfaces for farmers and consumers
- **Smart Contract Payments**: Automated, secure transactions
- **Real-time Tracking**: Order and inventory management
- **Geolocation Services**: Location-based product discovery

## 🛠️ Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for blazing fast development
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **React Router** for navigation
- **TanStack Query** for data fetching

### Backend (Lovable Cloud / Supabase)
- **PostgreSQL** database
- **Authentication** (Email, Phone, Google)
- **Storage** for product images
- **Edge Functions** for serverless logic
- **Row Level Security** for data protection

### Blockchain
- **Web3.js** for blockchain interactions
- **MetaMask** integration
- **Smart Contracts** for payments and authentication

### Third-Party Services
- Google Maps API (location services)
- Stripe API (backup payments)
- IPFS (decentralized image storage)
- SendGrid (email notifications)

## 📋 Prerequisites

- Node.js 18 or higher
- npm or bun package manager
- Supabase account (or use Lovable Cloud)
- MetaMask wallet for blockchain features

## 🔧 Local Development Setup

### 1. Clone and Install

```bash
# Install dependencies
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

**Required immediately:**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
```

**Phase-specific variables** (add when implementing those features):
- `VITE_WEB3_NETWORK` - Blockchain network (Phase 6)
- `VITE_CONTRACT_ADDRESS` - Smart contract address (Phase 6)
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps (Phase 7)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe payments (Phase 7)

### 3. Backend Secrets

**IMPORTANT**: Never put secret keys in `.env.local`!

Backend secrets should be managed via Lovable Cloud Secrets:
- `STRIPE_SECRET_KEY`
- `SENDGRID_API_KEY`
- `SMS_API_KEY`
- `WEB3_PRIVATE_KEY`

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:8080`

### 5. Build for Production

```bash
npm run build
```

## 📁 Project Structure

```
src/
├── components/       # Reusable UI components
│   └── ui/          # shadcn/ui components
├── pages/           # Route pages
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── index.css        # Global styles & design tokens
└── main.tsx         # App entry point

supabase/
├── functions/       # Edge functions
└── migrations/      # Database migrations
```

## 🗺️ Implementation Phases

See [PHASES.md](./PHASES.md) for detailed implementation roadmap.

**Current Phase**: Phase 1 - Foundation & Design System ✓

**Next Phase**: Phase 2 - Authentication & User Management

## 🎨 Design System

The project uses a semantic token system based on the FreshPledge brand:

- **Primary Color**: Fresh Green (#4CAF50) - Nature, freshness
- **Secondary Color**: Cream White (#FFF8E1) - Dairy products
- **Accent Color**: Blockchain Blue (#2196F3) - Technology

All colors are defined as HSL values in `src/index.css` for easy theming.

## 🔐 Security

- All sensitive keys stored in backend (Lovable Cloud Secrets)
- Row Level Security (RLS) on all database tables
- HTTPS/SSL encryption in production
- Input validation and sanitization
- CORS properly configured

## 📱 Progressive Web App

FreshPledge is designed as a PWA for:
- Offline functionality
- Mobile-first experience
- App-like interface
- Push notifications

## 🤝 Contributing

1. Review [PHASES.md](./PHASES.md) for current implementation status
2. Create feature branches from `main`
3. Follow existing code style and component patterns
4. Test thoroughly before submitting

## 📄 License

This project is part of the FreshPledge platform.

## 🆘 Support

For issues or questions:
- Check [PHASES.md](./PHASES.md) for implementation status
- Review `.env.example` for configuration help
- Contact development team

## 🎯 Roadmap

- [x] Phase 1: Foundation & Design System
- [ ] Phase 2: Authentication & User Management
- [ ] Phase 3: Farmer Features
- [ ] Phase 4: Consumer Features
- [ ] Phase 5: Core Business Logic
- [ ] Phase 6: Blockchain Integration
- [ ] Phase 7: Third-Party Integrations
- [ ] Phase 8: Advanced Features & Polish

---

Built with ❤️ for farmers and consumers
