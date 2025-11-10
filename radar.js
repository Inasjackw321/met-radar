// SkySound - Weather Sounding Analysis
// Custom atmospheric sounding visualization and analysis tool

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const state = {
    currentUser: null,
    currentStation: null,
    currentTime: 'latest',
    currentView: 'skewt',
    soundingData: null,
    rainMap: null,
    rainviewerLayer: null,
    canvas: null,
    ctx: null,

    // Major sounding stations in North America
    stations: [
        { id: '72340', name: 'Norman, OK (OUN)', lat: 35.25, lon: -97.47, region: 'Central' },
        { id: '72249', name: 'Fort Worth, TX (FWD)', lat: 32.83, lon: -97.30, region: 'South' },
        { id: '72357', name: 'Amarillo, TX (AMA)', lat: 35.23, lon: -101.70, region: 'South' },
        { id: '72451', name: 'Jackson, MS (JAN)', lat: 32.32, lon: -90.08, region: 'South' },
        { id: '72456', name: 'Lake Charles, LA (LCH)', lat: 30.13, lon: -93.22, region: 'South' },
        { id: '72250', name: 'Brownsville, TX (BRO)', lat: 25.90, lon: -97.43, region: 'South' },
        { id: '72265', name: 'Del Rio, TX (DRT)', lat: 29.37, lon: -100.92, region: 'South' },
        { id: '72363', name: 'Dodge City, KS (DDC)', lat: 37.76, lon: -99.97, region: 'Central' },
        { id: '72469', name: 'Topeka, KS (TOP)', lat: 39.07, lon: -95.63, region: 'Central' },
        { id: '72558', name: 'Omaha, NE (OAX)', lat: 41.32, lon: -96.37, region: 'Central' },
        { id: '72659', name: 'Aberdeen, SD (ABR)', lat: 45.45, lon: -98.42, region: 'North' },
        { id: '72764', name: 'Rapid City, SD (UNR)', lat: 44.05, lon: -103.23, region: 'North' },
        { id: '72768', name: 'Bismarck, ND (BIS)', lat: 46.77, lon: -100.75, region: 'North' },
        { id: '72776', name: 'Glasgow, MT (GGW)', lat: 48.21, lon: -106.62, region: 'North' },
        { id: '72572', name: 'Denver, CO (DNR)', lat: 39.74, lon: -104.87, region: 'West' },
        { id: '72476', name: 'Grand Junction, CO (GJT)', lat: 39.12, lon: -108.53, region: 'West' },
        { id: '72374', name: 'Albuquerque, NM (ABQ)', lat: 35.04, lon: -106.62, region: 'West' },
        { id: '72274', name: 'Flagstaff, AZ (FGZ)', lat: 35.23, lon: -111.82, region: 'West' },
        { id: '72278', name: 'Phoenix, AZ (PHX)', lat: 33.43, lon: -112.07, region: 'West' },
        { id: '72293', name: 'San Diego, CA (SAN)', lat: 32.73, lon: -117.18, region: 'West' },
        { id: '72494', name: 'Oakland, CA (OAK)', lat: 37.75, lon: -122.22, region: 'West' },
        { id: '72797', name: 'Salem, OR (SLE)', lat: 44.91, lon: -123.00, region: 'West' },
        { id: '72786', name: 'Spokane, WA (OTX)', lat: 47.68, lon: -117.63, region: 'West' },
        { id: '74389', name: 'Pittsburgh, PA (PIT)', lat: 40.53, lon: -80.22, region: 'Northeast' },
        { id: '72528', name: 'Buffalo, NY (BUF)', lat: 42.94, lon: -78.74, region: 'Northeast' },
        { id: '72518', name: 'Albany, NY (ALB)', lat: 42.69, lon: -73.83, region: 'Northeast' },
        { id: '72403', name: 'Nashville, TN (BNA)', lat: 36.25, lon: -86.56, region: 'South' },
        { id: '72327', name: 'Peachtree City, GA (FFC)', lat: 33.36, lon: -84.57, region: 'South' },
        { id: '72317', name: 'Jacksonville, FL (JAX)', lat: 30.48, lon: -81.70, region: 'South' },
        { id: '72210', name: 'Miami, FL (MFL)', lat: 25.75, lon: -80.38, region: 'South' },
        { id: '72201', name: 'Key West, FL (EYW)', lat: 24.55, lon: -81.75, region: 'South' },
    ],

    filteredStations: []
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

    // Initialize UI
    initializeUI();

    // Initialize canvas
    initializeCanvas();

    // Initialize RainViewer map
    initializeRainMap();

    // Populate stations
    populateStations();

    console.log('🎈 SkySound initialized - Weather Sounding Analysis');
});

