// Global Weather Radar Application
// Advanced meteorological visualization with velocity, warnings, soundings, and mesonet data

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
    cesiumToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5N2VjNTgzNC1jNTI3LTRiMGYtODJjNi1jYWE3MGQwZmMyNDQiLCJpZCI6MjI0MTc2LCJpYXQiOjE3MDY3MjcyMjd9.example', // Demo token - replace with your own
    radarAPI: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
    velocityAPI: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0v.cgi',
    nwsWarningsAPI: 'https://api.weather.gov/alerts/active',
    mesonetAPI: 'https://api.synopticdata.com/v2/stations/latest',
    soundingAPI: 'https://rucsoundings.noaa.gov/get_raobs.cgi',
    updateInterval: 300000, // 5 minutes
};

// ============================================================================
// GLOBAL STATE
// ============================================================================

let viewer;
let radarLayer;
let velocityLayer;
let warningsData = [];
let mesonetData = [];
let animationInterval;
let soundingChart;

// ============================================================================
// INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    initializeViewer();
    setupEventListeners();
    loadInitialData();
    updateLegend();
    startDataRefresh();
});

function initializeViewer() {
    // Set Cesium Ion token (use default assets)
    Cesium.Ion.defaultAccessToken = CONFIG.cesiumToken;

    // Create the Cesium viewer
    viewer = new Cesium.Viewer('cesiumContainer', {
        terrainProvider: Cesium.createWorldTerrain(),
        baseLayerPicker: true,
        geocoder: true,
        homeButton: true,
        sceneModePicker: true,
        navigationHelpButton: true,
        animation: false,
        timeline: false,
        fullscreenButton: true,
        vrButton: false,
        imageryProvider: new Cesium.IonImageryProvider({ assetId: 2 })
    });

    // Set initial view
    viewer.camera.setView({
        destination: Cesium.Cartesian3.fromDegrees(-95.0, 38.0, 5000000),
        orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0.0
        }
    });

    // Enable lighting
    viewer.scene.globe.enableLighting = true;

    console.log('Viewer initialized successfully');
}

// ============================================================================
// RADAR DATA LOADING
// ============================================================================

function loadRadarReflectivity() {
    const checkbox = document.getElementById('radarReflectivity');
    if (!checkbox.checked) {
        if (radarLayer) {
            viewer.imageryLayers.remove(radarLayer);
            radarLayer = null;
        }
        return;
    }

    showLoading(true);

    try {
        // Remove existing layer
        if (radarLayer) {
            viewer.imageryLayers.remove(radarLayer);
        }

        // Add NEXRAD radar layer from Iowa State Mesonet
        const radarProvider = new Cesium.WebMapServiceImageryProvider({
            url: CONFIG.radarAPI,
            layers: 'nexrad-n0r-wmst',
            parameters: {
                transparent: 'true',
                format: 'image/png',
                time: getCurrentRadarTime()
            },
            credit: 'Iowa State Mesonet'
        });

        radarLayer = viewer.imageryLayers.addImageryProvider(radarProvider);
        radarLayer.alpha = parseFloat(document.getElementById('radarOpacity').value);

        console.log('Radar reflectivity loaded');
    } catch (error) {
        console.error('Error loading radar reflectivity:', error);
    } finally {
        showLoading(false);
    }
}

function loadRadarVelocity() {
    const checkbox = document.getElementById('radarVelocity');
    if (!checkbox.checked) {
        if (velocityLayer) {
            viewer.imageryLayers.remove(velocityLayer);
            velocityLayer = null;
        }
        return;
    }

    showLoading(true);

    try {
        // Remove existing layer
        if (velocityLayer) {
            viewer.imageryLayers.remove(velocityLayer);
        }

        // Add NEXRAD velocity layer
        const velocityProvider = new Cesium.WebMapServiceImageryProvider({
            url: CONFIG.velocityAPI,
            layers: 'nexrad-n0v-wmst',
            parameters: {
                transparent: 'true',
                format: 'image/png',
                time: getCurrentRadarTime()
            },
            credit: 'Iowa State Mesonet - Velocity Data'
        });

        velocityLayer = viewer.imageryLayers.addImageryProvider(velocityProvider);
        velocityLayer.alpha = parseFloat(document.getElementById('radarOpacity').value) * 0.8;

        console.log('Radar velocity loaded');
    } catch (error) {
        console.error('Error loading radar velocity:', error);
    } finally {
        showLoading(false);
    }
}

