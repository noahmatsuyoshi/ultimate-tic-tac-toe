const globalConstants = require('./constants');

class Matchmaking {
    constructor(id2manager, dynamoHelper) {
        this.currentMatchID = 1;
        this.id2manager = id2manager;
        this.dynamoHelper = dynamoHelper;
        this.queue = [];
        this.lastTime = null;
        this.activeToken2Socket = {};
        this.matchmakingRoutine();
    }

    addToken(token, socket) {
        if(!this.queue.includes(token)) {
            this.queue.push(token);
        }
        this.activeToken2Socket[token] = socket;
        this.dynamoHelper.getTodaysWaitTime((waitTime) => {
            socket.emit(globalConstants.eventTypes.GET_WAIT_TIME_EVENT, waitTime);
        })
    }

    removeToken(token) {
        if(token in this.activeToken2Socket) delete this.activeToken2Socket[token];
    }

    initMatch() {
        console.log("initmatch")
        if (this.lastTime !== null) {
            const waitTimeInSeconds = Math.round((Date.now() - this.lastTime) / 1000)
            this.dynamoHelper.putWaitTime(waitTimeInSeconds);
        }
        this.lastTime = Date.now();
        const [token1, token2] = [this.queue.shift(), this.queue.shift()];
        const [socket1, socket2] = [this.activeToken2Socket[token1], this.activeToken2Socket[token2]];
        socket1.emit(globalConstants.eventTypes.MATCH_FOUND_EVENT, {roomID: `match${this.currentMatchID}`});
        socket2.emit(globalConstants.eventTypes.MATCH_FOUND_EVENT, {roomID: `match${this.currentMatchID}`});
        this.currentMatchID++;
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
        await globalConstants.sleep(globalConstants.eventTypes.matchmakingPingInterval);
    }
}
module.exports = Matchmaking;