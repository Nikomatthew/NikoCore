# 来源与第三方组件

NikoLink 保留 LICENSE 中的上游版权归属和 MIT 许可。项目维护与修改：Niko_matthew。Logo 由 Niko_matthew 原创。本文件不新增禁止删除来源声明等许可限制。

## 随源码保留

`src` 下的记忆、目的引擎、搜索与安全抓取来自上游项目，适用原许可证。`opencode-adapter` 为 OpenCode 适配与新增功能。视频分镜为自有 ffmpeg 实现，不依赖或复制 dsh-video-storyboard 运行时代码；其分镜加转写的公开思路曾作为参考。

## 外部依赖

- OpenCode 与 npm 客户端：用户安装的宿主及 npm 依赖，遵守对应版本许可。
- SnowLuma：单独安装的第三方运行时，不包含在源码或安装器中，使用前自行确认其条款。
- js-yaml、jsonc-parser、qrcode、ws：npm 安装，具体许可见各包 LICENSE。
- FFmpeg：安装器从 Gyan 构建站下载，构建可能包含 GPL 组件。遵守该构建附带的许可证与分发要求；源码包不包含二进制。
- yt-dlp：从官方发布下载，具体版本及打包依赖适用其各自许可。
- Python、sherpa-onnx、NumPy、SoundFile、FastAPI、Uvicorn：安装器下载，遵守各自许可。
- Paraformer 中文模型、Silero VAD：由安装器下载，模型权重不随仓库分发，使用和再分发前需检查对应模型来源的许可。
- Tabbit、IDM：可选外部软件，不随项目分发。

语音模型来源与文件摘要见 tools/asr/model-hashes.json 及 tools/install.ps1。校验摘要用于检测文件变化，不替代许可证核查。
