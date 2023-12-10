export class Migan {

  // net inference session
  session;
  // is ready
  ready;
  speedTime = 0.0;

  constructor() {
    this.ready = false;
  }

  // 加载模型
  async load() {
    const modelPath = `${wx.env.USER_DATA_PATH}/migan_pipeline_v2.onnx`;
    console.log(modelPath);
    // 判断之前是否已经下载过onnx模型
    try {
      await wx.getFileSystemManager().access({
        path: modelPath,
      });
      console.log("File already exists at: " + modelPath);
    } catch (error) {
      console.error(error);
      console.log("Begin downloading model");

      //const url = "https://huggingface.co/lxfater/inpaint-web/resolve/main/migan.onnx";
      const url = "https://huggingface.co/andraniksargsyan/migan/resolve/main/migan_pipeline_v2.onnx";

      try {
        // 下载模型
        const downloadResult = await this.downloadFile(url, (r) => {
          console.log(`Download progress: ${r.progress}%, ${r.totalBytesWritten}B downloaded, ${r.totalBytesExpectedToWrite}B total`);
        });

        // 保存模型到本地
        await wx.getFileSystemManager().saveFile({
          tempFilePath: downloadResult.tempFilePath,
          filePath: modelPath,
        });

        console.log("Saved onnx model at path: " + modelPath);
      } catch (downloadError) {
        console.error(downloadError);
        await this.retryOrChooseFile(modelPath);
      }
    }

    // 创建推断会话
    await this.createInferenceSession(modelPath);
  }

  // 创建推断会话
  async createInferenceSession(modelPath) {
    try {
      this.session = wx.createInferenceSession({
        model: modelPath,
        precisionLevel: 0,
        allowNPU: false,
        allowQuantize: false,
      });

      // 设置错误处理
      this.session.onError((error) => {
        console.error(error);
        wx.showToast({
          title: '模型加载失败',
          icon: 'error',
          duration: 2000
        })
      });
      // 等待会话加载完成
      this.session.onLoad(() => {
        this.ready = true;
        console.log("load ok");
        wx.showToast({
          title: '模型加载成功',
          icon: 'success',
          duration: 4000
        })
      });

    } catch (error) {
      // 处理在过程中可能发生的任何错误
      console.error('创建推断会话时出错：');
      throw error; // 将错误传递给调用者
    }
  }


  async downloadFile(fileID, onCall = () => {}) {
    if (!fileID) {
      throw new Error('Invalid fileID');
    }

    return new Promise((resolve, reject) => {
      const downloadTask = wx.downloadFile({
        fileID,
        success: res => {
          if (res.statusCode === 200) {
            resolve(res);
          } else {
            console.error(`Download failed with status code: ${res.statusCode}`);
            this.retryOrChooseFile(resolve, reject, err);
          }
        },
        fail: err => {
          this.retryOrChooseFile(resolve, reject, err);
        },
      });

      downloadTask.onProgressUpdate(res => {
        if (onCall(res) === false) {
          downloadTask.abort();
          reject(new Error('Download aborted by onCall'));
        }
      });
    });
  }

  async retryOrChooseFile(modelPath) {
    try {
      const chooseFileRes = await wx.chooseMessageFile({
        count: 1,
        type: 'file',
      });

      const tempFilePath = chooseFileRes.tempFiles[0]?.path;

      if (!tempFilePath) {
        throw new Error('Invalid temp file path');
      }

      await wx.getFileSystemManager().saveFile({
        tempFilePath,
        filePath: modelPath,
      });

      console.log("Saved onnx model at path: " + modelPath);
      await this.createInferenceSession(modelPath);
    } catch (chooseFileError) {
      console.error(chooseFileError);
      // 处理选择文件失败的情况
    }
  }


  isReady() {
    return this.ready;
  }

  getTime() {
    return this.speedTime;
  }

  dispose() {
    this.session.destroy();
  }

}