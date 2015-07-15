// http://hacks.mozilla.org/2011/01/how-to-develop-a-html5-image-uploader/

var stage = 0;
var pixelsWidth = 450;

var stageText =
  [
    "1. Choose your favorite picture",
    "2. Adjust the look of the engraving with the slider",
    "3. Choose the size and number of pieces",
    ""
  ];

function setStage(newStage) {

  if (newStage < stage) {

    // Going back

    if (stage == 1 && newStage == 0) {
      $('#explanation').show();
      $('#droppedimage').hide();
      $('#dropbox').show();
      $('#nav').hide();
      $('#size').hide();
      $('#content')[0].style.width = "640px";
      stage = newStage;
    }
    else if (stage == 2 && newStage == 1) {
      $('#droppedimage').show();
      $('#engravedimage').hide();
      $('#threshold').show();
      $('#size').hide();
      $('#content')[0].style.width = "100%";
      edgeDetector.init($('#image')[0], "rawData");
      $('#next')[0].innerText = "Next";
      stage = newStage;
    }
    else if (stage == 3 && newStage == 2) {
      $('#engravedimage').show();
      $('#size').show();
      $('#instruction').show();
      $('#droppedimage')[0].style.width = ((pixelsWidth * 2) + 10) + "px";
      $('#engravedimage')[0].style.width = pixelsWidth + "px";
      stage = newStage;
    }
  }
  else {

    // Going forward

    if (stage == 0 && newStage == 1) {
      $('#explanation').hide();
      $('.errormessages').empty();
      $('.media-drop-placeholder > *').hide();
      $('.media-drop-placeholder').toggleClass(
        'busyloading', true).css('cursor', 'progress');
      $('#size').hide();
      stage = newStage;
    }
    else if (stage == 1 && newStage == 2) {
      $('#droppedimage').hide();
      $('#engimage').hide();
      $('#threshold').hide();
      $('#content')[0].style.width = "640px";
      $('#engravedimage').show();
      $('#droppedimage')[0].style.width = ((pixelsWidth * 2) + 10) + "px";
      $('#engravedimage')[0].style.width = pixelsWidth + "px";
      $('#size').show();
      //edgeDetector.generatePixelData();
      //edgeDetector.findEdges();
      setTimeout(function(){
        edgeDetector.init($('#image')[0], "rawData2", $('#engimage')[0]);
        edgeDetector.update(edgeDetector.threshold);
        setWidth(12);
        setPieces(1000);
      }, 0);
      $('#next')[0].innerText = "Process";
      stage = newStage;
    }
    else if (stage == 2 && newStage == 3) {
      $('#engravedimage').hide();
      $('#size').hide();
      $('#instruction').hide();
      stage = newStage;
      
      var width = 200,
          height = calcDim(200, false);
      var pixData = edgeDetector.generatePixelData(null, width, height);
      var pts = edgeDetector.generatePoints(pixData, width, height);
    
      $.get(
        window.location.origin + '/api/submit?' + $.param(pts),
        function (res) {
          alert(res);
        }
      );
    }
  }
  $('#instruction')[0].innerHTML = stageText[stage];
}

$(document).ready(function () {

  $('#nav').hide();
  $('#size').hide();

  //$('#back').on('click', function () {
  //  setStage(stage - 1);
  //});

  //$('#next').on('click', function () {
  //  setStage(stage + 1);
  //});

  var settings = $(".media-drop").html5Uploader({

    postUrl: 'upload.php',
    imageUrl: 'image.php',
    maxLength: pixelsWidth,

    /**
     * File dropped / selected.
     */
    onDropped: function (success) {
      if (!success) {
        $('.errormessages').text(
          'Only jpg, png or gif images are allowed.'
        );
      } else {
        setStage(1);
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

        // Show new image

        $('#content')[0].style.width = "100%";
        $('#droppedimage').empty().append(newImg);
        $('#droppedimage').show();

        // Hide dropbox

        $('#dropbox').hide();

        // Button to reset upload box

        $('#nav').show();

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
