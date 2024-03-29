const crypto = require('crypto');

const miscParameters = Object.freeze({
    SOCKET_SERVER_HOST: "0.0.0.0",
    SOCKET_SERVER_PORT: "80",
    defaultPlayerName: "Player",
    timeout: 60 * 60 * 1000, // 1 hour
    roomTimeout: 10 * 60 * 1000, // 10 minutes
    tournamentTimeout: 60 * 60 * 1000, // 60 minutes
    matchmakingPingInterval: 5 * 1000, // 5 seconds
    turnTimerInterval: 1000, // 1 second
});
module.exports.miscParameters = miscParameters;

const dynamodbTableInfo = Object.freeze({
    tables: [
        {
            name: "ultimatetictactoe.wait-time",
            keySchema: {
                match_date: "HASH",
            },
            secondKeySchema: {
                dateCreated: {type: "HASH", include: "ALL"},
            },
            typeSchema: {
                dateCreated: "N",
                match_date: "S",
            },
        },
        {
            name: "ultimatetictactoe.users",
            keySchema: {
                token: "HASH",
            },
            secondKeySchema: {
                dateCreated: {type: "HASH", include: "KEYS_ONLY"},
            },
            typeSchema: {
                token: "S",
                dateCreated: "N",
            },
        },
        {
            name: "ultimatetictactoe.games",
            keySchema: {
                roomID: "HASH",
            },
            secondKeySchema: {
                dateCreated: {type: "HASH", include: "KEYS_ONLY"},
            },
            typeSchema: {
                roomID: "S",
                dateCreated: "N",
            },
        },
        {
            name: "ultimatetictactoe.activeTournaments",
            keySchema: {
                tourID: "HASH",
            },
            secondKeySchema: {
                instanceIndex: {type: "HASH", include: "ALL"},
            },
            typeSchema: {
                tourID: "S",
                instanceIndex: "N",
            },
        },
        {
            name: "ultimatetictactoe.oldTournaments",
            keySchema: {
                tourID: "HASH",
            },
            secondKeySchema: {
                dateCreated: {type: "HASH", include: "KEYS_ONLY"},
            },
            typeSchema: {
                tourID: "S",
                dateCreated: "N",
            },
        },
    ]
});
module.exports.dynamodbTableInfo = dynamodbTableInfo;

const errorMessages = Object.freeze({
    ROOM_FULL:   "roomFull",
    NAME_TAKEN:  "The entered name is already taken.",
    INVALID_NAME: "The entered name is invalid.",
    TOURNAMENT_FULL: "The tournament you're trying to join is full.",
    TOURNAMENT_STARTED: "The tournament you're trying to join has already started.",
});
module.exports.errorMessages = errorMessages;

const eventTypes = Object.freeze({
    ERROR_EVENT: "error",
    NEW_MOVE_EVENT: "newMove",
    DOC_CHANGE_EVENT: "docChange",
    UPDATE_EVENT: "update",
    RESTART_GAME_EVENT: "restartGame",
    SET_AVATAR_EVENT: "setAvatar",
    SET_AVATAR_IMAGE_EVENT: "setAvatarImage",
    PLAYER_NAME_CHANGE_EVENT: "playerNameChange",
    FORCE_CLIENT_UPDATE_EVENT: "forceClientUpdate",
    CHANGE_NAME_EVENT: "changeName",
    START_EVENT: "start",
    SHUFFLE_EVENT: "shuffle",
    CHANGE_SETTINGS_EVENT: "changeSettings",
    SWITCH_TOURNEY_EVENT: "switchTourney",
    WIN_EVENT: "win",
    START_RPS_EVENT: "startRps",
    RPS_MOVE_EVENT: "rpsMove",
    RPS_WIN_EVENT: "rpsWin",
    MATCH_FOUND_EVENT: "matchFound",
    GET_WAIT_TIME_EVENT: "getWaitTime",
    KICK_PLAYER_EVENT: "kickPlayer",
});
module.exports.eventTypes = eventTypes;

class TwoWayMap {
    constructor(map={}) {
        this.map = map;
        this.reverseMap = this.getReverseMap(map);
    }

    getReverseMap(map) {
        const reverseMap = {};
        for(const key in map) {
            reverseMap[map[key]] = key;
        }
        return reverseMap;
    }

    set(key, value) {
        this.map[key] = value;
        this.reverseMap[value] = key;
    }

    get(key) {
        return this.map[key];
    }

    revGet(value) {
        return this.reverseMap[value];
    }

    hasKey(key) {
        return (key in this.map);
    }

    hasValue(value) {
        return (value in this.reverseMap);
    }

    remove(key=null, value=null) {
        if(key) {
            value = this.map[key];
            delete this.map[key];
            delete this.reverseMap[value];
        } else {
            key = this.reverseMap[value];
            delete this.reverseMap[value];
            delete this.map[key];
        }
    }

    get keys() {
        return Object.keys(this.map);
    }

    get values() {
        return Object.keys(this.reverseMap);
    }

    get entries() {
        return Object.entries(this.map);
    }

    get length() {
        return Object.keys(this.map).length;
    }
}
module.exports.TwoWayMap = TwoWayMap;

