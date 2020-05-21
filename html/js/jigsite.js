var stage = 0;
var pixelsWidth = 300;
var uploadedBlob = undefined;
var already = undefined;
var spinner = undefined;

var stageText = [
  "1. Choose your favorite picture",
  "2. Adjust the look of the engraving using the slider",
  "3. Choose the size and number of pieces",
  "Waiting for a response from the Autodesk cloud...",
  "4. Check the results and download your DWG or DXF",
];

var elements = [
  "explanation", // 0
  "droppedimage", // 1
  "engravedimage", // 2
  "engimage", // 3
  "loading", // 4
  "jigsaw", // 5
  "jigimage", // 6
  "dropbox", // 7
  "threshold", // 8
  "size", // 9
  "nav", // 10
  "back", // 11
  "next", // 12
  "dwg", // 13
  "dxf", // 14
];

// Elements that are visible at each stage

var stages = [
  [0, 7], // Stage 0 - ready to drop
  [1, 8, 10, 11, 12], // Stage 1 - image loaded, adjust slider
  [2, 9, 10, 11, 12], // Stage 2 - choose size and pieces
  [4, 6, 10, 11], // Stage 3 - waiting...
  [5, 6, 10, 11, 13, 14], // Stage 4 - show results
];

// Initialize all the elements to be considered on

var on = [];
for (var i = 0; i < elements.length; i++) {
  on.push(true); // All elements initially on
}

function turnOn(id) {
  var idx = elements.indexOf(id);
  if (idx >= 0) {
    $("#" + id).show();
    on[idx] = true;
  }
}

function buildCanvas(img, id, after) {
  var canvas = undefined;
  if (id) {
    canvas = $("#" + id)[0];
    if (!canvas) {
      if (!after) {
        after = img;
      }

      $(
        "<canvas class='can' id='" +
          id +
          "' width='" +
          img.width +
          "' height='" +
          img.height +
          "'></canvas>"
      ).insertAfter(after);

      canvas = $("#" + id)[0];
    } else {
      canvas.width = img.width;
      canvas.height = img.height;
    }
  } else {
    // Create a canvas using other means

    canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
  }
  return canvas;
}

function setStage(newStage) {
  // Some custom logic to be run for the stages that need it

  switch (newStage) {
    case 0:
      //$('#content')[0].style.width = '640px';

      // Clear the engraved image, reset the slider

      var canvas = $("#rawData2")[0];
      if (canvas) {
        canvas.height = 0;
      }
      $("#threshold")[0].value = 70;
      break;

    case 1:
      //$('#content')[0].style.width = '100%';
      setTimeout(function () {
        var img = $("#image")[0];
        var canvas = buildCanvas(img, "rawData");
        var outcanvas = buildCanvas(img);
        var thresh = $("#threshold")[0].value;
        edgeDetector.threshold = thresh;
        edgeDetector.init(img, canvas, outcanvas);
        edgeDetector.update(thresh);
      }, 0);
      break;

    case 2:
      //$('#content')[0].style.width = '640px';
      setTimeout(function () {
        if (spinner) spinner.stop();

        var img = $("#image")[0];
        var canvas = buildCanvas(img, "rawData2", $("#engimage")[0]);
        var outcanvas = buildCanvas(img);
        edgeDetector.init(img, canvas, outcanvas);
        edgeDetector.update(edgeDetector.threshold);
        if (already) {
          // This will keep the proportions of the new image
          setWidth($("#width").val());
        } else {
          setWidth(12);
          setPieces(100);
          already = true;
        }
      }, 0);
      break;

    case 3:
      // Only enter the waiting stage if going forward

      if (stage == 2) {
        // Not ready to move forward if image isn't uploaded

        if (!uploadedBlob) return;

        // Create our HTML spinner
        // (from http://fgnass.github.io/spin.js)

        if (spinner) {
          spinner.spin($("#loading")[0]);
        } else {
          var opts = {
            lines: 13,
            length: 28,
            width: 14,
            radius: 42,
            scale: 1.5,
            corners: 1,
            color: "#fff",
            opacity: 0.25,
            rotate: 0,
            direction: 1,
            speed: 1,
            trail: 60,
            fps: 20,
            zIndex: 2e9,
            className: "spinner",
            top: "50%",
            left: "50%",
            shadow: false,
            hwaccel: false,
            position: "absolute",
          };
          spinner = new Spinner(opts);
          spinner.spin($("#loading")[0]);
        }

        process();
      } else {
        // Otherwise we skip it

        setStage(2);
        return;
      }
      break;

    case 4:
      if (spinner) spinner.spin();
      break;
    default:
  }

  // Then we just loop through the elements, switching the ones
  // on that we need (and turning the rest that are on to be off)

  var list = stages[newStage];
  for (var i = 0; i < elements.length; i++) {
    var idx = list.indexOf(i);
    if (idx < 0) {
      // Element should be off
      if (on[i]) {
        // But it is on
        $("#" + elements[i]).hide();
        on[i] = false;
      }
    } else {
      // Element should be on
      if (!on[i]) {
        // But it is off
        $("#" + elements[i]).show();
        on[i] = true;
      }
    }
  }

  stage = newStage;
  $("#instruction")[0].innerHTML = stageText[stage];
}

function back() {
  setStage(stage - 1);
}

function forward() {
  setStage(stage + 1);
}

function slide(num) {
  edgeDetector.update(num);
}