function getCurrentRadarTime() {
    // Get current time rounded to nearest 5 minutes
    const now = new Date();
    const minutes = Math.floor(now.getMinutes() / 5) * 5;
    now.setMinutes(minutes);
    now.setSeconds(0);
    return now.toISOString();
}

// ============================================================================
// NWS WARNINGS
// ============================================================================

async function loadNWSWarnings() {
    try {
        // Use a CORS proxy for development or fetch from backend in production
        const response = await fetch(CONFIG.nwsWarningsAPI, {
            headers: {
                'User-Agent': 'WeatherRadarApp/1.0',
                'Accept': 'application/json'
            }
        }).catch(err => {
            console.log('Direct API call failed, using mock data');
            return null;
        });

        let warnings = [];

        if (response && response.ok) {
            const data = await response.json();
            warnings = data.features || [];
        } else {
            // Mock warnings data for demonstration
            warnings = generateMockWarnings();
        }

        warningsData = warnings;
        displayWarnings(warnings);
        renderWarningsOnGlobe(warnings);

        console.log(`Loaded ${warnings.length} NWS warnings`);
    } catch (error) {
        console.error('Error loading NWS warnings:', error);
        displayWarnings(generateMockWarnings());
    }
}

function generateMockWarnings() {
    return [
        {
            properties: {
                event: 'Tornado Warning',
                areaDesc: 'Central Oklahoma County',
                headline: 'Tornado Warning issued for Central Oklahoma County',
                severity: 'Extreme',
                urgency: 'Immediate',
                expires: new Date(Date.now() + 3600000).toISOString()
            },
            geometry: {
                coordinates: [[[-97.5, 35.5], [-97.4, 35.5], [-97.4, 35.6], [-97.5, 35.6]]]
            }
        },
        {
            properties: {
                event: 'Severe Thunderstorm Warning',
                areaDesc: 'Eastern Kansas',
                headline: 'Severe Thunderstorm Warning for Eastern Kansas',
                severity: 'Severe',
                urgency: 'Expected',
                expires: new Date(Date.now() + 7200000).toISOString()
            },
            geometry: {
                coordinates: [[[-95.5, 38.5], [-95.3, 38.5], [-95.3, 38.7], [-95.5, 38.7]]]
            }
        },
        {
            properties: {
                event: 'Flash Flood Warning',
                areaDesc: 'Southwest Missouri',
                headline: 'Flash Flood Warning for Southwest Missouri',
                severity: 'Moderate',
                urgency: 'Expected',
                expires: new Date(Date.now() + 5400000).toISOString()
            },
            geometry: {
                coordinates: [[[-94.0, 37.0], [-93.8, 37.0], [-93.8, 37.2], [-94.0, 37.2]]]
            }
        }
    ];
}

function displayWarnings(warnings) {
    const warningsList = document.getElementById('warningsList');

    if (warnings.length === 0) {
        warningsList.innerHTML = '<div style="text-align: center; color: #88ff88; padding: 20px;">No active warnings</div>';
        return;
    }

    warningsList.innerHTML = warnings.map(warning => {
        const props = warning.properties;
        return `
            <div class="warning-item">
                <div class="warning-type">${props.event || 'Weather Alert'}</div>
                <div class="warning-area">${props.areaDesc || 'Unknown Area'}</div>
                <div style="font-size: 0.8em; color: #ffaaaa; margin-top: 5px;">
                    Severity: ${props.severity || 'Unknown'}<br>
                    Expires: ${props.expires ? new Date(props.expires).toLocaleTimeString() : 'Unknown'}
                </div>
            </div>
        `;
    }).join('');
}

