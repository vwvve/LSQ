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

function parseMessage(data) {
  if (!data) {
    return "No response body";
  }

  try {
    const json = JSON.parse(data);

    if (json && json.success === true && json.data && typeof json.data === "object") {
      return formatSigninData(json.message || "签到成功", json.data);
    }

    return (
      json.message ||
      json.msg ||
      json.error ||
      (typeof json.data === "string" ? json.data : JSON.stringify(json))
    );
  } catch (_) {
    return data;
  }
}

function appendValue(parts, label, value, suffix) {
  if (value === null || typeof value === "undefined" || value === "") {
    return;
  }

  parts.push(label + value + (suffix || ""));
}

function formatSigninData(message, data) {
  const currency = data.currency_name || "积分";
  const parts = [message];

  appendValue(parts, "今日 +", data.daily_points, " " + currency);
  appendValue(parts, "总计 ", data.current_points, " " + currency);
  appendValue(parts, "连续 ", data.current_streak, " 天");
  appendValue(parts, "历史最长 ", data.longest_streak, " 天");
  appendValue(parts, "今日累计 ", data.total_today, " " + currency);
  appendValue(parts, "签到日期 ", data.last_signin_date, "");

  if (data.bonus_points) {
    appendValue(parts, "奖励 +", data.bonus_points, " " + currency);
  }

  if (data.renewal && data.renewal.enabled) {
    parts.push(
      "续期 " +
        (data.renewal.affordable ? "可兑换" : "还差 " + Math.max(data.renewal.cost - data.current_points, 0) + " " + currency)
    );
  }

  return parts.join(" | ");
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
    const message = parseMessage(data || "");
    const code = Number(status);
    const ok = code >= 200 && code < 300;
    const expired =
      code === 401 ||
      message.indexOf("UNAUTHORIZED") !== -1 ||
      message.indexOf("登录状态已失效") !== -1;

    if (expired) {
      doneWithNotification(
        "Login expired: " + status,
        "Log in again with Surge enabled, then visit /dashboard to refresh the stored cookie."
      );
      return;
    }

    doneWithNotification(
      ok ? "Signin finished: " + status : "Signin failed: " + status,
      message
    );
  });
}
