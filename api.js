var fs = require("fs-extra");
var url = require("url");
const { loadImage, Canvas } = require("canvas");
var AdmZip = require("adm-zip");
var edge = require("./edge");
const configFile = require("./config");
const dav3 = require("autodesk.forge.designautomation");
const path = require("path");
const ForgeAPI = require("forge-apis");
const BucketsApi = new ForgeAPI.BucketsApi();
const ObjectsApi = new ForgeAPI.ObjectsApi();
const bucketKey = configFile.forge.ossBucketName;
const fetch = require("node-fetch");
const util = require("util");
const streamPipeline = util.promisify(require("stream").pipeline);

let config = {
  retry: {
    maxNumberOfRetries: 7,
    backoffDelay: 6000,
    backoffPolicy: "exponentialBackoffWithJitter",
  },
};
let daClient = new dav3.AutodeskForgeDesignAutomationClient(config);
let daApi = new dav3.AutodeskForgeDesignAutomationApi(daClient);
let presignedOutputUrl = null;

let dirs = ["downloads", "uploads", "items"];
const desiredMode = 0o2775;

//Ensures that the directory exists. If the directory structure does not exist, it is created.
//If provided, options may specify the desired mode for the directory.
dirs.forEach((dir) => {
  fs.ensureDirSync(dir, desiredMode);
  fs.emptyDirSync(dir);
});
/**
 * A Function to wait for polling DA service.
 * @param {*time} ms
 */
function sleep(ms) {
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      resolve();
    }, ms);
  });
}
/**
 *
 */
let crypto;
try {
  crypto = require("crypto");
} catch (err) {
  console.log("crypto support is disabled!");
}
/**
 * Get bearer access_token and authoriztion client
 */
async function getOAuthTokenAsync() {
  const client_id = process.env.FORGE_CLIENT_ID;
  const client_secret = process.env.FORGE_CLIENT_SECRET;
  var autoRefresh = true;
  let oauth_client = new ForgeAPI.AuthClientTwoLegged(
    client_id,
    client_secret,
    [
      "data:read",
      "data:write",
      "bucket:read",
      "bucket:update",
      "bucket:create",
      "code:all",
      "bucket:delete",
    ],
    autoRefresh
  );
  let oauth_token = await oauth_client.authenticate();
  return { oauth_client: oauth_client, oauth_token: oauth_token };
}
/**
 * API end point to start Workitem
 */
exports.submitData = async function (req, res) {
  var reqId = randomValueBase64(6);
  var args = url.parse(req.url, true).query;
  const { oauth_client, oauth_token } = await getOAuthTokenAsync();
  req.oauth_client = oauth_client;
  req.oauth_token = oauth_token;
  var imageParams = {
    Width: args.width,
    Height: args.height,
    Pieces: args.pieces,
  };

  // Width and Height are for the puzzle itself
  // We will need to calculate the width and height for the engraving

  var width = parseInt(args.res),
    height = Math.round(
      (parseFloat(imageParams.Height) * width) / parseFloat(imageParams.Width)
    );

  let { params, pixelFile } = await urlWorkItem(
    reqId,
    imageParams,
    args.upload,
    width,
    height,
    args.threshold,
    res
  );
  return await createWorkItem(req, reqId, params, pixelFile, res);
};
/**
 * API end point to poll the status of Workitem
 */
exports.checkData = async function (req, res) {
  var args = url.parse(req.url, true).query;
  if (args.workItemId) {
    let workitem = null;
    const { oauth_client, oauth_token } = await getOAuthTokenAsync();
    workitem = await daApi.getWorkitemStatus(
      args.workItemId,
      oauth_client,
      oauth_token
    );
    switch (workitem.status) {
      case "pending":
      case "inprogress":
        while (
          workitem.status === "pending" ||
          workitem.status === "inprogress"
        ) {
          await sleep(2000);
          console.log("\n WorkItem Status:", workitem.status);
          workitem = await daApi.getWorkitemStatus(
            args.workItemId,
            oauth_client,
            oauth_token
          );
          console.log("\n WorkItem Status:", workitem.status);
          console.log("..");
        }
      case "success":
        if (workitem.status == "success") {
          var resp = await downloadAndExtract(
            presignedOutputUrl,
            args.workItemId
          );
          res.status(200).json({
            result: "success",
            report: resp.result,
          });
          break;
        }
      case "cancelled":
      case "failedLimitDataSize":
      case "failedLimitProcessingTime":
      case "failedDownload":
      case "failedInstructions":
      case "failedUpload":
        console.log("\n WorkItem Status:", workitem.status);
        var resp = await downloadAndDisplay(
          workitem.reportUrl,
          args.workItemId
        );
        res.status(200).json({
          result: "failed",
          report: resp.result,
          error: workitem.status,
        });
        break;
    }
  }
};