function renderWarningsOnGlobe(warnings) {
    if (!document.getElementById('showWarnings').checked) return;

    // Remove existing warning entities
    const entities = viewer.entities.values.filter(e => e.name && e.name.includes('Warning'));
    entities.forEach(entity => viewer.entities.remove(entity));

    // Add warning polygons to globe
    warnings.forEach(warning => {
        const props = warning.properties;
        const geometry = warning.geometry;

        if (geometry && geometry.coordinates) {
            const color = getWarningColor(props.event);

            try {
                // Simple polygon for warnings
                const positions = geometry.coordinates[0].map(coord =>
                    Cesium.Cartesian3.fromDegrees(coord[0], coord[1])
                );

                viewer.entities.add({
                    name: `Warning: ${props.event}`,
                    polygon: {
                        hierarchy: new Cesium.PolygonHierarchy(positions),
                        material: color.withAlpha(0.3),
                        outline: true,
                        outlineColor: color,
                        outlineWidth: 2,
                        height: 1000
                    },
                    description: `
                        <h3>${props.event}</h3>
                        <p><strong>Area:</strong> ${props.areaDesc}</p>
                        <p><strong>Severity:</strong> ${props.severity}</p>
                        <p>${props.headline || ''}</p>
                    `
                });
            } catch (error) {
                console.error('Error rendering warning polygon:', error);
            }
        }
    });
}

function getWarningColor(eventType) {
    const type = (eventType || '').toLowerCase();
    if (type.includes('tornado')) return Cesium.Color.RED;
    if (type.includes('severe thunderstorm')) return Cesium.Color.ORANGE;
    if (type.includes('flood')) return Cesium.Color.GREEN;
    if (type.includes('winter')) return Cesium.Color.DEEPSKYBLUE;
    return Cesium.Color.YELLOW;
}

// ============================================================================
// MESONET DATA
// ============================================================================

async function loadMesonetData() {
    try {
        // Mock mesonet data for demonstration
        const stations = generateMockMesonetData();

        mesonetData = stations;
        displayMesonetData(stations);
        renderMesonetOnGlobe(stations);

        console.log(`Loaded ${stations.length} mesonet stations`);
    } catch (error) {
        console.error('Error loading mesonet data:', error);
    }
}

function generateMockMesonetData() {
    return [
        {
            name: 'Norman',
            state: 'OK',
            lat: 35.2226,
            lon: -97.4395,
            temp: 72,
            dewpoint: 65,
            windSpeed: 15,
            windDir: 180,
            pressure: 1013.2,
            humidity: 75
        },
        {
            name: 'Oklahoma City',
            state: 'OK',
            lat: 35.4676,
            lon: -97.5164,
            temp: 75,
            dewpoint: 63,
            windSpeed: 18,
            windDir: 170,
            pressure: 1012.8,
            humidity: 68
        },
        {
            name: 'Tulsa',
            state: 'OK',
            lat: 36.1539,
            lon: -95.9928,
            temp: 73,
            dewpoint: 64,
            windSpeed: 12,
            windDir: 185,
            pressure: 1013.5,
            humidity: 72
        },
        {
            name: 'Wichita',
            state: 'KS',
            lat: 37.6872,
            lon: -97.3301,
            temp: 70,
            dewpoint: 60,
            windSpeed: 20,
            windDir: 190,
            pressure: 1014.1,
            humidity: 65
        },
        {
            name: 'Kansas City',
            state: 'MO',
            lat: 39.0997,
            lon: -94.5786,
            temp: 68,
            dewpoint: 58,
            windSpeed: 14,
            windDir: 200,
            pressure: 1015.2,
            humidity: 62
        }
    ];
}

function displayMesonetData(stations) {
    const mesonetList = document.getElementById('mesonetList');

    if (stations.length === 0) {
        mesonetList.innerHTML = '<div style="text-align: center; padding: 20px;">No mesonet data available</div>';
        return;
    }

    mesonetList.innerHTML = stations.slice(0, 10).map(station => `
        <div class="mesonet-item">
            <div class="station-name">${station.name}, ${station.state}</div>
            <div>Temp: ${station.temp}°F | Dewpoint: ${station.dewpoint}°F</div>
            <div>Wind: ${station.windSpeed} mph @ ${station.windDir}°</div>
            <div>Pressure: ${station.pressure} mb | RH: ${station.humidity}%</div>
        </div>
    `).join('');
}

