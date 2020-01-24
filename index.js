window.addEventListener("DOMMouseScroll", onMouseWheel, false);
window.onmousewheel = document.onmousewheel = onMouseWheel; // IE

const image1 = window.document.getElementById("image1");
const image2 = window.document.getElementById("image2");
const image3 = window.document.getElementById("image3");
const image4 = window.document.getElementById("image4");

image1.style.height = "800px";
image1.style.opacity = 1;

image2.style.height = "800px";
image2.style.opacity = 1;

image3.style.height = "800px";
image3.style.opacity = 1;

image4.style.height = "800px";
image4.style.opacity = 1;

let count = 0;
function onMouseWheel(event) {
  const scroll = event.deltaY * -1 || event.wheelDelta || event.detail * -1;

  const image1Opacity = image1.style.opacity;
  const image2Opacity = image2.style.opacity;
  const image3Opacity = image3.style.opacity;

  if (scroll > 0) {
    count++;
  } else {
    count--;
  }

  if (scroll > 0) {
    if (count >= 20 && count < 40) {
      image1.style.opacity = image1Opacity - 0.05;
    } else if (count >= 60 && count < 80) {
      image2.style.opacity = Number(image2Opacity) - 0.05;
    } else if (count >= 100 && count < 120) {
      image3.style.opacity = Number(image3Opacity) - 0.05;
    }
  } else {
    if (count >= 20 && count < 40) {
      image1.style.opacity = Number(image1Opacity) + 0.05;
    } else if (count >= 60 && count < 80) {
      image2.style.opacity = Number(image2Opacity) + 0.05;
    } else if (count >= 100 && count < 120) {
      image3.style.opacity = Number(image3Opacity) + 0.05;
    }
  }
}
