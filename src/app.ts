import express, { Request, Response } from "express";
import fs from "fs";
import dotenv from "dotenv";
import FormData from "form-data";

dotenv.config();

export type UptimeStatus = "up" | "down";
export type BotAction = "posted-up" | "posted-down" | "noop";

interface Monitor {
  status: number;
}

interface UptimeResponse {
  monitors?: Monitor[];
}

interface Config {
  instance: string;
  appName: string;
  secret: string;
  uptimeRobotApiKey: string;
  upMessage: string;
  downMessage: string;
  image: boolean;
  pathUp?: string;
  pathDown?: string;
  debug: boolean;
  port: string | number;
  hashtag?: string;
  accountId?: string;
  accountUsername?: string;
}

interface MastodonStatus {
  content: string;
  application?: {
    name?: string;
  };
}

interface MastodonClient {
  get: (endpoint: string, params?: Record<string, unknown>) => Promise<{ data: any }>;
  post: (endpoint: string, params?: Record<string, unknown>) => Promise<{ data: any }>;
}

const requiredEnv = ["INSTANCE", "APP_NAME", "SECRET", "UPTIME_ROBOT_API_KEY"] as const;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): Config => {
  const missing = requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    instance: env.INSTANCE!,
    appName: env.APP_NAME!,
    secret: env.SECRET!,
    uptimeRobotApiKey: env.UPTIME_ROBOT_API_KEY!,
    upMessage: env.UP_MSG ?? "is up and running again. We apologize for any inconvenience.",
    downMessage: env.DOWN_MSG ?? "seems to be down. We are already investigating it.",
    image: env.IMAGE === "true",
    pathUp: env.PATH_UP,
    pathDown: env.PATH_DOWN,
    debug: env.DEBUG === "true",
    port: env.PORT || 1035,
    hashtag: env.HASHTAG,
    accountId: env.ACCOUNT_ID,
    accountUsername: env.ACCOUNT_USERNAME,
  };
};

class FetchMastodonClient implements MastodonClient {
  private readonly apiUrl: string;

  constructor(private readonly config: Config) {
    this.apiUrl = `${config.instance.replace(/\/$/, "")}/api/v1/`;
  }

  async get(endpoint: string, params: Record<string, unknown> = {}): Promise<{ data: any }> {
    const url = new URL(endpoint, this.apiUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });

    return this.request(url, { method: "GET" });
  }

  async post(endpoint: string, params: Record<string, unknown> = {}): Promise<{ data: any }> {
    if (endpoint === "media" && params.file) {
      const form = new FormData();
      form.append("file", params.file as fs.ReadStream);

      return this.request(new URL(endpoint, this.apiUrl), {
        method: "POST",
        body: form as any,
        headers: form.getHeaders(),
      });
    }

    return this.request(new URL(endpoint, this.apiUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(params),
    });
  }

  private async request(url: URL, init: RequestInit & { headers?: Record<string, string> }): Promise<{ data: any }> {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        authorization: `Bearer ${this.config.secret}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Mastodon request to ${url.pathname} failed with status ${response.status}`);
    }

    return { data: await response.json() };
  }
}

export const createMastodonClient = (config: Config): MastodonClient => new FetchMastodonClient(config);

export const getUptimeStatus = async (config: Config): Promise<UptimeStatus> => {
  if (config.debug) {
    return "down";
  }

  const body = new URLSearchParams({
    api_key: config.uptimeRobotApiKey,
    format: "json",
  });

  const response = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
    method: "POST",
    headers: {
      "cache-control": "no-cache",
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`UptimeRobot request failed with status ${response.status}`);
  }

  const monitor = (await response.json()) as UptimeResponse;
  const status = monitor.monitors?.[0]?.status;
  if (typeof status !== "number") {
    throw new Error("UptimeRobot response did not include a monitor status");
  }

  return status === 2 ? "up" : "down";
};

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const statusContains = (status: MastodonStatus, message: string): boolean =>
  stripHtml(status.content).includes(message);

