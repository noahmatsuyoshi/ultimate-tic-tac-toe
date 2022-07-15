import { botParameters, sleep, heuristics as h } from '../js/constants';
import * as mctsTrain from './MctsTrain';
import { MctsNode } from './MctsNode';

export class BotManager {
    constructor(onNewMove, onWin, setRps) {
        this.onNewMove = onNewMove;
        this.onWin = onWin;
        this.setRps = setRps;
        this.avatar = "";
        this.avatarToImage = {};
        this.timer = {lastTime: Date.now()};
        this.rootNode = new MctsNode();
        this.startSearch();
        this.startSimulate();
        this.setGameData();
        this.rpsMoves = null;
        this.rpsTie = false;
    }

    setGameData() {
        this.onNewMove({
            firstPlayer: true,
            myTurn: !this.rootNode.botsTurn,
            boards: this.rootNode.boards,
            wonBoards: this.rootNode.wonBoards,
            nextIndex: this.rootNode.nextIndex,
            avatarToImage: this.avatarToImage,
            allowRestart: !('tourData' in this),
        });
    }

    newMove(move) {
        this.savePlayerMove([move.gameIndex, move.boardIndex]);
        this.setGameData();
        sleep(botParameters.botTurnDelay).then(() => {
            this.performMove();
        });
    }

    savePlayerMove(move) {
        if(!this.rootNode.isMoveValid(move)) return;
        this.rootNode = this.rootNode.chooseChild(move);
        this.rootNode.decrementRootDistance();
        this.rootNode.parent = null;
    }

    performMove() {
        if(!this.rootNode.winner) this.makeBestMove();
        this.checkGameWinner();
        this.setGameData();
    }

    makeBestMove() {
        this.rootNode = this.rootNode.chooseBestChild();
        this.rootNode.decrementRootDistance();
        this.rootNode.parent = null;
    }

    async startSearch() {
        while(this.rootNode && !this.rootNode.winner) {
            if((Date.now() - this.timer.lastTime) < botParameters.stopBotSearch) this.rootNode.search();
            await sleep(botParameters.botSearchDelay);
        }
    }
    
    async startSimulate() {
        while(this.rootNode && !this.rootNode.winner) {
            if('children' in this.rootNode) {
                let children = Object.keys(this.rootNode.children);
                if(children.length > 0) {
                    let node = this.rootNode.children[children[Math.floor(children.length*Math.random())]];
                    children = Object.keys(node.children);
                    while(children.length > 0) {
                        if(Math.random() > 1 / h.treeBreadthFactor) break;
                        node = node.children[children[Math.floor(children.length*Math.random())]]
                        children = Object.keys(node.children);
                    }
                    if((Date.now() - this.timer.lastTime) < botParameters.stopBotSearch) mctsTrain.simulate(node);
                }
            }
            await sleep(botParameters.botSimulateDelay);
        }
    }

    checkGameWinner() {
        if(this.rootNode.winner !== null) {
            if(this.rootNode.winner === 'T') {
                this.startRps();
            }
            else this.onWin({winnerAvatar: this.rootNode.winner, playerAvatar: this.avatar});
        }
    }

    restartGame() {
        if('tourData' in this) return;
        this.avatar = "";
    }

    setAvatar(avatar) {
        this.avatar = avatar;
        if('avatarImage' in this) {
            this.avatarToImage[avatar] = this.avatarImage;
        }
        this.rootNode = new MctsNode(avatar === "X" ? "O" : "X", avatar === "O");
        if(this.avatar === "O") this.performMove();
        this.setGameData();
    }

    startRps() {
        this.setRps({on: true, active: true, winner: null, move: null, tie: this.rpsTie});
    }

    sendRpsMove(move) {
        const randomMove = ['r', 'p', 's'][Math.floor(Math.random() * 3)];
        this.rpsMoves = {
            [this.avatar]: move,
            [this.rootNode.botAvatar]: randomMove,
        };
        this.computeRps();
        this.setRps({
            on: true, 
            active: this.rpsTie, 
            winner: this.avatar === this.rpsWinnerAvatar, 
            move: this.rpsMoves[this.avatar], 
            oppMove: this.rpsMoves[this.rootNode.botAvatar],
            tie: this.rpsTie,
        });
    }

    computeRps() {
        const rpsAvatars = Object.keys(this.rpsMoves);
        if(rpsAvatars.length < 2) return;
        let winnerAvatar = null;
        const move1 = this.rpsMoves[rpsAvatars[0]], move2 = this.rpsMoves[rpsAvatars[1]];
        this.rpsTie = false;
        if(move1 === move2) {
            this.rpsTie = true;
            this.rpsMoves = {};
            this.startRps();
        } else if(
            (move1 === 'r' && move2 === 's') ||
            (move1 === 'p' && move2 === 'r') ||
            (move1 === 's' && move2 === 'p')
        ) winnerAvatar = rpsAvatars[0];
        else winnerAvatar = rpsAvatars[1];
        if(winnerAvatar) {
            this.rpsWinnerAvatar = winnerAvatar;
            this.onWin({winnerAvatar: winnerAvatar, playerAvatar: this.avatar});
        }
    }
}