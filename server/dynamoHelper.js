const AWS = require("aws-sdk");
const { dynamodbTableInfo, TwoWayMap, salt } = require('./constants');
const schemas = require('./dynamoSchemas');
const { TournamentManager } = require('./tournamentHandler');

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

class DynamoHelper {
    constructor() {
        this.dynamodb = new AWS.DynamoDB();
        this.createTables();
        this.initializedTournaments = new Set();
    }

    checkError(err, data, errorMessage) {
        if (err) {
            console.error(errorMessage, JSON.stringify(err, null, 2));
            return true;
        } else {
            //console.log("Success.", JSON.stringify(data, null, 2));
            return false;
        }
    }

    async createTables() {
        await this.dynamodb.listTables({}, (err, data) => {
            if (err) {
                console.error("Error JSON.", JSON.stringify(err, null, 2));
            } else {
                dynamodbTableInfo.tables.forEach((table) => {
                    if (!data['TableNames'].includes(table.name)) {
                        this.createTable(table);
                    }
                });
            }
        }).promise();
    }

    createTable(table) {
        const params = {
            TableName : table.name,
            KeySchema: Object.entries(table.keySchema).map((kv_pair) =>
                {return {AttributeName: kv_pair[0], KeyType: kv_pair[1]}}
            ),
            GlobalSecondaryIndexes: Object.entries(table.secondKeySchema).map((kv_pair) =>
            {
                return {
                    IndexName: kv_pair[0],
                    KeySchema: [{AttributeName: kv_pair[0], KeyType: kv_pair[1].type}],
                    Projection: {
                        ProjectionType: kv_pair[1].include,
                    }
                }
            }),
            AttributeDefinitions: Object.entries(table.typeSchema).map((kv_pair) =>
                {return {AttributeName: kv_pair[0], AttributeType: kv_pair[1]}}
            ),
            BillingMode: "PAY_PER_REQUEST",
        };
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

    putNewItem(idObj, tableName) {
        const params = {
            Item: idObj,
            TableName: tableName
        };
        this.dynamodb.putItem(
            params,
            (err, data) => this.checkError(err, data, `failed to putNewItem for table ${tableName}`)
        );
    }

    convertRecordToJSON(record) {
        const newRecord = {};
        for(let k in record) {
            newRecord[k] = Object.values(record[k])[0]
        }
        return newRecord;
    }

    resolveTypes(data, schema) {
        for(let k in schema) {
            if(k in data) {
                if(schema[k].type === "json")
                    data[k] = JSON.parse(data[k]);
                else if(schema[k].type === "bool")
                    data[k] = data[k] || (data[k] === 'true');
                else if(schema[k].type === "int")
                    data[k] = parseInt(data[k]);
                else if(schema[k].type === "twoWayMap")
                    data[k] = new TwoWayMap(JSON.parse(data[k]));
            }

        }
        return data;
    }

    async getItem(idObj, tableName, jsonSchema, insertMissingFields=false, putIfNotExists=false) {
        const params = {
            Key: idObj,
            TableName: tableName
        };
        try {
            const response = await this.dynamodb.getItem(params, (err, data) => {
                if (err) {
                    console.error(`failed to getItem from ${tableName}`, JSON.stringify(err, null, 2));
                } else {
                    if (!this.checkError(err, data)) {
                        return data;
                    }
                }
            }).promise();

            if (putIfNotExists && (response.Item === undefined)) {
                await this.putNewItem(idObj, tableName);
                await this.setFields(idObj, tableName, {"dateCreated": Date.now().toString()});
                return await this.getItem(idObj, tableName, jsonSchema, insertMissingFields);
            }

            if(insertMissingFields) {
                const missingFields = []
                for(let f in jsonSchema) {
                    if(!(f in response.Item))
                        missingFields.push(f);
                }
                if(missingFields.length > 0) {
                    await this.addMissingFields(idObj, tableName, missingFields, jsonSchema);
                    return await this.getItem(idObj, tableName, jsonSchema);
                }
            }

            return this.resolveTypes(this.convertRecordToJSON(response.Item), jsonSchema);
        } catch (e) {
            console.log(`failed to get user, error: ${e}`)
        }
    }

    async getUser(token) {
        return await this.getItem({
            "token": {
                S: token
            },
        }, "ultimatetictactoe.users", schemas.json.userSchema, true, true);
    }

    async getGame(id) {
        return await this.getItem({
            "roomID": {
                S: id
            },
        }, "ultimatetictactoe.games", schemas.json.gameSchema);
    }

    async getTour(id) {
        return await this.getItem({
            "tourID": {
                S: id,
            },
        }, "ultimatetictactoe.activeTournaments", schemas.json.tourSchema);
    }

    async setLastModified(idObj, tableName) {
        await this.setFields(idObj, tableName, {});
    }

    appendLastModifiedToParams(params) {
        params.ExpressionAttributeNames[`#FL`] = "lastModified";
        params.ExpressionAttributeValues[`:vL`] = {S: Date.now().toString()};
    }

    // assumes user exists
    async setPassword(username, password) {
        const setFields = this.setFields.bind(this);
        const hash = salt(password);
        await setFields({token: {S: username}}, 'ultimatetictactoe.users', {'password': hash});
    }

    async setFields(idObj, tableName, field_dict) {
        const params = {
            Key: idObj,
            ExpressionAttributeNames: {},
            ExpressionAttributeValues: {},
            TableName: tableName
        };
        const updateExpressions = [];
        let i = 0;
        for(const f in field_dict) {
            params.ExpressionAttributeNames[`#F${i}`] = f;
            params.ExpressionAttributeValues[`:v${i}`] = {
                [schemas.json.getSchema(tableName)[f].dynamoAttrType]: field_dict[f]
            }
            updateExpressions.push(`#F${i} = :v${i}`);
            i++;
        }

        if(!('lastModified' in field_dict)) {
            this.appendLastModifiedToParams(params);
            params.UpdateExpression = "SET #FL = :vL";
        }
        if(updateExpressions.length > 0) params.UpdateExpression += `, ${updateExpressions.join(", ")}`
        await this.dynamodb.updateItem(
            params, (err, data) =>
                this.checkError(err, data, "failed to updateFields")
        ).promise();
    }

    async updateGame(id, field_dict) {
        await this.setFields({
            "roomID": {
                S: id
            },
        }, "ultimatetictactoe.games", field_dict);
    }

    async updateTour(id, field_dict) {
        await this.setFields({
            "tourID": {
                S: id
            },
        }, "ultimatetictactoe.activeTournaments", field_dict);
    }

    async addMissingFields(idObj, tableName, missingFields, jsonSchema) {
        const field_dict = {};
        missingFields.forEach(f => {
            field_dict[f] = schemas.getDefaultValue(jsonSchema[f].dynamoAttrType);
        })
        await this.setFields(idObj, tableName, field_dict);
    }

    async addToField(idObj, tableName, fieldName, value) {
        const params = {
            Key: idObj,
            ExpressionAttributeNames: {
                "#F": fieldName
            },
            ExpressionAttributeValues: {
                ":v": {
                    [schemas.json.getSchema(tableName)[fieldName].dynamoAttrType]: value.toString()
                }
            },
            UpdateExpression: "ADD #F :v",
            TableName: tableName
        };
        await this.dynamodb.updateItem(
            params,
            (err, data) => this.checkError(err, data, "failed to addToField")
        ).promise();
        await this.setLastModified(idObj, tableName);
    }

    async addScore(token, fieldName, value) {
        const idObj = {
            "token": {
                S: token
            },
        };
        await this.addToField(idObj, "ultimatetictactoe.users", fieldName, value);
        if(fieldName !== "xp")
            await this.addScore(token, "xp", (fieldName === "gamesWon") ? "5" : "1");
    }

    async addTournamentPlacement(token, placement) {
        const idObj = {
            "token": {
                S: token
            },
        };
        const params = {
            Key: idObj,
            ExpressionAttributeNames: {
                "#F": "tournamentPlacements"
            },
            ExpressionAttributeValues: {
                ":p": {
                    L: [{S: placement}]
                }
            },
            UpdateExpression: "SET #F = list_append(#F, :p)",
            TableName: "ultimatetictactoe.users"
        };
        await this.dynamodb.updateItem(
            params,
            (err, data) => this.checkError(err, data, "failed to addTournamentPlacement")
        ).promise();

        await this.updateBestTournamentPlacement(token, placement);

        const [n, d] = placement.split("/").map(p => parseFloat(p));
        if(n === 1)
            await this.addScore(token, "tournamentWins", 1);
        else {
            await this.addScore(token, "xp", Math.ceil(Math.log(d) + (3 * (d - n) / n)));
        }
    }

    async updateBestTournamentPlacement(token, newPlacement) {
        const user = await this.getUser(token);
        if(("bestTournamentPlacement" in user) && (user["bestTournamentPlacement"] !== "")) {
            const oldPlacement = user["bestTournamentPlacement"];

            if(oldPlacement && oldPlacement.length >= 3) {
                const [oldN, oldD] = oldPlacement.split("/").map(p => parseFloat(p));
                const [newN, newD] = newPlacement.split("/").map(p => parseFloat(p));
                if ((newN / newD) > (oldN / oldD) ||
                    ((newN / newD) == (oldN / oldD) && (newN > oldN))) {
                    return;
                }
            }
        }
        await this.setFields({
            "token": {
                S: token
            },
        }, "ultimatetictactoe.users", {"bestTournamentPlacement": newPlacement});
    }

    async winGame(winnerToken, loserToken) {
        await this.addScore(winnerToken, "gamesWon", "1");
        await this.addScore(loserToken, "gamesLost", "1");
    }

    async initializeRoomsForTournaments(instanceIndex, id2manager) {
        const params = {
            TableName: "ultimatetictactoe.activeTournaments",
            IndexName: "instanceIndex",
            ExpressionAttributeValues: {
                ":i": {N: instanceIndex.toString()}
            },
            FilterExpression: "instanceIndex = :i",
        };
        const data = await this.dynamodb.scan(
            params,
            (err, data) => this.checkError(err, data, "failed to initializeRoomsForTournaments")
        ).promise();
        const items = data["Items"];
        items.forEach(item => {
            const data = this.resolveTypes(this.convertRecordToJSON(item), schemas.json.tourSchema);
            const id = data.tourID;
            id2manager[id] = new TournamentManager(id2manager, id, null, this, data);
        })
        this.initializedTournaments.add(instanceIndex);
    }
}

module.exports = DynamoHelper;