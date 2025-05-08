# HVAC System Diagnostics Assistant

A Progressive Web App (PWA) that helps HVAC technicians diagnose system issues, even when offline.

## Features

- **Intelligent Diagnostics**: Analyze HVAC symptoms and provide troubleshooting steps
- **Offline Capability**: Full functionality even without internet connection
- **System Support**: Covers central AC, heat pumps, furnaces, boilers, mini-splits, and package units
- **Reference Library**: Access to troubleshooting guides and manuals
- **Saved Reports**: Store and review past diagnostic reports

## Getting Started

### Prerequisites

- Node.js 16.0 or higher
- npm 8.0 or higher

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/hvac-diagnostics-assistant.git
   cd hvac-diagnostics-assistant
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser

### Building for Production

```
npm run build
```

This builds the app for production to the `build` folder. The build is minified and optimized for best performance.

## Project Structure

```
hvac-diagnostics-assistant/
├── public/
│   ├── favicon.ico
│   ├── index.html
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   ├── offline.html
│   ├── robots.txt
│   └── data/
│       └── common-issues.json
├── src/
│   ├── components/
│   │   ├── DiagnosticForm.js
│   │   ├── DiagnosticResult.js
│   │   ├── Footer.js
│   │   ├── Header.js
│   │   └── LoadingSpinner.js
│   ├── pages/
│   │   ├── DiagnosticTool.js
│   │   ├── OfflinePage.js
│   │   ├── ReferenceLibrary.js
│   │   └── SavedDiagnostics.js
│   ├── utils/
│   │   ├── offlineDataHandler.js
│   │   └── storage.js
│   ├── server/  (for backend implementation)
│   │   └── api.js
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   ├── index.css
│   └── service-worker.js
├── package.json
└── README.md
```

## PWA Features

This application is a Progressive Web App (PWA), which means it:

- Can be installed on devices like a native app
- Works offline through service workers
- Provides a fast, app-like experience
- Syncs data when connection is restored

## Implementation Notes

### Offline Functionality

The app utilizes service workers and local storage to provide full offline functionality:

- Service worker caches critical assets and API responses
- Local storage saves diagnostic data for offline access
- Fallback diagnostic algorithms work without internet connection

### OpenAI Integration

When online, the app uses OpenAI's API to provide intelligent diagnostics. Configure your OpenAI API key in the backend service for this functionality.

### Customization

You can customize the diagnostic database by editing the `common-issues.json` file in the `public/data` directory.

## Deployment

### Backend Deployment

1. Set up your environment variables
2. Deploy to your preferred hosting service (Heroku, AWS, etc.)

### Frontend Deployment

1. Build the application
   ```
   npm run build
   ```

2. Deploy the `build` directory to a static hosting service like Netlify, Vercel, or GitHub Pages

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Create React App for the initial project setup
- OpenAI for providing the API for intelligent diagnostics
- Workbox for PWA capabilities