function process() {
  var args = {
    pieces: $("#pieces").val(),
    width: $("#width").val(),
    height: $("#height").val(),
    units: $("#units").val(),
    res: pixelsWidth,
    threshold: $("#threshold").val(),
    upload: uploadedBlob,
  };

  $.get(window.location.origin + "/api/submit?" + $.param(args), function (
    req,
    res
  ) {
    if (res === "success") {
      if (req !== "" && req.workItemId) {
        //console.log('Request Id is ' + req);

        check(req.workItemId, function (res2) {
          if (res2.result === "success" && res2.report !== "failed") {
            $("#jigimage").attr("src", res2.report + "/jigsaw.png");
            setLinkAndSizeTooltip("#dwg", res2.report + "/jigsaw.dwg");
            setLinkAndSizeTooltip("#dxf", res2.report + "/jigsaw.dxf");
            forward();
          } else if (res2.report === "failed") {
            if (spinner) spinner.stop();
            Swal.fire({
              icon: "info",
              title: "This is not expected here...",
              text: "Bug the author",
              footer:
                '<a href="https://github.com/KeanW/Jigsawify/issues/new">Would you like to raise a issue?</a>',
            });
          } else {
            if (spinner) spinner.stop();
            var url = window.location + res2.report;
            Swal.fire({
              icon: "error",
              title: "Oops..something went wrong!",
              text: `${res2.error}`,
              footer: `<a href=${url} target=\"_blank\">View Error Report</a>`,
            });
          }
        });
      }
    }
  });
}

function setLinkAndSizeTooltip(id, url) {
  findSize(url, function (size) {
    var elem = $(id);
    elem.attr("onclick", 'window.location.href="' + url + '"');
    elem.tooltip({ placement: "top", title: humanFileSize(size, false) });
  });
}

// From: http://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable

function humanFileSize(bytes, si) {
  var thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + " B";
  }
  var units = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  //si ? ['kB','MB','GB','TB','PB','EB','ZB','YB']
  //: ['KiB','MiB','GiB','TiB','PiB','EiB','ZiB','YiB'];
  var u = -1;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.abs(bytes) >= thresh && u < units.length - 1);
  return bytes.toFixed(1) + " " + units[u];
}

function findSize(url, success) {
  var request;
  request = $.ajax({
    type: "HEAD",
    url: url,
    success: function () {
      success(request.getResponseHeader("Content-Length"));
    },
  });
}

function check(id, fun) {
  $.get(window.location.origin + "/api/check?workItemId=" + id, function (
    req,
    res
  ) {
    if (req !== "") {
      console.log(res);
      if (req === "failed") {
        window.alert("Request failed, please try again.");
        back();
      } else if (res !== "success") {
      } else {
        fun(req);
      }
    } else if (stage === 3) {
      check(id, fun);
    }
  });
  //setTimeout(function () {}, 2000);
}

var edgeDetector = new EdgeDetector();

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calcDim(val, getWidth) {
  var aspect = edgeDetector.imgElement.width / edgeDetector.imgElement.height;
  return getWidth ? val * aspect : val / aspect;
}

function setWidth(val) {
  $("#width").val(round2(val));
  $("#height").val(round2(calcDim(val, false)));
}

function setHeight(val) {
  $("#width").val(round2(calcDim(val, true)));
  $("#height").val(round2(val));
}

function setPieces(val) {
  $("#pieces").val(val);
}

$(document).ready(function () {
  // Disable caching of AJAX responses (needed for IE)

  $.ajaxSetup({ cache: false });

  $("#title").tooltip({
    placement: window.innerWidth < 681 ? "bottom" : "right",
  });

  $("#width").change(function () {
    setWidth($(this).val());
  });
  $("#height").change(function () {
    setHeight($(this).val());
  });

  setStage(0);

  var settings = $(".media-drop").html5Uploader({
    postUrl: "/api/upload",
    imageUrl: "image",
    maxLength: pixelsWidth,

    // File dropped / selected

    onDropped: function (success) {
      if (!success) {
        $(".errormessages").text("Only jpg, png or gif images are allowed.");
      }
    },

    // Image cropped and scaled

    onProcessed: function (canvas) {
      if (canvas) {
        // Remove possible previously loaded image

        var url = canvas.toDataURL();
        var newImg = document.createElement("img");
        newImg.id = "image";
        newImg.onload = function () {
          var oldHeight = newImg.height;
          var oldWidth = newImg.width;
          newImg.width = pixelsWidth;
          newImg.height = pixelsWidth * (oldHeight / oldWidth);

          edgeDetector.resetSize();
          edgeDetector.pixelData = edgeDetector.generatePixelData();
          edgeDetector.findEdges();
        };
        newImg.src = url;

        $("#droppedimage").empty().append(newImg);

        setStage(1);

        // Reset dropbox for reuse

        $(".errormessages").empty();
        $(".media-drop-placeholder > *").show();
        $(".media-drop-placeholder")
          .toggleClass("busyloading", false)
          .css("cursor", "auto");
      } else {
        window.alert(
          "File not recognized as an image, " +
            "try again with a different file."
        );
      }
    },

    // Image uploaded

    onUploaded: function (success, responseText) {
      if (success) {
        uploadedBlob = responseText;
      } else {
        window.alert("Image upload failed: " + responseText);
      }
    },

    // Progress during upload

    onUploadProgress: function (progress) {
      //window.console && console.log('Upload progress: ' + progress);
    },
  });
});
