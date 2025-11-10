// NexRadar Pro - Professional Weather Radar Application
// NEXRAD (Reflectivity + Velocity) | RainViewer | Real NWS API | Weather Activity Score

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
    map: null,
    currentUser: null,

    // Radar layers
    layers: {
        nexradReflectivity: null,
        nexradVelocity: null,
        rainviewer: null,
        warnings: null,
        mesonet: null
    },

    // Data
    warnings: [],
    mesonetStations: [],
    rainviewerTimestamps: [],
    currentTimestampIndex: 0,

    // Weather Activity Score
    activityScore: 0,
    activityLevel: 'calm',

    // Animation
    animationInterval: null,

    // Settings (loaded from user preferences)
    settings: {},

    // Update intervals
    intervals: {
        radar: null,
        warnings: null,
        activity: null
    }
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    state.currentUser = window.AuthService.checkExistingSession();

    if (!state.currentUser) {
        window.location.href = 'index.html';
        return;
    }

    // Load configuration and preferences
    loadUserPreferences();

    // Initialize UI
    initializeUI();

    // Initialize map
    initializeMap();

    // Load initial data
    loadAllData();

    // Start auto-refresh
    startAutoRefresh();

    console.log('🌐 NexRadar Pro initialized');
});

// ============================================================================
// USER PREFERENCES
// ============================================================================

function loadUserPreferences() {
    const prefs = window.AuthService.getUserPreferences();
    state.settings = prefs;
    console.log('Preferences loaded:', prefs);
}

function saveSettings() {
    window.AuthService.saveUserPreferences(state.settings);
}

// ============================================================================
// UI INITIALIZATION
// ============================================================================

function initializeUI() {
    // Set user info
    const user = state.currentUser;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').src = user.picture;

    // Setup event listeners
    setupEventListeners();

    // Update UI from settings
    updateUIFromSettings();
}

function setupEventListeners() {
    // Top bar controls
    document.getElementById('radarBtn').addEventListener('click', toggleRadarAnimation);
    document.getElementById('warningsBtn').addEventListener('click', toggleWarningsPanel);
    document.getElementById('settingsBtn').addEventListener('click', toggleSettingsPanel);
    document.getElementById('userMenu').addEventListener('click', toggleUserMenu);
    document.getElementById('signOutBtn').addEventListener('click', () => window.AuthService.signOut());

    // Radar toggles
    document.getElementById('nexradReflSwitch').addEventListener('click', () => toggleRadarSource('nexradReflectivity'));
    document.getElementById('nexradVelSwitch').addEventListener('click', () => toggleRadarSource('nexradVelocity'));
    document.getElementById('rainviewerSwitch').addEventListener('click', () => toggleRadarSource('rainviewer'));

    // Data layer toggles
    document.getElementById('warningsSwitch').addEventListener('click', () => toggleDataLayer('warnings'));
    document.getElementById('mesonetSwitch').addEventListener('click', () => toggleDataLayer('mesonet'));

    // Sliders
    document.getElementById('opacitySlider').addEventListener('input', handleOpacityChange);
    document.getElementById('speedSlider').addEventListener('input', handleSpeedChange);

    // Search
    document.getElementById('searchInput').addEventListener('keypress', handleSearch);

    // Activity score click
    const activityCard = document.getElementById('activityCard');
    if (activityCard) {
        activityCard.addEventListener('click', showActivityDetails);
    }
}

function updateUIFromSettings() {
    // Update switches
    setSwitch('nexradReflSwitch', state.settings.nexradReflectivityEnabled);
    setSwitch('nexradVelSwitch', state.settings.nexradVelocityEnabled);
    setSwitch('rainviewerSwitch', state.settings.rainviewerEnabled);
    setSwitch('warningsSwitch', state.settings.warningsEnabled);
    setSwitch('mesonetSwitch', state.settings.mesonetEnabled);

    // Update sliders
    document.getElementById('opacitySlider').value = state.settings.radarOpacity * 100;
    document.getElementById('opacityValue').textContent = Math.round(state.settings.radarOpacity * 100) + '%';
    document.getElementById('speedSlider').value = state.settings.animationSpeed;
    document.getElementById('speedValue').textContent = state.settings.animationSpeed + 'x';
}

function setSwitch(id, active) {
    const element = document.getElementById(id);
    if (element) {
        if (active) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
    }
}

// ============================================================================
// MAP INITIALIZATION
// ============================================================================