function renderMesonetOnGlobe(stations) {
    if (!document.getElementById('showMesonet').checked) return;

    // Remove existing mesonet entities
    const entities = viewer.entities.values.filter(e => e.name && e.name.includes('Mesonet'));
    entities.forEach(entity => viewer.entities.remove(entity));

    // Add mesonet stations to globe
    stations.forEach(station => {
        viewer.entities.add({
            name: `Mesonet: ${station.name}`,
            position: Cesium.Cartesian3.fromDegrees(station.lon, station.lat),
            point: {
                pixelSize: 10,
                color: Cesium.Color.ORANGE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2
            },
            label: {
                text: `${station.temp}°`,
                font: '14px sans-serif',
                fillColor: Cesium.Color.WHITE,
                outlineColor: Cesium.Color.BLACK,
                outlineWidth: 2,
                style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                pixelOffset: new Cesium.Cartesian2(0, -12)
            },
            description: `
                <h3>${station.name}, ${station.state}</h3>
                <p><strong>Temperature:</strong> ${station.temp}°F</p>
                <p><strong>Dewpoint:</strong> ${station.dewpoint}°F</p>
                <p><strong>Wind:</strong> ${station.windSpeed} mph from ${station.windDir}°</p>
                <p><strong>Pressure:</strong> ${station.pressure} mb</p>
                <p><strong>Humidity:</strong> ${station.humidity}%</p>
            `
        });
    });
}

// ============================================================================
// SOUNDINGS
// ============================================================================

function loadSounding() {
    const station = document.getElementById('soundingStation').value;

    if (!station) {
        alert('Please select a sounding station first');
        return;
    }

    // Generate mock sounding data
    const soundingData = generateMockSoundingData();

    displaySounding(soundingData, station);
    document.getElementById('soundingsPanel').classList.add('active');
}

function generateMockSoundingData() {
    // Pressure levels (mb)
    const pressures = [1000, 925, 850, 700, 500, 400, 300, 250, 200, 150, 100];

    // Generate temperature and dewpoint profiles
    const temps = pressures.map((p, i) => {
        const baseTemp = 30 - (i * 8);
        return baseTemp + (Math.random() - 0.5) * 5;
    });

    const dewpoints = temps.map(t => t - 5 - Math.random() * 10);

    return pressures.map((p, i) => ({
        pressure: p,
        temperature: temps[i],
        dewpoint: dewpoints[i],
        height: 100 * (10 - i), // Approximate height in meters
        windSpeed: 10 + i * 5,
        windDir: 180 + i * 10
    }));
}

