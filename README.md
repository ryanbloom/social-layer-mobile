
# Social Layer Mobile

A React Native mobile app for the Social Layer event management platform. This app allows users to discover events, manage their RSVPs, view event calendars, and interact with the community.

Note: the app, including this README, was created almost entirely by Claude Code with minimal human oversight.

## Features

- **Event Discovery**: Browse and search for upcoming events
- **Calendar View**: See events in a monthly calendar layout
- **Event Details**: View comprehensive event information with RSVP functionality
- **Profile Management**: Manage user profiles and view event history
- **My Events**: Track hosted, attended, and starred events
- **Authentication**: Secure user authentication flow

## Tech Stack

- **React Native** with Expo
- **TypeScript** for type safety
- **React Navigation** for navigation
- **React Query** for data fetching and caching
- **Apollo Client** for GraphQL
- **React Native Vector Icons** for icons
- **AsyncStorage** for local data persistence

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Badge.tsx
│   └── EventCard.tsx
├── navigation/          # Navigation configuration
│   └── AppNavigator.tsx
├── screens/            # Screen components
│   ├── DiscoverScreen.tsx
│   ├── CalendarScreen.tsx
│   ├── MyEventsScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── EventDetailScreen.tsx
│   ├── CreateEventScreen.tsx
│   └── AuthScreen.tsx
├── services/           # API and external services
│   └── api.ts
├── types/              # TypeScript type definitions
│   └── index.ts
└── utils/              # Utility functions
    └── dateUtils.ts
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI: `npm install -g @expo/cli`
- iOS Simulator (for iOS development) or Android Studio (for Android development)

### Installation

1. Navigate to the mobile app directory:
   ```bash
   cd social-layer-mobile
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your API endpoints:
   ```
   EXPO_PUBLIC_API_URL=https://your-api-url.com
   EXPO_PUBLIC_GRAPH_URL=https://your-graphql-endpoint.com
   ```

### Running the App

1. Start the Expo development server:
   ```bash
   npm start
   ```

2. Run on iOS simulator:
   ```bash
   npm run ios
   ```

3. Run on Android emulator:
   ```bash
   npm run android
   ```

4. Run on web (for testing):
   ```bash
   npm run web
   ```
