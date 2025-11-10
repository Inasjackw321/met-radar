// NexRadar Authentication - Real Google OAuth Implementation
// Using Google Identity Services (GIS)

let currentUser = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check if config is loaded
    if (typeof APP_CONFIG === 'undefined') {
        console.error('APP_CONFIG not loaded');
        return;
    }

    // Check for existing session
    const existingUser = checkExistingSession();
    if (existingUser && (window.location.pathname.endsWith('index.html') || window.location.pathname === '/')) {
        window.location.href = 'radar.html';
        return;
    }

    // Initialize Google Sign-In
    initializeGoogleSignIn();

    // Setup demo button
    const demoBtn = document.getElementById('demoBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', handleDemoMode);
    }
});

// ============================================================================
// GOOGLE OAUTH INITIALIZATION
// ============================================================================

function initializeGoogleSignIn() {
    // Set the client ID from config
    const clientId = APP_CONFIG.google.clientId;

    // If using demo mode or no client ID, show custom button
    if (APP_CONFIG.google.useDemo || clientId === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
        console.log('Demo mode enabled - using fallback authentication');
        showCustomGoogleButton();
        return;
    }

    // Update the data-client_id attribute
    const gOnload = document.getElementById('g_id_onload');
    if (gOnload) {
        gOnload.setAttribute('data-client_id', clientId);
    }

    // Initialize Google Sign-In button
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true
        });

        // Render the button
        google.accounts.id.renderButton(
            document.querySelector('.g_id_signin'),
            {
                theme: 'filled_blue',
                size: 'large',
                type: 'standard',
                text: 'continue_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: 400
            }
        );

        // Optional: Show one-tap dialog
        // google.accounts.id.prompt();

        console.log('Google Sign-In initialized');
    } else {
        // Google Identity Services not loaded, show custom button
        console.warn('Google Identity Services not loaded, using fallback');
        showCustomGoogleButton();
    }
}

function showCustomGoogleButton() {
    // Hide the official Google button div
    const officialBtn = document.querySelector('.g_id_signin');
    if (officialBtn) {
        officialBtn.style.display = 'none';
    }

    // Show custom button
    const customBtn = document.getElementById('customGoogleBtn');
    if (customBtn) {
        customBtn.style.display = 'flex';
        customBtn.addEventListener('click', handleCustomGoogleSignIn);
    }
}

// ============================================================================
// GOOGLE OAUTH CALLBACK
// ============================================================================

function handleCredentialResponse(response) {
    showLoading(true);

    try {
        // Decode the JWT token to get user info
        const credential = response.credential;
        const payload = parseJwt(credential);

        const user = {
            id: payload.sub,
            email: payload.email,
            name: payload.name,
            given_name: payload.given_name,
            family_name: payload.family_name,
            picture: payload.picture,
            provider: 'google',
            credential: credential,
            loginTime: new Date().toISOString()
        };

        // Save session
        saveUserSession(user);
        currentUser = user;

        console.log('Google Sign-In successful:', user.email);

        // Redirect to radar page
        setTimeout(() => {
            window.location.href = 'radar.html';
        }, 500);

    } catch (error) {
        console.error('Sign-in error:', error);
        showLoading(false);
        alert('Sign-in failed. Please try again.');
    }
}

// Decode JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Error parsing JWT:', error);
        return null;
    }
}

// ============================================================================
// CUSTOM GOOGLE SIGN-IN (DEMO MODE)
// ============================================================================

