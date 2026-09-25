// TODO: Start/Select, Menu, Color Palettes, correct color space

pica = window.pica({});

var root = document.body;
var times = [];
var true_fps = 0;
var target_fps = 12;
var last_tick = 0;

var hidden;

var screen_height;
var screen_width;
var controls_height;
var controls_width;
var padding = 40;

var camera_width = 128;
var camera_height = 112;

var override = getCookie('override') || false;
var frame_disabled = getCookie('frame_disabled') || false;
var device_orientation = getDeviceOrientation();
var not_supported = false;
var standby = false;
var background = false;
var stream;
var facing_modes = ['environment', 'user'];
var facing_mode = facing_modes[0];
var debug_color = false;
var debug_dither = false;
var animation;
var constraints = {};

var video_element;
var video_height = 1080;
var video_width = 1920;

var video_wrapper;
var video_canvas;
var video_context;

var camera_wrapper;
var camera_canvas;
var camera_context;

var preview_active = false;
var preview_wrapper;
var preview_canvas;
var preview_context;

var scale_wrapper;
var scale_canvas;
var scale_context;
var scale_quality = 0;
var sharpen_amount = 200;
var sharpen_radius = 0.6;
var sharpen_threshold = 15;

var composite_wrapper;
var composite_canvas;
var composite_context;
var composite_scale = 8;

var gamma_modifier = 2;
var contrast_modifier = 1;
var brightness_modifier = 1;
var noise_modifier = 64;
var rgb_enabled = false;

var active_palette = palettes[0];

var routes = {
  '/': {
    view: CameraPage,
    title: 'Pocket Camera',
  },
};

function Install() {
  return {
    view: function () {
      return m(
        'div',
        {
          class: 'install' + (install_prompt && !getCookie('prompt_dismissed') ? ' install--active' : ''),
        },
        m('img', {
          src: 'favicon.svg',
        }),
        m(
          'button',
          {
            class: 'button call-prompt',
            onclick: function (event) {
              install_prompt.prompt();
            },
          },
          'Install App'
        ),
        m('button', {
          class: 'dismiss-prompt',
          onclick: function (event) {
            setCookie('prompt_dismissed', true, 1);
          },
        })
      );
    },
  };
}

