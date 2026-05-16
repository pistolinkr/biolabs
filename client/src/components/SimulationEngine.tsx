import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Plus, Trash2 } from 'lucide-react';

interface SimulationType {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

/**
 * Biolabs Simulation Engine UI
 * 
 * Controls for molecular dynamics and interaction simulations
 * - Simulation type selection (folding, docking, diffusion, etc.)
 * - Parameter controls (temperature, pressure, timestep)
 * - Real-time metrics display
 */
export default function SimulationEngine() {
  const [isRunning, setIsRunning] = useState(false);
  const [simulationTypes, setSimulationTypes] = useState<SimulationType[]>([
    { id: 'md', name: 'Molecular Dynamics', description: 'Classical MD simulation', enabled: true },
    { id: 'docking', name: 'Docking', description: 'Ligand docking simulation', enabled: false },
    { id: 'diffusion', name: 'Diffusion', description: 'Particle diffusion analysis', enabled: false },
    { id: 'folding', name: 'Folding', description: 'Protein folding dynamics', enabled: false },
  ]);

  const [parameters, setParameters] = useState({
    temperature: 298.15,
    pressure: 1.013,
    timestep: 2.0,
    duration: 100,
  });

  const toggleSimulationType = (id: string) => {
    setSimulationTypes(
      simulationTypes.map((sim) =>
        sim.id === id ? { ...sim, enabled: !sim.enabled } : sim
      )
    );
  };

  const handleParameterChange = (key: keyof typeof parameters, value: number) => {
    setParameters({ ...parameters, [key]: value });
  };

  return (
    <div className="flex flex-col h-full bg-card text-card-foreground">
      {/* Simulation Type Selection */}
      <div className="border-b border-border p-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
          Simulation Type
        </div>
        <div className="space-y-1">
          {simulationTypes.map((sim) => (
            <button
              key={sim.id}
              onClick={() => toggleSimulationType(sim.id)}
              className={`w-full text-left px-2 py-1 text-xs border rounded-none transition-colors ${
                sim.enabled
                  ? 'bg-accent text-background border-accent'
                  : 'bg-secondary border-border text-foreground hover:bg-muted'
              }`}
            >
              <div className="font-medium">{sim.name}</div>
              <div className="text-xs opacity-75">{sim.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Parameters */}
      <div className="border-b border-border p-3 space-y-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Parameters
        </div>

        <div className="space-y-2">
          <div className="space-y-1">
            <label className="sci-label">Temperature (K)</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="250"
                max="350"
                step="0.1"
                value={parameters.temperature}
                onChange={(e) => handleParameterChange('temperature', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-secondary rounded-none cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-12 text-right font-mono">
                {parameters.temperature.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="sci-label">Pressure (bar)</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.01"
                value={parameters.pressure}
                onChange={(e) => handleParameterChange('pressure', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-secondary rounded-none cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-12 text-right font-mono">
                {parameters.pressure.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="sci-label">Timestep (fs)</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.1"
                value={parameters.timestep}
                onChange={(e) => handleParameterChange('timestep', parseFloat(e.target.value))}
                className="flex-1 h-1 bg-secondary rounded-none cursor-pointer"
              />
              <span className="text-xs text-muted-foreground w-12 text-right font-mono">
                {parameters.timestep.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="sci-label">Duration (ps)</label>
            <input
              type="number"
              value={parameters.duration}
              onChange={(e) => handleParameterChange('duration', parseFloat(e.target.value))}
              className="w-full px-2 py-1 bg-secondary border border-border text-xs text-foreground rounded-none focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="border-b border-border p-3">
        <div className="flex gap-1">
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="btn-compact flex-1 flex items-center justify-center gap-1"
          >
            {isRunning ? (
              <>
                <Pause size={12} />
                Pause
              </>
            ) : (
              <>
                <Play size={12} />
                Start
              </>
            )}
          </button>
          <button className="btn-compact flex-1 flex items-center justify-center gap-1">
            <RotateCcw size={12} />
            Reset
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="border-b border-border px-3 py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Metrics
        </div>
        <div className="flex-1 panel-content space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Simulation Time</span>
            <span className="font-mono text-accent">1,234.5 ps</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Current Temp</span>
            <span className="font-mono">298.2 K</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Energy</span>
            <span className="font-mono">-8,942.3 kcal/mol</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Kinetic Energy</span>
            <span className="font-mono">2,145.7 kcal/mol</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Potential Energy</span>
            <span className="font-mono">-11,088.0 kcal/mol</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">RMSD</span>
            <span className="font-mono">2.34 Å</span>
          </div>
        </div>
      </div>
    </div>
  );
}
