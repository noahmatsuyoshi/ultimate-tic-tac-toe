import {PureComponent, useState, useEffect, useRef} from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from './socket';
import { Redirect } from 'react-router-dom';
import { calculateWinner, calculateTie } from './winChecks';
import RPS from '../components/js/rps';
import '../css/game.css';
import { useInterval } from '../hooks/useInterval';
import { getRandomMove } from './constants'

export function ConnectionHandler(props) {
  let { roomID, timeLimit } = useParams();
  if(timeLimit) timeLimit = parseInt(timeLimit);
  const [switchTourney, setSwitchTourney] = useState(false);
  return (
    switchTourney ? <Redirect to={`/tournament/${roomID}`} /> :
    <OnlineGame roomID={roomID} timeLimit={timeLimit} setSwitchTourney={setSwitchTourney} {...props} />
  );
}

function WaitingRoom(props) {
  return (
      <div className='main-menu'>
          <div className='main-menu-child text-label vertical-list-child'>
              <p>Share your room ID with your opponent <br/>
              Room ID: <b>{props.roomID}</b></p>
          </div>
      </div>
  );
}

function RestartButton(props) {
  return (
      <div className="vertical-list-child">
        <button onClick={props.restartGame} className='menu-button join-room'>
          Restart Game
        </button>
      </div>
  );
}

function WinDisplay(props) {
  console.log("");
  return (
    [<div key={0}>
      {props.winner === 'T' ?
        <div className='text-label'>
          <b>You tied :|</b>
        </div> :
          props.sendNewMove ? 
          <div className='text-label'>
            <b>{props.gameData.myTurn ? 'You lose D:' : 'You win!'}</b>
          </div> :
          <div className='text-label'>
            <b>{props.winner} wins!</b>
      </div>}
    </div>,
    <div key={1}>
      {Object.values(props.tourData.gameWinCount)
      .some(num => num >= (Math.floor(props.tourData.bestOf / 2) + 1)) ? 
      <div>
        <Link className="link-button" to={{
            pathname: `/tournament/${props.tourData.tourID}`,
        }}>
            <button className="menu-button create-room horizontal-align"
             type="button">
                RETURN TO TOURNAMENT VIEW
            </button>
        </Link>
      </div> :
      <RestartButton restartGame={props.restartGame}/>}
    </div>]
  )
}

function TurnDisplay(props) {
  return (
    <div>
      {props.gameData.myTurn ? 
      <div className='text-label'>
        It is <b>{props.sendNewMove ? 'your' : "X's"}</b> turn!
      </div> :
      <div className='text-label'>
        It is <b>{props.sendNewMove ? 'not your' : "O's"}</b> turn!
      </div>} <br/>
      {props.gameData.allowRestart ? <RestartButton restartGame={props.restartGame}/> : <div/>}
    </div>
    
  )
}

function SpectatorMessage(props) {
  return (
    <div className='text-label'>
      You are <b>spectating</b> this game <br/>
      (Two other players joined the room before you)
    </div>
  )
}

function InfoDisplay(props) {
  let gamesWonElement = null;
  if (props.tourData.tourID !== "") {
    const gamesWon = [];
    for (let k in props.tourData.gameWinCount) {
      gamesWon.push(<div>{`${k}: ${props.tourData.gameWinCount[k]}`}</div>);
    }
    gamesWonElement = (
        <div>
          {gamesWon}
        </div>
    );
  }
  return (
      <div>
        {props.spectator ? <SpectatorMessage/> :
            props.winner ? <WinDisplay {...props}/> : <TurnDisplay {...props}/>}
        {gamesWonElement === null ? <div/> :
            <div className="score-display">
              <br/>
              {gamesWonElement}
            </div>}
        {props.gameData.countdown ? <div className="countdown-text">{Math.max(0, Math.floor(props.gameData.countdown / 1000))}</div> : <div/>}
      </div>
  )
}

function ChooseAvatar(props) {
  return (
    <div className='text-label xobutton'>
      Play as {' '}
      <button className="xobutton" onClick={() => props.setAvatar('X')}>X</button> or {' '}
      <button className="xobutton" onClick={() => props.setAvatar('O')}>O</button>? <br />
      (X goes first)
    </div>
  )
}

