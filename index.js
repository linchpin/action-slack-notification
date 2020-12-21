const core = require('@actions/core');
const fs = require('fs');
const axios = require('axios');
const moment = require('moment');
const tz = require('moment-timezone');

const slackTemplate = {
    "channel": "${CHANNEL_ID}",
    "text": "${BUILD_STATUS_SUMMARY}",
    "blocks": [
        {
            "type": "context",
            "elements": [
                {
                    "type": "image",
                    "image_url": "${NOTIFICATION_ICON}",
                    "alt_text": "In-progress icon"
                },
                {
                    "type": "mrkdwn",
                    "text": "${BUILD_STATUS_MESSAGE}"
                }
            ]
        },
        {
            "type": "divider"
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Site:*\n<${SITE_URL}|${SITE_URL_SHORT}>\n\n*Environment*\n${ENVIRONMENT}\n\n*Committer*\n${COMMITTER}"
            },
            "accessory": {
                "type": "image",
                "image_url": "${SITE_IMAGE_URL}",
                "alt_text": "Site image"
            }
        }
    ]
};

/**
 * Base Asset URI
 * @type {string}
 */
const baseAssetURI = 'https://raw.githubusercontent.com/linchpin/action-slack-notification/master/images/';

/**
 * Default to a bad message?
 *
 * @type {{NOTIFICATION_ICON: string, SITE_URL_SHORT: string, CHANNEL_ID: string, BUILD_STATUS_SUMMARY: string, ENVIRONMENT: string, TIMESTAMP: string, BUILD_STATUS_MESSAGE: string, SITE_IMAGE_URL: string, BUILD_STATUS: string, COMMITTER: string, SITE_URL: string}}
 */
const textMap = {
    NOTIFICATION_ICON: baseAssetURI + '/fail.png',
    BUILD_STATUS: 'failed',
    BUILD_STATUS_MESSAGE: 'Deployment Issue: Code deployed to ' + process.env.ENVIRONMENT + ', but an issue was found',
    ENVIRONMENT: process.env.ENVIRONMENT,
    SITE_URL: process.env.SITE_URL,
    SITE_URL_SHORT: process.env.SITE_URL.replace(/(^\w+:|^)\/\//, ''),
    COMMITTER: process.env.GITHUB_ACTOR,
    SITE_IMAGE_URL: process.env.SITE_IMAGE_URL,
    TIMESTAMP: moment().tz('America/New_York').format('MMMM Do YYYY, h:mm:ss A'),
    CHANNEL_ID: 'C01D13A6G1W',
    BUILD_STATUS_SUMMARY: 'Deployment Issue: Code deployed to ' + process.env.ENVIRONMENT + ', but an issue was found'
}

/**
 * Globally Accessible Vars
 */
const GITHUB_EVENT = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));

/**
 * JSON Object for our Slack Message
 * @type {object}
 */
let json = {};

/**
 * Template Used for all messages regardless of type
 *
 * @type {string}
 */
let messageTemplate = '';

/**
 * Get the icon based on our build status
 *
 * @param status
 * @return {string}
 */
const getIcon = (status = 'in-progress') => {
    if (!process.env.NOTIFICATION_ICON) {
        return baseAssetURI + status + '.png';
    }

    return process.env.NOTIFICATION_ICON;
}

/**
 * Get our status summary message based on our current build status
 *
 * @param status
 * @param environment
 * @return {string}
 */
const getSummary = (status = 'in-progress', environment) => {

    let status_message = '';

    switch (status) {
        case 'completed':
            status_message = 'Deployment completed: Code has successfully been deployed to ' + environment;
            break;
        case 'failed':
            status_message = 'Deployment failed: There was an issue trying to deploy to ' + environment;
            break;
        case 'mixed':
            status_message = 'Deployment Issue: Code deployed to ' + environment + ', but an issue was found'
            break;
        default:
            status_message = 'Deployment started: Preparing to deploy to ' + environment;
    }

    return status_message;
}

/**
 * Parse our textmap base on our template
 *
 * @param template
 * @param textMap
 * @return {*}
 */
const parseTemplate = (template, textMap) => {
    let output = template

    for (let [id, text] of Object.entries(textMap)) {
        output = output.replace(new RegExp(`\\$\{${id}}`, 'mg'), text)
    }

    return output;
}

/**
 * Send a message when a build has failed.
 *
 * @param message
 */
const sendFailMessage = (message) => {

    json.blocks.push({
        "type": "divider"
    });

    json.blocks.push({
        "type": "section",
        "text": {
            "type": "mrkdwn",
            "text": "*" + message + "*"
        }
    });

    let messageMap = Object.assign({}, textMap);
        messageMap.TIMESTAMP = moment().tz('America/New_York').format('MMMM Do YYYY, h:mm:ss A');

    sendMessage(parseTemplate(JSON.stringify(json), messageMap));
}

