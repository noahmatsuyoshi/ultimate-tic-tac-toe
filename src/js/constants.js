import cookie from "cookie";

export const SOCKET_SERVER_URI = "";

export const botParameters = Object.freeze({
    botTurnDelay: 1000,
    stopBotSearch: 5*60*1000, // 5 minutes
    botSearchDelay: 40,
    botSimulateDelay: 20,
})

export const eventTypes = Object.freeze({
    ERROR_EVENT: "error",
    NEW_MOVE_EVENT: "newMove",
    OPPONENT_CONNECT_EVENT: "opponentConnect",
    UPDATE_EVENT: "update",
    FORCE_CLIENT_UPDATE_EVENT: "forceClientUpdate",
    RESTART_GAME_EVENT: "restartGame",
    SET_AVATAR_EVENT: "setAvatar",
    SET_AVATAR_IMAGE_EVENT: "setAvatarImage",
    PLAYER_NAME_CHANGE_EVENT: "playerNameChange",
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

export const errorMessages = Object.freeze({
    ROOM_FULL:   "roomFull",
    NAME_TAKEN:  "The entered name is already taken.",
    INVALID_NAME: "The entered name is invalid.",
    TOURNAMENT_FULL: "The tournament you're trying to join is full.",
    TOURNAMENT_STARTED: "The tournament you're trying to join has already started.",
});

export const heuristics = Object.freeze({
    gameWin: 10000,
    maxTreeDepth: 5,
    simDepth: 0.5,
    treeBreadthFactor: 1.5, // higher -> higher chance of BFS when far from root
    distanceFromRootPenalty: 3, // higher -> increase backprop dilution
    earlyGameDepthPenalty: 5, // higher -> more backprop dilution in early game
    backpropDilute: 10,
    midWin: 10,
    corWin: 3,
    edgeWin: 5,
    freeChoice: 1,
    middleBoardPlay: 0.5,
    middlePlay: 0.2,
    moveSetupGlobal: 0.5,
    moveSetup: 1,
    moveSetupFactor: 2,
    simulateFactor: 0.05,
})

export function convertCamelCaseToUpper(str) {
    return str.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
}

export function arrayDeepCopy(arr) {
    const arrCopy = [];
    arr.forEach((item) => {
        arrCopy.push(Array.from(item));
    })
    return arrCopy;
}

export function sleep(duration) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, duration);
    });
}

export function generateUID() {
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    const instanceIndex = Math.floor((Math.random() * 3) + 1).toString();
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return instanceIndex + firstPart + secondPart;
}

export function isLoggedIn() {
    const cookies = cookie.parse(document.cookie);
    return ('username' in cookies) && (cookies.username !== "") && (cookies.username !== "undefined");
}

export function getToken() {
    const cookies = cookie.parse(document.cookie);
    if(('username' in cookies) && (cookies.username !== "") && (cookies.username !== "undefined")) return cookies.username;
    if(('playerToken' in cookies) && (cookies.playerToken !== "")) return cookies.playerToken;
    return null;
}

export function getLoginError() {
    const cookies = cookie.parse(document.cookie);
    if('loginError' in cookies) return cookies.loginError;
    return "";
}

export function dataURLToBlob(dataURL) {
    const BASE64_MARKER = ';base64,';
    if (dataURL.indexOf(BASE64_MARKER) == -1) {
        const parts = dataURL.split(',');
        const contentType = parts[0].split(':')[1];
        const raw = parts[1];

        return new Blob([raw], {type: contentType});
    }

    const parts = dataURL.split(BASE64_MARKER);
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;

    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], {type: contentType});
}