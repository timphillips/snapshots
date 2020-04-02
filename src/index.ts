import {
  fromEvent,
  interval,
  Observable,
  concat,
  range,
  merge,
  of,
  Observer,
  Subscriber,
  from,
  combineLatest as combineLatestObservable
} from "rxjs";
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
  withLatestFrom,
  tap
} from "rxjs/operators";
import {
  shuffleArray,
  requireHtmlElement,
  setOpacity,
  getCloudImageUrl,
  setFilter,
  setHeight,
  getRandomInt
} from "./utils";
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
  readonly size?: number;
}

const intro: ImageTransitionState = {
  opacity: 0.2,
  blur: 10
};

const introFadeIn: ImageTransitionState[] = [
  { opacity: 0.3, blur: 10, size: -10 },
  { opacity: 0.4, blur: 10, size: -10 },
  { opacity: 0.5, blur: 10, size: -10 },
  { opacity: 0.6, blur: 10, size: -10 },
  { opacity: 0.7, blur: 8, size: -8 },
  { opacity: 0.8, blur: 6, size: -6 },
  { opacity: 0.9, blur: 4, size: -4 },
  { opacity: 1.0, blur: 2, size: -2 },
  { opacity: 1.0, blur: 0 }
];

const fadeOut: ImageTransitionState[] = [
  { opacity: 0.9, blur: 0, size: 0 },
  { opacity: 0.8, blur: 5, size: -2 },
  { opacity: 0.7, blur: 10, size: -3 },
  { opacity: 0.6, blur: 15, size: -4 },
  { opacity: 0.5, blur: 20, size: -5 },
  { opacity: 0.4, blur: 25, size: -6 },
  { opacity: 0.3, blur: 30, size: -7 },
  { opacity: 0.2, blur: 35, size: -8 },
  { opacity: 0.1, blur: 40, size: -9 },
  { opacity: 0.0, blur: 45, size: -10 }
];

