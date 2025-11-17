#!/bin/bash

# 切换到脚本所在目录
cd "$(dirname "$0")"

echo "=========================================="
echo "macOS 独立打包流程"
echo "=========================================="

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查必要工具
echo "🔍 检查必要工具..."
command -v npm >/dev/null 2>&1 || { echo -e "${RED}❌ 错误: 未找到 npm${NC}"; exit 1; }
command -v cargo >/dev/null 2>&1 || { echo -e "${RED}❌ 错误: 未找到 cargo${NC}"; exit 1; }

echo -e "${GREEN} 所有必要工具已就绪${NC}"
echo ""

# 步骤 1: 安装前端依赖
echo "=========================================="
echo " 步骤 1/3: 安装前端依赖"
echo "=========================================="
npm install
echo -e "${GREEN} 前端依赖安装完成${NC}"
echo ""

# 步骤 2: 构建 Tauri 应用
echo "=========================================="
echo " 步骤 2/3: 构建 Tauri 应用"
echo "=========================================="
npm run tauri build
echo -e "${GREEN} Tauri 应用构建完成${NC}"
echo ""

# 步骤 3: 完成
echo "=========================================="
echo " 步骤 3/3: 打包完成"
echo "=========================================="

APP_PATH="src-tauri/target/release/bundle/macos"
DMG_PATH="src-tauri/target/release/bundle/dmg"

echo ""
echo "=========================================="
echo " 打包完成！"
echo "=========================================="
echo ""
echo " 应用位置:"
[ -d "$APP_PATH" ] && echo "   APP: $APP_PATH"
[ -d "$DMG_PATH" ] && echo "   DMG: $DMG_PATH"
echo "   Binary: src-tauri/target/release/"
echo ""
echo " 测试运行:"
echo "   open src-tauri/target/release/bundle/macos/ai-note-system.app"
echo ""
echo " 完成！"
echo ""
echo " 提示: 语音识别功能需要单独运行 STT 服务"
echo "   详见 README_VOICE.md"
