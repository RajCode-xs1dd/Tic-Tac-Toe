document.addEventListener('DOMContentLoaded', () => {

    /* ===== EXISTING VARIABLES ===== */
    const tiles = document.querySelectorAll('.tile');
    const announcer = document.querySelector('.announcer');
    const resetBtn = document.getElementById('reset');

    const xScoreEl = document.getElementById('xScore');
    const oScoreEl = document.getElementById('oScore');
    const drawScoreEl = document.getElementById('drawScore');

    const modeInputs = document.querySelectorAll('input[name="mode"]');

    let board = ["", "", "", "", "", "", "", "", ""];
    let currentPlayer = "X";
    let isGameActive = true;
    let gameMode = "HUMAN";

    let xScore = 0, oScore = 0, drawScore = 0;

    /* ===== WIN CONDITIONS ===== */
    const winConditions = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    /* ===== AI MEMORY (LEARNING) ===== */
    let aiMemory = JSON.parse(localStorage.getItem("aiMemory")) || {};

    // 🔼 ADDED: Track AI decisions per round
    let aiMoveHistory = [];

    function rememberMove(state, index, reward) {
        if (!aiMemory[state]) aiMemory[state] = {};
        aiMemory[state][index] = (aiMemory[state][index] || 0) + reward;
        localStorage.setItem("aiMemory", JSON.stringify(aiMemory));
    }

    // 🔼 ADDED: Memory-aware move selection
    function chooseBestMove(candidates, state) {
        if (!aiMemory[state]) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }

        let scored = candidates.map(i => ({
            index: i,
            score: aiMemory[state][i] ?? 0
        }));

        scored.sort((a, b) => b.score - a.score);

        // If best move is known bad, avoid it
        if (scored[0].score < 0 && scored.length > 1) {
            return scored[1].index;
        }

        return scored[0].index;
    }

    function checkWinner(player) {
        return winConditions.some(c =>
            c.every(i => board[i] === player)
        );
    }

    /* ===== SMART + LEARNING AI ===== */
    function aiMove() {
        if (!isGameActive) return;

        let state = board.join("");

        // 1️⃣ Try to win
        for (let i = 0; i < 9; i++) {
            if (board[i] === "") {
                board[i] = "O";
                if (checkWinner("O")) {
                    board[i] = "";
                    return placeMove(i, "O");
                }
                board[i] = "";
            }
        }

        // 2️⃣ Block opponent
        for (let i = 0; i < 9; i++) {
            if (board[i] === "") {
                board[i] = "X";
                if (checkWinner("X")) {
                    board[i] = "";
                    return placeMove(i, "O");
                }
                board[i] = "";
            }
        }

        // 3️⃣ Center
        if (board[4] === "") return placeMove(4, "O");

        // 4️⃣ Corners (learning-based)
        const corners = [0, 2, 6, 8].filter(i => board[i] === "");
        if (corners.length) {
            return placeMove(chooseBestMove(corners, state), "O");
        }

        // 5️⃣ Edges (learning-based)
        const edges = [1, 3, 5, 7].filter(i => board[i] === "");
        if (edges.length) {
            return placeMove(chooseBestMove(edges, state), "O");
        }
    }

    function placeMove(index, player) {

        // 🔼 ADDED: Record AI decision BEFORE move
        if (player === "O" && gameMode === "AI") {
            aiMoveHistory.push({
                state: board.join(""),
                move: index
            });
        }

        board[index] = player;
        tiles[index].textContent = player;
        tiles[index].classList.add(player);
        handleResult(player);
    }

    function handleResult(player) {

        if (checkWinner(player)) {
            announcer.textContent = `${player} Wins 🎉`;
            announcer.classList.remove('hide');
            player === "X" ? xScore++ : oScore++;
            updateScore();
            isGameActive = false;

            // 🔼 ADDED: AI learning feedback
            if (gameMode === "AI") {
                aiMoveHistory.forEach(entry => {
                    rememberMove(
                        entry.state,
                        entry.move,
                        player === "O" ? 3 : -5
                    );
                });
                aiMoveHistory = [];
            }
            return;
        }

        if (!board.includes("")) {
            announcer.textContent = "Draw 😐";
            announcer.classList.remove('hide');
            drawScore++;
            updateScore();
            isGameActive = false;

            // Penalize draw slightly
            if (gameMode === "AI") {
                aiMoveHistory.forEach(entry => {
                    rememberMove(entry.state, entry.move, -1);
                });
                aiMoveHistory = [];
            }
        }
    }

    function updateScore() {
        xScoreEl.textContent = xScore;
        oScoreEl.textContent = oScore;
        drawScoreEl.textContent = drawScore;
    }

    function handleClick(e) {
        const index = e.target.dataset.index;
        if (board[index] !== "" || !isGameActive) return;

        placeMove(index, currentPlayer);
        currentPlayer = currentPlayer === "X" ? "O" : "X";

        if (gameMode === "AI" && currentPlayer === "O" && isGameActive) {
            setTimeout(aiMove, 350);
            currentPlayer = "X";
        }
    }

    function resetGame() {
        board = ["", "", "", "", "", "", "", "", ""];
        currentPlayer = "X";
        isGameActive = true;
        announcer.textContent = "";
        announcer.classList.add('hide');
        aiMoveHistory = [];

        tiles.forEach(t => {
            t.textContent = "";
            t.classList.remove("X", "O", "win");
        });
    }

    modeInputs.forEach(radio => {
        radio.addEventListener("change", e => {
            gameMode = e.target.value;
            resetGame();
        });
    });

    tiles.forEach(tile => tile.addEventListener('click', handleClick));
    resetBtn.addEventListener('click', resetGame);

});
