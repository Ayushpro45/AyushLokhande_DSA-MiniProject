import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Popup, CircleMarker } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import './App.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Import Leaflet and Leaflet.Draw
import * as L from 'leaflet';
import 'leaflet-draw';

// Dijkstra's Algorithm implementation
class PriorityQueue {
  constructor() {
    this.values = [];
  }

  enqueue(val, priority) {
    this.values.push({ val, priority });
    this.sort();
  }

  dequeue() {
    return this.values.shift();
  }

  sort() {
    this.values.sort((a, b) => a.priority - b.priority);
  }

  isEmpty() {
    return this.values.length === 0;
  }
}

class Graph {
  constructor() {
    this.adjacencyList = {};
  }

  addVertex(vertex) {
    if (!this.adjacencyList[vertex]) {
      this.adjacencyList[vertex] = [];
    }
  }

  addEdge(vertex1, vertex2, weight) {
    this.adjacencyList[vertex1].push({ node: vertex2, weight });
    this.adjacencyList[vertex2].push({ node: vertex1, weight });
  }

  dijkstra(start, finish) {
    const nodes = new PriorityQueue();
    const distances = {};
    const previous = {};
    let path = [];
    let smallest;

    for (let vertex in this.adjacencyList) {
      if (vertex === start) {
        distances[vertex] = 0;
        nodes.enqueue(vertex, 0);
      } else {
        distances[vertex] = Infinity;
        nodes.enqueue(vertex, Infinity);
      }
      previous[vertex] = null;
    }

    while (!nodes.isEmpty()) {
      smallest = nodes.dequeue().val;
      if (smallest === finish) {
        while (previous[smallest]) {
          path.push(smallest);
          smallest = previous[smallest];
        }
        break;
      }

      if (smallest || distances[smallest] !== Infinity) {
        for (let neighbor in this.adjacencyList[smallest]) {
          let nextNode = this.adjacencyList[smallest][neighbor];
          let candidate = distances[smallest] + nextNode.weight;
          let nextNeighbor = nextNode.node;
          if (candidate < distances[nextNeighbor]) {
            distances[nextNeighbor] = candidate;
            previous[nextNeighbor] = smallest;
            nodes.enqueue(nextNeighbor, candidate);
          }
        }
      }
    }
    return path.concat(smallest).reverse();
  }
}

// Map controller component for drawing functionality
function MapController({ onCreated, drawingEnabled }) {
  const map = useMap();
  const drawControlRef = useRef();

  useEffect(() => {
    if (!map || !drawingEnabled) return;

    // Initialize the FeatureGroup to store editable layers
    const drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    // Initialize the draw control and pass it the FeatureGroup of editable layers
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polyline: {
          shapeOptions: {
            color: '#3388ff',
            weight: 5
          }
        },
        polygon: false,
        circle: false,
        rectangle: false,
        marker: false,
        circlemarker: false
      },
      edit: {
        featureGroup: drawnItems,
        remove: true
      }
    });
    
    map.addControl(drawControl);
    drawControlRef.current = drawControl;

    // Event handler for when a polyline is created
    map.on('draw:created', (e) => {
      const type = e.layerType;
      const layer = e.layer;

      if (type === 'polyline') {
        // Add the layer to the FeatureGroup
        drawnItems.addLayer(layer);
        
        // Extract coordinates
        const coordinates = layer.getLatLngs().map(latlng => [latlng.lat, latlng.lng]);
        
        // Notify parent component
        onCreated({
          coordinates,
          length: calculatePolylineLength(layer),
          material: 'Steel',
          health: Math.floor(Math.random() * 40) + 60, // Random health between 60-100
          leakages: Math.floor(Math.random() * 3), // Random leakages between 0-2
          pressure: Math.floor(Math.random() * 20) + 30, // Random pressure between 30-50
          flowRate: Math.floor(Math.random() * 500) + 800, // Random flow rate between 800-1300
          lastInspection: new Date().toISOString().split('T')[0]
        });
      }
    });

    // Cleanup function
    return () => {
      if (drawControlRef.current) {
        map.removeControl(drawControlRef.current);
      }
      map.off('draw:created');
    };
  }, [map, drawingEnabled, onCreated]);

  return null;
}

