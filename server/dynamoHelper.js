const AWS = require("aws-sdk");
const { dynamodbTableInfo } = require('./constants');

if(process.env.NODE_ENV == 'development') {
    AWS.config.update({
        region: "local",
        endpoint: "http://localhost:8000"
    });
} else {
    AWS.config.update({
        region: "us-west-2",
        endpoint: "dynamodb.us-west-2.amazonaws.com"
    });
}

function getUserSchema(token) {
    return {
        "token": {
            S: token
        },
        "gamesWon": {
            N: "0"
        },
        "gamesLost": {
            N: "0"
        },
        "tournamentPlacements": {
            L: []
        },
        "tournamentWins": {
            N: "0"
        },
        "bestTournamentPlacement": {
            S: ""
        }
    }
}
const userFieldList = Object.keys(getUserSchema(""))

class DynamoHelper {
    constructor() {
        this.dynamodb = new AWS.DynamoDB();
        this.createTables();
    }

    checkError(err, data, errorMessage) {
        if (err) {
            console.error(errorMessage, JSON.stringify(err, null, 2));
            return true;
        } else {
            console.log("Success.", JSON.stringify(data, null, 2));
            return false;
        }
    }

    createTables() {
        this.dynamodb.listTables({}, (err, data) => {
            if (err) {
                console.error("Error JSON.", JSON.stringify(err, null, 2));
            } else {
                dynamodbTableInfo.tables.forEach((table) => {
                    if (!data['TableNames'].includes(table.name)) {
                        this.createTable(table);
                    }
                });
            }
        });
    }

    createTable(table) {
        const params = {
            TableName : table.name,
            KeySchema: Object.entries(table.keySchema).map((kv_pair) =>
                {return {AttributeName: kv_pair[0], KeyType: kv_pair[1]}}
            ),
            AttributeDefinitions: Object.entries(table.typeSchema).map((kv_pair) =>
                {return {AttributeName: kv_pair[0], AttributeType: kv_pair[1]}}
            ),
            BillingMode: "PAY_PER_REQUEST",
        };
        console.log(params);
        this.dynamodb.createTable(params, (err, data) => this.checkError(err, data, "failed to createTable"));
    }

    putWaitTime(waitTimeInSeconds) {
        const params = {
            Item: {
                "match_date": {
                    S: (new Date()).toLocaleDateString()
                },
                "match_time": {
                    S: (new Date()).toLocaleTimeString()
                },
                "waitTimeInSeconds": {
                    N: waitTimeInSeconds.toString()
                }
            },
            TableName: "ultimatetictactoe.wait-time"
        };
        this.dynamodb.putItem(params, (err, data) => this.checkError(err, data, "failed to putWaitTime"));
    }

    getTodaysWaitTime(setWaitTime) {
        const params = {
            ExpressionAttributeValues: {
                ":v1": {
                    S: (new Date()).toLocaleDateString()
                }
            },
            KeyConditionExpression: "match_date = :v1",
            ProjectionExpression: "waitTimeInSeconds",
            TableName: "ultimatetictactoe.wait-time"
        };
        this.dynamodb.query(params, (err, data) => {
            if (err) {
                console.error("failed to getTodaysWaitTime", JSON.stringify(err, null, 2));
            } else {
                if(data['Items'].length === 0) return
                let waitTime = 0;
                data['Items'].forEach((item) => {
                    waitTime += item['waitTimeInSeconds'].N
                })
                const avgWaitTime = Math.round(waitTime / data['Items'].length)
                setWaitTime(avgWaitTime);
            }
        });
    }

    putNewUser(token) {
        const params = {
            Item: getUserSchema(token),
            TableName: "ultimatetictactoe.users"
        };
        this.dynamodb.putItem(params, (err, data) => this.checkError(err, data, "failed to putNewUser"));
    }

