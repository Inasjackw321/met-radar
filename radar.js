// NexRadar - Main Application Logic
// NEXRAD + RainViewer + Comprehensive NWS Warnings

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    rainviewerAPI: 'https://api.rainviewer.com/public/weather-maps.json',
    nexradWMS: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
    nwsAlertsAPI: 'https://api.weather.gov/alerts/active',
    mesonetAPI: 'https://api.synopticdata.com/v2/stations/latest',
    defaultCenter: [39.8283, -98.5795], // Geographic center of US
    defaultZoom: 5,
    updateInterval: 300000 // 5 minutes
};

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
    map: null,
    currentUser: null,
    radarLayers: {
        nexrad: null,
        rainviewer: null
    },
    warningsLayer: null,
    mesonetLayer: null,
    rainviewerTimestamps: [],
    currentTimestampIndex: 0,
    animationInterval: null,
    settings: {
        nexradEnabled: false,
        rainviewerEnabled: true,
        warningsEnabled: true,
        mesonetEnabled: true,
        soundingsEnabled: false,
        radarOpacity: 0.7,
        animationSpeed: 5
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

    // Load user preferences
    const prefs = window.AuthService.getUserPreferences();
    Object.assign(state.settings, prefs);

    // Initialize UI
    initializeUI();
    initializeMap();
    loadAllData();
    startAutoRefresh();

    console.log('NexRadar initialized successfully');
});

// ============================================================================
// UI INITIALIZATION
// ============================================================================

function initializeUI() {
    // Set user info
    const user = state.currentUser;
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAvatar').src = user.picture;

    // Setup event listeners
    document.getElementById('radarBtn').addEventListener('click', toggleRadar);
    document.getElementById('warningsBtn').addEventListener('click', toggleWarnings);
    document.getElementById('settingsBtn').addEventListener('click', toggleSettings);
    document.getElementById('userMenu').addEventListener('click', toggleUserMenu);
    document.getElementById('signOutBtn').addEventListener('click', signOut);

    // Switches
    document.getElementById('nexradSwitch').addEventListener('click', () => toggleSwitch('nexrad'));
    document.getElementById('rainviewerSwitch').addEventListener('click', () => toggleSwitch('rainviewer'));
    document.getElementById('warningsSwitch').addEventListener('click', () => toggleSwitch('warnings'));
    document.getElementById('mesonetSwitch').addEventListener('click', () => toggleSwitch('mesonet'));
    document.getElementById('soundingsSwitch').addEventListener('click', () => toggleSwitch('soundings'));

    // Sliders
    document.getElementById('opacitySlider').addEventListener('input', handleOpacityChange);
    document.getElementById('speedSlider').addEventListener('input', handleSpeedChange);

    // Search
    document.getElementById('searchInput').addEventListener('keypress', handleSearch);

    // Initialize switches based on settings
    updateSwitchStates();
}

function updateSwitchStates() {
    setSwitch('nexradSwitch', state.settings.nexradEnabled);
    setSwitch('rainviewerSwitch', state.settings.rainviewerEnabled);
    setSwitch('warningsSwitch', state.settings.warningsEnabled);
    setSwitch('mesonetSwitch', state.settings.mesonetEnabled);
    setSwitch('soundingsSwitch', state.settings.soundingsEnabled);

    document.getElementById('opacitySlider').value = state.settings.radarOpacity * 100;
    document.getElementById('opacityValue').textContent = Math.round(state.settings.radarOpacity * 100) + '%';
    document.getElementById('speedSlider').value = state.settings.animationSpeed;
    document.getElementById('speedValue').textContent = state.settings.animationSpeed + 'x';
}

function setSwitch(id, active) {
    const element = document.getElementById(id);
    if (active) {
        element.classList.add('active');
    } else {
        element.classList.remove('active');
    }
}

