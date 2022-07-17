const globalConstants = require('./constants');

module.exports.initHandler = async (manager, socket, id, token, Handler) => {
    const handler = new Handler(socket, manager, id, token);
    manager.handlers[token] = handler;
}

module.exports.startTimer = (socket, manager, id2manager) => {
    console.log("idle timer started")
    manager.timer = {lastTime: Date.now()}
    globalConstants.checkTimeoutRoutine(manager, () => {
        if('tourData' in manager) {
            const tokens = Object.keys(manager.tourData.gameWinCount);
            manager.onWin(Math.random() < 0.5 ? tokens[0] : tokens[1]);
        }
        manager.active = false;
        delete id2manager[manager.id];
        console.log("timeout");
        socket.disconnect();
    });
}