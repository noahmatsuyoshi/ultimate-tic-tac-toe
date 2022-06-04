import {React, PureComponent, useRef, Component, useState} from 'react';
import {useParams, Link, Redirect} from 'react-router-dom'
import '../css/tournament.css';
import { useSocketTournament } from '../../js/socket';
import ErrorMessage from './errorMessage';
import {errorMessages} from '../../js/constants';

function checkBestOfInput(value) {
    for (let i = 0; i < value.length; i++) {
        if(isNaN(parseInt(value.charAt(i)))) return false;
    }
    if(parseInt(value) % 2 == 0) return false;
    return true;
}

function checkPlayerLimitInput(value) {
    for (let i = 0; i < value.length; i++) {
        if(isNaN(parseInt(value.charAt(i)))) return false;
    }
    return true;
}

function Bracket(props) {
    return (
        <div className="bracket-container" style={{
            height: props.h + "vmin",
            width: (60 / props.depth) + "vmin",
        }}>
            <div style={{
             height: (props.h / 2) + "vmin",
             width: (60 / props.depth) + "vmin",
             display: 'flex',
             flexDirection: 'column',
            }}>
                <div className={props.top ? props.className+"-top-border" : "no-border"} />
                <div className={props.bottom ? props.className+"-bottom-border" : "no-border"} />
            </div>
        </div>
    );
}

export default function Tournament() {
    const { roomID } = useParams();
    const [errorMessage, setErrorMessage] = useState("");
    const bracketRef = useRef(null);
    const panelRef = useRef(null);
    const updateClient = (data) => {
        if(bracketRef.current) {
            bracketRef.current.updateBracket({
                bracket: data.bracket,
                survived: data.survived,
                firstPlayer: data.firstPlayer,
                name: data.name,
                started: data.started,
            });
        }
        if(panelRef.current) {
            panelRef.current.updateSettings(data);
        }
    }
    const errorCallback = errorMessage => {
        console.log(errorMessage);
        if((errorMessage === errorMessages.TOURNAMENT_FULL) || (errorMessage === errorMessages.TOURNAMENT_STARTED))
            setErrorMessage(errorMessage);
        else
            panelRef.current.setErrorMessage(errorMessage);
    }
    const getMyName = () => panelRef.current.state.name;
    const { changeMyName, start, shuffle, changeSettings, kickPlayer } = useSocketTournament(roomID, updateClient, errorCallback);

    return (
        ((errorMessage === errorMessages.TOURNAMENT_FULL) || (errorMessage === errorMessages.TOURNAMENT_STARTED)) ?
        <div className="tournament-full-error"><div className="tournament-full-error-text">{errorMessage}</div></div> :
        <div className="tournament-main">
            <div className='bracket-settings-container'>
                <Brackets ref={bracketRef} kickPlayer={kickPlayer} getMyName={getMyName} />
            </div>
            <ConnectionPanel ref={panelRef} roomID={roomID}
                             changeMyName={changeMyName} start={start}
                             shuffle={shuffle} changeSettings={changeSettings}
                             errorMessage={errorMessage}/>
        </div>

    )
}

class ConnectionPanel extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            name: "",
            bestOf: 1,
            ai: true,
            firstPlayer: false,
            roomID: "",
            survived: true,
            started: false,
            errorMessage: "",
        }

        this.changeName = this.changeName.bind(this);
        this.updateSettings = this.updateSettings.bind(this);
        this.setErrorMessage = this.setErrorMessage.bind(this);
    }

    setErrorMessage(errorMessage) {
        const state = Object.assign(this.state);
        state.errorMessage = errorMessage;
        this.setState(state);
    }

    updateSettings(settings) {
        this.setState(settings);
    }

    changeName() {
        console.log(this.state);
        if(this.state.name.length > 20) return;
        this.props.changeMyName(this.state.name);
        this.setState({name: ""});
    }

    render() {
        return (
            <div className="container-options">
                <div className="container-id">
                    <div className='main-menu-child text-label vertical-list-child'>
                        <p>Share your Tournament-ID: <b>{this.props.roomID}</b></p>
                    </div>
                </div>
                <form className="container-settings" onSubmit={(e) => {e.preventDefault()}}>
                    <div className="container-name">
                        <label className="text-normal input-height">
                            Your name: {" "}
                            <input
                                className="input-height"
                                type="textarea"
                                value={this.state.name}
                                onChange={(e) => this.setState({name: e.target.value})}
                                onSubmit={this.changeName}
                                placeholder="20 char max" />
                        </label>
                        <label>
                            <button
                                className="input-height text-black"
                                type="button"
                                onClick={this.changeName}>
                                Change Name
                            </button>
                        </label>
                    </div>
                    <div className="container-name-error">
                        {this.state.errorMessage === "" ?
                            <div /> :
                            <ErrorMessage errorMessage={this.state.errorMessage}/>}
                    </div>
                    <div className="container-best-of">
                        <label className="option-best-of text-normal">
                            Best of <input readOnly={!this.state.firstPlayer} size={1} type="text"
                                           value={this.state.bestOf} className="input-height"
                                           onChange={e => {
                                               const value = e.target.value;
                                               if(checkBestOfInput(value)) {
                                                   const changedSettings = {bestOf: value};
                                                   this.setState(changedSettings);
                                                   if(value !== "") this.props.changeSettings(changedSettings);
                                               }
                                           }}
                                    />
                        </label>
                    </div>
                    <div className="container-ai-checkbox">
                        <label className="text-normal">
                            <input readOnly={!this.state.firstPlayer} type="checkbox"
                                   checked={this.state.ai}
                                   className="ai-checkbox"
                                   onChange={this.state.firstPlayer ? (e => {
                                       const changedSettings = {ai: e.target.checked};
                                       this.setState(changedSettings);
                                       this.props.changeSettings(changedSettings);
                                   }) : e => false}
                            />
                            If player has no match, play against AI
                        </label>
                    </div>
                    <div className="container-player-limit">
                        <label className="text-normal">
                            Max players: <input readOnly={!this.state.firstPlayer} size={1} type="text"
                                             value={this.state.playerLimit} className="input-height"
                                             onChange={e => {
                                                 const value = e.target.value;
                                                 if(checkPlayerLimitInput(value)) {
                                                     const changedSettings = {playerLimit: value};
                                                     this.setState(changedSettings);
                                                     if(value !== "") this.props.changeSettings(changedSettings);
                                                 }
                                             }}
                                        />
                        </label>
                    </div>
                    <div className="container-start">
                        {this.state.firstPlayer && !this.state.started ?
                            <div>
                                <br />
                                <label>
                                    <button className="menu-button find-room horizontal-align text-black" type="button" onClick={() => this.props.shuffle()}>Shuffle Bracket</button>
                                </label>
                                <br />
                                <label>
                                    <button className="menu-button create-room horizontal-align text-black"
                                            type="button"
                                            onClick={() => this.props.start()}>
                                        START
                                    </button>
                                </label>
                            </div> :
                            <div/>}
                        {this.state.roomID === "" || !this.state.meSurvived ?
                        <div /> :
                        <div>
                            <br />
                            <br />
                            <label>
                                <Link className="link-button" to={{
                                    pathname: `/play/${this.state.roomID}`,
                                }}>
                                    <button className="menu-button create-room horizontal-align"
                                            type="button">
                                        JOIN CURRENT MATCH
                                    </button>
                                </Link>
                            </label>
                        </div>}
                    </div>
                    <div className="container-end-block"/>
                </form>
            </div>
        )
    }
}

