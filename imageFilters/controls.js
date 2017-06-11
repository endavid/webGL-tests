(function() {
  "use strict";

  var texturePresets = [
    {name: "uvChecker", value: "../modelViewer/resources/UVTextureChecker4096.png"}
  ];

  var filterPresets = [
    {name: "identity", value: "identity"}
  ];

  var AnimationSettings = {
    hideDelay: 250
  };

  function createTitle(id) {
    return $('<tr>').append($('<td>').attr('class', "selected").append(id));
  }

  function addGroup(id, elements) {
    var elementIds = [];
    elements.forEach(function(element) {
      // *_parent ids
      elementIds.push(element.attr('id'));
    });
    var toggle = function() {
      elementIds.forEach(function(elementId) {
        $("#"+elementId).toggle(AnimationSettings.hideDelay);
      });
    };
    var tbody = $("#controls").find('tbody');
    tbody.append(createTitle(id).click(toggle));
    elements.forEach(function(element) {
      tbody.append(element);
    });
  }

  function createDropdownList(id, list, callback) {
    var updateFunction = function(event) {
      var i = event.target.selectedIndex;
      var obj = {name: event.target.options[i].innerHTML, uri: event.target.value};
      callback(obj);
    };
    var select = $('<select>').attr('id', id).change(updateFunction);
    list.forEach(function (obj) {
      select.append($('<option>').attr('value', obj.value).append(obj.name));
    });
    return $('<tr>').attr('id',id+"_parent").append($('<td>')
            .append(id+": ").append(select));
  }

  function createButtonWithOptions(id, buttonText, midText, options, callback) {
    var select = $('<select>').attr('id', id+"_select");
    options.forEach(function (obj) {
      select.append($('<option>').attr('value', obj.value).append(obj.name));
    });
    return $('<tr>').attr('id',id+"_parent").append($('<td>')
            .append($("<button>")
              .attr('id', id)
              .attr('type', "button")
              .click(callback)
              .append(buttonText)
              )
              .append(midText)
              .append(select)
            );
  }

  function createImage(id, width, height) {
    var img = $('<img>').attr('id', id).attr('width', width).attr('height', height);
    return $('<tr>').attr('id', id+"_parent").append($('<td>').append(img));
  }

  function addUrisToDropdownList(id, list) {
    var select = $('#'+id);
    list.forEach(function (obj) {
      var option = $('<option>').attr('value', obj.uri).append(obj.name);
      select.append(option);
    });
    if (list.length > 0) {
      select.val(list[0].uri);
    }
  }

  function createFileBrowser(id, callback) {
    var updateFunction = function(event) {
      var fileArray = [];
      for (var i = 0; i < event.target.files.length; i++) {
        var f = event.target.files[i];
        fileArray.push({
          name: f.name,
          uri: URL.createObjectURL(f)
        });
      }
      callback(fileArray);
    };
    return $('<tr>').attr('id', id+"_parent").append($('<td>')
      .append($("<input>")
        .attr('id', id)
        .attr('type', 'file')
        // .obj, .json doesn't work in Safari...
        //.attr('accept', '.obj,.json,.dae,.mtl,image/*')
        .attr('multiple', '')
        .change(updateFunction)
      )
    );
  }

  function createSlider(id, value, min, max, step, callback) {
    var numberId = id + "_number";
    var sliderUpdateFunction = function(event) {
      $("#"+numberId).attr('value', event.target.value);
      callback(event.target.value);
    };
    var numberUpdateFunction = function(event) {
      $("#"+id).attr('value', event.target.value);
      callback(event.target.value);
    };
    return $('<tr>').attr('id',id+"_parent").append($('<td>')
            .append(id+": <br/>")
            .append($('<input>')
              .attr('id', numberId)
              .attr('type', 'number')
              .attr('value', value)
              .change(numberUpdateFunction)
            )
            .append($('<input>')
                .attr('id', id)
                .attr('type', 'range')
                .attr('min', min)
                .attr('max', max)
                .attr('step', step)
                .attr('value', value)
                .on('input', sliderUpdateFunction)
                .change(sliderUpdateFunction)
            )
    );
  }

  function previewImage(uri) {
    $("#imagePreview").attr("src", uri);
  }

  function onChangeFileBrowser(values) {
    if (values.length > 0) {
      // load first image
      window.loadTexture(values[0].uri);
      previewImage(values[0].uri);
      // add models to preset list
      addUrisToDropdownList("Images", values);
    }
  }

  function populateControls() {
    // Create the UI controls
    addGroup("File", [
      createFileBrowser("fileBrowser", onChangeFileBrowser),
      createDropdownList("Images", texturePresets, function(obj) {
        window.loadTexture(obj.uri);
        previewImage(obj.uri);
      }),
      createImage("imagePreview", 64, 64),
      createButtonWithOptions("saveFile", "Save", " as ", [{name: "PNG", value:"png"}, {name: "JPEG", value:"jpeg"}], function (e) {
        var modelType = $("#"+e.target.id+"_select").attr("value");
        var canvas = document.getElementById("glCanvas");
        window.open(canvas.toDataURL('image/'+modelType));
        console.log(modelType);
      }),
    ]);
    addGroup("Settings", [
      createSlider("logCanvasSize", 9, 8, 12, 1, function(value) {
        var canvas = document.getElementById("glCanvas");
        var size = Math.pow(2, value);
        canvas.width = size;
        canvas.height = size;
      }),
      createDropdownList("Image filter", filterPresets, function(obj) {
        console.log(obj);
      })
    ]);
    previewImage(texturePresets[0].value);
  }

  $( document ).ready(function() {
    populateControls();
  });
})();
