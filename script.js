document.addEventListener("DOMContentLoaded", () => {

    /* ======================================================
       DOM ELEMENTS
    ====================================================== */
    const tiles = document.querySelectorAll(".tile");
    const announcer = document.querySelector(".announcer");
    const resetBtn = document.getElementById("reset");
    const infoBtn = document.getElementById("infoBtn");

    const xScoreEl = document.getElementById("xScore");
    const oScoreEl = document.getElementById("oScore");
    const drawScoreEl = document.getElementById("drawScore");

    const aiBtn = document.getElementById("aiModeBtn");
    const humanBtn = document.getElementById("humanModeBtn");

    /* ======================================================
       GAME STATE
    ====================================================== */
    let board = ["","","","","","","","",""];
    let isGameActive = true;
    let gameMode = "AI";          // default
    let currentPlayer = "X";      // for friend mode

    let xScore = 0, oScore = 0, drawScore = 0;

    /* ======================================================
       WIN CONDITIONS
    ====================================================== */
    const winConditions = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    /* ======================================================
       AI MEMORY (HARD-BAN LEARNING)
    ====================================================== */
    let aiMemory = JSON.parse(localStorage.getItem("aiMemory")) || {};
    let aiMoveHistory = [];

    function banMove(state, move) {
        if (!aiMemory[state]) aiMemory[state] = {};
        aiMemory[state][move] = -Infinity;
        localStorage.setItem("aiMemory", JSON.stringify(aiMemory));
    }

    function rewardMove(state, move, value) {
        if (!aiMemory[state]) aiMemory[state] = {};
        aiMemory[state][move] = (aiMemory[state][move] || 0) + value;
        localStorage.setItem("aiMemory", JSON.stringify(aiMemory));
    }

    function isBanned(state, move) {
        return aiMemory[state] && aiMemory[state][move] === -Infinity;
    }

    /* ======================================================
       HELPERS
    ====================================================== */
    function checkWinner(player, b = board) {
        return winConditions.some(c => c.every(i => b[i] === player));
    }

    function emptyCells(b = board) {
        return b.map((v,i) => v === "" ? i : null).filter(v => v !== null);
    }

    /* ======================================================
       MINIMAX (PERFECT AI)
    ====================================================== */
    function minimax(b, depth, isMax) {
        if (checkWinner("O", b)) return 10 - depth;
        if (checkWinner("X", b)) return depth - 10;
        if (!b.includes("")) return 0;

        if (isMax) {
            let best = -Infinity;
            for (let i of emptyCells(b)) {
                b[i] = "O";
                best = Math.max(best, minimax(b, depth + 1, false));
                b[i] = "";
            }
            return best;
        } else {
            let best = Infinity;
            for (let i of emptyCells(b)) {
                b[i] = "X";
                best = Math.min(best, minimax(b, depth + 1, true));
                b[i] = "";
            }
            return best;
        }
    }

    function scoreAfterMove(move) {
        board[move] = "O";
        const score = minimax(board, 0, false);
        board[move] = "";
        return score;
    }

    /* ======================================================
       AI MOVE (UNBEATABLE)
    ====================================================== */
    function aiMove() {
        if (!isGameActive) return;

        const state = board.join("");
        const empty = emptyCells();

        // Win
        for (let i of empty) {
            board[i] = "O";
            if (checkWinner("O")) {
                board[i] = "";
                return placeMove(i, "O");
            }
            board[i] = "";
        }

        // Block
        for (let i of empty) {
            board[i] = "X";
            if (checkWinner("X")) {
                board[i] = "";
                return placeMove(i, "O");
            }
            board[i] = "";
        }

        // Best safe move
        const candidates = empty
            .filter(i => !isBanned(state, i))
            .map(i => ({ move: i, score: scoreAfterMove(i) }))
            .sort((a,b) => b.score - a.score);

        for (let c of candidates) {
            if (c.score >= 0) return placeMove(c.move, "O");
        }

        placeMove(candidates[0].move, "O");
    }

    /* ======================================================
       MOVE / RESULT HANDLING
    ====================================================== */
    function placeMove(index, player) {
        if (player === "O" && gameMode === "AI") {
            aiMoveHistory.push({ state: board.join(""), move: index });
        }

        board[index] = player;
        tiles[index].textContent = player;
        tiles[index].classList.add(player);
        handleResult(player);
    }

    function handleResult(player) {
        if (checkWinner(player)) {
            announcer.textContent = `${player} Wins 🎉`;
            announcer.classList.remove("hide");
            player === "X" ? xScore++ : oScore++;
            updateScore();
            isGameActive = false;

            if (gameMode === "AI") {
                aiMoveHistory.forEach(e => {
                    player === "X"
                        ? banMove(e.state, e.move)
                        : rewardMove(e.state, e.move, 1);
                });
                aiMoveHistory = [];
            }
            return;
        }

        if (!board.includes("")) {
            announcer.textContent = "Draw 😐";
            announcer.classList.remove("hide");
            drawScore++;
            updateScore();
            isGameActive = false;
            aiMoveHistory = [];
        }
    }

    function updateScore() {
        xScoreEl.textContent = xScore;
        oScoreEl.textContent = oScore;
        drawScoreEl.textContent = drawScore;
    }

    /* ======================================================
       USER INTERACTION
    ====================================================== */
    function handleClick(e) {
        const index = e.target.dataset.index;
        if (!isGameActive || board[index] !== "") return;

        placeMove(index, currentPlayer);

        if (gameMode === "HUMAN") {
            currentPlayer = currentPlayer === "X" ? "O" : "X";
            return;
        }

        if (gameMode === "AI" && isGameActive) {
            setTimeout(aiMove, 300);
        }
    }

    function resetGame() {
        board = ["","","","","","","","",""];
        isGameActive = true;
        currentPlayer = "X";
        announcer.textContent = "";
        announcer.classList.add("hide");
        aiMoveHistory = [];

        tiles.forEach(t => {
            t.textContent = "";
            t.classList.remove("X","O","win");
        });
    }

    /* ======================================================
       INFO BUTTON (OPTIONAL)
    ====================================================== */
    infoBtn?.addEventListener("click", () => {
        alert(
            "🧠 About the AI\n\n" +
            "• Plays perfect Tic Tac Toe\n" +
            "• Learns from defeats\n" +
            "• Never repeats losing moves\n\n" +
            "Try to beat it 😉"
        );
    });

    /* ======================================================
       MODE BUTTONS
    ====================================================== */
    aiBtn.addEventListener("click", () => {
        gameMode = "AI";
        aiBtn.classList.add("active");
        humanBtn.classList.remove("active");
        resetGame();
    });

    humanBtn.addEventListener("click", () => {
        gameMode = "HUMAN";
        humanBtn.classList.add("active");
        aiBtn.classList.remove("active");
        resetGame();
    });

    /* ======================================================
       INIT
    ====================================================== */
    tiles.forEach(tile => tile.addEventListener("click", handleClick));
    resetBtn.addEventListener("click", resetGame);

});