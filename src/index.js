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
import ReactGA from 'react-ga4';
import {GA_TRACKING_ID} from "./js/constants";

ReactGA.initialize(GA_TRACKING_ID);

const useAnalyticsEventTracker = (category) => {
    const eventTracker = (label, action) => {
        ReactGA.event({category, action, label});
    }
    return eventTracker;
}
export default useAnalyticsEventTracker;

function MainMenu(props) {
    const [rps, setRPS] = useState(null);
    const [xp, setXP] = useState(null);
    const eventTracker = useAnalyticsEventTracker('mainMenu');
    useEffect(async () => {
        const token = getToken();
        if ((token !== null) && !xp)
            await getXP(token, setXP);
        if (rps === null)
            setRPS(globalConstants.getRPSCookie());
    })
    return (
        <div className="main-menu">
            <div className="game">
                <div className="game-board">
                    <div className="menu-row">
                        <FindRoomOption eventTracker={eventTracker}/>
                        <CreateRoomOption eventTracker={eventTracker}/>
                        <JoinRoomOption eventTracker={eventTracker}/>
                    </div>
                    <div className="menu-row">
                        <BotOption eventTracker={eventTracker}/>
                        <CreateTournamentOption eventTracker={eventTracker}/>
                        <JoinTournamentOption eventTracker={eventTracker}/>
                    </div>
                    <div className="menu-row">
                        <OfflineOption eventTracker={eventTracker}/>
                        <ProjectInfo eventTracker={eventTracker}/>
                        <ProfileOption eventTracker={eventTracker}/>
                    </div>
                </div>
                <div className="bottom-container">
                    {xp !== null ?
                        <div className="exp-bar-player-stats-container">
                            <ExperienceBar xp={xp}/>
                            {<PlayerStatsOption eventTracker={eventTracker}/>}
                        </div> : <div />
                    }
                    <div className="rps-option">
                        RPS Mode? <input className="rps-checkbox" type="checkbox" checked={rps} onChange={
                        () => {
                                eventTracker('rpsMode', rps ? 'off' : 'on');
                                globalConstants.setRPSCookie(!rps);
                                setRPS(!rps);
                            }
                        }/>
                    </div>
                </div>
            </div>
        </div>
    );
}

function FindRoomOption(props) {
    return (
        <Link to={`/matchmaking/`} className="link">
            <button className="menu-cell menu-cell-first find-room" onClick={() => {
                props.eventTracker('findRoom', 'click');
            }}>
                Find Random Opponent
            </button>
        </Link>
    );
}

function CreateRoomOption(props) {
    const roomID = globalConstants.generateUID();
    return (
        <Link to={`/play/${roomID}`} className="link">
            <button className='menu-cell menu-cell-middle create-room' onClick={() => {
                props.eventTracker('createRoom', 'click');
            }}>
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
                        <button className='menu-button join-room' onClick={() => {
                            props.eventTracker('joinRoom', 'click');
                        }}>
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
            <button type='button' className='menu-cell menu-cell-first play-bot' onClick={() => {
                props.eventTracker('playAI', 'click');
            }}>
                Play Against Easy AI
            </button>
        </Link>
    );
}

function CreateTournamentOption(props) {
    const roomID = globalConstants.generateUID();
    return (
        <Link to={`/tournament/${roomID}`} className="link">
            <button className='menu-cell menu-cell-middle create-tournament' onClick={() => {
                props.eventTracker('createTournament', 'click');
            }}>
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
                        <button className='menu-button join-tournament' onClick={() => {
                            props.eventTracker('joinTournament', 'click');
                        }}>
                            Join
                        </button>
                    </Link>
                </form>
            </div>
    );
}

function OfflineOption(props) {
    return (
        <Link to={`/playoffline/`} className="link" onClick={() => {
            props.eventTracker('playOffline', 'click');
        }}>
            <button type='button' className='menu-cell menu-cell-first play-offline'>
                Play Offline
            </button>
        </Link>
    );
}

function ProjectInfo(props) {
    return (
        <a href="https://github.com/noahmatsuyoshi/ultimate-tic-tac-toe" target="_blank" className="link">
            <button className='menu-cell menu-cell-middle project-info link' type='button' onClick={() => {
                props.eventTracker('projectInfo', 'click');
            }}>
                <img className="project-info-img" src={process.env.PUBLIC_URL + "/github.png"}/>
                <div className="link">
                    Open Source
                </div>
            </button>
        </a>

    )
}

function login(username, password, setErrMsg) {
    fetch("/login", {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({username: username, password: password})
    })
        .then(res => {
            console.log(res)
            if (!res.ok) {
                setErrMsg(res.statusText);
            } else {
                window.location.reload();
            }
        })
        .catch(error => {
            console.log(`Error: ${error}`);
        });
}

