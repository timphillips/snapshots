import {
  NEVER,
  Observable,
  Observer,
  OperatorFunction,
  combineLatest as combineLatestObservable,
  concat,
  from,
  merge,
  of,
  range
} from "rxjs";
import {
  combineLatest,
  concatMap,
  delay,
  distinctUntilChanged,
  map,
  mapTo,
  pairwise,
  scan,
  startWith,
  switchMap
} from "rxjs/operators";

import { getCloudImageUrl } from "./utils";

export enum InfoEvent {
  OpenInfo = "openInfo",
  CloseInfo = "closeInfo"
}

export enum State {
  Info = "info",
  Image = "image"
}

interface Image {
  readonly alt: string;
  readonly src: string;
  readonly url: string;
}

interface ImageState {
  readonly opacity: number;
  readonly blur: number;
  readonly size?: number;
}

/**
 * Image state when the info panel is visible.
 */
const infoImageState: ImageState = {
  opacity: 0.2,
  blur: 10
};

/**
 * Image state when the outro panel is visible.
 */
const imageOutroState: ImageState = {
  opacity: 0,
  blur: 0
};

/**
 * Keyframes for fading in an image from the info state.
 */
const infoImageFadeIn: ImageState[] = [
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

/**
 * Keyframes for fading out an image into the info state.
 */
const infoImageFadeOut: ImageState[] = [
  { opacity: 1.0, blur: 0 },
  { opacity: 1.0, blur: 2, size: -2 },
  { opacity: 0.9, blur: 4, size: -4 },
  { opacity: 0.8, blur: 6, size: -6 },
  { opacity: 0.7, blur: 8, size: -8 },
  { opacity: 0.6, blur: 10, size: -10 },
  { opacity: 0.5, blur: 10, size: -10 },
  { opacity: 0.4, blur: 10, size: -10 },
  { opacity: 0.3, blur: 10, size: -10 }
];

/**
 * Keyframes for fading in an image with a blur/resize effect.
 */
const imageFadeIn: ImageState[] = [
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

/**
 * Keyframes for fading out an image with a blur/resize effect.
 */
const imageFadeOut: ImageState[] = [
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

/**
 * @returns An operator function that delays a given observable's emissions by some milliseconds.
 */
function delayBy<T>(milliseconds: number): OperatorFunction<T, T> {
  return concatMap(x => of(x).pipe(delay(milliseconds)));
}

/**
 * Loads an image without actually including it in the DOM.
 *
 * This is used to allow waiting for an image to load before
 * displaying it in the page.
 *
 * @returns A stream that emits when the image is loaded.
 */
function loadImage(imagePath: string): Observable<HTMLImageElement> {
  return Observable.create((observer: Observer<HTMLImageElement>) => {
    var image = new Image();
    image.src = getCloudImageUrl(imagePath, window.innerHeight);
    image.onload = () => {
      observer.next(image);
      observer.complete();
    };
    image.onerror = err => observer.error(err);
  });
}

/**
 * Disables the "Next" button when there are no more images to view.
 *
 * @returns A stream emitting if the "Next" button is active.
 */
export function createNextButtonActiveStream(imageIndexStream: Observable<number | undefined>): Observable<boolean> {
  return imageIndexStream.pipe(map(imageIndex => imageIndex !== undefined));
}

/**
 * Disables the "Previous" button when viewing the first image.
 *
 * @returns A stream emitting if the "Previous" button is active.
 */
export function createPreviousButtonActiveStream(
  imageIndexStream: Observable<number | undefined>
): Observable<boolean> {
  return imageIndexStream.pipe(map(imageIndex => imageIndex !== 0));
}

/**
 * Fades in the control panel when the initial image fades in.
 *
 * @returns A stream emitting the opacity of the controls panel.
 */
export function createControlsOpacityStream(stateStream: Observable<State>): Observable<number> {
  return stateStream.pipe(
    pairwise(),
    switchMap(([previousState, nextState]) => {
      if (nextState === "image") {
        return from([0, 0.2, 0.4, 0.6, 0.8, 1]).pipe(delayBy(50));
      } else if (previousState === "image") {
        return from([1, 0.8, 0.6, 0.4, 0.2, 0]).pipe(delayBy(50));
      }
      return of(0);
    }),
    startWith(0) // hidden to start
  );
}

/**
 * Fades out the into panel when the page is activated.
 *
 * @returns A stream emitting the opacity of the info panel.
 */
export function createInfoOpacityStream(stateStream: Observable<State>): Observable<number> {
  return stateStream.pipe(
    pairwise(),
    switchMap(([previousState, nextState]) => {
      if (nextState === "image") {
        return from([1, 0.8, 0.6, 0.4, 0.2, 0]).pipe(delayBy(50));
      } else if (previousState === "image") {
        return from([0, 0.2, 0.4, 0.6, 0.8, 1]).pipe(delayBy(50));
      }
      return of(0);
    }),
    startWith(1) // visible to start
  );
}

/**
 * Fades in/out the outro panel once the end is reached.
 *
 * @returns A stream emitting opacity of the outro panel.
 */
export function createOutroOpacityStream(imageIndexStream: Observable<number | undefined>): Observable<number> {
  return imageIndexStream.pipe(
    pairwise(),
    switchMap(([previousIndex, nextIndex]) => {
      if (previousIndex !== undefined && nextIndex === undefined) {
        // fade in when transitioning from the last image to the end state
        return range(0, 6).pipe(
          map(number => number / 5), // converts [0, 1, 2, 3, 4] to [0, 0.2, 0.4, 0.6, 0.8, 1]
          delayBy(40)
        );
      } else if (previousIndex === undefined && nextIndex !== undefined) {
        // fade out when transitioning from the end state back to the last image
        return range(0, 6).pipe(
          map(number => 1 - number / 5), // converts [0, 1, 2, 3, 4] to [1, 0.8, 0.6, 0.4, 0.3, 0]
          delayBy(40)
        );
      }
      return of(0);
    }),
    startWith(0)
  );
}

/**
 * Determines which image is visible (and which images are upcoming) based
 * on the current image index.
 *
 * @returns A stream emitting the current image, and a stream emitting the upcoming images.
 */
export function createImageStreams(imageIndexStream: Observable<number | undefined>, images: readonly Image[]) {
  const imageStream = imageIndexStream.pipe(map(index => (index === undefined ? undefined : images[index])));

  const upcomingImagesStream = imageIndexStream.pipe(
    map(imageIndex => {
      if (imageIndex === undefined) {
        return [];
      }

      const upcomingImages = [];
      // preload the next 4 images
      for (let i = 0; i <= 3; i++) {
        if (i + imageIndex >= images.length) {
          break;
        }
        upcomingImages.push(images[i + imageIndex].src);
      }
      return upcomingImages;
    })
  );

  return { imageStream, upcomingImagesStream };
}

/**
 * Tracks which image is visible based on the given transition events.
 *
 * @returns A stream emitting the current image index, or `undefined` when there are no more images.
 */
export function createImageIndexStream(
  stateStream: Observable<State>,
  imageAdjustmentStream: Observable<number>,
  images: readonly Image[]
) {
  // do not emit image adjustment events when the info page is visible
  const adjustmentStream = stateStream.pipe(switchMap(state => (state === State.Info ? NEVER : imageAdjustmentStream)));

  return adjustmentStream.pipe(
    scan<number, number | undefined>((previous, adjustment) => {
      if (previous === undefined) {
        if (adjustment >= 0) {
          return undefined; // no more images left
        }
        return images.length + adjustment;
      }
      const newImageIndex = previous + adjustment;
      return newImageIndex < 0 ? 0 : newImageIndex >= images.length ? undefined : newImageIndex;
    }, 0),
    startWith(0),
    distinctUntilChanged()
  );
}

/**
 * Tracks whether the intro blurb is active or not.
 *
 * @returns A stream emitting the current state of the intro blurb.
 */
export function createStateStream(
  clickControlsTitleStream: Observable<MouseEvent>,
  clickStream: Observable<MouseEvent>,
  leftArrowStream: Observable<KeyboardEvent>,
  rightArrowStream: Observable<KeyboardEvent>
): Observable<State> {
  const openInfoStream = clickControlsTitleStream.pipe(mapTo(InfoEvent.OpenInfo));
  const closeInfoStream = merge(clickStream, leftArrowStream, rightArrowStream).pipe(mapTo(InfoEvent.CloseInfo));

  return merge(openInfoStream, closeInfoStream).pipe(
    scan<InfoEvent, State>((state, event) => {
      switch (state) {
        case State.Info: {
          switch (event) {
            case InfoEvent.CloseInfo:
              return State.Image;
          }
        }
        case State.Image: {
          switch (event) {
            case InfoEvent.OpenInfo:
              return State.Info;
          }
        }
      }
      return state; // ignore all other invalid scenarios (e.g. close event when not visible)
    }, State.Info),
    startWith(State.Info),
    distinctUntilChanged()
  );
}

/**
 * Fades the image in and out.
 *
 * @returns A stream emitting the state of the image.
 */
export function createImageTransitionStream(
  stateStream: Observable<State>,
  imageStream: Observable<Image | undefined>,
  images: readonly Image[]
) {
  return combineLatestObservable(stateStream, imageStream).pipe(
    pairwise(),
    switchMap(([[previousState, previousImage], [nextState, nextImage]]) => {
      switch (nextState) {
        case State.Image: {
          if (previousState === State.Info) {
            // fade in the image when the info blurb is closed
            return from(infoImageFadeIn).pipe(
              delayBy(30),
              map(transition => ({ transition, image: nextImage }))
            );
          }
          if (nextImage !== previousImage) {
            return concat(
              // fade out the previous image (if needed)
              previousImage
                ? from(imageFadeOut).pipe(
                    delayBy(30),
                    map(transition => ({ transition, image: previousImage }))
                  )
                : of({ transition: imageOutroState, image: undefined }),

              // wait until the next image is loaded before fading it in
              nextImage
                ? loadImage(nextImage.src).pipe(
                    mapTo(imageFadeIn[0]),
                    map(transition => ({ transition, image: nextImage }))
                  )
                : of({ transition: imageOutroState, image: undefined }),

              // fade in the next image (if not at the end state)
              nextImage
                ? from(imageFadeIn).pipe(
                    delayBy(40),
                    map(transition => ({ transition, image: nextImage }))
                  )
                : of({ transition: imageOutroState, image: undefined })
            );
          }
          return NEVER;
        }
        case State.Info: {
          // fade out the image when the info blurb is opened
          if (previousState === State.Image) {
            return from(infoImageFadeOut).pipe(
              delayBy(30),
              map(transition => ({ transition, image: nextImage }))
            );
          }
          return of({ transition: infoImageState, image: previousImage });
        }
      }
    }),
    startWith({ transition: infoImageState, image: images[0] })
  );
}

/**
 * Computes the image's blur filter based on the mouse position and the blur stength input events.
 *
 * @returns A stream emitting the blur filter value for the image.
 */
export function createImageBlurStream(mouseMoveStream: Observable<MouseEvent>, blurStream: Observable<InputEvent>) {
  const baseBlurStream = blurStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(3)
  );

  return mouseMoveStream.pipe(
    combineLatest(baseBlurStream),
    map(([mouseMove, blur]) => {
      const centerWidth = window.innerWidth / 2;
      const centerHeight = window.innerHeight / 2;
      const horizontalDistanceFromCenter =
        (mouseMove.clientX < centerWidth ? centerWidth - mouseMove.clientX : mouseMove.clientX - centerWidth) /
        centerWidth;
      const verticalDistanceFromCenter =
        (mouseMove.clientY < centerHeight ? centerHeight - mouseMove.clientY : mouseMove.clientY - centerHeight) /
        centerHeight;
      const distance = Math.max(horizontalDistanceFromCenter, verticalDistanceFromCenter);
      return distance * blur * 2; // 2 is an magic number that "feels right" :)
    }),
    startWith(0)
  );
}

/**
 * Converts sepia range input events to sepia filter values.
 *
 * @returns A stream emitting the speia filter value for the image.
 */
export function createImageSepiaStream(sepiaStream: Observable<InputEvent>) {
  return sepiaStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(0),
    map(sepia => sepia / 10) // convert slider value (0 - 10) to filter value (0 - 1)
  );
}

/**
 * Converts image size input events to image height values.
 * Also adjusts the image height slightly when the image is faded in or out.
 *
 * @returns A stream emitting the height of the image.
 */
export function createImageHeightStream(zoomStream: Observable<InputEvent>) {
  return zoomStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(100), // start with full size
    map(zoom => window.innerHeight * ((zoom / 100) * 0.9))
  );
}