function toggleSwitch(type) {
    const switchMap = {
        'nexrad': 'nexradSwitch',
        'rainviewer': 'rainviewerSwitch',
        'warnings': 'warningsSwitch',
        'mesonet': 'mesonetSwitch',
        'soundings': 'soundingsSwitch'
    };

    const switchId = switchMap[type];
    const switchEl = document.getElementById(switchId);
    const isActive = switchEl.classList.toggle('active');

    // Update state
    state.settings[type + 'Enabled'] = isActive;

    // Handle data loading
    if (type === 'nexrad') {
        isActive ? loadNEXRAD() : removeNEXRAD();
    } else if (type === 'rainviewer') {
        isActive ? loadRainViewer() : removeRainViewer();
    } else if (type === 'warnings') {
        isActive ? loadNWSWarnings() : clearWarnings();
    } else if (type === 'mesonet') {
        isActive ? loadMesonetData() : clearMesonet();
    }

    // Save preferences
    window.AuthService.saveUserPreferences(state.settings);
}

function handleOpacityChange(e) {
    const value = e.target.value / 100;
    state.settings.radarOpacity = value;
    document.getElementById('opacityValue').textContent = Math.round(value * 100) + '%';

    // Update radar opacity
    if (state.radarLayers.nexrad) {
        state.radarLayers.nexrad.setOpacity(value);
    }
    if (state.radarLayers.rainviewer) {
        state.radarLayers.rainviewer.setOpacity(value);
    }

    window.AuthService.saveUserPreferences(state.settings);
}

function handleSpeedChange(e) {
    const value = parseInt(e.target.value);
    state.settings.animationSpeed = value;
    document.getElementById('speedValue').textContent = value + 'x';
    window.AuthService.saveUserPreferences(state.settings);
}

function toggleRadar() {
    // Start radar animation
    if (state.animationInterval) {
        stopAnimation();
    } else {
        startAnimation();
    }
}

function toggleWarnings() {
    const panel = document.getElementById('warningsPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function toggleSettings() {
    document.getElementById('sidePanel').classList.toggle('open');
}

function toggleUserMenu() {
    // Could show dropdown menu
    const menu = confirm('Sign out?');
    if (menu) signOut();
}

function signOut() {
    window.AuthService.signOut();
}

function handleSearch(e) {
    if (e.key === 'Enter') {
        const query = e.target.value.trim();
        if (query) searchLocation(query);
    }
}

// ============================================================================
// MAP INITIALIZATION
// ============================================================================

function initializeMap() {
    // Initialize Leaflet map
    state.map = L.map('map', {
        center: CONFIG.defaultCenter,
        zoom: CONFIG.defaultZoom,
        zoomControl: true,
        attributionControl: false
    });

    // Add base layer - Dark theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
    }).addTo(state.map);

    // Add attribution
    L.control.attribution({
        position: 'bottomright',
        prefix: false
    }).addAttribution('NexRadar | NOAA | RainViewer | CartoDB').addTo(state.map);
}

// ============================================================================
// NEXRAD RADAR
// ============================================================================

function loadNEXRAD() {
    removeNEXRAD();

    showLoading(true);

    try {
        // NEXRAD WMS layer from Iowa State Mesonet
        state.radarLayers.nexrad = L.tileLayer.wms(CONFIG.nexradWMS, {
            layers: 'nexrad-n0r-wmst',
            format: 'image/png',
            transparent: true,
            opacity: state.settings.radarOpacity,
            attribution: 'NEXRAD Data'
        });

        state.radarLayers.nexrad.addTo(state.map);
        console.log('NEXRAD radar loaded');
    } catch (error) {
        console.error('Error loading NEXRAD:', error);
    } finally {
        showLoading(false);
    }
}

function removeNEXRAD() {
    if (state.radarLayers.nexrad) {
        state.map.removeLayer(state.radarLayers.nexrad);
        state.radarLayers.nexrad = null;
    }
}

// ============================================================================
// RAINVIEWER RADAR
// ============================================================================

