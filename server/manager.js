class Manager {
    constructor(id, roomType='') {
        this.id = id;
        this.roomType = roomType;
        this.handlers = {};
        this.activeTokens = new Set();
    }

    isTokenRegistered(token) {
        return this.playerTokens.keys.includes(token);
    }

    calculateWinner(board) {
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
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        if(!board.includes(null)) {
            return 'T';
        }
        return null;
    }
    
    forceAllClientsUpdate() {
        for (let t in this.handlers) this.handlers[t].forceUpdate();
    }
}
module.exports = Manager;