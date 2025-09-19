# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Value Investor's Dashboard** - a single-page web application that implements the "Lao Tang" valuation methodology for stock analysis. The application helps users calculate ideal buy/sell prices based on projected earnings and P/E ratios.

## Architecture

- **Frontend**: Modular JavaScript architecture with lazy loading
- **Backend**: Netlify serverless function (`netlify/functions/gemini-proxy.js`) with caching and rate limiting
- **Database**: Firebase Firestore for user authentication and watchlist storage
- **AI Integration**: Google Gemini API for business analysis and profit forecasting
- **Styling**: Local Tailwind CSS build with custom components
- **Caching**: Service Worker for static asset caching and offline support

## Development Commands

```bash
# Install dependencies
npm install

# Build optimized CSS
npm run build-css

# Watch CSS changes during development
npm run watch-css

# Local development with Netlify
npm run dev

# Deploy to production (builds CSS and deploys)
npm run deploy
```

## Environment Variables

Required for full functionality:

### Netlify Environment (Production)
- `GEMINI_API_KEY`: Google Gemini API key for AI features

### Local Development (.env.local)
- Copy `.env.template` to `.env.local` and fill in values
- Firebase config can be moved to environment variables for better security

## Code Architecture

### JavaScript Modules
- `js/app.js`: Main application controller
- `js/config.js`: Firebase configuration
- `js/dom.js`: DOM element references
- `js/toast.js`: Toast notification system
- `js/loading.js`: Loading state management
- `js/firebase-loader.js`: Lazy loading Firebase modules
- `js/api.js`: Enhanced API calls with caching and rate limiting
- `js/validation.js`: Real-time form validation
- `js/request-manager.js`: Request caching and deduplication

### Key Features
- **Lazy Loading**: Firebase modules load only when needed
- **Request Caching**: Client-side and server-side caching with TTL
- **Rate Limiting**: Both client and server-side rate limiting
- **Toast Notifications**: Replace alert() calls with professional notifications
- **Form Validation**: Real-time validation with error messaging
- **Service Worker**: Offline support and static asset caching
- **Progressive Loading**: Enhanced loading states for all async operations

### Core Valuation Logic
Located in `js/app.js` calculateValuation() method:
- **Ideal Buy Price**: (Future Profit × Reasonable P/E × 0.5) / Shares
- **Obvious Sell Price**: Minimum of:
  1. (Current Profit × Overvalued P/E) / Shares
  2. (Future Profit × 150) / Shares

This conservative dual-method approach ensures exit before extreme overvaluation.

### Authentication & Data Storage
- Firebase Auth for user login/logout
- Firestore collections: `artifacts/{appId}/users/{userId}/stocks`
- Real-time watchlist updates using Firestore snapshots

## Optimization Features

### Performance
- Modular JavaScript with lazy loading
- Local Tailwind build (only used classes)
- Service Worker caching with multiple strategies
- Request deduplication and caching
- Font loading optimization

### User Experience
- Toast notification system
- Progressive loading states
- Real-time form validation
- Offline support via Service Worker
- Automatic cache invalidation

### Security & API
- Server-side rate limiting (20 requests/minute per IP)
- Request caching (10min for analysis, 1hr for forecasts)
- Firebase config can be moved to environment variables
- CORS headers properly configured

## Technical Notes

- Uses ES6 modules with dynamic imports
- Service Worker implements cache-first, network-first, and stale-while-revalidate strategies
- Real-time validation with debouncing
- Responsive design with Tailwind CSS
- Dark theme optimized for financial data
