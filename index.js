const { fromEvent } = rxjs;
const { map, filter, debounceTime, scan, startWith, combineLatest, distinctUntilChanged } = rxjs.operators;

/**
 * Shuffles an array.
 *
 * https://stackoverflow.com/a/12646864
 */
function shuffleArray(array) {
  const a = array.slice();

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

function init() {
  const images = shuffleArray([
    "image1.gif",
    "image2.gif",
    "image3.gif",
    "image4.gif",
    "image5.gif",
    "image6.gif",
    "image7.gif",
    "image8.gif"
  ]);

  // DOM element handlers
  const controlsElement = window.document.getElementById("controls");
  const imageElement = window.document.getElementById("image");
  const introElement = window.document.getElementById("intro");
  const outroElement = window.document.getElementById("outro");
  const sepiaElement = window.document.getElementById("sepia");
  const zoomElement = window.document.getElementById("zoom");

  // input event streams
  const zoomStream = fromEvent(zoomElement, "input");
  const sepiaStream = fromEvent(sepiaElement, "input");
  const scrollStream = fromEvent(window.document, "mousewheel");

  // update streams
  const stepsPerImage = 20;
  const progressLimit = stepsPerImage * images.length;

  const progressStream = scrollStream.pipe(
    // are we scrolling up or down?
    map(event => ((event.deltaY * -1 || event.wheelDelta || event.detail * -1) > 0 ? -1 : 1)),
    scan((progress, adjustment) => {
      const newProgress = progress + adjustment;
      return newProgress < 0 ? 0 : newProgress > progressLimit ? progress : newProgress;
    }, 0),
    startWith(0)
  );

  const controlsOpacityStream = progressStream.pipe(
    map(progress => {
      if (progress > 8) {
        return 1;
      }
      if (progress < 3) {
        return 0;
      }
      return (progress - 3) / 5;
    }),
    distinctUntilChanged()
  );

  const introOpacityStream = progressStream.pipe(
    filter(progress => progress <= 5),
    map(progress => (progress === 0 ? 1 : 1 - (progress / 5) * 2))
  );

  const outroOpacityStream = progressStream.pipe(
    map(progress => (progress === progressLimit ? 1 : 0)),
    startWith(0),
    distinctUntilChanged()
  );

  const imageIndexStream = progressStream.pipe(
    map(progress => Math.floor(progress / stepsPerImage)),
    distinctUntilChanged()
  );

  const imageStream = imageIndexStream.pipe(
    map(imageIndex => (imageIndex < images.length - 1 ? images[imageIndex] : images[images.length - 1]))
  );

  const percentWithinImageStream = progressStream.pipe(
    map(progress => {
      const imageIndex = Math.floor(progress / stepsPerImage);
      return ((progress - imageIndex * stepsPerImage) / stepsPerImage) * 100;
    })
  );

  const imageOpacityStream = progressStream.pipe(
    combineLatest(percentWithinImageStream),
    map(([progress, percent]) => {
      // TODO: remove magic strings
      if (progress === 0) {
        return 0.2;
      }
      if (progress === 1) {
        return 0.3;
      }
      if (progress === 2) {
        return 0.4;
      }
      if (progress === 3) {
        return 0.5;
      }
      if (progress === 4) {
        return 0.6;
      }
      if (progress === 5) {
        return 0.7;
      }
      if (progress === 6) {
        return 0.8;
      }
      if (progress === 7) {
        return 0.9;
      }
      if (progress === 8) {
        return 1;
      }
      if (progress >= progressLimit) {
        return 0;
      }

      if (percent < 20) {
        return percent / 20;
      }
      if (percent > 75) {
        return 1 - (percent - 75) / 20;
      }
      return 1;
    }),
    distinctUntilChanged()
  );

  const imageBlurStream = percentWithinImageStream.pipe(
    map(percent => {
      if (percent < 10) {
        return 5;
      }
      if (percent >= 10 && percent < 15) {
        return 4;
      }
      if (percent >= 15 && percent < 20) {
        return 3;
      }
      if (percent >= 20 && percent < 25) {
        return 2;
      }
      if (percent >= 25 && percent < 30) {
        return 1;
      }

      if (percent >= 75 && percent < 80) {
        return 1;
      }
      if (percent >= 80 && percent < 85) {
        return 2;
      }
      if (percent >= 85 && percent < 90) {
        return 3;
      }
      if (percent >= 90 && percent < 95) {
        return 4;
      }
      if (percent >= 95) {
        return 5;
      }
      return 0;
    }),
    distinctUntilChanged()
  );

  const imageHeightStream = zoomStream.pipe(
    map(event => event.target.value),
    startWith(100),
    combineLatest(percentWithinImageStream),
    map(([zoom, percentWithinImage]) => {
      const baseHeight = window.innerHeight * ((zoom / 100) * 0.9);
      if (percentWithinImage <= 25) {
        return baseHeight - ((25 - percentWithinImage) * zoom) / 200;
      }
      if (percentWithinImage > 75) {
        return baseHeight + ((75 - percentWithinImage) * zoom) / 200;
      }
      return baseHeight;
    })
  );

  const imageSepiaStream = sepiaStream.pipe(
    map(event => event.target.value),
    startWith(0),
    map(sepia => sepia / 10)
  );

  // apply updates
  controlsOpacityStream.subscribe(opacity => setOpacity(controlsElement, opacity));
  introOpacityStream.subscribe(opacity => setOpacity(introElement, opacity));
  outroOpacityStream.subscribe(opacity => setOpacity(outroElement, opacity));
  imageStream.subscribe(image => (imageElement.src = image));
  imageHeightStream.subscribe(height => (imageElement.style.height = `${height}px`));
  imageOpacityStream.subscribe(opacity => (imageElement.style.opacity = opacity));
  imageBlurStream
    .pipe(combineLatest(imageSepiaStream))
    .subscribe(([blur, sepia]) => (imageElement.style.filter = `blur(${blur}px)  sepia(${sepia})`));

  progressStream.subscribe(x => console.log("Progress", x));
}

function setOpacity(element, opacity) {
  if (opacity <= 0 && element.style.display !== "none") {
    element.style.display = "none";
  } else if (element.style.display === "none") {
    element.style.display = "inherit";
  }
  element.style.opacity = opacity;
}
