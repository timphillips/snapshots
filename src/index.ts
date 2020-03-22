import { fromEvent } from "rxjs";
import { combineLatest } from "rxjs/operators";
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
  imageStream.subscribe(image => (imageElement.src = getCloudImageUrl(image, window.innerHeight)));
  nextImageStream.subscribe(image => image && (stagingElement.src = getCloudImageUrl(image, window.innerHeight)));
  imageHeightStream.subscribe(height => (imageElement.style.height = `${height}px`));
  imageOpacityStream.subscribe(opacity => (imageElement.style.opacity = opacity.toString()));
  imageBlurStream
    .pipe(combineLatest(imageSepiaStream))
    .subscribe(([blur, sepia]) => (imageElement.style.filter = `blur(${blur}px) sepia(${sepia})`));
}

window.onload = init;
