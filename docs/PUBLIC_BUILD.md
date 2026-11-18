# Toja Chat iPhone 客户端（开发中）

基于 Chatwoot 官方移动端，保留MIT许可证及上游版权声明。当前面向iPhone14及更新机型、iOS26+，未做完整真机验收；不含服务端源码、生产环境配置、Apple凭据或客户导出数据。

已加入真实已读时间、渠道撤回事实、附件级图片引用及免费签名开关。语音翻译、客户当地时间和上传幂等等定制适配尚未全部完成。免费构建禁用APNs/Firebase/PushKit注册，不支持后台原生远程推送；前台API/ActionCable沿用上游实现，需连接自己的兼容Chatwoot后端。

## 云端打包

Actions中手动运行“Build unsigned iPhone IPA”，使用标准macOS runner/Xcode。流程冻结依赖、类型检查与测试、生成iOS项目、pod install、编译iphoneos Release无签名App，并打包成IPA及SHA-256（产物保留1天）。不需要Apple账号、签名证书或App Store提交。首轮原生构建尚待验证，工作流存在不代表IPA已成功生成。

公开仓库标准runner的计算免费；artifact存储受账号额度约束。仅手动触发、60分钟超时、原生2并发、Node堆4GiB，10GiB磁盘前置阈值；这不是实测峰值或容量保证。失败在日志中明确报错，不交付模拟器包。

下载产物后，使用SideStore免费签名及安装。首次仍需电脑完成SideStore安装配对；日常手机刷新需Wi-Fi与LocalDevVPN，并受免费账号7天有效期及iOS后台调度限制。Anisette服务自行配置；本仓库不保存Apple账号或设备配对文件。

## 本地验证

```sh
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm exec jest --runInBand
python3 -m unittest discover -s scripts/tests -v
bash -n scripts/build-ios-unsigned.sh
```

复制.env.example配置公开构建值，绝不向EXPO_PUBLIC_*写入服务端密钥；实际登录使用自己的Chatwoot账号。源码上游基线cbfad0be59aba1f94a1fdda7ebc9885dfbeb80f0；上游示例、测试与素材按原许可证保留。

本地iOS原生目录已通过Expo prebuild生成并检查免费构建配置；尚未进行pod安装、Xcode编译或真机验收。
