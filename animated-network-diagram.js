var sketch = function(p) {
            var canvas;
            var nodes = [];
            var connections = [];
            var radius = 45;
            var canvasWidth = window.innerWidth;
            var canvasHeight = window.innerHeight;

            p.setup = function() {
                canvas = p.createCanvas(canvasWidth, canvasHeight);
                canvas.parent('canvas-container');
                p.textAlign(p.CENTER, p.CENTER);
                p.textSize(11);
                p.textStyle(p.BOLD);
                p.textFont('Courier New');

                // Define nodes with their positions, colors, and labels from the image
                let nodeData = [
                    { x: 280, y: 120, color: [208, 28, 103], label: "Biohybrid\nSystems" },
                    { x: 680, y: 80, color: [92, 64, 91], label: "Training &\nSensor Data" },
                    { x: 850, y: 120, color: [92, 64, 91], label: "AI" },
                    { x: 950, y: 200, color: [79, 47, 63], label: "Digital\nEnvironments" },
                    { x: 320, y: 380, color: [92, 64, 91], label: "Augmentation\nof Nature" },
                    { x: 580, y: 380, color: [92, 64, 91], label: "Plant\nIntelligence" },
                    { x: 750, y: 320, color: [92, 64, 91], label: "Digital\nNetwork\nSystems" },
                    { x: 180, y: 480, color: [208, 28, 103], label: "Symbiotic\nRelationships" },
                    { x: 280, y: 680, color: [239, 66, 58], label: "Naturally\nOcurring\nNetworks" },
                    { x: 580, y: 650, color: [241, 95, 49], label: "Natural\nGrowth" },
                    { x: 750, y: 480, color: [243, 110, 55], label: "Physical\nEnvironments" },
                    { x: 900, y: 520, color: [217, 137, 72], label: "Urban\nGrowth" },
                    { x: 900, y: 680, color: [243, 110, 55], label: "Climate\nChange" }
                ];

                // Create nodes with random velocities
                for (let data of nodeData) {
                    nodes.push({
                        x: data.x,
                        y: data.y,
                        color: data.color,
                        label: data.label,
                        dx: p.random(-1.5, 1.5),
                        dy: p.random(-1.5, 1.5)
                    });
                }

                // Define connections based on the image
                connections = [
                    // Biohybrid Systems connections
                    [0, 1], [0, 2], [0, 4], [0, 5], [0, 7], [0, 8],
                    // Training & Sensor Data connections
                    [1, 2], [1, 4], [1, 5], [1, 6],
                    // AI connections
                    [2, 3], [2, 5], [2, 6], [2, 10], [2, 11],
                    // Digital Environments connections
                    [3, 6], [3, 10], [3, 11],
                    // Augmentation of Nature connections
                    [4, 5], [4, 7], [4, 8],
                    // Plant Intelligence connections
                    [5, 6], [5, 8], [5, 9], [5, 10],
                    // Digital Network Systems connections
                    [6, 10], [6, 11],
                    // Symbiotic Relationships connections
                    [7, 8], [7, 9],
                    // Naturally Occurring Networks connections
                    [8, 9], [8, 10],
                    // Natural Growth connections
                    [9, 10], [9, 11], [9, 12],
                    // Physical Environments connections
                    [10, 11], [10, 12],
                    // Urban Growth connections
                    [11, 12]
                ];
            };

            p.draw = function() {
                p.background(0);
                updateNodePositions();
                drawConnections();
                drawNodes();
            };

            function updateNodePositions() {
                for (let node of nodes) {
                    node.x += node.dx;
                    node.y += node.dy;

                    // Bounce on canvas edges
                    if (node.x - radius < 0 || node.x + radius > p.width) node.dx *= -1;
                    if (node.y - radius < 0 || node.y + radius > p.height) node.dy *= -1;
                }
            }

            function drawConnections() {
                p.strokeWeight(1.5);
                for (let connection of connections) {
                    let node1 = nodes[connection[0]];
                    let node2 = nodes[connection[1]];
                    
                    // Use a gradient color based on the two connected nodes
                    let r = (node1.color[0] + node2.color[0]) / 2;
                    let g = (node1.color[1] + node2.color[1]) / 2;
                    let b = (node1.color[2] + node2.color[2]) / 2;
                    
                    p.stroke(r, g, b, 150);
                    p.line(node1.x, node1.y, node2.x, node2.y);
                }
            }

            function drawNodes() {
                p.noStroke();
                for (let node of nodes) {
                    // Draw circle
                    p.fill(...node.color);
                    p.circle(node.x, node.y, radius * 2);
                    
                    // Draw text label
                    p.fill(255);
                    p.text(node.label, node.x, node.y);
                }
            }
        };

        // Create the p5 instance
        var myp5 = new p5(sketch);