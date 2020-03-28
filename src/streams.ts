import { Observable } from "rxjs";
import {
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  merge,
  pairwise,
  scan,
  startWith,
  switchMap
} from "rxjs/operators";

/**
 * TODO
 */
export function createProgressStream(
  touchStartStream: Observable<TouchEvent>,
  touchMoveStream: Observable<TouchEvent>,
  wheelStream: Observable<MouseWheelEvent>,
  progressLimit: number
) {
  const normalizedTouchMoveStream = touchStartStream.pipe(
    switchMap(() =>
      touchMoveStream.pipe(
        filter(event => event.changedTouches.length > 0),
        map(event => Math.floor(event.changedTouches[0].screenY / 30)),
        distinctUntilChanged(),
        pairwise(),
        map(([previous, current]) => previous - current)
      )
    )
  );

  const normalizedWheelStream = wheelStream.pipe(map(event => ((event.deltaY * -1 || event.detail * -1) > 0 ? -1 : 1)));

  return normalizedWheelStream.pipe(
    merge(normalizedTouchMoveStream),
    scan((progress, adjustment) => {
      const newProgress = progress + adjustment;
      return newProgress < 0 ? 0 : newProgress > progressLimit ? progress : newProgress;
    }, 0),
    startWith(0),
    distinctUntilChanged()
  );
}

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

export function createIntroOpacityStream(progressStream: Observable<number>) {
  return progressStream.pipe(
    filter(progress => progress <= 5),
    map(progress => (progress === 0 ? 1 : 1 - (progress / 5) * 2))
  );
}

export function createOutroOpacityStream(progressStream: Observable<number>, progressLimit: number) {
  return progressStream.pipe(
    map(progress => (progress === progressLimit ? 1 : 0)),
    startWith(0),
    distinctUntilChanged()
  );
}

export function createImageStreams(
  progressStream: Observable<number>,
  images: readonly string[],
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

export function createPercentWithinImageStream(progressStream: Observable<number>, stepsPerImage: number) {
  return progressStream.pipe(
    map(progress => {
      const imageIndex = Math.floor(progress / stepsPerImage);
      return ((progress - imageIndex * stepsPerImage) / stepsPerImage) * 100;
    })
  );
}

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

export function createImageBlurStream(percentWithinImageStream: Observable<number>) {
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

export function createImageHeightStream(
  percentWithinImageStream: Observable<number>,
  zoomStream: Observable<InputEvent>
) {
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

export function createImageSepiaStream(sepiaStream: Observable<InputEvent>) {
  return sepiaStream.pipe(
    map(event => Number((event.target as HTMLInputElement).value)),
    startWith(0),
    map(sepia => sepia / 10)
  );
}
