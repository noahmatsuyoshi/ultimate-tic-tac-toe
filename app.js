const path = require('path');
const cookieParser = require('cookie-parser')
const cookie = require('cookie');
const globalConstants = require('./server/constants');
const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
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
const jwt = require('jsonwebtoken');

const id2manager = {};
const dynamoHelper = new DynamoHelper();
const matchmakingManager = new Matchmaking(id2manager, dynamoHelper);

const generateUID = () => {
    let firstPart = (Math.random() * 46656) | 0;
    let secondPart = Math.floor((Math.random() * 3) + 1) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

app.use(cookieParser());
app.use(express.json());
app.use((req, res, next) => {
    if(req.cookies.playerToken === undefined) {
        res.cookie('playerToken', generateUID());
    } else {
        req.cookies.playerToken = String(req.cookies.playerToken);
    }
    next();
})

// verify jwt token
app.use((req, res, next) => {
    console.log(req.cookies);
    if(('accessToken' in req.cookies) && req.cookies.accessToken) {
        jwt.verify(req.cookies.accessToken, process.env.API_SECRET, function (err, decode) {
            if (err) res.cookie('username', undefined);
            else res.cookie('username', decode.id);
            next();
        });
    } else {
        res.cookie('username', undefined);
        next();
    }
});

app.get('/getStats', async function(req, res) {
    console.log("http req made");
    let token = req.cookies.playerToken;
    if(('username' in req.cookies) && (req.cookies.username !== ""))
        token = req.cookies.username;
    const user = await dynamoHelper.getUser(token);
    console.log(user);
    res.json({stats: user});
})

app.post('/login', async function(req, res) {
    if(!req.body.username || !req.body.password) return;
    const username = globalConstants.sanitize(req.body.username);
    const password = globalConstants.sanitize(req.body.password);
    console.log("http req made");
    let user = await dynamoHelper.getUser(req.body.username);
    if(!user.password) {
        await dynamoHelper.setPassword(username, password);
        user = await dynamoHelper.getUser(req.body.username);
    }
    const passwordIsValid = bcrypt.compareSync(
        req.body.password,
        user.password
    );
    // checking if password was valid and send response accordingly
    if (!passwordIsValid) {
        res.cookie("loginError", "Invalid password or username taken");
        return res.status(400)
            .send({
                accessToken: null,
                message: "Invalid password or username taken"
            });
    }
    //signing token with user id
    const token = jwt.sign({
        id: user.token
    }, process.env.API_SECRET, {
        expiresIn: 86400
    });

    res.cookie("loginError", "");
    res.cookie("accessToken", token);
    res.cookie("username", user.token);

    //responding to client request with user profile success message and  access token .
    res.status(200)
        .send({
            message: "Login successful"
        });
});

// verify jwt token
io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie);
    console.log(cookies);
    if(('accessToken' in cookies) && cookies.accessToken) {
        jwt.verify(cookies.accessToken, process.env.API_SECRET, function (err, decode) {
            if (err) socket.username = undefined;
            else socket.username = decode.id;
            next();
        });
    } else {
        socket.username = undefined;
        next();
    }
});

app.use(express.static(path.join(__dirname, "build")));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
})

io.on("connection", async (socket) => {
    console.log("connection");
    const clientCookie = cookie.parse(socket.request.headers.cookie);
    if(!clientCookie.playerToken) return;
    let token = globalConstants.sanitize(clientCookie.playerToken);
    if(('username' in socket) && (socket.username))
        token = socket.username
    const user = await dynamoHelper.getUser(token);

    let { roomID, tournament, matchmaking } = socket.handshake.query;
    if(roomID && roomID !== "undefined") {
        if(isNaN(parseInt(roomID.charAt(0)))) return;
        roomID = globalConstants.sanitize(roomID).toLowerCase();
        const instanceIndex = parseInt(roomID.charAt(0));
        if(!dynamoHelper.initializedTournaments.has(instanceIndex)) {
            await dynamoHelper.initializeRoomsForTournaments(instanceIndex, id2manager);
        }
    }
    let roomType = "";
    if((roomID !== 'undefined') && (roomID in id2manager)) {
        roomType = id2manager[roomID].type;
    } else if(tournament) {
        roomType = "t";
    } else if(matchmaking) {
        console.log("matchmaking user entered");
        matchmakingManager.addToken(token, socket);
    } else if(!roomID || roomID === 'undefined') {
        roomType = "b";
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
    }

    socket.on("disconnect", () => {
        console.log('client disconnected')
        if(matchmaking) {
            matchmakingManager.removeToken(token);
        } else {
            if(roomID in id2manager) {
                const activeTokens = id2manager[roomID].activeTokens;
                activeTokens.delete(token);
                socket.leave(roomID);
                if (activeTokens.size === 0) startTimer(socket, id2manager[roomID], id2manager);
            }
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