const crypto = require('crypto');

const miscParameters = Object.freeze({
    SOCKET_SERVER_HOST: "0.0.0.0",
    SOCKET_SERVER_PORT: "80",
    defaultPlayerName: "Player",
    timeout: 60 * 60 * 1000, // 1 hour
    checkTimeoutDelay: 10 * 60 * 1000, // 10 minutes
    matchmakingPingInterval: 5 * 1000, // 5 seconds
});
module.exports.miscParameters = miscParameters;

const dynamodbTableInfo = Object.freeze({
    tables: [
        {
            name: "ultimatetictactoe.wait-time",
            keySchema: {
                match_datetime: "HASH",
            },
            secondKeySchema: {
                dateCreated: {match_date: "HASH", include: "ALL"},
            },
            typeSchema: {
                match_date: "S",
                match_time: "S",
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
}
module.exports.TwoWayMap = TwoWayMap;

const sleep = (duration) => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, duration);
    });
}
module.exports.sleep = sleep;

module.exports.checkTimeoutRoutine = async (manager, timeoutCallback) => {
    const timer = manager.timer;
    while(manager.activeTokens.size === 0) {
        if(module.exports.checkTimeout(timer, timeoutCallback)) return;
        await sleep(module.exports.checkTimeoutDelay);
    }
}

const checkTimeout = (timer, timeoutCallback) => {
    if(Date.now() - timer.lastTime > module.exports.timeout) {
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
            length: 20,
        }
    },
    tourChangeSettings: {
        bestOf: {
            type: "string",
            func: (v) => {
                if(v.match(num_regex)[0] !== v) return null;
                if(parseInt(v) % 2 == 0) return false;
                return true;
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
                return v;
            },
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
        if(typeof v === "string")
            v = sanitize(data[k]);
        if('type' in check) {
            if(typeof v !== check.type) return null;
            if('length' in check && v.length > check.length) {
                if(res !== null)
                    res.statusMessage = `${k} must be at least ${check.length} characters long`;
                    res.status(400).send();
                return null;
            }
            if('func' in check && !check.func(v, res)) return null;
        } else {
            if(!_validate(check, v)) return null;
        }
        data[k] = v;
    }
    return data;
}

const sanitize = function sanitize(str){
    str = str.replace(/[^a-z0-9áéíóúñü \.,_-]/gim,"");
    return str.trim();
}
module.exports.sanitize = sanitize;

module.exports.salt = strToSalt => crypto.pbkdf2Sync(strToSalt, process.env.API_SECRET,
    1, 64, `sha512`).toString(`hex`);