function OnlineGame(props) {
  const [gameData, setGameData] = useState({
    firstPlayer: false,
    myTurn: true,
    boards: null,
    wonBoards: null,
    nextIndex: -1,
    allowRestart: false,
    avatarToImage: {},
    countdown: null,
  });
  const [avatar, setAvatar] = useState("");
  const [spectator, setSpectator] = useState(false);
  const [tourData, setTourData] = useState({
    tourID: "",
    bestOf: 1,
    gamesPlayed: 0,
    gameWinCount: {},
  })
  const [rps, setRps] = useState({on: false, active: false, winner: false, move: null});

  const { sendNewMove, restartGame, setSocketAvatar, sendRpsMove } = useSocket(props.roomID, setGameData, setAvatar, setTourData, setSpectator, props.setSwitchTourney, setRps, props.timeLimit);

  useInterval(() => {
    if(!('countdown' in gameData) || (gameData.countdown === null)) return;
    const gameDataCopy = Object.assign({}, gameData);
    gameDataCopy.countdown -= 1000;
    if((gameDataCopy.countdown === 0) && (props.roomID.endsWith("ai"))) {
      gameDataCopy.countdown = props.timeLimit;
      const randomMove = getRandomMove(gameData);
      if(randomMove !== null)
        sendNewMove(randomMove.gameIndex, randomMove.boardIndex);
    }
    setGameData(gameDataCopy);
  }, 1000);

  return (
    gameData.boards === null ? 
    <WaitingRoom roomID={props.roomID}  /> :
    (avatar === "" && !spectator ?
      (gameData.firstPlayer ? 
        <ChooseAvatar setAvatar={setSocketAvatar}/> : 
        <div className='text-label'>Your opponent is choosing their avatar</div>) :
      <GameContainer {...props} spectator={spectator} gameData={gameData}
      sendNewMove={sendNewMove} restartGame={restartGame} avatar={avatar}
      tourData={tourData} rps={rps} setRps={setRps} sendRpsMove={sendRpsMove} />)
  )
}

function setNewMoveOffline(gameData, setGameData, gameIndex, boardIndex, updateWonBoardsCallback=null) {
  const gameDataCopy = Object.assign({}, gameData);
  const boards = gameDataCopy.boards.slice();
  const board = boards[gameIndex].slice();
  board[boardIndex] = gameData.myTurn ? 'X' : 'O';
  boards[gameIndex] = board;
  gameDataCopy.boards = boards;
  if(updateWonBoardsCallback)
    updateWonBoardsCallback(gameDataCopy, gameIndex);

  let nextIndex = boardIndex;
  if(gameDataCopy.wonBoards[nextIndex] !== null)
    nextIndex = -1;
  gameDataCopy.nextIndex = nextIndex;
  gameDataCopy.myTurn = !gameDataCopy.myTurn;

  setGameData(gameDataCopy);
}

export function OfflineGame(props) {
  const [gameData, setGameData] = useState({
    myTurn: true,
    boards: Array(9).fill(Array(9).fill(null)),
    wonBoards: Array(9).fill(null),
    nextIndex: -1,
    avatarToImage: {},
    countdown: null,
  });
  const [tourData, setTourData] = useState({
    tourID: "",
    bestOf: 1,
    gamesPlayed: 0,
    gameWinCount: {},
  })
  let { timeLimit } = useParams();
  if(timeLimit && (gameData.countdown === null)) setGameData({...gameData, countdown: 1000*parseInt(timeLimit)});

  const setGameDataOffline = (data) => {
    if(timeLimit)
      data.countdown = 1000*parseInt(timeLimit);
    setGameData(data);
  }

  useInterval(() => {
    if(!('countdown' in gameData) || (gameData.countdown === null)) return;
    const gameDataCopy = Object.assign({}, gameData);
    gameDataCopy.countdown -= 1000;
    if(gameDataCopy.countdown === 0) {
      const randomMove = getRandomMove(gameData);
      if(randomMove !== null) {
        setNewMoveOffline(gameDataCopy, setGameDataOffline, randomMove.gameIndex, randomMove.boardIndex)
      }
    } else {
      setGameData(gameDataCopy);
    }
  }, 1000);

  return (
    <GameContainer tourData={tourData} gameData={gameData} setGameData={setGameDataOffline} {...props}/>
  )
}

