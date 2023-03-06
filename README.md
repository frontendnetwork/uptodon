<div align="center">
<img src="https://user-images.githubusercontent.com/4144601/220859980-3977252f-a091-485e-ab16-bea32bc66b58.svg" alt="Uptodon" width="128">

# Uptodon

A Node.js bot that posts to Mastodon if a service on UptimeRobot is down.

<br/>

<picture>
	  <source srcset="https://user-images.githubusercontent.com/4144601/220864964-7afcef23-950a-4f06-a15e-2fe4d3c30989.png" media="(prefers-color-scheme: dark)">
	  <img src="https://user-images.githubusercontent.com/4144601/221250665-bb1c7829-f437-4a50-8210-ec5cdeb8f5de.png" alt="Screenshot of Mastdon Post">
	</picture>
</div>

## 👋 Introduction 
Uptodon is a simple and lightweight bot written in Node.js that automatically toots to any account on any Mastodon instance, if a certain monitor in your UptimeRobot account reports a downtime. 

You can automate your workflow and inform the followers of your account that your service is down and also when it's up again, so you can focus on fixing what causes the downtime of your service. 

## 🧑🏽‍💻 Setup 
### Prerequisites
To use the bot, you'll need:
* An account on any Mastodon instance

* An application with read (`read:statuses`) and write (`write:media`, `write:statuses`) rights on that instance and the access token
  <details><summary>Full explanation</summary>
  Go to your Mastodon Instance. Then go to Preferences → Development → New application → Enter your application name and apply the following settings:<br /><br />
  <picture>
	  <source srcset="https://user-images.githubusercontent.com/4144601/221251026-e6888ef5-7a80-4dc7-aa1d-b7eef666be95.png" media="(prefers-color-scheme: dark)">
	  <img src="https://user-images.githubusercontent.com/4144601/221242229-0738ad6d-da4b-4500-8171-faa260a02edb.png" alt="Rights of the application">
	</picture>
  </details>
