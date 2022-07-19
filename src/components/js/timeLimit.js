function TimeLimit(props){
    return (<div className="time-limit-container">
        <input className="time-limit-checkbox" type="checkbox" checked={props.timeLimitEnabled} onChange={
            () => {
                props.eventTracker('timeLimitEnabled', props.timeLimitEnabled ? 'off' : 'on');
                props.setTimeLimitEnabled(!props.timeLimitEnabled);
            }
        }/>
        {props.timeLimitEnabled ? <div className="time-limit-text-label">
            <input size={1} className="time-limit-input" type="number"
                   value={props.timeLimit} onChange={e => {props.setTimeLimit(e.target.value)}} /> seconds
        </div> : <div className="time-limit-text-label">
            time limit?
        </div>}
    </div>)
}

export { TimeLimit }