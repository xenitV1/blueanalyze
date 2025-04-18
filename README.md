# BlueAnalyze

BlueAnalyze is a comprehensive follower analysis tool developed for Bluesky users. It helps you analyze your follow relationships, identify users who don't follow you back, and strategically manage your account.

[![Deploy to Netlify](https://github.com/vortic-0/blueanalyze/actions/workflows/main.yml/badge.svg)](https://github.com/vortic-0/blueanalyze/deployments/production)

![BlueAnalyze Logo](public/blueanalyze.png)

## 🚀 Features

- **Follower Analysis**: Analyze your followers and following in detail
- **Non-Follower Detection**: Instantly identify accounts that don't follow you back
- **Batch Unfollow**: Unfollow accounts that don't follow you back in bulk
- **Target-Based Following**: Follow a specific user's followers or following in bulk
- **Session Management**: Secure login using App Password and token management
- **Multilingual Support**: English and Turkish language support

## 📋 Data Schema

BlueAnalyze uses the following core data structures:

### BlueSkyUser

```typescript
interface BlueSkyUser {
  did: string;              // Unique user identifier
  handle: string;           // Username (e.g., user.bsky.social)
  displayName?: string;     // Display name
  avatar?: string;          // Profile picture URL
  description?: string;     // Profile description
  indexedAt?: string;       // Indexing date
  followersCount?: number;  // Number of followers
  followsCount?: number;    // Number of following
}
```

### FollowerAnalysisResult

```typescript
interface FollowerAnalysisResult {
  notFollowingBack: BlueSkyUser[];  // Accounts that don't follow you back
  notFollowedBack: BlueSkyUser[];   // Accounts you don't follow back
  mutuals: BlueSkyUser[];           // Mutual follows
  followerCount: number;            // Total number of your followers
  followingCount: number;           // Total number of accounts you follow
}
```

### AuthResponse

```typescript
interface AuthResponse {
  accessJwt: string;        // Access token for API requests
  refreshJwt: string;       // Token used for refreshing
  handle: string;           // Username
  did: string;              // Unique user identifier
  email?: string;           // Email address (if any)
  emailConfirmed?: boolean; // Email confirmation status
}
```

## 🔄 Workflow

BlueAnalyze's operational logic includes the following steps:

1. **Authentication**: User logs in with Bluesky username and App Password
2. **Follower Analysis**: All followers and following are retrieved via API
3. **Analysis Results**: Follow relationships are analyzed and categorized
4. **Operations**: User can perform various actions based on the analysis (unfollow, follow, etc.)

### API Requests

The application uses the Bluesky ATP (AT Protocol) API:

- `app.bsky.graph.getFollowers`: To get followers
- `app.bsky.graph.getFollows`: To get following
- `app.bsky.graph.follow`: To follow a user
- `app.bsky.graph.unfollow`: To unfollow a user
- `app.bsky.actor.searchActors`: To search for users

## 🛠️ Setup and Development

### Prerequisites

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher

### Installation

```bash
# Clone the repository
git clone https://github.com/vortic-0/blueanalyze.git
cd blueanalyze

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev
```

The application will run at `http://localhost:5173`.

### Build

```bash
# Build for production
npm run build
```

## 🌐 Deployment

BlueAnalyze is hosted on [Netlify](https://www.netlify.com/). To deploy your own copy:

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy to Netlify
netlify deploy --prod
```

## 🔐 Security Notes

- BlueAnalyze only stores user data in browser IndexedDB
- The application does not send passwords or credentials to any external servers
- All API requests are made directly to the Bluesky API
- Using an App Password is recommended to protect your main password

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Contributors

- [vortic0](https://bsky.app/profile/vortic0.bsky.social) - Developer

## 📧 Contact

For questions or suggestions, you can reach out via [GitHub Issues](https://github.com/vortic-0/blueanalyze/issues).

---

🔹 BlueAnalyze is an unofficial tool and not directly affiliated with Bluesky Social.

Built with Cursor. Thanks to the Cursor team
