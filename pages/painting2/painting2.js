// painting-2.js
global.wasm_url = '/utils/opencv3.4.16.wasm.br'
// opencv_exec.js会从global.wasm_url获取wasm路径
import {
  Migan
} from './migan.js';
import * as imageProcessor from './imageProcessor';

let penType = 'drawPen';
Page({
  /**
   * 页面的初始数据
   */
  data: {
    scale: 1,
    imageList: [],
    showBars: false,
    selectSize: wx.getStorageSync('selectSize') || 20,
    selectColor: wx.getStorageSync('selectColor') || '#ff0000',
    colors: ["#ff0000", "#ffff00", "#00CC00"],
    canvasWidth: 0,
    canvasHeight: 0,
    windowHeight: 0,
    dpr: 1,
    migan: null
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    let that = this;
    wx.getSystemInfo({
      success: function (res) {
        that.setData({
          canvasWidth: res.windowWidth,
          windowWidth: res.windowWidth,
          canvasHeight: res.windowHeight - 100,
          windowHeight: res.windowHeight
        })
      },
    });
    const dpr = wx.getWindowInfo().pixelRatio
    this.setData({
      dpr: dpr,
      cover: options["cover"] || "../../images/paint2.jpg"
    });

    // Load the module
    wx.showLoading({
      title: '模型正在加载...'
    });
    const migan = new Migan();
    migan.load().then(() => {
      wx.hideLoading();
    }).catch(err => {
      console.log('模型加载报错：', err);
      wx.showToast({
        title: '模型加载失败，请重试',
        icon: 'none',
        duration: 2000,
      });

    });
    this.setData({
      migan: migan
    });

    //this.initCanvas();
  },
  // 页面卸载 把字号选择的颜色和透明度保存
  onUnload() {
    const This = this.data;
    penType = 'drawPen';
    wx.setStorageSync('selectSize', This.selectSize);
    wx.setStorageSync('selectColor', This.selectColor);
  },
  colorChange(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({
      selectColor: color
    })
    penType = 'drawPen';
  },
  sizeHandler(e) {
    const size = e.detail.value;
    this.setData({
      selectSize: size
    })
  },
  // 使用橡皮檫
  rubberHandler() {
    penType = 'clearPen';
    this.setData({
      selectColor: ""
    })
  },
  //初始化画布
  initCanvas() {
    const This = this.data;
    const query = wx.createSelectorQuery("#myCanvas");
    query.select('#myCanvas').fields({
      node: true,
      size: true,
      context: true
    }).exec(res => {
      const canvas = res[0].node;
      const context = canvas.getContext('2d');
      // 获取设备像素比
      const dpr = wx.getSystemInfoSync().pixelRatio;
      const width = res[0].width * dpr;
      const height = res[0].height * dpr;
      canvas.width = width;
      canvas.height = height;
      // 填充背景颜色
      context.fillStyle = "transparent";
      context.fillRect(0, 0, width, height);
      // 缩放
      context.scale(dpr, dpr);
      // 设置默认属性
      context.strokeStyle = This.selectColor;
      context.lineWidth = This.selectSize;
      this.setData({
        canvasElement: canvas,
        canvasContext: context,
      })
    })
  },
  // 开始
  startTouchClick(e) {
    var that = this;
    const x = e.touches[0].x;
    const y = e.touches[0].y;
    that.setData({
      oldPosition: {
        x: x,
        y: y
      },
    }, () => {
      that.setData({
        isDraw: true,
      })
    })
  },
  // 移动
  moveClick(e) {
    if (this.data.isDraw) {
      let positionItem = e.touches[0]
      if (this.data.canvasContext) {
        this.drawCanvas(positionItem, true)
      } else {
        this.initCanvas(() => {
          this.drawCanvas(positionItem, true)
        })
      }
    }
  },
  // 描绘canvas
  drawCanvas(position) {
    const ctx = this.data.canvasContext;
    const size = this.data.selectSize;
    const color = this.data.selectColor;
    const This = this.data;
    if (ctx) {
      ctx.beginPath();
      ctx.lineWidth = size;
      ctx.strokeStyle = color;
      ctx.lineCap = 'round';
      if (penType == 'clearPen') {
        const radius = size + 1;
        ctx.clearRect(position.x - (radius / 2), position.y - (radius / 2), radius, radius);
      } else {
        ctx.moveTo(This.oldPosition.x, This.oldPosition.y);
        ctx.lineTo(position.x, position.y);
        ctx.stroke()
      };
      ctx.closePath();
      this.setData({
        oldPosition: {
          x: position.x,
          y: position.y,
        }
      })
    }
  },
  //触摸结束
  endTouchClick(e) {
    this.setData({
      isDraw: false
    })
    this.saveImage();
  },
  //误触事件
  errorClick(e) {
    console.log("误触事件：", e);
  },
  // 是否展示 操作栏
  showBarsHandler() {
    this.setData({
      showBars: !this.data.showBars
    })
  },
  hideBarsHandler() {
    this.setData({
      showBars: false
    })
  },
  // 回退一步 || 重绘
  restore() {
    // 实际上的回退就是取存储的最后一张图片 渲染出来
    // 所以会有抖动 暂未想到其他方案解决
    const ctx = this.data.canvasContext;
    const canvas = this.data.canvasElement;
    const dpr = wx.getSystemInfoSync().pixelRatio;
    let imgs = this.data.imageList;
    if (!imgs || imgs.length == 0) return false;
    if (imgs.length == 1) return this.clearRect();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // -2 是因为当前的也储存了
    const cover = imgs[imgs.length - 2];
    imgs.splice(imgs.length - 1, 1);
    let bg = canvas.createImage();
    bg.src = cover;
    bg.onload = () => {
      // 缩放【放大还原】
      ctx.scale(1 / dpr, 1 / dpr);
      ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
      // 再缩放
      ctx.scale(dpr, dpr);
    }
  },
  // 清空画布
  clearRect() {
    const ctx = this.data.canvasContext;
    const canvas = this.data.canvasElement;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.setData({
      imageList: []
    })
  },
  // 保存图片
  saveImage() {
    const that = this;
    wx.canvasToTempFilePath({
      canvasId: 'myCanvas',
      canvas: this.data.canvasElement,
      success: function (res) {
        that.data.imageList.push(res.tempFilePath);
      },
      fail: function (err) {}
    })
  },
  // 图片预览 这边的思路是 首先将背景图片画上去  再将最后的涂鸦展示上去
  preview() {
    const that = this;
    wx.showLoading({
      title: '打包中...',
    })
    const images = that.data.imageList;
    if (!images && images.length == 0) return false;
    const img = images[images.length - 1];
    // 将背景图片画上去
    const ctx = this.data.canvasContext;
    const canvas = this.data.canvasElement;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cover = this.data.cover;
    wx.getImageInfo({
      src: cover,
      success: e => {
        let realWidth = canvas.width;
        let realHeight = canvas.height;
        // 动态计算图片宽高
        if (e.width > e.height) {
          const ratio = canvas.height / e.height;
          realWidth = e.width * ratio;
        } else {
          const ratio = canvas.width / e.width;
          realHeight = e.height * ratio;
        }
        let bg = canvas.createImage();
        bg.src = cover;
        bg.onload = () => {
          const dpr = wx.getSystemInfoSync().pixelRatio;
          ctx.scale(1 / dpr, 1 / dpr);
          ctx.drawImage(bg, 0, (canvas.height - realHeight) / 2, realWidth, realHeight);
          let trajectory = canvas.createImage();
          trajectory.src = img;
          trajectory.onload = _ => {
            ctx.drawImage(trajectory, 0, 0, canvas.width, canvas.height);
            wx.canvasToTempFilePath({
              canvasId: 'myCanvas',
              canvas: that.data.canvasElement,
              success: function (res) {
                wx.previewImage({
                  urls: [res.tempFilePath],
                  showmenu: true,
                  current: res.tempFilePath,
                  complete: _ => {
                    wx.hideLoading();
                    ctx.scale(dpr, dpr);
                  }
                })
              },
              fail: function (err) {}
            })
          }
        }
      }
    })
  },
  //装载图片
  new() {
    const that = this;
    wx.chooseImage({
      success: function (res) {
        const tmpPicPath = res.tempFiles[0].path
        wx.getImageInfo({
          src: tmpPicPath,
          success: function (res) {
            let [height, width] = [Math.floor(that.data.windowWidth / res.width * res.height), that.data.windowWidth];
            if (height > that.data.windowHeight - 100) {
              height = that.data.windowHeight - 100;
              width = Math.floor(height / res.height * res.width);
            }
            that.setData({
              canvasHeight: height,
              canvasWidth: width,
              cover: tmpPicPath
            });
            that.initCanvas();
          }

        })
      }
    })
  },

  //inPaint
  async inPaint() {
    let that = this;
    try {
      // 在 canvas 中显示处理结果的临时文件路径
      let imageUrl = that.data.cover;
      let maskUrl = that.data.imageList[that.data.imageList.length - 1];
      let resultPath = await imageProcessor.inPaint(imageUrl, maskUrl, that.data.migan, that.data.selectColor);
      // 更新页面数据，显示处理结果的图片路径
      const ctx = that.data.canvasContext;
      const canvas = that.data.canvasElement;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      that.setData({
        cover: resultPath,
        imageList: []
      })
    } catch (error) {
      console.error('图像处理出错：', error);
    }
  },
  onShareAppMessage() {
    return {
      title: '照片修复小助手',
      imageUrl: '/images/mini_code.jpg'
    }
  },
  onShareTimeline() {
    return {
      title: '照片修复小助手',
      imageUrl: '/images/mini_code.jpg'
    }
  }
})