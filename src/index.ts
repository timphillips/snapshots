import { fromEvent } from "rxjs";
import { combineLatest, switchMap } from "rxjs/operators";
import { shuffleArray, requireHtmlElement, setOpacity, getCloudImageUrl } from "./utils";
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
import { baseImageUrl } from "./config";

function init() {
  const images = shuffleArray([
    `${baseImageUrl}/DSC01577.gif`,
    `${baseImageUrl}/DSC07213.gif`,
    `${baseImageUrl}/DSC07281.gif`,
    `${baseImageUrl}/DSC09784.gif`,
    `${baseImageUrl}/DSC09893.gif`,
    `${baseImageUrl}/P1040830.gif`,
    `${baseImageUrl}/P1320569.gif`,
    `${baseImageUrl}/P1380023.gif`,
    `${baseImageUrl}/P1420726.gif`,
    `${baseImageUrl}/P1430273.gif`,
    `${baseImageUrl}/P1070584.gif`,
    `${baseImageUrl}/P1080408.gif`,
    `${baseImageUrl}/P1560191.gif`
  ]);

  // DOM elements
  const controlsElement = requireHtmlElement("controls");
  const imageElement = requireHtmlElement("image") as HTMLImageElement;
  const introElement = requireHtmlElement("intro");
  const outroElement = requireHtmlElement("outro");
  const sepiaElement = requireHtmlElement("sepia");
  const zoomElement = requireHtmlElement("zoom");

  // input event streams
  const zoomStream = fromEvent<InputEvent>(zoomElement, "input");
  const sepiaStream = fromEvent<InputEvent>(sepiaElement, "input");
  const wheelStream = fromEvent<MouseWheelEvent>(window.document, "wheel"); // desktop browser
  const touchStartStream = fromEvent<TouchEvent>(window.document, "touchstart");
  const touchMoveStream = fromEvent<TouchEvent>(window.document, "touchmove");

  // update streams
  const stepsPerImage = 20;
  const progressLimit = stepsPerImage * images.length;

  const progressStream = createProgressStream(touchStartStream, touchMoveStream, wheelStream, progressLimit);
  const { imageStream, upcomingImagesStream } = createImageStreams(progressStream, images, stepsPerImage);
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
  imageStream.subscribe(image => (imageElement.src = getCloudImageUrl(image, window.innerHeight)));
  imageHeightStream.subscribe(height => (imageElement.style.height = `${height}px`));
  imageOpacityStream.subscribe(opacity => (imageElement.style.opacity = opacity.toString()));
  imageBlurStream
    .pipe(combineLatest(imageSepiaStream))
    .subscribe(([blur, sepia]) => (imageElement.style.filter = `blur(${blur}px) sepia(${sepia})`));
  upcomingImagesStream.subscribe(images =>
    images.forEach(image => (new Image().src = getCloudImageUrl(image, window.innerHeight)))
  );
}

window.onload = init;
