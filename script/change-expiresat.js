// change-expiresat.js
let body = $response.body;
if (body) {
  try {
    let obj = JSON.parse(body);
    if (obj && obj.data && obj.data.trialInfo && obj.data.trialInfo.expiresAt) {
      let originalDate = obj.data.trialInfo.expiresAt;
      let newDate = originalDate.replace(/\d{4}/, "2029");
      obj.data.trialInfo.expiresAt = newDate;
      $done({ body: JSON.stringify(obj) });
    } else {
      $done({ body });
    }
  } catch (e) {
    console.log("JSON parse error: " + e);
    $done({ body });
  }
} else {
  $done({});
}