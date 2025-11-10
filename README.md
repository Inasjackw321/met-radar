# Global Weather Radar - Advanced Meteorological Visualization

A comprehensive web-based weather radar application featuring a 3D globe visualization with real-time radar data, velocity displays, NWS warnings, atmospheric soundings, and mesonet weather station data.

## Features

### Core Visualization
- **3D Interactive Globe**: Powered by Cesium.js for stunning 3D visualization
- **2D Map Mode**: Switch between 3D globe and 2D map views
- **Smooth Navigation**: Fly-to animations, geocoding, and location search

### Radar Data
- **Radar Reflectivity**: Real-time NEXRAD radar data showing precipitation intensity
- **Radar Velocity**: Doppler velocity data showing wind direction and speed
- **Composite Radar**: Multiple radar products combined
- **Adjustable Opacity**: Fine-tune layer transparency
- **Radar Animation**: Animate radar loops with adjustable speed

### Weather Data Layers

#### NWS Warnings & Alerts
- Real-time severe weather warnings
- Tornado warnings
- Severe thunderstorm warnings
- Flash flood warnings
- Winter weather alerts
- Interactive warning polygons on globe
- Detailed warning information

#### Mesonet Stations
- Surface weather observations
- Temperature and dewpoint
- Wind speed and direction
- Barometric pressure
- Relative humidity
- Real-time updates from weather stations

#### Atmospheric Soundings
- Upper air temperature profiles
- Dewpoint profiles
- Interactive Skew-T diagrams
- Multiple sounding stations
- Real-time atmospheric data

### Advanced Features
- **Lightning Strikes**: Real-time lightning data overlay
- **Satellite Imagery**: Visible and infrared satellite views
- **Auto-refresh**: Automatic data updates every 5 minutes
- **Location Search**: Search by city name or coordinates
- **Responsive Design**: Works on desktop and mobile devices

## Technology Stack

- **Cesium.js**: 3D globe and terrain visualization
- **Leaflet.js**: 2D mapping fallback
- **Chart.js**: Atmospheric sounding charts
- **Vanilla JavaScript**: No framework dependencies
- **HTML5 & CSS3**: Modern web standards

## Data Sources

- **Radar Data**: Iowa State Mesonet NEXRAD WMS
- **NWS Warnings**: NOAA National Weather Service API
- **Mesonet Data**: Synoptic Data API
- **Soundings**: NOAA RUC Soundings
- **Satellite**: Cesium Ion Imagery

