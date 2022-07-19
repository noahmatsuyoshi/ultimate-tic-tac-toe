const globalConstants = require('./constants');
const SocketHandler = require('./socket');
const Manager = require('./manager');
const {initHandler, startTimer} = require('./registerHandlers');

class BotHandler extends SocketHandler {
    constructor(socket, manager, id) {
        super(socket, manager, id);
        this.setupEventCallbacks = [
            this.setupUpdateEvent.bind(this),
            this.setupWinEvent.bind(this),
        ];
        this.setupEvents();
    }

    setupUpdateEvent() {
        this.socket.on(globalConstants.eventTypes.UPDATE_EVENT, async () => {
            console.log('update game');
            this.socket.emit(globalConstants.eventTypes.UPDATE_EVENT, this.manager.getClientData());
        });
    }

    setupWinEvent() {
        this.socket.on(globalConstants.eventTypes.WIN_EVENT, (data) => {
            if(!globalConstants.validate('botWin', data)) return;
            this.manager.win(data.winnerAvatar, data.playerAvatar);
        })
    }
}

class BotManager extends Manager {
    constructor(id, timeLimit, tourData=null) {
        super(id);
        if(tourData) this.tourData = tourData;
        this.type = 'b';
        this.timeLimit = timeLimit;
        this.timer = {lastTime: Date.now()};
        this.tokenToImage = {};
    }

    getClientData() {
        const clientData = {};
        if('tourData' in this) {
            const tourData = Object.assign({}, this.tourData);
            clientData.tourData = tourData;
            const gameWinCount = Object.assign({}, tourData.gameWinCount);
            delete tourData.gameWinCount;
            tourData.gameWinCount = {}
            for(let k in gameWinCount) {
                let name = k;
                if(!name.startsWith("AI")) name = tourData.tokenToName[name];
                tourData.gameWinCount[name] = gameWinCount[k];
            }
            delete tourData.tokenToName;
            clientData.allowRestart = false;
        } else {
            clientData.allowRestart = true;
        }
        clientData.ai = true;
        clientData.avatarImage = this.avatarImage;
        if(this.timeLimit) clientData.timeLimit = this.timeLimit;
        return clientData;
    }

    win(winnerAvatar, playerAvatar) {
        this.active = false;
        if(!('tourData' in this)) return;
        const tokens = Object.keys(this.tourData.gameWinCount);
        let playerToken = tokens[0];
        let botToken = tokens[1];
        if(tokens[0].startsWith("AI")) {
            playerToken = tokens[1];
            botToken = tokens[0];
        }
        if(winnerAvatar !== 'T') {
            const winnerToken = winnerAvatar === playerAvatar ? playerToken : botToken;
            this.tourData.gameWinCount[winnerToken]++;
            this.tourData.onWin(winnerToken);
        }
        this.tourData.gamesPlayed++;
        this.timer.lastTime = Date.now();
        this.forceAllClientsUpdate();
    }
}
module.exports.BotManager = BotManager;

module.exports.registerBotManager = async (manager, socket, token, id, dynamoHelper, timeLimit) => {
    id = id !== 'undefined' ? id : token;
    if(!manager) manager = new BotManager(id, timeLimit);
    await initHandler(manager, socket, id, token, BotHandler);
    const user = await dynamoHelper.getUser(token);
    if(('avatarBase64' in user) && (user.avatarBase64 !== ""))
        manager.avatarImage = user.avatarBase64;
    startTimer(socket, manager);
    manager.forceAllClientsUpdate();
    console.log('bot connection made, roomID: ' + id + ', token: ' + token);
    return manager;
}