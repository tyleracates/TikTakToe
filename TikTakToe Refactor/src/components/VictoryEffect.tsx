import React from 'react';

interface VictoryEffectProps {
  winner: string;
}

const VictoryEffect: React.FC<VictoryEffectProps> = ({ winner }) => {
  void winner;
  return (
    <div className="victory-effect">
      <span className="animated">The Bot Wins! Who Woulda' Thought!</span>
    </div>
  );
};

export default VictoryEffect;
