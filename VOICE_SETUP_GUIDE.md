# 🎙️ 语音识别服务设置指南

本指南将帮助你配置和启动语音识别服务。

## 📦 STT 服务

语音识别功能需要单独运行 STT 服务。

### GitHub 仓库
https://github.com/wvkmind/stt

### 推荐版本
- **server_cpp.py** - C++ 加速版本（推荐，速度更快）
- **server_onnx.py** - ONNX 版本（兼容性更好）

---

## 🚀 快速开始

### 1. 克隆 STT 服务

```bash
git clone https://github.com/wvkmind/stt.git
cd stt
```

### 2. 安装依赖

#### Windows 用户

```bash
# 使用 conda（推荐）
conda create -n stt python=3.10
conda activate stt
pip install -r requirements.txt

# 或使用 pip
pip install -r requirements.txt
```

#### macOS/Linux 用户

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 3. 启动服务

#### 使用 C++ 版本（推荐）

```bash
python server_cpp.py
```

#### 使用 ONNX 版本

```bash
python server_onnx.py
```

服务将在 `ws://localhost:8765` 启动。

### 4. 验证服务

看到以下输出表示服务启动成功：

```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8765
```

---

##  配置选项

### 端口配置

默认端口为 `8765`，如需修改：

```python
# 在 server_cpp.py 或 server_onnx.py 中修改
uvicorn.run(app, host="0.0.0.0", port=8765)  # 修改这里的端口号
```

### 模型配置

服务会自动下载 FunASR 模型（约 900MB），首次启动需要等待下载完成。

---

##  使用流程

### 1. 启动 STT 服务

```bash
cd stt
python server_cpp.py
```

### 2. 启动 AI 笔记应用

```bash
cd ai-note-system
npm run tauri dev
```

### 3. 测试语音输入

1. 在应用中点击麦克风按钮 
2. 开始说话
3. 查看实时识别结果
4. 停止录音，文本自动插入

---

##  性能对比

| 版本 | 速度 | 内存占用 | 兼容性 |
|------|------|----------|--------|
| server_cpp.py |  | ~2GB | 需要 C++ 编译环境 |
| server_onnx.py |  | ~2.5GB | 更好的跨平台支持 |

**推荐**: 优先使用 `server_cpp.py`，如遇到问题再尝试 `server_onnx.py`

---

##  常见问题

### Q: 模型下载失败

**A:** 
- 检查网络连接
- 使用国内镜像源
- 手动下载模型文件

### Q: 端口被占用

**A:**
```bash
# Windows
netstat -ano | findstr :8765
taskkill /PID <进程ID> /F

# macOS/Linux
lsof -i :8765
kill -9 <进程ID>
```

### Q: 依赖安装失败

**A:**
- 确保 Python 版本为 3.8-3.11
- 使用 conda 环境（推荐）
- 检查 pip 版本：`pip install --upgrade pip`

### Q: 识别效果不好

**A:**
- 使用外置麦克风
- 减少环境噪音
- 说话清晰，语速适中
- 确保麦克风距离 15-30cm

---

##  相关链接

- **STT 服务仓库**: https://github.com/wvkmind/stt
- **FunASR 文档**: https://github.com/alibaba-damo-academy/FunASR
- **项目主页**: [README.md](./README.md)
- **语音功能说明**: [README_VOICE.md](./README_VOICE.md)

---

##  提示

1. **首次启动**: 需要下载模型，请耐心等待
2. **性能优化**: 关闭不必要的后台程序
3. **GPU 加速**: 如有 NVIDIA 显卡，可配置 CUDA 加速
4. **持久运行**: 可使用 `nohup` 或 `screen` 保持服务运行

---

##  开始使用

现在你已经完成了语音服务的配置！

启动服务后，在 AI 笔记应用中点击麦克风按钮即可开始使用语音输入功能。

**享受语音输入的便捷体验！** 
