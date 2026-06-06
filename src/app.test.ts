import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createApp,
  detectPreviousStatus,
  getLatestRelevantPost,
  loadConfig,
  postStatus,
  type UptimeStatus,
} from "./app";

const baseEnv = {
  INSTANCE: "https://example.social",
  APP_NAME: "Uptodon",
  SECRET: "secret",
  UPTIME_ROBOT_API_KEY: "uptime-key",
  UP_MSG: "is up again",
  DOWN_MSG: "is down",
  IMAGE: "false",
  DEBUG: "false",
};

const config = loadConfig(baseEnv);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("loadConfig", () => {
  it("requires core environment variables", () => {
    expect(() => loadConfig({})).toThrow(/Missing required environment variables/);
  });
});

describe("detectPreviousStatus", () => {
  it.each<[string, UptimeStatus]>([
    ["<p>#uptodon is down</p>", "down"],
    ["<p>#uptodon is up again</p>", "up"],
  ])("detects %s", (content, expected) => {
    expect(
      detectPreviousStatus(
        {
          content,
          application: { name: "Uptodon" },
        },
        config
      )
    ).toBe(expected);
  });

  it("ignores posts from another app", () => {
    expect(
      detectPreviousStatus(
        {
          content: "is down",
          application: { name: "Someone Else" },
        },
        config
      )
    ).toBeUndefined();
  });
});

describe("getLatestRelevantPost", () => {
  it("uses account statuses when ACCOUNT_ID is configured", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ data: [{ content: "is down" }] }),
      post: vi.fn(),
    };

    await expect(getLatestRelevantPost(client, { ...config, accountId: "123" })).resolves.toEqual({ content: "is down" });
    expect(client.get).toHaveBeenCalledWith("accounts/123/statuses", { limit: 2 });
  });

  it("resolves ACCOUNT_USERNAME before fetching account statuses", async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce({ data: { id: "123" } })
        .mockResolvedValueOnce({ data: [{ content: "is up again" }] }),
      post: vi.fn(),
    };

    await getLatestRelevantPost(client, { ...config, accountUsername: "uptodon@example.social" });
    expect(client.get).toHaveBeenNthCalledWith(1, "accounts/lookup", { acct: "uptodon@example.social" });
    expect(client.get).toHaveBeenNthCalledWith(2, "accounts/123/statuses", { limit: 2 });
  });

  it("falls back to hashtag timeline", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({ data: [{ content: "is down" }] }),
      post: vi.fn(),
    };

    await getLatestRelevantPost(client, { ...config, hashtag: "uptodon" });
    expect(client.get).toHaveBeenCalledWith("timelines/tag/uptodon", { limit: 2 });
  });
});

describe("postStatus", () => {
  it("posts without media", async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ data: {} }),
    };

    await postStatus(client, "down", { ...config, hashtag: "uptodon" });
    expect(client.post).toHaveBeenCalledWith("statuses", { status: "#uptodon is down" });
  });
});

describe("createApp", () => {
  it("serves health without running bot dependencies", async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn(),
    };

    await request(createApp(config, client)).get("/healthz").expect(200, { status: "ok" });
    expect(client.get).not.toHaveBeenCalled();
    expect(client.post).not.toHaveBeenCalled();
  });
});
