var install_prompt;

window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault();
  install_prompt = event;
  if (!getCookie('prompt_dismissed')) {
    m.redraw();
  }
});

window.addEventListener('appinstalled', function (event) {
  install_prompt = null;
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('service.min.js?v=2', {
      scope: '.',
    })
    .then(
      function (registration) {
        // console.log('ServiceWorker registration successful with scope: ', registration.scope);
      },
      function (err) {
        // console.log('ServiceWorker registration failed: ', err);
      }
    );
}

var visibility_change;
if (typeof document.hidden !== 'undefined') {
  hidden = 'hidden';
  visibility_change = 'visibilitychange';
} else if (typeof document.msHidden !== 'undefined') {
  hidden = 'msHidden';
  visibility_change = 'msvisibilitychange';
} else if (typeof document.webkitHidden !== 'undefined') {
  hidden = 'webkitHidden';
  visibility_change = 'webkitvisibilitychange';
}

function randomNumber(min, max, int) {
  var random = Math.floor(Math.random() * (max - min + 1)) + min;
  if (int) {
    return parseInt(random);
  }
  return random;
}

function randomBoolean() {
  return Math.random() < 0.5;
}

function isCompatibleDesktop() {
  return (
    (window.innerWidth > window.innerHeight || window.innerHeight > window.innerWidth * 0.666666666) &&
    window.innerHeight >= 480
  );
}

function getDeviceOrientation() {
  if (isCompatibleDesktop()) {
    document.body.classList.add('desktop');
    return 'portrait';
  } else {
    document.body.classList.remove('desktop');
    if (Math.abs(window.innerHeight - window.innerWidth) < window.innerWidth / 2) {
      return 'undefined';
    }
    return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
  }
}

function isIos() {
  return (
    ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(navigator.platform) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document)
  );
}
function isAndroid() {
  return ['Android'].includes(navigator.platform);
}
function isMobile() {
  return (
    override ||
    typeof window.orientation !== 'undefined' ||
    navigator.userAgent.indexOf('IEMobile') !== -1 ||
    'ontouchend' in document
  );
}
function throttle(func, limit) {
  var waiting = false;
  return function () {
    var context = this;
    var args = arguments;
    if (!waiting) {
      func.apply(context, args);
      waiting = true;
      setTimeout(function () {
        waiting = false;
      }, limit);
    }
  };
}
function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this;
    var args = arguments;
    var later = function () {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func.apply(context, args);
    }
  };
}

function clamp(number, min, max) {
  return Math.min(Math.max(number, min), max);
}
function die(reason) {
  throw new Error(reason);
}

function colorDistance(a, b) {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
}

function approximateColor(arg, list, min) {
  if (list.length == 2) {
    if (colorDistance(arg, min) <= colorDistance(arg, list[1])) {
      return min;
    } else {
      return list[1];
    }
  } else {
    var tl = list.slice(1);
    if (colorDistance(arg, min) <= colorDistance(arg, list[1])) {
      min = min;
    } else {
      min = list[1];
    }
    return approximateColor(arg, tl, min);
  }
}

function separateChannels(image) {
  var imageR = new ImageData(image.width, image.height);
  var dR = imageR.data;
  var imageG = new ImageData(image.width, image.height);
  var dG = imageG.data;
  var imageB = new ImageData(image.width, image.height);
  var dB = imageB.data;
  image.data.forEach(function (v, i) {
    if (i % 4 === 0) {
      dR[i] = v;
      dR[i + 1] = v;
      dR[i + 2] = v;
      dR[i + 3] = 255;
    }
    if (i % 4 === 1) {
      dG[i - 1] = v;
      dG[i] = v;
      dG[i + 1] = v;
      dG[i + 2] = 255;
    }
    if (i % 4 === 2) {
      dB[i - 2] = v;
      dB[i - 1] = v;
      dB[i] = v;
      dB[i + 1] = 255;
    }
  });
  return {
    r: imageR,
    g: imageG,
    b: imageB,
  };
}

function mergeChannels(r, g, b) {
  var image = r;
  var d = image.data;
  d.forEach(function (v, i) {
    if (i % 4 === 1) {
      d[i] = g.data[i];
    }
    if (i % 4 === 2) {
      d[i] = b.data[i];
    }
  });
  return image;
}

