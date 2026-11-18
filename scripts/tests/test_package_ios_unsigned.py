"""离线检查IPA交付边界；模拟原生命令，不宣称已经完成iOS编译。"""
import importlib.util
import plistlib
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('package_ios', Path(__file__).parents[1] / 'package-ios-unsigned.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PackagingBoundaryTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.products = self.root / 'products'
        self.app = self.products / 'TojaChat.app'
        self.app.mkdir(parents=True)
        self.info = {'CFBundleSupportedPlatforms': ['iPhoneOS'], 'TojaFreeSigning': True,
                     'CFBundleExecutable': 'TojaChat'}
        (self.app / 'TojaChat').write_bytes(b'test-only')

    def write_info(self):
        with (self.app / 'Info.plist').open('wb') as output:
            plistlib.dump(self.info, output)

    def test_rejects_simulator(self):
        self.info['CFBundleSupportedPlatforms'] = ['iPhoneSimulator']
        self.write_info()
        with self.assertRaisesRegex(ValueError, '模拟器'):
            module.package(self.products, self.root / 'output')

    def test_requires_free_signing_marker(self):
        self.info.pop('TojaFreeSigning')
        self.write_info()
        with self.assertRaisesRegex(ValueError, '免费签名'):
            module.package(self.products, self.root / 'output')

    def test_rejects_multiple_apps(self):
        (self.products / 'Other.app').mkdir()
        with self.assertRaisesRegex(ValueError, '只有一个'):
            module.package(self.products, self.root / 'output')

    def test_requires_arm64_device_binary(self):
        self.write_info()
        with patch.object(module.subprocess, 'check_output', return_value='x86_64'), \
             self.assertRaisesRegex(ValueError, 'arm64'):
            module.package(self.products, self.root / 'output')

    def test_failed_zip_keeps_previous_ipa_and_cleans_staging(self):
        self.write_info()
        output = self.root / 'output'
        output.mkdir()
        ipa = output / 'TojaChat-unsigned.ipa'
        ipa.write_bytes(b'previous')
        with patch.object(module.subprocess, 'check_output', return_value='arm64'), \
             patch.object(module.subprocess, 'run', side_effect=RuntimeError('zip failed')), \
             self.assertRaises(RuntimeError):
            module.package(self.products, output)
        self.assertEqual(ipa.read_bytes(), b'previous')
        self.assertEqual(list(output.iterdir()), [ipa])


if __name__ == '__main__':
    unittest.main(verbosity=2)
