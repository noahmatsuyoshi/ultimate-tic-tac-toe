import { useEffect, useRef } from "react";
import socketIOClient from 'socket.io-client';
import { BotManager } from "../ai/botManager";
import * as globalConstants from './constants';

export const useSocketMatchmaking = (matchFoundCallback, setWaitTime, timeLimit) => {
    const socketRef = useRef();
    useEffect(() => {
        if (!socketRef.current) {
            socketRef.current = socketIOClient(globalConstants.SOCKET_SERVER_URI, {
                query: { matchmaking: true, rps: globalConstants.getRPSCookie(), timeLimit },
                transports: ['websocket', 'polling']
            });
        }

        socketRef.current.on(globalConstants.eventTypes.GET_WAIT_TIME_EVENT, (waitTime) => {
            setWaitTime(waitTime);
        })

        socketRef.current.on(globalConstants.eventTypes.MATCH_FOUND_EVENT, (data) => {
            matchFoundCallback(data.roomID);
        })

        return () => {
            socketRef.current.disconnect();
        }
    }, [matchFoundCallback , setWaitTime, timeLimit]);
};

export const useSocketTournament = (roomID, updateClient, errorCallback) => {
    const socketRef = useRef();
    useEffect(() => {
        let firstConnect = false;
        if (!socketRef.current) {
            socketRef.current = socketIOClient(globalConstants.SOCKET_SERVER_URI, {
                query: { roomID, tournament: true, rps: globalConstants.getRPSCookie() },
                transports: ['websocket', 'polling'],
                path: `/socket.io/${roomID.charAt(0)}/`,
            });
            firstConnect = true;
        }

        socketRef.current.on(globalConstants.eventTypes.FORCE_CLIENT_UPDATE_EVENT, () => {
            socketRef.current.emit(globalConstants.eventTypes.UPDATE_EVENT);
        })

        socketRef.current.on(globalConstants.eventTypes.UPDATE_EVENT, (data) => {
            updateClient(data);
        })

        socketRef.current.on(globalConstants.eventTypes.ERROR_EVENT, (data) => {
            errorCallback(data.errorMessage);
        })

        if(firstConnect) {
            socketRef.current.emit(globalConstants.eventTypes.UPDATE_EVENT);
        }

        return () => {
            socketRef.current.disconnect();
        }
    }, [roomID, updateClient]);

    const start = () => {
        socketRef.current.emit(globalConstants.eventTypes.START_EVENT);
    }

    const shuffle = () => {
        socketRef.current.emit(globalConstants.eventTypes.SHUFFLE_EVENT);
    }

    const changeSettings = (data) => {
        socketRef.current.emit(globalConstants.eventTypes.CHANGE_SETTINGS_EVENT, data);
    }

    const changeMyName = (newName) => {
        socketRef.current.emit(globalConstants.eventTypes.CHANGE_NAME_EVENT, {newName: newName});
    }

    const kickPlayer = (playerName) => {
        socketRef.current.emit(globalConstants.eventTypes.KICK_PLAYER_EVENT, {playerName: playerName});
    }

    return { changeMyName, start, shuffle, changeSettings, kickPlayer }
};

export const useSocket = (roomID, setGameData, setAvatar, setTourData, setSpectator, setSwitchTourney, setRps, timeLimit) => {
    const socketRef = useRef();

    const sendNewMove = (gameIndex, boardIndex) => {
        if('botManager' in socketRef.current) {
            socketRef.current.botManager.newMove({gameIndex: gameIndex, boardIndex: boardIndex});
        } else {
            socketRef.current.emit(globalConstants.eventTypes.NEW_MOVE_EVENT, {
                gameIndex: gameIndex,
                boardIndex: boardIndex,
            })
        }
    };

    const setSocketAvatar = (avatar) => {
        if('botManager' in socketRef.current) socketRef.current.botManager.setAvatar(avatar);
        else
            socketRef.current.emit(globalConstants.eventTypes.SET_AVATAR_EVENT, {
                avatar: avatar,
            });
        setAvatar(avatar);
    }

    const restartGame = () => {
        socketRef.current.emit(globalConstants.eventTypes.RESTART_GAME_EVENT);
    };

    const sendRpsMove = (move) => {
        if('botManager' in socketRef) socketRef.current.botManager.sendRpsMove(move);
        else socketRef.current.emit(globalConstants.eventTypes.RPS_MOVE_EVENT, {move: move});
    }

    const onWin = (data) => {
        socketRef.current.emit(globalConstants.eventTypes.WIN_EVENT, data);
    }

    useEffect(() => {
        let firstConnect = false;
        if (!socketRef.current) {
            socketRef.current = socketIOClient(globalConstants.SOCKET_SERVER_URI, {
                query: { roomID, rps: globalConstants.getRPSCookie(), timeLimit },
                transports: ['websocket', 'polling'],
                path: roomID ? `/socket.io/${roomID.charAt(0)}/` : '/socket.io',
            });
            firstConnect = true;
        }

        socketRef.current.on(globalConstants.eventTypes.SWITCH_TOURNEY_EVENT, () => {
            setSwitchTourney(true);
        })

        socketRef.current.on(globalConstants.eventTypes.UPDATE_EVENT, (data) => {
            console.log('game state updated');
            if(data.ai && !('botManager' in socketRef.current)) socketRef.current.botManager = new BotManager(setGameData, onWin, setRps, timeLimit);
            if(!('botManager' in socketRef.current)) {
                setAvatar(data.avatar);
                setGameData(data);
                if('rps' in data) setRps(data.rps);
            } else if('avatarImage' in data) {
                socketRef.current.botManager.avatarImage = data.avatarImage;
            }
            if('timeLimit' in data) {
                socketRef.current.botManager.timeLimit = data.timeLimit;
            }
            if('tourData' in data) {
                setTourData(data.tourData);
                if('botManager' in socketRef.current) socketRef.current.botManager.tourData = data.tourData;
            }
            console.log(data);
        });

        socketRef.current.on(globalConstants.eventTypes.FORCE_CLIENT_UPDATE_EVENT, () => {
            socketRef.current.emit(globalConstants.eventTypes.UPDATE_EVENT);
        });

        socketRef.current.on(globalConstants.eventTypes.ERROR_EVENT, (data) => {
            if(data.errorMessage === globalConstants.errorMessages.ROOM_FULL) {
                setSpectator(true);
            }
        });

        socketRef.current.on(globalConstants.eventTypes.SET_AVATAR_EVENT, (data) => {
            setAvatar(data.avatar);
        });

        if(firstConnect) {
            socketRef.current.emit(globalConstants.eventTypes.UPDATE_EVENT);
        }

        return () => {
            socketRef.current.disconnect();
        }
    }, [roomID, setGameData, setAvatar, setSpectator, setSwitchTourney, setRps]);

    return { sendNewMove, restartGame, setSocketAvatar, sendRpsMove };
};