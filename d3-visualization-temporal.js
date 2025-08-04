// nyc-rainfall-area-chart.js
// Area chart showing NYC rainfall over time with storm events and infrastructure capacity alerts
//temporal changes -- need to recommit to change to purple

document.addEventListener('DOMContentLoaded', function() {
    console.log('Loading NYC rainfall area chart...');
    
    // Check if D3 is available
    if (typeof d3 === 'undefined') {
        console.error('D3.js is not loaded');
        return;
    }
    
    // Try to load the CSV data
    loadRainfallData();
});

async function loadRainfallData() {
    try {
        console.log('Attempting to load NYC rainfall CSV...');
        
        // Check if file system is available
        if (!window.fs || !window.fs.readFile) {
            console.log('File system not available, using demo data');
            createDemoRainfallChart();
            return;
        }
        
        // Read the CSV file
        const csvContent = await window.fs.readFile('nyc-rainfall-data.csv', { encoding: 'utf8' });
        console.log('CSV loaded successfully');
        
        // Parse CSV data
        const lines = csvContent.trim().split('\n');
        const headers = lines[0].split(',');
        
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = parseCSVLine(lines[i]);
            if (values.length >= headers.length) {
                const row = {};
                headers.forEach((header, index) => {
                    row[header.trim()] = values[index] ? values[index].trim() : '';
                });
                
                // Parse date and numeric values
                row.date = new Date(row.date);
                row.year = parseInt(row.year);
                row.month = parseInt(row.month);
                row.total_rainfall_inches = parseFloat(row.total_rainfall_inches);
                row.max_hourly_rainfall = parseFloat(row.max_hourly_rainfall);
                row.infrastructure_capacity_exceeded = row.infrastructure_capacity_exceeded === 'Yes';
                
                if (!isNaN(row.total_rainfall_inches)) {
                    data.push(row);
                }
            }
        }
        
        console.log('Processed rainfall data:', data.length, 'records');
        createRainfallAreaChart(data);
        
    } catch (error) {
        console.error('Error loading rainfall data:', error);
        createDemoRainfallChart();
    }
}

// Helper function to parse CSV line with proper comma handling
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current);
    
    return values;
}

