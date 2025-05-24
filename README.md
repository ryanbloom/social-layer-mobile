
# Social Layer Mobile

A React Native mobile app for the Social Layer event management platform. This app allows users to discover events, manage their RSVPs, view event calendars, and interact with the community.

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

## Development

### Code Style

- Follow TypeScript best practices
- Use consistent naming conventions
- Comment complex logic
- Keep components small and focused

### Key Components

- **EventCard**: Displays event information in a card layout
- **Button**: Reusable button component with multiple variants
- **Badge**: Status indicators for events
- **Card**: Container component with shadow and styling

### API Integration

The app uses both REST and GraphQL APIs:

- **REST**: Authentication, profile management, file uploads
- **GraphQL**: Event data, real-time updates, complex queries

### State Management

- **React Query**: Server state management, caching, and synchronization
- **AsyncStorage**: Local storage for authentication tokens and preferences
- **React Navigation**: Navigation state management

## Features to Implement

### High Priority
- [ ] Real authentication with backend
- [ ] Real API integration
- [ ] RSVP functionality
- [ ] Event creation flow
- [ ] Push notifications

### Medium Priority
- [ ] Event search and filtering
- [ ] Social features (following, messaging)
- [ ] Event sharing
- [ ] Offline support
- [ ] Performance optimizations

### Low Priority
- [ ] Maps integration for event locations
- [ ] Advanced calendar features
- [ ] Dark mode support
- [ ] Accessibility improvements

## API Endpoints

### REST Endpoints
- `GET /profile/me` - Get current user profile
- `POST /profile/update` - Update user profile
- `GET /event/get` - Get event details
- `POST /event/create` - Create new event
- `POST /service/upload_image` - Upload images

### GraphQL Queries
- `events` - Fetch events with filtering
- `events_by_pk` - Get single event by ID
- `participants` - Get event participants
- `profiles` - Search user profiles

## Contributing

1. Create a feature branch from `main`
2. Make your changes following the code style guidelines
3. Test your changes on both iOS and Android
4. Submit a pull request with a clear description

## Troubleshooting

### Common Issues

1. **Metro bundler issues**: Clear cache with `npx expo start --clear`
2. **iOS simulator not working**: Reset simulator or restart it
3. **Android emulator issues**: Check Android Studio setup
4. **Network requests failing**: Verify API endpoints in environment variables

### Performance Tips

- Use `React.memo` for expensive components
- Implement lazy loading for large lists
- Optimize images with proper sizing
- Use React Query for efficient data fetching

## License

This project is part of the Social Layer platform. See the main repository for license information.
