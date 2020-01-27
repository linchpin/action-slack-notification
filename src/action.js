const log = require('loglevel');
const fs = require('fs');
const request = require('request');

let event  = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'))
let folder = "/action/";

// For local development
if ( ! process.env.GITHUB_WORKSPACE ) {
	require('dotenv').config({path:'.env'});
	folder = "";
}

let contents = fs.readFileSync(folder + "template.json");

let json     = JSON.parse(contents);
const moment = require('moment');
const tz     = require('moment-timezone');

if ( process.env.VERSION && process.env.BUILD_STATUS === 'completed' ) {
	const readme_file = fs.readFileSync(process.env.HOME + '/Desktop/workflows/README.md', 'utf8');
	const regex = /#+\s?Changelog\s*(?:(?:#{2,})\s(v\d\.\d(?:\.\d)?))([\s\S]*?)(?:(?:#+)\s(?:v\d\.\d(?:\.\d)?)){1}/;
	const changes = readme_file.match(regex);

	if ( (typeof changes[1] !== 'undefined' && 'refs/tags/' + changes[1] === event.ref ) && ( typeof changes[2] !== 'undefined' ) ) {
		json.blocks.push( {
			"type": "divider"
		});
		json.blocks.push( {
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": "*New website improvements*\n" + changes[2]
			} 
		});
	}
}

json.blocks.push( {
	"type": "context",
	"elements": [
		{
			"type": "mrkdwn",
			"text": "${TIMESTAMP}"
		}
	]
} );

contents = JSON.stringify( json );

if ( ! process.env.SITE_IMAGE_URL ) {
	process.env.SITE_IMAGE_URL = 'https://raw.githubusercontent.com/linchpin/action-slack-notification/master/images/default-client-image.png';
}

if ( ! process.env.NOTIFICATION_ICON ) {
	switch( process.env.BUILD_STATUS ) {
	  case 'completed':
	    process.env.NOTIFICATION_ICON = 'https://raw.githubusercontent.com/linchpin/action-slack-notification/master/images/success.png';
	    break;
	  case 'failed':
	    process.env.NOTIFICATION_ICON = 'https://raw.githubusercontent.com/linchpin/action-slack-notification/master/images/fail.png';
	    break;
	  default:
	    process.env.NOTIFICATION_ICON = 'https://raw.githubusercontent.com/linchpin/action-slack-notification/master/images/in-progress.png';
	}
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
  TIMESTAMP: moment().tz('America/New_York').format('MMMM Do YYYY, h:mm:ss A'),
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