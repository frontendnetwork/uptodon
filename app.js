const express = require("express");
const request = require("request");
const app = express();
let fs = require("fs");
require("dotenv").config();
var Masto = require("mastodon");

var M = new Masto({
  access_token: process.env.SECRET,
  api_url: `${process.env.INSTANCE}/api/v1/`,
});

app.get("*", (req, res) => {
  let options = {
    method: "POST",
    url: "https://api.uptimerobot.com/v2/getMonitors",
    headers: {
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
    },
    form: { api_key: process.env.UPTIME_ROBOT_API_KEY, format: "json" },
  };

  let uptime;
  request(options, function (error, response, body) {
    if (error) throw new Error(error);

    try {
      const monitor = JSON.parse(body);
      if (monitor && monitor.monitors && monitor.monitors.length > 0) {
        let status = monitor.monitors[0].status;
        if (status === 2) {
          uptime = "up";
        } else {
          uptime = "down";
        }

        // Check if there is already a post
        M.get(`timelines/tag/${process.env.HASHTAG}`, {}).then((resp) => {
          let data = resp;
          console.log("We're here.");
          if (data.data[0].application) {
            if (
              data.data[0].application.name === process.env.APP_NAME &&
              data.data[0].content.includes("seems to be down")
            ) {
              // If service is up again, post that it is up again
              if (uptime === "up") {
                let id;
                M.post("media", {
                  file: fs.createReadStream("img/up.png"),
                }).then((resp) => {
                  id = resp.data.id;
                  M.post("statuses", {
                    status: `#${process.env.HASHTAG} is up and running again. We apologize for any inconvenience.`,
                    media_ids: [id],
                  });
                });
                res
                  .status(200)
                  .json(
                    `Found a post from ${process.env.APP_NAME}. Service is up again, posted running again.`
                  );
                return;
              }
              // If service is still down, do nothing
              else {
                res
                  .status(200)
                  .json(
                    `Found a post from ${process.env.APP_NAME}. Service is still down, did nothing.`
                  );
                return;
              }
            }
            // Up post found
            else if (
              data.data[0].application.name === process.env.INSTANCE &&
              data.data[0].content.includes("up and running again")
            ) {
              if (uptime === "down") {
                let id;
                M.post("media", {
                  file: fs.createReadStream("img/down.png"),
                }).then((resp) => {
                  id = resp.data.id;
                  M.post("statuses", {
                    status: `#${process.env.HASHTAG} seems to be down. We are already investigating it.`,
                    media_ids: [id],
                  });
                });
                res
                  .status(200)
                  .json(
                    `Found an uptime post from ${process.env.APP_NAME}. Service is down, posted down.`
                  );
                return;
              }
              // If service is up, do nothing
              else {
                res
                  .status(200)
                  .json(
                    `Found an uptime post from ${process.env.APP_NAME}. Service is up, did nothing.`
                  );
                return;
              }
            } else {
              if (uptime === "down") {
                let id;
                M.post("media", {
                  file: fs.createReadStream("img/down.png"),
                }).then((resp) => {
                  id = resp.data.id;
                  M.post("statuses", {
                    status: `#${process.env.HASHTAG} seems to be down. We are already investigating it.`,
                    media_ids: [id],
                  });
                });
                res
                  .status(200)
                  .json(
                    `Found a post from ${process.env.APP_NAME}. Service is down, posted down.`
                  );
                return;
              } else {
                res
                  .status(200)
                  .json(
                    `Found no post from ${process.env.APP_NAME}. Service is not down, did nothing.`
                  );
                return;
              }
            }
          }
          // If there is no post, check again if service is down
          else {
            // Post that service is down
            if (uptime === "down") {
              let id;
              M.post("media", {
                file: fs.createReadStream("img/down.png"),
              }).then((resp) => {
                id = resp.data.id;
                M.post("statuses", {
                  status: `#${process.env.HASHTAG} seems to be down. We are already investigating it.`,
                  media_ids: [id],
                });
              });
              res
                .status(200)
                .json(
                  `No post from ${process.env.APP_NAME}. Service is down, posted down.`
                );
              return;
            }
            // If service is up, do nothing
            else {
              res
                .status(200)
                .json(
                  `No post from ${process.env.APP_NAME}. Service is up, did nothing.`
                );
              return;
            }
          }
        });
      }
    } catch (e) {
      return;
    }
  });
});

const port = 1035;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
