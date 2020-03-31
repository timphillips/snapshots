import { fromEvent, interval, Observable, concat, range, merge, of, Observer, Subscriber, from } from "rxjs";
import {
  combineLatest,
  switchMap,
  take,
  debounceTime,
  scan,
  mapTo,
  startWith,
  distinctUntilChanged,
  map,
  pairwise,
  subscribeOn,
  delay,
  timeInterval,
  publish,
  concatMap,
  filter,
  withLatestFrom
} from "rxjs/operators";
import { shuffleArray, requireHtmlElement, setOpacity, getCloudImageUrl, setFilter } from "./utils";
import {
  createControlsOpacityStream,
  createImageBlurStream,
  createImageHeightStream,
  createImageOpacityStream,
  createImageSepiaStream,
  createImageStreams,
  createIntroOpacityStream,
  createOutroOpacityStream,
  createPercentWithinImageStream,
  createProgressStream
} from "./streams";

import { images } from "./images.json";

function loadImage(imagePath: string): Observable<HTMLImageElement> {
  return Observable.create((observer: Observer<HTMLImageElement>) => {
    var img = new Image();
    img.src = getCloudImageUrl(imagePath, window.innerHeight);
    img.onload = () => {
      observer.next(img);
      observer.complete();
    };
    img.onerror = err => observer.error(err);
  });
}

interface ImageTransitionState {
  readonly opacity: number;
  readonly blur: number;
}

const fadeOut: Pick<ImageTransitionState, "blur" | "opacity">[] = [
  { opacity: 0.9, blur: 5 },
  { opacity: 0.8, blur: 10 },
  { opacity: 0.7, blur: 15 },
  { opacity: 0.6, blur: 20 },
  { opacity: 0.5, blur: 25 },
  { opacity: 0.4, blur: 30 },
  { opacity: 0.3, blur: 35 },
  { opacity: 0.2, blur: 40 },
  { opacity: 0.1, blur: 45 },
  { opacity: 0.0, blur: 50 }
];

const fadeIn: Pick<ImageTransitionState, "blur" | "opacity">[] = [
  { opacity: 0.1, blur: 0 },
  { opacity: 0.2, blur: 0 },
  { opacity: 0.3, blur: 0 },
  { opacity: 0.4, blur: 0 },
  { opacity: 0.5, blur: 0 },
  { opacity: 0.6, blur: 0 },
  { opacity: 0.7, blur: 0 },
  { opacity: 0.8, blur: 0 },
  { opacity: 0.9, blur: 0 },
  { opacity: 1.0, blur: 0 }
];

