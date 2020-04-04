import { Observable, Observer, concat, from, of, range } from "rxjs";
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
  switchMap,
  tap
} from "rxjs/operators";

import { getCloudImageUrl } from "./utils";

interface Image {
  readonly alt: string;
  readonly src: string;
}

interface ImageState {
  readonly opacity: number;
  readonly blur: number;
  readonly size?: number;
}

/**
 * Image state when the intro panel is visible.
 */
const imageIntroState: ImageState = {
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
 * Keyframes for fading in an image from the intro state.
 */
const imageIntroFadeIn: ImageState[] = [
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
export function createControlsOpacityStream(activateStream: Observable<MouseEvent>): Observable<number> {
  return activateStream.pipe(
    switchMap(() => from([0, 0.2, 0.4, 0.6, 0.8, 1]).pipe(concatMap(x => of(x).pipe(delay(40))))),
    startWith(0)
  );
}

/**
 * Fades out the into panel when the page is activated.
 *
 * @returns A stream emitting the opacity of the intro panel.
 */
export function createIntroOpacityStream(activateStream: Observable<MouseEvent>) {
  return activateStream.pipe(
    switchMap(() => from([1, 0.8, 0.6, 0.4, 0.2, 0]).pipe(concatMap(x => of(x).pipe(delay(40))))),
    startWith(1)
  );
}

/**
 * Fades in/out the outro panel once the end is reached.
 *
 * @returns A stream emitting opacity of the outro panel.
 */
export function createOutroOpacityStream(imageIndexStream: Observable<number | undefined>) {
  return imageIndexStream.pipe(
    pairwise(),
    switchMap(([previousIndex, nextIndex]) => {
      if (previousIndex !== undefined && nextIndex === undefined) {
        // fade in when transitioning from the last image to the end state
        return range(0, 6).pipe(
          map(number => number / 5), // converts [0, 1, 2, 3, 4] to [0, 0.2, 0.4, 0.6, 0.8, 1]
          concatMap(opacity => of(opacity).pipe(delay(40)))
        );
      } else if (previousIndex === undefined && nextIndex !== undefined) {
        // fade out when transitioning from the end state back to the last image
        return range(0, 6).pipe(
          map(number => 1 - number / 5), // converts [0, 1, 2, 3, 4] to [1, 0.8, 0.6, 0.4, 0.3, 0])
          concatMap(x => of(x).pipe(delay(40)))
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
export function createImageIndexStream(transitionStream: Observable<number>, numberOfImages: number) {
  return transitionStream.pipe(
    scan<number, number | undefined>((previous, adjustment) => {
      if (previous === undefined) {
        if (adjustment >= 0) {
          return undefined; // no more images left
        }
        return numberOfImages + adjustment;
      }
      const newImageIndex = previous + adjustment;
      return newImageIndex < 0 ? 0 : newImageIndex >= numberOfImages ? undefined : newImageIndex;
    }, 0),
    startWith(0),
    distinctUntilChanged()
  );
}

/**
 * Fades the image in and out.
 *
 * @returns A stream emitting the state of the image.
 */
export function createImageTransitionStream(
  activateStream: Observable<MouseEvent>,
  imageStream: Observable<Image | undefined>,
  images: readonly Image[]
) {
  return concat(
    // static intro image
    of({ transition: imageIntroState, image: images[0] }),

    // wait until the page is activated, then fade in the first image
    activateStream.pipe(
      switchMap(() =>
        from(imageIntroFadeIn).pipe(
          concatMap(x => of(x).pipe(delay(50))),
          map(transition => ({ transition, image: images[0] }))
        )
      )
    ),

    // after that, track the image steam for transition events
    imageStream.pipe(
      pairwise(),
      switchMap(([previousImage, newImage]) =>
        concat(
          // fade out the previous image (if needed)
          previousImage
            ? from(imageFadeOut).pipe(
                concatMap(x => of(x).pipe(delay(30))),
                map(transition => ({ transition, image: previousImage }))
              )
            : of({ transition: imageOutroState, image: undefined }),

          // wait until the next image is loaded before fading it in
          newImage
            ? loadImage(newImage.src).pipe(
                mapTo(imageFadeIn[0]),
                map(transition => ({ transition, image: newImage }))
              )
            : of({ transition: imageOutroState, image: undefined }),

          // fade in the next image (if not at the end state)
          newImage
            ? from(imageFadeIn).pipe(
                concatMap(x => of(x).pipe(delay(40))),
                map(transition => ({ transition, image: newImage }))
              )
            : of({ transition: imageOutroState, image: undefined })
        )
      )
    )
  );
}

/**
 * Computes the image's blur filter based on the mouse position and the blur stength input events.
 *
 * @returns A stream emitting the blur filter value for the image.
 */
export function createImageBlurStream(
  activateStream: Observable<MouseEvent>,
  mouseMoveStream: Observable<MouseEvent>,
  blurStream: Observable<InputEvent>
) {
  const baseBlurStream = blurStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(2)
  );

  return concat(activateStream, mouseMoveStream).pipe(
    combineLatest(baseBlurStream),
    map(([mouseMove, blur]) => {
      const { centerWidth, centerHeight } = {
        centerWidth: window.innerWidth / 2,
        centerHeight: window.innerHeight / 2
      };
      const horizontalDistanceFromCenter =
        (mouseMove.clientX < centerWidth ? centerWidth - mouseMove.clientX : mouseMove.clientX - centerWidth) /
        centerWidth;
      const verticalDistanceFromCenter =
        (mouseMove.clientY < centerHeight ? centerHeight - mouseMove.clientY : mouseMove.clientY - centerHeight) /
        centerHeight;
      const distance = Math.max(horizontalDistanceFromCenter, verticalDistanceFromCenter);
      return distance * blur * 2;
    }),
    startWith(0)
  );
}

/**
 * Converts sepia range input events to image sepia filter values.
 *
 * @returns A stream emitting the speia filter value for the image.
 */
export function createImageSepiaStream(sepiaStream: Observable<InputEvent>) {
  return sepiaStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(0),
    map(sepia => sepia / 10)
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
