function populateControls() {
  var AnimationSettings = {
    hideDelay: 250
  };
  var createSlider = function(id, value, min, max, step, callback) {
    var numberId = id + "_number";
    var sliderUpdateFunction = function(event) {
      $("#"+numberId).attr('value', event.target.value);
      callback(event.target.value);
    }
    var numberUpdateFunction = function(event) {
      $("#"+id).attr('value', event.target.value);
      callback(event.target.value);
    }
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
                .change(sliderUpdateFunction)
            )
    );
  }

  var createCheckbox = function(id, checked, callback) {
    var updateFunction = function(event) {
      callback(event.target.checked);
    }
    return $('<tr>').attr('id',id+"_parent").append($('<td>')
            .append(id+": ")
            .append($('<input>')
              .attr('id', id)
              .attr('type', "checkbox")
              .prop('checked', checked)
              .change(updateFunction))
    );
  }

  var createTitle = function(id) {
    return $('<tr>').append($('<td>').attr('class', "selected").append(id));
  }

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
  }

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
  }

  // Create the UI controls
  addGroup("Model Settings", [
    createCheckbox("lockRotationY", ViewParameters.isLockRotationY, function(value) {
      ViewParameters.isLockRotationY = value;
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
}
