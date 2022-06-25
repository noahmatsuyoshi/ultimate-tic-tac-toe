import '../css/experienceBar.css';

function xpToLevel(xp) {
    return Math.log2(3 * xp);
}

function levelToXP(level) {
    return Math.pow(2, level) / 3;
}

export default function ExperienceBar(props) {
    let level = 0;
    let remainingXPPercent = 0;
    if(props.xp)
    if(props.xp !== 0) {
        level = xpToLevel(props.xp);
        const levelAbove = Math.ceil(level);
        const levelBelow = Math.floor(level);
        level = Math.floor(level);
        if(level !== levelAbove) {
            const xpBelow = levelToXP(levelBelow)
            const xpAbove = levelToXP(levelAbove)
            const range = xpAbove - xpBelow;
            remainingXPPercent = 100 * (props.xp - xpBelow) / range;
        }
    }

    return (
        <div className="experience-bar">
            <div className="experience-fill" style={{width: `${remainingXPPercent}%`}}>
            </div>
            <div className="level-text-container">
                Level {level}
            </div>
        </div>
    )
}