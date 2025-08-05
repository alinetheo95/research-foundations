// Initialize the map
var map = new maplibregl.Map({
    container: 'mycelium-map',
    style: 'style.json', // Use your local style file
    center: [-73.97144, 40.70491], // Global center
    zoom: 6 // Zoomed out to see all points globally
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl());

// Parse CSV data and convert to GeoJSON
function parseMyceliumCSVToGeoJSON(csvString) {
    const parsed = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimitersToGuess: [',', '\t', '|', ';']
    });

    const features = [];
    
    parsed.data.forEach(row => {
        // Clean headers by trimming whitespace
        const cleanedRow = {};
        Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            cleanedRow[cleanKey] = row[key];
        });

        // Create features for different location types
        const locations = [
            { type: 'plant', lat: cleanedRow['Plant_Lat'], lng: cleanedRow['Plant_Long'] },
            { type: 'fungal', lat: cleanedRow['Fung_Lat'], lng: cleanedRow['Fung_Long'] },
            { type: 'soil', lat: cleanedRow['Soil_Lat'], lng: cleanedRow['Soil_Long'] }
        ];

        locations.forEach(location => {
            // Skip if coordinates are missing or invalid
            if (!location.lat || !location.lng || 
                location.lat === '' || location.lng === '' ||
                isNaN(parseFloat(location.lat)) || isNaN(parseFloat(location.lng))) {
                return;
            }

            const lat = parseFloat(location.lat);
            const lng = parseFloat(location.lng);

            // Skip invalid coordinates
            if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                return;
            }

            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat] // GeoJSON uses [longitude, latitude]
                },
                properties: {
                    'location-type': location.type,
                    'plant-species': cleanedRow['PlantSpecies'] || 'Unknown',
                    'fungal-genus': cleanedRow['FungalGenus'] || 'Unknown',
                    'plant-family': cleanedRow['PlantFamily'] || 'Unknown',
                    'plant-life-history': cleanedRow['PLANTLIFEHISTORY'] || 'Unknown',
                    'fungal-group': cleanedRow['FUNGROUP'] || 'Unknown',
                    'location': cleanedRow['LOCATION'] || 'Unknown',
                    'domesticated': cleanedRow['DOMESTICATED'] || 'Unknown'
                }
            });
        });
    });

    return {
        type: 'FeatureCollection',
        features: features
    };
}

// Create popup content for mycelium data
function createMyceliumPopupContent(properties) {
    const locationType = properties['location-type'];
    let title = '';
    let content = '';

    switch(locationType) {
        case 'plant':
            title = `Plant Location: ${properties['plant-species']}`;
            content = `
                <div class="popup-field">
                    <span class="popup-label">Species:</span> ${properties['plant-species']}
                </div>
                <div class="popup-field">
                    <span class="popup-label">Family:</span> ${properties['plant-family']}
                </div>
                <div class="popup-field">
                    <span class="popup-label">Life History:</span> ${properties['plant-life-history']}
                </div>
                <div class="popup-field">
                    <span class="popup-label">Domesticated:</span> ${properties['domesticated']}
                </div>
            `;
            break;
        case 'fungal':
            title = `Fungal Location: ${properties['fungal-genus']}`;
            content = `
                <div class="popup-field">
                    <span class="popup-label">Genus:</span> ${properties['fungal-genus']}
                </div>
                <div class="popup-field">
                    <span class="popup-label">Fungal Group:</span> ${properties['fungal-group']}
                </div>
                <div class="popup-field">
                    <span class="popup-label">Associated Plant:</span> ${properties['plant-species']}
                </div>
            `;
            break;
        case 'soil':
            title = `Soil Sample Location`;
            content = `
                <div class="popup-field">
                    <span class="popup-label">Associated Plant:</span> ${properties['plant-species']}
                </div>
                <div class="popup-field">
                    <span class="popup-label">Associated Fungus:</span> ${properties['fungal-genus']}
                </div>
            `;
            break;
    }

    return `
        <div class="popup-content" style="font-family: 'Courier New', monospace; max-width: 300px;">
            <div class="popup-title" style="font-family: 'Courier New', monospace; font-weight: bold; margin-bottom: 8px; color: #2c5530;">${title}</div>
            ${content}
            <div class="popup-field">
                <span class="popup-label">Location:</span> ${properties['location']}
            </div>
        </div>
    `;
}