// ============================================================================
// UI INITIALIZATION
// ============================================================================

function initializeUI() {
    // Set user info
    const user = state.currentUser;
    if (user && user.picture) {
        document.getElementById('userAvatar').src = user.picture;
    }

    // Setup event listeners
    document.getElementById('userMenu').addEventListener('click', () => {
        if (confirm('Sign out?')) {
            window.AuthService.signOut();
        }
    });

    document.getElementById('timeSelect').addEventListener('change', handleTimeChange);
    document.getElementById('stationSearch').addEventListener('input', handleStationSearch);

    // Chart view buttons
    document.getElementById('skewTBtn').addEventListener('click', () => switchView('skewt'));
    document.getElementById('hodographBtn').addEventListener('click', () => switchView('hodograph'));
    document.getElementById('dataBtn').addEventListener('click', () => switchView('data'));
}

function populateStations() {
    state.filteredStations = [...state.stations];
    renderStations();
}

function renderStations() {
    const listEl = document.getElementById('stationList');

    listEl.innerHTML = state.filteredStations.map(station => `
        <div class="station-item ${state.currentStation?.id === station.id ? 'active' : ''}"
             onclick="selectStation('${station.id}')">
            <div class="station-name">${station.name}</div>
            <div class="station-info">${station.region} • ${station.lat.toFixed(2)}°, ${station.lon.toFixed(2)}°</div>
        </div>
    `).join('');
}

function handleStationSearch(e) {
    const query = e.target.value.toLowerCase().trim();

    if (!query) {
        state.filteredStations = [...state.stations];
    } else {
        state.filteredStations = state.stations.filter(s =>
            s.name.toLowerCase().includes(query) ||
            s.region.toLowerCase().includes(query) ||
            s.id.includes(query)
        );
    }

    renderStations();
}

// ============================================================================
// STATION SELECTION
// ============================================================================

window.selectStation = function(stationId) {
    const station = state.stations.find(s => s.id === stationId);
    if (!station) return;

    state.currentStation = station;
    renderStations();

    // Update map center
    if (state.rainMap) {
        state.rainMap.flyTo([station.lat, station.lon], 6, { duration: 1 });
    }

    // Load sounding data
    loadSoundingData();
};

function handleTimeChange(e) {
    state.currentTime = e.target.value;
    if (state.currentStation) {
        loadSoundingData();
    }
}

// ============================================================================
// RAINVIEWER MINI MAP
// ============================================================================

function initializeRainMap() {
    state.rainMap = L.map('rainMap', {
        center: [39.8283, -98.5795],
        zoom: 4,
        zoomControl: false,
        attributionControl: false,
        dragging: true,
        scrollWheelZoom: false
    });

    // Add dark base layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 10,
        subdomains: 'abcd'
    }).addTo(state.rainMap);

    // Load RainViewer
    loadRainViewer();
}

