// Initialize the map
var map = new maplibregl.Map({
    container: 'map',
    style: 'style.json',
    center: [-73.97144, 40.70491],
    zoom: 6,
});

// Add navigation controls
map.addControl(new maplibregl.NavigationControl());


// Parse CSV data and convert to GeoJSON
function parseCSVToGeoJSON(csvString) {
    const parsed = Papa.parse(csvString, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        delimitersToGuess: [',', '\t', '|', ';']
    });

    const features = parsed.data.map(row => {
        // Clean headers by trimming whitespace
        const cleanedRow = {};
        Object.keys(row).forEach(key => {
            const cleanKey = key.trim();
            cleanedRow[cleanKey] = row[key];
        });

        // Parse lat-long string
        const latLongStr = cleanedRow['lat-long'].toString().trim();
        const [lat, lng] = latLongStr.split(',').map(coord => parseFloat(coord.trim()));

        return {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [lng, lat] // GeoJSON uses [longitude, latitude]
            },
            properties: {
                'project-name': cleanedRow['project-name'],
                'artist-institution': cleanedRow['artist-institution'],
                'location-city': cleanedRow['location-city'],
                'field-category': cleanedRow['field-category'],
                'link': cleanedRow['link']
            }
        };
    });

    return {
        type: 'FeatureCollection',
        features: features
    };
}

// Create popup content
function createPopupContent(properties) {
    return `
        <div class="popup-content" style="font-family: 'Courier New', monospace;">
            <div class="popup-title" style="font-family: 'Courier New', monospace;">${properties['project-name']}</div>
            <div class="popup-field" style="font-family: 'Courier New', monospace;">
                <span class="popup-label" style="font-family: 'Courier New', monospace;">Artist/Institution:</span> ${properties['artist-institution']}
            </div>
            <div class="popup-field" style="font-family: 'Courier New', monospace;">
                <span class="popup-label" style="font-family: 'Courier New', monospace;">Location:</span> ${properties['location-city']}
            </div>
            <div class="popup-field" style="font-family: 'Courier New', monospace;">
                <span class="popup-label" style="font-family: 'Courier New', monospace;">Category:</span> ${properties['field-category']}
            </div>
            <div class="popup-field" style="font-family: 'Courier New', monospace;">
                <span class="popup-label" style="font-family: 'Courier New', monospace;">Link:</span> 
                <a href="${properties['link']}" target="_blank" class="popup-link" style="font-family: 'Courier New', monospace;">View Project</a>
            </div>
        </div>
    `;
}

// Load CSV file and initialize map
async function loadCSVAndInitializeMap() {
    try {
        // Fetch the CSV file
        const response = await fetch('data set for community of practice.csv');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const csvText = await response.text();
        
        // Initialize the map
        var map = new maplibregl.Map({
            container: 'map',
            style: 'style.json', // Use your local style file
            center: [15, 25], // Global center
            zoom: 1 // Zoomed out to see all points globally
        });

        // Add navigation controls
        map.addControl(new maplibregl.NavigationControl());

        // Wait for the map to load
        map.on('load', () => {
            try {
                // Parse CSV to GeoJSON
                const geoJsonData = parseCSVToGeoJSON(csvText);
                console.log('Parsed data:', geoJsonData);

                // Create connecting lines between all points
                const lineFeatures = [];
                const points = geoJsonData.features;
                
                // Create lines connecting each point to every other point
                for (let i = 0; i < points.length; i++) {
                    for (let j = i + 1; j < points.length; j++) {
                        const startPoint = points[i];
                        const endPoint = points[j];
                        
                        // Create a line feature
                        lineFeatures.push({
                            type: 'Feature',
                            geometry: {
                                type: 'LineString',
                                coordinates: [
                                    startPoint.geometry.coordinates,
                                    endPoint.geometry.coordinates
                                ]
                            },
                            properties: {
                                'start-category': startPoint.properties['field-category'],
                                'end-category': endPoint.properties['field-category'],
                                'start-project': startPoint.properties['project-name'],
                                'end-project': endPoint.properties['project-name']
                            }
                        });
                    }
                }

                const lineGeoJSON = {
                    type: 'FeatureCollection',
                    features: lineFeatures
                };

                // Add the point data as a source
                map.addSource('community-projects', {
                    type: 'geojson',
                    data: geoJsonData
                });

                // Add the line data as a source
                map.addSource('connection-lines', {
                    type: 'geojson',
                    data: lineGeoJSON
                });

                // Add line layer first (so it appears behind circles)
                map.addLayer({
                    id: 'connection-lines-layer',
                    type: 'line',
                    source: 'connection-lines',
                    paint: {
                        'line-color': [
                            'match',
                            ['get', 'start-category'],
                            'Sustainable Architecture + Green Urbanism', '#f36e37',
                            'Art, Science, Music + Technology', '#ec2c3d',
                            'Biotechnology + AI Climate Intervention', '#816182',
                            '#d98948' // default color
                        ],
                        'line-width': 1,
                        'line-opacity': 0.3
                    }
                });

                // Add a circle layer to visualize the data
                map.addLayer({
                    id: 'projects-layer',
                    type: 'circle',
                    source: 'community-projects',
                    paint: {
                        'circle-radius': 8,
                        'circle-color': [
                            'match',
                            ['get', 'field-category'],
                            'Sustainable Architecture + Green Urbanism', '#f36e37',
                            'Art, Science, Music + Technology', '#ec2c3d',
                            'Biotechnology + AI Climate Intervention', '#816182',
                            '#d98948' // default color
                        ],
                        'circle-stroke-color': 'white'
                    }
                });

                // Add click event for popups
                map.on('click', 'projects-layer', (e) => {
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
                        .setHTML(createPopupContent(properties))
                        .addTo(map);
                });

                // Add hover effect for circles
                map.on('mouseenter', 'projects-layer', () => {
                    map.getCanvas().style.cursor = 'pointer';
                });

                map.on('mouseleave', 'projects-layer', () => {
                    map.getCanvas().style.cursor = '';
                });

                // Optional: Add hover popup
                let popup = new maplibregl.Popup({
                    closeButton: false,
                    closeOnClick: false
                });

                map.on('mouseenter', 'projects-layer', (e) => {
                    const coordinates = e.features[0].geometry.coordinates.slice();
                    const properties = e.features[0].properties;

                    popup.setLngLat(coordinates)
                        .setHTML(`<div style="font-weight: bold; font-size: 14px; font-family: 'Courier New', monospace;">${properties['project-name']}</div>
                                 <div style="font-size: 12px; color: #666; font-family: 'Courier New', monospace;">${properties['location-city']}</div>`)
                        .addTo(map);
                });

                map.on('mouseleave', 'projects-layer', () => {
                    popup.remove();
                });

            } catch (error) {
                console.error('Error processing CSV data:', error);
            }
        });

    } catch (error) {
        console.error('Error loading CSV file:', error);
        // You could show an error message to the user here
        document.getElementById('map').innerHTML = '<p>Error loading map data. Please check that the CSV file is available.</p>';
    }
}

// Initialize everything when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadCSVAndInitializeMap();
});