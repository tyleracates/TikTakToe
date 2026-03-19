import React from 'react';

interface GameBoardProps {
  board: string[];
  onCellClick: (index: number) => void;
  isGameOver: boolean;
  isBoardLocked: boolean;
  erasingCellIndex: number | null;
  winningLine: number[];
}

const GameBoard: React.FC<GameBoardProps> = ({
  board,
  onCellClick,
  isGameOver,
  isBoardLocked,
  erasingCellIndex,
  winningLine,
}) => {
  return (
    <div className="game-board">
      {board.map((cell, idx) => (
        <button
          key={idx}
          className={`cell ${cell} ${erasingCellIndex === idx ? 'erasing' : ''} ${winningLine.includes(idx) ? 'winning-cell' : ''}`}
          onClick={() => onCellClick(idx)}
          disabled={!!cell || isGameOver || isBoardLocked}
        >
          {cell}
        </button>
      ))}
    </div>
  );
};

export default GameBoard;