function orderedDither(image, palette, gamma, brightness, contrast, noise, rgb) {
  if (rgb) {
    var channels = separateChannels(image);
    var ditheredR = orderedDither(channels.r, palette, gamma, brightness, contrast, noise);
    var ditheredG = orderedDither(channels.g, palette, gamma, brightness, contrast, noise);
    var ditheredB = orderedDither(channels.b, palette, gamma, brightness, contrast, noise);
    var rgbImage = mergeChannels(ditheredR, ditheredG, ditheredB);
    return rgbImage;
  } else {
    var d = image.data;
    var w = image.width;
    var h = image.height;
    var ratio = 4;
    var m = new Array([1, 9, 3, 11], [13, 5, 15, 7], [4, 12, 2, 10], [16, 8, 14, 6]);
    var fR = 0.2126;
    var fG = 0.7152;
    var fB = 0.0722;

    // var m = new Array(
    //   [ 11,  7,  10, 6],
    //   [3,  15, 2,  14],
    //   [ 9, 5,  12, 8],
    //   [1,  13, 4,  16]);

    var r, g, b, i, color, approx, tr, tg, tb, dx, dy, di;

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        i = 4 * x + 4 * y * w;

        r = i;
        g = i + 1;
        b = i + 2;
        a = i + 3;

        d[r] = parseInt(clamp((contrast - 0.2) * (d[r] - 128) + 128, 0, 255));
        d[g] = parseInt(clamp((contrast - 0.2) * (d[g] - 128) + 128, 0, 255));
        d[b] = parseInt(clamp((contrast - 0.2) * (d[b] - 128) + 128, 0, 255));

        d[r] = parseInt(clamp(d[r] * (brightness + 0.2), 0, 255));
        d[g] = parseInt(clamp(d[g] * (brightness + 0.2), 0, 255));
        d[b] = parseInt(clamp(d[b] * (brightness + 0.2), 0, 255));

        if (noise !== 0) {
          var luminance = (fR * d[r]) / 255 + (fG * d[g]) / 255 + (fB * d[b]) / 255;
          var factor = luminance < 0.5 ? Math.abs(luminance / 0.5) : Math.abs(luminance / 0.5 - 2);
          var grain = noise * factor;
          grain = randomNumber(grain * -1, grain);

          d[r] = parseInt(clamp(d[r] + grain * fR, 0, 255));
          d[g] = parseInt(clamp(d[g] + grain * fG, 0, 255));
          d[b] = parseInt(clamp(d[b] + grain * fB, 0, 255));
        }

        if (!debug_dither) {
          d[r] += m[x % 4][y % 4] * ratio;
          d[r] = 255 * Math.pow(d[r] / 255, gamma);

          d[g] += m[x % 4][y % 4] * ratio;
          d[g] = 255 * Math.pow(d[g] / 255, gamma);

          d[b] += m[x % 4][y % 4] * ratio;
          d[b] = 255 * Math.pow(d[b] / 255, gamma);

          color = new Array(d[r], d[g], d[b]);
          approx = approximateColor(color, dithering_palette, dithering_palette[0]);
          tr = approx[0];
          tg = approx[1];
          tb = approx[2];

          for (dx = 0; dx < 1; dx++) {
            for (dy = 0; dy < 1; dy++) {
              di = i + 4 * dx + 4 * w * dy;
              d[di] = tr;
              d[di + 1] = tg;
              d[di + 2] = tb;
            }
          }
        }
      }
    }
    return applyPalette(image, palette);
  }
}

function applyPalette(image, palette) {
  var d = image.data;
  var w = image.width;
  var h = image.height;
  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      i = 4 * x + 4 * y * w;

      r = i;
      g = i + 1;
      b = i + 2;
      a = i + 3;

      if (d[r] === dithering_palette[0][0] && d[g] === dithering_palette[0][1] && d[b] === dithering_palette[0][2]) {
        d[r] = palette[0][0];
        d[g] = palette[0][1];
        d[b] = palette[0][2];
      } else if (
        d[r] === dithering_palette[1][0] &&
        d[g] === dithering_palette[1][1] &&
        d[b] === dithering_palette[1][2]
      ) {
        d[r] = palette[1][0];
        d[g] = palette[1][1];
        d[b] = palette[1][2];
      } else if (
        d[r] === dithering_palette[2][0] &&
        d[g] === dithering_palette[2][1] &&
        d[b] === dithering_palette[2][2]
      ) {
        d[r] = palette[2][0];
        d[g] = palette[2][1];
        d[b] = palette[2][2];
      } else if (
        d[r] === dithering_palette[3][0] &&
        d[g] === dithering_palette[3][1] &&
        d[b] === dithering_palette[3][2]
      ) {
        d[r] = palette[3][0];
        d[g] = palette[3][1];
        d[b] = palette[3][2];
      } else {
        console.log('color not found');
      }
    }
  }
  return image;
}

