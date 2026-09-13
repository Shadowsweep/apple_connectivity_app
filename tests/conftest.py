import shutil
from pathlib import Path
import pytest

from tests.fixtures.fake_iphone_generator import create_mock_iphone_fixture


@pytest.fixture
def mock_iphone_dir(tmp_path: Path) -> Path:
    source_dir = tmp_path / "mock_iphone"
    create_mock_iphone_fixture(source_dir)
    return source_dir


@pytest.fixture
def mock_library_dir(tmp_path: Path) -> Path:
    lib_dir = tmp_path / "mock_library"
    lib_dir.mkdir(parents=True, exist_ok=True)
    return lib_dir
