import { combineLatest, fromEvent, merge } from "rxjs";
import {
  createControlsOpacityStream,
  createImageBlurStream,
  createImageHeightStream,
  createImageIndexStream,
  createImageSepiaStream,
  createImageStreams,
  createImageTransitionStream,
  createIntroOpacityStream,
  createNextButtonActiveStream,
  createOutroOpacityStream,
  createPreviousButtonActiveStream
} from "./streams";
import { debounceTime, filter, map, mapTo, take } from "rxjs/operators";
import {
  getCloudImageUrl,
  requireHtmlElement,
  setFilter,
  setHeight,
  setOpacity,
  shuffleArray,
  toggleCssClass
} from "./utils";

import { images } from "./images.json";

function init() {
  const shuffledImages = shuffleArray(images);

  // DOM elements
  const blurElement = requireHtmlElement("blur") as HTMLInputElement;
  const controlsElement = requireHtmlElement("controls");
  const imageCaptionElement = requireHtmlElement("imageCaption");
  const imageElement = requireHtmlElement("image") as HTMLImageElement;
  const introElement = requireHtmlElement("intro");
  const nextElement = requireHtmlElement("next");
  const outroElement = requireHtmlElement("outro");
  const previousElement = requireHtmlElement("previous");
  const sepiaElement = requireHtmlElement("sepia") as HTMLInputElement;
  const zoomElement = requireHtmlElement("zoom") as HTMLInputElement;

  // DOM event streams
  const clickStream = fromEvent<MouseEvent>(window.document, "click");
  const clickControlsStream = fromEvent<MouseEvent>(controlsElement, "click");
  const clickPreviousStream = fromEvent<MouseEvent>(previousElement, "click");

  const keyUpStream = fromEvent<KeyboardEvent>(window.document, "keyup");
  const mouseMoveStream = fromEvent<MouseEvent>(window.document, "mousemove");
  const mouseWheelStream = fromEvent<MouseWheelEvent>(window.document, "wheel");

  const blurStream = fromEvent<InputEvent>(blurElement, "input");
  const sepiaStream = fromEvent<InputEvent>(sepiaElement, "input");
  const zoomStream = fromEvent<InputEvent>(zoomElement, "input");

  // update streams
  const activateStream = clickStream.pipe(take(1));
  const leftArrowStream = keyUpStream.pipe(filter(key => key.keyCode === 37));
  const rightArrowStream = keyUpStream.pipe(filter(key => key.keyCode === 39));

  const previousImageStream = merge(clickPreviousStream, leftArrowStream).pipe(mapTo(-1));
  const nextImageStream = merge(clickStream, rightArrowStream).pipe(mapTo(1));

  const imageIndexStream = createImageIndexStream(merge(previousImageStream, nextImageStream), shuffledImages.length);
  const { imageStream, upcomingImagesStream } = createImageStreams(imageIndexStream, shuffledImages);
  const imageTransitionStream = createImageTransitionStream(activateStream, imageStream, shuffledImages);

  const imageHeightStream = createImageHeightStream(zoomStream);
  const imageBlurStream = createImageBlurStream(activateStream, mouseMoveStream, blurStream);
  const imageSepiaStream = createImageSepiaStream(sepiaStream);

  const controlsOpacityStream = createControlsOpacityStream(activateStream);
  const nextButtonActiveStream = createNextButtonActiveStream(imageIndexStream);
  const previousButtonActiveStream = createPreviousButtonActiveStream(imageIndexStream);
  const outroOpacityStream = createOutroOpacityStream(imageIndexStream);
  const introOpacityStream = createIntroOpacityStream(activateStream);

  // apply DOM updates
  mouseWheelStream
    .pipe(map(event => ((event.deltaY * -1 || event.detail * -1) > 0 ? -10 : 10)))
    .subscribe(adjustment => {
      const currentValue = parseInt(zoomElement.value);
      const newValue = currentValue + adjustment;
      if (currentValue != newValue && newValue >= 20 && newValue <= 200) {
        zoomElement.value = newValue.toString();
        zoomElement.dispatchEvent(new Event("input"));
      }
    });
  upcomingImagesStream.subscribe(upcomingImages => {
    for (const image of upcomingImages) {
      // start preloading upcoming images
      new Image().src = getCloudImageUrl(image, window.innerHeight);
    }
  });
  combineLatest(imageTransitionStream, imageBlurStream, imageHeightStream, imageSepiaStream)
    .pipe(debounceTime(10))
    .subscribe(([{ transition, image }, blur, height, sepia]) => {
      if (image) {
        imageElement.src = getCloudImageUrl(image.src, window.innerHeight);
      }
      imageElement.alt = image?.alt || "";
      imageCaptionElement.innerText = image?.alt || "";
      setHeight(imageElement, height + (transition.size || 0));
      setOpacity(imageElement, transition.opacity);
      setFilter(imageElement, { blur: transition.blur + blur, sepia });
    });

  controlsOpacityStream.subscribe(opacity => setOpacity(controlsElement, opacity));
  introOpacityStream.subscribe(opacity => setOpacity(introElement, opacity));
  outroOpacityStream.subscribe(opacity => setOpacity(outroElement, opacity));
  combineLatest(controlsOpacityStream, nextButtonActiveStream).subscribe(([opacity, isActive]) => {
    setOpacity(nextElement, opacity);
    toggleCssClass(nextElement, "arrowControl--active", isActive);
  });
  combineLatest(controlsOpacityStream, previousButtonActiveStream).subscribe(([opacity, isActive]) => {
    setOpacity(previousElement, opacity);
    toggleCssClass(previousElement, "arrowControl--active", isActive);
  });
  // clicking on the controls or the previous button should not bubble
  // up to the document click handler that advances to the next image
  merge(clickControlsStream, clickPreviousStream).subscribe(e => e.stopPropagation());
}

window.onload = init;
