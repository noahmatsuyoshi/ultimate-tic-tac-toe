const globalConstants = require('./constants');
const SocketHandler = require('./socket');
const {initHandler} = require('./registerHandlers');
const Manager = require('./manager');
const {RoomManager} = require('./roomHandler')
const {BotManager} = require('./botHandler')

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
 function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
    
const getClosestBaseTwo = (number) => {
    if(number < 4) number = 4;
    const numPlayersPower = Math.ceil(Math.log2(number));
    return Math.pow(2, numPlayersPower);
}

const insertAINames = (nameList) => {
    const closestBaseTwo = getClosestBaseTwo(nameList.length);
    let i = 1;
    while(nameList.length < closestBaseTwo) {
        nameList.splice(i, 0, "AI");
        i += 2;
    }
    return nameList;
}

const insertEmptyNames = (nameList) => {
    const newNameList = [];
    const closestBaseTwo = getClosestBaseTwo(nameList.length);
    let numEmptyNames = closestBaseTwo - nameList.length;
    let setBack = 0;
    for(let i = 0; i < closestBaseTwo; i++) {
        if(((i % 2) === 1) && (numEmptyNames > 0)) {
            newNameList.push("");
            setBack++;
            numEmptyNames--;
        } else {
            newNameList.push(nameList[i - setBack])
        }
    }
    return newNameList;
}

class TournamentHandler extends SocketHandler {
    constructor(socket, manager, id, token) {
        super(socket, manager, id, token);
        this.setupEventCallbacks = [
            this.setupChangeNameEvent.bind(this),
            this.setupShuffleEvent.bind(this),
            this.setupChangeSettingsEvent.bind(this),
            this.setupUpdateEvent.bind(this),
            this.setupStartEvent.bind(this),
            this.setupKickPlayerEvent.bind(this),
        ];
        this.setupEvents();
    }

    setupChangeNameEvent() {
        this.socket.on(globalConstants.eventTypes.CHANGE_NAME_EVENT, (data) => {
            if(data.newName === this.manager.tokenToName.get(this.token)) {
                return;
            } else if((data.newName === "" || data.newName.startsWith("AI")) ||
                !globalConstants.validate('tourChangeName', data)) {
                this.sendErrorEvent(globalConstants.errorMessages.INVALID_NAME);
                return;
            } else if(this.manager.tokenToName.hasValue(data.newName)) {
                this.sendErrorEvent(globalConstants.errorMessages.NAME_TAKEN);
                return;
            }
            this.manager.tokenToName.set(this.token, this.manager.getNameCopy(data.newName));
            this.manager.updateClients();
        });
    }

    setupShuffleEvent() {
        this.socket.on(globalConstants.eventTypes.SHUFFLE_EVENT, () => {
            if(this.token !== this.manager.firstPlayer || this.manager.started) return;
            this.manager.bracket[0] = shuffle(this.manager.bracket[0]);
            this.manager.updateClients();
        })
    }

    setupChangeSettingsEvent() {
        this.socket.on(globalConstants.eventTypes.CHANGE_SETTINGS_EVENT, (data) => {
            if(this.token !== this.manager.firstPlayer || this.manager.started) return;
            if(!globalConstants.validate('tourChangeSettings', data)) return;
            for (let k in globalConstants.validation.tourChangeSettings) {
                if (k in data) {
                    this.manager.settings[k] = data[k];
                }
            }
            this.manager.updateClients();
        })
    }

    setupKickPlayerEvent() {
        this.socket.on(globalConstants.eventTypes.KICK_PLAYER_EVENT, (data) => {
            if(this.token !== this.manager.firstPlayer || this.manager.started) return;
            if(data.playerName.startsWith("AI") || data.playerName === "") return;
            const playerName = globalConstants.sanitize(data.playerName);
            if(this.manager.tokenToName.hasValue(playerName)) {
                const tokenList = this.manager.bracket[0];
                const token = this.manager.tokenToName.revGet(playerName);
                this.manager.tokenToName.remove(null, playerName);
                tokenList.splice(tokenList.indexOf(token), 1);
            }
            this.manager.updateClients();
        })
    }

    setupUpdateEvent() {
        this.socket.on(globalConstants.eventTypes.UPDATE_EVENT, () => {
            const data = Object.assign({}, {
                ...this.manager.settings,
                started: this.manager.started,
                survived: this.manager.survivedNames,
                bracket: this.manager.fullNameBracket,
            });
            data.firstPlayer = this.token === this.manager.firstPlayer;
            if(this.token in this.manager.tokenToRoom) 
                data.roomID = this.manager.tokenToRoom[this.token];
            data.meSurvived = this.manager.survived[this.token];
            data.name = this.manager.tokenToName.get(this.token);
            this.socket.emit(globalConstants.eventTypes.UPDATE_EVENT, data);
        })
    }

