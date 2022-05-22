export const getWonBoards = (boards) => {
    const wonBoards = Array(9).fill(null);
    for (let i = 0; i < boards.length; i++) {
        const board = boards[i].slice();
        const winner = calculateWinner(board);
        if (winner) {
            wonBoards[i] = winner;
        }
    }
    return wonBoards;
}

export const calculateWinner = (board) => {
    const lines = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6],
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (board[a] && board[a] === board[b] && board[a] === board[c] && board[a] !== 'T') {
            return [a, b, c];
        }
    }
    return null;
}

export const calculateTie = (boards, wonBoards) => {
    if(!wonBoards.includes(null)) return true;
    for (let i in boards) {
        console.log(boards[i]);
        if(boards[i].includes(null))
            return false;
    }
    return true;
}