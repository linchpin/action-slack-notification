const log = require('loglevel')
const fs = require('fs')
const request = require('request')

if ( ! process.env.GITHUB_WORKSPACE ) {
	require('dotenv').config({path:'.env'});
}

let contents = fs.readFileSync("template-start.json");
let json     = JSON.parse(contents);
const moment = require('moment');

if ( ! process.env.NOTIFICATION_ICON ) {
	process.env.NOTIFICATION_ICON = 'https://raw.githubusercontent.com/linchpin/action-slack-notification/master/images/in-progress.png';
}

const textMap = {
  NOTIFICATION_ICON: process.env.NOTIFICATION_ICON,
  BUILD_STATUS: process.env.BUILD_STATUS,
  BUILD_STATUS_MESSAGE: process.env.BUILD_STATUS_MESSAGE,
  ENVIRONMENT: process.env.ENVIRONMENT,
  SITE_URL: process.env.SITE_URL,
  SITE_URL_SHORT: process.env.SITE_URL.replace(/(^\w+:|^)\/\//, ''),
  COMMITTER: process.env.GITHUB_ACTOR,
  SITE_IMAGE_URL: process.env.SITE_IMAGE_URL,
  TIMESTAMP: moment().format('MMMM Do YYYY, h:mm:ss A'),
  CHANNEL_ID: process.env.CHANNEL_ID
}

const parse = (template, textMap) => {
  let output = template

  for (let [id, text] of Object.entries(textMap)) {
    output = output.replace(new RegExp(`\\$\{${id}}`, 'mg'), text)
  }

  return output
}

const parsed = parse(contents.toString(), textMap)

var url = "https://slack.com/api/chat.postMessage";

var headers = {
   "Authorization": "Bearer " + process.env.SLACK_BOT_TOKEN,
   "Content-Type" : "application/json"
}

request.post({
   "url": url,
   "headers": headers,
   "body": parsed
}, (err, response, body) => {
   if (err) {
       reject(err);
   }
   console.log("response: ", JSON.stringify(response));
   console.log("body: ",body);
});