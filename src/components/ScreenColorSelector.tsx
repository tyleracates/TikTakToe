import React from 'react';

interface ScreenColorSelectorProps {
  screenColor: string;
  setScreenColor: (color: string) => void;
}

const ScreenColorSelector: React.FC<ScreenColorSelectorProps> = ({ screenColor, setScreenColor }) => {
  return (
    <div className="screen-color-selector">
      <label>Screen Color:</label>
      <input
        type="color"
        value={screenColor}
        onChange={e => setScreenColor(e.target.value)}
      />
    </div>
  );
};

export default ScreenColorSelector;
