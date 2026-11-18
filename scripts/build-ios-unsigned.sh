#!/usr/bin/env bash
# 在有完整Xcode的macOS上生成设备用未签名IPA；签名/续签交由手机SideStore。
# 不访问Apple账号、不创建证书、不提交商店；原生编译失败直接退出，不能交付模拟器包。
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "$(uname -s)" != Darwin ]] || ! xcodebuild -version >/dev/null 2>&1; then
  echo '需要macOS与完整Xcode；Oracle Linux服务器仅运行签名辅助服务。' >&2
  exit 1
fi
export EXPO_PUBLIC_IOS_FREE_SIGNING=true
export EXPO_NO_TELEMETRY=1
export SENTRY_DISABLE_AUTO_UPLOAD=true
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"
# runner允许单个构建，原生编译2并发；磁盘不足提前失败，避免损坏已有构建产物。
free_kb=$(df -Pk . | awk 'NR == 2 { print $4 }')
if (( free_kb < 10 * 1024 * 1024 )); then
  echo '原生构建至少预留10GiB临时空间；请清理工作区或更换runner。' >&2
  exit 1
fi
xcodebuild -version
# 云端全新工作区生成原生目录；不使用--clean，避免删除已有原生自定义文件。
pnpm exec expo prebuild --platform ios --no-install
(cd ios && pod install)
work_dir=$(mktemp -d "${TMPDIR:-/tmp}/toja-ios-build.XXXXXX")
trap 'rm -rf "$work_dir"' EXIT
# 根据生成的实际项目/共享scheme选择目标，不把Pods或其他应用误打成IPA。
python3 - "$work_dir" <<'PY'
from pathlib import Path
import json, subprocess, sys
projects=list(Path('ios').glob('*.xcodeproj'))
workspaces=list(Path('ios').glob('*.xcworkspace'))
if len(projects)!=1 or len(workspaces)!=1:
    raise SystemExit('iOS主项目或workspace不唯一，请检查原生生成结果')
info=json.loads(subprocess.check_output(['xcodebuild','-list','-json','-project',str(projects[0])]))['project']
schemes=[name for name in info['schemes'] if name in info['targets']]
if len(schemes)!=1:
    raise SystemExit('主应用scheme不唯一，停止以避免打包错误目标')
Path(sys.argv[1],'workspace').write_text(str(workspaces[0]))
Path(sys.argv[1],'scheme').write_text(schemes[0])
PY
workspace=$(cat "$work_dir/workspace")
scheme=$(cat "$work_dir/scheme")
xcodebuild -workspace "$workspace" -scheme "$scheme" \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath "$work_dir/DerivedData" -jobs 2 \
  CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build
mkdir -p dist
python3 scripts/package-ios-unsigned.py "$work_dir/DerivedData/Build/Products/Release-iphoneos" dist