const fadeIn: ImageTransitionState[] = [
  { opacity: 0.1, blur: 45, size: -10 },
  { opacity: 0.2, blur: 40, size: -9 },
  { opacity: 0.3, blur: 35, size: -8 },
  { opacity: 0.4, blur: 30, size: -7 },
  { opacity: 0.5, blur: 25, size: -6 },
  { opacity: 0.6, blur: 20, size: -5 },
  { opacity: 0.7, blur: 15, size: -4 },
  { opacity: 0.8, blur: 10, size: -3 },
  { opacity: 0.9, blur: 5, size: -2 },
  { opacity: 1.0, blur: 0, size: 0 }
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
  const blurElement = requireHtmlElement("blur");
  const zoomElement = requireHtmlElement("zoom");
  const nextElement = requireHtmlElement("next");
  const previousElement = requireHtmlElement("previous");

  // input event streams
  const blurStream = fromEvent<InputEvent>(blurElement, "input");
  const zoomStream = fromEvent<InputEvent>(zoomElement, "input");
  const sepiaStream = fromEvent<InputEvent>(sepiaElement, "input");
  const wheelStream = fromEvent<MouseWheelEvent>(window.document, "wheel");
  const touchStartStream = fromEvent<TouchEvent>(window.document, "touchstart");
  const touchMoveStream = fromEvent<TouchEvent>(window.document, "touchmove");
  const touchEndStream = fromEvent<TouchEvent>(window.document, "touchend");
  const mouseMoveStream = fromEvent<MouseEvent>(window.document, "mousemove");
  const clickNextStream = fromEvent<MouseEvent>(nextElement, "click");
  const clickPreviousStream = fromEvent<MouseEvent>(previousElement, "click");
  const clickStream = fromEvent<MouseEvent>(window.document, "click");
  const keyUpStream = fromEvent<KeyboardEvent>(window.document, "keyup");

  // update streams
  const activateStream = merge(clickStream).pipe(take(1));
  const leftArrowStream = keyUpStream.pipe(filter(key => key.keyCode === 37));
  const rightArrowStream = keyUpStream.pipe(filter(key => key.keyCode === 39));

  const previousImageStream = merge(clickPreviousStream, leftArrowStream).pipe(mapTo(-1));
  const nextImageStream = merge(clickNextStream, rightArrowStream).pipe(mapTo(1));

  const imageIndexStream = merge(previousImageStream, nextImageStream).pipe(
    scan((previous, adjustment) => {
      const newImageIndex = previous + adjustment;
      return newImageIndex < 0 ? 0 : newImageIndex;
    }, 0),
    startWith(0),
    distinctUntilChanged()
  );

  const imageStream = imageIndexStream.pipe(map(index => images[index]));

  // apply updates
  const imageStateStream = concat(
    // static intro image
    of({ transition: intro, image: images[0] }),

    // wait until the first mouse click, then fade in the first image
    activateStream.pipe(
      switchMap(() =>
        from(introFadeIn).pipe(
          concatMap(x => of(x).pipe(delay(50))),
          map(transition => ({ transition, image: images[0] }))
        )
      )
    ),

    imageStream.pipe(
      pairwise(),
      switchMap(([previousImage, newImage]) =>
        concat(
          // fade out the previous image
          from(fadeOut).pipe(
            concatMap(x => of(x).pipe(delay(30))),
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
    )
  );

  const introOpacityStream = activateStream.pipe(
    switchMap(() => from([1, 0.8, 0.6, 0.4, 0.2, 0]).pipe(concatMap(x => of(x).pipe(delay(40))))),
    startWith(1)
  );

  const controlsOpacityStream = activateStream.pipe(
    switchMap(() => from([0, 0.2, 0.4, 0.6, 0.8, 1]).pipe(concatMap(x => of(x).pipe(delay(40))))),
    startWith(0)
  );

  const flickerStream = interval(150).pipe(
    map(() => {
      const opacity = (Math.random() / 20) * -1;
      const blur = Math.random();
      return { opacity, blur };
    })
  );

  const imageBlurStream = createImageBlurStream(blurStream);
  const imageHeightStream = createImageHeightStream(zoomStream);

  const mouseMoveBlur = concat(activateStream, mouseMoveStream).pipe(
    combineLatest(imageBlurStream),
    map(([mouseMove, blur]) => {
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
      // imageElement.style.filter = `blur(${blur + (Math.random() * (5 - 2) + 2 * distanceFromCenter * 10)}px)`;
      return 0.5 * (5 - 2) + 2 * distance * blur;
    }),
    startWith(0)
  );

  const imageSepiaStream = createImageSepiaStream(sepiaStream);

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

  combineLatestObservable(imageStateStream, mouseMoveBlur, flickerStream, imageSepiaStream, imageHeightStream)
    .pipe(debounceTime(10))
    .subscribe(([transitionState, mouseBlur, flicker, sepia, height]) => {
      const { transition, image } = transitionState;
      imageElement.src = getCloudImageUrl(image.src, window.innerHeight);
      imageElement.alt = image.alt;
      imageCaptionElement.innerText = image.alt;
      setHeight(imageElement, height + (transition.size || 0));
      setOpacity(imageElement, transition.opacity + flicker.opacity);
      setFilter(imageElement, { blur: transition.blur + mouseBlur + flicker.blur, sepia });
    });
  controlsOpacityStream.subscribe(opacity => {
    setOpacity(controlsElement, opacity);
    setOpacity(nextElement, opacity);
    setOpacity(previousElement, opacity);
  });
  introOpacityStream.subscribe(opacity => setOpacity(introElement, opacity));

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
  const imageSepiaStream = createImageSepiaStream(sepiaStream);

  // apply DOM updates
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

  // concat(initialClickStream, mouseMoveStream).subscribe(mouseMove => {
  //   // console.log(blur);
  //   const centerWidth = window.innerWidth / 2;
  //   const centerHeight = window.innerHeight / 2;
  //   const horizontalDistanceFromCenter =
  //     (mouseMove.clientX < centerWidth ? centerWidth - mouseMove.clientX : mouseMove.clientX - centerWidth) /
  //     centerWidth;
  //   const verticalDistanceFromCenter =
  //     (mouseMove.clientY < centerHeight ? centerHeight - mouseMove.clientY : mouseMove.clientY - centerHeight) /
  //     centerHeight;
  //   // console.log(verticalDistanceFromCenter);
  //   const distance = Math.max(horizontalDistanceFromCenter, verticalDistanceFromCenter);

  //   console.log(distance);
  //   // imageElement.style.filter = `blur(${blur + (Math.random() * (5 - 2) + 2 * distanceFromCenter * 10)}px)`;
  //   imageElement.style.filter = `blur(${0.5 * (5 - 2) + 2 * distance * 10}px)`;
  // });

  // progressStream.subscribe(progress => console.log("Progress", progress));
}

window.onload = init;
