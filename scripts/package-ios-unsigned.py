#!/usr/bin/env python3
"""验证设备产物并打包为SideStore可签名的IPA，保留framework符号链接，不包含秘密。"""
import hashlib
import plistlib
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


def package(products: Path, output: Path) -> Path:
    """只接受唯一iphoneos应用，拒绝模拟器、免费构建标记缺失或非arm64主程序。"""
    apps = list(products.glob('*.app'))
    if len(apps) != 1:
        raise ValueError('构建目录必须只有一个.app')
    app = apps[0]
    with (app / 'Info.plist').open('rb') as stream:
        info = plistlib.load(stream)
    if info.get('CFBundleSupportedPlatforms') != ['iPhoneOS']:
        raise ValueError('拒绝模拟器或非iPhoneOS产物')
    if info.get('TojaFreeSigning') is not True:
        raise ValueError('缺少免费签名构建标记')
    executable = app / info['CFBundleExecutable']
    architectures = subprocess.check_output(['lipo', '-archs', str(executable)], text=True).split()
    if 'arm64' not in architectures:
        raise ValueError('主程序不含arm64设备架构')
    output.mkdir(parents=True, exist_ok=True)
    ipa = output / 'TojaChat-unsigned.ipa'
    # 在目标磁盘创建临时目录并原子替换；失败/取消时不留下半个IPA。
    with tempfile.TemporaryDirectory(prefix='toja-ipa-', dir=output) as temp:
        staging = Path(temp)
        payload = staging / 'Payload'
        payload.mkdir()
        shutil.copytree(app, payload / app.name, symlinks=True)
        candidate = staging / ipa.name
        subprocess.run(['ditto', '-c', '-k', '--sequesterRsrc', '--keepParent',
                        str(payload), str(candidate)], check=True, timeout=300)
        candidate.replace(ipa)
    checksum = hashlib.sha256()
    # 分块计算摘要，兼容runner的Python版本且不把整份IPA装入内存。
    with ipa.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            checksum.update(chunk)
    digest = checksum.hexdigest()
    ipa.with_suffix('.ipa.sha256').write_text(f'{digest}  {ipa.name}\n')
    print(f'未签名IPA：{ipa}；SHA-256：{digest}')
    return ipa


if __name__ == '__main__':
    package(Path(sys.argv[1]), Path(sys.argv[2]))
