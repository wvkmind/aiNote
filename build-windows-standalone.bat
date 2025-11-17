@echo off
echo ==========================================
echo Windows 打包流程
echo ==========================================

setlocal enabledelayedexpansion

REM 检查必要工具
echo  检查必要工具...

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  错误: 未找到 npm
    pause
    exit /b 1
)

where cargo >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  错误: 未找到 cargo
    pause
    exit /b 1
)

echo  所有必要工具已就绪
echo.

REM 步骤 1: 安装前端依赖
echo ==========================================
echo  步骤 1/3: 安装前端依赖
echo ==========================================
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo  错误: npm install 失败
    pause
    exit /b 1
)
echo  前端依赖安装完成
echo.

REM 步骤 2: 构建 Tauri 应用
echo ==========================================
echo  步骤 2/3: 构建 Tauri 应用
echo ==========================================
call npm run tauri build

if %ERRORLEVEL% NEQ 0 (
    echo  错误: Tauri 构建失败
    pause
    exit /b 1
)

echo  Tauri 应用构建完成
echo.

REM 步骤 3: 完成
echo ==========================================
echo  步骤 3/3: 打包完成
echo ==========================================

set "APP_PATH=src-tauri\target\release\bundle\msi"
set "NSIS_PATH=src-tauri\target\release\bundle\nsis"

echo.
echo ==========================================
echo  打包完成！
echo ==========================================
echo.
echo  应用位置:
if exist "%APP_PATH%" echo    MSI:  %APP_PATH%
if exist "%NSIS_PATH%" echo    NSIS: %NSIS_PATH%
echo    EXE:  src-tauri\target\release\
echo.
echo  测试运行:
echo    src-tauri\target\release\ai-note-system.exe
echo.
echo  完成！
echo.
echo  提示: 语音识别功能需要单独运行 STT 服务
echo    详见 README_VOICE.md

pause