function GameContainer(props) {
  let winner;
  if(props.rps && props.rps.on) {
    if(props.rps.tie) winner = 'T';
    else if(props.rps.winner === null) winner = false;
    else {
      props.gameData.myTurn = !props.rps.winner;
      winner = true;
    }
  } else {
    const [winner_temp, _] = calculateWinner(props.gameData.wonBoards);
    winner = winner_temp;
    console.log(calculateTie(props.gameData.boards, props.gameData.wonBoards));

    if ((!winner && !props.gameData.wonBoards.includes(null)) ||
        calculateTie(props.gameData.boards, props.gameData.wonBoards)) {
      winner = 'T';
    }
  }

  return (
    [(props.rps && props.rps.on) ?
      <RPS rps={props.rps} sendRpsMove={props.sendRpsMove} /> : 
      <Game key={0} {...props} winner={winner}/>,
    !(props.rps && props.rps.on) || winner ? <InfoDisplay key={1} {...props} winner={winner}/> : <div/>]
  )
}

class Game extends PureComponent {
  updateWonBoards(gameData, gameIndex) {
    const board = gameData.boards[gameIndex];
    const [boardWinner, _] = calculateWinner(board);
    if(boardWinner !== null) {
      gameData.wonBoards[gameIndex] = board[boardWinner[0]];
    } else if(!board.includes(null)) {
      gameData.wonBoards[gameIndex] = "T";
    }
  }

  handleClick(gameIndex, boardIndex) {
    if(this.props.spectator) return;
    if(this.props.gameData.nextIndex !== -1 && this.props.gameData.nextIndex !== gameIndex) return;
    if(this.props.sendNewMove && !this.props.gameData.myTurn) return;
    if(this.props.winner) return;
    if(this.props.gameData.boards[gameIndex][boardIndex] !== null) return;

    if(this.props.sendNewMove) {
      this.props.sendNewMove(gameIndex, boardIndex);
    } else {
      setNewMoveOffline(this.props.gameData, this.props.setGameData, gameIndex, boardIndex, this.updateWonBoards);
    }
  }

  render() {
    const [gameWinner, gameWinnerArray] = calculateWinner(this.props.gameData.wonBoards);
    let boards = [];
    for (let i = 0; i < 3; i++) {
      let row = [];
      for (let j = 0; j < 3; j++) {
        const index = i * 3 + j;
        const board = this.props.gameData.boards[index];
        const winner = this.props.gameData.wonBoards[index];
        
        let cell;
        if(winner) {
          let isGameWinningBoard = false;
          if(gameWinner) {
            isGameWinningBoard = gameWinnerArray.includes(index);
          }
          
          cell = (
            <div 
              className="square-big" 
              style={{backgroundColor: isGameWinningBoard ? 'green' : 'white'}}
            >
              {('avatarToImage' in this.props.gameData) && winner && (winner in this.props.gameData.avatarToImage) ?
                  <img src={this.props.gameData.avatarToImage[winner]} className="avatar"/> :
                  winner}
            </div>
          );
        } else {
          cell = (
            <Board 
              squares={board} avatarToImage={this.props.gameData.avatarToImage}
              onClick={(i) => this.handleClick(index, i)}
              backgroundColor={this.props.gameData.nextIndex === index ? 'yellow' : 'white'}
            />
          )
        }

        row.push(<div className="game-cell" key={index}>{cell}</div>);
      }
      row = <div key={i} className="game-row">{row}</div>
      boards.push(row);
    }

    return (
      <div className="game">
        <div className="game-board">
          {boards}
        </div>
      </div>
    );
  }
}

class Board extends PureComponent {

  renderSquare(i) {
    const avatar = this.props.squares[i];
    return (
      <Square 
        value={avatar && avatar in this.props.avatarToImage ? this.props.avatarToImage[avatar] : avatar}
        onClick={() => this.props.onClick(i)}
        key={i}
        backgroundColor={this.props.backgroundColor}
      />
    );
  }

  render() {
    let board = [];
    for (let i = 0; i < 3; i++) {
      let row = [];
      for (let j = 0; j < 3; j++) {
        const index = i * 3 + j;
        row.push(<span key={index}>{this.renderSquare(index)}</span>);
      }
      row = <div key={i} className="board-row">{row}</div>
      board.push(row);
    }
    return (
      <div>
        {board}
      </div>
    );
  }
}

function Square(props) {
  return (
    <button 
        className="square" 
        onClick={props.onClick}
        style={{backgroundColor: props.backgroundColor}}
    >
      {props.value !== null && props.value.length > 1 ? <img src={props.value} className="avatar"/> : props.value}
    </button>
  );
}