function createDemoRainfallChart() {
    console.log('Creating demo rainfall chart...');
    
    // Demo data with key storm events
    const demoData = [
        { date: new Date('1999-01-01'), year: 1999, month: 1, total_rainfall_inches: 3.2, max_hourly_rainfall: 0.6, infrastructure_capacity_exceeded: false, storm_name: '', notable_events: 'Normal winter' },
        { date: new Date('1999-07-01'), year: 1999, month: 7, total_rainfall_inches: 5.2, max_hourly_rainfall: 1.8, infrastructure_capacity_exceeded: true, storm_name: '', notable_events: 'Warmest July in history' },
        { date: new Date('2000-08-01'), year: 2000, month: 8, total_rainfall_inches: 5.3, max_hourly_rainfall: 1.4, infrastructure_capacity_exceeded: false, storm_name: '', notable_events: 'Wet August' },
        { date: new Date('2003-09-01'), year: 2003, month: 9, total_rainfall_inches: 6.8, max_hourly_rainfall: 1.6, infrastructure_capacity_exceeded: false, storm_name: 'Hurricane Isabel', notable_events: 'Hurricane Isabel remnants' },
        { date: new Date('2004-09-01'), year: 2004, month: 9, total_rainfall_inches: 5.7, max_hourly_rainfall: 1.3, infrastructure_capacity_exceeded: false, storm_name: 'Hurricane Frances', notable_events: 'Hurricane Frances impact' },
        { date: new Date('2005-10-01'), year: 2005, month: 10, total_rainfall_inches: 16.73, max_hourly_rainfall: 2.8, infrastructure_capacity_exceeded: true, storm_name: '', notable_events: 'Wettest October in history' },
        { date: new Date('2007-04-01'), year: 2007, month: 4, total_rainfall_inches: 13.05, max_hourly_rainfall: 2.1, infrastructure_capacity_exceeded: true, storm_name: '', notable_events: 'Wettest April on record' },
        { date: new Date('2010-03-01'), year: 2010, month: 3, total_rainfall_inches: 10.69, max_hourly_rainfall: 1.9, infrastructure_capacity_exceeded: true, storm_name: '', notable_events: 'Wettest March on record' },
        { date: new Date('2011-08-01'), year: 2011, month: 8, total_rainfall_inches: 18.95, max_hourly_rainfall: 3.6, infrastructure_capacity_exceeded: true, storm_name: 'Hurricane Irene', notable_events: 'Wettest August in history' },
        { date: new Date('2012-10-01'), year: 2012, month: 10, total_rainfall_inches: 4.8, max_hourly_rainfall: 1.4, infrastructure_capacity_exceeded: true, storm_name: 'Hurricane Sandy', notable_events: 'Hurricane Sandy month' },
        { date: new Date('2018-08-01'), year: 2018, month: 8, total_rainfall_inches: 9.1, max_hourly_rainfall: 2.0, infrastructure_capacity_exceeded: true, storm_name: '', notable_events: 'Extremely wet August' },
        { date: new Date('2020-08-01'), year: 2020, month: 8, total_rainfall_inches: 9.6, max_hourly_rainfall: 2.1, infrastructure_capacity_exceeded: true, storm_name: 'Hurricane Isaias', notable_events: 'Extremely wet August' },
        { date: new Date('2021-09-01'), year: 2021, month: 9, total_rainfall_inches: 7.13, max_hourly_rainfall: 3.15, infrastructure_capacity_exceeded: true, storm_name: 'Hurricane Ida', notable_events: 'Hurricane Ida - record hourly' },
        { date: new Date('2023-09-01'), year: 2023, month: 9, total_rainfall_inches: 7.2, max_hourly_rainfall: 2.5, infrastructure_capacity_exceeded: true, storm_name: '', notable_events: 'Severe flooding event' }
    ];
    
    // Add more data points for smoother area chart
    const allData = [];
    for (let year = 1999; year <= 2024; year++) {
        for (let month = 1; month <= 12; month++) {
            const existingData = demoData.find(d => d.year === year && d.month === month);
            if (existingData) {
                allData.push(existingData);
            } else {
                // Generate normal rainfall values
                const baseRainfall = [2.1, 2.3, 4.1, 4.2, 4.5, 4.0, 4.8, 4.3, 3.9, 3.2, 3.8, 3.4][month - 1];
                const variation = (Math.random() - 0.5) * 2;
                allData.push({
                    date: new Date(year, month - 1, 1),
                    year: year,
                    month: month,
                    total_rainfall_inches: Math.max(0.5, baseRainfall + variation),
                    max_hourly_rainfall: Math.random() * 1.5 + 0.3,
                    infrastructure_capacity_exceeded: false,
                    storm_name: '',
                    notable_events: 'Normal precipitation'
                });
            }
        }
    }
    
    allData.sort((a, b) => a.date - b.date);
    createRainfallAreaChart(allData);
}