// Helper function to calculate distance between two points
function calculateDistance(coord1, coord2) {
    const lat1 = coord1[1], lon1 = coord1[0];
    const lat2 = coord2[1], lon2 = coord2[0];
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Create organic curved connections
function createOrganicConnection(start, end, curveIntensity = 0.3) {
    const startLng = start[0], startLat = start[1];
    const endLng = end[0], endLat = end[1];
    
    // Calculate control points for bezier-like curve
    const midLng = (startLng + endLng) / 2;
    const midLat = (startLat + endLat) / 2;
    
    // Add some randomness and curve to the connection
    const distance = calculateDistance(start, end);
    const curveOffset = (Math.random() - 0.5) * curveIntensity * distance * 0.01;
    const perpOffset = (Math.random() - 0.5) * curveIntensity * distance * 0.01;
    
    // Create multiple intermediate points for smooth curves
    const segments = Math.max(3, Math.floor(distance / 100)); // More segments for longer distances
    const coordinates = [];
    
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        
        // Quadratic bezier curve formula with organic variation
        const curveFactor = Math.sin(t * Math.PI) * curveOffset;
        const organicVariation = (Math.random() - 0.5) * 0.002 * Math.sin(t * Math.PI * 2);
        
        const lng = startLng + (endLng - startLng) * t + curveFactor + organicVariation;
        const lat = startLat + (endLat - startLat) * t + perpOffset * Math.sin(t * Math.PI) + organicVariation;
        
        coordinates.push([lng, lat]);
    }
    
    return coordinates;
}

// Create connection lines between related points with organic curves
function createMyceliumConnections(geoJsonData) {
    const lineFeatures = [];
    const allPoints = geoJsonData.features;
    const maxConnections = 2000; // Limit connections to prevent performance issues
    
    // Create connections based on proximity and species relationships
    for (let i = 0; i < allPoints.length && lineFeatures.length < maxConnections; i++) {
        const point1 = allPoints[i];
        
        // Find nearby points to connect to (within reasonable distance)
        const nearbyPoints = allPoints.filter((point2, j) => {
            if (i >= j) return false; // Avoid duplicate connections
            
            const distance = calculateDistance(
                point1.geometry.coordinates, 
                point2.geometry.coordinates
            );
            
            // Connect points that are within 500km and have some relationship
            if (distance > 500) return false;
            
            // Higher probability of connection for same species or related types
            const sameSpecies = point1.properties['plant-species'] === point2.properties['plant-species'];
            const sameFungus = point1.properties['fungal-genus'] === point2.properties['fungal-genus'];
            const relatedTypes = (point1.properties['location-type'] === 'plant' && point2.properties['location-type'] === 'fungal') ||
                                (point1.properties['location-type'] === 'soil' && point2.properties['location-type'] === 'plant');
            
            // Random connection probability based on relationships
            let connectionProbability = 0.05; // Base 5% chance
            if (sameSpecies) connectionProbability += 0.3;
            if (sameFungus) connectionProbability += 0.2;
            if (relatedTypes) connectionProbability += 0.15;
            if (distance < 100) connectionProbability += 0.1;
            
            return Math.random() < connectionProbability;
        });
        
        // Connect to nearby points with organic curves
        nearbyPoints.forEach(point2 => {
            const organicCoordinates = createOrganicConnection(
                point1.geometry.coordinates,
                point2.geometry.coordinates,
                Math.random() * 0.5 + 0.2 // Random curve intensity
            );
            
            let connectionType = 'general';
            if (point1.properties['location-type'] === 'plant' && point2.properties['location-type'] === 'fungal') {
                connectionType = 'plant-fungal';
            } else if (point1.properties['location-type'] === 'soil' && point2.properties['location-type'] === 'plant') {
                connectionType = 'soil-plant';
            }
            
            lineFeatures.push({
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: organicCoordinates
                },
                properties: {
                    'connection-type': connectionType,
                    'plant-species': point1.properties['plant-species'],
                    'distance': calculateDistance(point1.geometry.coordinates, point2.geometry.coordinates)
                }
            });
        });
    }

    console.log(`Created ${lineFeatures.length} organic connections`);
    return {
        type: 'FeatureCollection',
        features: lineFeatures
    };
}

