const nextButton = document.getElementById("next");
const backButton = document.getElementById("back");
const subSelect = document.getElementById("sub");
const img = document.getElementById("img");
const loading = document.getElementById("loading");

const LOADING_ERROR_URL = "https://jhusain.github.io/reddit-image-viewer/error.png";
const Observable = Rx.Observable;

// function which returns an array of image URLs for a given reddit sub
// getSubImages("pics") ->
// [
//   "https://upload.wikimedia.org/wikipedia/commons/3/36/Hopetoun_falls.jpg",
//   "https://upload.wikimedia.org/wikipedia/commons/3/38/4-Nature-Wallpapers-2014-1_ukaavUI.jpg",
//   ...
// ]
function getSubImages(sub) {
  const cachedImages = localStorage.getItem(sub);
  if (cachedImages) {
      return Observable.of(JSON.parse(cachedImages));
  }
  else {
    const url = `https://www.reddit.com/r/${sub}/.json?limit=200&show=all`;

    // defer ensure new Observable (and therefore) promise gets created
    // for each subscription. This ensures functions like retry will
    // issue additional requests.
    return Observable.defer(() =>
      Observable.fromPromise(
        fetch(url).
          then(res => res.json()).
          then(data => {
            const images =
              data.data.children.map(image => image.data.url);
            localStorage.setItem(sub, JSON.stringify(images));
            return images;
          })));
  }
}

// ---------------------- INSERT CODE  HERE ---------------------------

const sub$ = 
  Observable.concat(
    Observable.of(subSelect.value),
    Observable.fromEvent(subSelect, 'change').
    map((event) => event.target.value)  
  )
 
const next$ = Observable.fromEvent(nextButton, 'click');

const back$ = Observable.fromEvent(backButton, 'click');

const offset$ = 
    Observable.merge(
      next$.map(() => 1),
      back$.map(() => -1)
    )

const indices = 
      Observable.concat(
        Observable.of(0),
        offset$.scan((acc, curr) => acc + curr, 0)
      )


// Preload image
// const img = new Image(src);
// img.onload = function() {
// }
// img.onerror = function() {
// }

//Preload image observable
function preloadImage(src) {
  const img = new Image(src);
  const success$ = 
    Observable.fromEvent(img , 'load').
    map(() => src);
  const failure$ = 
    Observable.fromEvent(img , 'error').
    map(() => LOADING_ERROR_URL);

  return Observable.merge(success$, failure$);
}           

// This "images" Observable is a dummy. Replace it with a stream of each
// image in the current sub which is navigated by the user.
const image$ = 
    sub$.map((sub) => 
      getSubImages(sub).
        map(images => indices.map(index => images[index]))).
        switch().
        map((url) => preloadImage(url)).
        switch().
      switch();

images.subscribe({
  next(url) {
    loading.style.visibility = "hidden";
    img.src = url;
  },
  error(e) {
    alert("I'm having trouble loading the images for that sub. Please wait a while, reload, and then try again later.")
  }
})

const actions = Observable.merge(sub$, next$, back$);
actions.subscribe(() => loading.style.visibility = "visible");
