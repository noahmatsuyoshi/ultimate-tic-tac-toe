import ReactDOM from 'react-dom';
import { Link, BrowserRouter, Switch, Route, Redirect } from 'react-router-dom';
import { ConnectionHandler, OfflineGame } from './js/game';
import Matchmaking from './components/js/matchmaking';
import {PureComponent, useState} from 'react';
import Tournament from './components/js/tournament';
import PlayerStats from "./components/js/playerStats";
import * as globalConstants from './js/constants';
import './css/index.css';

function MainMenu(props) {
  return (
      <div className="main-menu">
          <div className="game">
              <div className="game-board">
                  <div className="menu-row">
                      <FindRoomOption />
                      <CreateRoomOption />
                      <JoinRoomOption />
                  </div>
                  <div className="menu-row">
                       <BotOption />
                       <CreateTournamentOption />
                       <JoinTournamentOption />
                  </div>
                  <div className="menu-row">
                      <OfflineOption />
                      <ProjectInfo />
                      <FinalOption />
                  </div>
              </div>
              <div className="bottom-container">
                  <PlayerStatsOption />
              </div>

          </div>
      </div>
  );
}

function FindRoomOption(props) {
    return (
        <Link to={`/matchmaking/`} className="link">
            <button className="menu-cell menu-cell-first find-room">
                Find Random Opponent
            </button>
        </Link>
    );
}

function CreateRoomOption(props) {
  const roomID = globalConstants.generateUID();
  return (
      <Link to={`/play/${roomID}`} className="link">
          <button className='menu-cell menu-cell-middle create-room'>
              Play a Friend
          </button>
      </Link>
  );
}

function JoinRoomOption(props) {
  const [roomID, setRoomID] = useState("");
  const [shouldConnect, setShouldConnect] = useState(false);

  const handleChangeRoomID = (event) => {
    setRoomID(event.target.value);
  }

  const handleJoinRoom = () => {
    if(roomID !== "") {
      setShouldConnect(true);
    }
  }
  
  return (
    shouldConnect ?
    <Redirect to={'/play/' + roomID} /> :
    <div className='menu-cell menu-cell-last join-room'>
        <form onSubmit={handleJoinRoom} className='vertical-list'>
            <label className='vertical-list-child'>
                <div className='vertical-list-child small-text-label'>
                    Join Room
                </div>
                <input className='vertical-list-child input-field' type='text'
                       value={roomID} onChange={handleChangeRoomID}
                       placeholder='Room-ID'/>
            </label>
            <Link to={`/play/${roomID}`} className="link">
                <button className='menu-button join-room'>
                    Join
                </button>
            </Link>
        </form>
    </div>
  );
}

function BotOption(props) {
    return (
        <Link to={`/play/`} className="link">
            <button type='button' className='menu-cell menu-cell-first play-bot'>
                Play against AI
            </button>
        </Link>
    );
}

function CreateTournamentOption(props) {
    const roomID = globalConstants.generateUID();
    return (
        <Link to={`/tournament/${roomID}`} className="link">
            <button className='menu-cell menu-cell-middle create-tournament'>
                Create Tournament
            </button>
        </Link>
    );
}

function JoinTournamentOption(props) {
    const [tourID, setTourID] = useState("");
    const [shouldConnect, setShouldConnect] = useState(false);

    const handleChangeTourID = (event) => {
        setTourID(event.target.value);
    }

    const handleJoinRoom = () => {
        if(tourID !== "") {
            setShouldConnect(true);
        }
    }

    return (
        shouldConnect ?
        <Redirect to={'/tournament/' + tourID} /> :
        <div className='menu-cell menu-cell-last join-tournament'>
            <form onSubmit={handleJoinRoom} className='vertical-list'>
                <label className='vertical-list-child'>
                    <div className='vertical-list-child small-text-label'>
                        Join Tournament
                    </div>
                    <input className='vertical-list-child input-field' type='text'
                           value={tourID} onChange={handleChangeTourID}
                           placeholder='Tournament-ID'/>
                </label>
                <Link to={`/tournament/${tourID}`} className="link">
                    <button className='menu-button join-tournament'>
                        Join
                    </button>
                </Link>
            </form>
        </div>
    );
}

function OfflineOption(props) {
  return (
      <Link to={`/playoffline/`} className="link">
        <button type='button' className='menu-cell menu-cell-first play-offline'>
          Play Offline
        </button>
      </Link>
  );
}

function ProjectInfo(props) {
  return (
      <a href="https://github.com/noahmatsuyoshi/learn-react-tictactoe-mega" target="_blank" className="link">
          <button className='menu-cell menu-cell-middle project-info link' type='button'>
              <img className="project-info-img" src={process.env.PUBLIC_URL + "/github.png"}/>
              <div className="link">
                  Open Source
              </div>
          </button>
      </a>

  )
}

function FinalOption(props) {
  return (
    <div className='menu-cell menu-cell-last'>
    </div>
  )
}

function Online(props) {
  return (
    <div className='main-menu'>
      <ConnectionHandler {...props}/>
    </div>
  );
};

function Offline(props) {
  return (
    <div className='main-menu'>
      <OfflineGame />
    </div>
  );
}

function PlayerStatsOption() {
    return (
        <Link to={`/stats/`} className="link">
            <button className="menu-button find-room">
                Player Stats
            </button>
        </Link>
    );
}

class App extends PureComponent {
  componentDidMount() {
    document.title = 'Ultimate Tic-Tac-Toe';
  }

  render() {
    return (
      <Switch>
        <Route exact path="/" component={MainMenu} />
        <Route exact path="/matchmaking" component={Matchmaking} />
        <Route exact path="/tournament/:roomID" component={Tournament} />
        <Route exact path="/play/:roomID" component={Online} />
        <Route exact path="/play/" component={Online}/>
        <Route exact path="/playoffline/" component={Offline} />
        <Route exact path="/stats" component={PlayerStats} />
      </Switch>
    );
  }
};

// ========================================

ReactDOM.render(
  <div className='root-container'>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </div>,
  document.getElementById('root')
);