// Load CSV file and initialize map
async function loadMyceliumDataAndInitializeMap() {
    try {
        // Fetch the CSV file
        const response = await fetch('MycoDB_version4-edit.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();

        // Wait for the map to load
        map.on('load', () => {
            try {
                // Parse CSV to GeoJSON
                const geoJsonData = parseMyceliumCSVToGeoJSON(csvText);
                console.log('Parsed mycelium data:', geoJsonData);
                console.log(`Total features: ${geoJsonData.features.length}`);

                // Create connection lines
                const connectionLines = createMyceliumConnections(geoJsonData);
                console.log(`Created ${connectionLines.features.length} connection lines`);

                // Add the point data as a source
                map.addSource('mycelium-points', {
                    type: 'geojson',
                    data: geoJsonData
                });

                // Add the line data as a source
                map.addSource('mycelium-connections', {
                    type: 'geojson',
                    data: connectionLines
                });

                // Add connection lines layer (behind points)
                map.addLayer({
                    id: 'mycelium-connections-layer',
                    type: 'line',
                    source: 'mycelium-connections',
                    paint: {
                        'line-color': [
                            'match',
                            ['get', 'connection-type'],
                            'plant-fungal', '#FF6B35',  // Orange-red for plant-fungal connections
                            'soil-plant', '#E94B3C',    // Bright red for soil-plant connections  
                            '#FF8C42' // default warm orange
                        ],
                        'line-width': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            2, 1,
                            10, 3
                        ],
                        'line-opacity': 0.7,
                        'line-blur': 1
                    }
                });

                // Add circle layer for different location types
                map.addLayer({
                    id: 'mycelium-points-layer',
                    type: 'circle',
                    source: 'mycelium-points',
                    paint: {
                        'circle-radius': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            2, 4,
                            10, 12
                        ],
                        'circle-color': [
                            'match',
                            ['get', 'location-type'],
                            'plant', '#FFD700',    // Bright gold/yellow for plants (like glowing nodes)
                            'fungal', '#FF6B35',   // Orange-red for fungi  
                            'soil', '#E94B3C',     // Bright red for soil
                            '#FFA500' // default bright orange
                        ],
                        'circle-stroke-color': '#FFFFFF',
                        'circle-stroke-width': 2,
                        'circle-opacity': 0.9,
                        'circle-blur': 0.3
                    }
                });

                // Add click event for popups
                map.on('click', 'mycelium-points-layer', (e) => {
                    const coordinates = e.features[0].geometry.coordinates.slice();
                    const properties = e.features[0].properties;
                    
                    // Ensure that if the map is zoomed out such that multiple
                    // copies of the feature are visible, the popup appears
                    // over the copy being pointed to.
                    while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                    }

                    new maplibregl.Popup()
                        .setLngLat(coordinates)
                        .setHTML(createMyceliumPopupContent(properties))
                        .addTo(map);
                });

                // Add hover effects
                map.on('mouseenter', 'mycelium-points-layer', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });

                map.on('mouseleave', 'mycelium-points-layer', () => {
                    map.getCanvas().style.cursor = '';
                });

                // Add hover popup for quick info
                let popup = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false
                });

                map.on('mouseenter', 'mycelium-points-layer', (e) => {
                    const coordinates = e.features[0].geometry.coordinates.slice();
                    const properties = e.features[0].properties;
                    const locationType = properties['location-type'];
                    
                    let hoverContent = '';
                    switch(locationType) {
                        case 'plant':
                            hoverContent = `${properties['plant-species']} (Plant)`;
                            break;
                        case 'fungal':
                            hoverContent = `${properties['fungal-genus']} (Fungus)`;
                            break;
                        case 'soil':
                            hoverContent = `Soil Sample`;
                            break;
                    }

                    popup.setLngLat(coordinates)
                        .setHTML(`
                            <div style="font-weight: bold; font-size: 14px; font-family: 'Courier New', monospace;">
                                ${hoverContent}
                            </div>
                            <div style="font-size: 12px; color: #666; font-family: 'Courier New', monospace;">
                                ${properties['location']}
                            </div>
                        `)
                        .addTo(map);
                });

                map.on('mouseleave', 'mycelium-points-layer', () => {
                    popup.remove();
                });

                // Update statistics
                updateStats(geoJsonData, connectionLines);
                
                // Hide loading indicator
                hideLoading();

                // Fit map to show all points
                if (geoJsonData.features.length > 0) {
                    const bounds = new maplibregl.LngLatBounds();
                    geoJsonData.features.forEach(feature => {
                        bounds.extend(feature.geometry.coordinates);
                    });
                    map.fitBounds(bounds, { padding: 50 });
                }

            } catch (error) {
                console.error('Error processing mycelium CSV data:', error);
                hideLoading();
                // Show error message
                const mapContainer = document.getElementById('map');
                if (mapContainer) {
                    mapContainer.innerHTML = `
                        <div class="error-message">
                            <h3>Error loading data</h3>
                            <p>Could not process the mycelium CSV data. Please check the console for details.</p>
                        </div>
                    `;
                }
            }
        });

    } catch (error) {
        console.error('Error loading mycelium CSV file:', error);
        hideLoading();
        // Show error message to user
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="error-message">
                    <h3>Error loading mycelium data</h3>
                    <p>Could not load the CSV file. Please ensure 'MycoDB_version4-edit.csv' is in the same directory.</p>
                    <p>Error: ${error.message}</p>
                </div>
            `;
        }
    }
}

// Add legend to the map
function addLegend() {
    const legend = document.createElement('div');
    legend.className = 'legend';
    
    legend.innerHTML = `
        <div class="legend-title">Mycelium Network</div>
        <div class="legend-item">
            <span class="legend-color" style="background: #FFD700; box-shadow: 0 0 8px #FFD700;"></span>
            Plant Locations
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background: #FF6B35; box-shadow: 0 0 8px #FF6B35;"></span>
            Fungal Locations
        </div>
        <div class="legend-item">
            <span class="legend-color" style="background: #E94B3C; box-shadow: 0 0 8px #E94B3C;"></span>
            Soil Samples
        </div>
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
            <div class="legend-item">
                <span class="legend-line" style="background: #FF6B35; box-shadow: 0 0 4px #FF6B35;"></span>
                Plant-Fungal
            </div>
            <div class="legend-item">
                <span class="legend-line" style="background: #E94B3C; box-shadow: 0 0 4px #E94B3C;"></span>
                Soil-Plant
            </div>
        </div>
    `;
    
    document.body.appendChild(legend);
}

// Update statistics panel
function updateStats(geoJsonData, connectionLines) {
    const plantCount = geoJsonData.features.filter(f => f.properties['location-type'] === 'plant').length;
    const fungalCount = geoJsonData.features.filter(f => f.properties['location-type'] === 'fungal').length;
    const soilCount = geoJsonData.features.filter(f => f.properties['location-type'] === 'soil').length;
    
    document.getElementById('total-points').textContent = geoJsonData.features.length;
    document.getElementById('plant-count').textContent = plantCount;
    document.getElementById('fungal-count').textContent = fungalCount;
    document.getElementById('soil-count').textContent = soilCount;
    document.getElementById('connection-count').textContent = connectionLines.features.length;
    
    // Show stats panel
    document.getElementById('stats-panel').style.display = 'block';
}

// Hide loading indicator
function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.style.display = 'none';
    }
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadMyceliumDataAndInitializeMap();
    addLegend();
});