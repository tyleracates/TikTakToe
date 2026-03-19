import { useState, useEffect, useRef } from 'react';
import MainMenu from './components/MainMenu';
import GameBoard from './components/GameBoard';
import HighscorePopup from './components/HighscorePopup';
import VictoryEffect from './components/VictoryEffect';
import ProfileName from './components/ProfileName';
import './App.css';

const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

function App() {
  // State
  const [profileName, setProfileName] = useState(() => localStorage.getItem('profileName') || '');
  const [screenColor, setScreenColor] = useState(() => localStorage.getItem('screenColorV2') || '#000000');
  const [showMenu, setShowMenu] = useState(true);
  const [board, setBoard] = useState(Array(9).fill(''));
  const [isGameOver, setIsGameOver] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [showHighscore, setShowHighscore] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem('difficulty') || 'Medium');
  const [erasingCellIndex, setErasingCellIndex] = useState<number | null>(null);
  const [isCheatSequenceActive, setIsCheatSequenceActive] = useState(false);
  const [showTauntPopup, setShowTauntPopup] = useState(false);
  const [winningLine, setWinningLine] = useState<number[]>([]);
  const [showLaughingEmojis, setShowLaughingEmojis] = useState(false);
  const emojiConfigs = useRef(
    Array.from({ length: 40 }, () => ({
      left: `${(Math.random() * 96).toFixed(1)}%`,
      duration: `${(7 + Math.random() * 8).toFixed(1)}s`,
      delay: `${(Math.random() * 7).toFixed(1)}s`,
    }))
  ).current;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [highscores, setHighscores] = useState<{ name: string; score: number }[]>(() => {
    const scores = localStorage.getItem('highscores');
    return scores ? JSON.parse(scores) : [];
  });
  const [playerWins, setPlayerWins] = useState<number>(() => {
    return parseInt(localStorage.getItem('playerWins') || '0', 10);
  });

  // Effects
  useEffect(() => {
    localStorage.setItem('profileName', profileName);
  }, [profileName]);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
  useEffect(() => {
    localStorage.setItem('difficulty', difficulty);
  }, [difficulty]);
  useEffect(() => {
    localStorage.setItem('screenColorV2', screenColor);
    document.body.style.backgroundColor = screenColor;
  }, [screenColor]);
  useEffect(() => {
    localStorage.setItem('highscores', JSON.stringify(highscores));
  }, [highscores]);
  useEffect(() => {
    localStorage.setItem('playerWins', String(playerWins));
  }, [playerWins]);

  // Game logic
  const checkWinnerInfo = (b: string[]) => {
    for (const [a, bIdx, c] of WIN_LINES) {
      if (b[a] && b[a] === b[bIdx] && b[a] === b[c]) {
        return { winner: b[a] as 'X' | 'O', line: [a, bIdx, c] };
      }
    }
    return null;
  };

  const findWinningMove = (b: string[], player: 'X' | 'O') => {
    for (let i = 0; i < b.length; i += 1) {
      if (b[i]) continue;
      const testBoard = [...b];
      testBoard[i] = player;
      if (checkWinnerInfo(testBoard)?.winner === player) {
        return i;
      }
    }
    return null;
  };

  const findForkMoves = (b: string[], player: 'X' | 'O') => {
    const forks: number[] = [];
    for (let i = 0; i < b.length; i += 1) {
      if (b[i]) continue;
      const testBoard = [...b];
      testBoard[i] = player;

      let winningResponses = 0;
      for (let j = 0; j < testBoard.length; j += 1) {
        if (testBoard[j]) continue;
        const secondBoard = [...testBoard];
        secondBoard[j] = player;
        if (checkWinnerInfo(secondBoard)?.winner === player) {
          winningResponses += 1;
        }
      }

      if (winningResponses >= 2) {
        forks.push(i);
      }
    }
    return forks;
  };

  const chooseAggressiveBotMove = (b: string[]) => {
    const winningMove = findWinningMove(b, 'O');
    if (winningMove !== null) return winningMove;

    const blockMove = findWinningMove(b, 'X');
    if (blockMove !== null) return blockMove;

    const botForks = findForkMoves(b, 'O');
    if (botForks.length > 0) return botForks[0];

    const playerForks = findForkMoves(b, 'X');
    if (playerForks.length === 1) return playerForks[0];
    if (playerForks.length > 1 && !b[4]) return 4;

    if (!b[4]) return 4;

    const oppositeCorners: Array<[number, number]> = [[0, 8], [8, 0], [2, 6], [6, 2]];
    for (const [playerCorner, botCorner] of oppositeCorners) {
      if (b[playerCorner] === 'X' && !b[botCorner]) return botCorner;
    }

    const corners = [0, 2, 6, 8];
    for (const corner of corners) {
      if (!b[corner]) return corner;
    }

    const sides = [1, 3, 5, 7];
    for (const side of sides) {
      if (!b[side]) return side;
    }

    return b.findIndex(cell => !cell);
  };

  const findDrawCheatCell = (b: string[]) => {
    for (let i = 0; i < b.length; i += 1) {
      if (b[i] !== 'X') continue;
      const cheatedBoard = [...b];
      cheatedBoard[i] = 'O';
      if (checkWinnerInfo(cheatedBoard)?.winner === 'O') {
        return i;
      }
    }

    return b.findIndex(cell => cell === 'X');
  };

  const startCheatTakeover = (cellIndex: number) => {
    if (cellIndex < 0) {
      setWinner('O');
      setIsGameOver(true);
      setShowLaughingEmojis(true);
      setHighscores(prev => [...prev, { name: profileName || 'Player', score: 1 }]);
      return;
    }

    setIsCheatSequenceActive(true);
    setErasingCellIndex(cellIndex);
    setShowTauntPopup(true);

    // Update board to O at 80% of animation so it can fade in
    window.setTimeout(() => {
      setBoard(prevBoard => {
        const cheatedBoard = [...prevBoard];
        cheatedBoard[cellIndex] = 'O';
        return cheatedBoard;
      });
    }, 6400);

    window.setTimeout(() => {
      setBoard(prevBoard => {
        const finalBoard = [...prevBoard];
        const winInfo = checkWinnerInfo(finalBoard);
        if (winInfo) setWinningLine(winInfo.line);
        return finalBoard;
      });
      setErasingCellIndex(null);
      setWinner('O');
      setIsGameOver(true);
      setIsCheatSequenceActive(false);
      setShowTauntPopup(false);
      setShowLaughingEmojis(true);
      setHighscores(prev => [...prev, { name: profileName || 'Player', score: 1 }]);
    }, 8000);
  };

  const applyMove = (idx: number, player: 'X' | 'O') => {
    if (board[idx] || isGameOver) return;

    const newBoard = [...board];
    newBoard[idx] = player;
    setBoard(newBoard);

    const winInfo = checkWinnerInfo(newBoard);
    if (winInfo?.winner === 'X') {
      const cheatedCell = winInfo.line.find(cellIndex => newBoard[cellIndex] === 'X') ?? winInfo.line[0];
      startCheatTakeover(cheatedCell);
      return;
    }

    if (winInfo?.winner === 'O') {
      setWinningLine(winInfo.line);
      setWinner('O');
      setIsGameOver(true);
      setShowLaughingEmojis(true);
      setHighscores(prev => [...prev, { name: profileName || 'Player', score: 1 }]);
    } else if (newBoard.every(cell => cell)) {
      const drawCheatCell = findDrawCheatCell(newBoard);
      startCheatTakeover(drawCheatCell);
    }
  };

  const handleCellClick = (idx: number) => {
    if (board[idx] || isGameOver || isCheatSequenceActive) return;

    const isPlayerTurn = board.filter(cell => cell).length % 2 === 0;
    if (!isPlayerTurn) return;

    applyMove(idx, 'X');
  };

  useEffect(() => {
    if (showMenu || isGameOver || isCheatSequenceActive) return;

    const filledCount = board.filter(cell => cell).length;
    const isBotTurn = filledCount % 2 === 1;
    if (!isBotTurn) return;

    const openCells = board
      .map((cell, index) => (cell ? -1 : index))
      .filter(index => index !== -1);
    if (openCells.length === 0) return;

    const timeoutId = window.setTimeout(() => {
      const strategicMove = chooseAggressiveBotMove(board);
      if (strategicMove >= 0) {
        applyMove(strategicMove, 'O');
      }
    }, 450);

    return () => window.clearTimeout(timeoutId);
  }, [board, isGameOver, isCheatSequenceActive, showMenu]);

  const handleStartGame = () => {
    setShowMenu(false);
    setBoard(Array(9).fill(''));
    setIsGameOver(false);
    setWinner(null);
    setWinningLine([]);
    setShowLaughingEmojis(false);
    setErasingCellIndex(null);
    setIsCheatSequenceActive(false);
    setShowTauntPopup(false);
  };

  const handlePlayAgain = () => {
    setBoard(Array(9).fill(''));
    setIsGameOver(false);
    setWinner(null);
    setWinningLine([]);
    setShowLaughingEmojis(false);
    setErasingCellIndex(null);
    setIsCheatSequenceActive(false);
    setShowTauntPopup(false);
  };

  const handleShowHighscore = () => setShowHighscore(true);
  const handleCloseHighscore = () => setShowHighscore(false);

  return (
    <div>
      {showMenu ? (
        <MainMenu
          onStartGame={handleStartGame}
          profileName={profileName}
          setProfileName={setProfileName}
          screenColor={screenColor}
          setScreenColor={setScreenColor}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
        />
      ) : (
        <div className="game-screen">
          <header
            className="top-bar"
            style={{ borderBottom: `2px solid ${screenColor === '#000000' ? '#ffffff' : '#000000'}` }}
          >
            <span className="game-title">Tik-Tak-Toe</span>
            <div className="menu-dropdown" ref={dropdownRef}>
              <button
                className="menu-toggle"
                onClick={() => setShowDropdown(v => !v)}
                aria-haspopup="true"
                aria-expanded={showDropdown}
                aria-label="Open menu"
              >
                <span className="hamburger-bar" />
                <span className="hamburger-bar" />
                <span className="hamburger-bar" />
              </button>
              {showDropdown && (
                <ul className="dropdown-list" role="menu">
                  <li role="menuitem">
                    <button onClick={() => { setShowDropdown(false); setShowMenu(true); }}>
                      🏠 Main Menu
                    </button>
                  </li>
                  <li role="menuitem">
                    <button onClick={() => { setShowDropdown(false); handleShowHighscore(); }}>
                      🏆 Highscores
                    </button>
                  </li>
                </ul>
              )}
            </div>
          </header>
          <div className="game-controls">
          </div>
          {!isGameOver && (
            <div className="turn-indicator">
              {board.filter(c => c).length % 2 === 0 ? (profileName.trim() || 'X') : 'O'}'s turn
            </div>
          )}
          <div className="board-shell">
            <div className="side-scoreboard side-scoreboard-left" aria-label="Player losses scoreboard">
              <div className="scoreboard-name-label" style={{ color: '#fff' }}>{profileName.trim() || 'Player'}</div>
              <div className="scoreboard-title">Your Losses:</div>
              <div className="scoreboard-count">{highscores.length}</div>
              <div className="scoreboard-subtext">LOL, literal cannon-fodder</div>
            </div>
            <GameBoard
              board={board}
              onCellClick={handleCellClick}
              isGameOver={isGameOver}
              isBoardLocked={isCheatSequenceActive}
              erasingCellIndex={erasingCellIndex}
              winningLine={winningLine}
            />
            <div className="side-scoreboard side-scoreboard-right" aria-label="Bot wins scoreboard">
              <div className="scoreboard-name-label" style={{ color: '#fff' }}>👑 Bot 👑</div>
              <div className="scoreboard-title">His Wins:</div>
              <div className="scoreboard-count">999+</div>
              <div className="scoreboard-subtext">It's a bloodbath</div>
            </div>
          </div>
          {winner && <VictoryEffect winner={winner} />}
          {isGameOver && !winner && (
            <div className="status-message draw">It's a draw!</div>
          )}
          {showTauntPopup && (
            <>
              <div className="taunt-lane taunt-lane-left">
                <div className="taunt-popup taunt-popup-left">👀 Nothing to see here.... 👀👀👀</div>
              </div>
              <div className="taunt-lane taunt-lane-right">
                <div className="taunt-popup taunt-popup-right">Experiencing...uh, technical difficulties? Er, whatever...</div>
              </div>
            </>
          )}
          {showLaughingEmojis && (
            <div className="emoji-rain" aria-hidden="true">
              {emojiConfigs.map((cfg, i) => (
                <span
                  key={i}
                  style={{
                    '--fall-left': cfg.left,
                    '--fall-duration': cfg.duration,
                    '--fall-delay': cfg.delay,
                  } as React.CSSProperties}
                >
                  😂
                </span>
              ))}
            </div>
          )}
          <div className="game-actions">
            {isGameOver && (
              <button onClick={handlePlayAgain}>Play Again?</button>
            )}
          </div>
          {showHighscore && (
            <HighscorePopup playerWins={playerWins} profileName={profileName} onClose={handleCloseHighscore} />
          )}
        </div>
      )}
    </div>
  );
}

export default App