class Brackets extends PureComponent {
    constructor(props) {
        super(props);
        this.state = {
            bracket: [[]],
            survived: {},
            firstPlayer: false,
            name: "Player",
            started: false,
        }

        this.updateBracket = this.updateBracket.bind(this);
    }

    updateBracket(bracketSettings) {
        console.log(bracketSettings);
        this.setState(bracketSettings);
    }

    kickButton(playerName) {
        if(!this.state.started && playerName && this.state.firstPlayer && (this.state.name !== playerName))
            return (<button onClick={() => {
                this.props.kickPlayer(playerName)
            }}>
                Kick
            </button>);
        else
            return <div></div>;
    }

    buildNameList(names, side) {
        const list = []
        names.forEach((name, index) => {
            let content = name;
            if(this.state.firstPlayer && (!name.startsWith("AI") || name === "")) {
                if(side === "left") content = (<div>{this.kickButton(name)} {name}</div>)
                else content = (<div>{name} {this.kickButton(name)}</div>)
            }
            list.push(<div className="name" key={name + index} style={{
                height: (64 / names.length) + "vmin",
                textAlign: side === "left" ? "right" : "left",
            }}>
                {content}
            </div>)
        })
        return (<div key={side} className="name-list" style={{
            
        }}>
            {list}
        </div>)
    }

    buildBrackets() {
        let numPlayers = this.state.bracket[0].length;
        const depth = 2 * (numPlayers - 1) + 1;
        const buildBracket = (className) => {
            let num = 1;
            const cols = [];
            let round = Math.log2(numPlayers) - 1;
            while(num <= numPlayers / 4) {
                const col = [];
                for (let i = 0; i < num; i++) {
                    const addIndex = className.includes("right") ? numPlayers / Math.pow(2, round) : 0;
                    col.push(
                        <Bracket key={num + className + i} className={className} 
                         depth={depth} h={64 / num} 
                         top={this.state.bracket.length < round || 
                            (this.state.bracket.length >= round && this.state.bracket[round-1][i*2+addIndex] != "") &&
                            (this.state.survived[this.state.bracket[round-1][i*2+addIndex]] == null ||
                            this.state.survived[this.state.bracket[round-1][i*2+addIndex]])}
                         bottom={this.state.bracket.length < round || 
                            (this.state.bracket.length >= round && this.state.bracket[round-1][i*2+addIndex+1] != "") &&
                            (this.state.survived[this.state.bracket[round-1][i*2+addIndex+1]] == null ||
                            this.state.survived[this.state.bracket[round-1][i*2+addIndex+1]])}
                        />
                    )
                }
                cols.push(<div key={num + className} className="column">
                    {col}
                </div>);
                num *= 2;
                round--;
            }
            return cols;
        };
        let leftBracket = buildBracket("bracket-left");
        leftBracket.reverse();
        leftBracket.push(<div key="middle" className="middle" />)
        const rightBracket = buildBracket("bracket-right");
        return leftBracket.concat(rightBracket);
    }

    render() {
        const bracket = this.state.bracket;
        const listLength = bracket[0].length;
        const leftNameList = [this.buildNameList(bracket[0].slice(0, listLength / 2), "left")];
        const brackets = this.buildBrackets();
        const rightNameList = [this.buildNameList(bracket[0].slice(listLength / 2, listLength), "right")];
        const fullGraphic = leftNameList.concat(brackets).concat(rightNameList);
        return (
            <div className="bracket-container">
                {bracket[bracket.length - 1].length === 1 ?
                <div className="win-display">
                    {bracket[bracket.length - 1][0]} WINS!
                </div> : <div/>}
                <div className='tournament'>
                    {fullGraphic}
                </div>
            </div>
        )
    }
}