    async getUser(token) {
        const params = {
            Key: {
                "token": {
                    S: token
                },
            },
            TableName: "ultimatetictactoe.users"
        };
        try {
            const user = await this.dynamodb.getItem(params, (err, data) => {
                if (err) {
                    console.error("failed to getUser", JSON.stringify(err, null, 2));
                } else {
                    if (!this.checkError(err, data)) {
                        if (Object.keys(data).length === 0) {
                            console.log("new user")
                            this.putNewUser(token);
                        }
                        return data;
                    }
                }
            }).promise();
            console.log(user);
            const missingFields = userFieldList.map(f => {
                if(!(f in user["Item"]))
                    return f;
            }).filter(f => f !== undefined);
            console.log(missingFields);
            if(missingFields.length > 0) {
                await this.updateMissingFields(token, missingFields)
                return await this.getUser(token);
            }

            return user["Item"];
        } catch (e) {
            console.log(`failed to get user, error: ${e}`)
        }
    }

    async updateMissingFields(token, missingFields) {
        const defaultData = getUserSchema("");
        for(let i = 0; i < missingFields.length; i++) {
            const f = missingFields[i]
            const params = {
                Key: {"token": {S: token}},
                ExpressionAttributeNames: {
                    "#F": f
                },
                ExpressionAttributeValues: {
                    ":v": defaultData[f]
                },
                UpdateExpression: "SET #F = :v",
                TableName: "ultimatetictactoe.users"
            };
            await this.dynamodb.updateItem(params,
                (err, data) =>
                    this.checkError(err, data, "failed to updateMissingFields")
            ).promise();
        }

    }

    updateScore(token, fieldName, value) {
        const params = {
            Key: {
                "token": {
                    S: token
                },
            },
            ExpressionAttributeNames: {
                "#F": fieldName
            },
            ExpressionAttributeValues: {
                ":v": {
                    N: value.toString()
                }
            },
            UpdateExpression: "ADD #F :v",
            TableName: "ultimatetictactoe.users"
        };
        this.dynamodb.updateItem(params, (err, data) => this.checkError(err, data, "failed to updateScore"));
    }

    addTournamentPlacement(token, placement) {
        const params = {
            Key: {
                "token": {
                    S: token
                },
            },
            ExpressionAttributeNames: {
                "#F": "tournamentPlacements"
            },
            ExpressionAttributeValues: {
                ":p": {
                    L: [placement]
                }
            },
            UpdateExpression: "ADD #F :p",
            TableName: "ultimatetictactoe.users"
        };
        this.dynamodb.updateItem(params, (err, data) => this.checkError(err, data, "failed to addTournamentPlacement"));
        this.updateBestTournamentPlacement(token, placement);
        if(placement === 1)
            this.updateScore(token, "tournamentWins", 1);
    }

    async updateBestTournamentPlacement(token, newPlacement) {
        const user = await this.getUser(token);
        if(("bestTournamentPlacement" in user) && (user["bestTournamentPlacement"] !== "")) {
            const oldPlacement = user["bestTournamentPlacement"];

            const [oldN, oldD] = oldPlacement.split("/");
            const [newN, newD] = newPlacement.split("/");
            if ((newN / newD) > (oldN / oldD) ||
                ((newN / newD) == (oldN / oldD) && (newN > oldN))) {
                return;
            }
        }
        const params = {
            Key: {
                "token": {
                    S: token
                },
            },
            ExpressionAttributeNames: {
                "#F": "bestTournamentPlacement"
            },
            ExpressionAttributeValues: {
                ":p": {
                    S: newPlacement
                }
            },
            UpdateExpression: "SET #F = :p",
            TableName: "ultimatetictactoe.users"
        };
        this.dynamodb.updateItem(params, (err, data) => this.checkError(err, data, "failed to update bestTournamentPlacement"));

    }

    winGame(winnerToken, loserToken) {
        console.log("game won");
        this.updateScore(winnerToken, "gamesWon", 1);
        this.updateScore(loserToken, "gamesLost", 1);
    }
}

module.exports = DynamoHelper;