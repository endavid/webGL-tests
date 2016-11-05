function populateControls() {
  var AnimationSettings = {
    hideDelay: 250
  };
  var createSlider = function(id, value, min, max, step, callback) {
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
  };

  var createCheckbox = function(id, checked, callback) {
    var updateFunction = function(event) {
      callback(event.target.checked);
    };
    return $('<tr>').attr('id',id+"_parent").append($('<td>')
            .append(id+": ")
            .append($('<input>')
              .attr('id', id)
              .attr('type', "checkbox")
              .prop('checked', checked)
              .change(updateFunction))
    );
  };

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

  function addUrisToDropdownList(id, list) {
    var select = $('#'+id);
    list.forEach(function (obj) {
      var option = $('<option>').attr('value', obj.uri).append(obj.name);
      select.append(option);
    });
  }

  var createButton = function(id, text, callback) {
    return $('<tr>').attr('id',id+"_parent").append($('<td>')
            .append($("<button>")
              .attr('id', id)
              .attr('type', "button")
              .click(callback)
              .append(text))
            );
  };

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

  var createTitle = function(id) {
    return $('<tr>').append($('<td>').attr('class', "selected").append(id));
  };

  var createFileBrowser = function(id, callback) {
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
        //.attr('accept', '.obj,.json,.mtl,image/*')
        .attr('multiple', '')
        .change(updateFunction)
      )
    );
  };

  var addGroup = function(id, elements) {
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
  };

  ViewParameters.onRotation = function() {
    if (ViewParameters.modelRotationTheta < 0) {
      ViewParameters.modelRotationTheta += 2 * Math.PI;
    }
    if (ViewParameters.modelRotationTheta > 2 * Math.PI) {
      ViewParameters.modelRotationTheta -= 2 * Math.PI;
    }
    if (ViewParameters.modelRotationPhi < 0) {
      ViewParameters.modelRotationPhi += 2 * Math.PI;
    }
    if (ViewParameters.modelRotationPhi > 2 * Math.PI) {
      ViewParameters.modelRotationPhi -= 2 * Math.PI;
    }
    $("#modelRotationTheta").attr('value', ViewParameters.modelRotationTheta);
    $("#modelRotationTheta_number").attr('value', ViewParameters.modelRotationTheta);
    $("#modelRotationPhi").attr('value', ViewParameters.modelRotationPhi);
    $("#modelRotationPhi_number").attr('value', ViewParameters.modelRotationPhi);
  };


  function onChangeFileBrowser(values) {
    var models = [];
    for (var i = 0 ; i < values.length; i++) {
      var ext = GFX.getFileExtension(values[i].name);
      if (ext === "Json" || ext === "Obj") {
        models.push(values[i]);
      } else { // the rest should be images!
        ViewParameters.imageUris[values[i].name] = values[i].uri;
      }
    }
    // add models to preset list
    if (models.length > 0) {
      ViewParameters.model = models[0];
      addUrisToDropdownList("Presets", models);
    }
  }


  var modelPresets = ["pear.json", "banana.json", "orange.json", "banana.obj"].map(function(e) {
    return {name: e, value: "resources/"+e};
  });
  var missingTexturePresets = [
    {name: "uvChecker", value: "resources/UVTextureChecker4096.png"},
    {name: "white", value: "resources/white.png"}];
  // Create the UI controls
  addGroup("File", [
    createFileBrowser("fileBrowser", onChangeFileBrowser),
    createDropdownList("Presets", modelPresets, function(obj) {
      ViewParameters.model = obj;
    }),
    createButtonWithOptions("saveFile", "Save", " as ", [{name: "OBJ Wavefront", value:".obj"}, {name: "Json", value:".json"}], function (e) {
      var modelType = $("#"+e.target.id+"_select").attr("value");
      console.log(modelType);
      GFX.exportModel(ViewParameters.model, modelType);
    }),
  ]);
  addGroup("Model Settings", [
    createCheckbox("lockRotationY", ViewParameters.isLockRotationY, function(value) {
      ViewParameters.isLockRotationY = value;
    }),
    createCheckbox("z_up", ViewParameters.isZAxisUp, function(value) {
      ViewParameters.isZAxisUp = value;
      ViewParameters.needsReload = true;
    }),
    createSlider("modelRotationTheta",
      ViewParameters.modelRotationTheta, 0, 2 * Math.PI, 0.01, function(value) {
        ViewParameters.modelRotationTheta = parseFloat(value);
    }),
    createCheckbox("lockRotationX", ViewParameters.isLockRotationX, function(value) {
      ViewParameters.isLockRotationX = value;
    }),
    createSlider("modelRotationPhi",
      ViewParameters.modelRotationPhi, 0, 2 * Math.PI, 0.01, function(value) {
        ViewParameters.modelRotationPhi = parseFloat(value);
    })
  ]);
  addGroup("Camera Settings", [
    createSlider("cameraDistance",
      ViewParameters.cameraDistance, -10, -0.9, 0.01, function(value) {
        ViewParameters.cameraDistance = parseFloat(value);
    }),
    createSlider("cameraHeight",
      ViewParameters.cameraHeight, -2, 2, 0.01, function(value) {
        ViewParameters.cameraHeight = parseFloat(value);
    })
  ]);
  addGroup("Shader Settings", [
    createDropdownList("Missing texture", missingTexturePresets, function(obj) {
      ViewParameters.imageUris.missing = obj.uri;
      ViewParameters.needsReload = true;
    })
  ]);
}