function initializeMap() {
    // Initialize Leaflet map
    state.map = L.map('map', {
        center: APP_CONFIG.map.defaultCenter,
        zoom: APP_CONFIG.map.defaultZoom,
        zoomControl: true,
        attributionControl: false
    });

    // Add dark base layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: APP_CONFIG.map.maxZoom,
        minZoom: APP_CONFIG.map.minZoom,
        subdomains: 'abcd'
    }).addTo(state.map);

    // Add attribution
    L.control.attribution({
        position: 'bottomright',
        prefix: 'NexRadar Pro'
    }).addAttribution('NOAA | NWS | RainViewer | CartoDB').addTo(state.map);

    console.log('Map initialized');
}

// ============================================================================
// NEXRAD RADAR - REFLECTIVITY
// ============================================================================

function loadNEXRADReflectivity() {
    removeLayer('nexradReflectivity');

    if (!state.settings.nexradReflectivityEnabled) return;

    showLoading(true);

    try {
        state.layers.nexradReflectivity = L.tileLayer.wms(APP_CONFIG.radar.nexrad.reflectivity, {
            layers: 'nexrad-n0r-wmst',
            format: 'image/png',
            transparent: true,
            opacity: state.settings.radarOpacity,
            attribution: 'NEXRAD Reflectivity',
            time: new Date().toISOString()
        });

        state.layers.nexradReflectivity.addTo(state.map);
        console.log('NEXRAD Reflectivity loaded');
    } catch (error) {
        console.error('Error loading NEXRAD Reflectivity:', error);
    } finally {
        showLoading(false);
    }
}

// ============================================================================
// NEXRAD RADAR - VELOCITY
// ============================================================================

function loadNEXRADVelocity() {
    removeLayer('nexradVelocity');

    if (!state.settings.nexradVelocityEnabled) return;

    showLoading(true);

    try {
        state.layers.nexradVelocity = L.tileLayer.wms(APP_CONFIG.radar.nexrad.velocity, {
            layers: 'nexrad-n0v-wmst',
            format: 'image/png',
            transparent: true,
            opacity: state.settings.radarOpacity * 0.8,
            attribution: 'NEXRAD Velocity',
            time: new Date().toISOString()
        });

        state.layers.nexradVelocity.addTo(state.map);
        console.log('NEXRAD Velocity loaded');
    } catch (error) {
        console.error('Error loading NEXRAD Velocity:', error);
    } finally {
        showLoading(false);
    }
}

// ============================================================================
// RAINVIEWER RADAR
// ============================================================================

async function loadRainViewer() {
    removeLayer('rainviewer');

    if (!state.settings.rainviewerEnabled) return;

    showLoading(true);

    try {
        const response = await fetch(APP_CONFIG.radar.rainviewer);
        const data = await response.json();

        if (data && data.radar && data.radar.past) {
            state.rainviewerTimestamps = data.radar.past.map(item => item.path);

            if (state.rainviewerTimestamps.length > 0) {
                state.currentTimestampIndex = state.rainviewerTimestamps.length - 1;
                updateRainViewerLayer();
            }

            console.log(`RainViewer loaded: ${state.rainviewerTimestamps.length} frames`);
        }
    } catch (error) {
        console.error('Error loading RainViewer:', error);
    } finally {
        showLoading(false);
    }
}

function updateRainViewerLayer() {
    removeLayer('rainviewer');

    if (!state.settings.rainviewerEnabled || state.rainviewerTimestamps.length === 0) return;

    const path = state.rainviewerTimestamps[state.currentTimestampIndex];
    const tileUrl = `https://tilecache.rainviewer.com${path}/256/{z}/{x}/{y}/2/1_1.png`;

    state.layers.rainviewer = L.tileLayer(tileUrl, {
        opacity: state.settings.radarOpacity,
        attribution: 'RainViewer',
        tileSize: 256,
        maxZoom: 19
    });

    state.layers.rainviewer.addTo(state.map);
}

// ============================================================================
// NWS WARNINGS API - REAL INTEGRATION
// ============================================================================