function View() {
  if (m.route.get() === '/') {
    window.location.replace('');
  }
  return {
    view: function (vnode) {
      return m(
        'main',
        {
          class: 'view view' + (m.route.get() || '-camera').replace(/\//gm, '-').toLowerCase(),
        },
        m(routes[m.route.get() || '/'].view)
      );
    },
  };
}

function Scaffold() {
  return {
    view: function (vnode) {
      return m(
        'div',
        {
          class: 'scaffold',
        },
        [m(Install), m(View)]
      );
    },
  };
}

function CameraPage() {
  function render() {
    setTimeout(function () {
      if (standby || not_supported) {
        animation = window.requestAnimationFrame(function () {
          destroyCamera();
          render();
        });
      } else {
        if (!preview_active && !standby && !not_supported) {
          if (typeof stream !== 'undefined' && stream !== 'initializing') {
            video_width = stream.getTracks()[0].getSettings().width;
            video_height = stream.getTracks()[0].getSettings().height;
            video_canvas.width = video_width;
            video_canvas.height = video_height;
            video_context.drawImage(video_element, 0, 0, video_width, video_height);

            resize(
              video_context,
              camera_context,
              scale_context,
              function (image_data) {
                if (debug_color) {
                  return image_data;
                } else {
                  return orderedDither(image_data, active_palette, gamma_modifier, brightness_modifier, contrast_modifier, noise_modifier, rgb_enabled);
                }
              },
              function () {
                animation = window.requestAnimationFrame(function () {
                  render();
                });
              },
              scale_quality,
              sharpen_amount,
              sharpen_radius,
              sharpen_threshold,
              facing_mode
            );
          } else if (typeof stream === 'undefined') {
            initializeCamera();
          }
        } else {
          animation = window.requestAnimationFrame(function () {
            destroyCamera();
            render();
          });
        }
      }
    }, 1000 / target_fps);
  }

  function destroyCamera() {
    stopStream();
    if (typeof animation !== 'undefined') {
      window.cancelAnimationFrame(animation);
    }
  }

  function initializeCamera() {
    constraints.facingMode = facing_mode;
    destroyCamera();
    stream = 'initializing';
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({
          video: constraints,
          audio: false,
        })
        .then(function (currentStream) {
          stream = currentStream;
          video_element.srcObject = stream;
          render();
        })
        .catch(function (error) {
          alert('Camera error! Please allow access to the camera.');
        });
    } else {
      alert('Camera error! Please allow access to the camera.');
    }
  }

  return {
    view: function () {
      return not_supported
        ? m(
            'div',
            {
              class: 'error-page',
            },
            m(
              'div',
              {
                class: 'error-message',
              },
              [
                m('div', {
                  class: 'error-icon mdi mdi-cellphone-erase',
                }),
                m(
                  'div',
                  {
                    class: 'error-text',
                  },
                  'Not supported.'
                ),
              ]
            )
          )
        : m(
            'div',
            {
              class: 'camera-page' + (preview_active ? ' preview' : '') + (rgb_enabled ? ' rgb' : ''),
            },
            [
              m(
                'div',
                {
                  class: 'screen-wrapper',
                  style: 'position: absolute; top: ' + padding + 'px; left: ' + padding + 'px; height:' + screen_height + 'px;width:' + screen_width + 'px;',
                },
                [
                  m('video', {
                    playsinline: true,
                    autoplay: true,
                    oncreate: function (vnode) {
                      video_element = vnode.dom;
                    },
                  }),
                  m(
                    'svg',
                    {
                      width: 0,
                      height: 0,
                      style: 'display: none;',
                    },
                    m(
                      'filter',
                      {
                        id: 'sharpen',
                      },
                      m('feConvolveMatrix', {
                        kernelMatrix: '0 -1 0 -1 15 -1 0 -1 0',
                      })
                    )
                  ),
                  m(
                    'div',
                    {
                      class: 'canvas-wrapper camera-wrapper',
                      oncreate: function (vnode) {
                        camera_wrapper = vnode.dom;
                      },
                    },
                    m('canvas', {
                      oncreate: function (vnode) {
                        camera_canvas = vnode.dom;
                        camera_context = camera_canvas.getContext('2d');
                        camera_canvas.width = camera_width;
                        camera_canvas.height = camera_height;
                        camera_context.fillStyle = 'black';
                        camera_context.fillRect(0, 0, camera_width, camera_height);
                        initializeCamera();
                      },
                      onremove: function (vnode) {
                        destroyCamera();
                      },
                    })
                  ),
                  m(
                    'div',
                    {
                      class: 'canvas-wrapper preview-wrapper' + (frame_disabled ? ' frame-disabled' : ''),
                      oncreate: function (vnode) {
                        preview_wrapper = vnode.dom;
                      },
                    },
                    [
                      m(
                        'div',
                        {
                          class: 'preview-buttons',
                        },
                        [
                          m(
                            'button',
                            {
                              class: 'frame-button mdi' + (frame_disabled ? ' mdi-checkbox-blank-outline' : ' mdi-checkbox-marked-outline'),
                              onclick: function () {
                                frame_disabled = !frame_disabled;
                                setCookie('frame_disabled', frame_disabled);
                              },
                            },
                            ''
                          ),
                          m(
                            'button',
                            {
                              class: 'save-button mdi mdi-content-save',
                              onclick: function () {
                                getComposite(function (composited_image) {
                                  preview_active = false;
                                  var link = document.createElement('a');
                                  link.download = getTimestamp() + '.jpg';
                                  link.href = composited_image;
                                  link.click();
                                  m.redraw();
                                }, active_palette);
                              },
                            },
                            ''
                          ),
                          m(
                            'button',
                            {
                              class: 'share-button mdi mdi-share-variant',
                              onclick: function () {
                                getComposite(
                                  function (composited_image) {
                                    var file = new File([composited_image], getTimestamp() + '.jpg', {
                                      type: 'image/jpeg',
                                    });
                                    var files_array = [file];
                                    if (navigator.canShare && navigator.canShare({ files: files_array })) {
                                      navigator
                                        .share({ files: files_array })
                                        .then(function () {})
                                        .catch(function (error) {
                                          console.log(error);
                                        });
                                    } else {
                                      alert('Your device does not support sharing files. You can save the image to your device instead.');
                                    }
                                    m.redraw();
                                  },
                                  active_palette,
                                  true
                                );
                              },
                            },
                            ''
                          ),
                          m(
                            'button',
                            {
                              class: 'delete-button mdi mdi-delete',
                              onclick: function () {
                                preview_active = false;
                              },
                            },
                            ''
                          ),
                        ]
                      ),
                      m('canvas', {
                        oncreate: function (vnode) {
                          preview_canvas = vnode.dom;
                          preview_context = preview_canvas.getContext('2d');
                          preview_canvas.width = camera_width;
                          preview_canvas.height = camera_height;
                        },
                      }),
                    ]
                  ),
                  m(
                    'div',
                    {
                      class: 'canvas-wrapper composite-wrapper',
                      oncreate: function (vnode) {
                        composite_wrapper = vnode.dom;
                      },
                    },
                    m('canvas', {
                      oncreate: function (vnode) {
                        composite_canvas = vnode.dom;
                        composite_context = composite_canvas.getContext('2d');
                      },
                    })
                  ),
                  m(
                    'div',
                    {
                      class: 'canvas-wrapper scale-wrapper',
                      oncreate: function (vnode) {
                        scale_wrapper = vnode.dom;
                      },
                    },
                    m('canvas', {
                      oncreate: function (vnode) {
                        scale_canvas = vnode.dom;
                        scale_context = scale_canvas.getContext('2d');
                      },
                    })
                  ),
                  m(
                    'div',
                    {
                      class: 'canvas-wrapper video-wrapper',
                      oncreate: function (vnode) {
                        video_wrapper = vnode.dom;
                      },
                    },
                    m('canvas', {
                      oncreate: function (vnode) {
                        video_canvas = vnode.dom;
                        video_context = video_canvas.getContext('2d');
                      },
                    })
                  ),
                ]
              ),
              m(
                'div',
                {
                  class: 'controls-wrapper',
                  style: 'position: absolute; bottom: ' + padding + 'px; left: ' + padding + 'px; height:' + controls_height + 'px;width:' + controls_width + 'px;',
                },
                [
                  m('div', {
                    class: 'logo',
                    onclick: function () {
                      rgb_enabled = !rgb_enabled;
                    },
                  }),
                  m(
                    'div',
                    {
                      class: 'd-pad-wrapper',
                    },
                    [
                      m(
                        'button',
                        {
                          'aria-label': 'Increase Brightness',
                          class: 'up-button mdi mdi-triangle',
                          onclick: function () {
                            brightness_modifier = clamp(brightness_modifier + 0.1, 0.5, 1.5);
                          },
                        },
                        ''
                      ),
                      m(
                        'button',
                        {
                          'aria-label': 'Increase Contrast',
                          class: 'right-button mdi mdi-triangle',
                          onclick: function () {
                            contrast_modifier = clamp(contrast_modifier + 0.1, 0.5, 1.5);
                          },
                        },
                        ''
                      ),
                      m(
                        'button',
                        {
                          'aria-label': 'Decrease Brightness',
                          class: 'down-button mdi mdi-triangle',
                          onclick: function () {
                            brightness_modifier = clamp(brightness_modifier - 0.1, 0.5, 1.5);
                          },
                        },
                        ''
                      ),
                      m(
                        'button',
                        {
                          'aria-label': 'Decrease Contrast',
                          class: 'left-button mdi mdi-triangle',
                          onclick: function () {
                            contrast_modifier = clamp(contrast_modifier - 0.1, 0.5, 1.5);
                          },
                        },
                        ''
                      ),
                      m(
                        'div',
                        {
                          class: 'd-pad',
                        },
                        [
                          m(
                            'div',
                            {
                              class: 'd-pad-shadow',
                            },
                            ''
                          ),
                          m(
                            'div',
                            {
                              class: 'd-pad-3d',
                            },
                            ''
                          ),
                          m(
                            'div',
                            {
                              class: 'd-pad-center',
                            },

                            m(
                              'div',
                              {
                                class: 'd-pad-indent',
                                onclick: function () {
                                  if (palettes.indexOf(active_palette) === 0) {
                                    active_palette = palettes[1];
                                  } else {
                                    active_palette = palettes[0];
                                  }
                                },
                              },
                              ''
                            )
                          ),
                        ]
                      ),
                    ]
                  ),
                  m(
                    'div',
                    {
                      class: 'a-and-b-wrapper',
                    },
                    [
                      m(
                        'button',
                        {
                          'aria-label': 'Take Picture',
                          class: 'a-button mdi mdi-camera-iris',
                          onclick: function () {
                            preview_context.drawImage(camera_canvas, 0, 0);
                            preview_active = true;
                          },
                        },
                        ''
                      ),
                      m(
                        'button',
                        {
                          'aria-label': 'Switch Camera',
                          class: 'b-button mdi mdi-camera-switch',
                          onclick: function () {
                            // var old_facing_mode = facing_mode;
                            facing_mode = facing_modes[facing_modes.indexOf(facing_mode) === 0 ? 1 : 0];
                            // if (facing_mode !== old_facing_mode) {
                            //   camera_context.translate(camera_width, 0);
                            //   camera_context.scale(-1, 1);
                            // }
                            initializeCamera();
                          },
                        },
                        ''
                      ),
                    ]
                  ),
                  m(
                    'div',
                    {
                      class: 'meta-wrapper',
                    },
                    m(
                      'a',
                      {
                        href: 'https://github.com/trashbytes/pocket-camera',
                        target: '_blank',
                      },
                      'about'
                    )
                  ),
                ]
              ),
              m(
                'div',
                {
                  class: 'fps-counter',
                },
                true_fps
              ),
            ]
          );
    },
  };
}

