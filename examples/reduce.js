var iota = require('iota-array')
var ndarray = require('ndarray');
var show = require('ndarray-show');
var regl = require('regl')({
  extensions: ['oes_texture_float'],
  onDone: require('fail-nicely')(run)
});


function run (regl) {
  var reduce = require('../')(regl).reduce({
    scan: true,
    reduce: {
      frag: `
        precision mediump float;
        varying vec2 sumLocation;
        varying vec2 prefixLocation;
        uniform sampler2D src;

        void main () {
          gl_FragColor = texture2D(src, prefixLocation) + texture2D(src, sumLocation);
        }
      `
    },
    identity: {
      frag: `
        precision mediump float;
        varying vec2 sumLocation;
        uniform sampler2D src;
        void main () {
          gl_FragColor = texture2D(src, sumLocation);
        }
      `,
    }
  })

  var fbos = new Array(2).fill(0).map(() =>
    regl.framebuffer({
      depthStencil: false,
      color: regl.texture({
        width: 16,
        height: 1,
        data: iota(16).map(i => [i, 0, 0, 0]),
        type: 'float',
        format: 'rgba',
      })
    })
  )

  reduce(fbos)

  fbos[1].use(() => {
    result = ndarray(regl.read()).step(4);

    console.log('result:', show(result));
  });
}
