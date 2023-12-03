// painting-2.js
global.wasm_url = '/utils/opencv3.4.16.wasm.br'
// opencv_exec.js会从global.wasm_url获取wasm路径
let cv = require('../../utils/opencv_exec.js');
Page({

  /**
   * 页面的初始数据
   */
  data: {
    hasChoosedImg: false,
    canvasWidth: 0,
    canvasHeight: 0,
    canvasHeightLen: 0,
    windowHeight: 0,
    storeSrc: [],
    prevPosition: [0, 0],

    btnInfo: [{
        type: 'width',
        background: 'url("https://s1.ax1x.com/2022/05/25/XkS46f.png") white no-repeat; background-size: 30px 30px;'
      },
      {
        type: 'color',
        background: 'url("https://s1.ax1x.com/2022/05/25/XkSqts.png") white no-repeat; background-size: 24px 24px;background-position: 3px 3px;'
      },
      {
        type: 'back',
        background: 'url("https://s1.ax1x.com/2022/05/25/XkAkZV.png") white no-repeat; background-size: 38px 38px;background-position: -4px -4px;'
      },
      // {
      //   type: 'save',
      //   background: 'url("https://s1.ax1x.com/2022/05/25/Xkpj5d.png") white no-repeat; background-size: 20px 20px;background-position: 5px 5px;'
      // },
      {
        type: 'inpaint',
        background: 'url("https://s1.ax1x.com/2022/05/25/Xkpj5d.png") white no-repeat; background-size: 20px 20px;background-position: 5px 5px;'
      }
    ],
    width: false,
    color: false,
    r: 255,
    g: 0,
    b: 0,
    w: 20,
  },
  // 获取图像数据和调整图像大小
  getImageData(image, offscreenCanvas) {
    var _that = this
    // const ctx = wx.createCanvasContext(canvasId);

    // var canvasWidth = image.width;
    // let maxCanvasWidth = this.data.canvasWidth
    // if (canvasWidth > maxCanvasWidth) {
    //   canvasWidth = maxCanvasWidth;
    // }
    // // canvas Height
    // var canvasHeight = Math.floor(canvasWidth * (image.height / image.width));
    // // 离屏画布的宽度和高度不能小于图像的
    var canvasWidth = _that.data.canvasWidth;
    var canvasHeight = _that.data.canvasHeight;
    offscreenCanvas.width = canvasWidth;
    offscreenCanvas.height = canvasHeight;
    // draw image on canvas
    var ctx = offscreenCanvas.getContext('2d')
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
    // get image data from canvas
    var imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

    return imgData
  },
  // 创建图像对象
  async createImageElement(imgUrl) {
    var _that = this
    // 创建2d类型的离屏画布（需要微信基础库2.16.1以上）
    var offscreenCanvas = wx.createOffscreenCanvas({
      type: '2d'
    });
    const image = offscreenCanvas.createImage();
    await new Promise(function (resolve, reject) {
      image.onload = resolve
      image.onerror = reject
      image.src = imgUrl
    })
    const imageData = _that.getImageData(image, offscreenCanvas)
    return imageData
  },
  mergeMarkToImg(mask, img) {
    const temp = new Float32Array(img.length)
    const maskTemp = new Float32Array(mask.length)
    const C = 3
    const H = 512
    const W = 512

    for (let c = 0; c < C; c++) {
      for (let h = 0; h < H; h++) {
        for (let w = 0; w < W; w++) {
          temp[c * H * W + h * W + w] =
            img[c * H * W + h * W + w] * mask[h * W + w]
        }
      }
    }

    for (let h = 0; h < H; h++) {
      for (let w = 0; w < W; w++) {
        maskTemp[h * W + w] = mask[h * W + w] - 0.5
      }
    }

    const res = new Float32Array(mask.length + img.length)
    const maskLength = mask.length

    for (let c = 0; c < maskLength; c++) {
      res[c] = maskTemp[c]
    }

    const imgLength = img.length

    for (let c = 0; c < imgLength; c++) {
      res[maskLength + c] = temp[c]
    }

    return res
  },

  async getImgData() {
    const imageData = await this.createImageElement(`${wx.env.USER_DATA_PATH}/pic.png`)
    return imageData
  },
  processImage(imageData) {
    let size = 512
    const src = cv.imread(imageData)
    const src_rgb = new cv.Mat()
    const dst = new cv.Mat()
    const dsize = new cv.Size(size, size) // 新尺寸
    // 将图像从RGBA转换为RGB
    cv.cvtColor(src, src_rgb, cv.COLOR_RGBA2RGB)
    // 调整图像大小
    cv.resize(src_rgb, dst, dsize, 0, 0, cv.INTER_CUBIC)

    let img = dst
    const channels = new cv.MatVector()
    cv.split(img, channels) // 分割通道

    const C = channels.size() // 通道数
    const H = img.rows // 图像高度
    const W = img.cols // 图像宽度

    const chwArray = new Float32Array(C * H * W) // 创建新的数组来存储转换后的数据

    for (let c = 0; c < C; c++) {
      const channelData = channels.get(c).data // 获取单个通道的数据
      for (let h = 0; h < H; h++) {
        for (let w = 0; w < W; w++) {
          chwArray[c * H * W + h * W + w] = (channelData[h * W + w] * 2) / 255 - 1
          // chwArray[c * H * W + h * W + w] = channelData[h * W + w]
        }
      }
    }
    return chwArray
  },
  mergeImg(outImgMat, originalImg, originalMark) {

    const originalMat = cv.imread(originalImg)
    const originalMarkMat = cv.imread(originalMark)
    const H = originalImg.height
    const W = originalImg.width
    const C = 4
    const temp = []

    for (let i = 0; i < originalMarkMat.data.length; i++) {
      const realMark = originalMarkMat.data[i] === 255 ? 0 : 1
      const value = outImgMat.data[i]
      temp[i] = originalMat.data[i] * realMark + value * (1 - realMark)
    }
    originalMat.delete()
    originalMarkMat.delete()

    return new Uint8ClampedArray(temp)
  },
  postProcess(floatData, width, height) {
    const chwToHwcData = []
    const size = width * height

    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        for (let c = 0; c < 3; c++) {
          // RGB通道
          const chwIndex = c * size + h * width + w
          const pixelVal = floatData[chwIndex] * 0.5 + 0.5
          let newPiex = pixelVal
          if (pixelVal > 1) {
            newPiex = 1
          } else if (pixelVal < 0) {
            newPiex = 0
          }
          chwToHwcData.push(newPiex * 255) // 归一化反转
        }
        chwToHwcData.push(255) // Alpha通道
      }
    }
    return chwToHwcData
  },
  getMaskData() {
    let that = this
    // to render mask and megre to input  
    var maskCanvas = wx.createOffscreenCanvas({
      type: '2d'
    });
    maskCanvas.width = that.data.canvasWidth;
    maskCanvas.height = that.data.canvasHeight
    const ctx = maskCanvas.getContext('2d')
    // let ctx = wx.createCanvasContext('myCanvas');
    ctx.clearRect(0, 0, that.data.canvasWidth, that.data.canvasHeight)
    ctx.strokeStyle = 'white'
    ctx.lineWidth = that.data.w
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    for (let index in that.data.points) {
      let point = that.data.points[index]
      ctx.moveTo(point[0], point[1]);
      ctx.lineTo(point[2], point[3]);
      ctx.stroke();
      // ctx.draw(true);
    }
    var imgData = ctx.getImageData(0, 0, that.data.canvasWidth, that.data.canvasHeight);
    return imgData
  },
  processMark(imgData) {
    const src = cv.imread(imgData)
    const src_grey = new cv.Mat()
    const dst = new cv.Mat()
    const dsize = new cv.Size(512, 512) // 新尺寸

    // 将图像从RGBA转换为二值化
    cv.cvtColor(src, src_grey, cv.COLOR_BGR2GRAY)

    // 调整图像大小
    cv.resize(src_grey, dst, dsize, 0, 0, cv.INTER_NEAREST)

    let img = dst
    const channels = new cv.MatVector()
    cv.split(img, channels) // 分割通道

    const C = 1 // 通道数
    const H = img.rows // 图像高度
    const W = img.cols // 图像宽度

    const chwArray = new Float32Array(C * H * W) // 创建新的数组来存储转换后的数据

    for (let c = 0; c < C; c++) {
      const channelData = channels.get(0).data // 获取单个通道的数据
      for (let h = 0; h < H; h++) {
        for (let w = 0; w < W; w++) {
          chwArray[c * H * W + h * W + w] = channelData[h * W + w] === 255 ? 0 : 1
        }
      }
    }
    return chwArray
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let that = this;

    const modelPath = `${wx.env.USER_DATA_PATH}/migan.onnx`;
    const imagePATH = `${wx.env.USER_DATA_PATH}/pic.png`;
    wx.getFileSystemManager().access({
      path: modelPath,
      success: (res) => {
        that.session = wx.createInferenceSession({
          model: modelPath,
          /* 0: Lowest  precision e.g., LS16 + A16 + Winograd A16 + approx. math
             1: Lower   precision e.g., LS16 + A16 + Winograd off + approx. math
             2: Modest  precision e.g., LS16 + A32 + Winograd A32 + approx. math
             3: Higher  precision e.g., LS32 + A32 + Winograd A32 + approx. math
             4: Highest precision e.g., LS32 + A32 + Winograd A32 + precise math
  
             Higher precision always require longer time to run session
          */
          precisionLevel: 4,
          allowNPU: false, // wheather use NPU for inference, only useful for IOS
          allowQuantize: true, // wheather generate quantize model
        });

        // 监听error事件
        that.session.onError((error) => {
          console.error(error);
        });
        that.session.onLoad(() => {
          that.ready = true;
          console.log("load ok");
        });
      },
      fail: (res) => {
        console.log(modelPath)
        wx.downloadFile({
          url: "https://huggingface.co/lxfater/inpaint-web/resolve/main/migan.onnx",
          success(res) {
            if (res.statusCode === 200) {
              if (res.totalBytesExpectedToWrite === res.totalBytesWritten) {
                wx.playVoice({
                  filePath: res.tempFilePath
                })
                wx.getFileSystemManager().saveFile({
                  tempFilePath: res.tempFilePath,
                  filePath: modelPath,
                  success: (res) => { // 注册回调函数
                    console.log(res)

                    const modelPath = res.savedFilePath;
                    console.log("save onnx model at path: " + modelPath)
                    that.session = wx.createInferenceSession({
                      model: modelPath,
                      /* 0: Lowest  precision e.g., LS16 + A16 + Winograd A16 + approx. math
                         1: Lower   precision e.g., LS16 + A16 + Winograd off + approx. math
                         2: Modest  precision e.g., LS16 + A32 + Winograd A32 + approx. math
                         3: Higher  precision e.g., LS32 + A32 + Winograd A32 + approx. math
                         4: Highest precision e.g., LS32 + A32 + Winograd A32 + precise math
              
                         Higher precision always require longer time to run session
                      */
                      precisionLevel: 4,
                      allowNPU: false, // wheather use NPU for inference, only useful for IOS
                      allowQuantize: true, // wheather generate quantize model
                    });

                    // 监听error事件
                    that.session.onError((error) => {
                      console.error(error);
                    });
                    that.session.onLoad(() => {
                      that.ready = true;
                      console.log("load ok");
                    });

                  },
                  fail(res) {
                    console.error(res)
                  }
                })
                console.log(res.tempFilePath)
              }

            }
          },
          fail: function (res) {

            wx.chooseMessageFile({
              count: 1,
              type: 'file',
              success: function (res) {

                console.log(res)
                wx.getFileSystemManager().saveFile({
                  tempFilePath: res.tempFiles[0].path,
                  filePath: modelPath,
                  success: (res) => { // 注册回调函数
                    console.log(res)
                    that.session = wx.createInferenceSession({
                      model: modelPath,
                      /* 0: Lowest  precision e.g., LS16 + A16 + Winograd A16 + approx. math
                         1: Lower   precision e.g., LS16 + A16 + Winograd off + approx. math
                         2: Modest  precision e.g., LS16 + A32 + Winograd A32 + approx. math
                         3: Higher  precision e.g., LS32 + A32 + Winograd A32 + approx. math
                         4: Highest precision e.g., LS32 + A32 + Winograd A32 + precise math
              
                         Higher precision always require longer time to run session
                      */
                      precisionLevel: 4,
                      allowNPU: false, // wheather use NPU for inference, only useful for IOS
                      allowQuantize: true, // wheather generate quantize model
                    });

                    // 监听error事件
                    that.session.onError((error) => {
                      console.error(error);
                    });
                    that.session.onLoad(() => {
                      that.ready = true;
                      console.log("load ok");
                    });
                  },
                  fail(res) {
                    console.error(res)
                    return
                  }
                })


              },
              fail: function (res) {
                console.log(res);
              }
            })
          }
        }).onProgressUpdate((res) => {
          console.log(res.progress)
          console.log(res.totalBytesWritten)
          console.log(res.totalBytesExpectedToWrite)
        })
      }
    })




    wx.getSystemInfo({
      success: function (res) {
        console.log(res);
        that.setData({
          canvasWidth: res.windowWidth,
          canvasHeight: res.windowHeight - 50,
          windowHeight: res.windowHeight
        })
      },
    })

    wx.getFileSystemManager().access({
      path: imagePATH,
      success: (res) => {
        console.log(res)
        that.setData({
          hasChoosedImg: true,
        })
        wx.getImageInfo({
          src: imagePATH,
          success: function (res) {
            let [height, width] = [Math.floor(that.data.canvasWidth / res.width * res.height), that.data.canvasWidth];
            if (height > that.data.windowHeight - 50) {
              height = that.data.windowHeight - 50;
              width = Math.floor(height / res.height * res.width);
            }
            that.setData({
              canvasHeight: height,
              canvasWidth: width
            });
            setTimeout(() => {
              let ctx = wx.createCanvasContext('myCanvas');
              ctx.drawImage(res.path, 0, 0, that.data.canvasWidth, that.data.canvasHeight);
              ctx.draw();

              wx.canvasGetImageData({
                canvasId: 'myCanvas',
                x: 0,
                y: 0,
                width: that.data.canvasWidth,
                height: that.data.canvasHeight,
                success(res) {
                  console.log(res.width) // 100
                  console.log(res.height) // 100
                  console.log(res.data instanceof Uint8ClampedArray) // true
                  console.log(res.data.length) // 100 * 100 * 4
                  // that.setData({
                  //   imgData: res.data,
                  // })
                }
              })
            }, 500)

          }
        })
      },
      fail: (res) => {
        wx.chooseImage({
          success: function (res) {
            that.setData({
              hasChoosedImg: true,
            })
            console.log(res)
            const tmpPicPath = res.tempFiles[0].path
            wx.getFileSystemManager().saveFile({
              tempFilePath: tmpPicPath,
              filePath: imagePATH,
              success: (res) => { // 注册回调函数
                console.log(res)
                wx.getImageInfo({
                  src: imagePATH,
                  success: function (res) {
                    let [height, width] = [Math.floor(that.data.canvasWidth / res.width * res.height), that.data.canvasWidth];
                    if (height > that.data.windowHeight - 50) {
                      height = that.data.windowHeight - 50;
                      width = Math.floor(height / res.height * res.width);
                    }
                    that.setData({
                      canvasHeight: height,
                      canvasWidth: width
                    });
                    setTimeout(() => {
                      let ctx = wx.createCanvasContext('myCanvas');
                      ctx.drawImage(res.path, 0, 0, that.data.canvasWidth, that.data.canvasHeight);
                      ctx.draw();

                      wx.canvasGetImageData({
                        canvasId: 'myCanvas',
                        x: 0,
                        y: 0,
                        width: that.data.canvasWidth,
                        height: that.data.canvasHeight,
                        success(res) {
                          console.log(res.width) // 100
                          console.log(res.height) // 100
                          console.log(res.data instanceof Uint8ClampedArray) // true
                          console.log(res.data.length) // 100 * 100 * 4
                          // that.setData({
                          //   imgData: res.data,
                          // })
                        }
                      })
                    }, 500)

                  }
                })
              },
              fail(res) {
                console.error(res)
                return
              }
            })


          },
          fail: function (res) {
            console.log(res);
          }
        })
      }
    })



  },

  async tapBtn(e) {
    let btnType = e.target.dataset.type;

    if (btnType == 'width') {
      this.setData({
        width: !this.data.width,
        color: false,
        canvasHeightLen: (!this.data.width) ? Math.min(this.data.canvasHeight, this.data.windowHeight - this.data.w - 130) : 0,
      })
    } else if (btnType == 'color') {
      this.setData({
        width: false,
        color: !this.data.color,
        canvasHeightLen: (!this.data.color) ? Math.min(this.data.canvasHeight, this.data.windowHeight - this.data.w - 205) : 0,
      })
    } else if (btnType == 'back') {
      this.setData({
        width: false,
        color: false,
        canvasHeightLen: 0
      })
      this.backLast();
    } else if (btnType == 'save') {
      this.setData({
        width: false,
        color: false,
        canvasHeightLen: 0
      })
      wx.canvasToTempFilePath({
        canvasId: 'myCanvas',
        success: function (res) {
          wx.saveImageToPhotosAlbum({
            filePath: res.tempFilePath,
            success: function (r) {
              console.log(r)
            },
            fail(error) {
              console.log("图片保存失败!");
              wx.showToast({
                title: '保存失败',
                icon: 'error'
              })
              //没开启保存权限
              if (error.errMsg === "saveImageToPhotosAlbum:fail auth deny") {
                // 获取保存权限
                wx.openSetting({
                  success(settingdata) {
                    console.log(settingdata)
                    if (settingdata.authSetting['scope.writePhotosAlbum']) {
                      console.log('获取权限成功，给出再次点击图片保存到相册的提示。')
                    } else {
                      console.log('获取权限失败，给出不给权限就无法正常使用的提示')
                    }
                  }
                })
              }
            }
          })
        }
      })
    } else if (btnType == 'inpaint') {
      let that = this
      console.log(wx.env.USER_DATA_PATH)
      // if(!this.data.points){
      //   return
      // }
      // console.log(this.data.points)

      let imgData = await that.getImgData()
      let maskData = that.getMaskData()
      let imgArray = that.processImage(imgData)
      let mark = that.processMark(maskData)
      const input = that.mergeMarkToImg(mark, imgArray)

      const xinput = {
        shape: [1, 4, 512, 512], // Input data shape in NCHW
        data: input.buffer,
        type: 'float32', // Input data type
      };

      console.log(xinput)
      var log = wx.getRealtimeLogManager ? wx.getRealtimeLogManager() : null
      log.error(xinput)
      that.session.run({
        input: xinput
      }).then(res => {
        // console.log(res.output)

        let output = new Float32Array(res.output.data)
        const chwToHwcData = that.postProcess(output, 512, 512)
        var rgb = new Uint8ClampedArray(chwToHwcData)
        const imageData = {
          data: rgb,
          width: 512,
          height: 512
        }


        // let output = new Float32Array(res.output.data)
        // const hwSize = 512 * 512

        // var finalout = new Uint8ClampedArray(4 * hwSize);

        // // fill the alpha channel
        // finalout.fill(255);

        // // convert from nchw to nhwc
        // let modelChannel =3
        // let idx = 0;
        // for (var c = 0; c < modelChannel; ++c) {
        //   for (var hw = 0; hw < hwSize; ++hw) {
        //     var dstIdx = hw * 4 + c;
        //     finalout[dstIdx] = Math.max(0, Math.min(Math.round(output[idx]), 255));
        //     idx++;
        //   }
        // }


        // const imageData = new ImageData(
        //   new Uint8ClampedArray(chwToHwcData),
        //   size,
        //   size
        // )
        const dst = new cv.Mat()
        const dsize = new cv.Size(that.data.canvasWidth, that.data.canvasHeight)
        const outImgMat = cv.matFromImageData(imageData)

        cv.resize(outImgMat, dst, dsize, 0, 0, cv.INTER_CUBIC)

        const result = that.mergeImg(dst, imgData, maskData)
        dst.delete()
        // console.log("chwToHwcData")
        // wx.canvasPutImageData({
        //   canvasId: 'myCanvas',
        //   data: rgb,
        //   height: 512,
        //   width: 512,
        //   x: 0,
        //   y: 0,
        // }).then((res) => {
        //   console.log(res)
        // }).catch((err) => {
        //   console.log(err)
        // })

        wx.canvasPutImageData({
          canvasId: 'myCanvas',
          data: result,
          height: that.data.canvasHeight,
          width: that.data.canvasWidth,
          x: 0,
          y: 0,
        }).then((res) => {
          console.log(res)
        }).catch((err) => {
          console.log(err)
        })
      }).catch((err) => {
        console.log(err)
      })

      // that.session.run({
      //   input: {
      //     type: 'float32',
      //     data: new Float32Array(1 * 4 * 512 * 512).buffer,
      //     shape: [1, 4, 512, 512] // NCHW 顺序
      //   }
      // }).then(res => {
      //   console.log('randmon')
      //   console.log(res.output)
      //   let output = new Float32Array(res.output)
      //   const hwSize = 512 * 512;

      //   var finalout = new Uint8ClampedArray(4 * hwSize);

      //   // fill the alpha channel
      //   finalout.fill(255);

      //   // convert from nchw to nhwc
      //   idx = 0;
      //   for (var c = 0; c < modelChannel; ++c) {
      //     for (var hw = 0; hw < hwSize; ++hw) {
      //       var dstIdx = hw * 4 + c;
      //       finalout[dstIdx] = Math.max(0, Math.min(Math.round(output[idx]), 255));
      //       idx++;
      //     }
      //   }


      //   wx.canvasPutImageData({
      //     canvasId: 'myCanvas',
      //     data: finalout,
      //     height: 512,
      //     width: 512,
      //     x: 0,
      //     y: 0,
      //   }).then((res) => {
      //     console.log(res)
      //   })
      // })
    }
  },

  touchStart: function (e) {

    this.setData({
      prevPosition: [e.touches[0].x, e.touches[0].y],
      points: [],
      width: false,
      color: false,
      canvasHeightLen: 0
    })

    let that = this;

    wx.canvasToTempFilePath({
      canvasId: 'myCanvas',
      width: that.data.canvasWidth,
      height: that.data.canvasHeight,
      destHeight: that.data.canvasHeight,
      destWidth: that.data.canvasWidth,
      success: function (res) {
        let src = that.data.storeSrc;
        src.push(res.tempFilePath);

        that.setData({
          storeSrc: src
        })
      }
    })
  },

  touchMove: function (e) {
    let ctx = wx.createCanvasContext('myCanvas');

    ctx.setStrokeStyle("rgb(" + this.data.r + ', ' + this.data.g + ', ' + this.data.b + ')');
    ctx.setLineWidth(this.data.w);
    ctx.setLineCap('round');
    ctx.setLineJoin('round');
    ctx.moveTo(this.data.prevPosition[0], this.data.prevPosition[1]);
    ctx.lineTo(e.touches[0].x, e.touches[0].y);
    ctx.stroke();
    ctx.draw(true);
    this.data.points.push([this.data.prevPosition[0], this.data.prevPosition[1], e.touches[0].x, e.touches[0].y])
    this.setData({
      prevPosition: [e.touches[0].x, e.touches[0].y],
      points: this.data.points
    })
  },

  backLast: function () {
    let [ctx, storeSrc] = [wx.createCanvasContext('myCanvas'), this.data.storeSrc];

    if (storeSrc.length > 0) {
      let src = storeSrc.pop();

      ctx.drawImage(src, 0, 0);
      ctx.draw();
    }
  },

  changeColor: function (e) {
    if (e.target.dataset.color == 'r') {
      this.setData({
        r: e.detail.value
      })
    } else if (e.target.dataset.color == 'g') {
      this.setData({
        g: e.detail.value
      })
    } else if (e.target.dataset.color == 'b') {
      this.setData({
        b: e.detail.value
      })
    }
  },

  changeWidth: function (e) {
    let w = this.data.w
    this.setData({
      w: e.detail.value,
      canvasHeightLen: this.data.canvasHeightLen + w - e.detail.value
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  }
})