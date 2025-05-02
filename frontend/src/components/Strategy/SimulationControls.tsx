interface SimulationControlsProps {
  isRunning: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const SimulationControls = ({ isRunning, onStart, onPause, onReset }: SimulationControlsProps) => {
  return (
    <div className="flex space-x-4">
      {!isRunning ? (
        <button className="button" onClick={onStart}>
          Start
        </button>
      ) : (
        <button className="button" onClick={onPause}>
          Pause
        </button>
      )}
      <button className="button" onClick={onReset}>
        Reset
      </button>
    </div>
  );
}; 