function resize(
  source_context,
  target_context,
  scale_context,
  post_process,
  callback,
  quality,
  amount,
  radius,
  threshold,
  direction
) {
  if (quality === undefined) {
    quality = -1;
  }
  if (callback) {
    var scale_width;
    var scale_height;

    var source_width = source_context.canvas.width;
    var source_height = source_context.canvas.height;

    var target_width = target_context.canvas.width;
    var target_height = target_context.canvas.height;

    if (source_height <= source_width) {
      scale_width = (target_height / source_height) * source_width;
      scale_height = target_height;
      offset_x = Math.floor((scale_width - target_width) / 2);
      offset_y = 0;
    } else {
      scale_width = target_width;
      scale_height = (target_width / source_width) * source_height;
      offset_x = 0;
      offset_y = Math.floor((scale_height - target_height) / 2);
    }

    scale_context.canvas.width = scale_width;
    scale_context.canvas.height = scale_height;
    if (direction === 'user') {
      scale_context.translate(scale_width, 0);
      scale_context.scale(-1, 1);
    }
    if (quality > -1) {
      amount = amount || 160;
      radius = radius || 0.6;
      threshold = threshold || 1;
      pica
        .resize(source_context.canvas, scale_context.canvas, {
          unsharpAmount: amount,
          unsharpRadius: radius,
          unsharpThreshold: threshold,
          quality: quality,
        })
        .then(function (result) {
          var image_data = scale_context.getImageData(offset_x, offset_y, target_width, target_height);
          target_context.putImageData(post_process(image_data), 0, 0);
          callback();
        });
    } else {
      scale_context.drawImage(source_context.canvas, 0, 0, scale_width, scale_height);
      var image_data = scale_context.getImageData(offset_x, offset_y, target_width, target_height);
      target_context.putImageData(post_process(image_data), 0, 0);
      callback();
    }
  }
}

function getTimestamp() {
  return 'pocket_camera_' + Math.floor(Date.now() / 1000);
}

function route(requestedPath) {
  window.location.replace(m.route.prefix + requestedPath);
}

function getCookie(key) {
  var t = '; ' + document.cookie,
    i = t.split('; ' + key + '=');
  var result;
  try {
    result = JSON.parse(2 != i.length ? void 0 : i.pop().split(';').shift());
  } catch (e) {
    result = false;
  }
  return result;
}

function setCookie(key, value, days) {
  var s = new Date();
  s.setDate(s.getDate() + (days || 365));
  var r = [
    key + '=' + (JSON.stringify(value) || ''),
    'expires=' + s.toUTCString(),
    'path=/',
    'SameSite=strict',
    'Secure',
  ];
  document.cookie = r.join(';');
  return getCookie(key);
}

document.addEventListener('contextmenu', function (event) {
  event.preventDefault();
  return false;
});

function stopStream() {
  if (typeof stream !== 'undefined' && stream !== 'initializing') {
    stream.getTracks().forEach(function (track) {
      track.stop();
      stream = undefined;
    });
  }
}

function adjustBrightness(context) {
  if (isIos()) {
    if (brightness_modifier < 100) {
      context.globalCompositeOperation = 'multiply';
      context.globalAlpha = brightness_modifier / 100;
      context.fillStyle = 'black';
      context.fillRect(0, 0, camera_width, camera_height);
    }
    if (brightness_modifier > 100) {
      context.globalCompositeOperation = 'screen';
      context.globalAlpha = brightness_modifier / 100;
      context.fillStyle = 'white';
      context.fillRect(0, 0, camera_width, camera_height);
    }
    context.globalCompositeOperation = 'source-over';
  }
}

function getComposite(callback, palette, blob) {
  composite_context.restore();
  var composite_width = camera_width;
  var composite_height = camera_height;
  if (!frame_disabled) {
    composite_width = camera_width + 32;
    composite_height = camera_height + 32;
  }
  composite_canvas.width = composite_width;
  composite_canvas.height = composite_height;
  var frame = new Image();
  frame.onload = function () {
    if (!frame_disabled) {
      composite_context.drawImage(frame, 0, 0);
      composite_context.putImageData(
        applyPalette(
          composite_context.getImageData(0, 0, composite_width, composite_height),
          palette
        ),
        0,
        0
      );
    }
    if (facing_mode === 'user') {
      composite_context.translate(composite_width, 0);
      composite_context.scale(-1, 1);
    }
    if (!frame_disabled) {
      composite_context.drawImage(preview_canvas, 16, 16);
    } else {
      composite_context.drawImage(preview_canvas, 0, 0);
    }
    var image = new Image();
    image.onload = function () {
      composite_canvas.width = composite_width * composite_scale;
      composite_canvas.height = composite_height * composite_scale;
      composite_context.mozImageSmoothingEnabled = false;
      composite_context.oImageSmoothingEnabled = false;
      composite_context.webkitImageSmoothingEnabled = false;
      composite_context.msImageSmoothingEnabled = false;
      composite_context.imageSmoothingEnabled = false;
      composite_context.drawImage(image, 0, 0, composite_canvas.width, composite_canvas.height);
      if (callback) {
        if (blob) {
          composite_canvas.toBlob(callback, 'image/jpeg', 0);
        } else {
          callback(composite_canvas.toDataURL('image/jpeg', 0));
        }
      }
    };
    image.src = composite_canvas.toDataURL();
  };
  frame.src = frames[0];
}
