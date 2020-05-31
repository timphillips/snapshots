import {
  adjustRangeInputValue,
  getCloudImageUrl,
  preloadImages,
  requireHtmlElement,
  setFilter,
  setHeight,
  setOpacity,
  shuffleArray,
  toggleCssClass
} from "./utils";
import { combineLatest, fromEvent, merge } from "rxjs";
import {
  createControlsOpacityStream,
  createImageBlurStream,
  createImageHeightStream,
  createImageIndexStream,
  createImageSepiaStream,
  createImageStreams,
  createImageTransitionStream,
  createInfoOpacityStream,
  createNextButtonActiveStream,
  createOutroOpacityStream,
  createPreviousButtonActiveStream,
  createStateStream
} from "./streams";
import { debounceTime, filter, map, mapTo } from "rxjs/operators";

import { images } from "./images.json";

/**
 * Fetches all HTML elements used by the site.
 *
 * @throws if any of the required elements are not found.
 */
function getHtmlElements() {
  return {
    blurElement: requireHtmlElement("blur") as HTMLInputElement,
    controlsElement: requireHtmlElement("controls"),
    controlsTitleElement: requireHtmlElement("controlsTitle"),
    footerElement: requireHtmlElement("footer"),
    imageCaptionElement: requireHtmlElement("imageCaptionLink") as HTMLLinkElement,
    imageElement: requireHtmlElement("image") as HTMLImageElement,
    infoElement: requireHtmlElement("info"),
    nextElement: requireHtmlElement("next"),
    outroElement: requireHtmlElement("outro"),
    previousElement: requireHtmlElement("previous"),
    sepiaElement: requireHtmlElement("sepia") as HTMLInputElement,
    zoomElement: requireHtmlElement("zoom") as HTMLInputElement
  };
}

/**
 * Initializes the site.
 *
 * At a high level, this function does three things:
 *  1. Sets up event listeners on DOM elements to capture user input/interaction
 *  2. Maps streams of DOM events to application state
 *  3. Applies application state to DOM elements
 */
export function init() {
  const shuffledImages = shuffleArray(images);

  // DOM elements
  const {
    blurElement,
    controlsElement,
    controlsTitleElement,
    footerElement,
    imageCaptionElement,
    imageElement,
    infoElement,
    nextElement,
    outroElement,
    previousElement,
    sepiaElement,
    zoomElement
  } = getHtmlElements();

  // DOM input streams
  const clickControlsStream = fromEvent<MouseEvent>(controlsElement, "click");
  const clickControlsTitleStream = fromEvent<MouseEvent>(controlsTitleElement, "click");
  const clickFooterStream = fromEvent<MouseEvent>(footerElement, "click");
  const clickImageCaptionStream = fromEvent<MouseEvent>(imageCaptionElement, "click");
  const clickPreviousStream = fromEvent<MouseEvent>(previousElement, "click");
  const clickStream = fromEvent<MouseEvent>(window.document, "click");

  const keyUpStream = fromEvent<KeyboardEvent>(window.document, "keyup");
  const mouseMoveStream = fromEvent<MouseEvent>(window.document, "mousemove");
  const mouseWheelStream = fromEvent<MouseWheelEvent>(window.document, "wheel");

  const blurStream = fromEvent<InputEvent>(blurElement, "input");
  const sepiaStream = fromEvent<InputEvent>(sepiaElement, "input");
  const zoomStream = fromEvent<InputEvent>(zoomElement, "input");

  // composed update streams
  const leftArrowStream = keyUpStream.pipe(filter(key => key.keyCode === 37));
  const rightArrowStream = keyUpStream.pipe(filter(key => key.keyCode === 39));

  const stateStream = createStateStream(clickControlsTitleStream, clickStream, leftArrowStream, rightArrowStream);

  const previousImageStream = merge(clickPreviousStream, leftArrowStream).pipe(mapTo(-1));
  const nextImageStream = merge(clickStream, rightArrowStream).pipe(mapTo(1));
  const imageAdjustmentStream = merge(previousImageStream, nextImageStream);
  const imageIndexStream = createImageIndexStream(stateStream, imageAdjustmentStream, shuffledImages);
  const { imageStream, upcomingImagesStream } = createImageStreams(imageIndexStream, shuffledImages);
  const imageTransitionStream = createImageTransitionStream(stateStream, imageStream, shuffledImages);

  const imageHeightStream = createImageHeightStream(zoomStream);
  const imageBlurStream = createImageBlurStream(mouseMoveStream, blurStream);
  const imageSepiaStream = createImageSepiaStream(sepiaStream);

  const controlsOpacityStream = createControlsOpacityStream(stateStream);
  const nextButtonActiveStream = createNextButtonActiveStream(imageIndexStream);
  const previousButtonActiveStream = createPreviousButtonActiveStream(imageIndexStream);
  const outroOpacityStream = createOutroOpacityStream(imageIndexStream);
  const infoOpacityStream = createInfoOpacityStream(stateStream);

  // apply DOM updates
  mouseWheelStream
    .pipe(map(event => ((event.deltaY * -1 || event.detail * -1) > 0 ? -10 : 10)))
    .subscribe(adjustment => adjustRangeInputValue(zoomElement, { adjustment, min: 20, max: 200 }));
  upcomingImagesStream.subscribe(preloadImages);
  combineLatest(imageTransitionStream, imageBlurStream, imageHeightStream, imageSepiaStream)
    .pipe(debounceTime(10))
    .subscribe(([{ transition, image }, blur, height, sepia]) => {
      if (image) {
        imageElement.src = getCloudImageUrl(image.src, window.innerHeight);
      }
      imageElement.alt = image?.alt || "";
      imageCaptionElement.innerText = image?.alt || "";
      imageCaptionElement.href = image?.url || "";
      setHeight(imageElement, height + (transition.size || 0));
      setOpacity(imageElement, transition.opacity);
      setFilter(imageElement, { blur: transition.blur + blur, sepia });
    });
  infoOpacityStream.subscribe(opacity => setOpacity(infoElement, opacity));
  outroOpacityStream.subscribe(opacity => {
    setOpacity(controlsElement, 1 - opacity);
    setOpacity(outroElement, opacity);
  });
  controlsOpacityStream.subscribe(opacity => {
    setOpacity(controlsElement, opacity);
    setOpacity(nextElement, opacity);
    setOpacity(previousElement, opacity);
  });
  nextButtonActiveStream.subscribe(isActive => toggleCssClass(nextElement, "arrowControl--active", isActive));
  previousButtonActiveStream.subscribe(isActive => toggleCssClass(previousElement, "arrowControl--active", isActive));
  merge(clickControlsStream, clickFooterStream, clickPreviousStream, clickImageCaptionStream).subscribe(
    event => event.stopPropagation() // prevent bubbling of click events
  );
}