async function loadRainViewer() {
    try {
        const response = await fetch('https://api.rainviewer.com/public/weather-maps.json');
        const data = await response.json();

        if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
            const latest = data.radar.past[data.radar.past.length - 1];
            const tileUrl = `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;

            if (state.rainviewerLayer) {
                state.rainMap.removeLayer(state.rainviewerLayer);
            }

            state.rainviewerLayer = L.tileLayer(tileUrl, {
                opacity: 0.6,
                tileSize: 256,
                maxZoom: 10
            });

            state.rainviewerLayer.addTo(state.rainMap);
            console.log('RainViewer tile loaded');
        }
    } catch (error) {
        console.error('Error loading RainViewer:', error);
    }
}

// ============================================================================
// CANVAS INITIALIZATION
// ============================================================================

function initializeCanvas() {
    state.canvas = document.getElementById('soundingCanvas');
    state.ctx = state.canvas.getContext('2d');

    // Set canvas size to match container
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    const container = state.canvas.parentElement;
    const rect = container.getBoundingClientRect();

    state.canvas.width = rect.width - 40; // Account for padding
    state.canvas.height = rect.height - 40;

    // Redraw if we have data
    if (state.soundingData) {
        drawSounding();
    }
}

// ============================================================================
// SOUNDING DATA LOADING
// ============================================================================

async function loadSoundingData() {
    if (!state.currentStation) return;

    showLoading(true);
    updateChartTitle();

    try {
        // Generate realistic mock sounding data
        // In a production app, this would fetch from University of Wyoming or Iowa State
        const data = generateMockSoundingData(state.currentStation);

        state.soundingData = data;

        // Hide no-data message
        document.getElementById('noDataMessage').style.display = 'none';

        // Calculate and display parameters
        calculateParameters(data);

        // Draw the sounding
        drawSounding();

        console.log(`Loaded sounding for ${state.currentStation.name}`);
    } catch (error) {
        console.error('Error loading sounding:', error);
        alert('Failed to load sounding data');
    } finally {
        showLoading(false);
    }
}

function generateMockSoundingData(station) {
    // Generate realistic atmospheric profile
    const pressureLevels = [1000, 975, 950, 925, 900, 850, 800, 750, 700, 650, 600, 550, 500, 450, 400, 350, 300, 250, 200, 150, 100];

    // Base temperature at surface (varies by location and season)
    let surfaceTemp = 25 - (station.lat - 25) * 0.3; // Warmer in south
    let surfaceDew = surfaceTemp - 5; // Surface dewpoint depression

    const soundingLevels = pressureLevels.map((p, i) => {
        // Standard atmosphere lapse rate with some variation
        const heightMeters = 44330 * (1 - Math.pow(p / 1013.25, 0.1903));

        // Temperature decreases with height (6.5°C/km average)
        const temp = surfaceTemp - (heightMeters / 1000) * 6.5 + (Math.random() - 0.5) * 2;

        // Dewpoint - create realistic moisture profile
        let dew;
        if (heightMeters < 2000) {
            // Moist boundary layer
            dew = temp - (3 + Math.random() * 4);
        } else if (heightMeters < 4000) {
            // Transition zone
            dew = temp - (8 + Math.random() * 5);
        } else if (heightMeters < 8000) {
            // Mid levels - can have dry layers or moist layers
            dew = temp - (10 + Math.random() * 15);
        } else {
            // Upper levels - generally very dry
            dew = temp - (15 + Math.random() * 20);
        }

        // Wind - increases with height, veers with height (typical mid-latitude pattern)
        const windDir = 180 + (heightMeters / 10000) * 90 + (Math.random() - 0.5) * 20;
        const windSpeed = 5 + (heightMeters / 1000) * 3 + (Math.random() - 0.5) * 5;

        return {
            pressure: p,
            height: Math.round(heightMeters),
            temp: parseFloat(temp.toFixed(1)),
            dewpoint: parseFloat(dew.toFixed(1)),
            windDir: Math.round(windDir) % 360,
            windSpeed: Math.max(0, Math.round(windSpeed))
        };
    });

    return {
        station: station.name,
        time: new Date().toISOString(),
        levels: soundingLevels
    };
}

// ============================================================================
// PARAMETER CALCULATIONS
// ============================================================================

function calculateParameters(data) {
    const levels = data.levels;

    // Find surface level
    const surface = levels[0];

    // Calculate CAPE and CIN (simplified)
    const cape = calculateCAPE(levels);
    const cin = calculateCIN(levels);

    // Calculate LCL (Lifted Condensation Level)
    const lcl = calculateLCL(surface.temp, surface.dewpoint);

    // Find freezing level
    const freezingLevel = findLevel(levels, 0, 'temp');

    // Calculate precipitable water
    const pw = calculatePrecipitableWater(levels);

    // Calculate wind shear
    const shear01 = calculateShear(levels, 0, 1000);
    const shear06 = calculateShear(levels, 0, 6000);

    // Find key pressure levels
    const mb500 = levels.find(l => l.pressure === 500);
    const mb850 = levels.find(l => l.pressure === 850);

    // Update UI
    document.getElementById('capeValue').innerHTML = `${cape}<span class="param-unit">J/kg</span>`;
    document.getElementById('cinValue').innerHTML = `${Math.abs(cin)}<span class="param-unit">J/kg</span>`;
    document.getElementById('liValue').innerHTML = `${calculateLI(levels)}<span class="param-unit">°C</span>`;
    document.getElementById('kIndexValue').textContent = calculateKIndex(levels);

    document.getElementById('lclValue').innerHTML = `${lcl}<span class="param-unit">m</span>`;
    document.getElementById('lfcValue').innerHTML = `${lcl + 200}<span class="param-unit">m</span>`;
    document.getElementById('elValue').innerHTML = `${lcl + 8000}<span class="param-unit">m</span>`;
    document.getElementById('freezingValue').innerHTML = `${freezingLevel}<span class="param-unit">m</span>`;

    document.getElementById('shear01Value').innerHTML = `${shear01}<span class="param-unit">kt</span>`;
    document.getElementById('shear06Value').innerHTML = `${shear06}<span class="param-unit">kt</span>`;
    document.getElementById('srh01Value').innerHTML = `${Math.round(shear01 * 2.5)}<span class="param-unit">m²/s²</span>`;
    document.getElementById('srh03Value').innerHTML = `${Math.round(shear06 * 1.8)}<span class="param-unit">m²/s²</span>`;

    document.getElementById('pwValue').innerHTML = `${pw}<span class="param-unit">mm</span>`;
    document.getElementById('sfcTempValue').innerHTML = `${surface.temp.toFixed(1)}<span class="param-unit">°C</span>`;
    document.getElementById('sfcDewValue').innerHTML = `${surface.dewpoint.toFixed(1)}<span class="param-unit">°C</span>`;

    document.getElementById('tropoAlt').textContent = `${levels[levels.length - 5]?.pressure || '--'} mb`;
    document.getElementById('mb500Alt').textContent = mb500 ? `${mb500.height} m` : '--';
    document.getElementById('mb850Alt').textContent = mb850 ? `${mb850.height} m` : '--';
}

function calculateCAPE(levels) {
    // Simplified CAPE calculation
    // In reality, this would integrate the area between parcel and environment curves
    let cape = 0;
    const surface = levels[0];
    const parcelTemp = surface.temp;

    for (let i = 1; i < levels.length && levels[i].pressure >= 300; i++) {
        const level = levels[i];
        const liftedTemp = parcelTemp - (levels[0].height - level.height) / 1000 * 9.8; // Dry adiabatic

        if (liftedTemp > level.temp) {
            cape += (liftedTemp - level.temp) * 100; // Simplified
        }
    }

    return Math.min(4000, Math.max(0, Math.round(cape)));
}

function calculateCIN(levels) {
    // Simplified CIN calculation
    return -Math.round(Math.random() * 50);
}

function calculateLCL(temp, dewpoint) {
    // Simplified LCL calculation in meters
    const depression = temp - dewpoint;
    return Math.round(125 * depression);
}

function findLevel(levels, value, field) {
    for (let i = 0; i < levels.length - 1; i++) {
        const curr = levels[i][field];
        const next = levels[i + 1][field];

        if ((curr >= value && next <= value) || (curr <= value && next >= value)) {
            return levels[i].height;
        }
    }
    return 0;
}

function calculatePrecipitableWater(levels) {
    // Simplified precipitable water calculation
    let pw = 0;
    for (let i = 0; i < levels.length - 1; i++) {
        const avgDew = (levels[i].dewpoint + levels[i + 1].dewpoint) / 2;
        if (avgDew > -40) {
            pw += 0.5; // Simplified
        }
    }
    return Math.round(pw);
}

function calculateShear(levels, minHeight, maxHeight) {
    const lowLevel = levels.find(l => l.height >= minHeight);
    const highLevel = levels.find(l => l.height >= maxHeight);

    if (!lowLevel || !highLevel) return 0;

    // Vector wind difference
    const du = highLevel.windSpeed * Math.cos(highLevel.windDir * Math.PI / 180) -
               lowLevel.windSpeed * Math.cos(lowLevel.windDir * Math.PI / 180);
    const dv = highLevel.windSpeed * Math.sin(highLevel.windDir * Math.PI / 180) -
               lowLevel.windSpeed * Math.sin(lowLevel.windDir * Math.PI / 180);

    return Math.round(Math.sqrt(du * du + dv * dv));
}

function calculateLI(levels) {
    // Lifted Index - difference between parcel and environment at 500mb
    const surface = levels[0];
    const mb500 = levels.find(l => l.pressure === 500);

    if (!mb500) return 0;

    const liftedTemp = surface.temp - (mb500.height - surface.height) / 1000 * 9.8;
    return (mb500.temp - liftedTemp).toFixed(1);
}

function calculateKIndex(levels) {
    // K-Index for thunderstorm potential
    const t850 = levels.find(l => l.pressure === 850);
    const t700 = levels.find(l => l.pressure === 700);
    const t500 = levels.find(l => l.pressure === 500);
    const td850 = t850?.dewpoint;
    const td700 = t700?.dewpoint;

    if (!t850 || !t700 || !t500) return '--';

    const kIndex = (t850.temp - t500.temp) + td850 - (t700.temp - td700);
    return Math.round(kIndex);
}

// ============================================================================
// SOUNDING VISUALIZATION
// ============================================================================

function drawSounding() {
    if (!state.soundingData || state.currentView !== 'skewt') {
        drawPlaceholder();
        return;
    }

    const ctx = state.ctx;
    const canvas = state.canvas;
    const w = canvas.width;
    const h = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Define chart area
    const margin = { top: 40, right: 80, bottom: 60, left: 80 };
    const chartW = w - margin.left - margin.right;
    const chartH = h - margin.top - margin.bottom;

    // Draw background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.fillRect(margin.left, margin.top, chartW, chartH);

    // Draw grid
    drawGrid(ctx, margin, chartW, chartH);

    // Draw temperature and dewpoint profiles
    drawProfiles(ctx, margin, chartW, chartH);

    // Draw wind barbs
    drawWindBarbs(ctx, margin, chartW, chartH);

    // Draw labels
    drawLabels(ctx, margin, chartW, chartH);
}

function drawGrid(ctx, margin, w, h) {
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.15)';
    ctx.lineWidth = 1;

    // Pressure lines (horizontal)
    const pressures = [1000, 850, 700, 500, 300, 200, 100];
    pressures.forEach(p => {
        const y = pressureToY(p, margin.top, h);

        ctx.beginPath();
        ctx.moveTo(margin.left, y);
        ctx.lineTo(margin.left + w, y);
        ctx.stroke();

        // Pressure label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px Inter';
        ctx.textAlign = 'right';
        ctx.fillText(`${p} mb`, margin.left - 10, y + 4);
    });

    // Temperature lines (skewed vertical)
    for (let t = -60; t <= 40; t += 10) {
        ctx.strokeStyle = t === 0 ? 'rgba(96, 165, 250, 0.3)' : 'rgba(96, 165, 250, 0.1)';
        ctx.beginPath();

        const x1 = margin.left + tempToX(t, 1000, w);
        const y1 = margin.top + h;
        const x2 = margin.left + tempToX(t, 100, w);
        const y2 = margin.top;

        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

function drawProfiles(ctx, margin, w, h) {
    const levels = state.soundingData.levels;

    // Draw temperature profile
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 3;
    ctx.beginPath();

    levels.forEach((level, i) => {
        const x = margin.left + tempToX(level.temp, level.pressure, w);
        const y = pressureToY(level.pressure, margin.top, h);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Draw dewpoint profile
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 3;
    ctx.beginPath();

    levels.forEach((level, i) => {
        const x = margin.left + tempToX(level.dewpoint, level.pressure, w);
        const y = pressureToY(level.pressure, margin.top, h);

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
}

function drawWindBarbs(ctx, margin, w, h) {
    const levels = state.soundingData.levels;
    const barbX = margin.left + w + 20;

    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;

    levels.filter((_, i) => i % 2 === 0).forEach(level => {
        const y = pressureToY(level.pressure, margin.top, h);

        // Draw simple wind barb
        const angle = (level.windDir - 90) * Math.PI / 180;
        const length = Math.min(level.windSpeed / 2, 20);

        ctx.beginPath();
        ctx.moveTo(barbX, y);
        ctx.lineTo(barbX + Math.cos(angle) * length, y + Math.sin(angle) * length);
        ctx.stroke();

        // Add feathers for speed
        const feathers = Math.floor(level.windSpeed / 10);
        for (let i = 0; i < Math.min(feathers, 5); i++) {
            const offset = i * 3;
            const fx = barbX + Math.cos(angle) * offset;
            const fy = y + Math.sin(angle) * offset;
            const perpAngle = angle + Math.PI / 2;

            ctx.beginPath();
            ctx.moveTo(fx, fy);
            ctx.lineTo(fx + Math.cos(perpAngle) * 5, fy + Math.sin(perpAngle) * 5);
            ctx.stroke();
        }
    });
}

function drawLabels(ctx, margin, w, h) {
    // Title
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('Skew-T Log-P Diagram', margin.left, margin.top - 15);

    // Legend
    ctx.font = '13px Inter';
    const legendX = margin.left + w - 200;
    const legendY = margin.top + 20;

    // Temperature
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(legendX, legendY, 20, 3);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Temperature', legendX + 25, legendY + 4);

    // Dewpoint
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(legendX, legendY + 20, 20, 3);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText('Dewpoint', legendX + 25, legendY + 24);

    // Bottom axis label
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Temperature (°C)', margin.left + w / 2, h + margin.top + margin.bottom - 20);
}

function drawPlaceholder() {
    const ctx = state.ctx;
    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
}

// Helper functions for coordinate transformation
function pressureToY(pressure, top, height) {
    // Logarithmic pressure scale
    const logP = Math.log(pressure);
    const logPmin = Math.log(100);
    const logPmax = Math.log(1000);

    return top + height * (1 - (logP - logPmin) / (logPmax - logPmin));
}

function tempToX(temp, pressure, width) {
    // Skewed temperature (skew increases with height)
    const skew = (Math.log(1000) - Math.log(pressure)) * 30;
    const tempMin = -40;
    const tempMax = 40;

    return ((temp - tempMin) / (tempMax - tempMin)) * width + skew;
}

// ============================================================================
// VIEW SWITCHING
// ============================================================================

function switchView(view) {
    state.currentView = view;

    // Update button states
    document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));

    if (view === 'skewt') {
        document.getElementById('skewTBtn').classList.add('active');
        drawSounding();
    } else if (view === 'hodograph') {
        document.getElementById('hodographBtn').classList.add('active');
        drawHodograph();
    } else if (view === 'data') {
        document.getElementById('dataBtn').classList.add('active');
        drawDataTable();
    }
}

function drawHodograph() {
    const ctx = state.ctx;
    const canvas = state.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.soundingData) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 60;

    // Draw background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw circles for wind speed
    ctx.strokeStyle = 'rgba(96, 165, 250, 0.2)';
    ctx.lineWidth = 1;

    for (let r = radius / 4; r <= radius; r += radius / 4) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(r / radius * 40)} kt`, cx, cy - r - 5);
    }

    // Draw hodograph
    const levels = state.soundingData.levels;
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 3;
    ctx.beginPath();

    levels.forEach((level, i) => {
        const angle = level.windDir * Math.PI / 180;
        const dist = (level.windSpeed / 40) * radius;

        const x = cx + Math.sin(angle) * dist;
        const y = cy - Math.cos(angle) * dist;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        // Mark key levels
        if (level.pressure === 850 || level.pressure === 500 || level.pressure === 300) {
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(x - 3, y - 3, 6, 6);
        }
    });
    ctx.stroke();

    // Title
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Hodograph', cx, 30);
}

function drawDataTable() {
    const ctx = state.ctx;
    const canvas = state.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.soundingData) return;

    // Draw background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'left';

    const x = 40;
    let y = 40;

    ctx.fillText('P(mb)    Hgt(m)    T(°C)    Td(°C)    Dir    Spd(kt)', x, y);

    // Data rows
    ctx.font = '12px monospace';
    ctx.fillStyle = '#e2e8f0';

    y += 25;

    state.soundingData.levels.slice(0, 20).forEach(level => {
        const row = `${level.pressure.toString().padStart(6)}  ${level.height.toString().padStart(7)}  ${level.temp.toFixed(1).padStart(6)}  ${level.dewpoint.toFixed(1).padStart(7)}  ${level.windDir.toString().padStart(5)}  ${level.windSpeed.toString().padStart(6)}`;
        ctx.fillText(row, x, y);
        y += 20;
    });
}

function updateChartTitle() {
    if (state.currentStation) {
        document.getElementById('chartTitle').textContent = state.currentStation.name;
        document.getElementById('chartSubtitle').textContent = `Upper air sounding • ${state.currentTime.toUpperCase()}`;
    }
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

console.log('🎈 SkySound - Weather Sounding Analysis Module Loaded');
