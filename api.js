var fs = require('fs');
var request = require('request');
var url = require('url');
var Canvas = require('./node_modules/canvas'),
    Image = Canvas.Image;
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
var crypto = require('crypto');

function randomValueBase64 (len) {
    return crypto.randomBytes(Math.ceil(len * 3 / 4))
        .toString('base64')   // convert to base64 format
        .slice(0, len)        // return required number of characters
        .replace(/\+/g, '0')  // replace '+' with '0'
        .replace(/\//g, '0'); // replace '/' with '0'
}

function storeItemStatus(reqId, status) {
  fs.writeFile("./items/" + reqId, status,
    function(err) {
      if (err) {
        return console.log("Write error! " + err);
      }
  });  
}

function unzipEntry(zip, file, path, entries) {
  
  if (entries.filter(function(val) { return val.entryName === file; }).length > 0) {
    zip.extractEntryTo(file, path, false, true);
    console.log('Extracted ' + path + '/' + file);
    return true;
  }
  return false;
}

/*
exports.getToken = function (req, res) {

  var params = {
    client_id: process.env.CONSUMER_KEY,
    client_secret: process.env.CONSUMER_SECRET,
    grant_type: 'client_credentials'
  }

  request.post(baseUrl + '/authentication/v1/authenticate',
    { form: params },
    function (error, response, body) {
      if (!error && response.statusCode == 200) {                
        var authResponse = JSON.parse(body);
        res.send(authResponse);
      }
    }
  );
};
*/

exports.checkData = function (req, res) {

  var args = url.parse(req.url, true).query;
  if (args.item) {
    fs.readFile('./items/' + args.item, function(err, blob){      
      if (err) {
        res.end();
      } else {
        console.log("Found checked item! " + args.item);
        res.send(blob);
        console.log("Data returned: " + blob);
      }
    });
  }
}

exports.submitData = function (req, res) {

  var reqId = randomValueBase64(6);
  res.end(reqId);
  
  var args = url.parse(req.url, true).query;
  
  // Reduce the arguments to get the basic call working
  
  var args2 = {
    Width: Math.round(args.width),
    Height: Math.round(args.height),
    Pieces: Math.round(args.pieces)
  }
  
  var params = {
    client_id: process.env.CONSUMER_KEY,
    client_secret: process.env.CONSUMER_SECRET,
    grant_type: 'client_credentials'
  }

  request.post(authUrl,
    { form: params },
    function (error, response, body) {
      if (error) {
        console.log("Error: " + error);
      }
      if (!error && response.statusCode == 200) {                
        
        var authResponse = JSON.parse(body);
        var auth = authResponse.token_type + ' ' + authResponse.access_token;

        console.log('Authorized: ' + auth);
        
        //var width = args2.Width, height = args2.Height;
        var width = parseInt(args.res),
            height = Math.round(parseInt(args.height) * width / parseInt(args.width));
        
        console.log('Reading file: ' + args.upload);

        console.log("Creating a " + width + " x " + height + " image.");

        var img = new Image(width, height);
        img.onload = function() {
          var raw = new Canvas(width, height);
          var out = new Canvas(width, height);
          
          console.log('Initializing edge detector...');

          var ed = new edge.EdgeDetector();
          ed.init(img, raw, out, width, height, args.threshold);
          var pts = ed.generatePoints(width, height, args2, true); // Compress by default
          var spts = JSON.stringify(pts);

          console.log('Initializing work item data...');

          var data = {
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
                  Resource: 'data:application/json, ' + spts,
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
          
          var postData = JSON.stringify(data);
          
          var headers = {
            Authorization: auth,
            'Content-Type': 'application/json',
            'Content-Length': postData.length,
            Host: hostName
          }
  
          console.log(
            'Creating work item (request length ' + postData.length +
            ', of which ' + spts.length + ' is pt data)'
          );
          
          request.post({
            url: workItemsUrl,
            headers: headers,
            body: postData
          },
          function (error, response, body) {

            if (error) throw error;

            // Extract the Id and UserId from the WorkItem
            
            var workItem = JSON.parse(body);
            
            if (!workItem.Id || !workItem.UserId) {
              console.log('Problem with request:  ' + body);
              return;
            }
            
            console.log('Created work item (Id ' + workItem.Id + ' for user ' + workItem.UserId + ')');
  
            var data2 = {
              UserId: workItem.UserId,
              Id: workItem.Id,
              Version: 1,
              ActivityId: {
                Id: activityName,
                UserId: userId
              }
            }
            var postData2 = JSON.stringify(data2);
 
            console.log('Checking work item status (request length ' + postData2.length + ')');
            
            // We're going to request the status for this WorkItem in a loop
            // We'll perform up to 10 checks, 2 seconds between each
            
            var checked = 0;
            var check = function () {
              setTimeout(
                function() {
                  var url = workItemsUrl + "(UserId='" + workItem.UserId + "',Id='" + workItem.Id + "')";
                  
                  request.get({
                    url: url,
                    headers: { Authorization: auth, Host: hostName }
                  },
                  function (error2, response2, body2) {

                    if (error2) throw error2;

                    if (response2.statusCode == 200) {
                      var workItem2 = JSON.parse(body2);

                      console.log('Checked status: ' + workItem2.Status);
      
                      switch (workItem2.Status) {
                        case 'InProgress':
                          if (checked < 10) {
                            checked++;
                            check();
                          } else {
                            console.log('Reached check limit.');                            
                          }
                          break;
                        case 'FailedDownload':
                          console.log('Failed to download!');
                          storeItemStatus(reqId, 'failed');
                          break;
                        case 'Succeeded':
                          var remoteZip = workItem2.Arguments.OutputArguments[0].Resource;
                          
                          if (!remoteZip) {
                            console.log(
                              'Could not download (' + workItem2.Status + '): ' +
                              JSON.stringify(workItem2.StatusDetails)
                            );
                          } else {
                          
                            var localRoot = './downloads/' + workItem.Id; 
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
                          break;
                        default:
                          console.log('Unknown status: ' + workItem2.Status);
                      }
                    }                          
                  });
                },
                2000
              );
            }
            check();
        });
      }
      img.src = './uploads/' + args.upload;
    }
    else {
      console.log("Unknown status: " + response.statusCode);
    }
  });
  res.end();
}