function createRainfallAreaChart(data) {
    console.log('Creating rainfall area chart with', data.length, 'data points');
    
    // Set up dimensions 
    const margin = { top: 200, right: 40, bottom: 100, left: 60 };
    const width = 1500 - margin.left - margin.right;  
    const height = 700 - margin.top - margin.bottom;  

    // Clear any existing visualization
    d3.select("#d3-container-1").selectAll("*").remove();

    // Create SVG
    const svg = d3.select("#d3-container-1")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .style("background-color", "#000000")  // True black background
        .style("border", "none")  // Remove border
        .style("display", "block")  // Remove default inline spacing
        .style("margin", "0")  // Remove any default margins
        .style("padding", "0");  // Remove any default padding

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3.scaleTime()
        .domain(d3.extent(data, d => d.date))
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.total_rainfall_inches) * 1.1])
        .range([height, 0]);

    // Create area generator
    const area = d3.area()
        .x(d => xScale(d.date))
        .y0(height)
        .y1(d => yScale(d.total_rainfall_inches))
        .curve(d3.curveBasis);

    // Create line generator for the top edge
    const line = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScale(d.total_rainfall_inches))
        .curve(d3.curveBasis);

    // Add gradient definition - updated to your color scheme
    // Solid fill color - light purple
    const gradient = svg.append("defs")
        .append("linearGradient")
        .attr("id", "areaGradient")
        .attr("x1", 0).attr("y1", 0)
        .attr("x2", 0).attr("y2", 1);

    gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#816182")
        .attr("stop-opacity", 1);

    gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#816182")
        .attr("stop-opacity", 1);

    // Draw the area
    g.append("path")
        .datum(data)
        .attr("class", "area")
        .attr("d", area)
        .attr("fill", "url(#areaGradient)")
        .attr("opacity", 1.0);  // Completely opaque

    // Draw the line on top - updated color
    g.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", line)
        .attr("fill", "none")
        .attr("stroke", "#4f2f3f")  // dark purple
        .attr("stroke-width", 2);

    // Add infrastructure capacity threshold line
    const capacityThreshold = 1.75; // NYC sewer capacity in inches per hour
    g.append("line")
        .attr("class", "threshold-line")
        .attr("x1", 0)
        .attr("y1", yScale(capacityThreshold * 3)) // Approximate monthly equivalent
        .attr("x2", width)
        .attr("y2", yScale(capacityThreshold * 3))
        .attr("stroke", "#e91e63")  // Pink from your palette
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "5,5")
        .attr("opacity", 0.8);

    // Add threshold label
    g.append("text")
        .attr("x", width - 10)
        .attr("y", yScale(capacityThreshold * 3) - 5)
        .attr("text-anchor", "end")
        .attr("fill", "#e91e63")  // Pink
        .style("font-size", "10px")
        .text("Infrastructure Capacity");

    // Add infrastructure capacity exceeded markers
    const capacityExceeded = data.filter(d => d.infrastructure_capacity_exceeded);
    
    g.selectAll(".capacity-marker")
        .data(capacityExceeded)
        .enter()
        .append("circle")
        .attr("class", "capacity-marker")
        .attr("cx", d => xScale(d.date))
        .attr("cy", d => yScale(d.total_rainfall_inches))  // Position at actual data point
        .attr("r", 5)  // Slightly smaller
        .attr("fill", "#e91e63")  // Pink from your palette
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 7);
            showCapacityTooltip(event, d);
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 5);
            hideCapacityTooltip();
        });

    // Add storm name markers (named storms only)
    const namedStorms = data.filter(d => d.storm_name && d.storm_name.trim() !== '');
    
    g.selectAll(".storm-marker")
        .data(namedStorms)
        .enter()
        .append("circle")
        .attr("class", "storm-marker")
        .attr("cx", d => xScale(d.date))
        .attr("cy", d => yScale(d.total_rainfall_inches))  // Position at actual data point
        .attr("r", 6)  // Slightly smaller
        .attr("fill", "#ff6b35")  // Orange from your palette
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 8);
            showStormTooltip(event, d);
        })
        .on("mouseout", function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 6);
            hideStormTooltip();
        });

    // Create and add axes
    const xAxis = d3.axisBottom(xScale)
        .tickFormat(d3.timeFormat("%Y"))
        .ticks(d3.timeYear.every(3));  // Every 3 years to fit better

    const yAxis = d3.axisLeft(yScale)
        .ticks(6);  // Fewer ticks

    // Add X axis
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis)
        .selectAll("text")
        .style("fill", "#ffffff")
        .style("font-size", "11px");

    // Style X axis
    g.select(".x-axis")
        .selectAll("line")
        .style("stroke", "#ffffff");
    
    g.select(".x-axis")
        .select(".domain")
        .style("stroke", "#ffffff");

    // Add Y axis
    g.append("g")
        .attr("class", "y-axis")
        .call(yAxis)
        .selectAll("text")
        .style("fill", "#ffffff")
        .style("font-size", "11px");

    // Style Y axis
    g.select(".y-axis")
        .selectAll("line")
        .style("stroke", "#ffffff");
    
    g.select(".y-axis")
        .select(".domain")
        .style("stroke", "#ffffff");

    // Add axis labels
    g.append("text")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .attr("text-anchor", "middle")
        .style("fill", "#ffffff")
        .style("font-size", "12px")
        .text("Year");

    g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -40)
        .attr("x", -height / 2)
        .attr("text-anchor", "middle")
        .style("fill", "#ffffff")
        .style("font-size", "12px")
        .text("Monthly Rainfall (inches)");

    // Add title
    g.append("text")
        .attr("x", width / 2)
        .attr("y", -15)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .attr("fill", "#ffffff")
        .text("NYC Rainfall Over Time (1999-2024)");

    // Add legend - repositioned and updated colors
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 180}, 20)`);

    // Legend items with your color palette
    const legendData = [
        { color: "#4f2f3f", label: "Monthly Rainfall", type: "line" },
        { color: "#ff6b35", label: "Named Storms", type: "circle" },
        { color: "#e91e63", label: "Infrastructure Exceeded", type: "circle" },
        { color: "#e91e63", label: "Capacity Threshold", type: "dashed" }
    ];

    const legendItems = legend.selectAll(".legend-item")
        .data(legendData)
        .enter()
        .append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 18})`);

    legendItems.each(function(d) {
        const item = d3.select(this);
        if (d.type === "line") {
            item.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 15)
                .attr("y2", 0)
                .attr("stroke", d.color)
                .attr("stroke-width", 2);
        } else if (d.type === "dashed") {
            item.append("line")
                .attr("x1", 0)
                .attr("y1", 0)
                .attr("x2", 15)
                .attr("y2", 0)
                .attr("stroke", d.color)
                .attr("stroke-width", 2)
                .attr("stroke-dasharray", "3,3");
        } else {
            item.append("circle")
                .attr("cx", 7)
                .attr("cy", 0)
                .attr("r", 4)
                .attr("fill", d.color)

        }
        
        item.append("text")
            .attr("x", 20)
            .attr("y", 4)
            .attr("fill", "#ffffff")
            .style("font-size", "10px")
            .text(d.label);
    });

    // Add animation
    g.select(".area")
        .style("opacity", 0)
        .transition()
        .duration(2000)
        .style("opacity", 1);

    g.select(".line")
        .attr("stroke-dasharray", function() {
            const totalLength = this.getTotalLength();
            return totalLength + " " + totalLength;
        })
        .attr("stroke-dashoffset", function() {
            return this.getTotalLength();
        })
        .transition()
        .duration(2000)
        .attr("stroke-dashoffset", 0);

    // Animate markers
    g.selectAll(".capacity-marker, .storm-marker")
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 100 + 1000)
        .style("opacity", 1);
}