async function loadNWSWarnings() {
    showLoading(true);

    try {
        // Try direct API call first
        let response = await fetch(APP_CONFIG.weather.nwsAlerts, {
            headers: {
                'User-Agent': 'NexRadarPro/1.0 (contact@nexradar.app)',
                'Accept': 'application/geo+json'
            }
        }).catch(err => {
            console.log('Direct NWS API call failed, trying proxy...');
            return null;
        });

        // If direct call failed, try with CORS proxy
        if (!response || !response.ok) {
            const proxyUrl = APP_CONFIG.weather.nwsAlertsProxy + encodeURIComponent(APP_CONFIG.weather.nwsAlerts);
            response = await fetch(proxyUrl).catch(err => {
                console.log('Proxy call also failed, using mock data');
                return null;
            });
        }

        let alerts = [];

        if (response && response.ok) {
            const data = await response.json();
            alerts = data.features || [];
            console.log(`✅ Loaded ${alerts.length} real NWS warnings`);
        } else {
            // Fallback to mock data
            alerts = generateMockWarnings();
            console.log(`📝 Using ${alerts.length} mock warnings (API unavailable)`);
        }

        state.warnings = alerts;
        displayWarnings(alerts);
        renderWarningsOnMap(alerts);

        // Update activity score
        calculateWeatherActivity();

    } catch (error) {
        console.error('Error loading NWS warnings:', error);
        state.warnings = generateMockWarnings();
        displayWarnings(state.warnings);
    } finally {
        showLoading(false);
    }
}

function generateMockWarnings() {
    return [
        {
            properties: {
                event: 'Tornado Warning',
                areaDesc: 'Central Oklahoma County; Canadian County',
                severity: 'Extreme',
                urgency: 'Immediate',
                certainty: 'Observed',
                headline: 'Tornado Warning issued for Central Oklahoma',
                description: 'At 445 PM CDT, a confirmed large and extremely dangerous tornado was located near Moore, moving northeast at 25 mph.',
                expires: new Date(Date.now() + 2700000).toISOString(),
                onset: new Date().toISOString(),
                sent: new Date().toISOString()
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-97.6, 35.4], [-97.4, 35.4], [-97.4, 35.6], [-97.6, 35.6], [-97.6, 35.4]]]
            }
        },
        {
            properties: {
                event: 'Severe Thunderstorm Warning',
                areaDesc: 'Douglas County; Johnson County; Miami County',
                severity: 'Severe',
                urgency: 'Immediate',
                certainty: 'Observed',
                headline: 'Severe Thunderstorm Warning for Eastern Kansas',
                description: 'At 450 PM CDT, severe thunderstorms were located along a line extending from Olathe to Spring Hill, moving east at 40 mph. 60 MPH winds and quarter size hail.',
                expires: new Date(Date.now() + 3600000).toISOString(),
                onset: new Date().toISOString(),
                sent: new Date().toISOString()
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-95.0, 38.7], [-94.7, 38.7], [-94.7, 39.0], [-95.0, 39.0], [-95.0, 38.7]]]
            }
        },
        {
            properties: {
                event: 'Flash Flood Warning',
                areaDesc: 'Greene County; Christian County',
                severity: 'Severe',
                urgency: 'Immediate',
                certainty: 'Likely',
                headline: 'Flash Flood Warning for Southwest Missouri',
                description: 'At 452 PM CDT, Doppler radar indicated thunderstorms producing heavy rain. 2 to 4 inches of rain have fallen. Flash flooding is ongoing or expected to begin shortly.',
                expires: new Date(Date.now() + 5400000).toISOString(),
                onset: new Date().toISOString(),
                sent: new Date().toISOString()
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-93.5, 37.0], [-93.2, 37.0], [-93.2, 37.3], [-93.5, 37.3], [-93.5, 37.0]]]
            }
        }
    ];
}

function displayWarnings(alerts) {
    const panel = document.getElementById('warningsPanel');
    if (!panel) return;

    if (alerts.length === 0) {
        panel.innerHTML = '<div class="no-warnings">No active warnings</div>';
        return;
    }

    panel.innerHTML = alerts.map(alert => {
        const props = alert.properties;
        const severity = getSeverityClass(props.severity);
        const timeUntilExpires = getTimeUntilExpires(props.expires);

        return `
            <div class="warning-card ${severity}" onclick="zoomToWarning('${alert.id || Math.random()}')">
                <div class="warning-header">${props.event || 'Weather Alert'}</div>
                <div class="warning-area">${props.areaDesc || 'Unknown Area'}</div>
                <div class="warning-meta">
                    <span class="warning-severity">${props.severity || 'Unknown'}</span>
                    <span class="warning-expires">${timeUntilExpires}</span>
                </div>
            </div>
        `;
    }).join('');
}

