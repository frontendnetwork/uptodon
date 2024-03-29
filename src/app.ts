/// <reference path="./mastodon.d.ts" />
import express, { Request, Response } from "express";
import request from "request";
import fs from "fs";
import dotenv from "dotenv";
import Masto from "mastodon";

dotenv.config();

interface Monitor {
  status: number;
}

interface UptimeResponse {
  monitors: Monitor[];
}

const M = new Masto({
  access_token: process.env.SECRET,
  api_url: `${process.env.INSTANCE}/api/v1/`,
});

const app = express();

const getUptimeStatus = async (): Promise<"up" | "down"> => {
  const options = {
    method: "POST",
    url: "https://api.uptimerobot.com/v2/getMonitors",
    headers: {
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
    },
    form: { api_key: process.env.UPTIME_ROBOT_API_KEY, format: "json" },
  };
  const body = await new Promise<string>((resolve, reject) => {
    request(options, (error, response, body) => {
      if (error) reject(error);
      resolve(body);
    });
  });
  const monitor = JSON.parse(body) as UptimeResponse;
  if (process.env.DEBUG === "true") {
    return "down";
  } else {
    return monitor.monitors[0].status === 2 ? "up" : "down";
  }
};

app.get("*", async (req: Request, res: Response) => {
  const uptime = await getUptimeStatus();
  const timeline = await M.get(`timelines/tag/${process.env.HASHTAG}`, {});
  const latestPost = timeline.data[0];

  if (
    latestPost &&
    latestPost.application?.name === process.env.APP_NAME &&
    latestPost.content.includes("seems to be down")
  ) {
    if (uptime === "up") {
      if (process.env.IMAGE === "true") {
        const mediaResp = await M.post("media", {
          file: fs.createReadStream(process.env.PATH_UP ?? ""),
        });
        const mediaId = mediaResp.data.id;
        await M.post("statuses", {
          status: `#${process.env.HASHTAG} ${process.env.UP_MSG}`,
          media_ids: [mediaId],
        });
      } else {
        await M.post("statuses", {
          status: `#${process.env.HASHTAG} ${process.env.UP_MSG}`,
        });
      }
      res
        .status(200)
        .json(
          `Found a post from ${process.env.APP_NAME}. Service is up again, posted running again.`
        );
      return;
    } else {
      res
        .status(200)
        .json(
          `Found a post from ${process.env.APP_NAME}. Service is still down, did nothing.`
        );
      return;
    }
  }

  if (
    latestPost &&
    latestPost.application?.name === process.env.INSTANCE &&
    latestPost.content.includes("up and running again")
  ) {
    if (uptime === "down") {
      if (process.env.IMAGE === "true") {
        const mediaResp = await M.post("media", {
          file: fs.createReadStream(process.env.PATH_DOWN ?? ""),
        });
        const mediaId = mediaResp.data.id;
        await M.post("statuses", {
          status: `#${process.env.HASHTAG} ${process.env.DOWN_MSG}`,
          media_ids: [mediaId],
        });
      } else {
        await M.post("statuses", {
          status: `#${process.env.HASHTAG} ${process.env.DOWN_MSG}`,
        });
      }
      res
        .status(200)
        .json(
          `Found an uptime post from ${process.env.APP_NAME}. Service is down, posted down.`
        );
      return;
    } else {
      res
        .status(200)
        .json(
          `Found an uptime post from ${process.env.APP_NAME}. Service is up, did nothing.`
        );
      return;
    }
  }

  if (uptime === "down") {
    if (process.env.IMAGE === "true") {
      const mediaResp = await M.post("media", {
        file: fs.createReadStream(process.env.PATH_DOWN ?? ""),
      });
      const mediaId = mediaResp.data.id;
      await M.post("statuses", {
        status: `#${process.env.HASHTAG} ${process.env.DOWN_MSG}`,
        media_ids: [mediaId],
      });
    } else {
      await M.post("statuses", {
        status: `#${process.env.HASHTAG} ${process.env.DOWN_MSG}`,
      });
    }
    res.status(200).json("Service is down. Posted down.");
    return;
  } else {
    res.status(200).json("Service is up. Nothing to do.");
    return;
  }
});

const port = process.env.PORT || 1035;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