function displaySounding(data, station) {
    const ctx = document.getElementById('soundingChart').getContext('2d');

    // Destroy existing chart
    if (soundingChart) {
        soundingChart.destroy();
    }

    soundingChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => d.pressure),
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: data.map(d => d.temperature),
                    borderColor: 'rgb(255, 99, 132)',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
                    tension: 0.4
                },
                {
                    label: 'Dewpoint (°C)',
                    data: data.map(d => d.dewpoint),
                    borderColor: 'rgb(75, 192, 192)',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    reverse: true,
                    title: {
                        display: true,
                        text: 'Pressure (mb)',
                        color: '#00ff88'
                    },
                    ticks: { color: '#00ff88' },
                    grid: { color: 'rgba(0, 255, 136, 0.1)' }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Temperature (°C)',
                        color: '#00ff88'
                    },
                    ticks: { color: '#00ff88' },
                    grid: { color: 'rgba(0, 255, 136, 0.1)' }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Atmospheric Sounding - ${station}`,
                    color: '#00ff88',
                    font: { size: 14 }
                },
                legend: {
                    labels: { color: '#00ff88' }
                }
            }
        }
    });
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Radar controls
    document.getElementById('radarReflectivity').addEventListener('change', loadRadarReflectivity);
    document.getElementById('radarVelocity').addEventListener('change', loadRadarVelocity);

    document.getElementById('radarOpacity').addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('opacityValue').textContent = value;
        if (radarLayer) radarLayer.alpha = parseFloat(value);
        if (velocityLayer) velocityLayer.alpha = parseFloat(value) * 0.8;
    });

    // Animation controls
    document.getElementById('playAnimation').addEventListener('click', startRadarAnimation);
    document.getElementById('stopAnimation').addEventListener('click', stopRadarAnimation);

    // Data layer toggles
    document.getElementById('showWarnings').addEventListener('change', () => {
        loadNWSWarnings();
    });

    document.getElementById('showMesonet').addEventListener('change', () => {
        loadMesonetData();
    });

    // Sounding controls
    document.getElementById('loadSounding').addEventListener('click', loadSounding);
    document.getElementById('closeSounding').addEventListener('click', () => {
        document.getElementById('soundingsPanel').classList.remove('active');
    });

    // Search
    document.getElementById('searchBtn').addEventListener('click', searchLocation);
    document.getElementById('searchLocation').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchLocation();
    });

    // View mode
    document.getElementById('viewMode').addEventListener('change', (e) => {
        if (e.target.value === 'globe') {
            viewer.scene.mode = Cesium.SceneMode.SCENE3D;
        } else {
            viewer.scene.mode = Cesium.SceneMode.SCENE2D;
        }
    });
}

// ============================================================================
// ANIMATION
// ============================================================================

function startRadarAnimation() {
    stopRadarAnimation(); // Clear any existing animation

    const speed = parseInt(document.getElementById('animationSpeed').value);
    const interval = 2000 - (speed * 150); // Faster speed = shorter interval

    animationInterval = setInterval(() => {
        loadRadarReflectivity();
        if (document.getElementById('radarVelocity').checked) {
            loadRadarVelocity();
        }
    }, interval);

    document.getElementById('playAnimation').classList.add('active');
}

function stopRadarAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    document.getElementById('playAnimation').classList.remove('active');
}

// ============================================================================
// SEARCH & NAVIGATION
// ============================================================================

async function searchLocation() {
    const query = document.getElementById('searchLocation').value.trim();

    if (!query) return;

    showLoading(true);

    try {
        // Try to parse as coordinates first
        const coords = query.split(',').map(s => parseFloat(s.trim()));

        if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            flyToLocation(coords[1], coords[0], query);
        } else {
            // Use Cesium's geocoder
            const geocoder = viewer.geocoder.viewModel;
            const results = await geocoder.search(query);

            if (results && results.length > 0) {
                const result = results[0];
                viewer.camera.flyTo({
                    destination: result.destination,
                    duration: 2
                });
                document.getElementById('currentLocation').textContent = query;
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        alert('Location not found');
    } finally {
        showLoading(false);
    }
}

function flyToLocation(lon, lat, name) {
    viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(lon, lat, 1000000),
        duration: 2,
        orientation: {
            heading: 0.0,
            pitch: -Cesium.Math.PI_OVER_TWO,
            roll: 0.0
        }
    });

    document.getElementById('currentLocation').textContent = name || `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}

// ============================================================================
// UTILITIES
// ============================================================================

function showLoading(show) {
    const indicator = document.getElementById('loadingIndicator');
    if (show) {
        indicator.classList.add('active');
    } else {
        indicator.classList.remove('active');
    }
}

function updateLegend() {
    const colors = [
        '#00ffff', // -30 to 0 dBZ
        '#0099ff', // 0 to 20 dBZ
        '#00ff00', // 20 to 30 dBZ
        '#ffff00', // 30 to 40 dBZ
        '#ff9900', // 40 to 50 dBZ
        '#ff0000', // 50 to 60 dBZ
        '#cc0099', // 60 to 70 dBZ
        '#990099'  // 70+ dBZ
    ];

    const scale = document.getElementById('legendScale');
    scale.innerHTML = colors.map(color =>
        `<div style="flex: 1; background: ${color};"></div>`
    ).join('');
}

function updateTimestamp() {
    const now = new Date();
    document.getElementById('lastUpdate').textContent =
        now.toLocaleTimeString() + ' ' + now.toLocaleDateString();
}

function startDataRefresh() {
    updateTimestamp();

    setInterval(() => {
        if (document.getElementById('radarReflectivity').checked) {
            loadRadarReflectivity();
        }
        if (document.getElementById('radarVelocity').checked) {
            loadRadarVelocity();
        }
        loadNWSWarnings();
        loadMesonetData();
        updateTimestamp();
    }, CONFIG.updateInterval);
}

// ============================================================================
// INITIAL DATA LOAD
// ============================================================================

function loadInitialData() {
    console.log('Loading initial data...');

    loadRadarReflectivity();
    loadNWSWarnings();
    loadMesonetData();

    console.log('Initial data load complete');
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

window.addEventListener('error', (e) => {
    console.error('Application error:', e.error);
    showLoading(false);
});

console.log('🌍 Global Weather Radar Application Initialized');
console.log('Features: Radar Reflectivity, Velocity, NWS Warnings, Soundings, Mesonet Data');
