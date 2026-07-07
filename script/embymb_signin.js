const NAME = "Embymb Signin";
const SIGNIN_URL = "https://embymb.ichinosekotomi.com/api/v1/signin";
const COOKIE_KEY = "embymb_cookie";

function doneWithNotification(subtitle, body) {
  if (typeof $notification !== "undefined") {
    $notification.post(NAME, subtitle, body || "");
  }
  $done();
}

function readStoredCookie() {
  if (typeof $persistentStore === "undefined") {
    return "";
  }

  return $persistentStore.read(COOKIE_KEY) || "";
}

function readCookie() {
  const argumentCookie = typeof $argument === "string" ? $argument.trim() : "";
  const storedCookie = readStoredCookie().trim();

  return argumentCookie || storedCookie;
}

function parseSigninResponse(data) {
  if (!data) {
    return {
      body: "No response body",
      message: "No response",
    };
  }

  try {
    const json = JSON.parse(data);
    const message = json.message || json.msg || json.error || "Signin response";

    if (json && json.success === true && json.data && typeof json.data === "object") {
      return {
        body: formatSigninData(json.data),
        message: message,
      };
    }

    return {
      body: typeof json.data === "string" ? json.data : JSON.stringify(json),
      message: message,
    };
  } catch (_) {
    return {
      body: data,
      message: data,
    };
  }
}

function appendValue(parts, label, value, suffix) {
  if (value === null || typeof value === "undefined" || value === "") {
    return;
  }

  parts.push(label + value + (suffix || ""));
}

function formatSigninData(data) {
  const currency = data.currency_name || "积分";
  const parts = [];

  appendValue(parts, "本次获得：", data.daily_points, " " + currency);
  appendValue(parts, "当前余额：", data.current_points, " " + currency);
  appendValue(parts, "连续签到：", data.current_streak, " 天");
  appendValue(parts, "最长连续：", data.longest_streak, " 天");
  appendValue(parts, "今日累计：", data.total_today, " " + currency);
  appendValue(parts, "签到日期：", data.last_signin_date, "");

  if (data.bonus_points) {
    appendValue(parts, "额外奖励：", data.bonus_points, " " + currency);
  }

  if (data.renewal && data.renewal.enabled) {
    parts.push(
      "续期状态：" +
        (data.renewal.affordable ? "可兑换" : "还差 " + Math.max(data.renewal.cost - data.current_points, 0) + " " + currency)
    );
  }

  return parts.join("\n");
}

const cookie = readCookie();

if (!cookie || cookie.indexOf("REPLACE_ME") !== -1) {
  doneWithNotification(
    "Cookie is missing",
    "Open the site with Surge enabled, then visit /dashboard or /api/v1/users/me to capture it."
  );
} else {
  const request = {
    url: SIGNIN_URL,
    headers: {
      Accept: "application/json; charset=utf-8",
      "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-cache",
      Cookie: cookie,
      Origin: "https://embymb.ichinosekotomi.com",
      Pragma: "no-cache",
      Referer: "https://embymb.ichinosekotomi.com/score",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      "X-Twilight-Client": "webui",
    },
    body: "",
  };

  $httpClient.post(request, function (error, response, data) {
    if (error) {
      doneWithNotification("Request failed", String(error));
      return;
    }

    const status = response ? response.status || response.statusCode : "no status";
    const result = parseSigninResponse(data || "");
    const code = Number(status);
    const ok = code >= 200 && code < 300;
    const expired =
      code === 401 ||
      result.message.indexOf("UNAUTHORIZED") !== -1 ||
      result.body.indexOf("UNAUTHORIZED") !== -1 ||
      result.message.indexOf("登录状态已失效") !== -1 ||
      result.body.indexOf("登录状态已失效") !== -1;

    if (expired) {
      doneWithNotification(
        "Login expired: " + status,
        "Log in again with Surge enabled, then visit /dashboard to refresh the stored cookie."
      );
      return;
    }

    doneWithNotification(ok ? result.message : "Signin failed: " + status, result.body);
  });
}
