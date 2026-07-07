const NAME = "Embymb Cookie";
const COOKIE_KEY = "embymb_cookie";
const UPDATED_KEY = "embymb_cookie_updated_at";
const REQUIRED_COOKIES = ["twilight_session"];
const OPTIONAL_COOKIES = ["cf_clearance"];

function getHeader(headers, name) {
  if (!headers) {
    return "";
  }

  const target = name.toLowerCase();
  const key = Object.keys(headers).find(function (item) {
    return item.toLowerCase() === target;
  });

  return key ? headers[key] : "";
}

function parseCookie(header) {
  const result = {};

  header.split(";").forEach(function (part) {
    const item = part.trim();
    const index = item.indexOf("=");

    if (index <= 0) {
      return;
    }

    const key = item.slice(0, index).trim();
    const value = item.slice(index + 1).trim();

    if (key) {
      result[key] = value;
    }
  });

  return result;
}

function writeStore(key, value) {
  if (typeof $persistentStore === "undefined") {
    return false;
  }

  return $persistentStore.write(value, key);
}

function notify(subtitle, body) {
  if (typeof $notification !== "undefined") {
    $notification.post(NAME, subtitle, body || "");
  }
}

function isUnauthorized() {
  if (typeof $response === "undefined") {
    return false;
  }

  const status = Number($response.status || $response.statusCode || 0);

  if (status === 401) {
    return true;
  }

  try {
    const body = JSON.parse($response.body || "{}");
    return (
      body.code === 401 ||
      body.error_code === "UNAUTHORIZED" ||
      body.message === "登录状态已失效，请重新登录"
    );
  } catch (_) {
    return false;
  }
}

function isSuccessfulResponse() {
  if (typeof $response === "undefined") {
    return true;
  }

  const status = Number($response.status || $response.statusCode || 0);

  if (status < 200 || status >= 300) {
    return false;
  }

  try {
    const body = JSON.parse($response.body || "{}");
    return body.success !== false;
  } catch (_) {
    return true;
  }
}

const cookieHeader = getHeader($request.headers, "Cookie");
const cookies = parseCookie(cookieHeader || "");
const missingRequired = REQUIRED_COOKIES.filter(function (name) {
  return !cookies[name];
});

if (isUnauthorized()) {
  writeStore(COOKIE_KEY, "");
  writeStore(UPDATED_KEY, "");
  notify("Login expired", "Stored cookie was cleared. Log in again with Surge enabled.");
  $done({});
} else if (!isSuccessfulResponse()) {
  const status =
    typeof $response !== "undefined"
      ? $response.status || $response.statusCode || "unknown"
      : "unknown";
  notify("Capture skipped", "The /users/me response was not successful: " + status);
  $done({});
} else if (!cookieHeader) {
  notify("Capture failed", "No Cookie header was found in this request.");
  $done({});
} else if (missingRequired.length > 0) {
  notify("Capture skipped", "Missing required cookie: " + missingRequired.join(", "));
  $done({});
} else {
  const savedNames = REQUIRED_COOKIES.concat(OPTIONAL_COOKIES).filter(function (name) {
    return cookies[name];
  });
  const savedCookie = savedNames
    .map(function (name) {
      return name + "=" + cookies[name];
    })
    .join("; ");

  const ok =
    writeStore(COOKIE_KEY, savedCookie) &&
    writeStore(UPDATED_KEY, String(Date.now()));

  const missingOptional = OPTIONAL_COOKIES.filter(function (name) {
    return !cookies[name];
  });

  notify(
    ok ? "Cookie saved" : "Cookie save failed",
    missingOptional.length > 0
      ? "Saved " + savedNames.join(", ") + ". Missing: " + missingOptional.join(", ")
      : "Saved " + savedNames.join(", ")
  );

  $done({});
}