/**
 * Post our message to slack
 *
 * @param message
 */
const sendMessage = (message) => {
    axios.post(
        'https://slack.com/api/chat.postMessage',
        message, // Parsed Message Body
        {
            headers: {
                "Authorization": "Bearer " + process.env.SLACK_BOT_TOKEN,
                "Content-Type": "application/json"
            }
        })
        .catch(function (error) {
            core.setFailed(error); // Send a message on full failure
        });
}

/**
 * Compare the release version number to the number within the readme.md
 */
const compareReleaseToReadme = () => {

    if (process.env.BUILD_STATUS !== 'completed' || process.env.ENVIRONMENT !== 'production') {
        return; // If not complete die early
    }

    const dir = (process.env.WORKING_DIRECTORY) ? process.env.WORKING_DIRECTORY : '';
    const readme_file = fs.readFileSync('.' + dir + '/README.md', 'utf8');
    const regex = /#+\s?Changelog\s*(?:(?:#{2,})\s(v\d(?:\d)?\.\d(?:\d)?(?:\.\d)?(?:\d)?))([\s\S]*?)((?:(?:#+)\s(?:v\d(?:\d)?\.\d(?:\d)?(?:\.\d)?(?:\d)?))|#+|$){1}/;
    const changes = readme_file.match(regex);
    const releaseTag = GITHUB_EVENT.ref;

    if (releaseTag !== 'refs/tags/' + changes[1]) {
        console.log('Release Mismatch');

        json.blocks.push({
            "type": "divider"
        });
        json.blocks.push({
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*No changes were specified in this release*"
            }
        });

        let failmsg = "The build has succeeded, but the release tag was " + releaseTag.replace('refs/tags/', '') + ". The latest changelog listed is from " + changes[1];

        sendFailMessage(failmsg);

    } else {
        console.log('Found Changes in README file');
        console.log('--');
        console.log('It looks for: ( typeof changes[1] !== undefined && refs/tags/ + changes[1] === event.ref ) && ( typeof changes[2] !== undefined )');
        console.log('typeof changes[1] = ' + typeof changes[1]);
        console.log('event.ref is = ' + GITHUB_EVENT.ref);
        console.log('it should be = ' + 'refs/tags/' + changes[1]);
        console.log('typeof changes[2] = ' + typeof changes[2]);
        console.log('--');

        if ( ( typeof changes[1] !== 'undefined' && 'refs/tags/' + changes[1] === GITHUB_EVENT.ref) && ( typeof changes[2] !== 'undefined' ) ) {
            json.blocks.push({
                "type": "divider"
            });
            json.blocks.push({
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": "*New website improvements in " + changes[1] + "*\n```" + changes[2].trim() + "```"
                }
            });
        }
    }

    console.log('Comparison complete!');
}

/**
 * most @actions toolkit packages have async methods
 * @return {Promise<void>}
 */
async function run() {
    try {
        let folder = "/actions/templates/";

        // For local development
        if (!process.env.GITHUB_WORKSPACE) {
            require('dotenv').config({path: '.env'});
            folder = "";
        }

        messageTemplate = JSON.stringify(slackTemplate);
        json            = slackTemplate;

        compareReleaseToReadme(); // Compare our release readme to the release in the

        json.blocks.push({
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": "${TIMESTAMP}"
                }
            ]
        });

        let messageMap = Object.assign({}, textMap);
            messageMap.NOTIFICATION_ICON = getIcon(process.env.BUILD_STATUS);
            messageMap.BUILD_STATUS = process.env.BUILD_STATUS;
            messageMap.BUILD_STATUS_MESSAGE = process.env.BUILD_STATUS_MESSAGE;
            messageMap.TIMESTAMP = moment().tz('America/New_York').format('MMMM Do YYYY, h:mm:ss A');
            messageMap.BUILD_STATUS_SUMMARY = getSummary(process.env.BUILD_STATUS, process.env.ENVIRONMENT);
            messageMap.CHANNEL_ID = process.env.CHANNEL_ID;

        // Map a default image if we don't have one.
        if ( ! process.env.SITE_IMAGE_URL ) {
            messageMap.SITE_IMAGE_URL = baseAssetURI + 'default-client-image.png';
        }

        // Post our message to slack
        sendMessage(parseTemplate(JSON.stringify(json), messageMap));

    } catch (error) {
        core.setFailed(error.message);
    }
}

run();
