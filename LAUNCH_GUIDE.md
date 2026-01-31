# 🚀 Sabia Investment Properties - Launch Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Gemini API Key (optional - for AI features)

### Launch Commands

#### Development Mode (Recommended for Testing)
```bash
npm start
```
This will start both the backend server (port 3009) and frontend dev server (port 3000) automatically.

#### Manual Launch
```bash
# Terminal 1 - Backend Server
npm run server

# Terminal 2 - Frontend Development
npm run dev
```

#### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Application URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3009
- **API Health Check**: http://localhost:3009/health

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root for AI features:
```
API_KEY=your_gemini_api_key_here
```

### Database
- Uses SQLite database (`sabia.db`)
- Auto-created on first run
- Fallback to memory mode if database fails

## 📱 Features Ready for Launch

### ✅ Core Features
- Property Management (CRUD operations)
- Project & Contractor Tracking
- Financial Analysis Dashboard
- Communication Logging
- Image Upload & Processing (including HEIC)
- CSV Import/Export
- Offline Mode Support

### ✅ Technical Features
- Responsive Design (Mobile/Desktop)
- Real-time Server Connectivity
- Splash Screen with Logo
- TypeScript Support
- Hot Module Replacement (Dev Mode)

### 🤖 AI Features (Requires API Key)
- Property Deal Analysis
- Automated Email Drafting
- Market Valuation Reports

## 🎯 System Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + SQLite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Charts**: Recharts
- **AI**: Google Gemini API

## 📊 Database Structure
- Properties (real estate investments)
- Contractors (service providers)
- Work Items (renovation tasks)
- Communication Logs (interactions)
- Property Documents (files/images)

## 🔒 Security Notes
- API key validation for AI features
- CORS configuration
- Input sanitization
- File upload restrictions

## 🚨 Troubleshooting

### Port Conflicts
- Frontend defaults to port 3000
- Backend defaults to port 3009
- Use `PORT=3009 npm run server` to change backend port

### Database Issues
- System will fallback to memory mode if SQLite fails
- Data persists only in memory mode during session

### AI Features Not Working
- Check `.env` file contains valid Gemini API key
- Verify network connectivity
- Check browser console for API errors

## 📈 Performance
- Build size: ~914KB (gzipped: 242KB)
- Lazy loading implemented
- Image optimization included
- Offline caching available

## 🎨 Branding
- Custom splash screen with logo
- Professional color scheme
- Consistent UI/UX design
- Mobile-responsive layout

---

**Ready for Launch!** 🎉

The system is fully configured and tested. Run `npm start` to begin using Sabia Investment Properties.
