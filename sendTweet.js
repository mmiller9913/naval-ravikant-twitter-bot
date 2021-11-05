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

    const navalPodClipsOptions = {
        spreadsheetId: '1vtsZKEmpASGPX1ONuZ7W2EzPgjiJn0dxRFIrAgFx3IE',//navalpodclips's tweets
        range: 'sorted_tweets!A2:A',
    };

    let navalismData = await gsapi.spreadsheets.values.get(navalismOptions);
    let navalData = await gsapi.spreadsheets.values.get(navalOptions);
    let navalPodClipsData = await gsapi.spreadsheets.values.get(navalPodClipsOptions);
    const arrayOfNavalismTweets = navalismData.data.values
        .map(item => item.toString().replace(/"/gi, '').split()); //getting rid of quotation marks
    const arrayOfNavalTweets = navalData.data.values
        .map(item => (item + '\n\n@naval').split()); //adding @naval to the end after a line break
    const arrayOfNavalPodClipsTweets = navalPodClipsData.data.values
        .map(item => { //splitting string into two arrays, selecting first array, and adding '\n\n@naval' to the end
            if (item.toString().includes('\n\n- @naval')) {
                return (item.toString().split('\n\n- @naval')[0] + '\n\n@naval').split(); 
            } else return (item.toString().split(' - @naval')[0] + '\n\n@naval').split()
        });
    const combinedArrayOfTweets = arrayOfNavalismTweets.concat(arrayOfNavalTweets).concat(arrayOfNavalPodClipsTweets);
    createTweet(combinedArrayOfTweets);
}

function createTweet(combinedTweets) {
    console.log('Creating tweet');
    //OLD
    let tweet = combinedTweets[Math.floor(Math.random() * combinedTweets.length)].toString();
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