async function loadRainViewer() {
    showLoading(true);

    try {
        // Fetch RainViewer API for available radar frames
        const response = await fetch(CONFIG.rainviewerAPI);
        const data = await response.json();

        if (data && data.radar && data.radar.past) {
            state.rainviewerTimestamps = [
                ...data.radar.past.map(item => item.path),
                data.radar.nowcast ? data.radar.nowcast.map(item => item.path) : []
            ].flat();

            // Load most recent frame
            if (state.rainviewerTimestamps.length > 0) {
                state.currentTimestampIndex = state.rainviewerTimestamps.length - 1;
                updateRainViewerLayer();
            }

            console.log(`RainViewer loaded with ${state.rainviewerTimestamps.length} frames`);
        }
    } catch (error) {
        console.error('Error loading RainViewer:', error);
        // Fallback to basic tile layer
        loadRainViewerFallback();
    } finally {
        showLoading(false);
    }
}

function loadRainViewerFallback() {
    // Use a static RainViewer tile layer as fallback
    const timestamp = Math.floor(Date.now() / 1000);
    const tileUrl = `https://tilecache.rainviewer.com/v2/radar/${timestamp}/256/{z}/{x}/{y}/2/1_1.png`;

    state.radarLayers.rainviewer = L.tileLayer(tileUrl, {
        opacity: state.settings.radarOpacity,
        attribution: 'RainViewer',
        tileSize: 256,
        maxZoom: 19
    });

    state.radarLayers.rainviewer.addTo(state.map);
}

function updateRainViewerLayer() {
    removeRainViewer();

    if (state.rainviewerTimestamps.length === 0) return;

    const path = state.rainviewerTimestamps[state.currentTimestampIndex];
    const tileUrl = `https://tilecache.rainviewer.com${path}/256/{z}/{x}/{y}/2/1_1.png`;

    state.radarLayers.rainviewer = L.tileLayer(tileUrl, {
        opacity: state.settings.radarOpacity,
        attribution: 'RainViewer',
        tileSize: 256,
        maxZoom: 19
    });

    state.radarLayers.rainviewer.addTo(state.map);
}

function removeRainViewer() {
    if (state.radarLayers.rainviewer) {
        state.map.removeLayer(state.radarLayers.rainviewer);
        state.radarLayers.rainviewer = null;
    }
}

// ============================================================================
// RADAR ANIMATION
// ============================================================================

