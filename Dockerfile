FROM node:10.11.0-alpine

COPY ./src /action

ENTRYPOINT ["/action/entrypoint.sh"]

LABEL "com.github.actions.name"="Slack Build Notification"
LABEL "com.github.actions.description"="Sends a Slack message when a build starts, completes, or fails."
LABEL "com.github.actions.icon"="book-open"
LABEL "com.github.actions.color"="green"
LABEL "repository"="https://github.com/linchpin/action-slack-notification"
LABEL "homepage"="https://github.com/linchpin/action-slack-notification"
LABEL "maintainer"="https://github.com/linchpin"
