//NOTE: this script runs every X hours using crontab on AWS

require('dotenv').config({ path: '.env' });

const { TwitterClient } = require('twitter-api-client');

const twitterClient = new TwitterClient({
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

//instructuons in this video for connecting to google sheet api
//https://www.youtube.com/watch?v=MiPpQzW_ya0

var { google } = require('googleapis'); //note this was changed from the video, see reasoning here: https://stackoverflow.com/questions/50068449/cant-generate-jwt-client-with-googles-node-js-client-library

function connectToGoogleSheet() {
    //WHEN APP IS RUNNING ON HEROKU
    //const keys = require('./google-credentials.json');
    // // NOTE: to use the google-credentials.json file in heroku, see below link
    // // https://elements.heroku.com/buildpacks/buyersight/heroku-google-application-credentials-buildpack
    // const client = new google.auth.JWT(
    //     keys.client_email,
    //     null,
    //     keys.private_key,
    //     ['https://www.googleapis.com/auth/spreadsheets'] //this is the SCOPE
    // );


    //WHEN USING CRON JOB ON AWS
    const client = new google.auth.JWT(
        process.env.GOOGLE_CLIENT_EMAIL,
        null,
        process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/gm, "\n"), //forced to do this because cron converts \n --> \\n (don't know why)
        ['https://www.googleapis.com/auth/spreadsheets']
    );

    client.authorize(function (err, tokens) {
        if (err) {
            console.log(err);
        } else {
            console.log('Connected to Google Sheet');
            getDataFromGoogleSheets(client);
        }
    })
}

async function getDataFromGoogleSheets(cl) {
    console.log('Getting data from Google Sheet');
    const gsapi = google.sheets({
        version: 'v4',
        auth: cl,
    });

    const navalismOptions = {
        spreadsheetId: '1fplI9y4oRJmUP4ErI8KrxfpAdrDxpSYKOeza5eoBpsE',//navalism's tweets
        range: 'sorted_tweets!A2:A',
    };

    const navalOptions = {
        spreadsheetId: '19bJlIagnKnFyBXQkY2WMcxBq-lHLJDUvSBUwT2yYdeE', //naval's tweets
        range: 'sorted_tweets!A2:A',
    };

    let navalismData = await gsapi.spreadsheets.values.get(navalismOptions);
    let navalData = await gsapi.spreadsheets.values.get(navalOptions);
    const arrayOfNavalismTweets = navalismData.data.values;
    const arrayOfNavalTweets = navalData.data.values;
    const combinedArrayOfTweets = arrayOfNavalismTweets.concat(arrayOfNavalTweets);
    createTweet(combinedArrayOfTweets);
}

function createTweet(combinedTweets) {
    console.log('Creating tweet');
    let tweet = combinedTweets[Math.floor(Math.random() * combinedTweets.length)].toString().replace(/"/gi, '').replace(/\n\n@naval/gi, '');
    tweet = `${tweet}\n\n@naval`;
    if (tweet.length > 280) {
        createTweet(combinedTweets);
    } else sendTweet(tweet);
};

function sendTweet(tweet) {
    console.log('Sending tweet');
    twitterClient.tweets.statusesUpdate({
        status: tweet
    }).then(response => {
        console.log("Tweet sent", response)
    }).catch(err => {
        console.error(err)
    })
}

connectToGoogleSheet();