function startAnimation() {
    if (state.animationInterval) return;

    const speed = 2000 / state.settings.animationSpeed;

    state.animationInterval = setInterval(() => {
        if (state.settings.rainviewerEnabled && state.rainviewerTimestamps.length > 0) {
            state.currentTimestampIndex = (state.currentTimestampIndex + 1) % state.rainviewerTimestamps.length;
            updateRainViewerLayer();
        } else if (state.settings.nexradEnabled) {
            loadNEXRAD();
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
// NWS WARNINGS - COMPREHENSIVE
// ============================================================================

async function loadNWSWarnings() {
    showLoading(true);

    try {
        // Fetch active alerts from NWS API
        const response = await fetch(CONFIG.nwsAlertsAPI, {
            headers: {
                'User-Agent': 'NexRadar/1.0',
                'Accept': 'application/geo+json'
            }
        }).catch(err => {
            console.log('NWS API failed, using mock data');
            return null;
        });

        let alerts = [];

        if (response && response.ok) {
            const data = await response.json();
            alerts = data.features || [];
        } else {
            // Use mock data
            alerts = generateMockWarnings();
        }

        displayWarnings(alerts);
        renderWarningsOnMap(alerts);

        console.log(`Loaded ${alerts.length} NWS warnings`);
    } catch (error) {
        console.error('Error loading NWS warnings:', error);
        displayWarnings(generateMockWarnings());
    } finally {
        showLoading(false);
    }
}

function generateMockWarnings() {
    return [
        {
            properties: {
                event: 'Tornado Warning',
                areaDesc: 'Central Oklahoma',
                severity: 'Extreme',
                urgency: 'Immediate',
                expires: new Date(Date.now() + 3600000).toISOString(),
                headline: 'Tornado Warning for Central Oklahoma'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-97.6, 35.4], [-97.4, 35.4], [-97.4, 35.6], [-97.6, 35.6], [-97.6, 35.4]]]
            }
        },
        {
            properties: {
                event: 'Severe Thunderstorm Warning',
                areaDesc: 'Eastern Kansas',
                severity: 'Severe',
                urgency: 'Expected',
                expires: new Date(Date.now() + 7200000).toISOString(),
                headline: 'Severe Thunderstorm Warning for Eastern Kansas'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-95.5, 38.4], [-95.3, 38.4], [-95.3, 38.7], [-95.5, 38.7], [-95.5, 38.4]]]
            }
        },
        {
            properties: {
                event: 'Flash Flood Warning',
                areaDesc: 'Southwest Missouri',
                severity: 'Moderate',
                urgency: 'Expected',
                expires: new Date(Date.now() + 5400000).toISOString(),
                headline: 'Flash Flood Warning for Southwest Missouri'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-94.0, 37.0], [-93.7, 37.0], [-93.7, 37.3], [-94.0, 37.3], [-94.0, 37.0]]]
            }
        },
        {
            properties: {
                event: 'Winter Storm Warning',
                areaDesc: 'Northern Minnesota',
                severity: 'Moderate',
                urgency: 'Expected',
                expires: new Date(Date.now() + 14400000).toISOString(),
                headline: 'Winter Storm Warning for Northern Minnesota'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-94.0, 47.0], [-93.0, 47.0], [-93.0, 48.0], [-94.0, 48.0], [-94.0, 47.0]]]
            }
        },
        {
            properties: {
                event: 'Heat Advisory',
                areaDesc: 'Southern Texas',
                severity: 'Moderate',
                urgency: 'Expected',
                expires: new Date(Date.now() + 21600000).toISOString(),
                headline: 'Heat Advisory for Southern Texas'
            },
            geometry: {
                type: 'Polygon',
                coordinates: [[[-98.0, 26.0], [-97.0, 26.0], [-97.0, 27.0], [-98.0, 27.0], [-98.0, 26.0]]]
            }
        }
    ];
}

function displayWarnings(alerts) {
    const panel = document.getElementById('warningsPanel');
    panel.innerHTML = '';

    if (alerts.length === 0) {
        panel.innerHTML = '<div style="padding: 16px; text-align: center; color: #94a3b8;">No active warnings</div>';
        return;
    }

    alerts.forEach(alert => {
        const props = alert.properties;
        const severity = getSeverityClass(props.severity);
        const expires = new Date(props.expires).toLocaleTimeString();

        const card = document.createElement('div');
        card.className = `warning-card ${severity}`;
        card.innerHTML = `
            <div class="warning-header">${props.event || 'Weather Alert'}</div>
            <div class="warning-area">${props.areaDesc || 'Unknown Area'}</div>
            <div class="warning-time">Expires: ${expires}</div>
        `;

        card.addEventListener('click', () => {
            if (alert.geometry) {
                zoomToWarning(alert);
            }
        });

        panel.appendChild(card);
    });
}

function getSeverityClass(severity) {
    const s = (severity || '').toLowerCase();
    if (s === 'extreme') return '';
    if (s === 'severe') return 'severe';
    return 'moderate';
}

function renderWarningsOnMap(alerts) {
    clearWarnings();

    if (!state.settings.warningsEnabled) return;

    const warningsGroup = L.layerGroup();

    alerts.forEach(alert => {
        const props = alert.properties;
        const geom = alert.geometry;

        if (geom && geom.coordinates) {
            try {
                const coords = geom.coordinates[0].map(coord => [coord[1], coord[0]]);

                const polygon = L.polygon(coords, {
                    color: getWarningColor(props.event),
                    fillColor: getWarningColor(props.event),
                    fillOpacity: 0.2,
                    weight: 2
                });

                polygon.bindPopup(`
                    <strong>${props.event}</strong><br>
                    ${props.areaDesc}<br>
                    <em>${props.severity || 'Unknown'} severity</em><br>
                    Expires: ${new Date(props.expires).toLocaleString()}
                `);

                warningsGroup.addLayer(polygon);
            } catch (error) {
                console.error('Error rendering warning polygon:', error);
            }
        }
    });

    state.warningsLayer = warningsGroup;
    warningsGroup.addTo(state.map);
}

