import {useSocketMatchmaking} from "../../js/socket";
import {useState} from 'react';
import {Redirect, useParams} from 'react-router-dom';
import '../css/matchmaking.css';

function FindingMatch(props) {
    const averageWaitTimeInSeconds = props.averageWaitTimeInSeconds;
    let averageWaitTime = averageWaitTimeInSeconds;
    let averageWaitTimeUnit = "seconds";
    if (averageWaitTimeInSeconds > 60) {
        averageWaitTime = Math.round(averageWaitTimeInSeconds / 60);
        averageWaitTimeUnit = "minutes";
    }
    return (
        <div className="main-menu">
            <div className="main-menu-child text-label">
                Finding a match <br/>
                Average wait time is {averageWaitTime} {averageWaitTimeUnit}
            </div>
        </div>
    );
}

function MatchmakingDisplay(props) {
    if(props.roomID) {
        return (<Redirect to={`/play/${props.roomID}`} />);
    } else {
        return (<FindingMatch averageWaitTimeInSeconds={props.waitTime}/>);
    }
}

export default function Matchmaking(props) {
    const [roomID, setRoomID] = useState(null);
    const [waitTime, setWaitTime] = useState(5);
    const { timeLimit } = useParams();
    useSocketMatchmaking(setRoomID, setWaitTime, timeLimit);
    return (<MatchmakingDisplay roomID={roomID} waitTime={waitTime}/>)
}