// Tooltip functions
let capacityTooltip = null;
let stormTooltip = null;

function showCapacityTooltip(event, d) {
    if (!capacityTooltip) {
        capacityTooltip = d3.select("body")
            .append("div")
            .attr("class", "capacity-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(255, 107, 107, 0.9)")
            .style("color", "white")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("border", "1px solid #fff");
    }
    
    capacityTooltip.transition()
        .duration(200)
        .style("opacity", 1);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    capacityTooltip.html(`
        <strong>Infrastructure Exceeded</strong><br>
        ${monthNames[d.month - 1]} ${d.year}<br>
        Rainfall: ${d.total_rainfall_inches}" <br>
        Max Rate: ${d.max_hourly_rainfall}"/hour<br>
        ${d.notable_events}
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px");
}

function hideCapacityTooltip() {
    if (capacityTooltip) {
        capacityTooltip.transition()
            .duration(200)
            .style("opacity", 0);
    }
}

function showStormTooltip(event, d) {
    if (!stormTooltip) {
        stormTooltip = d3.select("body")
            .append("div")
            .attr("class", "storm-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(255, 165, 0, 0.9)")
            .style("color", "white")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("border", "1px solid #fff");
    }
    
    stormTooltip.transition()
        .duration(200)
        .style("opacity", 1);
    
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    stormTooltip.html(`
        <strong>${d.storm_name}</strong><br>
        ${monthNames[d.month - 1]} ${d.year}<br>
        Rainfall: ${d.total_rainfall_inches}"<br>
        Max Rate: ${d.max_hourly_rainfall}"/hour<br>
        ${d.notable_events}
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px");
}

function showStormTooltip(event, d) {
    if (!stormTooltip) {
        stormTooltip = d3.select("body")
            .append("div")
            .attr("class", "storm-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(255, 165, 0, 0.9)")
            .style("color", "white")
            .style("padding", "8px 12px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("border", "1px solid #fff");
    }

    stormTooltip.transition()
        .duration(200)
        .style("opacity", 1);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                       "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    stormTooltip.html(`
        <strong>${d.storm_name}</strong><br>
        ${monthNames[d.month - 1]} ${d.year}<br>
        Rainfall: ${d.total_rainfall_inches}"<br>
        Max Rate: ${d.max_hourly_rainfall}"/hour<br>
        ${d.notable_events}
    `)
    .style("left", (event.pageX + 10) + "px")
    .style("top", (event.pageY - 10) + "px");
}

function hideStormTooltip() {
    if (stormTooltip) {
        stormTooltip.transition()
            .duration(200)
            .style("opacity", 0);
    }
}