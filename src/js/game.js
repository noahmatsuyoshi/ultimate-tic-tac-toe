import { PureComponent, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSocket } from './socket';
import { Redirect } from 'react-router-dom';
import { calculateWinner, calculateTie } from './winChecks';
import RPS from '../components/js/rps';
import '../css/game.css';

export function ConnectionHandler(props) {
  const { roomID } = useParams();
  const [switchTourney, setSwitchTourney] = useState(false);
  return (
    switchTourney ? <Redirect to={`/tournament/${roomID}`} /> :
    <OnlineGame roomID={roomID} setSwitchTourney={setSwitchTourney} {...props} />
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
    <button onClick={props.restartGame} className='menu-button join-room'>
      Restart Game
    </button>
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
  if(props.tourData.tourID !== "") {
    const gamesWon = [];
    for(let k in props.tourData.gameWinCount) {
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
      {props.spectator ? <SpectatorMessage /> :
      props.winner ? <WinDisplay {...props}/> : <TurnDisplay {...props}/>}
      {gamesWonElement === null ? <div/> : 
      <div className="score-display">
        <br/>
        {gamesWonElement}
      </div>}
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
  const { sendNewMove, restartGame, setSocketAvatar, sendRpsMove } = useSocket(props.roomID, setGameData, setAvatar, setTourData, setSpectator, props.setSwitchTourney, setRps);
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

export function OfflineGame(props) {
  const [gameData, setGameData] = useState({
    myTurn: true,
    boards: Array(9).fill(Array(9).fill(null)),
    wonBoards: Array(9).fill(null),
    nextIndex: -1,
  });
  const [tourData, setTourData] = useState({
    tourID: "",
    bestOf: 1,
    gamesPlayed: 0,
    gameWinCount: {},
  })
  return (
    <GameContainer tourData={tourData} gameData={gameData} setGameData={setGameData} {...props}/>
  )
}

function GameContainer(props) {
  let winner;
  if(props.winner) winner = props.winner;
  else {
    const winnerArray = calculateWinner(props.gameData.wonBoards);
    winner = winnerArray ? props.gameData.wonBoards[winnerArray[0]] : null;
    console.log(calculateTie(props.gameData.boards, props.gameData.wonBoards));
    
    if((!winner && !props.gameData.wonBoards.includes(null)) || 
      calculateTie(props.gameData.boards, props.gameData.wonBoards)) {
        winner = 'T';
    }
  }

  if(props.rps && props.rps.on) {
    if(props.rps.tie) winner = 'T';
    else if(props.rps.winner === null) winner = false;
    else {
      props.gameData.myTurn = !props.rps.winner;
      winner = true;
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
    const boardWinner = calculateWinner(board);
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
      const gameData = Object.assign({}, this.props.gameData);
      const boards = gameData.boards.slice();
      const board = boards[gameIndex].slice();
      board[boardIndex] = this.props.gameData.myTurn ? 'X' : 'O';
      boards[gameIndex] = board;
      gameData.boards = boards;
      this.updateWonBoards(gameData, gameIndex);
      
      let nextIndex = boardIndex;
      if(gameData.wonBoards[nextIndex] !== null) {
        nextIndex = -1;
      }
      gameData.nextIndex = nextIndex;
      gameData.myTurn = !gameData.myTurn;

      this.props.setGameData(gameData);
    }
  }

  render() {
    const gameWinner = calculateWinner(this.props.gameData.wonBoards);
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
            isGameWinningBoard = gameWinner.includes(index);
          }
          
          cell = (
            <div 
              className="square-big" 
              style={{backgroundColor: isGameWinningBoard ? 'green' : 'white'}}
            >
              {winner}
            </div>
          );
        } else {
          cell = (
            <Board 
              squares={board}
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
    return (
      <Square 
        value={this.props.squares[i]} 
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
      {props.value}
    </button>
  );
}