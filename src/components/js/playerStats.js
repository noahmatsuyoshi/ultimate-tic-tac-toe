import {convertCamelCaseToUpper, getPlayerToken, getToken, getUsername} from '../../js/constants'
import {useState, useEffect} from "react";
import '../css/playerStats.css';
import {sleep} from '../../js/constants';

const playerStatsList = ["gamesWon", "gamesLost", "bestTournamentPlacement", "tournamentWins"]

export default function PlayerStats(props) {
    const [stats, setStats] = useState(false);
    useEffect(async () => {
        const token = getToken();
        if(!stats || (Object.keys(stats).length === 0))
            await getUserStats(token, setStats);
    })
    if(!stats) return (<div className="main-container stats-text"></div>)
    else return (<div className="main-container stats-text">
        {stats.map(t => <div className="stats-text">{t[0]}: {t[1]}</div>)}
    </div>)
}

async function refreshStats(token, setStats) {
    await sleep(1);
    await getUserStats(token, setStats);
}

export async function getXP(token, setXP) {
    fetch("/getStats")
        .then(res => {console.log(res); return res;})
        .then(res => res.json())
        .then(async res => {
            setXP(res.stats.xp);
        });
}

export async function getUserStats(token, setStats) {
    fetch("/getStats")
        .then(res => {console.log(res); return res;})
        .then(res => res.json())
        .then(async res => {
            const stats = res.stats;
            if(!stats || (Object.keys(stats).length === 0)) {
                await refreshStats(token, setStats);
                return;
            }
            const newData = [];
            playerStatsList.forEach(statName => {
                if(!stats[statName])
                    console.log(stats[statName])
                    newData.push([convertCamelCaseToUpper(statName), stats[statName]]);
            })
            setStats(newData);
        });
}