* An [UptimeRobot*](https://uptimerobot.com/?rid=b61ec8a31b3087) account (Paid or free)
* Your [UptimeRobot API Keys*](https://uptimerobot.com/api/?rid=b61ec8a31b3087) (for a specific monitor)
* [Node.js / npm installed](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

### Get started 
Copy [`.env.example`](https://github.com/JokeNetwork/uptodon/blob/main/.env.example) to `.env`:
````bash
cp .env.example .env
````
and insert your credentials in the now created [`.env`](https://github.com/JokeNetwork/uptodon/blob/main/.env.example):
````.env
# Mastodon app
INSTANCE="https://mastodon.social" # Your mastodon instance
APP_NAME="Your app name" # The name you gave your app earlier 
HASHTAG="Yourhashtag" # The hashtag you want to use for posts
SECRET="secret" # The access token of your mastodon app

# Uptime Robot
UPTIME_ROBOT_API_KEY="uptimerobotsecret" # Your UptimeRobot Secret for the specific monitor you want to toot about

...
````

### Configuration
#### Message
The messages of the bot are compeltely customizable. Please note that the defined Hashtag (`HASHTAG` in `.env`) will always be added before your custom message.

````.env
UP_MSG="is up and running again. We apologize for any inconvenience." # The hastag will be added before this
DOWN_MSG="seems to be down. We are already investigating it." # The hastag will be added before this
````

#### Images 
You will notice that the bot is not only sending a status to Mastodon, but also images. 

You can change those images in [`img/up.png`](https://github.com/JokeNetwork/uptodon/blob/main/img/up.png) and [`img/down.png`](https://github.com/JokeNetwork/uptodon/blob/main/img/down.png) or change their paths in the `.env` you created [earlier](#get-started). 

If you choose to not send images, you can also define this in the `.env`:
````.env
# If you want to use custom images, set IMAGE to true and set the path to the image in PATH_UP and PATH_DOWN
IMAGE="true" # Set to false if you do not want to send images
PATH_UP="img/up.png" # Set path for the image when the service is up again
PATH_DOWN="img/down.png" # Set path for the image when the service is down
````

#### Application configuration
You can also define the port on which the bot should be running as well as if you want to use Debug-mode.

> **Note** <br/>
> Debug mode is quite straight forward but also a bit dangerous to use. Setting the debug-mode to true will instantly trigger a downtime post if the app is started.

````.env
# App config
PORT="1035" # Change the port if you want to do so, e.g. to 3000
DEBUG="true" # Only set this to true if you know what you are doing: This will instantly trigger a downtime post if the app is started
````

## 🏃🏽‍♀️ Run the app
You should be good to go now. Just run:
````bash
npm run start 
````
This also runs a `prestart` script, that runs `npm run install` to install all dependencies.

## 🪝 Set up a Webhook or Cronjob
### Webhook
Set up the Webhook in your [UptimeRobot*](https://uptimerobot.com/?rid=b61ec8a31b3087) alert contacts - [Learn more](https://blog.uptimerobot.com/web-hook-alert-contacts-new-feature/).
<br />This webhook should point to the URL of your [Deployment](#deploy), so it can automatically trigger the bot when a downtime is detected. 

<picture>
	  <source srcset="https://user-images.githubusercontent.com/4144601/221251596-7f92ea32-cff3-409d-a9db-ed6ae03df5bb.png" media="(prefers-color-scheme: dark)">
	  <img src="https://user-images.githubusercontent.com/4144601/221245004-8cb14437-71d9-4f55-b70f-9fe09220ca7d.png" alt="Webhook setup in the UptimeRobot settings">
</picture>

This is best practice, but you will need a paid account on UptimeRobot for that. 

### Cronjob
> **Warning** <br />
> It is recomended to set up a webhook, as this is more accurate and you won't run into rate-limiting issues or overload your instance.
> Please read the [Disclaimer](#disclaimer)!

You can either set up a cronjob on your server or use a web service like [Easycron](https://www.easycron.com) that points to the URL of your [Deployment](#deploy).

If you're using the cronjob on your own server, it is recommended to execute it every 2 minutes:
````crontab
*/2 * * * * /usr/bin/wget --spider "https://bot.yourdomain.com" >/dev/null 2>&1
````

## 🛫 Deploy
To deploy the bot to a server, some additional steps might be required, depending on your hosting provider or server provider.
It's best to check your provider's documentation and see how you can run Node.js applications. 

### Deploy to Vercel
If you use the Deploy with Vercel button, you will be prompted to fill in the environment variables, which you can find in the [`.env.example`](https://github.com/JokeNetwork/uptodon/blob/main/.env.example), a description on what to enter can be found in [Get started](#get-started).
When these variables are not filled in, the bot will not build on Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FJokeNetwork%2Fuptodon&env=INSTANCE,APP_NAME,HASHTAG,SECRET,UPTIME_ROBOT_API_KEY,IMAGE,PATH_UP,PATH_DOWN,PORT,DEBUG&envDescription=API%20Keys%20and%20variables%20needed%20to%20deploy%20the%20bot.&envLink=https%3A%2F%2Fgithub.com%2FJokeNetwork%2Fuptodon%2FREADME.md%23get-started&redirect-url=https%3A%2F%2Fgithub.com%2FJokeNetwork%2Fuptodon)

### Deploy to Netlify
To deploy to Netlify, you have to fill in the environment variables yourself on Netlify before building, otherwise the bot will not build. 
You can find the variables in the [`.env.example`](https://github.com/JokeNetwork/uptodon/blob/main/.env.example), a description on what to enter can be found in [Get started](#get-started).

[![Deploy to Netlify Button](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/jokenetwork/uptodon)

## 🔗 Miscellaneous
### Dependencies
This repo depends on:
* [hylyh/node-mastodon](https://github.com/hylyh/node-mastodon) – Thanks to @hylyh 

### Further reading
* [Mastodon API](https://docs.joinmastodon.org/api/)
* [UptimeRobot API*](https://uptimerobot.com/api/?rid=b61ec8a31b3087)

### ToDo
* [ ] Get rid of the necessary Hashtag and use endpoint [accounts/statuses](https://docs.joinmastodon.org/methods/accounts/#statuses) instead
* [x] Make the up/down toots customizable  
* [ ] Add other Uptime services (e.g. BetterUptime / Open-Source services)

### Disclaimer
Please use this bot only on your own instances or talk to the admins of your instance if it's okay to let a bot like this run, especially if you're using [Cronjobs](#cronjob).

All links marked with * in this repo are affiliate links.