export const detectPreviousStatus = (
  latestPost: MastodonStatus | undefined,
  config: Config
): UptimeStatus | undefined => {
  if (!latestPost) {
    return undefined;
  }

  if (latestPost.application?.name && latestPost.application.name !== config.appName) {
    return undefined;
  }

  if (statusContains(latestPost, config.downMessage)) {
    return "down";
  }

  if (statusContains(latestPost, config.upMessage)) {
    return "up";
  }

  return undefined;
};

const resolveAccountId = async (client: MastodonClient, config: Config): Promise<string | undefined> => {
  if (config.accountId) {
    return config.accountId;
  }

  if (!config.accountUsername) {
    return undefined;
  }

  const response = await client.get("accounts/lookup", { acct: config.accountUsername });
  return response.data?.id ? String(response.data.id) : undefined;
};

export const getLatestRelevantPost = async (
  client: MastodonClient,
  config: Config
): Promise<MastodonStatus | undefined> => {
  const accountId = await resolveAccountId(client, config);

  if (accountId) {
    const response = await client.get(`accounts/${accountId}/statuses`, { limit: 2 });
    return response.data?.[0];
  }

  if (!config.hashtag) {
    throw new Error("Set ACCOUNT_ID or ACCOUNT_USERNAME, or configure HASHTAG as a fallback state source");
  }

  const response = await client.get(`timelines/tag/${config.hashtag}`, { limit: 2 });
  return response.data?.[0];
};

const messageForStatus = (status: UptimeStatus, config: Config): string => {
  const hashtag = config.hashtag ? `#${config.hashtag} ` : "";
  return `${hashtag}${status === "up" ? config.upMessage : config.downMessage}`;
};

const imagePathForStatus = (status: UptimeStatus, config: Config): string | undefined =>
  status === "up" ? config.pathUp : config.pathDown;

export const postStatus = async (
  client: MastodonClient,
  status: UptimeStatus,
  config: Config
): Promise<void> => {
  const post: Record<string, unknown> = { status: messageForStatus(status, config) };

  if (config.image) {
    const imagePath = imagePathForStatus(status, config);
    if (!imagePath) {
      throw new Error(`IMAGE=true but no image path configured for ${status} status`);
    }

    const mediaResp = await client.post("media", {
      file: fs.createReadStream(imagePath),
    });
    post.media_ids = [mediaResp.data.id];
  }

  await client.post("statuses", post);
};

export const runBot = async (client: MastodonClient, config: Config): Promise<{ action: BotAction; message: string }> => {
  const uptime = await getUptimeStatus(config);
  const latestPost = await getLatestRelevantPost(client, config);
  const previousStatus = detectPreviousStatus(latestPost, config);

  if (previousStatus === "down" && uptime === "up") {
    await postStatus(client, "up", config);
    return { action: "posted-up", message: `Found a post from ${config.appName}. Service is up again, posted running again.` };
  }

  if (previousStatus === "up" && uptime === "down") {
    await postStatus(client, "down", config);
    return { action: "posted-down", message: `Found an uptime post from ${config.appName}. Service is down, posted down.` };
  }

  if (!previousStatus && uptime === "down") {
    await postStatus(client, "down", config);
    return { action: "posted-down", message: "Service is down. Posted down." };
  }

  return {
    action: "noop",
    message: uptime === "up" ? "Service is up. Nothing to do." : `Found a post from ${config.appName}. Service is still down, did nothing.`,
  };
};

export const createApp = (config = loadConfig(), client = createMastodonClient(config)) => {
  const app = express();

  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("*", async (_req: Request, res: Response) => {
    try {
      const result = await runBot(client, config);
      res.status(200).json(result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  });

  return app;
};

let serverlessApp: express.Express | undefined;

const handler = (req: Request, res: Response): void => {
  serverlessApp ??= createApp();
  serverlessApp(req, res);
};

if (require.main === module) {
  const config = loadConfig();
  const app = createApp(config);

  app.listen(config.port, () => {
    console.log(`Server started on port ${config.port}`);
  });
}

export default handler;
