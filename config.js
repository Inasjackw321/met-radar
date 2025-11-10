// NexRadar Configuration
// Replace with your actual API keys and client IDs

const APP_CONFIG = {
    // Google OAuth Configuration
    // Get your Client ID from: https://console.cloud.google.com/
    // 1. Create a new project
    // 2. Enable Google+ API
    // 3. Create OAuth 2.0 Client ID
    // 4. Add authorized JavaScript origins: http://localhost:8000
    // 5. Copy the Client ID below
    google: {
        clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
        // For testing, you can use the demo mode
        useDemo: true // Set to false when you have a real client ID
    },

    // Radar APIs
    radar: {
        nexrad: {
            reflectivity: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
            velocity: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0v.cgi',
            composite: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi'
        },
        rainviewer: 'https://api.rainviewer.com/public/weather-maps.json'
    },

    // Weather APIs
    weather: {
        nwsAlerts: 'https://api.weather.gov/alerts/active',
        nwsAlertsProxy: 'https://corsproxy.io/?', // CORS proxy for NWS API
        geocoding: 'https://nominatim.openstreetmap.org/search'
    },

    // Map Configuration
    map: {
        defaultCenter: [39.8283, -98.5795], // Geographic center of US
        defaultZoom: 5,
        maxZoom: 19,
        minZoom: 3
    },

    // Update intervals (milliseconds)
    intervals: {
        radar: 120000,        // 2 minutes
        warnings: 60000,      // 1 minute
        activity: 30000,      // 30 seconds
        mesonet: 300000       // 5 minutes
    },

    // Weather Activity Score weights
    activityWeights: {
        tornadoWarning: 50,
        severeThunderstormWarning: 30,
        flashFloodWarning: 25,
        winterStormWarning: 20,
        otherWarning: 10,
        radarIntensity: 0.5,  // per dBZ above threshold
        velocitySignature: 30  // rotation detected
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APP_CONFIG;
}
