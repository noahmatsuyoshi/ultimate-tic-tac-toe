import ReactDOM from 'react-dom';
import {Link, BrowserRouter, Switch, Route, Redirect, useParams} from 'react-router-dom';
import {ConnectionHandler, OfflineGame} from './js/game';
import Matchmaking from './components/js/matchmaking';
import ExperienceBar from './components/js/experienceBar';
import {PureComponent, React, useState, useEffect} from 'react';
import Tournament from './components/js/tournament';
import PlayerStats, {getXP} from "./components/js/playerStats";
import * as globalConstants from './js/constants';
import './css/index.css';
import {getToken} from "./js/constants";
import Cookies from 'universal-cookie';

function MainMenu(props) {
    const [xp, setXP] = useState(null);
    useEffect(async () => {
        const token = getToken();
        if((token !== null) && !xp)
            await getXP(token, setXP);
    })
    return (
        <div className="main-menu">
            <div className="game">
                <div className="game-board">
                    <div className="menu-row">
                        <FindRoomOption/>
                        <CreateRoomOption/>
                        <JoinRoomOption/>
                    </div>
                    <div className="menu-row">
                        <BotOption/>
                        <CreateTournamentOption/>
                        <JoinTournamentOption/>
                    </div>
                    <div className="menu-row">
                        <OfflineOption/>
                        <ProjectInfo/>
                        <ProfileOption/>
                    </div>
                </div>
                {xp !== null ?
                    <div className="bottom-container">
                        <ExperienceBar xp={xp}/>
                        {<PlayerStatsOption/>}
                    </div> :
                    <div />
                }
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
        if (roomID !== "") {
            setShouldConnect(true);
        }
    }

    return (
        shouldConnect ?
            <Redirect to={'/play/' + roomID}/> :
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
        if (tourID !== "") {
            setShouldConnect(true);
        }
    }

    return (
        shouldConnect ?
            <Redirect to={'/tournament/' + tourID}/> :
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
        <a href="https://github.com/noahmatsuyoshi/ultimate-tic-tac-toe" target="_blank" className="link">
            <button className='menu-cell menu-cell-middle project-info link' type='button'>
                <img className="project-info-img" src={process.env.PUBLIC_URL + "/github.png"}/>
                <div className="link">
                    Open Source
                </div>
            </button>
        </a>

    )
}

function ProfileOption(props) {
    const login = (username, password) => {
        fetch("/login", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({username: username, password: password})
        })
            .then(res => res.json())
            .then(async res => {
                console.log(res)
                if(res.status !== 200) {
                    console.log(res);
                    throw res;
                }
            })
            .catch(error => {
                console.log(`Error: ${error}`);
            });
    }

    return (
        <Login login={login} />
    )
}

function Login(props) {
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")

    return (
        <div className='menu-cell menu-cell-last'>
            {globalConstants.isLoggedIn() ?
            <div className='vertical-list'>
                <div className='vertical-list-child'>
                    {globalConstants.getToken()}
                </div>
                <div className='vertical-list-child'>
                    <AvatarOption />
                </div>
                <div className='vertical-list-child'>
                    <LogoutOption />
                </div>
            </div> :
            <form onSubmit={() => props.login(username, password)} className='vertical-list'>
                <label className='vertical-list-child'>
                    <input className='vertical-list-child input-field' type='text'
                           value={username} onChange={(e) => setUsername(e.target.value)}
                           placeholder='username'/>
                    <input className='vertical-list-child input-field' type='text'
                          value={password} onChange={(e) => setPassword(e.target.value)}
                          placeholder='password'/>
                </label>
                <button className='menu-button join-tournament' onClick={() => props.login(username, password)}>
                    Login/Register
                </button>
                <div className="text-error">{globalConstants.getLoginError()}</div>
            </form>}
        </div>
    )
}

function AvatarOption(props) {
    return (
        <Link to={`/avatar/`} className="link">
            <button className="menu-button choose-avatar">
                Choose Avatar
            </button>
        </Link>
    );
}

function LogoutOption(props) {
    return (
        <Link to={`/logout/`} className="link">
            <button className="menu-button logout">
                Logout
            </button>
        </Link>
    );
}

function PlayerStatsOption() {
    return (
        <Link to={`/stats/`} className="player-stats-button-container link">
            <button className="player-stats-button find-room">
                Player Stats
            </button>
        </Link>
    );
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
            <OfflineGame/>
        </div>
    );
}

function Logout(props) {
    const cookies = new Cookies();
    cookies.set('username', "")
    cookies.set('accessToken', "")
    return (
        <Redirect to="" />
    );
}

class App extends PureComponent {
    componentDidMount() {
        document.title = 'Ultimate Tic-Tac-Toe';
    }

    render() {
        const url = window.location.href;
        if(url.endsWith("?")) window.location.replace(url.substring(0, url.length - 2));
        return (
            <Switch>
                <Route exact path="/" component={MainMenu}/>
                <Route exact path="/matchmaking" component={Matchmaking}/>
                <Route exact path="/tournament/:roomID" component={Tournament} />
                <Route exact path="/play/:roomID" component={Online} />
                <Route exact path="/play/" component={Online}/>
                <Route exact path="/playoffline/" component={Offline}/>
                <Route exact path="/avatar/" component={Avatar}/>
                <Route exact path="/logout/" component={Logout}/>
                <Route exact path="/stats/" component={PlayerStats}/>
            </Switch>
        );
    }
};

// ========================================

ReactDOM.render(
    <div className='root-container'>
        <BrowserRouter>
            <App/>
        </BrowserRouter>
    </div>,
    document.getElementById('root')
);
