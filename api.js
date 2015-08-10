var fs = require('fs');
var request = require('request');
var url = require('url');
var Canvas = require('canvas'),
    Image = Canvas.Image;
var crypto = require('crypto');
var AdmZip = require('adm-zip');
var edge = require('./edge');

fs.mkdir('uploads', function() {});
fs.mkdir('downloads', function() {});
fs.mkdir('items', function() {});

var activityName = 'JigsawActivity';
var userId = '36db5451-2ddc-4e3c-99de-37bd5a8810f8';
var hostName = 'developer.api.autodesk.com';
var baseUrl = 'https://' + hostName;
var workItemsUrl =  baseUrl + '/autocad.io/v1/WorkItems';
var authUrl = baseUrl + '/authentication/v1/authenticate';
var max_req_size = 30000;
var siteUrl = undefined;

exports.submitData = function (req, res) {

  var reqId = randomValueBase64(6);
  res.end(reqId);
  
  siteUrl = 'http://' + req.get('host');
  
  var args = url.parse(req.url, true).query;

  authorizeAndCall(function(auth) {
    detectEdgesAndSubmit(auth, reqId, args);
  });
}

exports.checkData = function (req, res) {

  var args = url.parse(req.url, true).query;
  if (args.item) {
    fs.readFile('./items/' + args.item, function(err, blob){      
      if (err) {
        res.end();
      } else {
        console.log('Returning item to caller (' + args.item + '): ' + blob);
        res.send(blob);
      }
    });
  }
}

function randomValueBase64 (len) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')   // convert to base64 format
    .slice(0, len)        // return required number of characters
    .replace(/\+/g, '0')  // replace '+' with '0'
    .replace(/\//g, '0'); // replace '/' with '0'
}

function authorizeAndCall(success) {

  var params = {
    client_id: process.env.CONSUMER_KEY,
    client_secret: process.env.CONSUMER_SECRET,
    grant_type: 'client_credentials'
  }

  request.post(authUrl,
    { form: params },
    function (error, response, body) {
      if (error) {
        console.log('Error: ' + error);
      }
      if (!error && response.statusCode == 200) {                

        var authResponse = JSON.parse(body);
        var auth = authResponse.token_type + ' ' + authResponse.access_token;

        console.log('Authorized: ' + auth);

        success(auth);
      } else {
        console.log('Unknown status: ' + response.statusCode);        
      }
    }
  );
}

function detectEdgesAndSubmit(auth, reqId, args) {

  var args2 = {
    Width: args.width,
    Height: args.height,
    Pieces: args.pieces
  }

  // Width and Height are for the puzzle itself
  // We will need to calculate the width and height for the engraving
    
  var width = parseInt(args.res),
      height = Math.round(parseFloat(args2.Height) * width / parseFloat(args2.Width));
 
  urlWorkItem(auth, reqId, args2, args.upload, width, height, args.threshold,
    function(data) {
      createWorkItem(auth, reqId, data);
    }
  );
}

function detectEdgesAndSubmit2(auth, reqId, args) {

  var args2 = {
    Width: args.width,
    Height: args.height,
    Pieces: args.pieces
  }

  // Width and Height are for the puzzle itself
  // We will need to calculate the width and height for the engraving
    
  var width = parseInt(args.res),
      height = Math.round(parseFloat(args2.Height) * width / parseFloat(args2.Width));
 
  var accepted = function(data) {
    console.log('Accepted request with data of length ' + data.length);
    createWorkItem(auth, reqId, data);
  }
  
  var rejected = function(width, height, size) {

    // Rejected: the max size for the request is around 30K

    console.log('Recaluating egdes, request size was too large: ' + size);
    
    if (size > max_req_size) {
      var width2 = Math.round(width * max_req_size / size);
      var height2 = width2 * height / width;
      tryWorkItem(auth, reqId, args2, args.upload, width2, height2, args.threshold, accepted, rejected);
    }
  }
  
  tryWorkItem(auth, reqId, args2, args.upload, width, height, args.threshold, accepted, rejected);
}

function tryWorkItem(auth, reqId, args, imageName, width, height, threshold, accepted, rejected) {
  
  console.log("Trying with a " + width + " x " + height + " image");

  var img = new Image(width, height);
  img.onload = function() {
    var raw = new Canvas(width, height);
    var out = new Canvas(width, height);
    
    console.log('Initializing edge detector');

    var ed = new edge.EdgeDetector();
    ed.init(img, raw, out, width, height, threshold);
    var newArgs = ed.generatePoints(width, height, args, true); // Compress by default
    var data = JSON.stringify(newArgs);
    
    if (data.length > max_req_size) {
      rejected(width, height, data.length);
    } else {
      accepted(data);
    }
  };
  img.src = './uploads/' + imageName;
}

function urlWorkItem(auth, reqId, args, imageName, width, height, threshold, success) {
  
  console.log("Using a " + width + " x " + height + " image");

  var img = new Image(width, height);
  img.onload = function() {
    var raw = new Canvas(width, height);
    var out = new Canvas(width, height);
    
    console.log('Initializing edge detector');

    var ed = new edge.EdgeDetector();
    ed.init(img, raw, out, width, height, threshold);
    var newArgs = ed.generatePoints(width, height, {}, true); // Compress by default
    var data = JSON.stringify(newArgs.XPixels);
    
    var url = '/items/' + reqId + '.json';
    var fullUrl = siteUrl + url;
    fs.writeFile("." + url, data,
      function(err) {
        if (err) {
          return console.log('Error writing engraving data: ' + err);
        } else {
          args.XRes = newArgs.XRes;
          args.YRes = newArgs.YRes;
          args.XPixelsUrl = fullUrl;
          success(JSON.stringify(args));
        }
      }
    );
  };
  img.src = './uploads/' + imageName;
}

