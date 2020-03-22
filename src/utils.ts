/**
 * Returns a new array that contains the elements of the given array in a random order.
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

export function setOpacity(element: HTMLElement, opacity: number) {
  if (opacity <= 0 && element.style.display !== "none") {
    element.style.display = "none";
  } else if (element.style.display === "none") {
    element.style.display = "inherit";
  }
  element.style.opacity = opacity.toString();
}

export function requireHtmlElement(id: string): HTMLElement {
  const element = window.document.getElementById(id);
  if (!element) {
    throw new Error(`Expected to find an element with id ${id}.`);
  }
  return element;
}
