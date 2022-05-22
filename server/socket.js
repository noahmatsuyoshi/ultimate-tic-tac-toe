const globalConstants = require('./constants');

module.exports =  class SocketHandler {
    constructor(socket, manager, id, token) {
        this.socket = socket;
        this.manager = manager;
        this.id = id;
        if(token) this.token = token;
        socket.join(id);
    }

    forceUpdate() {
        this.socket.emit(globalConstants.eventTypes.FORCE_CLIENT_UPDATE_EVENT);
    }

    setupEvents() {
        this.setupEventCallbacks.forEach((item) => {
            item();
        })
    }

    sendErrorEvent(errorMessage) {
        this.socket.emit(globalConstants.eventTypes.ERROR_EVENT, {errorMessage: errorMessage});
        this.forceUpdate();
    }
}