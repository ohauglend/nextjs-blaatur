# 🎭 Blåtur - Mystery Trip App

A state-driven web application for managing mystery trips with personalized participant experiences. Built with Next.js and TypeScript for 8 participants (3 hosts, 5 guests).

## 🚀 Features

### 🎛️ Host Control Panel
- **Main Dashboard**: Central control for trip hosts (Oskar, Odd, Aasmund)
- **Participant Management**: Access to all participant screens
- **Real-time State Monitoring**: See what each participant sees

### 👤 Personalized Experience (Emilie, Mathias, Brage, Sara, Johanna)
- **Dynamic Header**: Personal emoji, name, and current trip state
- **Info Panel**: Hotel details, photo sharing, weather, emergency contacts  
- **State-Based Content**: Different components based on trip progress

### 📱 Trip States
1. **Pre-Trip**: Countdown timer + destination guessing
2. **Packing**: Personalized packing lists
3. **Flight**: Boarding pass QR codes + flight details
4. **Day 1**: Team challenges (4 teams of 2) + restaurant reservations
5. **Day 2**: Group competitions (2 teams of 4)
6. **Flight Home**: Return booking + Google Drive access
7. **After Trip**: Thank you screen + photo sharing

### ✅ Implemented Features
- **State Management**: Simple state-driven UI without backend
- **Team Activities**: Color-coded teams with restaurant integration
- **Mobile-First Design**: Optimized for phone usage during travel
- **Asset Management**: Photos, QR codes, bookings per participant
- **Emergency Info**: Contact details + hotel information

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture

### URL Structure
```
/                    # Landing page with participant selection
/emilie             # Emilie's personal page
/mathias            # Mathias's personal page
/brage              # Brage's personal page
/sara               # Sara's personal page
/johanna            # Johanna's personal page
/oskar              # Oskar's personal page (host)
/odd                # Odd's personal page (host)
/aasmund            # Aasmund's personal page (host)
```

### Technical Decisions

#### ✅ No Authentication System
- **Why**: Fixed participant list, avoid complexity
- **How**: URL-based access with bookmarkable links
- **Benefits**: No passwords, easy sharing, instant access

#### ✅ Static-First Architecture
- **Why**: Simple deployment, low maintenance
- **How**: Client-side time checking, JSON data files
- **Benefits**: Fast loading, no server costs, reliable

#### ✅ Time-Based Content
- **Why**: No manual intervention needed during trip
- **How**: JavaScript Date comparison with UTC timestamps
- **Benefits**: Automated reveals, works across timezones

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