async function handleCustomGoogleSignIn() {
    showLoading(true);

    try {
        // In demo mode, prompt for email
        const email = prompt('Enter your email address (demo mode):');

        if (!email || !email.includes('@')) {
            showLoading(false);
            return;
        }

        const name = email.split('@')[0];
        const user = {
            id: 'demo_' + Date.now(),
            email: email,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            given_name: name,
            family_name: '',
            picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(email)}&background=3b82f6&color=fff&size=200`,
            provider: 'demo',
            loginTime: new Date().toISOString()
        };

        // Save session
        saveUserSession(user);
        currentUser = user;

        console.log('Demo sign-in successful:', user.email);

        // Redirect to radar page
        setTimeout(() => {
            window.location.href = 'radar.html';
        }, 500);

    } catch (error) {
        console.error('Demo sign-in error:', error);
        showLoading(false);
        alert('Sign-in failed. Please try again.');
    }
}

// ============================================================================
// DEMO/GUEST MODE
// ============================================================================

function handleDemoMode() {
    showLoading(true);

    const user = {
        id: 'guest_' + Date.now(),
        email: 'guest@nexradar.app',
        name: 'Guest User',
        given_name: 'Guest',
        family_name: 'User',
        picture: 'https://ui-avatars.com/api/?name=Guest&background=6366f1&color=fff&size=200',
        provider: 'guest',
        loginTime: new Date().toISOString()
    };

    // Save session
    saveUserSession(user);
    currentUser = user;

    console.log('Guest mode activated');

    // Redirect to radar page
    setTimeout(() => {
        window.location.href = 'radar.html';
    }, 500);
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

function saveUserSession(user) {
    try {
        localStorage.setItem('nexradar_user', JSON.stringify(user));
        localStorage.setItem('nexradar_session_time', Date.now().toString());
        localStorage.setItem('nexradar_session_id', user.id);
    } catch (error) {
        console.error('Failed to save session:', error);
    }
}

function checkExistingSession() {
    try {
        const userStr = localStorage.getItem('nexradar_user');
        const sessionTime = localStorage.getItem('nexradar_session_time');

        if (!userStr || !sessionTime) {
            return null;
        }

        const user = JSON.parse(userStr);
        const sessionAge = Date.now() - parseInt(sessionTime);
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

        if (sessionAge < maxAge) {
            currentUser = user;
            return user;
        } else {
            // Session expired
            clearUserSession();
            return null;
        }
    } catch (error) {
        console.error('Session check failed:', error);
        clearUserSession();
        return null;
    }
}

function clearUserSession() {
    try {
        localStorage.removeItem('nexradar_user');
        localStorage.removeItem('nexradar_session_time');
        localStorage.removeItem('nexradar_session_id');
        localStorage.removeItem('nexradar_preferences');
        currentUser = null;
    } catch (error) {
        console.error('Failed to clear session:', error);
    }
}

function getCurrentUser() {
    if (!currentUser) {
        return checkExistingSession();
    }
    return currentUser;
}

function signOut() {
    // Sign out from Google if using real OAuth
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }

    clearUserSession();
    window.location.href = 'index.html';
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

function getUserPreferences() {
    try {
        const prefsStr = localStorage.getItem('nexradar_preferences');
        return prefsStr ? JSON.parse(prefsStr) : getDefaultPreferences();
    } catch (error) {
        console.error('Failed to load preferences:', error);
        return getDefaultPreferences();
    }
}

function saveUserPreferences(prefs) {
    try {
        const existing = getUserPreferences();
        const updated = { ...existing, ...prefs };
        localStorage.setItem('nexradar_preferences', JSON.stringify(updated));
        console.log('Preferences saved');
    } catch (error) {
        console.error('Failed to save preferences:', error);
    }
}

function getDefaultPreferences() {
    return {
        // Radar sources
        nexradReflectivityEnabled: true,
        nexradVelocityEnabled: false,
        rainviewerEnabled: false,

        // Data layers
        warningsEnabled: true,
        mesonetEnabled: false,
        soundingsEnabled: false,

        // Display settings
        radarOpacity: 0.75,
        animationSpeed: 5,
        autoRefresh: true,

        // Map settings
        defaultLocation: null,
        defaultZoom: null,

        // Activity score
        showActivityScore: true,
        activityNotifications: true,

        // Theme
        theme: 'dark'
    };
}

// ============================================================================
// UTILITIES
// ============================================================================

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) {
            overlay.classList.add('active');
        } else {
            overlay.classList.remove('active');
        }
    }
}

// ============================================================================
// GLOBAL API
// ============================================================================

// Make functions available globally
window.AuthService = {
    getCurrentUser,
    signOut,
    getUserPreferences,
    saveUserPreferences,
    checkExistingSession,
    clearUserSession
};

// Make callback available globally for Google
window.handleCredentialResponse = handleCredentialResponse;

console.log('🔐 NexRadar Auth Module Loaded');
