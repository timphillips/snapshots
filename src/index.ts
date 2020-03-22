import { fromEvent, Observable } from "rxjs";
import { map, filter, scan, startWith, combineLatest, distinctUntilChanged } from "rxjs/operators";
import { shuffleArray, requireHtmlElement, setOpacity } from "./utils";

function createProgressStream(scrollStream: Observable<MouseWheelEvent>, progressLimit: number) {
  return scrollStream.pipe(
    // are we scrolling up or down?
    map(event => ((event.deltaY * -1 || event.detail * -1) > 0 ? -1 : 1)),
    scan((progress, adjustment) => {
      const newProgress = progress + adjustment;
      return newProgress < 0 ? 0 : newProgress > progressLimit ? progress : newProgress;
    }, 0),
    startWith(0),
    distinctUntilChanged()
  );
}

function createControlsOpacityStream(progressStream: Observable<number>): Observable<number> {
  return progressStream.pipe(
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
}

function createIntroOpacityStream(progressStream: Observable<number>) {
  return progressStream.pipe(
    filter(progress => progress <= 5),
    map(progress => (progress === 0 ? 1 : 1 - (progress / 5) * 2))
  );
}

function createOutroOpacityStream(progressStream: Observable<number>, progressLimit: number) {
  return progressStream.pipe(
    map(progress => (progress === progressLimit ? 1 : 0)),
    startWith(0),
    distinctUntilChanged()
  );
}

function createImageStreams(progressStream: Observable<number>, images: readonly string[], stepsPerImage: number) {
  const imageIndexStream = progressStream.pipe(
    map(progress => Math.floor(progress / stepsPerImage)),
    distinctUntilChanged()
  );

  const imageStream = imageIndexStream.pipe(
    map(imageIndex => (imageIndex < images.length - 1 ? images[imageIndex] : images[images.length - 1]))
  );

  const nextImageStream = imageIndexStream.pipe(
    map(imageIndex => imageIndex <= images.length && images[imageIndex + 1])
  );

  return { imageStream, nextImageStream };
}

function createPercentWithinImageStream(progressStream: Observable<number>, stepsPerImage: number) {
  return progressStream.pipe(
    map(progress => {
      const imageIndex = Math.floor(progress / stepsPerImage);
      return ((progress - imageIndex * stepsPerImage) / stepsPerImage) * 100;
    })
  );
}

function createImageOpacityStream(
  progressStream: Observable<number>,
  percentWithinImageStream: Observable<number>,
  progressLimit: number
) {
  return progressStream.pipe(
    combineLatest<number, number>(percentWithinImageStream),
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
}

function createImageBlurStream(percentWithinImageStream: Observable<number>) {
  return percentWithinImageStream.pipe(
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
}

function createImageHeightStream(percentWithinImageStream: Observable<number>, zoomStream: Observable<InputEvent>) {
  return zoomStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(100),
    combineLatest<number, number>(percentWithinImageStream),
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
}

function createImageSepiaStream(sepiaStream: Observable<InputEvent>) {
  return sepiaStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(0),
    map(sepia => sepia / 10)
  );
}

function init() {
  const images = shuffleArray([
    "images/image1.gif",
    "images/image2.gif",
    "images/image3.gif",
    "images/image4.gif",
    "images/image5.gif",
    "images/image6.gif",
    "images/image7.gif",
    "images/image8.gif"
  ]);

  // DOM elements
  const controlsElement = requireHtmlElement("controls");
  const stagingElement = requireHtmlElement("staging") as HTMLImageElement;
  const imageElement = requireHtmlElement("image") as HTMLImageElement;
  const introElement = requireHtmlElement("intro");
  const outroElement = requireHtmlElement("outro");
  const sepiaElement = requireHtmlElement("sepia");
  const zoomElement = requireHtmlElement("zoom");

  // input event streams
  const zoomStream = fromEvent<InputEvent>(zoomElement, "input");
  const sepiaStream = fromEvent<InputEvent>(sepiaElement, "input");
  const scrollStream = fromEvent<MouseWheelEvent>(window.document, "mousewheel");

  // update streams
  const stepsPerImage = 20;
  const progressLimit = stepsPerImage * images.length;

  const progressStream = createProgressStream(scrollStream, progressLimit);

  const { imageStream, nextImageStream } = createImageStreams(progressStream, images, stepsPerImage);
  const percentWithinImageStream = createPercentWithinImageStream(progressStream, stepsPerImage);

  const controlsOpacityStream = createControlsOpacityStream(progressStream);
  const introOpacityStream = createIntroOpacityStream(progressStream);
  const outroOpacityStream = createOutroOpacityStream(progressStream, progressLimit);

  const imageOpacityStream = createImageOpacityStream(progressStream, percentWithinImageStream, progressLimit);
  const imageBlurStream = createImageBlurStream(percentWithinImageStream);
  const imageHeightStream = createImageHeightStream(percentWithinImageStream, zoomStream);
  const imageSepiaStream = createImageSepiaStream(sepiaStream);

  // apply DOM updates
  controlsOpacityStream.subscribe(opacity => setOpacity(controlsElement, opacity));
  introOpacityStream.subscribe(opacity => setOpacity(introElement, opacity));
  outroOpacityStream.subscribe(opacity => setOpacity(outroElement, opacity));
  imageStream.subscribe(image => (imageElement.src = image));
  nextImageStream.subscribe(image => image && (stagingElement.src = image));
  imageHeightStream.subscribe(height => (imageElement.style.height = `${height}px`));
  imageOpacityStream.subscribe(opacity => (imageElement.style.opacity = opacity.toString()));
  imageBlurStream
    .pipe(combineLatest(imageSepiaStream))
    .subscribe(([blur, sepia]) => (imageElement.style.filter = `blur(${blur}px) sepia(${sepia})`));
}

window.onload = init;
