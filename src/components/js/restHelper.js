export function getUser() {
    fetch(`${window.location.href}getUser`)
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