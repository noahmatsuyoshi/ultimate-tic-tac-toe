import { useState } from 'react';
import '../css/rps.css';

const move2imgStr = {
    "r": "/rock.png",
    "p": "/paper.png",
    "s": "/scissors.png"
}

function Rps(props) {
    const [selectedMove, setSelectedMove] = useState(null);
    const [lockCursor, setLockCursor] = useState(false);
    if(props.rps.move && props.rps.move !== selectedMove) setSelectedMove(props.rps.move);
    if((props.rps.move || props.rps.tie) && lockCursor) setLockCursor(false);
    return (<div className="parent-container">
        <div className="tiebreaker">TIEBREAKER: Rock Paper Scissors</div>
        <div className="rps-game">
            {[RpsChoice(props, 'r', move2imgStr['r'], selectedMove, setSelectedMove, lockCursor, setLockCursor),
              RpsChoice(props, 'p', move2imgStr['p'], selectedMove, setSelectedMove, lockCursor, setLockCursor),
              RpsChoice(props, 's', move2imgStr['s'], selectedMove, setSelectedMove, lockCursor, setLockCursor)]}
        </div> 
        <div className="opp-choice-container">
            {props.rps.oppMove ? <div>
                Your opponent chose <br/>
                <img src={process.env.PUBLIC_URL + move2imgStr[props.rps.oppMove]} />
            </div> : (props.rps.active ? <div/> : <div>Waiting for opponent's choice</div>)}
        </div>
        <div className="tie-container">{props.rps.tie ? "You tied, try again" : ""}</div>
    </div>);
}

function RpsChoice(props, move, imgStr, selectedMove, setSelectedMove, lockCursor, setLockCursor) {
    return (<div className="rps-choice">
        <button className="rps-image-container" 
        onClick={() => {
            if(props.rps.active) {
                props.sendRpsMove(move);
                setLockCursor(true);
            }
        }} 
        onMouseEnter={() => {if(!props.rps.move && !lockCursor) setSelectedMove(move)}}>
            <img src={process.env.PUBLIC_URL + imgStr} />
        </button>
        <div className="rps-arrow-container">
            {selectedMove === move ? 
            <img className="rps-arrow" src={process.env.PUBLIC_URL + "/arrow.png"} /> :
            <div className="rps-arrow" />}
        </div>
    </div>)
}

export default Rps;