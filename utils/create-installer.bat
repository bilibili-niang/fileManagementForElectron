@echo off
chcp 65001 >nul
echo 正在创建安装包...

set "SOURCE=release\win-unpacked"
set "OUTPUT=Super Utils 安装包"

if not exist "%SOURCE%" (
    echo 错误: 找不到源目录 %SOURCE%
    echo 请先运行 pnpm run electron:pack 生成免安装版
    pause
    exit /b 1
)

if exist "%OUTPUT%.zip" del "%OUTPUT%.zip"
if exist "%OUTPUT%.exe" del "%OUTPUT%.exe"

:: 使用 PowerShell 压缩
powershell -Command "Compress-Archive -Path '%SOURCE%\*' -DestinationPath '%OUTPUT%.zip' -Force"

echo.
echo 安装包已创建: %OUTPUT%.zip
echo.
echo 使用方法:
echo 1. 将 zip 文件解压到任意目录即可使用
echo 2. 运行 Super Utils.exe 启动程序
echo.
pause
