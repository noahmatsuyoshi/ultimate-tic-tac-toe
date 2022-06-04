const globalConstants = require('./constants');
const SocketHandler = require('./socket');
const Manager = require('./manager');
const {initHandler} = require('./registerHandlers');

class RoomHandler extends SocketHandler {
    constructor(socket, manager, id, token) {
        super(socket, manager, id, token);
        this.setupEventCallbacks = [
            this.setupNewMoveEvent.bind(this),
            this.setupUpdateEvent.bind(this),
            this.setupRestartGameEvent.bind(this),
            this.setupSetAvatarEvent.bind(this),
            this.setupRpsMoveEvent.bind(this),
        ];
        this.setupEvents();
    }

    setupNewMoveEvent() {
        this.socket.on(globalConstants.eventTypes.NEW_MOVE_EVENT, (move) => {
            if(!this.manager.isTokenRegistered(this.token)) return;
            if(!globalConstants.validate('roomNewMove', move)) return;
            this.manager.newMove(move, this.token);
            this.manager.forceAllClientsUpdate();
        });
    }

    setupUpdateEvent() {
        this.socket.on(globalConstants.eventTypes.UPDATE_EVENT, () => {
            if(this.manager.playerTokens.keys.length >= 2) {
                const data = this.manager.getClientData(this.token);
                this.socket.emit(globalConstants.eventTypes.UPDATE_EVENT, data);
            }
        });
    }

    setupRestartGameEvent() {
        this.socket.on(globalConstants.eventTypes.RESTART_GAME_EVENT, () => {
            if(!this.manager.isTokenRegistered(this.token)) return;
            if(!this.manager.isGameOver()) return;
            this.manager.resetGame();
            this.manager.forceAllClientsUpdate();
        });
    }

    setupSetAvatarEvent() {
        this.socket.on(globalConstants.eventTypes.SET_AVATAR_EVENT, (data) => {
            if(!this.manager.isTokenRegistered(this.token)) return;
            if(!globalConstants.validate('roomSetAvatar', data)) return;;
            if(this.token !== this.manager.firstPlayer) return;
            this.manager.setAvatar(data, this.token);
            this.manager.forceAllClientsUpdate();
        })
    }

    setupRpsMoveEvent() {
        this.socket.on(globalConstants.eventTypes.RPS_MOVE_EVENT, (data) => {
            if(!this.manager.rpsMoves) return;
            this.manager.rpsMoves[this.token] = data.move;
            this.manager.computeRps();
        })
    }
}

class RoomManager extends Manager {
    constructor(id, dynamoHelper, token1, tourData=null, oldState=null) {
        super(id);
        if(tourData) this.tourData = tourData;
        this.type = 'r';
        this.dynamoHelper = dynamoHelper;
        this.rpsMoves = null;
        this.rpsWinnerToken = null;
        this.playerTokens = new globalConstants.TwoWayMap();
        this.playerTokens.set(token1, "");
        this.firstPlayer = token1;
        this.room = new Room(this);
        if(oldState) {
            for(let k in oldState) {
                if(['rpsMoves', 'playerTokens', 'firstPlayer'].includes(k)) {
                    this[k] = oldState[k];
                } else {
                    this.room[k] = oldState[k];
                }
            }
        } else {
            this.dynamoHelper.updateGame(id, {
                "firstPlayer": this.firstPlayer,
                "dateCreated": Date.now().toString(),
            });
        }
    }

    addToken(token, socket) {
        if(this.playerTokens.hasKey(token)) return;
        if(this.playerTokens.keys.length >= 2) {
            console.log("Room full: " + this.playerTokens.keys);
            socket.emit(globalConstants.eventTypes.ERROR_EVENT, {errorMessage: globalConstants.errorMessages.ROOM_FULL});
        } else {
            this.playerTokens.set(token, "");
            if(this.playerTokens.keys.length === 2) {
                this.forceAllClientsUpdate();
            }
            this.dynamoHelper.updateGame(this.id, {"playerTokens": JSON.stringify(this.playerTokens.map)});
        }
    }

    initRoom() {
        const room = this.room;
        if(!('boards' in room)) room.resetGame();
    }

    isGameOver() {
        const winner = this.calculateWinner(this.room.wonBoards);
        if(winner) {
            this.dynamoHelper.updateGame(this.id, {
                "winnerToken": winner,
                [`boards_${this.gameCount}`]: winner,
            });
        }
        return winner !== null;
    }

    newMove(move, token) {
        this.room.newMove(move, token);
        this.dynamoHelper.updateGame(this.id, {
            "boards": JSON.stringify(this.room.boards),
            "wonBoards": JSON.stringify(this.room.wonBoards),
            "nextIndex": this.room.nextIndex.toString(),
            "xNext": this.room.xNext,
        });
    }

    resetGame() {
        for (let t in this.playerTokens.keys) {
            if(t !== this.firstPlayer)
                this.firstPlayer = t;
            this.playerTokens[t] = "";
        }
        this.room.resetGame();
    }

    getOtherToken(token) {
        for (let t in this.playerTokens.map) {
            if(t !== token) return t;
        }
    }

    fillRPSData(data, token) {
        data.rps = {
            active: !(token in this.rpsMoves),
            on: true,
            winner: this.rpsWinnerToken ? this.rpsWinnerToken === token : null,
            tie: this.rpsTie,
        };
        if(token in this.rpsMoves) {
            data.rps.move = this.rpsMoves[token];
        }
        const otherToken = this.getOtherToken(token);
        if(otherToken in this.rpsMoves && this.rpsWinnerToken) {
            data.rps.oppMove = this.rpsMoves[otherToken];
        }
    }

