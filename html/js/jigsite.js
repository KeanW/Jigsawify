var stage = 0;
var pixelsWidth = 450;
var uploadedBlob = undefined;

var stageText =
  [
    "1. Choose your favorite picture",
    "2. Adjust the look of the engraving with the slider",
    "3. Choose the size and number of pieces",
    ""
  ];

var elements =
  [
    'explanation',   // 0
    'droppedimage',  // 1
    'engravedimage', // 2
    'engimage',      // 3
    'dropbox',       // 4
    'threshold',     // 5
    'size',          // 6
    'nav',           // 7
    'back',          // 8
    'next',          // 9
    'process'        // 10
  ];

// Elements that are visible at each stage

var stages =
  [
    [0, 4],           // Stage 0 - ready to drop
    [1, 5, 7, 8, 9],  // Stage 1 - image loaded, adjust slider
    [2, 6, 7, 8, 10], // Stage 2 - choose size and pieces
    []                // Stage 3 - ?
  ];

// Initiallize all the elements to be considered on

var on = [];
for (var i = 0; i < elements.length; i++) {
  on.push(true); // All elements initially on
}

function setStage(newStage) {

  // Some custom logic to be run for the stages that need it
  
  if (newStage == 0) {
    $('#content')[0].style.width = "640px";
    
    // Clear the engraved image
    
    var canvas = $("#rawData2")[0];
    if (canvas) {
      canvas.height = 0;
      $('#threshold')[0].value = 70;
    }
  }
  
  if (newStage == 1) {
    $('#content')[0].style.width = "100%";
    setTimeout(function(){
      edgeDetector.init($('#image')[0], "rawData", $('#engimage')[0]);
      edgeDetector.update(edgeDetector.threshold);
    }, 0);
  }

  if (newStage == 2) {
    $('#content')[0].style.width = "640px";
    setTimeout(function(){
      edgeDetector.init($('#image')[0], "rawData2", $('#engimage')[0]);
      edgeDetector.update(edgeDetector.threshold);
      setWidth(12);
      setPieces(1000);
    }, 0);
  }
  
  // Then we just loop through the elements, switching the ones
  // on that we need (and turning the rest that are on to be off)
  
  var list = stages[newStage];
  for (var i=0; i < elements.length; i++) {
    var idx = list.indexOf(i);
    if (idx < 0) { // Element should be off
      if (on[i]) { // But it is on
        $('#' + elements[i]).hide();
        on[i] = false;
      }
    }
    else { // Element should be on
      if (!on[i]) { // But it is off
        $('#' + elements[i]).show();
        on[i] = true;
      }
    }
  }
  
  stage = newStage;
  $('#instruction')[0].innerHTML = stageText[stage];
}

function back() {
  setStage(stage-1);
}

function forward() {
  setStage(stage+1);
}

function process() {
  var args = {
    pieces: $('#pieces').val(),
    width: $('#width').val(),
    height: $('#height').val(),
    units: $('#units').val(),
    threshold: $('#threshold').val(),
    upload: uploadedBlob
  }
  /*
  alert(
    "Pieces: " + args.pieces +
    ", width: " + args.width +
    ", height: " + args.height +
    ", units: " + args.units +
    ", threshold: " + args.threshold +
    ", upload: " + args.upload
  );
  */
  
  $.get(
    window.location.origin + '/api/submit' + $.param(args),
    function(req, res) {
      if (res === "success") {  
          if (req !== "") {
          }
      }
    }
  );
}

var edgeDetector = new edgeDetector();

function round2(n) {
  return Math.round(n * 100) / 100;
}

function calcDim(val, getWidth) {
  var aspect =
    edgeDetector.imgElement.width /
    edgeDetector.imgElement.height;
  return getWidth ? val * aspect : val / aspect;
}

function setWidth(val) {
  $('#width').val(round2(val));
  $('#height').val(round2(calcDim(val, false)));
}

function setHeight(val) {
  $('#width').val(round2(calcDim(val, true)));
  $('#height').val(round2(val));
}

function setPieces(val) {
  $('#pieces').val(val);
}

$(document).ready(function () {

  $('#width').change(function () { setWidth($(this).val()); } );
  $('#height').change(function () { setHeight($(this).val()); } );

  setStage(0);

  var settings = $(".media-drop").html5Uploader({

    postUrl: '/api/upload',
    imageUrl: 'image',
    maxLength: pixelsWidth,

    /**
     * File dropped / selected.
     */
    onDropped: function (success) {
      if (!success) {
        $('.errormessages').text(
          'Only jpg, png or gif images are allowed.'
        );
      }
    },

    /**
     * Image cropped and scaled.
     */
    onProcessed: function (canvas) {
      if (canvas) {

        // Remove possible previously loaded image

        var url = canvas.toDataURL();
        var newImg = document.createElement("img");
        newImg.id = "image";
        newImg.onload = function () {
          //settings.cropRatio = newImg.width / newImg.height;

          var oldHeight = newImg.height;
          var oldWidth = newImg.width;
          newImg.width = pixelsWidth;
          newImg.height = pixelsWidth * (oldHeight / oldWidth);

          edgeDetector.resetSize();
          edgeDetector.pixelData = edgeDetector.generatePixelData();
          edgeDetector.findEdges();
        }
        newImg.src = url;

        $('#droppedimage').empty().append(newImg);

        setStage(1);

        // Reset dropbox for reuse

        $('.errormessages').empty();
        $('.media-drop-placeholder > *').show();
        $('.media-drop-placeholder').toggleClass(
          'busyloading', false).css('cursor', 'auto');

        edgeDetector.process();
        
      } else {

        window.alert(
          "File not recognized as an image, " +
          "try again with a different file."
        );
      }
    },

    /**
     * Image uploaded.
     *
     * @param success boolean True indicates success
     * @param responseText String Raw server response
     */
    onUploaded: function (success, responseText) {
      if (success) {
        window.alert('Image uploaded successfully: ' + responseText);
        uploadedBlob = responseText;
      } else {
        window.alert('Image upload failed: ' + responseText);
      }
    },

    /**
     * Progress during upload.
     *
     * @param progress Number Progress percentage
     */
    onUploadProgress: function (progress) {
      window.console && console.log('Upload progress: ' + progress);
    }
  });

});