// Helper function to calculate polyline length
function calculatePolylineLength(polyline) {
  const latlngs = polyline.getLatLngs();
  let totalDistance = 0;
  
  for (let i = 1; i < latlngs.length; i++) {
    totalDistance += latlngs[i-1].distanceTo(latlngs[i]);
  }
  
  // Convert meters to kilometers
  return Math.round(totalDistance / 1000 * 100) / 100;
}

const App = () => {
  const [pipelines, setPipelines] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [shortestPath, setShortestPath] = useState([]);
  const [apiData, setApiData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('map'); // 'map' or 'analytics'
  const [drawingEnabled, setDrawingEnabled] = useState(false);
  const [nextPipelineId, setNextPipelineId] = useState(4); // Start from 4 since we have 3 sample pipelines

  // Sample pipeline data with more realistic structure
  const samplePipelines = [
    {
      id: 1,
      coordinates: [
        [51.505, -0.09],
        [51.51, -0.1],
        [51.515, -0.11]
      ],
      length: 12.5,
      material: 'Steel',
      health: 85,
      leakages: 0,
      pressure: 45,
      flowRate: 1200,
      lastInspection: '2025-09-15'
    },
    {
      id: 2,
      coordinates: [
        [51.52, -0.08],
        [51.53, -0.09],
        [51.54, -0.1]
      ],
      length: 18.2,
      material: 'PVC',
      health: 92,
      leakages: 1,
      pressure: 38,
      flowRate: 950,
      lastInspection: '2025-08-22'
    },
    {
      id: 3,
      coordinates: [
        [51.515, -0.11],
        [51.525, -0.12],
        [51.535, -0.13]
      ],
      length: 15.7,
      material: 'Cast Iron',
      health: 72,
      leakages: 2,
      pressure: 41,
      flowRate: 1100,
      lastInspection: '2025-07-30'
    }
  ];

  // Sample nodes for Dijkstra's algorithm
  const sampleNodes = [
    { id: 'A', position: [51.505, -0.09], name: 'Node A' },
    { id: 'B', position: [51.51, -0.1], name: 'Node B' },
    { id: 'C', position: [51.515, -0.11], name: 'Node C' },
    { id: 'D', position: [51.52, -0.08], name: 'Node D' },
    { id: 'E', position: [51.53, -0.09], name: 'Node E' },
    { id: 'F', position: [51.54, -0.1], name: 'Node F' },
    { id: 'G', position: [51.525, -0.12], name: 'Node G' },
    { id: 'H', position: [51.535, -0.13], name: 'Node H' }
  ];

  // Chart data for pipeline analytics
  const chartData = {
    labels: samplePipelines.map(p => `Pipeline ${p.id}`),
    datasets: [
      {
        label: 'Health %',
        data: samplePipelines.map(p => p.health),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1
      },
      {
        label: 'Pressure (PSI)',
        data: samplePipelines.map(p => p.pressure),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Pipeline Metrics Comparison',
      },
    },
  };

  // Simulate API call for pipeline data
  const fetchPipelineData = useCallback(async () => {
    setLoading(true);
    try {
      // In a real app, this would be an actual API call
      // const response = await fetch('/api/pipelines');
      // const data = await response.json();
      
      // Simulating API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, we'll use sample data
      setPipelines(samplePipelines);
      setNodes(sampleNodes);
      setApiData({ status: 'success', timestamp: new Date().toISOString() });
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
      setApiData({ status: 'error', message: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  // Simulate AI analysis API call
  const analyzePipelineHealth = useCallback(async (pipelineId) => {
    try {
      // In a real app, this would call an AI service
      // const response = await fetch(`/api/analyze/${pipelineId}`, { method: 'POST' });
      // const analysis = await response.json();
      
      // Simulating AI analysis
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Find the pipeline and update its health score with "AI-enhanced" analysis
      setPipelines(prevPipelines => 
        prevPipelines.map(pipeline => {
          if (pipeline.id === pipelineId) {
            // Simulate AI improving the health assessment
            const aiHealthAdjustment = Math.floor(Math.random() * 10) - 5; // -5 to +5 adjustment
            const newHealth = Math.min(100, Math.max(0, pipeline.health + aiHealthAdjustment));
            return { ...pipeline, health: newHealth, aiAnalyzed: true };
          }
          return pipeline;
        })
      );
    } catch (error) {
      console.error('Error analyzing pipeline health:', error);
    }
  }, []);

  useEffect(() => {
    fetchPipelineData();
  }, [fetchPipelineData]);

  const handlePipelineHover = (pipeline) => {
    setSelectedPipeline(pipeline);
  };

  const handleMapClick = () => {
    setSelectedPipeline(null);
  };

  // Function to find shortest path between two nodes using Dijkstra's algorithm
  const findShortestPath = () => {
    const graph = new Graph();
    
    // Add vertices (nodes)
    sampleNodes.forEach(node => {
      graph.addVertex(node.id);
    });
    
    // Add edges (pipelines) with weights (length)
    samplePipelines.forEach(pipeline => {
      // Simplified edge creation - in reality, you'd map coordinates to nodes
      if (pipeline.id === 1) graph.addEdge('A', 'B', pipeline.length);
      if (pipeline.id === 1) graph.addEdge('B', 'C', pipeline.length / 2);
      if (pipeline.id === 2) graph.addEdge('D', 'E', pipeline.length);
      if (pipeline.id === 2) graph.addEdge('E', 'F', pipeline.length / 2);
      if (pipeline.id === 3) graph.addEdge('C', 'G', pipeline.length);
      if (pipeline.id === 3) graph.addEdge('G', 'H', pipeline.length / 2);
    });
    
    // Find shortest path from A to H
    const path = graph.dijkstra('A', 'H');
    setShortestPath(path);
    
    // Highlight the path on the map (simplified)
    console.log('Shortest path from A to H:', path);
  };

  // Function to trigger AI analysis
  const triggerAIAnalysis = () => {
    if (selectedPipeline) {
      analyzePipelineHealth(selectedPipeline.id);
    }
  };

  // Handle new pipeline creation from drawing
  const handleNewPipeline = (newPipeline) => {
    const pipelineWithId = {
      ...newPipeline,
      id: nextPipelineId
    };
    
    setPipelines(prev => [...prev, pipelineWithId]);
    setNextPipelineId(prev => prev + 1);
  };

  // Toggle drawing mode
  const toggleDrawingMode = () => {
    setDrawingEnabled(prev => !prev);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Pipeline Management System</h1>
        <div className="controls">
          <button onClick={() => setViewMode('map')} className={viewMode === 'map' ? 'active' : ''}>
            Map View
          </button>
          <button onClick={() => setViewMode('analytics')} className={viewMode === 'analytics' ? 'active' : ''}>
            Analytics
          </button>
          <button onClick={fetchPipelineData} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh Data'}
          </button>
          <button onClick={toggleDrawingMode} className={drawingEnabled ? 'active' : ''}>
            {drawingEnabled ? 'Finish Drawing' : 'Draw Pipeline'}
          </button>
          <button onClick={findShortestPath}>Find Shortest Path</button>
          {selectedPipeline && (
            <button onClick={triggerAIAnalysis}>
              Analyze Pipeline Health (AI)
            </button>
          )}
        </div>
      </header>
      
      <div className="status-bar">
        {apiData && (
          <div className={`api-status ${apiData.status}`}>
            API Status: {apiData.status} 
            {apiData.timestamp && ` (Last updated: ${new Date(apiData.timestamp).toLocaleTimeString()})`}
          </div>
        )}
        {drawingEnabled && (
          <div className="drawing-instruction">
            Click on the map to start drawing a pipeline. Click again to add points. Double-click to finish.
          </div>
        )}
      </div>
      
      {viewMode === 'map' ? (
        <div className="map-container">
          <MapContainer 
            center={[51.515, -0.09]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            onClick={handleMapClick}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            <MapController 
              onCreated={handleNewPipeline} 
              drawingEnabled={drawingEnabled} 
            />
            
            {/* Render pipelines */}
            {pipelines.map((pipeline) => (
              <Polyline
                key={pipeline.id}
                positions={pipeline.coordinates}
                color={pipeline.health > 80 ? 'green' : pipeline.health > 60 ? 'orange' : 'red'}
                weight={pipeline.aiAnalyzed ? 7 : 5}
                eventHandlers={{
                  mouseover: () => handlePipelineHover(pipeline),
                  mouseout: () => setSelectedPipeline(null)
                }}
              >
                <Popup>
                  <div className="pipeline-popup">
                    <h3>Pipeline #{pipeline.id}</h3>
                    <p>Length: {pipeline.length} km</p>
                    <p>Material: {pipeline.material}</p>
                    <p>Health: {pipeline.health}% {pipeline.aiAnalyzed && '(AI Analyzed)'}</p>
                    <p>Leakages: {pipeline.leakages}</p>
                    <p>Pressure: {pipeline.pressure} PSI</p>
                    <p>Flow Rate: {pipeline.flowRate} m³/h</p>
                    <p>Last Inspection: {pipeline.lastInspection}</p>
                  </div>
                </Popup>
              </Polyline>
            ))}
            
            {/* Render nodes */}
            {nodes.map((node) => (
              <CircleMarker
                key={node.id}
                center={node.position}
                radius={8}
                color="blue"
                fillColor="lightblue"
                fillOpacity={0.8}
              >
                <Popup>
                  <div className="node-popup">
                    <h3>{node.name}</h3>
                    <p>ID: {node.id}</p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
            
            {/* Render shortest path */}
            {shortestPath.length > 0 && (
              <Polyline
                positions={[
                  [51.505, -0.09], // Node A
                  [51.515, -0.11], // Node C
                  [51.525, -0.12], // Node G
                  [51.535, -0.13]  // Node H
                ]}
                color="purple"
                weight={6}
                dashArray="10, 10"
              />
            )}
          </MapContainer>
        </div>
      ) : (
        <div className="analytics-container">
          <div className="chart-container">
            <Line data={chartData} options={chartOptions} />
          </div>
          <div className="summary-stats">
            <h2>Pipeline Network Summary</h2>
            <div className="stat-card">
              <h3>Total Pipelines</h3>
              <p>{pipelines.length}</p>
            </div>
            <div className="stat-card">
              <h3>Average Health</h3>
              <p>{Math.round(pipelines.reduce((sum, p) => sum + p.health, 0) / (pipelines.length || 1))}%</p>
            </div>
            <div className="stat-card">
              <h3>Total Leakages</h3>
              <p>{pipelines.reduce((sum, p) => sum + p.leakages, 0)}</p>
            </div>
            <div className="stat-card">
              <h3>Total Length</h3>
              <p>{pipelines.reduce((sum, p) => sum + p.length, 0).toFixed(1)} km</p>
            </div>
          </div>
        </div>
      )}
      
      {selectedPipeline && viewMode === 'map' && (
        <div className="pipeline-info-panel">
          <h2>Pipeline Statistics</h2>
          <p><strong>ID:</strong> {selectedPipeline.id}</p>
          <p><strong>Length:</strong> {selectedPipeline.length} km</p>
          <p><strong>Material:</strong> {selectedPipeline.material}</p>
          <p><strong>Health:</strong> {selectedPipeline.health}% 
            {selectedPipeline.aiAnalyzed && <span className="ai-badge"> AI Analyzed</span>}
          </p>
          <p><strong>Leakages:</strong> {selectedPipeline.leakages}</p>
          <p><strong>Pressure:</strong> {selectedPipeline.pressure} PSI</p>
          <p><strong>Flow Rate:</strong> {selectedPipeline.flowRate} m³/h</p>
          <p><strong>Last Inspection:</strong> {selectedPipeline.lastInspection}</p>
          <button onClick={triggerAIAnalysis}>Re-analyze with AI</button>
        </div>
      )}
      
      <div className="legend">
        <h3>Legend</h3>
        <div className="legend-item">
          <div className="color-box green"></div>
          <span>Good Health (&gt;80%)</span>
        </div>
        <div className="legend-item">
          <div className="color-box orange"></div>
          <span>Fair Health (60-80%)</span>
        </div>
        <div className="legend-item">
          <div className="color-box red"></div>
          <span>Poor Health (&lt;60%)</span>
        </div>
        <div className="legend-item">
          <div className="color-box purple"></div>
          <span>Shortest Path</span>
        </div>
        <div className="legend-item">
          <div className="color-box blue"></div>
          <span>Nodes</span>
        </div>
      </div>
    </div>
  );
};

export default App;