<div align="center">
<img src="https://user-images.githubusercontent.com/4144601/220859980-3977252f-a091-485e-ab16-bea32bc66b58.svg" alt="Mastdon Uptime Bot" width="128">

# Mastdon + UptimeRobot Bot

A Node.js bot that posts to Mastdon if a service on UptimeRobot is down.

<br/>

![Screenshot of Mastdon Post](https://user-images.githubusercontent.com/4144601/220864964-7afcef23-950a-4f06-a15e-2fe4d3c30989.png)
</div>

## Setup 
### Prerequisites
To use the bot, you'll need:
* An account on any Mastodon instance

* An application with read (`read:statuses`) and write (`write:media`, `write:statuses`) rights on that instance and the access token
  <details><summary>Full explanation</summary>
  Go to your Mastdon Instance. Then go to Preferences -> Development -> New application -> Enter your application name and apply the following settings:<br />
  <img width="450" alt="Rights" src="https://user-images.githubusercontent.com/4144601/220865942-2530cea0-2911-4ddd-998b-f0da0cae307a.png"></details>
  
* An [UptimeRobot*](https://uptimerobot.com/?rid=b61ec8a31b3087) account (Paid or free)
* Your [UptimeRobot API Keys*](https://uptimerobot.com/api/?rid=b61ec8a31b3087) (for a specific monitor)
* [Node.js / npm installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) on your system and server

### Get started 
Open up the repo in your IDE and run:
````bash
npm install
````

Open up the `.env.example`, rename it to `.env` and insert your credentials:
````.env
INSTANCE="https://mastodon.social" // Your mastodon instance
APP_NAME="Your app name" // The name you gave your app
HASHTAG="Yourhashtag" // The hashtag you want to use
SECRET="secret" // The access token of your mastodon app
UPTIME_ROBOT_API_KEY="uptimerobotsecret" // Your UptimeRobot Secret for the specific monitor you want to toot about
````

### Configuration
You will notice that the bot is not only sending a status to Mastdon, but also images. 

You can change those images in `img/up.png` and `img/down.png`. 

If you choose to not send images, change the following lines ([44-51](https://github.com/JokeNetwork/mastodon-uptime-bot/blob/main/app.js#L44-L51)):
````javascript
const mediaResp = await M.post("media", {
  file: fs.createReadStream("img/up.png"),
});
const mediaId = mediaResp.data.id;
await M.post("statuses", {
  status: `#${process.env.HASHTAG} is up and running again. We apologize for any inconvenience.`,
  media_ids: [mediaId],
});
````
to:
````javascript
await M.post("statuses", {
  status: `#${process.env.HASHTAG} is up and running again. We apologize for any inconvenience.`
});
````
and these lines ([66-73](https://github.com/JokeNetwork/mastodon-uptime-bot/blob/main/app.js#L66-L73), [83-90](https://github.com/JokeNetwork/mastodon-uptime-bot/blob/main/app.js#L83-L90)):
````javascript
const mediaResp = await M.post("media", {
  file: fs.createReadStream("img/down.png"),
});
const mediaId = mediaResp.data.id;
await M.post("statuses", {
  status: `#${process.env.HASHTAG} seems to be down. We are already investigating it.`,
  media_ids: [mediaId],
});
````
to:
````javascript
await M.post("statuses", {
  status: `#${process.env.HASHTAG} seems to be down. We are already investigating it.`
});
````

## Run the app
You should be good to go now. Just run:
````bash
npm run start 
````

## Set up a Webhook or Cronjob
### Webhook
**Attention!**
It is reccomended to set up a webhook in your [UptimeRobot*](https://uptimerobot.com/?rid=b61ec8a31b3087) alert contacts - [Learn more](https://blog.uptimerobot.com/web-hook-alert-contacts-new-feature/).
<br />This webhook should point to the URL of your [Deployment](#deploy), so it can automatically trigger the bot when a downtime is detected. 

This is best practice, but you will need a paid account on UptimeRobot for that. 

### Cronjob
If you do not have/do not want a paid account on UptimeRobot, you can also set up a Cronjob. 

You can either set up a cronjob on your sever or use a free (limited executions!) webservice like [Easycron](https://www.easycron.com) that points to the the URL of your [Deployment](#deploy).

If you using the cronjon on your own server, it is reccomended to execute it every 2 minutes:
````crontab
*/2 * * * * /usr/bin/wget --spider "https://bot.yourdomain.com" >/dev/null 2>&1
````

## Deploy
To deploy the bot to a server, some additional steps might be required depending on your hoster or server provider.
It's best to check your provider's documentation and see how you can run Node.js applications. 
You can also directly deploy the bot to Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJokeNetwork%2Fmastodon-uptime-bot&env=INSTANCE,APP_NAME,HASHTAG,SECRET,UPTIME_ROBOT_API_KEY&envDescription=API%20Keys%20and%20variables%20needed%20to%20deploy%20the%20bot.&envLink=https%3A%2F%2Fgithub.com%2FJokeNetwork%2Fmastodon-uptime-bot%2FREADME.md%23get-started&redirect-url=https%3A%2F%2Fgithub.com%2FJokeNetwork%2Fmastodon-uptime-bot)

## Misc
### Dependencies
This repo depends on:
* [hylyh/node-mastodon](https://github.com/hylyh/node-mastodon)

### Further reading
* [Mastodon API](https://docs.joinmastodon.org/api/)
* [UptimeRobot API*](https://uptimerobot.com/api/?rid=b61ec8a31b3087)

### Disclaimer
Please use this bot only on your own instances or talk to the admins of your instance, if it's okay to let a bot like this run, especially if you're using [Cronjobs](#cronjob).

All links marked with * in this repo are affiliate links.
