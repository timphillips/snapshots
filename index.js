const { fromEvent } = rxjs;
const { map, debounceTime, scan, startWith, combineLatest, distinctUntilChanged } = rxjs.operators;

function init() {
  // event streams
  const zoomStream = fromEvent(window.document.getElementById("zoom"), "input");
  const scrollStream = fromEvent(window.document, "mousewheel");

  // update streams
  const scrollPositionStream = scrollStream.pipe(
    // are we scrolling up or down?
    map(event => ((event.deltaY * -1 || event.wheelDelta || event.detail * -1) > 0 ? 1 : -1)),
    scan((position, adjustment) => {
      const newPosition = position + adjustment;
      return newPosition < 0 ? 0 : newPosition;
    }, 0),
    startWith(0)
  );

  const stepsPerImage = 20;
  const imageIndexStream = scrollPositionStream.pipe(
    map(position => Math.floor(position / stepsPerImage)),
    distinctUntilChanged()
  );

  const images = window.document.images;
  const imageStream = imageIndexStream.pipe(map(imageIndex => images[imageIndex]));

  const scrollPercentWithinImageStream = scrollPositionStream.pipe(
    map(position => {
      const imageIndex = Math.floor(position / stepsPerImage);
      return ((position - imageIndex * stepsPerImage) / stepsPerImage) * 100;
    })
  );

  const imageOpacityStream = scrollPercentWithinImageStream.pipe(
    map(percent => {
      if (percent < 20) {
        return percent / 20;
      }
      if (percent > 75) {
        return 1 - (percent - 75) / 20;
      }
      return 1;
    }),
    distinctUntilChanged(),
    startWith(0)
  );

  const imageBlurStream = scrollPercentWithinImageStream.pipe(
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
    map(zoom => window.innerHeight * 0.85 * (zoom / 100))
  );

  // apply updates
  imageHeightStream.subscribe(height => {
    for (const image of images) {
      image.style.height = `${height}px`;
    }
  });
  imageStream
    .pipe(combineLatest(imageHeightStream))
    .subscribe(([image, height]) => (image.style.height = `${height}px`));
  imageStream.pipe(combineLatest(imageOpacityStream)).subscribe(([image, opacity]) => (image.style.opacity = opacity));
  imageStream
    .pipe(combineLatest(imageBlurStream))
    .subscribe(([image, blur]) => (image.style.filter = `blur(${blur}px)`));

  imageOpacityStream.subscribe(x => console.log("Opacity", x));
  imageBlurStream.subscribe(x => console.log("Blur", x));
}