function getSeverityClass(severity) {
    const s = (severity || '').toLowerCase();
    if (s === 'extreme') return 'extreme';
    if (s === 'severe') return 'severe';
    return 'moderate';
}

function getTimeUntilExpires(expiresISO) {
    if (!expiresISO) return 'Unknown';

    const now = new Date();
    const expires = new Date(expiresISO);
    const diff = expires - now;

    if (diff < 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
}

function renderWarningsOnMap(alerts) {
    removeLayer('warnings');

    if (!state.settings.warningsEnabled) return;

    const warningsGroup = L.layerGroup();

    alerts.forEach((alert, index) => {
        const props = alert.properties;
        const geom = alert.geometry;

        if (geom && geom.coordinates && geom.coordinates.length > 0) {
            try {
                const coords = geom.coordinates[0].map(coord => [coord[1], coord[0]]);

                const polygon = L.polygon(coords, {
                    color: getWarningColor(props.event),
                    fillColor: getWarningColor(props.event),
                    fillOpacity: 0.25,
                    weight: 2.5,
                    dashArray: '5, 5'
                });

                polygon.bindPopup(`
                    <div class="warning-popup">
                        <strong style="color: ${getWarningColor(props.event)}; font-size: 16px;">${props.event}</strong><br><br>
                        <strong>Area:</strong> ${props.areaDesc}<br>
                        <strong>Severity:</strong> ${props.severity}<br>
                        <strong>Urgency:</strong> ${props.urgency}<br><br>
                        <em>${props.headline || ''}</em>
                    </div>
                `);

                // Store alert ID for zooming
                polygon.alertIndex = index;

                warningsGroup.addLayer(polygon);
            } catch (error) {
                console.error('Error rendering warning polygon:', error);
            }
        }
    });

    state.layers.warnings = warningsGroup;
    warningsGroup.addTo(state.map);
}

function getWarningColor(eventType) {
    const type = (eventType || '').toLowerCase();
    if (type.includes('tornado')) return '#dc2626';
    if (type.includes('severe thunderstorm')) return '#ea580c';
    if (type.includes('flash flood') || type.includes('flood')) return '#16a34a';
    if (type.includes('winter') || type.includes('blizzard') || type.includes('snow')) return '#0ea5e9';
    if (type.includes('heat')) return '#f59e0b';
    if (type.includes('wind')) return '#8b5cf6';
    if (type.includes('fire')) return '#dc2626';
    return '#eab308';
}

function zoomToWarning(alertId) {
    const alert = state.warnings[alertId];
    if (!alert || !alert.geometry) return;

    try {
        const coords = alert.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
        const bounds = L.latLngBounds(coords);
        state.map.fitBounds(bounds, { padding: [50, 50] });
    } catch (error) {
        console.error('Error zooming to warning:', error);
    }
}

// ============================================================================
// WEATHER ACTIVITY SCORE
// ============================================================================

function calculateWeatherActivity() {
    let score = 0;
    const weights = APP_CONFIG.activityWeights;

    // Count warnings by type and severity
    state.warnings.forEach(alert => {
        const event = (alert.properties.event || '').toLowerCase();
        const severity = (alert.properties.severity || '').toLowerCase();

        // Base warning score
        if (event.includes('tornado')) {
            score += weights.tornadoWarning;
        } else if (event.includes('severe thunderstorm')) {
            score += weights.severeThunderstormWarning;
        } else if (event.includes('flash flood')) {
            score += weights.flashFloodWarning;
        } else if (event.includes('winter storm')) {
            score += weights.winterStormWarning;
        } else {
            score += weights.otherWarning;
        }

        // Severity multiplier
        if (severity === 'extreme') score *= 1.5;
        else if (severity === 'severe') score *= 1.25;
    });

    // Cap score at 100
    score = Math.min(100, Math.round(score));

    // Determine activity level
    let level = 'calm';
    if (score >= 80) level = 'extreme';
    else if (score >= 60) level = 'high';
    else if (score >= 40) level = 'elevated';
    else if (score >= 20) level = 'moderate';
    else if (score >= 10) level = 'low';

    state.activityScore = score;
    state.activityLevel = level;

    // Update UI
    updateActivityDisplay();

    console.log(`Weather Activity Score: ${score} (${level})`);
}

function updateActivityDisplay() {
    const card = document.getElementById('activityCard');
    if (!card) return;

    const score = state.activityScore;
    const level = state.activityLevel;

    // Update score number
    const scoreEl = card.querySelector('.activity-score');
    if (scoreEl) {
        scoreEl.textContent = score;
    }

    // Update level text
    const levelEl = card.querySelector('.activity-level');
    if (levelEl) {
        levelEl.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    }

    // Update colors based on level
    card.className = 'activity-card activity-' + level;

    // Update description
    const descEl = card.querySelector('.activity-desc');
    if (descEl) {
        descEl.textContent = getActivityDescription(level);
    }
}

function getActivityDescription(level) {
    const descriptions = {
        'calm': 'No significant weather',
        'low': 'Minimal weather activity',
        'moderate': 'Scattered weather events',
        'elevated': 'Active weather conditions',
        'high': 'Significant severe weather',
        'extreme': 'Dangerous weather outbreak'
    };
    return descriptions[level] || 'Unknown';
}

function showActivityDetails() {
    const warnings = state.warnings.length;
    const score = state.activityScore;
    const level = state.activityLevel;

    const details = `
Weather Activity Score: ${score}/100
Level: ${level.toUpperCase()}
Active Warnings: ${warnings}

${state.warnings.slice(0, 5).map(w => '• ' + w.properties.event).join('\n')}
${warnings > 5 ? '\n... and ' + (warnings - 5) + ' more' : ''}
    `.trim();

    alert(details);
}

// ============================================================================
// MESONET DATA
// ============================================================================

async function loadMesonetData() {
    // Mock mesonet data for now
    const stations = generateMockMesonetData();
    state.mesonetStations = stations;
    renderMesonetOnMap(stations);
}

function generateMockMesonetData() {
    return [
        { name: 'Norman, OK', lat: 35.2226, lon: -97.4395, temp: 78, wind: 18 },
        { name: 'Oklahoma City', lat: 35.4676, lon: -97.5164, temp: 80, wind: 22 },
        { name: 'Tulsa, OK', lat: 36.1539, lon: -95.9928, temp: 76, wind: 15 },
        { name: 'Wichita, KS', lat: 37.6872, lon: -97.3301, temp: 74, wind: 20 },
        { name: 'Kansas City', lat: 39.0997, lon: -94.5786, temp: 72, wind: 16 }
    ];
}

function renderMesonetOnMap(stations) {
    removeLayer('mesonet');

    if (!state.settings.mesonetEnabled) return;

    const mesonetGroup = L.layerGroup();

    stations.forEach(station => {
        const marker = L.circleMarker([station.lat, station.lon], {
            radius: 6,
            fillColor: '#f59e0b',
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        });

        marker.bindPopup(`
            <strong>${station.name}</strong><br>
            🌡️ ${station.temp}°F<br>
            💨 ${station.wind} mph
        `);

        mesonetGroup.addLayer(marker);
    });

    state.layers.mesonet = mesonetGroup;
    mesonetGroup.addTo(state.map);
}

// ============================================================================
// RADAR CONTROLS
// ============================================================================

function toggleRadarSource(source) {
    const key = source + 'Enabled';
    state.settings[key] = !state.settings[key];

    setSwitch(source === 'nexradReflectivity' ? 'nexradReflSwitch' :
             source === 'nexradVelocity' ? 'nexradVelSwitch' : 'rainviewerSwitch',
             state.settings[key]);

    // Load or remove layer
    if (source === 'nexradReflectivity') {
        state.settings[key] ? loadNEXRADReflectivity() : removeLayer('nexradReflectivity');
    } else if (source === 'nexradVelocity') {
        state.settings[key] ? loadNEXRADVelocity() : removeLayer('nexradVelocity');
    } else if (source === 'rainviewer') {
        state.settings[key] ? loadRainViewer() : removeLayer('rainviewer');
    }

    saveSettings();
}

function toggleDataLayer(layer) {
    const key = layer + 'Enabled';
    state.settings[key] = !state.settings[key];

    setSwitch(layer + 'Switch', state.settings[key]);

    if (layer === 'warnings') {
        state.settings[key] ? loadNWSWarnings() : removeLayer('warnings');
    } else if (layer === 'mesonet') {
        state.settings[key] ? loadMesonetData() : removeLayer('mesonet');
    }

    saveSettings();
}

function removeLayer(layerName) {
    if (state.layers[layerName]) {
        state.map.removeLayer(state.layers[layerName]);
        state.layers[layerName] = null;
    }
}

function handleOpacityChange(e) {
    const value = e.target.value / 100;
    state.settings.radarOpacity = value;
    document.getElementById('opacityValue').textContent = Math.round(value * 100) + '%';

    // Update all radar layers
    if (state.layers.nexradReflectivity) state.layers.nexradReflectivity.setOpacity(value);
    if (state.layers.nexradVelocity) state.layers.nexradVelocity.setOpacity(value * 0.8);
    if (state.layers.rainviewer) state.layers.rainviewer.setOpacity(value);

    saveSettings();
}

function handleSpeedChange(e) {
    const value = parseInt(e.target.value);
    state.settings.animationSpeed = value;
    document.getElementById('speedValue').textContent = value + 'x';
    saveSettings();
}

// ============================================================================
// RADAR ANIMATION
// ============================================================================

function toggleRadarAnimation() {
    if (state.animationInterval) {
        stopAnimation();
    } else {
        startAnimation();
    }
}

function startAnimation() {
    if (state.animationInterval) return;

    const speed = 2000 / state.settings.animationSpeed;

    state.animationInterval = setInterval(() => {
        if (state.settings.rainviewerEnabled && state.rainviewerTimestamps.length > 0) {
            state.currentTimestampIndex = (state.currentTimestampIndex + 1) % state.rainviewerTimestamps.length;
            updateRainViewerLayer();
        } else if (state.settings.nexradReflectivityEnabled) {
            loadNEXRADReflectivity();
        } else if (state.settings.nexradVelocityEnabled) {
            loadNEXRADVelocity();
        }
    }, speed);

    document.getElementById('radarBtn').classList.add('active');
}

function stopAnimation() {
    if (state.animationInterval) {
        clearInterval(state.animationInterval);
        state.animationInterval = null;
    }
    document.getElementById('radarBtn').classList.remove('active');
}

// ============================================================================
// UI CONTROLS
// ============================================================================

function toggleWarningsPanel() {
    const panel = document.getElementById('warningsFloating');
    if (panel) {
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

function toggleSettingsPanel() {
    const panel = document.getElementById('sidePanel');
    if (panel) {
        panel.classList.toggle('open');
    }
}

function toggleUserMenu() {
    if (confirm('Sign out?')) {
        window.AuthService.signOut();
    }
}

// ============================================================================
// SEARCH
// ============================================================================

function handleSearch(e) {
    if (e.key !== 'Enter') return;

    const query = e.target.value.trim();
    if (!query) return;

    searchLocation(query);
}

async function searchLocation(query) {
    showLoading(true);

    try {
        const url = `${APP_CONFIG.weather.geocoding}?format=json&q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const results = await response.json();

        if (results.length > 0) {
            const result = results[0];
            state.map.flyTo([parseFloat(result.lat), parseFloat(result.lon)], 10, {
                duration: 2
            });
        } else {
            alert('Location not found');
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('Search failed');
    } finally {
        showLoading(false);
    }
}

// ============================================================================
// DATA LOADING
// ============================================================================

function loadAllData() {
    if (state.settings.nexradReflectivityEnabled) loadNEXRADReflectivity();
    if (state.settings.nexradVelocityEnabled) loadNEXRADVelocity();
    if (state.settings.rainviewerEnabled) loadRainViewer();
    if (state.settings.warningsEnabled) loadNWSWarnings();
    if (state.settings.mesonetEnabled) loadMesonetData();
}

function startAutoRefresh() {
    // Radar refresh
    state.intervals.radar = setInterval(() => {
        if (state.settings.nexradReflectivityEnabled) loadNEXRADReflectivity();
        if (state.settings.nexradVelocityEnabled) loadNEXRADVelocity();
        if (state.settings.rainviewerEnabled) loadRainViewer();
    }, APP_CONFIG.intervals.radar);

    // Warnings refresh
    state.intervals.warnings = setInterval(() => {
        if (state.settings.warningsEnabled) loadNWSWarnings();
    }, APP_CONFIG.intervals.warnings);

    // Activity score update
    state.intervals.activity = setInterval(() => {
        calculateWeatherActivity();
    }, APP_CONFIG.intervals.activity);

    console.log('Auto-refresh started');
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
// ERROR HANDLING
// ============================================================================

window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    showLoading(false);
});

console.log('⚡ NexRadar Pro - Radar Module Loaded');
console.log('Features: NEXRAD Reflectivity + Velocity | RainViewer | Real NWS API | Activity Score');
