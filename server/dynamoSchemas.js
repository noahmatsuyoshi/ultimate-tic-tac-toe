module.exports.json = {};

// all schemas: [name, dynamo_type, js_type]

const gameSchemaJSON = {
    id: {
        dynamoAttrType: "S",
        type: "string",
    },
    lastModified: {
        dynamoAttrType: "N",
        type: "int",
    },
    dateCreated: {
        dynamoAttrType: "N",
        type: "int",
    },
    firstPlayer: {
        dynamoAttrType: "S",
        type: "string",
    },
    nextIndex: {
        dynamoAttrType: "S",
        type: "int",
    },
    xNext: {
        dynamoAttrType: "BOOL",
        type: "bool",
    },
    playerTokens: {
        dynamoAttrType: "S",
        type: "twoWayMap",
    },
    boards: {
        dynamoAttrType: "S",
        type: "json",
    },
    wonBoards: {
        dynamoAttrType: "S",
        type: "json",
    },
}
module.exports.json.gameSchema = gameSchemaJSON;

const userSchemaJSON = {
    token: {
        dynamoAttrType: "S",
        type: "string",
    },
    lastModified: {
        dynamoAttrType: "N",
        type: "int",
    },
    dateCreated: {
        dynamoAttrType: "N",
        type: "int",
    },
    gamesWon: {
        dynamoAttrType: "N",
        type: "int",
    },
    gamesLost: {
        dynamoAttrType: "N",
        type: "int",
    },
    tournamentPlacements: {
        dynamoAttrType: "L",
        type: "list",
    },
    tournamentWins: {
        dynamoAttrType: "N",
        type: "int",
    },
    bestTournamentPlacement: {
        dynamoAttrType: "S",
        type: "string",
    },
    xp: {
        dynamoAttrType: "N",
        type: "int",
    },
};
module.exports.json.userSchema = userSchemaJSON;

const tourSchemaJSON = {
    id: {
        dynamoAttrType: "S",
        type: "string",
    },
    lastModified: {
        dynamoAttrType: "N",
        type: "int",
    },
    instanceIndex: {
        dynamoAttrType: "N",
        type: "int",
    },
    dateCreated: {
        dynamoAttrType: "N",
        type: "int",
    },
    firstPlayer: {
        dynamoAttrType: "S",
        type: "string",
    },
    started: {
        dynamoAttrType: "BOOL",
        type: "bool",
    },
    tokenToName: {
        dynamoAttrType: "S",
        type: "twoWayMap",
    },
    tokenToRoom: {
        dynamoAttrType: "S",
        type: "json",
    },
    survived: {
        dynamoAttrType: "S",
        type: "json",
    },
    bracket: {
        dynamoAttrType: "S",
        type: "json",
    },
    settings: {
        dynamoAttrType: "S",
        type: "json",
    },
    winnerToken: {
        dynamoAttrType: "S",
        type: "string",
    }
}
module.exports.json.tourSchema = tourSchemaJSON;

module.exports.json.getSchema = (tableName) => {
    if(tableName === "ultimatetictactoe.users") {
        return userSchemaJSON;
    } else if(tableName === "ultimatetictactoe.games") {
        return gameSchemaJSON;
    } else if(tableName === "ultimatetictactoe.activeTournaments") {
        return tourSchemaJSON;
    }
}

function convertSchema(schemaJSON) {
    const schema = {}
    for(let k in schemaJSON) {
        const dynamoAttrType = schemaJSON[k].dynamoAttrType;
        const defaultValue = (dynamoAttrType === "S") ? "" : (
            (dynamoAttrType === "N") ? "0" : "false"
        )
        schema[k] = {}
        schema[k][dynamoAttrType] = defaultValue;
    }
    return schema
}

module.exports.gameSchema = convertSchema(gameSchemaJSON);
console.log(module.exports.gameSchema)

const userSchema = convertSchema(userSchemaJSON);
module.exports.userSchema = userSchema;
console.log(userSchema)

module.exports.tourSchema = convertSchema(tourSchemaJSON);

module.exports.getUserSchema = (token) => {
    const schema = Object.assign(userSchema)
    schema.token.S = token;
    return schema
}

module.exports.getDefaultValue = (dynamoAttrType) => {
    if(dynamoAttrType === "N")
        return "0"
    else if(dynamoAttrType === "L")
        return []
    else
        return ""
}