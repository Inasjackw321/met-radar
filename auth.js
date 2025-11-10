// Authentication Handler for NexRadar
// Google OAuth integration

// Configuration
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with actual client ID

// User state
let currentUser = null;

// Initialize Google Sign-In
function initializeGoogleSignIn() {
    // For demo purposes, we'll use a simple click handler
    // In production, replace with actual Google OAuth implementation

    const googleBtn = document.getElementById('googleSignIn');
    const demoBtn = document.getElementById('demoMode');

    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleSignIn);
    }

    if (demoBtn) {
        demoBtn.addEventListener('click', handleDemoMode);
    }

    // Check if user is already logged in
    checkExistingSession();
}

// Handle Google Sign-In
async function handleGoogleSignIn() {
    // In production, implement actual Google OAuth flow
    // For now, we'll simulate authentication

    try {
        // Simulate Google sign-in with a prompt
        const email = prompt('Enter your Google email (for demo):');

        if (email && email.includes('@')) {
            const user = {
                email: email,
                name: email.split('@')[0],
                picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=3b82f6&color=fff`,
                provider: 'google',
                loginTime: new Date().toISOString()
            };

            // Save user session
            saveUserSession(user);
            currentUser = user;

            // Redirect to main app
            window.location.href = 'radar.html';
        }
    } catch (error) {
        console.error('Sign-in error:', error);
        alert('Sign-in failed. Please try again.');
    }
}

// Handle Demo Mode
function handleDemoMode() {
    const user = {
        email: 'guest@nexradar.com',
        name: 'Guest User',
        picture: 'https://ui-avatars.com/api/?name=Guest&background=6366f1&color=fff',
        provider: 'demo',
        loginTime: new Date().toISOString()
    };

    // Save session
    saveUserSession(user);
    currentUser = user;

    // Redirect to main app
    window.location.href = 'radar.html';
}

// Save user session to localStorage
function saveUserSession(user) {
    try {
        localStorage.setItem('nexradar_user', JSON.stringify(user));
        localStorage.setItem('nexradar_session', Date.now().toString());
    } catch (error) {
        console.error('Failed to save session:', error);
    }
}

// Check for existing session
function checkExistingSession() {
    try {
        const userStr = localStorage.getItem('nexradar_user');
        const sessionTime = localStorage.getItem('nexradar_session');

        if (userStr && sessionTime) {
            const user = JSON.parse(userStr);
            const sessionAge = Date.now() - parseInt(sessionTime);

            // Session valid for 7 days
            if (sessionAge < 7 * 24 * 60 * 60 * 1000) {
                currentUser = user;
                // Auto-redirect if on login page
                if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
                    window.location.href = 'radar.html';
                }
                return user;
            } else {
                // Session expired
                clearUserSession();
            }
        }
    } catch (error) {
        console.error('Session check failed:', error);
    }
    return null;
}

// Clear user session
function clearUserSession() {
    try {
        localStorage.removeItem('nexradar_user');
        localStorage.removeItem('nexradar_session');
        localStorage.removeItem('nexradar_preferences');
        currentUser = null;
    } catch (error) {
        console.error('Failed to clear session:', error);
    }
}

// Get current user
function getCurrentUser() {
    if (!currentUser) {
        const userStr = localStorage.getItem('nexradar_user');
        if (userStr) {
            currentUser = JSON.parse(userStr);
        }
    }
    return currentUser;
}

// Sign out
function signOut() {
    clearUserSession();
    window.location.href = 'index.html';
}

// User preferences
function saveUserPreferences(prefs) {
    try {
        const existing = getUserPreferences();
        const updated = { ...existing, ...prefs };
        localStorage.setItem('nexradar_preferences', JSON.stringify(updated));
    } catch (error) {
        console.error('Failed to save preferences:', error);
    }
}

function getUserPreferences() {
    try {
        const prefsStr = localStorage.getItem('nexradar_preferences');
        return prefsStr ? JSON.parse(prefsStr) : getDefaultPreferences();
    } catch (error) {
        console.error('Failed to load preferences:', error);
        return getDefaultPreferences();
    }
}

function getDefaultPreferences() {
    return {
        radarSource: 'rainviewer', // 'rainviewer' or 'nexrad'
        showWarnings: true,
        showMesonet: true,
        radarOpacity: 0.7,
        autoRefresh: true,
        refreshInterval: 300000, // 5 minutes
        defaultLocation: null,
        theme: 'dark'
    };
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGoogleSignIn);
} else {
    initializeGoogleSignIn();
}

// Export functions for use in other scripts
window.AuthService = {
    getCurrentUser,
    signOut,
    saveUserPreferences,
    getUserPreferences,
    checkExistingSession
};