module.exports.getRandomInstanceIndex = function () {
    return Math.floor((Math.random() * process.env.INSTANCE_COUNT) + 1);
}

module.exports.generateUID = function () {
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    const instanceIndex = module.exports.getRandomInstanceIndex().toString();
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return instanceIndex + firstPart + secondPart;
}

const sleep = (duration) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, duration);
    });
}
module.exports.sleep = sleep;

module.exports.turnTimer = async (timeLimit, roomManager, timeoutCallback) => {
    while(roomManager.active && (roomManager.room.nextIndex !== undefined)) {
        if(roomManager.lastMoveTime + timeLimit <= Date.now()) timeoutCallback();
        roomManager.countdown -= 1000;
        await sleep(miscParameters.turnTimerInterval);
    }
}

module.exports.checkTimeoutRoutine = async (manager, timeoutCallback, timeout) => {
    const timer = manager.timer;
    while(manager.active) {
        if(module.exports.checkTimeout(timer, timeoutCallback, timeout)) return;
        await sleep(timeout);
    }
}

const checkTimeout = (timer, timeoutCallback, timeout) => {
    if(Date.now() - timer.lastTime > timeout) {
        timeoutCallback();
        return true;
    }
    return false;
}
module.exports.checkTimeout = checkTimeout;

const commonChecks = {
    avatar: {
        type: "string",
        length: 1,
    }
}

const alphanum_regex = /^[a-z0-9]+$/i;
const num_regex = /^[a-z0-9]+$/i;

// data input validation
const validation = {
    roomNewMove: {
        gameIndex: {
            type: "number",
            func: (v) => ((v >= 0) && (v <= 8)) ? v : null,
        },
        boardIndex: {
            type: "number",
            func: (v) => ((v >= 0) && (v <= 8)) ? v : null,
        },
    },
    roomSetAvatar: {
        avatar: commonChecks.avatar,
    },
    botWin: {
        winnerAvatar: commonChecks.avatar,
        playerAvatar: commonChecks.avatar,
    },
    tourChangeName: {
        newName: {
            type: "string",
            maxLength: 20,
        }
    },
    tourChangeSettings: {
        bestOf: {
            type: "number",
            func: (v) => {
                if(v.match(num_regex)[0] !== v) return null;
                const newV = parseInt(v);
                if(newV % 2 == 0) return null;
                return newV;
            },
        },
        ai: {
            type: "boolean",
        },
        playerLimit: {
            type: "string",
            func: (v) => {
                if(!v.match(num_regex)) return null;
                if (!Number.isInteger(Math.log2(parseInt(v)))) return null;
                return parseInt(v);
            },
        },
        timeLimitEnabled: {
            type: "boolean",
        },
        timeLimit: {
            type: "number",
            min: 0,
            max: 2000,
        }
    },
    user: {
        username: {
            type: "string",
            func: (v, res) => {
                if(v.match(alphanum_regex)[0] !== v) {
                    res.statusMessage = "Username must only contain alphanumeric characters";
                    res.status(400).send();
                    return null;
                }
                return v;
            }
        },
        password: {
            type: "string",
            func: (v, res) => {
                if(v.match(alphanum_regex)[0] !== v) {
                    res.statusMessage = "Password must only contain alphanumeric characters";
                    res.status(400).send();
                    return null;
                }
                return v;
            }
        }
    },
    base64: {
        base64: {
            type: "string",
            base64: true,
            maxLength: 20000,
        }
    }

}
module.exports.validation = validation;

module.exports.validate = (fieldName, data, res) => {
    const checks = validation[fieldName];
    return _validate(checks, data, res);
}

function _validate(checks, data, res=null) {
    for (let k in checks) {
        if(!(k in data)) continue;
        const check = checks[k];
        let v = data[k];
        if(typeof v === "string") {
            if(('base64' in check) && check.base64) {
                v = base64sanitize(data[k]);
            } else {
                v = sanitize(data[k]);
            }
        }
        if('func' in check) {
            const newV = check.func(v, res);
            if(newV === null) {
                return null;
            } else {
                v = newV;
            }
        }
        if('type' in check) {
            if(typeof v !== check.type) return null;
            if('minLength' in check && v.length < check.minLength) {
                if(res !== null)
                    res.statusMessage = `${k} must be at least ${check.length} characters long`;
                    res.status(400).send();
                return null;
            }
            if('maxLength' in check && v.length > check.maxLength) {
                if(res !== null)
                    res.statusMessage = `${k} must be less than ${check.length} characters long`;
                res.status(400).send();
                return null;
            }
            if('min' in check && v < check.min) return null;
            if('max' in check && v > check.max) return null;
        } else {
            if(!_validate(check, v)) return null;
        }
        data[k] = v;
    }
    return data;
}

const base64sanitize = function sanitize(str){
    str = str.replace(/[^a-z0-9áéíóúñü \. ;:/,+_-]/gim,"");
    return str.trim();
}

const sanitize = function sanitize(str){
    str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");
    return str.trim();
}
module.exports.sanitize = sanitize;

module.exports.salt = strToSalt => crypto.pbkdf2Sync(strToSalt, process.env.API_SECRET,
    1, 64, `sha512`).toString(`hex`);