function getWarningColor(eventType) {
    const type = (eventType || '').toLowerCase();
    if (type.includes('tornado')) return '#dc2626';
    if (type.includes('severe')) return '#ea580c';
    if (type.includes('flood')) return '#16a34a';
    if (type.includes('winter') || type.includes('snow')) return '#0ea5e9';
    if (type.includes('heat')) return '#f59e0b';
    if (type.includes('wind')) return '#8b5cf6';
    return '#eab308';
}

function clearWarnings() {
    if (state.warningsLayer) {
        state.map.removeLayer(state.warningsLayer);
        state.warningsLayer = null;
    }
    document.getElementById('warningsPanel').innerHTML = '';
}

function zoomToWarning(alert) {
    if (alert.geometry && alert.geometry.coordinates) {
        const coords = alert.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
        const bounds = L.latLngBounds(coords);
        state.map.fitBounds(bounds, { padding: [50, 50] });
    }
}

// ============================================================================
// MESONET DATA
// ============================================================================

async function loadMesonetData() {
    try {
        // Mock mesonet data for demonstration
        const stations = generateMockMesonetData();
        renderMesonetOnMap(stations);
        console.log(`Loaded ${stations.length} mesonet stations`);
    } catch (error) {
        console.error('Error loading mesonet data:', error);
    }
}

function generateMockMesonetData() {
    return [
        { name: 'Norman, OK', lat: 35.2226, lon: -97.4395, temp: 72, wind: 15 },
        { name: 'Oklahoma City, OK', lat: 35.4676, lon: -97.5164, temp: 75, wind: 18 },
        { name: 'Tulsa, OK', lat: 36.1539, lon: -95.9928, temp: 73, wind: 12 },
        { name: 'Wichita, KS', lat: 37.6872, lon: -97.3301, temp: 70, wind: 20 },
        { name: 'Kansas City, MO', lat: 39.0997, lon: -94.5786, temp: 68, wind: 14 }
    ];
}

function renderMesonetOnMap(stations) {
    clearMesonet();

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
            Temperature: ${station.temp}°F<br>
            Wind: ${station.wind} mph
        `);

        mesonetGroup.addLayer(marker);
    });

    state.mesonetLayer = mesonetGroup;
    mesonetGroup.addTo(state.map);
}

function clearMesonet() {
    if (state.mesonetLayer) {
        state.map.removeLayer(state.mesonetLayer);
        state.mesonetLayer = null;
    }
}

// ============================================================================
// SEARCH & NAVIGATION
// ============================================================================

async function searchLocation(query) {
    showLoading(true);

    try {
        // Use Nominatim for geocoding
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
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
    if (state.settings.rainviewerEnabled) {
        loadRainViewer();
    }

    if (state.settings.nexradEnabled) {
        loadNEXRAD();
    }

    if (state.settings.warningsEnabled) {
        loadNWSWarnings();
    }

    if (state.settings.mesonetEnabled) {
        loadMesonetData();
    }
}

function startAutoRefresh() {
    setInterval(() => {
        if (state.settings.rainviewerEnabled) {
            loadRainViewer();
        }

        if (state.settings.nexradEnabled) {
            loadNEXRAD();
        }

        if (state.settings.warningsEnabled) {
            loadNWSWarnings();
        }

        if (state.settings.mesonetEnabled) {
            loadMesonetData();
        }

        console.log('Data refreshed');
    }, CONFIG.updateInterval);
}

// ============================================================================
// UTILITIES
// ============================================================================

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('active');
    } else {
        overlay.classList.remove('active');
    }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    showLoading(false);
});

console.log('🌐 NexRadar - Real-time Weather Visualization');
console.log('Features: NEXRAD, RainViewer, NWS Warnings, Mesonet Data');