## Installation & Setup

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Python 3 (for local development server)
- Internet connection for data feeds

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd met-radar
   ```

2. **Start the development server**
   ```bash
   npm start
   # OR
   python3 -m http.server 8000
   ```

3. **Open in browser**
   ```
   http://localhost:8000
   ```

### Configuration

#### Cesium Ion Token
To use advanced Cesium features, get a free token from [Cesium Ion](https://cesium.com/ion/):

1. Sign up at https://cesium.com/ion/
2. Get your access token
3. Replace the token in `app.js`:
   ```javascript
   const CONFIG = {
       cesiumToken: 'YOUR_TOKEN_HERE',
       ...
   };
   ```

#### API Keys (Optional)
For production use, configure API keys for:
- **Synoptic Data API**: Mesonet data access
- **RapidAPI**: Additional weather data sources
- **Custom Backend**: Proxy NWS API calls

## Usage Guide

### Basic Controls

#### Radar Controls
- **Radar Reflectivity**: Toggle base radar imagery
- **Radar Velocity**: Show Doppler velocity data
- **Opacity Slider**: Adjust radar layer transparency
- **Animation Speed**: Control radar loop speed
- **Play/Pause**: Start or stop radar animation

#### View Controls
- **View Mode**: Switch between 3D Globe and 2D Map
- **Mouse Controls**:
  - Left-click + drag: Rotate globe
  - Right-click + drag: Pan view
  - Scroll wheel: Zoom in/out
  - Middle-click + drag: Adjust camera angle

#### Data Layers
- **NWS Warnings**: Display active weather warnings
- **Mesonet Stations**: Show weather station data
- **Lightning Strikes**: Real-time lightning detection
- **Satellite Imagery**: Overlay satellite views

### Loading Soundings

1. Select a sounding station from the dropdown
2. Click "Load Sounding"
3. View temperature and dewpoint profiles
4. Analyze atmospheric stability

### Search & Navigation

1. Enter location in search box:
   - City name: "Oklahoma City"
   - Coordinates: "35.5, -97.5" (lat, lon)
2. Click "Search" or press Enter
3. Globe will fly to location

### Reading Radar Data

#### Reflectivity (dBZ Scale)
- **-30 to 0 dBZ**: Light precipitation
- **0 to 20 dBZ**: Light rain/snow
- **20 to 40 dBZ**: Moderate precipitation
- **40 to 50 dBZ**: Heavy rain
- **50 to 60 dBZ**: Very heavy rain/hail
- **60+ dBZ**: Intense storms, large hail

#### Velocity (Color Scale)
- **Green/Blue**: Wind moving toward radar
- **Red/Orange**: Wind moving away from radar
- **Adjacent red/green**: Rotation/tornado signature

## Project Structure

```
met-radar/
├── index.html          # Main application page
├── app.js              # Core application logic
├── package.json        # Project configuration
├── .gitignore         # Git ignore rules
└── README.md          # This file
```

## Development

### Adding New Features

1. **New Data Layer**:
   - Add layer toggle in HTML
   - Implement load function in app.js
   - Add to `setupEventListeners()`

2. **New Weather Product**:
   - Configure WMS URL in CONFIG
   - Create imagery provider
   - Add to viewer.imageryLayers

3. **Custom Styling**:
   - Modify CSS in `<style>` section
   - Update color schemes
   - Adjust panel layouts

### Performance Optimization

- **Reduce Update Frequency**: Increase `updateInterval` in CONFIG
- **Limit Data Points**: Filter mesonet stations by distance
- **Cache Data**: Implement local storage caching
- **Lazy Loading**: Load data only when layers are enabled

## Troubleshooting

### Common Issues

**Globe Not Loading**
- Check Cesium token is valid
- Verify internet connection
- Check browser console for errors

**No Radar Data**
- Verify WMS endpoints are accessible
- Check CORS policy in browser
- Use CORS proxy for development

**Warnings Not Appearing**
- NWS API requires User-Agent header
- May need backend proxy
- Mock data loads as fallback

**Performance Issues**
- Disable unused layers
- Reduce animation speed
- Lower radar opacity
- Use 2D map mode

## API Endpoints

### Radar Data
```
Iowa State Mesonet WMS:
- Reflectivity: https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi
- Velocity: https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0v.cgi
```

### NWS Warnings
```
https://api.weather.gov/alerts/active
```

### Mesonet Data
```
https://api.synopticdata.com/v2/stations/latest
```

### Soundings
```
https://rucsoundings.noaa.gov/get_raobs.cgi
```

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Note**: WebGL 2.0 support required for optimal 3D rendering.

## Future Enhancements

- [ ] Real-time lightning data integration
- [ ] Hurricane tracking
- [ ] Storm cell tracking and prediction
- [ ] Historical radar playback
- [ ] Mobile app version
- [ ] Severe weather alerts/notifications
- [ ] Multiple radar sites composite
- [ ] Hodograph display for soundings
- [ ] CAPE/Shear calculations
- [ ] Custom color schemes
- [ ] Export images/animations
- [ ] Social media sharing

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for any purpose.

## Credits

- **Cesium.js**: 3D geospatial visualization
- **Iowa State Mesonet**: NEXRAD radar data
- **NOAA/NWS**: Weather warnings and soundings
- **Synoptic Data**: Mesonet observations
- **Chart.js**: Data visualization

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check browser console for error messages
- Review API documentation for data sources

## Acknowledgments

Built for meteorologists, storm chasers, weather enthusiasts, and anyone interested in real-time weather visualization.

---

**Stay Weather Aware!** 🌪️⛈️🌦️
