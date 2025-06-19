from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Body
from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Literal
from uuid import uuid4

# PUBLIC_INTERFACE
class StartGameResponse(BaseModel):
    """Response returned when a new game is started."""
    game_id: str = Field(..., description="Unique game session ID")
    board: List[List[Optional[str]]] = Field(..., description="Initial empty board")
    current_player: str = Field(..., description="Current player: X or O")
    status: str = Field(..., description="Game status: in_progress, finished, etc.")

# PUBLIC_INTERFACE
class MoveRequest(BaseModel):
    """Move request: user wants to play a mark at (row, col)."""
    game_id: str = Field(..., description="Game session ID")
    row: int = Field(..., description="Row index (0-2)")
    col: int = Field(..., description="Col index (0-2)")

# PUBLIC_INTERFACE
class MoveResponse(BaseModel):
    """Response after making a move."""
    board: List[List[Optional[str]]] = Field(..., description="Current board")
    current_player: Optional[str] = Field(..., description="Next player, or None if finished")
    status: str = Field(..., description="Game status: in_progress, draw, X_wins, O_wins")
    winner: Optional[str] = Field(None, description="Winner: X or O if game is won, None otherwise")

# PUBLIC_INTERFACE
class GameStateResponse(BaseModel):
    """Game state response for querying current game state."""
    board: List[List[Optional[str]]] = Field(..., description="Current board")
    current_player: Optional[str] = Field(..., description="Next player, or None if finished")
    status: str = Field(..., description="Game status: in_progress, draw, X_wins, O_wins")
    winner: Optional[str] = Field(None, description="Winner: X or O if game is won, None otherwise")

# In-memory "session" store for demo (for production, use a persistent store)
games: Dict[str, Dict] = {}

app = FastAPI(
    title="Tic Tac Toe Backend API",
    description="API backend for Tic Tac Toe game with sessions.",
    version="1.0.0",
    openapi_tags=[
        {"name": "Game", "description": "Core tic tac toe gameplay endpoints"},
    ]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helpers
def create_new_board() -> List[List[Optional[str]]]:
    return [[None, None, None] for _ in range(3)]


def check_winner(board: List[List[Optional[str]]]) -> Optional[str]:
    # Rows, columns, diagonals
    lines = []
    lines.extend(board)  # Rows
    lines.extend([[board[r][i] for r in range(3)] for i in range(3)])  # Columns
    lines.append([board[i][i] for i in range(3)])  # Diagonal
    lines.append([board[i][2 - i] for i in range(3)])  # Reverse diagonal

    for line in lines:
        if line[0] and all(cell == line[0] for cell in line):
            return line[0]  # X or O
    return None


def is_board_full(board: List[List[Optional[str]]]) -> bool:
    return all(all(cell for cell in row) for row in board)

@app.get("/", tags=["Health"])
def health_check():
    """Health check endpoint."""
    return {"message": "Healthy"}

# PUBLIC_INTERFACE
@app.post("/start", response_model=StartGameResponse, tags=["Game"], summary="Start a new game", description="Start a new tic tac toe game session and get initial state.")
def start_game():
    """Start a new game – creates a game session and returns board and initial info."""
    game_id = str(uuid4())
    board = create_new_board()
    games[game_id] = {
        "board": board,
        "current_player": "X",
        "status": "in_progress",
        "winner": None
    }
    return StartGameResponse(
        game_id=game_id,
        board=board,
        current_player="X",
        status="in_progress"
    )

# PUBLIC_INTERFACE
@app.post("/move", response_model=MoveResponse, tags=["Game"], summary="Make a move", description="Submit a move (X or O) for a given session/game ID and board position.")
def make_move(move: MoveRequest = Body(...)):
    """Submit a move (by session/game ID and board position)."""
    game_id = move.game_id
    row, col = move.row, move.col

    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found.")
    game = games[game_id]

    if game["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Game already finished.")

    board = game["board"]
    if not (0 <= row <= 2 and 0 <= col <= 2):
        raise HTTPException(status_code=400, detail="Row and col must be in 0, 1, 2.")

    if board[row][col] is not None:
        raise HTTPException(status_code=400, detail="Cell already taken.")

    board[row][col] = game["current_player"]

    winner = check_winner(board)
    if winner:
        game["status"] = f"{winner}_wins"
        game["winner"] = winner
        game["current_player"] = None
    elif is_board_full(board):
        game["status"] = "draw"
        game["winner"] = None
        game["current_player"] = None
    else:
        game["current_player"] = "O" if game["current_player"] == "X" else "X"

    return MoveResponse(
        board=board,
        current_player=game["current_player"],
        status=game["status"],
        winner=game["winner"]
    )

# PUBLIC_INTERFACE
@app.get("/state/{game_id}", response_model=GameStateResponse, tags=["Game"], summary="Get current game state", description="Retrieve the current state of the game board and status for a session/game ID.")
def get_game_state(game_id: str):
    """Get the state of a given game session/ID."""
    if game_id not in games:
        raise HTTPException(status_code=404, detail="Game not found.")

    game = games[game_id]
    return GameStateResponse(
        board=game["board"],
        current_player=game["current_player"],
        status=game["status"],
        winner=game["winner"]
    )