    fillTourData(data) {
        const tourData = Object.assign({}, this.tourData);
        data.tourData = tourData;
        const gameWinCount = Object.assign({}, tourData.gameWinCount);
        delete tourData.gameWinCount;
        tourData.gameWinCount = {}
        for(let k in gameWinCount) {
            tourData.gameWinCount[tourData.tokenToName[k]] = gameWinCount[k];
        }
        delete tourData.tokenToName;
    }

    getClientData(token) {
        const data = {};
        data.avatar = this.isTokenRegistered(token) ? this.playerTokens.get(token) : "";
        data.firstPlayer = this.firstPlayer === token;
        if(this.rpsMoves)  {
            this.fillRPSData(data, token)
        }
        this.room.updateGame(data);
        if('tourData' in this) {
            this.fillTourData(data);
        }
        return data;
    }

    setAvatar(data, token) {
        const tokens = this.playerTokens.keys;
        tokens.splice(tokens.indexOf(token), 1);
        const otherToken = tokens[0];
        this.playerTokens.set(token, data.avatar);
        this.playerTokens.set(otherToken, data.avatar === "X" ? "O" : "X");
        this.dynamoHelper.updateGame(this.id, {"playerTokens": JSON.stringify(this.playerTokens.map)});
    }

    startRps() {
        this.rpsMoves = {};
    }

    computeRps() {
        const rpsTokens = Object.keys(this.rpsMoves);
        if(rpsTokens.length < 2) return;
        let [winnerToken, loserToken] = [null, null];
        const move1 = this.rpsMoves[rpsTokens[0]], move2 = this.rpsMoves[rpsTokens[1]];
        this.rpsTie = false;
        if(move1 === move2) {
            this.rpsMoves = {};
            this.rpsTie = true;
        } else if(
            (move1 === 'r' && move2 === 's') ||
            (move1 === 'p' && move2 === 'r') ||
            (move1 === 's' && move2 === 'p')
        ) [winnerToken, loserToken] = [rpsTokens[0], rpsTokens[1]];
        else [winnerToken, loserToken] = [rpsTokens[1], rpsTokens[0]];
        if(winnerToken) {
            this.rpsWinnerToken = winnerToken;
            this.dynamoHelper.updateGame(this.id, {"rpsMove": JSON.stringify(this.rpsMoves)})
            this.dynamoHelper.winGame(winnerToken, loserToken);
            if('tourData' in this) {
                this.tourWin(winnerToken);
            }
        }
    }

    tourWin(winnerToken) {
        this.tourData.gamesPlayed++;
        this.tourData.gameWinCount[winnerToken]++;
        this.tourData.onWin(winnerToken);
    }
}
module.exports.RoomManager = RoomManager;

class Room {
    constructor(roomManager) {
        this.manager = roomManager;
    }

    resetGame() {
        const boards = Array(9);
        for (let i = 0; i < 9; i++) {
            boards[i] = Array(9).fill(null);
        }
        this.boards = boards;
        this.wonBoards = Array(9).fill(null);
        this.xNext = true;
        this.nextIndex = -1;
    }

    isMoveValid(move, token) {
        if((this.manager.playerTokens.get(token) === "X") !== this.xNext) return false;
        if(this.nextIndex !== -1 && move.gameIndex !== this.nextIndex) return false;
        if(this.wonBoards[move.gameIndex] !== null) return false;
        if(this.boards[move.gameIndex][move.boardIndex] !== null) return false;
        return true;
    }

    updateWonBoards(gameIndex) {
        const board = this.boards[gameIndex];
        const winner = this.manager.calculateWinner(board);
        if(winner !== null) {
            this.wonBoards[gameIndex] = winner;
            this.checkGameWinner();
        }
    }

    checkGameWinner() {
        const winner = this.manager.calculateWinner(this.wonBoards);
        if(winner === 'T') this.manager.startRps();
        else if(winner !== null) {
            let winnerToken;
            let loserToken;
            this.manager.playerTokens.entries.forEach(e => {
                if(e[1] === winner) winnerToken = e[0];
                else loserToken = e[0];
            })
            this.manager.dynamoHelper.winGame(winnerToken, loserToken);
            if('tourData' in this.manager)
                this.manager.tourWin(winnerToken);
        }
    }

    newMove(move, token) {
        if(!this.isMoveValid(move, token)) return;
        this.boards[move.gameIndex][move.boardIndex] = this.manager.playerTokens.get(token);
        this.updateWonBoards(move.gameIndex);

        let nextIndex = move.boardIndex;
        if(this.wonBoards[nextIndex] !== null) nextIndex = -1;
        this.nextIndex = nextIndex;
        this.xNext = !this.xNext;
    }

    updateGame(data) {
        data.boards = this.boards;
        data.wonBoards = this.wonBoards;
        data.nextIndex = this.nextIndex;
        data.myTurn = (data.avatar === 'X') === this.xNext;
    }
}

module.exports.registerRoomManager = async (id2manager, socket, token, id, dynamoHelper) => {
    let manager;
    if (!(id in id2manager)) {
        const gameData = await dynamoHelper.getGame(id);
        manager = new RoomManager(id, dynamoHelper, token, null, gameData);
    }
    else manager = id2manager[id];
    await initHandler(manager, socket, id, token, RoomHandler);
    manager.addToken(token, socket);
    manager.initRoom();
    manager.forceAllClientsUpdate();
    console.log('room connection made, roomID: ' + id + ', token: ' + token);
    return manager;
}