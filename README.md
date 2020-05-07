## Slack Build Notification

This action sends a slack notification to a defined `#channel` when a build starts, finishes, or fails.

## Developing locally

All the code is under the `src` folder:
 1. `cd src`
 2. `npm install`

After the project is setup you can just run with: 

```bash
GITHUB_EVENT_PATH="sample-payload.json" node action.js
```

Note: `GITHUB_EVENT_PATH` is an [environment variable in Actions](https://developer.github.com/actions/creating-github-actions/accessing-the-runtime-environment/#environment-variables) where the event payload is stored for analysis during execution. For local testing there's a file `src/sample-payload.json` which stores the sample payload of a `push` event. If you're planning on creating a workflow that triggers on another type of event, you can just [fetch a sample payload](https://developer.github.com/v3/activity/events/types) and replace the contents of that file.  
