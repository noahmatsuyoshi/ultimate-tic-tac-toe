const globalConstants = require('./constants');
const {RoomManager} = require("./roomHandler");

class Matchmaking {
    constructor(id2manager, dynamoHelper) {
        this.id2manager = id2manager;
        this.dynamoHelper = dynamoHelper;
        this.queue = [];
        this.lastTime = null;
        this.activeToken2Socket = {};
        this.matchmakingRoutine();
    }

    addToken(token, socket, timeLimit) {
        if(!(token in this.activeToken2Socket)) {
            this.queue.push({token, timeLimit});
        }
        this.activeToken2Socket[token] = socket;
        this.dynamoHelper.getTodaysWaitTime((waitTime) => {
            socket.emit(globalConstants.eventTypes.GET_WAIT_TIME_EVENT, waitTime);
        })
    }

    removeToken(token) {
        if(token in this.activeToken2Socket) delete this.activeToken2Socket[token];
    }

    async initMatch() {
        console.log("initmatch")
        if (this.lastTime !== null) {
            const waitTimeInSeconds = Math.round((Date.now() - this.lastTime) / 1000)
            this.dynamoHelper.putWaitTime(waitTimeInSeconds);
        }
        this.lastTime = Date.now();
        const [tokenObj1, tokenObj2] = [this.queue.shift(), this.queue.shift()];
        if(tokenObj1.token === tokenObj2.token) {
            this.queue.push(tokenObj1);
            return;
        }
        const [socket1, socket2] = [this.activeToken2Socket[tokenObj1.token], this.activeToken2Socket[tokenObj2.token]];
        const roomID = globalConstants.generateUID();
        let firstPlayerToken = Math.random() > 0.5 ? tokenObj1.token : tokenObj2.token;
        let timeLimit = tokenObj1.timeLimit ? tokenObj1.timeLimit : tokenObj2.timeLimit;
        if(tokenObj1.timeLimit && tokenObj2.timeLimit) {
            if(Math.random() > 0.5) {
                firstPlayerToken = tokenObj1.token;
                timeLimit = tokenObj2.timeLimit;
            } else {
                firstPlayerToken = tokenObj2.token;
                timeLimit = tokenObj1.timeLimit;
            }
        }
        await this.dynamoHelper.updateGame(roomID, {
            "firstPlayer": firstPlayerToken,
            "dateCreated": Date.now().toString(),
        });
        if(timeLimit) await this.dynamoHelper.updateGame(roomID, {"timeLimit": timeLimit.toString()});
        socket1.emit(globalConstants.eventTypes.MATCH_FOUND_EVENT, {roomID, timeLimit});
        await globalConstants.sleep(100);
        socket2.emit(globalConstants.eventTypes.MATCH_FOUND_EVENT, {roomID, timeLimit});
    }

    async matchmakingRoutine() {
        while(true) {
            await this.matchmakingCheck();
        }
    }

    async matchmakingCheck() {
        while(this.queue.length > 1) {
            this.initMatch();
        }
        await globalConstants.sleep(globalConstants.miscParameters.matchmakingPingInterval);
    }
}
module.exports = Matchmaking;