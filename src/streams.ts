import { Observable, of, range, interval, pipe } from "rxjs";
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  merge,
  scan,
  startWith,
  switchMap,
  takeLast,
  takeUntil,
  tap,
  take,
  share
} from "rxjs/operators";

interface Image {
  readonly alt: string;
  readonly src: string;
}

export function createSwipeStream(
  touchStartStream: Observable<TouchEvent>,
  touchMoveStream: Observable<TouchEvent>,
  touchEndStream: Observable<TouchEvent>
): Observable<"swipeUp" | "swipeDown"> {
  const tolerance = 100; // swipe distance in pixels
  // Switch to listen to touchmove to determine position
  return touchStartStream.pipe(
    switchMap(startEvent =>
      touchMoveStream.pipe(
        // Listen until "touchend" is fired
        takeUntil(touchEndStream),
        // Output the pageX location
        map(event => event.touches[0].pageY),
        // Accumulate the pageX difference from the start of the touch
        scan((_, pageY) => Math.round(startEvent.touches[0].pageY - pageY), 0),
        // Take the last output and filter it to output only swipes
        // greater than the defined tolerance
        takeLast(1),
        filter(difference => Math.abs(difference) >= tolerance),
        map(difference => (difference >= tolerance ? "swipeUp" : "swipeDown"))
      )
    )
  );
}

/**
 * Converts the given streams of wheel/touch events to a number representing
 * the virtual scroll progress on the page.
 *
 * The progress starts at 0 (the top of the page), increases as the user
 * scrolls down, and decreases as the user scrolls up.
 *
 * @returns A stream indicating the virtual scroll progress on the page.
 */
export function createProgressStream(
  mouseMoveStream: Observable<MouseEvent>,
  touchStartStream: Observable<TouchEvent>,
  touchMoveStream: Observable<TouchEvent>,
  touchEndStream: Observable<TouchEvent>,
  wheelStream: Observable<MouseWheelEvent>,
  progressLimit: number
) {
  const swipeStream = createSwipeStream(touchStartStream, touchMoveStream, touchEndStream);

  const normalizedWheelStream = wheelStream.pipe(
    // are we scrolling up or down?
    map(event => ((event.deltaY * -1 || event.detail * -1) > 0 ? "scrollDown" : "scrollUp"))
  );

  const combinedEventsStream = normalizedWheelStream.pipe(merge(swipeStream));

  return combinedEventsStream.pipe(
    switchMap(change => {
      if (change === "scrollDown") {
        return of(-1);
      }
      if (change === "scrollUp") {
        return of(1);
      }
      if (change === "swipeDown") {
        return interval(40).pipe(take(20), mapTo(1));
      }
      if (change === "swipeUp") {
        return interval(30).pipe(take(20), mapTo(-1));
      }
      return of(0);
    }),
    scan((progress, adjustment) => {
      console.log((progress - 10) / 20);
      return progress + adjustment;
    }, 0),
    startWith(0),
    distinctUntilChanged(),
    share()
  );
}

/**
 * Fades in the control panel when the initial image fades in.
 * Hides the control panel once the end is reached.
 *
 * @returns A stream emitting the opacity of the controls panel.
 */
export function createControlsOpacityStream(
  progressStream: Observable<number>,
  progressLimit: number
): Observable<number> {
  return progressStream.pipe(
    map(progress => {
      if (progress > progressLimit) {
        return 0;
      }
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

/**
 * Fades out the into panel on the initial scroll.
 *
 * @returns A stream emitting the opacity of the intro panel.
 */
export function createIntroOpacityStream(progressStream: Observable<number>) {
  return progressStream.pipe(map(progress => (progress === 0 ? 1 : 1 - (progress / 5) * 2)));
}

/**
 * Fades in the outro panel once the end is reached.
 *
 * @returns A stream emitting opacity of the outro panel.
 */
export function createOutroOpacityStream(progressStream: Observable<number>, progressLimit: number) {
  return progressStream.pipe(
    map(progress => (progress === progressLimit ? 1 : 0)),
    startWith(0),
    distinctUntilChanged()
  );
}

/**
 * Determines which image is visible (and which images are upcoming) based
 * on the virual scroll progress.
 *
 * @returns A stream emitting the current image, and a stream emitting the upcoming images.
 */
export function createImageStreams(
  progressStream: Observable<number>,
  images: readonly Image[],
  stepsPerImage: number
) {
  const imageIndexStream = progressStream.pipe(
    map(progress => Math.floor(progress / stepsPerImage)),
    distinctUntilChanged()
  );

  const imageStream = imageIndexStream.pipe(
    map(imageIndex => (imageIndex < images.length - 1 ? images[imageIndex] : images[images.length - 1]))
  );

  const upcomingImagesStream = imageIndexStream.pipe(
    map(imageIndex => {
      const upcomingImages = [];
      for (let i = 0; i <= 3; i++) {
        if (i + imageIndex >= images.length) {
          break;
        }
        upcomingImages.push(images[i + imageIndex]);
      }
      return upcomingImages;
    })
  );

  return { imageStream, upcomingImagesStream };
}

/**
 * Determines the percentage that the user has progressed through the current image.
 *
 * @returns A stream emitting the current
 */
export function createPercentWithinImageStream(progressStream: Observable<number>, stepsPerImage: number) {
  return progressStream.pipe(
    map(progress => {
      // TODO: Review this?
      const imageIndex = Math.floor(progress / stepsPerImage);
      return ((progress - imageIndex * stepsPerImage) / stepsPerImage) * 100;
    })
  );
}

/**
 * Fades the image in and out.
 *
 * @returns A stream emitting the opacity of the image.
 */
export function createImageOpacityStream(
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
 * @returns A stream emitting the height of the current image.
 */
export function createImageHeightStream(zoomStream: Observable<InputEvent>) {
  return zoomStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(100), // start with full size
    map(zoom => window.innerHeight * ((zoom / 100) * 0.9))
  );
}

/**
 * TODO
 *
 * @returns TODO
 */
export function createImageBlurStream(blurStream: Observable<InputEvent>) {
  return blurStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(1)
  );
}
