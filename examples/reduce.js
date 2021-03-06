var iota = require('iota-array')
var ndarray = require('ndarray');
var show = require('ndarray-show');
var squeeze = require('ndarray-squeeze');
var regl = require('regl')({
  extensions: ['oes_texture_float'],
  onDone: require('fail-nicely')(run)
});


function run (regl) {
  var ops = require('../')(regl)

  var fbos = new Array(2).fill(0).map(() =>
    regl.framebuffer({
      depthStencil: false,
      color: regl.texture({
        width: 4,
        height: 1,
        data: iota(4).map(i => [4 * i, 4 * i + 1, 4 * i + 2, 4 * i + 3]),
        type: 'float',
        format: 'rgba',
      })
    })
  )

  // Prefix-sum each texel so that we can pretend we're really dealing
  // with an unrolled 1-d array of data:
  var preaccum = ops.map({
    frag: `
      precision mediump float;
      varying vec2 uv;
      uniform sampler2D src;
      void main () {
        vec4 sum = texture2D(src, uv);
        sum.w += sum.z;
        sum.zw += sum.y;
        sum.yzw += sum.x;
        gl_FragColor = sum;
      }
    `,
    framebuffer: regl.prop('dst')
  })


  // Prefix-sum across texels by add
  var prefixSum = ops.scan({
    reduce: {
      frag: `
        precision mediump float;
        varying vec2 sumLocation;
        varying vec2 prefixLocation;
        uniform sampler2D src;

        void main () {
          vec4 prefix = texture2D(src, prefixLocation);
          vec4 sum = texture2D(src, sumLocation);

          gl_FragColor = sum + prefix.w;
        }
      `
    },
  })

  var state = {src: fbos[0], dst: fbos[1]}

  state.src.use(() => console.log('input:\n' + show(ndarray(regl.read(), [16]))));

  preaccum(state);
  ops.swap(state)
  prefixSum(state)

  state.dst.use(() => console.log('output:\n' + show(ndarray(regl.read(), [16]))));
}
