import {arrayDeepCopy, heuristics as h} from '../js/constants';
import * as mctsTrain from './MctsTrain';
import * as winChecks from '../js/winChecks';

export class MctsNode {
    constructor(botAvatar='O', 
                botsTurn=false, 
                boards=Array(9).fill(Array(9).fill(null)), 
                wonBoards=Array(9).fill(null), 
                parent=null, 
                nextIndex=-1,
                prevMove,
                rootDistance=0,
                turnNumber=0) {
        this.parent = parent;
        this.nextIndex = nextIndex;
        this.boards = boards;
        this.wonBoards = wonBoards;
        this.winner = winChecks.calculateWinner(wonBoards);
        this.botAvatar = botAvatar;
        this.playerAvatar = botAvatar === 'X' ? 'O' : 'X';
        this.botsTurn = botsTurn;
        this.prevMove = prevMove;
        this.rootDistance = rootDistance;
        this.turnNumber = turnNumber;
        if(!this.winner) {
            this.possibleMoves = mctsTrain.getPossibleMoves(this.boards, 
                                                            this.nextIndex, 
                                                            this.wonBoards);
            this.unsearchedMoves = this.possibleMoves.slice();
        }
        this.n = 0;
        this.score = 0;
        this.children = {};
    }

    isMoveValid(move) {
        if(this.botsTurn) return false;
        if(this.nextIndex !== -1 && move[0] !== this.nextIndex) return false;
        if(this.wonBoards[move[0]] !== null) return false;
        if(this.boards[move[0]][move[1]] !== null) return false;
        return true;
    }

    chooseChild(move) {
        if(!(move in this.children)) {
            this.search(move);
        }
        return this.children[move];
    }

    chooseBestChild() {
        if(Object.keys(this.children).length === 0) {
            this.search();
        }
        let [bestChild, bestScore] = [null, -Infinity];
        for (let k in this.children) {
            const child = this.children[k]
            const score = child.score;
            if(score > bestScore) {
                bestChild = child;
                bestScore = score;
            }
        }
        return bestChild;
    }

    chooseGoodMove() {
        const keyList = [];
        const pList = [];
        let totalScore = 0;
        for (let k in this.children) {
            let score = this.children[k].score;
            keyList.push(k);
            if(!this.botsTurn) score *= -1;
            if(score > 0) totalScore += score;
            pList.push(totalScore);
        }
        let k;
        if(totalScore === 0) {
            k = keyList[Math.floor(Math.random()*keyList.length)];
        } else {
            const choice = Math.random() * totalScore;
            pList.forEach((score, index) => {
                if(choice <= score) {
                    if(index === 0) k = keyList[0];
                    else k = keyList[index-1];
                    return;
                } 
            });
        }
        return this.children[k].prevMove;
    }

    backPropogate(score) {
        score = score /
            (1 + (h.distanceFromRootPenalty * this.rootDistance) /
                 (h.earlyGameDepthPenalty * this.turnNumber)
            );
        this.score += score;
        if(this.parent) this.parent.backPropogate(score / h.backpropDilute);
    }

    incrementN() {
        this.n++;
        if(this.parent) this.parent.incrementN();
    }

    decrementRootDistance() {
        this.rootDistance--;
        for (let k in this.children) {
            this.children[k].decrementRootDistance();
        }
    }

    applyMoveToBoard(boards, move, avatar) {
        const board = boards[move[0]];
        board[move[1]] = avatar;
        let winner;
        if(winner = winChecks.calculateWinner(board)) {
            return winner;
        }
        return null;
    }

    search(move=null) {
        const maxTreeDepth = h.maxTreeDepth;
        if(this.rootDistance > maxTreeDepth) return;
        // select
        if(!move) {
            move = this.possibleMoves[Math.floor(Math.random() * this.possibleMoves.length)];
            const p = 1 / ((this.rootDistance + 1) * h.treeBreadthFactor);
            if(this.unsearchedMoves.length && 
             (Object.keys(this.children).length === 0 || Math.random() >= p)) {
                move = this.unsearchedMoves.splice(Math.floor(Math.random() * this.unsearchedMoves.length), 1)[0];
            } else {
                move = this.chooseGoodMove();
            }
        }
        if(move in this.children && !this.children[move].winner) {
            this.children[move].search();
            return;
        }
        const boards = arrayDeepCopy(this.boards);
        const wonBoards = this.wonBoards.slice();
        let winner;
        const nextAvatar = this.botsTurn ? this.botAvatar : this.playerAvatar;
        if(winner = this.applyMoveToBoard(boards, move, nextAvatar)) {
            wonBoards[move[0]] = winner;
        }
        let nextIndex = move[1];
        if(wonBoards[nextIndex]) nextIndex = -1;

        // expand
        const child = new MctsNode(this.botAvatar,
                                  !this.botsTurn,
                                  boards,
                                  wonBoards,
                                  this,
                                  nextIndex,
                                  move,
                                  this.rootDistance + 1,
                                  this.turnNumber + 1);
        
        // simulate
        mctsTrain.simulate(child);
        this.children[move] = child;
    }
}