    setupStartEvent() {
        this.socket.on(globalConstants.eventTypes.START_EVENT, () => {
            if(this.token !== this.manager.firstPlayer || this.manager.started) return;
            this.manager.initializeMatches();
            this.manager.started = true;
            this.manager.updateClients();
        })
    }
}

class TournamentManager extends Manager {
    constructor(id2manager, id, firstToken, dynamoHelper, oldState=null, rps=null) {
        super(id);
        this.id2manager = id2manager;
        this.type = 't';
        this.rps = rps;
        this.tokenToName = new globalConstants.TwoWayMap();
        this.firstPlayer = firstToken;
        this.dynamoHelper = dynamoHelper;
        this.bracket = [[]];
        this.fullBracket = [[]];
        this.nameBracket = [[]];
        this.fullNameBracket = [[]];
        this.survived = {};
        this.tokenToRoom = {};
        this.started = false;
        this.numInitialPlayers = null;
        this.winnerToken = "";
        this.settings = {
            bestOf: 1,
            ai: true,
            playerLimit: null,
            timeLimitEnabled: false,
            timeLimit: null,
        };
        if(oldState && (Object.keys(oldState).length > 0)) {
            for(let k in oldState) {
                this[k] = oldState[k];
            }
            if('started' in oldState && oldState['started']) {
                this.initializeRooms();
            }
        } else {
            this.dynamoHelper.updateTour(id, {
                "firstPlayer": firstToken,
                "started": false,
                "dateCreated": Date.now().toString(),
                "instanceIndex": id.charAt(0).toString(),
            });
            if(rps)
                this.dynamoHelper.updateTour(id, {"rps": rps});
        }
    }

    addToken(token) {
        if(this.tokenToName.hasKey(token)) return;
        if(this.started) {
            this.handlers[token].sendErrorEvent(globalConstants.errorMessages.TOURNAMENT_STARTED);
            return;
        } else if(this.bracket[0].length === parseInt(this.settings.playerLimit)) {
            this.handlers[token].sendErrorEvent(globalConstants.errorMessages.TOURNAMENT_FULL);
            return;
        }
        this.tokenToName.set(token, this.getNameCopy(globalConstants.miscParameters.defaultPlayerName));
        this.bracket[0].push(token);
        this.updateClients();
    }

    fillBrackets() {
        const nameBracket = [];
        this.bracket.forEach((tokenList) => {
            const nameList = [];
            tokenList.forEach((token) => {
                nameList.push(this.convertTokenToName(token));
            })
            nameBracket.push(nameList);
        });
        nameBracket[0] = this.insertMissing(nameBracket[0]);
        this.fullNameBracket = nameBracket;

        this.fullBracket[0] = this.insertMissing(this.bracket[0].slice())
    }

    updateSurvived() {
        const survivedNames = {};
        for(let token in this.survived) {
            survivedNames[this.convertTokenToName(token)] = this.survived[token];
        }
        this.survivedNames = survivedNames;
    }

    updateClients() {
        this.fillBrackets();
        this.updateSurvived();
        this.forceAllClientsUpdate();
    }

    insertMissing(stringList) {
        if(this.settings.ai) return insertAINames(stringList);
        else return insertEmptyNames(stringList);
    }

    distinctAITokens(tokenList) {
        const newTokenList = tokenList.slice();
        for(let i = 0; i < newTokenList.length; i++) {
            if(newTokenList[i] === "AI") {
                newTokenList[i] = `AI_${i}`;
            }
        }
        return newTokenList;
    }

    convertTokenToName(token) {
        if(token === null) return null;
        if(token.startsWith("AI") || token === "") {
            return token;
        } else {
            return this.tokenToName.get(token);
        }
    }

    initializeMatch(round, position, token1, token2) {
        const roomID = `${this.id}_${round}_${position}`;
        this.tokenToRoom[token1] = roomID;
        this.tokenToRoom[token2] = roomID;
        if(token1 === "" || token2 === "") {
            this.onWin(round, position, token1 === "" ? token2 : token1);
        } else if(token1.startsWith("AI") && token2.startsWith("AI")) {
            this.onWin(round, position, Math.random() < 0.5 ? token1 : token2);
        } else {
            const tourData = {
                id: roomID,
                tourID: this.id,
                round: round,
                position: position,
                bestOf: this.settings.bestOf,
                gamesPlayed: 0,
                gameWinCount: {
                    [token1]: 0,
                    [token2]: 0,
                },
                tokenToName: {
                    [token1]: this.tokenToName.get(token1),
                    [token2]: this.tokenToName.get(token2),
                },
                onWin: winnerToken => this.onWin(round, position, winnerToken),
            }
            if(token1.startsWith("AI") || token2.startsWith("AI"))
                this.id2manager[roomID] = new BotManager(roomID, tourData)
            else {
                this.dynamoHelper.getGame(roomID).then(gameData => {
                    let firstToken = null;
                    if(!gameData || (Object.keys(gameData).length === 0)) {
                        firstToken = Math.random() < 0.5 ? token1 : token2;
                        const secondToken = firstToken === token1 ? token2 : token1;
                        this.dynamoHelper.updateGame(roomID, {
                            "playerTokens": JSON.stringify({
                                [firstToken]: "X",
                                [secondToken]: "O",
                            })
                        })
                        if(this.settings.timeLimitEnabled)
                            this.dynamoHelper.updateGame(roomID, {
                                "timeLimit": this.settings.timeLimit.toString()
                            })
                    }
                    this.id2manager[roomID] = new RoomManager(roomID, this.dynamoHelper, firstToken, tourData, gameData, this.rps, this.settings.timeLimit);
                })
            }
        }
    }

