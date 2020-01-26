function init() {
  window.addEventListener("DOMMouseScroll", onMouseWheel, false);
  window.onmousewheel = document.onmousewheel = onMouseWheel; // IE

  const imageIds = ["image1", "image2", "image3", "image4", "image5", "image6"];
  const images = imageIds.map(id => window.document.getElementById(id));

  // initial settings
  for (const image of images) {
    image.style.opacity = 0;
    image.style.filter = "blur(5px)";
    image.style.height = "700px";
    image.style.display = "inherit";
  }

  let tick = 0;
  const ticksPerImage = 40;

  function onMouseWheel(event) {
    const scroll = event.deltaY * -1 || event.wheelDelta || event.detail * -1;

    const imageIndex = Math.floor(tick / ticksPerImage);
    if (tick < 0 || imageIndex > images.length - 1) {
      return;
    }

    const image = images[imageIndex];
    const ticksWithinImage = tick - imageIndex * ticksPerImage;

    // fade in
    if (ticksWithinImage < 10) {
      const opacity = Number(image.style.opacity);
      image.style.opacity = opacity + (scroll > 0 ? 0.1 : -0.1);
    }
    if (ticksWithinImage >= 5 && ticksWithinImage < 15) {
      const blur = Number(
        image.style.filter.replace("blur(", "").replace("px)", "")
      );
      image.style.filter = `blur(${blur + (scroll > 0 ? -0.5 : 0.5)}px)`;

      const height = Number(image.style.height.replace("px", ""));
      image.style.height = `${height + (scroll > 0 ? -1 : 1)}px`;
    }

    // fade out
    if (ticksWithinImage >= 27 && ticksWithinImage < 33) {
      const blur = Number(
        image.style.filter.replace("blur(", "").replace("px)", "")
      );
      image.style.filter = `blur(${blur + (scroll > 0 ? 0.5 : -0.5)}px)`;
      const height = Number(image.style.height.replace("px", ""));
      image.style.height = `${height + (scroll > 0 ? 1 : -1)}px`;
    }
    if (ticksWithinImage >= 30 && ticksWithinImage <= ticksPerImage) {
      const opacity = Number(image.style.opacity);
      image.style.opacity = opacity + (scroll > 0 ? -0.1 : 0.1);
    }

    if (scroll > 0) {
      tick++;
    } else if (tick > 0) {
      tick--;
    }
  }
}
