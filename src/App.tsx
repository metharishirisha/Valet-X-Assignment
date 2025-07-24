import React, { useState, useEffect, useRef } from 'react';
import { Car, MapPin, Bluetooth, Wifi, Navigation, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

interface Gate {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  confidence: number;
}

interface User {
  x: number;
  y: number;
  direction: number;
  speed: number;
  inApproachZone: string | null;
  dwellTime: number;
}

interface Beacon {
  id: string;
  x: number;
  y: number;
  strength: number;
}

interface DispatchStatus {
  active: boolean;
  gate: string;
  eta: number;
  carStatus: 'dispatched' | 'en-route' | 'arrived';
}

const GATES: Gate[] = [
  { id: 'A', name: 'North Gate', x: 400, y: 50, color: '#3B82F6', confidence: 0 },
  { id: 'B', name: 'East Gate', x: 750, y: 300, color: '#10B981', confidence: 0 },
  { id: 'C', name: 'South Gate', x: 400, y: 550, color: '#F59E0B', confidence: 0 },
  { id: 'D', name: 'West Gate', x: 50, y: 300, color: '#EF4444', confidence: 0 }
];

const BEACONS: Beacon[] = [
  { id: 'B1', x: 200, y: 150, strength: 0 },
  { id: 'B2', x: 400, y: 100, strength: 0 },
  { id: 'B3', x: 600, y: 150, strength: 0 },
  { id: 'B4', x: 650, y: 300, strength: 0 },
  { id: 'B5', x: 600, y: 450, strength: 0 },
  { id: 'B6', x: 400, y: 500, strength: 0 },
  { id: 'B7', x: 200, y: 450, strength: 0 },
  { id: 'B8', x: 150, y: 300, strength: 0 },
  { id: 'B9', x: 300, y: 250, strength: 0 },
  { id: 'B10', x: 500, y: 250, strength: 0 },
  { id: 'B11', x: 400, y: 200, strength: 0 },
  { id: 'B12', x: 400, y: 350, strength: 0 }
];

function App() {
  const [user, setUser] = useState<User>({
    x: 400,
    y: 300,
    direction: 0,
    speed: 1.2,
    inApproachZone: null,
    dwellTime: 0
  });

  const [gates, setGates] = useState<Gate[]>(GATES);
  const [beacons, setBeacons] = useState<Beacon[]>(BEACONS);
  const [dispatch, setDispatch] = useState<DispatchStatus>({
    active: false,
    gate: '',
    eta: 0,
    carStatus: 'dispatched'
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const calculateDistance = (x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  const calculateBeaconStrengths = (userX: number, userY: number) => {
    return beacons.map(beacon => {
      const distance = calculateDistance(userX, userY, beacon.x, beacon.y);
      const maxRange = 80;
      const strength = Math.max(0, Math.min(100, (maxRange - distance) / maxRange * 100));
      return { ...beacon, strength };
    });
  };

  const calculateGateConfidence = (gate: Gate, user: User) => {
    // Proximity Score (40% weight)
    const distance = calculateDistance(user.x, user.y, gate.x, gate.y);
    const maxDistance = 300;
    const proximityScore = Math.max(0, (maxDistance - distance) / maxDistance * 100);

    // Vector Score (40% weight)
    const angleToGate = Math.atan2(gate.y - user.y, gate.x - user.x);
    const userDirection = user.direction * (Math.PI / 180);
    let angleDiff = Math.abs(angleToGate - userDirection);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    const vectorScore = Math.max(0, (Math.PI - angleDiff) / Math.PI * 100);

    // Dwell Time Score (20% weight)
    const approachZoneRadius = 80;
    const inApproachZone = distance < approachZoneRadius;
    let dwellScore = 0;
    if (inApproachZone && user.inApproachZone === gate.id) {
      dwellScore = Math.min(100, user.dwellTime * 2);
    }

    // Combined score
    const confidence = (0.4 * proximityScore) + (0.4 * vectorScore) + (0.2 * dwellScore);
    return Math.round(confidence);
  };

  const moveUser = () => {
    setUser(prev => {
      const radians = prev.direction * (Math.PI / 180);
      let newX = prev.x + Math.cos(radians) * prev.speed;
      let newY = prev.y + Math.sin(radians) * prev.speed;

      // Bounce off walls
      if (newX < 30 || newX > 770) {
        newX = Math.max(30, Math.min(770, newX));
        return { ...prev, direction: 180 - prev.direction };
      }
      if (newY < 30 || newY > 570) {
        newY = Math.max(30, Math.min(570, newY));
        return { ...prev, direction: -prev.direction };
      }

      // Check approach zones
      let inApproachZone = null;
      let dwellTime = prev.dwellTime;

      for (const gate of gates) {
        const distance = calculateDistance(newX, newY, gate.x, gate.y);
        if (distance < 80) {
          inApproachZone = gate.id;
          if (prev.inApproachZone === gate.id) {
            dwellTime += 0.2;
          } else {
            dwellTime = 0.2;
          }
          break;
        }
      }

      if (!inApproachZone) {
        dwellTime = 0;
      }

      return { ...prev, x: newX, y: newY, inApproachZone, dwellTime };
    });
  };

  const updateSimulation = () => {
    moveUser();

    setUser(current => {
      const updatedBeacons = calculateBeaconStrengths(current.x, current.y);
      setBeacons(updatedBeacons);

      const updatedGates = gates.map(gate => ({
        ...gate,
        confidence: calculateGateConfidence(gate, current)
      }));

      setGates(updatedGates);

      // Check for dispatch trigger
      const highestConfidence = Math.max(...updatedGates.map(g => g.confidence));
      const highestGate = updatedGates.find(g => g.confidence === highestConfidence);

      if (!dispatch.active && highestConfidence > 90 && highestGate) {
        const eta = Math.round(calculateDistance(current.x, current.y, highestGate.x, highestGate.y) / current.speed / 10);
        setDispatch({
          active: true,
          gate: highestGate.id,
          eta: eta,
          carStatus: 'dispatched'
        });
        addLog(`🚗 DISPATCH TRIGGERED: Car dispatched to ${highestGate.name} (ETA: ${eta}s)`);
      }

      return current;
    });
  };

  const startSimulation = () => {
    setIsSimulating(true);
    addLog('🎯 User requested car - Starting location tracking');
    intervalRef.current = setInterval(updateSimulation, 200);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDispatch({ active: false, gate: '', eta: 0, carStatus: 'dispatched' });
    addLog('⏹️ Simulation stopped');
  };

  const resetSimulation = () => {
    stopSimulation();
    setUser({ x: 400, y: 300, direction: 0, speed: 1.2, inApproachZone: null, dwellTime: 0 });
    setGates(GATES);
    setBeacons(BEACONS);
    setLogs([]);
  };

  const changeDirection = () => {
    setUser(prev => ({ ...prev, direction: prev.direction + (Math.random() - 0.5) * 60 }));
    addLog('🔄 User changed direction');
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Car className="w-8 h-8 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold">Intelligent Valet System</h1>
              <p className="text-gray-400">Multi-Sensor Exit Gate Prediction</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-green-900 text-green-300">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">System Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-screen">
        {/* Left Sidebar - Controls */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-6">
          <div className="space-y-6">
            {/* Control Panel */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Control Panel</h3>
              <div className="space-y-3">
                <button
                  onClick={isSimulating ? stopSimulation : startSimulation}
                  className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                    isSimulating
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isSimulating ? 'Stop Simulation' : 'Request Car'}
                </button>
                <button
                  onClick={resetSimulation}
                  className="w-full px-4 py-2 rounded-lg font-medium bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={changeDirection}
                  disabled={!isSimulating}
                  className="w-full px-4 py-2 rounded-lg font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Change Direction
                </button>
              </div>
            </div>

            {/* Gate Confidence Scores */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Exit Gate Confidence</h3>
              <div className="space-y-3">
                {gates.map(gate => (
                  <div key={gate.id} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{gate.name}</span>
                      <span className={`font-bold ${gate.confidence > 90 ? 'text-green-400' : gate.confidence > 50 ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {gate.confidence}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${gate.confidence}%`,
                          backgroundColor: gate.color
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dispatch Status */}
            {dispatch.active && (
              <div className="bg-green-900 border border-green-700 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Car className="w-5 h-5 text-green-400" />
                  <span className="font-semibold text-green-400">Car Dispatched</span>
                </div>
                <p className="text-sm text-green-300">
                  Gate: {gates.find(g => g.id === dispatch.gate)?.name}
                </p>
                <p className="text-sm text-green-300">
                  ETA: {dispatch.eta} seconds
                </p>
              </div>
            )}

            {/* User Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4">User Status</h3>
              <div className="bg-gray-700 rounded-lg p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Position:</span>
                  <span>{Math.round(user.x)}, {Math.round(user.y)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Direction:</span>
                  <span>{Math.round(user.direction)}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Speed:</span>
                  <span>{user.speed} m/s</span>
                </div>
                {user.inApproachZone && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Approach Zone:</span>
                    <span className="text-green-400">Gate {user.inApproachZone}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Mall Map */}
          <div className="flex-1 p-6">
            <div className="bg-gray-800 rounded-lg p-4 h-full">
              <h3 className="text-lg font-semibold mb-4">Mall Layout & Tracking</h3>
              <div className="relative bg-gray-700 rounded-lg" style={{ height: 'calc(100% - 3rem)' }}>
                <svg width="100%" height="100%" viewBox="0 0 800 600" className="absolute inset-0">
                  {/* Mall boundaries */}
                  <rect x="20" y="20" width="760" height="560" fill="none" stroke="#4B5563" strokeWidth="2" rx="10" />
                  
                  {/* Approach zones */}
                  {gates.map(gate => (
                    <circle
                      key={`zone-${gate.id}`}
                      cx={gate.x}
                      cy={gate.y}
                      r="80"
                      fill={gate.color}
                      fillOpacity="0.1"
                      stroke={gate.color}
                      strokeWidth="1"
                      strokeDasharray="5,5"
                    />
                  ))}
                  
                  {/* Beacons */}
                  {beacons.map(beacon => (
                    <g key={beacon.id}>
                      <circle
                        cx={beacon.x}
                        cy={beacon.y}
                        r="4"
                        fill="#6366F1"
                        opacity="0.8"
                      />
                      {beacon.strength > 0 && (
                        <circle
                          cx={beacon.x}
                          cy={beacon.y}
                          r={beacon.strength * 0.3}
                          fill="#6366F1"
                          fillOpacity="0.1"
                          stroke="#6366F1"
                          strokeWidth="1"
                          opacity={beacon.strength / 100}
                        />
                      )}
                      <text
                        x={beacon.x}
                        y={beacon.y - 8}
                        textAnchor="middle"
                        className="text-xs fill-gray-400"
                      >
                        {beacon.id}
                      </text>
                    </g>
                  ))}
                  
                  {/* Gates */}
                  {gates.map(gate => (
                    <g key={gate.id}>
                      <rect
                        x={gate.x - 15}
                        y={gate.y - 8}
                        width="30"
                        height="16"
                        fill={gate.color}
                        rx="8"
                      />
                      <text
                        x={gate.x}
                        y={gate.y + 25}
                        textAnchor="middle"
                        className="text-sm font-medium fill-white"
                      >
                        Gate {gate.id}
                      </text>
                      <text
                        x={gate.x}
                        y={gate.y + 40}
                        textAnchor="middle"
                        className="text-xs fill-gray-400"
                      >
                        {gate.confidence}%
                      </text>
                    </g>
                  ))}
                  
                  {/* User */}
                  <g>
                    <circle
                      cx={user.x}
                      cy={user.y}
                      r="8"
                      fill="#F59E0B"
                      stroke="#FCD34D"
                      strokeWidth="2"
                    />
                    {/* Direction indicator */}
                    <line
                      x1={user.x}
                      y1={user.y}
                      x2={user.x + Math.cos(user.direction * Math.PI / 180) * 20}
                      y2={user.y + Math.sin(user.direction * Math.PI / 180) * 20}
                      stroke="#F59E0B"
                      strokeWidth="3"
                      markerEnd="url(#arrowhead)"
                    />
                    <text
                      x={user.x}
                      y={user.y - 15}
                      textAnchor="middle"
                      className="text-sm font-medium fill-yellow-400"
                    >
                      User
                    </text>
                  </g>
                  
                  {/* Arrow marker */}
                  <defs>
                    <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                      <polygon points="0 0, 10 3.5, 0 7" fill="#F59E0B" />
                    </marker>
                  </defs>
                </svg>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-gray-800 border-t border-gray-700 p-6">
            <h3 className="text-lg font-semibold mb-4">System Activity Log</h3>
            <div className="bg-gray-900 rounded-lg p-4 h-32 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 text-sm">No activity logged yet...</p>
              ) : (
                <div className="space-y-1">
                  {logs.map((log, index) => (
                    <p key={index} className="text-sm text-gray-300 font-mono">
                      {log}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Sensors */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-6">
          <div className="space-y-6">
            {/* Sensor Status */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Sensor Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Bluetooth className="w-5 h-5 text-blue-400" />
                    <span>BLE Beacons</span>
                  </div>
                  <span className="text-green-400 text-sm">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Wifi className="w-5 h-5 text-green-400" />
                    <span>Wi-Fi</span>
                  </div>
                  <span className="text-green-400 text-sm">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Navigation className="w-5 h-5 text-yellow-400" />
                    <span>IMU</span>
                  </div>
                  <span className="text-green-400 text-sm">Active</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-red-400" />
                    <span>GPS</span>
                  </div>
                  <span className="text-yellow-400 text-sm">Limited</span>
                </div>
              </div>
            </div>

            {/* Algorithm Parameters */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Algorithm Weights</h3>
              <div className="space-y-3">
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Proximity Score</span>
                    <span className="text-sm text-blue-400">40%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div className="bg-blue-400 h-2 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Vector Score</span>
                    <span className="text-sm text-green-400">40%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div className="bg-green-400 h-2 rounded-full" style={{ width: '40%' }} />
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm">Dwell Time</span>
                    <span className="text-sm text-yellow-400">20%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div className="bg-yellow-400 h-2 rounded-full" style={{ width: '20%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* System Metrics */}
            <div>
              <h3 className="text-lg font-semibold mb-4">System Metrics</h3>
              <div className="bg-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Trigger Threshold:</span>
                  <span className="text-green-400">90%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Sustain Period:</span>
                  <span className="text-green-400">10s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Update Frequency:</span>
                  <span className="text-green-400">5Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Active Beacons:</span>
                  <span className="text-green-400">{beacons.filter(b => b.strength > 0).length}/{beacons.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;