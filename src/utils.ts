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
 * Sets the filter CSS property of the given element.
 */
export function setFilter(element: HTMLElement, { blur, sepia }: { blur?: number; sepia?: number }) {
  const blurValue = typeof blur === "number" ? `blur(${blur}px)` : undefined;
  const sepiaValue = typeof sepia === "number" ? `sepia(${sepia})` : undefined;

  element.style.filter = [blurValue, sepiaValue].filter(Boolean).join(", ");
}

/**
 * Sets the opacity of the given element.
 * Hides the element entirely if the opacity is 0.
 */
export function setOpacity(element: HTMLElement, opacity: number) {
  if (opacity <= 0 && element.style.display !== "none") {
    element.style.display = "none";
  } else if (element.style.display === "none") {
    element.style.display = "";
  }
  element.style.opacity = opacity.toString();
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
 * Gets a CloudImage URL for the given
 *
 * CloudImage
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

  return `http://${cloudImageToken}.cloudimg.io/v7/${imageUrl}?h=${imageHeight}`;
}
