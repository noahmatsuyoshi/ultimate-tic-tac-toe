import * as winChecks from '../js/winChecks';
import {arrayDeepCopy, heuristics as h} from '../js/constants';


function chooseRandomArrayElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function getNullIndices(arr) {
    const nullIndices = [];
    try {
        arr.forEach((item, index) => {
            if(item === null) {
                nullIndices.push(index);
            }
        })
    } catch(e) {
        console.log(arr);
    }
    return nullIndices;
}

export function getPossibleMoves(boards, nextIndex, wonBoards) {
    let possibleNextIndices = [];
    if(!wonBoards[nextIndex]) possibleNextIndices.push(nextIndex);
    if(nextIndex === null) {
        possibleNextIndices = getNullIndices(wonBoards);
    }
    const moves = []
    possibleNextIndices.forEach((gameIndex) => {
        const board = boards[gameIndex];
        const possibleMoves = getNullIndices(board);
        possibleMoves.forEach((boardIndex) => {
            moves.push([gameIndex, boardIndex]);
        });
    });
    return moves;
}

function getSignedScore(scoreMagnitude, botsTurn) {
    return botsTurn ? scoreMagnitude : -scoreMagnitude;
}

function getBoardWinScore(gameIndex) {
    if(gameIndex === 4) return h.midWin;
    else if(gameIndex % 2 === 1) return h.edgeWin;
    else return h.corWin;
}

function getPair(index1, index2) {
    const [lower,higher] = index1 < index2 ? [index1,index2] : [index2,index1];
    const d = higher - lower;
    return lower - d >= 0 ? [lower-d,index2] : [index2,higher+d];
}

function getPairsToCheck(index) {
    const pairsToCheck = [];
    if(index !== 4) pairsToCheck.push((4,getPair(index)));
    else {
        pairsToCheck.push((getPair(index,0)));
        pairsToCheck.push((getPair(index,2)));
    }
    if(index % 2 === 0) {
        pairsToCheck.push((getPair(index,index > 5 ? index-3 : index+3)));
        pairsToCheck.push((getPair(index,index % 3 === 0 ? index+1 : index-1)));
    } else {
        pairsToCheck.push((getPair(index,index % 3 == 2 ? index+1 : index+3)));
    }
    return pairsToCheck;
}

function getMoveSetupScore(boards, botAvatar, index, moveSetupScore) {
    const pairsToCheck = getPairsToCheck(index);
    let score = 0;
    for (let p in pairsToCheck) {
        if((boards[p[0]] === botAvatar || boards[p[1]] === botAvatar) &&
         (boards[p[0]] === null || boards[p[1]] === null)) {
            if(score === 0) score = moveSetupScore;
            else score *= h.moveSetupFactor;
        }
    }
}

function scoreHeuristics(node, botsTurn, move, nextIndex, potentialBoardWin) {
    let score = 0;
    const globalSetupScore = getMoveSetupScore(node.wonBoards, node.botAvatar, move[0], h.moveSetupGlobal);
    if(globalSetupScore > 0) score += getSignedScore(globalSetupScore, !botsTurn);
    const setupScore = getMoveSetupScore(node.boards[move[0]], node.botAvatar, move[1], h.moveSetup);
    if(setupScore > 0) score += getSignedScore(setupScore, !botsTurn);
    if(nextIndex === null) score += getSignedScore(h.freeChoice, !botsTurn);
    if(potentialBoardWin) score += getSignedScore(getBoardWinScore(move[0]), botsTurn);
    if(move[0] === 4) score += getSignedScore(h.middleBoardPlay, botsTurn);
    if(move[1] === 4) score += getSignedScore(h.middlePlay, botsTurn);
    return score;
}

export function simulate(node) {
    const boards = arrayDeepCopy(node.boards);
    const botAvatar = node.botAvatar;
    let nextIndex = node.nextIndex;
    let move = node.prevMove;
    const wonBoards = winChecks.getWonBoards(boards);
    let botsTurn = node.botsTurn;
    node.backPropogate(getScore(node, boards, wonBoards, !botsTurn, move, nextIndex));
    const simDepth = h.simDepth * node.turnNumber;
    node.incrementN();
    for(let i = 0; i < simDepth; i++) {
        const possibleMoves = getPossibleMoves(boards, nextIndex, wonBoards);
        if(possibleMoves.length === 0) {
            break;
        }
        move = chooseRandomArrayElement(possibleMoves);
        const avatar = botsTurn ? botAvatar : 
            botAvatar === 'X' ? 'O' : 'X';
        const board = boards[move[0]];
        board[move[1]] = avatar;
        nextIndex = move[1];
        if(wonBoards[nextIndex]) nextIndex = null;
        const potentialWin = winChecks.calculateWinner(wonBoards)
        const score = getScore(node, boards, wonBoards, botsTurn, move, nextIndex);
        node.backPropogate(score*h.simulateFactor);
        if(potentialWin) break;
        botsTurn = !botsTurn;
    }
}

function getScore(node, boards, wonBoards, botsTurn, move, nextIndex) {
    const potentialBoardWin = winChecks.calculateWinner(boards[move[0]]);
    let score = 0;
    let potentialWin = null;
    if(potentialBoardWin) {
        wonBoards[move[0]] = potentialBoardWin;
        potentialWin = winChecks.calculateWinner(wonBoards);
    }
    if(potentialWin) {
        if(potentialWin !== 'T')
            score += getSignedScore(h.gameWin, botsTurn);
    } else {
        score += scoreHeuristics(node, botsTurn, move, nextIndex, potentialBoardWin);
    }
    return score;
}