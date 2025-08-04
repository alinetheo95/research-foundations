// Helper function to create hierarchy from flat data
        function hierarchy(data, delimiter = ".") {
            let root;
            const map = new Map;
            data.forEach(function find(data) {
                const {name} = data;
                if (map.has(name)) return map.get(name);
                const i = name.lastIndexOf(delimiter);
                map.set(name, data);
                if (i >= 0) {
                    find({name: name.substring(0, i), children: []}).children.push(data);
                    data.name = name.substring(i + 1);
                } else {
                    root = data;
                }
                return data;
            });
            return root;
        }

        // Helper function to create bidirectional links
        function bilink(root) {
            const map = new Map(root.leaves().map(d => [id(d), d]));
            for (const d of root.leaves()) {
                d.incoming = [];
                d.outgoing = d.data.imports ? d.data.imports.map(i => [d, map.get(i)]) : [];
            }
            for (const d of root.leaves()) {
                for (const o of d.outgoing) {
                    if (o[1]) o[1].incoming.push(o);
                }
            }
            return root;
        }

        // Helper function to get node id
        function id(node) {
            return `${node.parent ? id(node.parent) + "." : ""}${node.data.name}`;
        }

// Color function
        const color = t => d3.interpolateRdBu(1 - t);

        // BezierCurve class
        const BezierCurve = (() => {
            const l1 = [4 / 8, 4 / 8, 0 / 8, 0 / 8];
            const l2 = [2 / 8, 4 / 8, 2 / 8, 0 / 8];
            const l3 = [1 / 8, 3 / 8, 3 / 8, 1 / 8];
            const r1 = [0 / 8, 2 / 8, 4 / 8, 2 / 8];
            const r2 = [0 / 8, 0 / 8, 4 / 8, 4 / 8];
            
            function dot([ka, kb, kc, kd], {a, b, c, d}) {
                return [
                    ka * a[0] + kb * b[0] + kc * c[0] + kd * d[0],
                    ka * a[1] + kb * b[1] + kc * c[1] + kd * d[1]
                ];
            }
            
            return class BezierCurve {
                constructor(a, b, c, d) {
                    this.a = a;
                    this.b = b;
                    this.c = c;
                    this.d = d;
                }
                split() {
                    const m = dot(l3, this);
                    return [
                        new BezierCurve(this.a, dot(l1, this), dot(l2, this), m),
                        new BezierCurve(m, dot(r1, this), dot(r2, this), this.d)
                    ];
                }
                toString() {
                    return `M${this.a}C${this.b},${this.c},${this.d}`;
                }
            };
        })();

        // Line class
        class Line {
            constructor(a, b) {
                this.a = a;
                this.b = b;
            }
            split() {
                const {a, b} = this;
                const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
                return [new Line(a, m), new Line(m, b)];
            }
            toString() {
                return `M${this.a}L${this.b}`;
            }
        }

        // Path class
        class Path {
            constructor(_) {
                this._ = _ || [];
                this._m = undefined;
            }
            moveTo(x, y) {
                this._ = [];
                this._m = [x, y];
            }
            lineTo(x, y) {
                this._.push(new Line(this._m, this._m = [x, y]));
            }
            bezierCurveTo(ax, ay, bx, by, x, y) {
                this._.push(new BezierCurve(this._m, [ax, ay], [bx, by], this._m = [x, y]));
            }
            *split(k = 0) {
                const n = this._.length;
                const i = Math.floor(n / 2);
                const j = Math.ceil(n / 2);
                const a = new Path(this._.slice(0, i));
                const b = new Path(this._.slice(j));
                if (i !== j) {
                    const [ab, ba] = this._[i].split();
                    a._.push(ab);
                    b._.unshift(ba);
                }
                if (k > 1) {
                    yield* a.split(k - 1);
                    yield* b.split(k - 1);
                } else {
                    yield a;
                    yield b;
                }
            }
            toString() {
                return this._.join("");
            }
        }

        // Main chart creation function
        function createChart(data) {
            const width = 1000;
            const radius = width / 2;
            const k = 6; // 2^k color segments per curve
            
            const tree = d3.cluster()
                .size([2 * Math.PI, radius - 150]);
            
            const root = tree(bilink(d3.hierarchy(data)
                .sort((a, b) => d3.ascending(a.height, b.height) || d3.ascending(a.data.name, b.data.name))));
            
            const svg = d3.create("svg")
                .attr("width", width)
                .attr("height", width)
                .attr("viewBox", [-width / 2 - 100, -width / 2 - 100, width + 200, width + 200])
                .attr("style", "max-width: 100%; height: auto; font: 10px courier, monospace;")
                .attr("fill", "#ffffff");
            
            const node = svg.append("g")
                .selectAll()
                .data(root.leaves())
                .join("g")
                .attr("transform", d => `rotate(${d.x * 180 / Math.PI - 90}) translate(${d.y},0)`)
                .append("text")
                .attr("dy", "0.31em")
                .attr("x", d => d.x < Math.PI ? 6 : -6)
                .attr("text-anchor", d => d.x < Math.PI ? "start" : "end")
                .attr("transform", d => d.x >= Math.PI ? "rotate(180)" : null)
                .text(d => d.data.name)
                .call(text => text.append("title").text(d => `${id(d)}
${d.outgoing.length} outgoing
${d.incoming.length} incoming`));
            
            const line = d3.lineRadial()
                .curve(d3.curveBundle)
                .radius(d => d.y)
                .angle(d => d.x);
            
            const path = ([source, target]) => {
                const p = new Path;
                line.context(p)(source.path(target));
                return p;
            };
            
            svg.append("g")
                .attr("fill", "none")
                .selectAll()
                .data(d3.transpose(root.leaves()
                    .flatMap(leaf => leaf.outgoing.map(path))
                    .map(path => Array.from(path.split(k)))))
                .join("path")
                .style("mix-blend-mode", "normal")
                .style("stroke-opacity", 0.6) // for softer appearance
                .attr("stroke", (d, i) => color(d3.easeQuad(i / ((1 << k) - 1))))
                .attr("d", d => d.join(""));
            
            return svg.node();
        }

        // Sample with hierarchical naming and imports
        const sampleData = [
            {name: "data.DataField", imports: []},
            {name: "data.DataSchema", imports: ["data.DataField"]},
            {name: "data.DataSet", imports: ["data.DataField", "data.DataSchema"]},
            {name: "data.DataSource", imports: ["data.DataSet"]},
            {name: "data.DataTable", imports: ["data.DataField", "data.DataSet"]},
            {name: "data.DataUtil", imports: ["data.DataField"]},
            {name: "vis.VisualizationEvent", imports: []},
            {name: "vis.TooltipEvent", imports: ["vis.VisualizationEvent"]},
            {name: "vis.SelectionEvent", imports: ["vis.VisualizationEvent"]},
            {name: "scale.LinearScale", imports: []},
            {name: "scale.LogScale", imports: ["scale.LinearScale"]},
            {name: "scale.OrdinalScale", imports: []},
            {name: "scale.QuantileScale", imports: ["scale.LinearScale"]},
            {name: "scale.QuantitativeScale", imports: ["scale.LinearScale"]},
            {name: "scale.RootScale", imports: ["scale.LinearScale"]},
            {name: "scale.Scale", imports: []},
            {name: "scale.ScaleType", imports: ["scale.Scale"]},
            {name: "scale.TimeScale", imports: ["scale.LinearScale"]},
            // Group these together 
            {name: "display.Sustainable Architecture", imports: ["display.Green Urbanism","display.Biotechnology","display.Art + Music + Technology"]},
            {name: "display.Living Architecture", imports: ["display.Sustainable Architecture","display.Green Urbanism","display.Biotechnology","display.Green Building Principles","display.Passive Design","display.Net Zero Energy Buidlings","display.Generative Design"]},
            {name: "display.Green Building Principles", imports: ["display.Sustainable Architecture","display.Green Urbanism","display.Living Architecture","display.Passive Design","display.Net Zero Energy Buidlings","display.Generative Design"]},
            {name: "display.Passive Design", imports: ["display.Sustainable Architecture","display.Green Urbanism","display.Living Architecture","display.Green Building Principles","display.Net Zero Energy Buidlings","display.Generative Design"]},
            {name: "display.Net Zero Energy Buidlings", imports: ["display.Sustainable Architecture","display.Green Urbanism","display.Living Architecture","display.Green Building Principles","display.Passive Design","display.Generative Design"]},
            {name: "display.Generative Design", imports: ["display.Sustainable Architecture","display.Green Urbanism","display.Biotechnology","display.Art + Music + Technology","display.Living Architecture","display.Green Building Principles","display.Passive Design","display.Net Zero Energy Buidlings"]},
            // Group these together 
            {name: "display.Green Urbanism", imports: ["display.Generative Design","display.Net Zero Energy Buidlings","display.Passive Design","display.Green Building Principles","display.Living Architecture","display.Sustainable Architecture","display.Biotechnology","display.Art + Music + Technology"]},
            {name: "display.Green Infrastructure", imports: ["display.Generative Design","display.Net Zero Energy Buidlings","display.Passive Design","display.Green Building Principles","display.Living Architecture","display.Sustainable Architecture","display.Green Urbanism","display.Biotechnology","display.Smart City Technology","display.Urban Ecology","display.Adaptive Reuse","display.Biophilic Design","display.Sustainable Resource Management"]},
            {name: "display.Smart City Technology", imports: ["display.Generative Design","display.Net Zero Energy Buidlings","display.Passive Design","display.Green Building Principles","display.Living Architecture","display.Sustainable Architecture","display.Green Urbanism","display.Biotechnology","display.Green Infrastructure","display.Urban Ecology","display.Adaptive Reuse","display.Biophilic Design","display.Sustainable Resource Management"]},
            {name: "display.Urban Ecology", imports: ["display.Net Zero Energy Buidlings","display.Passive Design","display.Green Building Principles","display.Living Architecture","display.Sustainable Architecture","display.Green Urbanism","display.Biotechnology","display.Green Infrastructure","display.Smart City Technology","display.Adaptive Reuse","display.Biophilic Design","display.Sustainable Resource Management"]},
            {name: "display.Adaptive Reuse", imports: ["display.Net Zero Energy Buidlings","display.Passive Design","display.Green Building Principles","display.Living Architecture","display.Sustainable Architecture","display.Green Urbanism","display.Green Infrastructure","display.Smart City Technology","display.Urban Ecology","display.Biophilic Design","display.Sustainable Resource Management"]},
            {name: "display.Biophilic Design", imports: ["display.Generative Design","display.Passive Design","display.Green Building Principles","display.Living Architecture","display.Sustainable Architecture","display.Green Urbanism","display.Biotechnology","display.Art + Music + Technology","display.Green Infrastructure","display.Smart City Technology","display.Urban Ecology","display.Adaptive Reuse","display.Sustainable Resource Management"]},
            {name: "display.Sustainable Resource Management", imports: ["display.Net Zero Energy Buidlings","display.Passive Design","display.Green Building Principles","display.Living Architecture","display.Sustainable Architecture","display.Green Urbanism","display.Green Infrastructure","display.Smart City Technology","display.Urban Ecology","display.Adaptive Reuse","display.Biophilic Design"]},
            // Group these together 
            {name: "display.Biotechnology", imports: ["display.Biophilic Design","display.Urban Ecology","display.Smart City Technology","display.Green Infrastructure","display.Generative Design","display.Net Zero Energy Buidlings","display.Green Building Principles","display.Living Architecture","display.Sustainable Architecture","display.Green Urbanism","display.Art + Music + Technology"]},
            {name: "display.Environmental Biotechnology", imports: ["display.Biophilic Design","display.Urban Ecology","display.Green Infrastructure","display.Generative Design","display.Net Zero Energy Buidlings","display.Passive Design","display.Green Building Principles","display.Living Architecture","display.Green Urbanism","display.Sustainable Architecture","display.Biotechnology","display.Bioremediation","display.Biomimicry","display.Biomonitoring + Biosenors","display.Bioenergy Production","display.Bioinformatics","display.Phytoremediation","display.Biofiltration","display.Sustainable Agriculture"]},
            {name: "display.Bioremediation", imports: ["display.Biophilic Design","display.Urban Ecology","display.Green Building Principles","display.Sustainable Architecture","display.Biotechnology","display.Green Urbanism","display.Art + Music + Technology","display.Environmental Biotechnology","display.Biomimicry","display.Biomonitoring + Biosenors","display.Bioenergy Production","display.Bioinformatics","display.Phytoremediation","display.Biofiltration","display.Sustainable Agriculture"]},
            {name: "display.Biomimicry", imports: ["display.Biophilic Design","display.Urban Ecology","display.Green Infrastructure","display.Generative Design","display.Living Architecture","display.Biotechnology","display.Green Urbanism","display.Art + Music + Technology","display.Environmental Biotechnology","display.Bioremediation","display.Biomonitoring + Biosenors","display.Bioenergy Production","display.Bioinformatics","display.Phytoremediation","display.Biofiltration","display.Sustainable Agriculture"]},
            {name: "display.Biomonitoring + Biosenors", imports: ["display.Sustainable Resource Management","display.Biophilic Design","display.Urban Ecology","display.Generative Design","display.Green Building Principles","display.Biotechnology","display.Green Urbanism","display.Environmental Biotechnology","display.Bioremediation","display.Biomimicry","display.Bioenergy Production","display.Bioinformatics","display.Phytoremediation","display.Biofiltration","display.Sustainable Agriculture"]},
            {name: "display.Bioenergy Production", imports: ["display.Sustainable Resource Management","display.Biophilic Design","display.Green Building Principles","display.Passive Design","display.Green Infrastructure","display.Biotechnology","display.Environmental Biotechnology","display.Bioremediation","display.Biomimicry","display.Biomonitoring + Biosenors","display.Bioinformatics","display.Phytoremediation","display.Biofiltration","display.Sustainable Agriculture"]},
            {name: "display.Bioinformatics", imports: ["display.Sustainable Resource Management","display.Urban Ecology","display.Biotechnology","display.Environmental Biotechnology","display.Bioremediation","display.Biomimicry","display.Biomonitoring + Biosenors","display.Bioenergy Production","display.Phytoremediation","display.Biofiltration","display.Sustainable Agriculture"]},
            {name: "display.Phytoremediation", imports: ["display.Urban Ecology","display.Biotechnology","display.Environmental Biotechnology","display.Bioremediation","display.Biomimicry","display.Biomonitoring + Biosenors","display.Bioenergy Production","display.Bioinformatics","display.Biofiltration","display.Sustainable Agriculture"]},
            {name: "display.Biofiltration", imports: ["display.Sustainable Resource Management","display.Biotechnology","display.Green Urbanism","display.Environmental Biotechnology","display.Bioremediation","display.Biomimicry","display.Biomonitoring + Biosenors","display.Bioenergy Production","display.Bioinformatics","display.Phytoremediation","display.Sustainable Agriculture"]},
            {name: "display.Sustainable Agriculture", imports: ["display.Sustainable Resource Management","display.Urban Ecology","display.Sustainable Architecture","display.Biotechnology","display.Green Urbanism","display.Environmental Biotechnology","display.Bioremediation","display.Biomimicry","display.Biomonitoring + Biosenors","display.Bioenergy Production","display.Bioinformatics","display.Phytoremediation","display.Biofiltration"]},
            // Group these together
            {name: "display.Art + Music + Technology", imports: ["display.Environmental Biotechnology","display.Generative Design","display.Living Architecture","display.Sustainable Architecture","display.Green Urbanism","display.Biotechnology"]},
            {name: "display.Digital Visual Art", imports: ["display.Biomimicry","display.Generative Design","display.Living Architecture","display.Art + Music + Technology","display.Biotechnology","display.Projection Mapping","display.Animation","display.Audiovisual Art","display.Augmented + Virtual Reality","display.Electronic Music","display.Sound Art","display.Digital Fusion","display.Data Visualization","display.Augmented Experiences"]},
            {name: "display.Projection Mapping", imports: ["display.Biomimicry","display.Environmental Biotechnology","display.Generative Design","display.Living Architecture","display.Art + Music + Technology","display.Biotechnology","display.Digital Visual Art","display.Animation","display.Audiovisual Art","display.Augmented + Virtual Reality","display.Electronic Music","display.Sound Art","display.Digital Fusion","display.Data Visualization","display.Augmented Experiences"]},
            {name: "display.Animation", imports: ["display.Living Architecture","display.Art + Music + Technology","display.Biotechnology","display.Digital Visual Art","display.Projection Mapping","display.Audiovisual Art","display.Augmented + Virtual Reality","display.Electronic Music","display.Sound Art","display.Digital Fusion","display.Data Visualization","display.Augmented Experiences"]},
            {name: "display.Audiovisual Art", imports: ["display.Smart City Technology","display.Art + Music + Technology","display.Digital Visual Art","display.Projection Mapping","display.Animation","display.Augmented + Virtual Reality","display.Electronic Music","display.Sound Art","display.Digital Fusion","display.Data Visualization","display.Augmented Experiences"]},
            {name: "display.Augmented + Virtual Reality", imports: ["display.Generative Design","display.Living Architecture","display.Art + Music + Technology","display.Biotechnology","display.Digital Visual Art","display.Projection Mapping","display.Animation", "display.Audiovisual Art","display.Electronic Music","display.Sound Art","display.Digital Fusion","display.Data Visualization","display.Augmented Experiences"]},
            {name: "display.Electronic Music", imports: ["display.Art + Music + Technology","display.Digital Visual Art","display.Projection Mapping","display.Animation","display.Audiovisual Art","display.Augmented + Virtual Reality","display.Sound Art","display.Digital Fusion","display.Data Visualization","display.Augmented Experiences"]},
            {name: "display.Sound Art", imports: ["display.Art + Music + Technology","display.Digital Visual Art","display.Projection Mapping","display.Animation","display.Audiovisual Art","display.Augmented + Virtual Reality","display.Electronic Music","display.Digital Fusion","display.Data Visualization","display.Augmented Experiences"]},
            {name: "display.Digital Fusion", imports: ["display.Art + Music + Technology","display.Digital Visual Art","display.Projection Mapping","display.Animation","display.Audiovisual Art","display.Augmented + Virtual Reality","display.Electronic Music","display.Sound Art","display.Data Visualization","display.Augmented Experiences"]},
            {name: "display.Data Visualization", imports: ["display.Biomimicry","display.Environmental Biotechnology","display.Generative Design","display.Living Architecture","display.Art + Music + Technology","display.Biotechnology","display.Digital Visual Art","display.Projection Mapping","display.Animation","display.Audiovisual Art","display.Augmented + Virtual Reality","display.Electronic Music","display.Sound Art","display.Digital Fusion","display.Augmented Experiences"]},
            {name: "display.Augmented Experiences", imports: ["display.Biomimicry","display.Smart City Technology","display.Generative Design","display.Living Architecture","display.Art + Music + Technology","display.Biotechnology","display.Digital Visual Art","display.Projection Mapping","display.Animation","display.Audiovisual Art","display.Augmented + Virtual Reality","display.Electronic Music","display.Sound Art","display.Digital Fusion","display.Data Visualization","display.Augmented Experiences"]},
        ];

        // Initialize the chart
        const hierarchicalData = hierarchy(sampleData);
        const chart = createChart(hierarchicalData);
        document.getElementById('chart').appendChild(chart);

        // Global function to update with new data
        window.updateChart = function(newData) {
            document.getElementById('chart').innerHTML = '';
            const processedData = hierarchy(newData);
            const newChart = createChart(processedData);
            document.getElementById('chart').appendChild(newChart);
        };

        console.log("Hierarchical Edge Bundling chart ready!");
        console.log("Sample data format:");
        console.log(sampleData.slice(0, 3));
        console.log("Use updateChart(flatDataArray) to update with your data");