function init() {
  const shuffledImages = shuffleArray(images);

  // DOM elements
  const controlsElement = requireHtmlElement("controls");
  const imageElement = requireHtmlElement("image") as HTMLImageElement;
  const imageCaptionElement = requireHtmlElement("imageCaption");
  const imageContainerElement = requireHtmlElement("imageContainer");
  const introElement = requireHtmlElement("intro");
  const outroElement = requireHtmlElement("outro");
  const sepiaElement = requireHtmlElement("sepia");
  const zoomElement = requireHtmlElement("zoom");
  const nextElement = requireHtmlElement("next");
  const previousElement = requireHtmlElement("previous");

  // input event streams
  const zoomStream = fromEvent<InputEvent>(zoomElement, "input");
  const sepiaStream = fromEvent<InputEvent>(sepiaElement, "input");
  const wheelStream = fromEvent<MouseWheelEvent>(window.document, "wheel");
  const touchStartStream = fromEvent<TouchEvent>(window.document, "touchstart");
  const touchMoveStream = fromEvent<TouchEvent>(window.document, "touchmove");
  const touchEndStream = fromEvent<TouchEvent>(window.document, "touchend");
  const mouseMoveStream = fromEvent<MouseEvent>(window.document, "mousemove");
  const clickNextStream = fromEvent<MouseEvent>(nextElement, "click");

  const clickPreviousStream = fromEvent<MouseEvent>(previousElement, "click");

  // update streams
  const imageIndexStream = merge(clickPreviousStream.pipe(mapTo(-1)), clickNextStream.pipe(mapTo(1))).pipe(
    scan((previous, adjustment) => {
      const newImageIndex = previous + adjustment;
      return newImageIndex < 0 ? 0 : newImageIndex;
    }, 0),
    startWith(0),
    distinctUntilChanged()
  );

  const imageStream = imageIndexStream.pipe(map(index => images[index]));

  // apply updates
  const imageStateStream = imageStream.pipe(
    pairwise(),
    switchMap(([previousImage, newImage]) =>
      concat(
        // fade out the previous image
        from(fadeOut).pipe(
          concatMap(x => of(x).pipe(delay(40))),
          map(transition => ({ transition, image: previousImage }))
        ),

        // wait until the next image is loaded before fading it in
        loadImage(newImage.src).pipe(
          mapTo(fadeIn[0]),
          map(transition => ({ transition, image: newImage }))
        ),

        // fade in the next image
        from(fadeIn).pipe(
          concatMap(x => of(x).pipe(delay(40))),
          map(transition => ({ transition, image: newImage }))
        )
      )
    )
  );

  imageStateStream.subscribe(console.log);

  // const imageOpacityStream: Observable<number> = imageProgressStream.pipe(
  //   map(progress => {
  //     // incrementally fade out between 0 and 9
  //     if (progress < 10) {
  //       return (10 - progress) / 10;
  //     }
  //     // incrementally fade in between 11 and 19
  //     if (progress > 10) {
  //       return 1 - (19 - progress) / 10;
  //     }
  //     return 0;
  //   })
  // );

  // imageOpacityStream.subscribe(opacity => setOpacity(imageContainerElement, opacity));

  imageStateStream.subscribe(({ transition, image }) => {
    imageElement.src = getCloudImageUrl(image.src, window.innerHeight);
    imageElement.alt = image.alt;
    imageCaptionElement.innerText = image.alt;
    setOpacity(imageElement, transition.opacity);
    setFilter(imageElement, { blur: transition.blur });
  });

  /*const progressStream = createProgressStream(
    mouseMoveStream,
    touchStartStream,
    touchMoveStream,
    touchEndStream,
    wheelStream,
    progressLimit
  );
  const { imageStream, upcomingImagesStream } = createImageStreams(progressStream, shuffledImages, stepsPerImage);
  const percentWithinImageStream = createPercentWithinImageStream(progressStream, stepsPerImage);

  const controlsOpacityStream = createControlsOpacityStream(progressStream, progressLimit);
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
  imageStream.subscribe(image => {
    imageElement.src = getCloudImageUrl(image.src, window.innerHeight);
    imageElement.alt = image.alt;
    imageCaptionElement.innerText = image.alt;
  });
  imageHeightStream.subscribe(height => (imageElement.style.height = `${height}px`));
  imageOpacityStream.subscribe(opacity => (imageContainerElement.style.opacity = opacity.toString()));
  imageBlurStream
    .pipe(combineLatest(imageSepiaStream))
    .subscribe(([blur, sepia]) => (imageElement.style.filter = `blur(${blur}px) sepia(${sepia})`));
  upcomingImagesStream.subscribe(images =>
    images.forEach(image => (new Image().src = getCloudImageUrl(image.src, window.innerHeight)))
  );

  // interval(150)
  //   .pipe(combineLatest(imageOpacityStream, mouseMoveStream))
  //   .subscribe(([i, opacity, mouseMove]) => {
  //     //console.log(opacity);
  //     const center = window.innerWidth / 2;

  //     const distanceFromCenter =
  //       (mouseMove.clientX < center ? center - mouseMove.clientX : mouseMove.clientX - center) / center;
  //     console.log(distanceFromCenter);
  //     setOpacity(imageContainerElement, opacity - (Math.random() * (0.3 - 0.1) + 0.1));
  //   });*/

  // interval(50)
  // .pipe(combineLatest(imageBlurStream, mouseMoveStream))
  // .subscribe(([i, blur, mouseMove]) => {
  // mouseMoveStream.pipe(combineLatest(imageBlurStream), debounceTime(10)).subscribe(([mouseMove, blur]) => {

  mouseMoveStream.subscribe(mouseMove => {
    // console.log(blur);
    const centerWidth = window.innerWidth / 2;
    const centerHeight = window.innerHeight / 2;
    const horizontalDistanceFromCenter =
      (mouseMove.clientX < centerWidth ? centerWidth - mouseMove.clientX : mouseMove.clientX - centerWidth) /
      centerWidth;
    const verticalDistanceFromCenter =
      (mouseMove.clientY < centerHeight ? centerHeight - mouseMove.clientY : mouseMove.clientY - centerHeight) /
      centerHeight;
    // console.log(verticalDistanceFromCenter);
    const distance = Math.max(horizontalDistanceFromCenter, verticalDistanceFromCenter);

    console.log(distance);
    // imageElement.style.filter = `blur(${blur + (Math.random() * (5 - 2) + 2 * distanceFromCenter * 10)}px)`;
    imageElement.style.filter = `blur(${0.5 * (5 - 2) + 2 * distance * 10}px)`;
  });

  // progressStream.subscribe(progress => console.log("Progress", progress));
}

window.onload = init;