m.route(
  root,
  Object.keys(routes)[0],
  (function () {
    var mroutes = {};
    Object.keys(routes).map(function (route) {
      mroutes[route] = {
        onmatch: function (args, requestedPath, route) {
          // window.location.replace(m.route.prefix + requestedPath);
          return Scaffold;
        },
      };
    });
    return mroutes;
  })()
);

function lifecycle() {
  if ((isMobile() || isCompatibleDesktop()) && window.innerWidth >= 320) {
    not_supported = false;
    if (document[hidden]) {
      standby = true;
      stopStream();
    } else {
      if (device_orientation === 'portrait') {
        not_supported = false;
        padding = parseInt(document.body.clientWidth * 0.1);
        if (padding > 60) {
          padding = 60;
        }
        root.style.setProperty('--padding', padding + 'px');
        screen_width = document.body.clientWidth - padding * 2;
        screen_height = (screen_width * camera_height) / camera_width;
        controls_width = screen_width;
        controls_height = document.body.clientHeight - screen_height - padding * 3;
        standby = false;
      } else {
        not_supported = true;
        stopStream();
      }
    }
  } else {
    not_supported = true;
    stopStream();
  }
  m.redraw();
}

var debouncedLifecycle = debounce(lifecycle, 100);
window.addEventListener('resize', function (event) {
  var new_device_orientation = getDeviceOrientation();
  if (new_device_orientation !== device_orientation) {
    device_orientation = new_device_orientation;
    lifecycle();
  } else {
    device_orientation = new_device_orientation;
    debouncedLifecycle();
  }
});
document.addEventListener(visibility_change, function (event) {
  debouncedLifecycle();
});
lifecycle();
