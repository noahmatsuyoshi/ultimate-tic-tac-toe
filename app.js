const path = require('path');
const cookieParser = require('cookie-parser')
const cookie = require('cookie');
const globalConstants = require('./server/constants');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*',
    },
    transports: ['websocket', 'polling']
});
const {registerRoomManager} = require('./server/roomHandler');
const {registerBotManager} = require('./server/botHandler');
const {registerTournamentManager} = require('./server/tournamentHandler');
const {startTimer} = require('./server/registerHandlers');
const Matchmaking = require('./server/matchmaking');
const DynamoHelper = require('./server/dynamoHelper');

const generateUID = () => {
    var firstPart = (Math.random() * 46656) | 0;
    var secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

app.use(cookieParser());
app.use((req, res, next) => {
    if(req.cookies.playerToken === undefined) {
        res.cookie('playerToken', generateUID());
    } else {
        req.cookies.playerToken = String(req.cookies.playerToken);
    }
    next();
})
app.get('/stats/getStats', async function(req, res) {
    console.log("http req made");
    const token = req.cookies.playerToken;
    const user = await dynamoHelper.getUser(token);
    console.log(user);
    res.json({stats: user});
})
app.use(express.static(path.join(__dirname, "build")));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
})

const id2manager = {};
const dynamoHelper = new DynamoHelper();
const matchmakingManager = new Matchmaking(id2manager, dynamoHelper);

io.on("connection", async (socket) => {
    console.log("connection");
    const clientCookie = cookie.parse(socket.request.headers.cookie);
    if(!clientCookie.playerToken) return;
    const token = globalConstants.sanitize(clientCookie.playerToken);
    const user = await dynamoHelper.getUser(token);
    console.log("user")
    console.log(user);
    let { roomID, tournament, matchmaking } = socket.handshake.query;
    if(roomID)
        roomID = globalConstants.sanitize(roomID).toLowerCase();
    let roomType = "";
    if((roomID !== 'undefined') && (roomID in id2manager)) {
        roomType = id2manager[roomID].type;
    } else if(tournament) {
        roomType = "t";
    } else if(matchmaking) {
        console.log("matchmaking user entered");
        matchmakingManager.addToken(token, socket);
    }

    if(!matchmaking) {
        if (roomID !== 'undefined' && roomType === 't') {
            id2manager[roomID] = await registerTournamentManager(id2manager, socket, token, roomID, dynamoHelper);
        } else if (roomID === 'undefined' || roomType === 'b') {
            const manager = await registerBotManager(id2manager[roomID], socket, token, roomID);
            if (roomID !== 'undefined') id2manager[roomID] = manager;
        } else {
            if (roomType === "t") {
                socket.emit(globalConstants.eventTypes.SWITCH_TOURNEY_EVENT);
                return;
            }
            id2manager[roomID] = await registerRoomManager(id2manager, socket, token, roomID, dynamoHelper);
        }
        if(roomID !== 'undefined')
            id2manager[roomID].activeTokens.add(token);
    }

    socket.on("disconnect", () => {
        console.log('client disconnected')
        if(matchmaking) {
            matchmakingManager.removeToken(token);
        } else {
            const activeTokens = id2manager[roomID].activeTokens;
            activeTokens.delete(token);
            socket.leave(roomID);
            if (activeTokens.size === 0) startTimer(socket, id2manager[roomID], id2manager);
        }
    });
});

if(process.env.NODE_ENV == 'development') {
    http.listen(globalConstants.miscParameters.SOCKET_SERVER_PORT, () => {
        console.log(`Listening on port ${globalConstants.miscParameters.SOCKET_SERVER_PORT}`);
    })
} else {
    http.listen(process.env.PORT, () => {
        console.log(`Listening on port ${process.env.PORT}`);
    })
}