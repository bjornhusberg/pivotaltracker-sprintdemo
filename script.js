
$(document).ready(function() {
  var project = location.search.replace(/.*[\\?&]project=([^&#]*).*/, "$1");
  var token = location.search.replace(/.*[\\?&]token=([^&#]*).*/, "$1");

  if (!project || !token) {
    return;
  }

  $("form").hide();
  $(".title").text("Loading...");

  loadResource(project, token, "/", function(projectDetails) {
    loadResource(project, token, "/iterations?date_format=millis&scope=current",
      function(iterations) {
        showSlide(createSlideshow(iterations[0], projectDetails), 0);
    });
  });
});

function loadResource(project, token, resource, callback) {
  $.ajax({
    dataType: "json",
    url: "https://www.pivotaltracker.com/services/v5/projects/" + project + resource,
    headers: {"X-TrackerToken": token}
  }).done(function(envelope) {
    callback(envelope);
  }).fail(function() {
    $(".title").text("Load failed.");
  });
}

function createSlideshow(iteration, projectDetails) {
  var slides = [createCoverSlide(iteration, projectDetails)];
  var currentRelease = null;
  $.each(iteration.stories, function(i, story) {
    if (story.story_type == "release") {
      currentRelease = story.name;
    } else {
      slides.push(createStorySlide(story, currentRelease));
    }
  });
  return slides;
}

function createStorySlide(story, currentRelease) {
  var slide = {
    classes: getAllLabels(story),
    title: getTitle(story),
    description: story.description || "",
    descriptionHeader: currentRelease,
    labels: getVisibleLabels(story),
    prefix: getPrefix(story)
  };
  setSlideClass(slide, "blocked", story.name.match(/\[block[^\]]*\]/i));
  setSlideClass(slide, "finished", story.current_state != "started");
  setSlideClass(slide, "labels", slide.labels);
  setSlideClass(slide, "header", currentRelease);
  return slide;
}

function createCoverSlide(iteration, projectDetails) {
  return {
    classes: ["cover"],
    title: projectDetails.name,
    description: formatDateInterval(iteration.start)
  };
}

function setSlideClass(slide, className, predicate) {
  if (predicate !== null && predicate !== false && predicate.length !== 0) {
    slide.classes.push(className);
  }
}

function showSlide(slides, index) {
  var slide = slides[index];

  $("body").removeClass().addClass(slide.classes.join(" "));
  $("#title").text(slide.title || "");
  if (slide.prefix) {
    $("#title").prepend($("<span>").addClass("prefix").text(slide.prefix));
  }
  $("#header").text(slide.descriptionHeader || "");
  $("#description").text(slide.description || "");
  $("#labels").html($.map(slide.labels || [],
    function(label) {
      return $("<span>").addClass("label").text(label);
    }));

  $(document).off("keydown");
  $(document).on("keydown", function(event) {
    if (event.which == 39 && index + 1 < slides.length) {
      showSlide(slides, index + 1);
    } else if (event.which == 37 && index > 0) {
      showSlide(slides, index - 1);
    }
  });
}

function formatDateInterval(start, end) {
  return formatDate(new Date(start)) + " - " + formatDate(end || new Date());
}

function formatDate(date) {
  return date.getDate() + "/" + (date.getMonth() + 1);
}

function getPrefix(story) {
  var prefix = story.name.replace(/^([A-Z0-9]*) .*/, "$1");
  return prefix == story.name ? "" : prefix;
}

function getTitle(story) {
  return story.name
            .replace(/^[A-Z0-9]* (.*)/, "$1")
            .replace(/\[block[^\]]*\]/ig, "");
}

function getAllLabels(story) {
  return $.map(story.labels, function(label) {
    return label.name;
  });
}

function getVisibleLabels(story) {
  return $.grep(getAllLabels(story), function(label) {
    return label != "fasttrack" && label != "demo";
  });
}
