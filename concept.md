# Trip Concept: Blåtur Mystery Adventure

## Overview
A surprise trip application called "Blåtur" for 8 participants where 3 hosts control the information flow and 5 guests experience a mystery journey through a state-driven mobile-first web application.

## Participants
- **Hosts (Information Controllers)**: Oskar, Odd, Aasmund
  - Have full knowledge of itinerary and destination
  - Control what information is revealed and when
- **Guests (Trip Participants)**: Emilie, Mathias, Brage, Sara, Johanna
  - No prior knowledge of destination or itinerary
  - Receive information progressively through the app

## Application Structure

### Host Control Panel
- **Main Dashboard**: Central control for hosts only (Oskar, Odd, Aasmund)
- **Participant Management**: Access to all participant screens
- **State Control**: Ability to advance trip phases manually if needed
- **Overview**: Monitor all participants' progress and team assignments

### Participant Experience
Each participant gets a personalized mobile-first interface with:

#### Header Section
- **Profile Display**: Emoji, name, and personal photo
- **State Indicator**: Current trip phase (Pre-trip, Flight, Day 1, etc.)
- **Info Panel**: Hotel details, photo sharing links, emergency contacts, weather

#### Dynamic Content (State-Based)
- **Pre-Trip**: Countdown timer, destination guessing, packing list
- **Flight**: QR code for boarding pass, gate information
- **Day Activities**: Team assignments, challenges, restaurant reservations
- **Return Flight**: Full booking details and Google Drive access
- **Post-Trip**: Thank you screen and memory sharing

## Core Features

### Team-Based Activities
**Day 1 - Pairs (4 Teams of 2)**
- Color-coded teams: Red, Yellow, Blue, Green
- Individual routes and challenges for each pair
- Coordinated lunch meetups when convenient
- Shared dinner reservation for all teams

**Day 2 - Groups (2 Teams of 4)**
- Larger team activities: Red Team vs Yellow Team
- More complex challenges requiring coordination
- Strategic lunch and dinner planning

### Interactive Components
- **Destination Guessing**: Pre-trip engagement feature
- **Daily Voting**: "Most drunk", "Most outgoing", custom categories
- **Check-in System**: Location-based progress tracking
- **Restaurant Integration**: Google Maps links with reservation times
- **Photo Sharing**: Integrated links to Google Photos/iCloud

### Real-Time Information
- **Flight Details**: QR codes and booking confirmations
- **Weather Updates**: Daily weather for planned activities  
- **Emergency Contacts**: Host phone numbers and local emergency info
- **Hotel Information**: Address, check-in details, amenities

## Technical Requirements

### Time-Based Content Delivery
- Content visibility controlled by predetermined schedules
- Different phases unlock at specific dates/times
- No manual intervention required from hosts during trip

### Individual Personalization
- Each participant sees only their personalized content
- Packing lists vary by person based on planned activities
- Individual challenges and voting history

### Offline Capability
- Core content should work without internet
- Essential trip information cached locally
- Graceful degradation for connectivity issues

## Content Management
- Static content deployment through GitHub
- Time-triggered visibility without backend complexity
- Host-controlled content updates through repository commits

## Privacy & Access
- No traditional login/signup required
- Access control through unique participant URLs or codes
- Individual content scoping without user accounts