function createWorkItem(auth, reqId, args) {

  console.log('Initializing work item data');

  var params = {
    'odata.metadata': 'https://developer.api.autodesk.com/autocad.io/v1/$metadata#WorkItems/@Element',
    Arguments: {
      InputArguments: [
        {
          Name: 'HostDwg',
          Resource: 'http://download.autodesk.com/us/support/files/autocad_2015_templates/acad.dwt',
          StorageProvider: 'Generic'
        },
        {
          Name: 'Params',
          ResourceKind: 'Embedded',
          Resource: 'data:application/json, ' + args,
          StorageProvider: 'Generic'
        }
      ],
      OutputArguments: [
        {
          Name: 'Results',
          StorageProvider: 'Generic',
          HttpVerb: 'POST',
          ResourceKind: 'ZipPackage'
        }
      ]
    },
    UserId: '',
    Id: '',
    Version: 1,
    ActivityId: {
      Id: activityName,
      UserId: userId
    }
  };

  var postData = JSON.stringify(params);
  
  var headers = {
    Authorization: auth,
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    Host: hostName
  }

  console.log(
    'Creating work item (request length ' + postData.length +
    '): ' + postData
  );
  
  /*
  console.log(
    'Creating work item (request length ' + postData.length +
    ', of which ' + args.length + ' is pt data)'
  );
  */
  
  request.post({
    url: workItemsUrl,
    headers: headers,
    body: postData
  },
  function (error, response, body) {

    if (error) throw error;

    // Extract the Id and UserId from the WorkItem

    try {
      var workItem = JSON.parse(body);
      
      if (!workItem.Id || !workItem.UserId) {
        console.log('Problem with request:  ' + body);
        storeItemStatus(reqId, 'failed');
        return;
      }
      
      console.log('Created work item (Id ' + workItem.Id + ' for user ' + workItem.UserId + ')');
  
      // We're going to request the status for this WorkItem in a loop
      // We'll perform up to 10 checks, 2 seconds between each
  
      checkWorkItem(auth, workItem,
        function(remoteZip, report) {
          if (remoteZip) {
            downloadAndExtract(remoteZip, workItem.Id, reqId);
          }
          if (report) {
            downloadAndDisplay(report, workItem.Id);
          }
        },
        function (report) {
          storeItemStatus(reqId, 'failed');
          if (report) {
            downloadAndDisplay(report, workItem.Id);
          }
        }
      );
    }
    catch (ex) {
      console.log('Problem with request:  ' + body);
      storeItemStatus(reqId, 'failed');
    }
  });
}

function checkWorkItem(auth, workItem, success, failure) {

  console.log('Checking status for work item ' + workItem.Id);

  var checked = 0;
  
  var check = function() {
    setTimeout(
      function() {
        var url = workItemsUrl + "(UserId='" + workItem.UserId + "',Id='" + workItem.Id + "')";
        
        request.get({
          url: url,
          headers: { Authorization: auth, Host: hostName }
        },
        function (error, response, body) {
  
          if (error) throw error;
  
          if (response.statusCode == 200) {
            var workItem2 = JSON.parse(body);
  
            console.log('Checked status: ' + workItem2.Status);
  
            switch (workItem2.Status) {
              case 'InProgress':
                if (checked < 10) {
                  checked++;
                  check();
                } else {
                  console.log('Reached check limit.');
                  failure();
                }
                break;
              case 'FailedDownload':
                console.log('Failed to download!');
                failure(workItem2.StatusDetails.Report);
                break;
              case 'Succeeded':
                success(workItem2.Arguments.OutputArguments[0].Resource, workItem2.StatusDetails.Report);
                break;
              default:
                console.log('Unknown status: ' + workItem2.Status);
                failure(workItem2.StatusDetails.Report);
            }
          }
        });
      },
      2000
    );
  }
  check();
}

function downloadAndExtract(remoteZip, workItemId, reqId) {
  
  console.log('Downloading and extracting results');
  var localRoot = './downloads/' + workItemId; 
  var localZip = localRoot + '.zip';

  var r = request.get(remoteZip).pipe(fs.createWriteStream(localZip));
  r.on('finish',
    function() {
      var zip = new AdmZip(localZip);
      var entries = zip.getEntries(); 
      var success =
        unzipEntry(zip, 'jigsaw.png', localRoot, entries) &&
        unzipEntry(zip, 'jigsaw.dwg', localRoot, entries);
      
      storeItemStatus(reqId, success ? localRoot : 'failed');
    }
  );
}

function downloadAndDisplay(report, workItemId) {
  
  console.log('Downloading and displaying report');
  var localReport = './downloads/' + workItemId + ".txt"; 

  var r = request.get(report).pipe(fs.createWriteStream(localReport));
  r.on('finish',
    function() {
      console.log('Report written to ' + localReport);
    }
  );
}

function unzipEntry(zip, file, path, entries) {
  
  if (entries.filter(function(val) { return val.entryName === file; }).length > 0) {
    zip.extractEntryTo(file, path, false, true);
    console.log('Extracted ' + path + '/' + file);
    return true;
  }
  return false;
}

function storeItemStatus(reqId, status) {

  fs.writeFile('./items/' + reqId, status,
    function(err) {
      if (err) {
        return console.log('Write error: ' + err);
      }
  });  
}