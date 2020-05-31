import { cloudImageToken } from "./config";

/**
 * Returns a new array that contains the elements of the input array in a random order.
 *
 * Sourced from https://stackoverflow.com/a/12646864.
 */
export function shuffleArray<T>(array: T[]): T[] {
  const a = array.slice();

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

/**
 * Sets the height of the given element.
 */
export function setHeight(element: HTMLElement, height: number) {
  const heightString = `${height}px`;
  if (element.style.height !== heightString) {
    element.style.height = heightString;
  }
}

/**
 * Sets the filter CSS property of the given element.
 */
export function setFilter(element: HTMLElement, { blur, sepia }: { blur?: number; sepia?: number }) {
  const blurValue = typeof blur === "number" ? `blur(${blur}px)` : undefined;
  const sepiaValue = typeof sepia === "number" ? `sepia(${sepia})` : undefined;

  const filterString = [blurValue, sepiaValue].filter(Boolean).join(" ");
  if (element.style.filter !== filterString) {
    element.style.filter = filterString;
  }
}

/**
 * Sets the opacity of the given element.
 *
 * Hides the element entirely if the opacity is 0.
 */
export function setOpacity(element: HTMLElement, opacity: number) {
  if (opacity <= 0) {
    if (element.style.display !== "none") {
      element.style.display = "none";
    }
  } else if (element.style.display === "none") {
    element.style.display = "";
  }
  const opacityString = opacity.toString();
  if (element.style.opacity !== opacityString) {
    element.style.opacity = opacityString;
  }
}

/**
 * Programmatically sets the value of an input element.
 */
export function adjustRangeInputValue(
  element: HTMLInputElement,
  { adjustment, min, max }: { adjustment: number; min: number; max: number }
) {
  const currentValue = parseInt(element.value);
  const newValue = currentValue + adjustment;
  if (currentValue != newValue && newValue >= min && newValue <= max) {
    element.value = newValue.toString();
    element.dispatchEvent(new Event("input")); // notifies listeners
  }
}

/**
 * Sets the opacity of the given element.
 *
 * Hides the element entirely if the opacity is 0.
 */
export function toggleCssClass(element: HTMLElement, className: string, active: boolean) {
  if (element.classList.contains(className) && !active) {
    element.classList.toggle(className, false);
  } else if (!element.classList.contains(className) && active) {
    element.classList.toggle(className, true);
  }
}

/**
 * Finds an HTML element with the given ID.
 *
 * @throws if the element is not found.
 */
export function requireHtmlElement(id: string): HTMLElement {
  const element = window.document.getElementById(id);
  if (!element) {
    throw new Error(`Expected to find an element with id ${id}.`);
  }
  return element;
}

/**
 * Gets a CloudImage URL for the given source URL.
 */
export function getCloudImageUrl(imageUrl: string, windowHeight: number): string {
  let imageHeight: number;
  if (windowHeight < 500) {
    imageHeight = 500;
  } else if (windowHeight < 1000) {
    imageHeight = 1000;
  } else if (windowHeight < 1500) {
    imageHeight = 1500;
  } else if (windowHeight < 2000) {
    imageHeight = 2000;
  } else {
    imageHeight = 2500;
  }

  return `https://${cloudImageToken}.cloudimg.io/v7/${imageUrl}?h=${imageHeight}`;
}

/**
 * Starts loading images that may not yet exist in the DOM.
 */
export function preloadImages(images: string[]) {
  for (const image of images) {
    new Image().src = getCloudImageUrl(image, window.innerHeight);
  }
}
