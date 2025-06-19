import React, { useEffect, useState } from "react";
import "./App.css";

/*
  PUBLIC_INTERFACE
  BACKEND_BASE_URL is the base URL for the backend API.
  For frontend web applications, use import.meta.env for Vite or process.env.REACT_APP_* for Create React App,
  but reference 'process' directly in browser code causes runtime ReferenceError unless build tooling replaces it.
  Here, to avoid issues, use a globally available variable if set (REACT_APP_BACKEND_URL) or fallback to localhost.
  Replace process.env usage with frontend-safe access. If you use Create React App, process.env.REACT_APP_... is replaced at build time,
  so you may reference it directly in code, e.g., process.env.REACT_APP_BACKEND_URL, but never access 'process' itself.
  For maximal compatibility, check typeof for safety (avoiding 'process is not defined'), or use static value.
  For Vite, use import.meta.env.VITE_BACKEND_URL, but our template appears to use Create React App conventions.
*/
const BACKEND_BASE_URL =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_BACKEND_URL) ||
  window.REACT_APP_BACKEND_URL ||
  "http://localhost:8000";

// Colors (from requirements)
const COLOR_PRIMARY = "#2196f3";
const COLOR_SECONDARY = "#f44336";
const COLOR_ACCENT = "#4caf50";
const COLOR_BG = "#ffffff";

// Helper for cell rendering
const Cell = ({ value, onClick, disabled }) => (
  <button
    className="ttt-cell"
    style={{
      color: value === "X" ? COLOR_PRIMARY : value === "O" ? COLOR_SECONDARY : "#888",
      cursor: disabled ? "not-allowed" : "pointer",
      background: "#fff"
    }}
    onClick={onClick}
    disabled={disabled}
    aria-label={value ? `Cell ${value}` : "Empty cell"}
  >
    {value}
  </button>
);

function App() {
  const [gameId, setGameId] = useState(null);
  const [board, setBoard] = useState([
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ]);
  const [status, setStatus] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [winner, setWinner] = useState(null);
  const [error, setError] = useState("");

  // Start game
  const startGame = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/start`, { method: "POST" });
      const data = await res.json();
      setGameId(data.game_id);
      setBoard(data.board);
      setStatus(data.status);
      setCurrentPlayer(data.current_player);
      setWinner(null);
    } catch (e) {
      setError("Failed to start game. Backend unavailable?");
    }
    setIsLoading(false);
  };

  // Make move
  const handleCellClick = async (row, col) => {
    if (isLoading || !gameId) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`${BACKEND_BASE_URL}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: gameId, row, col }),
      });
      const data = await res.json();
      if (res.status !== 200) {
        setError(data.detail || "Illegal move.");
        setIsLoading(false);
        return;
      }
      setBoard(data.board);
      setStatus(data.status);
      setCurrentPlayer(data.current_player);
      setWinner(data.winner);
    } catch (e) {
      setError("Failed to send move.");
    }
    setIsLoading(false);
  };

  // On first load, start game
  useEffect(() => {
    startGame();
    // eslint-disable-next-line
  }, []);

  // For restarting
  const handleRestart = () => {
    startGame();
  };

  // Status message/reporting
  let statusMsg = "";
  if (status === "in_progress") {
    statusMsg = `Next player: ${currentPlayer}`;
  } else if (status === "draw") {
    statusMsg = `Game over: Draw!`;
  } else if (winner) {
    statusMsg = `Game over: ${winner} wins!`;
  }

  return (
    <div
      className="app"
      style={{ background: COLOR_BG, minHeight: "100vh", color: "#222" }}
    >
      <nav className="navbar" style={{ background: COLOR_PRIMARY }}>
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              width: "100%",
              alignItems: "center",
            }}
          >
            <div className="logo" style={{ color: "#fff" }}>
              <span className="logo-symbol" style={{ color: COLOR_ACCENT }}>
                #
              </span>{" "}
              Tic Tac Toe
            </div>
            <button
              className="btn"
              style={{
                background: COLOR_SECONDARY,
                color: "#fff",
                fontWeight: 600,
              }}
              onClick={handleRestart}
              disabled={isLoading}
              title="Restart game"
            >
              Restart
            </button>
          </div>
        </div>
      </nav>

      <main>
        <div
          className="container"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "calc(100vh - 70px)",
            marginTop: "80px",
          }}
        >
          <div
            className="status"
            style={{
              marginBottom: "20px",
              fontSize: "1.3rem",
              fontWeight: 600,
              color: COLOR_ACCENT,
              textAlign: "center",
            }}
            data-testid="status"
          >
            {statusMsg}
          </div>
          <div
            className="ttt-board"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 60px)",
              gridTemplateRows: "repeat(3, 60px)",
              gap: "8px",
              background: "#e0e0e0",
              borderRadius: "12px",
              boxShadow: "0 2px 16px rgba(100,100,100,0.08)",
              marginBottom: "24px",
              padding: "24px",
            }}
          >
            {(Array.isArray(board) ? board : []).map((row, rIdx) =>
              Array.isArray(row)
                ? row.map((val, cIdx) => (
                    <Cell
                      key={`${rIdx}-${cIdx}`}
                      value={val || ""}
                      onClick={() =>
                        !val &&
                        status === "in_progress" &&
                        !isLoading &&
                        handleCellClick(rIdx, cIdx)
                      }
                      disabled={
                        !!val || status !== "in_progress" || isLoading
                      }
                    />
                  ))
                : null
            )}
          </div>
          {error && (
            <div
              style={{
                color: COLOR_SECONDARY,
                marginBottom: "16px",
                fontWeight: 500,
              }}
              data-testid="error-msg"
            >
              {error}
            </div>
          )}
          {status !== "in_progress" && (
            <button
              onClick={handleRestart}
              className="btn btn-large"
              style={{
                background: COLOR_PRIMARY,
                color: "#fff",
                marginTop: "10px",
                fontSize: "1.08rem",
              }}
              disabled={isLoading}
            >
              Play Again
            </button>
          )}

          <div style={{ marginTop: "32px", color: "#aaa", fontSize: "0.85rem" }}>
            <span role="img" aria-label="react">
              ⚛️
            </span>{" "}
            Made with React & FastAPI
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