    onWin(round, position, winnerToken) {
        if (this.bracket.length < round + 2) {
            const newRound = new Array(this.bracket[0].length / Math.pow(2, round + 1));
            this.bracket.push(newRound.fill(null));
        }
        const winnerPos = this.bracket[round].indexOf(winnerToken);
        const lostPos = winnerPos % 2 === 1 ? winnerPos - 1 : winnerPos + 1;
        const lostToken = this.bracket[round][lostPos];
        if (!lostToken.startsWith("AI") && (lostToken !== "")) {
            const placement = `${this.numInitialPlayers - Math.pow(round + 1, 2) + 1}/${this.numInitialPlayers}`;
            this.dynamoHelper.addTournamentPlacement(lostToken, placement);
        }
        this.survived[lostToken] = false;
        this.tokenToRoom[winnerToken] = "";
        const newPos = Math.floor(position / 2);
        this.bracket[round + 1][newPos] = winnerToken;
        if (this.bracket[round + 1].length > 1) {
            const rivalIndex = newPos % 2 === 1 ? newPos - 1 : newPos + 1;
            if (this.bracket[round + 1][rivalIndex] !== null) {
                this.initializeMatch(round + 1, newPos, winnerToken, this.bracket[round + 1][rivalIndex]);
            }
        } else if (!lostToken.startsWith("AI") && (lostToken !== "")) {
            const placement = `1/${this.numInitialPlayers}`;
            this.dynamoHelper.addTournamentPlacement(winnerToken, placement);
            this.dynamoHelper.updateTour(this.id, {"winnerToken": winnerToken});
        }
        this.dynamoHelper.updateTour(this.id, {
            "survived": JSON.stringify(this.survived),
            "tokenToRoom": JSON.stringify(this.tokenToRoom),
            "bracket": JSON.stringify(this.bracket)
        });
        this.updateClients();
    }

    initializeRooms() {
        if(this.winnerToken !== "") return;
        this.numInitialPlayers = this.bracket[0].length;
        this.bracket.forEach(bracket => {
            let tokens = bracket.slice();
            for(let i = 0; i < tokens.length; i += 2) {
                this.survived[tokens[i]] = true;
                this.survived[tokens[i+1]] = true;
                if(tokens[i] !== null && tokens[i+1] !== null)
                this.initializeMatch(0, i, tokens[i], tokens[i+1]);
            }
        })
    }

    async initializeMatches() {
        this.bracket = this.fullBracket;
        this.bracket[0] = this.insertMissing(this.bracket[0]);
        this.bracket[0] = this.distinctAITokens(this.bracket[0]);
        await this.initializeRooms();
        await this.dynamoHelper.updateTour(this.id, {
            "started": true,
            "tokenToName": JSON.stringify(this.tokenToName.map),
            "tokenToRoom": JSON.stringify(this.tokenToRoom),
            "survived": JSON.stringify(this.survived),
            "bracket": JSON.stringify(this.bracket),
            "settings": JSON.stringify(this.settings)
        });
    }

    getNameCopy(name) {
        if(!this.tokenToName.hasValue(name)) return name;
        const basename = name;
        let i = 1;
        while(this.tokenToName.hasValue(name)) {
            i++;
            name = basename + i;
        }
        return name;
    }
}
module.exports.TournamentManager = TournamentManager;

module.exports.registerTournamentManager = async (id2manager, socket, token, id, dynamoHelper, rps=null) => {
    let manager;
    if(!(id in id2manager)) {
        const tourData = await dynamoHelper.getTour(id);
        manager = new TournamentManager(id2manager, id, token, dynamoHelper, tourData, rps);
    } else manager = id2manager[id];
    await initHandler(manager, socket, id, token, TournamentHandler);
    manager.addToken(token);
    manager.updateClients();
    console.log('tourney connection made, id: ' + id + ', token: ' + token);
    return manager;
}