function ProfileOption(props) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [avatarImage, setAvatarImage] = useState(null);
    const [errMsg, setErrMsg] = useState("");

    return (
        <div className='menu-cell menu-cell-last'>
            {globalConstants.isLoggedIn() ?
                <div className='vertical-list'>
                    <div className='vertical-list-child'>
                        {avatarImage !== null ? <img src={avatarImage} className="avatar-img"/> : globalConstants.getToken()}
                    </div>
                    <div className='vertical-list-child'>
                        <AvatarOption setAvatarImage={setAvatarImage} eventTracker={props.eventTracker}/>
                    </div>
                    <div className='vertical-list-child'>
                        {avatarImage !== null ? <SubmitAvatarOption eventTracker={props.eventTracker} submitAvatar={() => {
                            setAvatar(avatarImage);
                            setAvatarImage(null);
                        }}/> : <LogoutOption eventTracker={props.eventTracker}/>}
                    </div>
                    <div className='vertical-list-child'>
                        <div className='text-error'>
                            {errMsg}
                        </div>
                    </div>
                </div> :
                <form onSubmit={e => {
                    e.preventDefault();
                    props.eventTracker('login', 'click');
                    login(username, password, setErrMsg);
                    return false;
                }} className='vertical-list'>
                    <label className='vertical-list-child'>
                        <input className='vertical-list-child input-field' type='text'
                               value={username} onChange={(e) => setUsername(e.target.value)}
                               placeholder='username'/>
                        <input className='vertical-list-child input-field' type='password'
                               value={password} onChange={(e) => setPassword(e.target.value)}
                               placeholder='password'/>
                    </label>
                    <button className='menu-button join-tournament' onClick={e => {
                        e.preventDefault();
                        props.eventTracker('login', 'click');
                        login(username, password, setErrMsg);
                        return false;
                    }}>
                        Login/Register
                    </button>
                    <div className="text-error">{errMsg}</div>
                </form>}
        </div>
    )
}

function AvatarOption(props) {
    const [fileReader, setFileReader] = useState(null);

    useEffect(() => {
        const reader = new FileReader();
        reader.onload = function (readerEvent) {
            readerEvent.preventDefault();
            const image = new Image();
            image.onload = function (imageEvent) {
                imageEvent.preventDefault();
                const canvas = document.createElement('canvas')
                canvas.width = 128;
                canvas.height = 128;
                canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                props.setAvatarImage(dataUrl);
            }
            image.src = readerEvent.target.result;
        }
        if (!fileReader)
            setFileReader(reader);
    })

    return (<form>
        <label className="menu-button choose-avatar">
            Upload Avatar
            <input type="file" style={{display: "none"}}
               onChange={event => {
                   event.preventDefault();
                   props.eventTracker('submitAvatar', 'uploadFile');
                   resizeImage(event.target.files[0], fileReader);
               }}/>
        </label>
    </form>);
}

function LogoutOption(props) {
    return (
        <Link to={`/logout/`} className="link" onClick={() => {
            props.eventTracker('logout', 'click');
        }}>
            <button className="menu-button logout">
                Logout
            </button>
        </Link>
    );
}

function SubmitAvatarOption(props) {
    return (
        <button className="menu-button create-room" onClick={() => {
            props.eventTracker('submitAvatar', 'click');
            props.submitAvatar();
        }}>
            Submit
        </button>
    );
}

function PlayerStatsOption(props) {
    return (
        <Link to={`/stats/`} className="player-stats-button-container link">
            <button className="player-stats-button find-room" onClick={() => {
                props.eventTracker('playerStats', 'click');
            }}>
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

function setAvatar(base64str) {
    console.log(base64str);
    fetch(
        "/setAvatar",
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({'base64': base64str}),
        }
    )
        .then((result) => {
            console.log('Success:', result);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}

function resizeImage(file, fileReader) {
    if (file.type.match(/image.*/)) {
        console.log('An image has been loaded');
        fileReader.readAsDataURL(file);
    }
}


function Logout(props) {
    const cookies = new Cookies();
    cookies.set('username', "");
    cookies.set('accessToken', "");
    return (
        <Redirect to=""/>
    );
}

class App extends PureComponent {
    componentDidMount() {
        document.title = 'Ultimate Tic-Tac-Toe';
    }

    render() {
        const url = window.location.href;
        if (url.endsWith("?")) window.location.replace(url.substring(0, url.length - 2));
        return (
            <Switch>
                <Route exact path="/" component={MainMenu}/>
                <Route exact path="/matchmaking" component={Matchmaking}/>
                <Route exact path="/tournament/:roomID" component={Tournament}/>
                <Route exact path="/play/:roomID" component={Online}/>
                <Route exact path="/play/" component={Online}/>
                <Route exact path="/playoffline/" component={Offline}/>
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
