import {useSocketMatchmaking} from "../../js/socket";
import {useState} from 'react';
import {Redirect} from 'react-router-dom';
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

export default function Matchmaking(props) {
    const [roomID, setRoomID] = useState(null);
    const [waitTime, setWaitTime] = useState(5);
    const matchFoundCallback = ((roomID) => {
        setRoomID(roomID);
    }).bind(this);
    useSocketMatchmaking(matchFoundCallback, setWaitTime);
    if(roomID) {
        return (<Redirect to={`/play/${roomID}`} />);
    } else {
        return (<FindingMatch averageWaitTimeInSeconds={waitTime}/>);
    }
}