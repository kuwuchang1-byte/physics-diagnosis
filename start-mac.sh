#!/bin/bash
# 高中物理学情诊断助手 - Mac 启动脚本

echo "========================================"
echo "  高中物理学情诊断助手 - 启动中..."
echo "========================================"
echo ""

# 获取脚本所在目录（项目根目录）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，请先安装 Node.js 24+"
    echo "   推荐使用 nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
    echo "   然后: nvm install 24"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
    echo "❌ Node.js 版本过低 ($(node -v))，需要 v22+ （推荐 v24+）"
    echo "   项目使用了 node:sqlite 内置模块，低版本不支持"
    exit 1
fi

echo "✅ Node.js $(node -v)"

# 检查并安装后端依赖
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "[0/3] 安装后端依赖..."
    cd "$BACKEND_DIR" && npm install
    if [ $? -ne 0 ]; then
        echo "❌ 后端依赖安装失败"
        exit 1
    fi
fi

# 检查并安装前端依赖
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "[0/3] 安装前端依赖..."
    cd "$FRONTEND_DIR" && npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
fi

# 杀掉可能占用端口的旧进程
echo "[1/3] 清理旧进程..."
lsof -ti:3001 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1

# 获取本机局域网IP
IP=$(ipconfig getifaddr en0 2>/dev/null || ifconfig en0 2>/dev/null | grep "inet " | awk '{print $2}')
if [ -z "$IP" ]; then
    IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
fi

# 启动后端
echo "[2/3] 启动后端服务 (端口 3001)..."
cd "$BACKEND_DIR"
node src/index.js &
BACKEND_PID=$!
sleep 3

# 检查后端是否真的启动了
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ 后端启动失败！请检查上方错误信息"
    exit 1
fi

# 启动前端
echo "[3/3] 启动前端页面 (端口 5173)..."
cd "$FRONTEND_DIR"
npx vite --host &
FRONTEND_PID=$!
sleep 2

echo ""
echo "========================================"
echo "  启动完成！"
echo ""
echo "  本机访问:   http://localhost:5173"
echo "  同WiFi访问: http://$IP:5173"
echo "  后端 API:   http://localhost:3001/api"
echo "========================================"
echo ""
echo "  按 Ctrl+C 停止所有服务"
echo ""

# 捕获退出信号，清理子进程
trap "echo '正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

# 等待子进程
wait
