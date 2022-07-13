const boto3 = require('boto3');
// Load the AWS SDK for Node.js.
var AWS = require("aws-sdk");
// Set the AWS Region.
AWS.config.update({ region: "REGION" });

// Create DynamoDB service object.
const ddb = new AWS.DynamoDB();

exports.handler = async (event) => {

    const params = {
        // Specify which items in the results are returned.
        FilterExpression: "lastModified + 1000*60*24 < :now",
        // Define the expression attribute value, which are substitutes for the values you want to compare.
        ExpressionAttributeValues: {
            ":now": {S: Date.now().toString()},
        },
        // Set the projection expression, which are the attributes that you want.
        ProjectionExpression: "tourID",
        TableName: "ultimatetictactoe.activeTournaments",
    };

    ddb.scan(params, function (err, data) {
        if (err) {
            console.log("Error", err);
        } else {
            console.log("Success", data);
            data.Items.forEach(function (element, index, array) {
                console.log(
                    "printing",
                    element.tourID.S
                );
            });
        }
    });
    const response = {
        statusCode: 200,
        body: JSON.stringify('Hello from Lambda!'),
    };
    return response;
};
