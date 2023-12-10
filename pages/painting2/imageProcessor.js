global.wasm_url = '/utils/opencv3.4.16.wasm.br'
// opencv_exec.js会从global.wasm_url获取wasm路径
let cv = require('../../utils/opencv_exec.js');

// 获取图像数据
async function loadImage(imgUrl) {
    // 创建2d类型的离屏画布（需要微信基础库2.16.1以上）
    var offscreenCanvas = wx.createOffscreenCanvas({type: '2d'});
    const image = offscreenCanvas.createImage();
    await new Promise(function (resolve, reject) {
      image.onload = resolve
      image.src = imgUrl
    });

    // draw image on canvas
    var ctx = offscreenCanvas.getContext('2d');
    ctx.drawImage(image, 0, 0, image.width, image.height);

    // get image data from canvas
    var imgData = ctx.getImageData(0, 0, image.width, image.height);

    return {
      imgData: imgData,
      width: image.width,
      height: image.height
    };
}


function imgProcess(img) {
  const channels = new cv.MatVector();
  cv.split(img, channels);

  const C = channels.size();
  const H = img.rows;
  const W = img.cols;

  // Float32Array ?
  const chwArray = new Uint8Array(C * H * W);

  for (let c = 0; c < C; c++) {
    const channelData = channels.get(c).data;
    for (let h = 0; h < H; h++) {
      for (let w = 0; w < W; w++) {
        chwArray[c * H * W + h * W + w] = channelData[h * W + w];
      }
    }
  }

  channels.delete();
  return chwArray;
}

function maskProcess(img) {
  const channels = new cv.MatVector();
  cv.split(img, channels);

  const C = 1;
  const H = img.rows;
  const W = img.cols;

  const chwArray = new Uint8Array(C * H * W);

  for (let c = 0; c < C; c++) {
    const channelData = channels.get(0).data;
    for (let h = 0; h < H; h++) {
      for (let w = 0; w < W; w++) {
        chwArray[c * H * W + h * W + w] = (channelData[h * W + w] !== 255) * 255;
      }
    }
  }

  channels.delete();
  return chwArray;
}

async function processImage(img) {
  return new Promise((resolve, reject) => {
    try {
      const src = cv.imread(img);
      const src_rgb = new cv.Mat();
      cv.cvtColor(src, src_rgb, cv.COLOR_RGBA2RGB);
      resolve(imgProcess(src_rgb));
      src.delete();
      src_rgb.delete();
    } catch (error) {
      reject(error);
    }
  });
}

async function processMask(img, height, width) {
  return new Promise((resolve, reject) => {
    try {
      const src = cv.imread(img);
      const src_grey = new cv.Mat();
      const dst = new cv.Mat()
      const dsize = new cv.Size(width, height) // 新尺寸

      cv.cvtColor(src, src_grey, cv.COLOR_BGR2GRAY);

      // 调整图像大小
      cv.resize(src_grey, dst, dsize, 0, 0, cv.INTER_NEAREST)

      resolve(maskProcess(dst));

      src.delete();
    } catch (error) {
      reject(error);
    }
  });
}

function postProcess(uint8Data, width, height) {
  const chwToHwcData = [];
  const size = width * height;

  for (let h = 0; h < height; h++) {
    for (let w = 0; w < width; w++) {
      for (let c = 0; c < 3; c++) {
        const chwIndex = c * size + h * width + w;
        const pixelVal = uint8Data[chwIndex];
        let newPixel = pixelVal;

        if (pixelVal > 255) {
          newPixel = 255;
        } else if (pixelVal < 0) {
          newPixel = 0;
        }

        chwToHwcData.push(newPixel);
      }

      chwToHwcData.push(255);
    }
  }

  return chwToHwcData;
}

function imageDataToDataURL(imageData) {
  const canvas = wx.createCanvasContext('tempCanvas'); // 替换为实际的 canvas ID
  canvas.width = imageData.width;
  canvas.height = imageData.height;

  // 绘制 imageData 到 canvas
  const data = new Uint8ClampedArray(imageData.data);
  const clampedImageData = new ImageData(data, imageData.width, imageData.height);
  canvas.putImageData(clampedImageData, 0, 0);

  // 导出为数据 URL
  return new Promise((resolve) => {
    canvas.toTempFilePath({
      success: (res) => {
        resolve(res.tempFilePath);
      },
    });
  });
}


export async function inPaint(imageFile, maskFile, model) {
  try {
    console.time('preProcess');

    const [originalImg, originalMask] = await Promise.all([
      loadImage(imageFile),
      loadImage(maskFile),
    ]);

    const [img, mask] = await Promise.all([
      processImage(originalImg.imgData),
      processMask(originalMask.imgData, originalImg.height, originalImg.width),
    ]);

    const imageInput = {
      shape: [1, 3, originalImg.height, originalImg.width],  // 输入形状 NCHW 值
      data: img.buffer,    // 为一个 ArrayBuffer
      type: 'uint8',          // 输入数据类型
    };

    const maskInput = {
      shape: [1, 1, originalImg.height, originalImg.width],  // 输入形状 NCHW 值
      data: mask.buffer,    // 为一个 ArrayBuffer
      type: 'uint8',          // 输入数据类型
      };
    console.timeEnd('preProcess');
    console.time('run');

    const results = await model.session.run({
      // 这里 "input" 必须与 ONNX 模型文件中的模型输入名保持严格一致
      "image": imageInput,
      "mask": maskInput,
    })
    console.timeEnd('run');
    console.time('postProcess');

    const outsTensor = results[model.outputNames[0]];
    const chwToHwcData = postProcess(outsTensor.data, originalImg.width, originalImg.height);
    const imageData = new ImageData(
      new Uint8ClampedArray(chwToHwcData),
      originalImg.width,
      originalImg.height
    );

    console.log(imageData, 'imageData');

    const result = await imageDataToDataURL(imageData);
    console.timeEnd('postProcess');

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
