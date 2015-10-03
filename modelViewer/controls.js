function populateControls() {
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
    return $('<tr>').append($('<td>')
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
    return $('<tr>').append($('<td>')
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
  // @todo Hide controls from a group when clicking on Title group
  $("#controls").find('tbody')
      .append(createTitle("Model Settings"))
      .append(createCheckbox("lockRotationY", ViewParameters.isLockRotationY, function(value) {
        ViewParameters.isLockRotationY = value;
      }))
      .append(createSlider("modelRotationTheta",
        ViewParameters.modelRotationTheta, 0, 2 * Math.PI, 0.01, function(value) {
          ViewParameters.modelRotationTheta = parseFloat(value);
      }))
      .append(createCheckbox("lockRotationX", ViewParameters.isLockRotationX, function(value) {
        ViewParameters.isLockRotationX = value;
      }))
      .append(createSlider("modelRotationPhi",
        ViewParameters.modelRotationPhi, 0, 2 * Math.PI, 0.01, function(value) {
          ViewParameters.modelRotationPhi = parseFloat(value);
      }))
      .append(createTitle("Camera Settings"))
      .append(createSlider("cameraDistance",
        ViewParameters.cameraDistance, -10, -0.9, 0.01, function(value) {
          ViewParameters.cameraDistance = parseFloat(value);
      }))
      .append(createSlider("cameraHeight",
        ViewParameters.cameraHeight, -2, 2, 0.01, function(value) {
          ViewParameters.cameraHeight = parseFloat(value);
      }))
  ;
}
