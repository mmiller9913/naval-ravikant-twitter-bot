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

var {google} = require('googleapis'); //note this was changed from the video, see reasoning here: https://stackoverflow.com/questions/50068449/cant-generate-jwt-client-with-googles-node-js-client-library
const keys = require('./google-credentials.json');

//note: to use the google-credentials.json file in heroku, see below link
    //https://elements.heroku.com/buildpacks/buyersight/heroku-google-application-credentials-buildpack
function startProcess(){
    const client = new google.auth.JWT(
    keys.client_email,
    null,
    keys.private_key,
    ['https://www.googleapis.com/auth/spreadsheets'] //this is the SCOPE
    );

    client.authorize(function(err,tokens) {
    if(err) {
        console.log(err);
    } else {
        console.log('connected');
        gsrun(client);
    }
    })
}

async function gsrun(cl) {
  const gsapi = google.sheets({
    version:'v4',
    auth: cl,
  });

  const navalismOptions = {
    spreadsheetId: '1fplI9y4oRJmUP4ErI8KrxfpAdrDxpSYKOeza5eoBpsE',//navalism's tweets
    range:'sorted_tweets!A2:A',
  };

  const navalOptions = {
    spreadsheetId:'19bJlIagnKnFyBXQkY2WMcxBq-lHLJDUvSBUwT2yYdeE', //naval's tweets
    // range:'sorted_tweets!A2:A',
    range:'sorted_tweets!A2:A',
  };

  let navalismData = await gsapi.spreadsheets.values.get(navalismOptions);
  let navalData = await gsapi.spreadsheets.values.get(navalOptions);
  const arrayOfNavalismTweets = navalismData.data.values;
  const arrayOfNavalTweets = navalData.data.values;
  const combinedArrayOfTweets = arrayOfNavalismTweets.concat(arrayOfNavalTweets);
  createTweet(combinedArrayOfTweets);
}

function createTweet(combinedTweets) {
    let tweet = combinedTweets[Math.floor(Math.random() * combinedTweets.length)].toString().replace(/"/gi, '').replace(/\n\n@naval/gi, '');
    tweet = `${tweet}\n\n@naval`;
    if (tweet.length > 280) {
        createTweet();
    }
    // console.log(tweet);
    sendTweet(tweet);
  };

function sendTweet(tweet) {
    twitterClient.tweets.statusesUpdate({
        status: tweet
    }).then(response => {
        console.log("Tweeted!", response)
    }).catch(err => {
        console.error(err)
    })
}

setInterval(function () {
    var date = new Date();
    const hour = date.getHours();
    const minutes = date.getMinutes();
    if (hour === 13 && minutes === 00 || hour === 16 && minutes === 00 || hour === 19 && minutes === 00 || hour === 01 && minutes === 00) {
        startProcess();
    }
}, 60000) //runs every 1 minute


// startProcess();

//OLD
// const arrayOfTweetsFromNaval = require('./arrayOfTweetsFromNaval');
// const arrayOfTweetsFromNavalism = require('./arrayOfTweetsFromNavalism');
// let tweet;
// function getItemFromArray() {
//     tweet = arrayOfTweetsFromNavalism[Math.floor(Math.random() * arrayOfTweetsFromNavalism.length)];
//     // tweet = `"${tweet}" - @kapilguptamd`;
//     tweet = `${tweet}\n\n@naval`;
//     if (tweet.length > 280) {
//         getItemFromArray();
//     }
//     return tweet;
// }

// function writeTweet() {
//     tweet = getItemFromArray();
//     twitterClient.tweets.statusesUpdate({
//         status: tweet
//     }).then(response => {
//         console.log("Tweeted!", response)
//     }).catch(err => {
//         console.error(err)
//     })
// }

// setInterval(function () {
//     var date = new Date();
//     const hour = date.getHours();
//     const minutes = date.getMinutes();
//     if (hour === 13 && minutes === 00 || hour === 16 && minutes === 00 || hour === 19 && minutes === 00 || hour === 01 && minutes === 00) {
//         writeTweet();
//     }
// }, 60000) //runs every 1 minute

// // writeTweet();