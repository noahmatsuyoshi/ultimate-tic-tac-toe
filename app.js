const path = require('path');
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
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
const cookieOptions = { maxAge: 1000*60*24, sameSite: 'strict', secure: false };

app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
    if(req.cookies.playerToken === undefined) {
        res.cookie('playerToken', generateUID(), cookieOptions);
        res.cookie('accessToken', "", cookieOptions);
    } else {
        req.cookies.playerToken = String(req.cookies.playerToken);
    }
    next();
});

// verify jwt token
app.use((req, res, next) => {
    if(('accessToken' in req.cookies) && req.cookies.accessToken !== "undefined" && req.cookies.accessToken !== "" &&
        'username' in req.cookies && req.cookies.username !== "" && req.cookies.username !== "undefined") {
        jwt.verify(req.cookies.accessToken, process.env.API_SECRET, function (err, decode) {
            if (err) {
                res.cookie('accessToken', "", cookieOptions);
                res.clearCookie('username', cookieOptions);
            }
            else {
                res.cookie('username', decode.id, cookieOptions);
            }
        });
    } else if(('accessToken' in req.cookies) && req.cookies.accessToken !== "undefined" && req.cookies.accessToken !== "") {
        res.cookie('accessToken', "", cookieOptions);
        res.clearCookie('username', cookieOptions);
    }
    next();
});

app.post('/login', async function(req, res) {
    if(!req.body.username || !req.body.password) return;
    const userObj = globalConstants.validate('user', {
        username: req.body.username,
        password: req.body.password,
    }, res);
    if(userObj === null) return;

    const username = userObj.username;
    const password = userObj.password;
    let user = await dynamoHelper.getUser(username);
    if(!('password' in user) || (!user.password || (user.password === ""))) {
        await dynamoHelper.setPassword(username, password);
        user = await dynamoHelper.getUser(username);
    }
    const reqHash = globalConstants.salt(password);
    const trueHash = user.password;
    // checking if password was valid and send response accordingly
    if (reqHash !== trueHash) {
        res.statusMessage = "Invalid password";
        res.status(400).send();
    } else {
        //signing token with user id
        const token = jwt.sign({
            id: user.token
        }, process.env.API_SECRET, {
            expiresIn: 86400
        });

        res.cookie("loginError", "", cookieOptions);
        res.cookie("accessToken", token, cookieOptions);
        res.cookie("username", user.token, cookieOptions);

        //responding to client request with user profile success message and  access token .
        res.status(200).send();
    }

});

app.get('/getStats', async function(req, res, next) {
    console.log("http req made");

    await jwt.verify(req.cookies.accessToken, process.env.API_SECRET, async function(err, decode) {
        const token = err ? req.cookies.playerToken : decode.id;
        const user = await dynamoHelper.getUser(token);
        res.json({stats: user});
    });
});

app.post('/setRPS', async function(req, res) {
    if(!('rps' in req.body) && typeof req.body.rps === "boolean") return;
    res.cookie("rps", req.body.rps.toString(), cookieOptions);
    res.send(200);
})

app.post('/setAvatar', async function(req, res) {
    let [image, username] = [null, null];
    if(('accessToken' in req.cookies) && req.cookies.accessToken) {
        jwt.verify(req.cookies.accessToken, process.env.API_SECRET, function (err, decode) {
            if (err) {
                res.clearCookie('username', cookieOptions);
                return res.status(401).send("Re-login needed");
            }
            else {
                const userObj = globalConstants.validate('base64', {
                    base64: req.body.base64
                }, res);
                if(userObj === null) return;
                image = userObj.base64;
                username = req.cookies.username;
            };
        });
    }
    if(image) {
        await dynamoHelper.updateUser(username, {"avatarBase64": image});
        res.status(200).send("Avatar change successful");
    }
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
    if(('username' in socket) && (socket.username) && (socket.username !== 'undefined'))
        token = socket.username

    let { roomID, tournament, matchmaking, rps, timeLimit } = socket.handshake.query;
    rps = rps === "true";
    if(timeLimit) timeLimit = 1000*parseInt(timeLimit);
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
            id2manager[roomID] = await registerTournamentManager(id2manager, socket, token, roomID, dynamoHelper, rps);
        } else if (roomID === 'undefined' || roomType === 'b') {
            const manager = await registerBotManager(id2manager[roomID], socket, token, roomID, dynamoHelper);
            if (roomID !== 'undefined') id2manager[roomID] = manager;
        } else {
            if (roomType === "t") {
                socket.emit(globalConstants.eventTypes.SWITCH_TOURNEY_EVENT);
                return;
            }
            id2manager[roomID] = await registerRoomManager(id2manager, socket, token, roomID, dynamoHelper, rps, timeLimit);
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