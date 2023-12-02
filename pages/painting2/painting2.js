// painting-2.js
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
    r: 33,
    g: 33,
    b: 33,
    w: 2,
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
            let [height, width] = [that.data.canvasWidth / res.width * res.height, that.data.canvasWidth];
            if (height > that.data.windowHeight - 50) {
              height = that.data.windowHeight - 50;
              width = height / res.height * res.width;
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
            wx.getFileSystemManager().saveFile({
              tempFilePath: res.tempFilePaths[0],
              filePath: imagePATH,
              success: (res) => { // 注册回调函数
                console.log(res)

              },
              fail(res) {
                console.error(res)
                return
              }
            })

            wx.getImageInfo({
              src: res.tempFilePaths[0],
              success: function (res) {
                let [height, width] = [that.data.canvasWidth / res.width * res.height, that.data.canvasWidth];
                if (height > that.data.windowHeight - 50) {
                  height = that.data.windowHeight - 50;
                  width = height / res.height * res.width;
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
          fail: function (res) {
            console.log(res);
          }
        })
      }
    })



  },

  tapBtn: function (e) {
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
      console.log(this.data.line)
      console.log(this.data.imgData)
      const uint8Data = new Uint8Array(this.imgData)
      // var floatData = new Float32Array(3 * this.data.canvasHeight * this.data.canvasWidth);
      // const modelChannel = 3
      // const imageWH = this.data.canvasHeight * this.data.canvasWidth;


      // var floatData = new Float32Array(3 * 512*512);
      var floatData = new Float32Array(4 * 512 * 512);
      const modelChannel = 3
      const imageWH = 512 * 512
      var idx = 0;
      for (var c = 0; c < modelChannel; ++c) {
        for (var wh = 0; wh < imageWH; ++wh) {
          var inputIdx = wh * 4 + c;
          floatData[idx] = uint8Data[inputIdx];
          idx++;
        }
      }

      //to render mask and megre to input  
      // floatData[idx] = 0.0;

      const xinput = {
        shape: [1, 4, 512, 512], // Input data shape in NCHW
        data: floatData.buffer,
        type: 'float32', // Input data type
      };
     
      console.log(xinput)

      that.session.run({
        input: xinput
      }).then(res => {
        console.log('no mask for now')
        console.log(res.output)
        let output = new Float32Array(res.output)
        const hwSize = 512 * 512;

        var finalout = new Uint8ClampedArray(4 * hwSize);

        // fill the alpha channel
        finalout.fill(255);

        // convert from nchw to nhwc
        idx = 0;
        for (var c = 0; c < modelChannel; ++c) {
          for (var hw = 0; hw < hwSize; ++hw) {
            var dstIdx = hw * 4 + c;
            finalout[dstIdx] = Math.max(0, Math.min(Math.round(output[idx]), 255));
            idx++;
          }
        }
        console.log("finalout")
        wx.canvasPutImageData({
          canvasId: 'myCanvas',
          data: finalout,
          height: 512,
          width: 512,
          x: 0,
          y: 0,
        }).then((res) => {
          console.log(res)
        })
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
      line: [
        [e.touches[0].x, e.touches[0].y]
      ],
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
    this.data.line.push([e.touches[0].x, e.touches[0].y])
    this.setData({
      prevPosition: [e.touches[0].x, e.touches[0].y],
      line: this.data.line
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