/**
 * Function to creadte random request ID.
 * @param {buffer lenght} len
 */
function randomValueBase64(len) {
  return crypto
    .randomBytes(Math.ceil((len * 3) / 4))
    .toString("base64") // convert to base64 format
    .slice(0, len) // return required number of characters
    .replace(/\+/g, "0") // replace '+' with '0'
    .replace(/\//g, "0"); // replace '/' with '0'
}
/**
 * A utility async function to process core logic of Canny Edge algoritm
 * @param {Unique Id} reqId
 * @param {Parsed query arguments from Submit API request} args
 * @param {Image Parameters} imgData
 * @param {Image Width} width
 * @param {Image Height} height
 * @param {Threshold Buffer} threshold
 * @param {Response} res
 */
async function urlWorkItem(
  reqId,
  args,
  imgData,
  width,
  height,
  threshold,
  res
) {
  console.log("Using a " + width + " x " + height + " image");
  var imgParams = JSON.parse(imgData);
  const filename = "./uploads/" + imgParams.filename;
  const newPath = filename + ".jpg";
  try {
    fs.renameSync(filename, newPath);
  } catch (error) {
    console.error(error);
    return res.status(500);
  }

  const image = await loadImage(newPath);
  var raw = new Canvas(width, height);
  var out = new Canvas(width, height);

  console.log("Initializing edge detector");

  var ed = new edge.EdgeDetector();
  ed.init(image, raw, out, width, height, threshold);
  var newArgs = ed.generatePoints(width, height, {}, true); // Compress by default
  var data = JSON.stringify(newArgs.XPixels);
  var url = "/items/" + reqId + ".json";

  //var fullUrl = siteUrl + url;

  fs.writeFileSync("." + url, data);
  url = url.replace("/items/", "items/");
  args.XRes = newArgs.XRes;
  args.YRes = newArgs.YRes;
  //success(JSON.stringify(args), path.resolve(url));
  return { params: JSON.stringify(args), pixelFile: path.resolve(url) };
}
/**
 * A async fuction that call DA creatWorkitem request
 * @param {request} req
 * @param {unique id} reqId
 * @param {Image params in JSON} args
 * @param {Image file path} pixUrl
 * @param {response} res
 */
async function createWorkItem(req, reqId, args, pixUrl, res) {
  console.log("Initializing work item data");

  //1.ensure bucket exists
  try {
    let payload = new BucketsApi.PostBucketsPayload();
    payload.bucketKey = bucketKey;
    payload.policyKey = "transient"; // expires in 24h
    var resp = await BucketsApi.createBucket(
      payload,
      {},
      req.oauth_client,
      req.oauth_token
    );
    console.log(resp);
  } catch (ex) {
    // in case bucket already exists
  }

  //2. Upload and Get a Signed pixUrl File to bucket
  const inputFileNameOSS = `${reqId}_input_${path.basename(pixUrl)}`; // avoid overriding
  try {
    let contentStream = fs.createReadStream(pixUrl);
    const { size } = fs.statSync(pixUrl);
    var resp = await ObjectsApi.uploadObject(
      bucketKey,
      inputFileNameOSS,
      size,
      contentStream,
      {},
      req.oauth_client,
      req.oauth_token
    );
    console.log(resp.body);
  } catch (ex) {
    console.error(ex);
    return res.status(500).json({
      diagnostic: "Failed to upload file for workitem",
    });
  }
  let presignedInputUrl = null;
  try {
    var resp = await ObjectsApi.createSignedResource(
      bucketKey,
      inputFileNameOSS,
      {},
      { access: "read" },
      req.oauth_client,
      req.oauth_token
    );
    presignedInputUrl = resp.body.signedUrl;
  } catch (ex) {
    return res.status(500).json({
      diagnostic: "Failed to create a signed url for input resource",
    });
  }
  //3. Get a Signed resource for `output`.zip

  const outFileNameOSS = `${reqId}_output.zip`;
  try {
    var resp = await ObjectsApi.createSignedResource(
      bucketKey,
      outFileNameOSS,
      {},
      { access: "readwrite" },
      req.oauth_client,
      req.oauth_token
    );
    presignedOutputUrl = resp.body.signedUrl;
  } catch (ex) {
    return res.status(500).json({
      diagnostic: "Failed to create a signed url for output resource",
    });
  }
  let oauth = daClient.authManager.authentications["2-legged"];
  oauth.accessToken = req.oauth_token.access_token;
  let inputJson = "data:application/json," + args;
  let nickname = await daApi.getNickname("me");
  const workItemSpec = {
    activityId:
      nickname +
      "." +
      configFile.designAutomation.activityId +
      "+" +
      configFile.designAutomation.activityAlias,
    arguments: {
      input: {
        url:
          "http://download.autodesk.com/us/support/files/autocad_2015_templates/acad.dwt",
        verb: "get",
        localName: "$(HostDwg)",
      },
      params: {
        localName: "params.json",
        url: inputJson,
      },
      pixels: {
        localName: "pixels.json",
        url: presignedInputUrl,
        verb: "get",
      },
      result: {
        zip: true,
        localName: "outputs",
        url: presignedOutputUrl,
        verb: "put",
      },
    },
  };
  console.log("workItem: \n", workItemSpec);
  let workItemStatus = null;
  try {
    workItemStatus = await daApi.createWorkItem(workItemSpec);
  } catch (ex) {
    console.error(ex);
    return res.status(500).json({
      diagnostic: "Failed to create a workitem",
    });
  }
  res.status(200).json({
    workItemId: workItemStatus.id,
  });
}
/**
 * A async Utility to download and extract zip files to ./downloads directory
 *
 * @param {remote output.zip URL} remoteZip
 * @param {Design Automation WorkItem Id} workItemId
 */
async function downloadAndExtract(remoteZip, workItemId) {
  console.log("Downloading and extracting results");
  var localRoot = "./downloads/" + workItemId;
  var localZip = localRoot + ".zip";
  const response = await fetch(remoteZip);
  if (!response.ok)
    throw new Error(`unexpected response ${response.statusText}`);
  await streamPipeline(response.body, fs.createWriteStream(localZip));
  var zip = new AdmZip(localZip);
  var entries = zip.getEntries();
  var success =
    unzipEntry(zip, "jigsaw.png", localRoot, entries) &&
    unzipEntry(zip, "jigsaw.dwg", localRoot, entries) &&
    unzipEntry(zip, "jigsaw.dxf", localRoot, entries);
  var result = success ? localRoot : "failed";
  return { result: result };
}
/**
 *A async Utility to download report file to ./downloads directory
 * @param {A report url from DA service} report
 * @param {Design Automation WorkItem Id} workItemId
 */
async function downloadAndDisplay(report, workItemId) {
  console.log("Downloading and displaying report");
  var localReport = "./downloads/" + workItemId + ".txt";
  const response = await fetch(report);
  if (!response.ok)
    throw new Error(`unexpected response ${response.statusText}`);
  await streamPipeline(response.body, fs.createWriteStream(localReport));
  console.log("Report written to " + localReport);
  return { result: localReport };
}
/**
 * A utility unzips and writes to disk
 * @param {Adm-Zip instance} zip
 * @param {File Name} file
 * @param {Local Zip Path} path
 * @param {A collection of entries} entries
 */
function unzipEntry(zip, file, path, entries) {
  if (
    entries.filter(function (val) {
      return val.entryName === file;
    }).length > 0
  ) {
    zip.extractEntryTo(file, path, false, true);
    console.log("Extracted " + path + "/" + file);
    return true;
  }
  return false;
}
